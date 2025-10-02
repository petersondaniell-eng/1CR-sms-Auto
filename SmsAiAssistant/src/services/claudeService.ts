import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Message } from '../types/nativeModules';
import settingsService from './settingsService';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

interface ContentBlock {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

class ClaudeService {
  /**
   * Generate an AI response based on conversation history
   */
  async generateResponse(
    messages: Message[],
    customInstructions?: string
  ): Promise<string | null> {
    try {
      const apiKey = await settingsService.getApiKey();

      if (!apiKey) {
        console.error('Claude API key not found');
        return null;
      }

      console.log('Using API key:', apiKey.substring(0, 10) + '...');

      // Build conversation context
      const conversationContext = await this.buildConversationContext(
        messages,
        customInstructions
      );

      console.log('Making Claude API request...');
      console.log('Prompt preview (first 200 chars):', conversationContext.substring(0, 200));

      // Make API request
      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: conversationContext,
            },
          ],
        }),
      });

      console.log('Claude API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Claude API error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        return null;
      }

      const data = await response.json();

      if (data.content && data.content.length > 0) {
        return data.content[0].text;
      }

      return null;
    } catch (error) {
      console.error('Error generating Claude response:', error);
      return null;
    }
  }

  /**
   * Generate response with image analysis
   */
  async generateResponseWithImage(
    messages: Message[],
    imageBase64: string,
    mediaType: string,
    customInstructions?: string
  ): Promise<string | null> {
    try {
      const apiKey = await settingsService.getApiKey();

      if (!apiKey) {
        console.error('Claude API key not found');
        return null;
      }

      // Build conversation context
      const textContext = await this.buildConversationContext(messages, customInstructions);

      // Build content with image
      const content: ContentBlock[] = [
        {
          type: 'text',
          text: textContext,
        },
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: imageBase64,
          },
        },
      ];

      // Make API request
      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Claude API error:', errorText);
        return null;
      }

      const data = await response.json();

      if (data.content && data.content.length > 0) {
        return data.content[0].text;
      }

      return null;
    } catch (error) {
      console.error('Error generating Claude response with image:', error);
      return null;
    }
  }

  /**
   * Build conversation context for Claude
   */
  private async buildConversationContext(
    messages: Message[],
    customInstructions?: string
  ): Promise<string> {
    const instructions = customInstructions || this.getDefaultInstructions();

    const conversationHistory = messages
      .map(msg => {
        const senderLabel = this.getSenderLabel(msg.sender_type);
        return `${senderLabel}: ${msg.message_text}`;
      })
      .join('\n');

    // Get example conversations
    const examplesJson = await AsyncStorage.getItem('exampleConversations');
    let examplesSection = '';
    if (examplesJson) {
      try {
        const examples = JSON.parse(examplesJson);
        if (examples && examples.length > 0) {
          examplesSection = '\n\nEXAMPLE CONVERSATIONS (for reference):\n';
          examples.forEach((ex: any, index: number) => {
            examplesSection += `\nExample ${index + 1}:\nCustomer: ${ex.customerMessage}\nIdeal Response: ${ex.idealResponse}\n`;
          });
        }
      } catch (e) {
        console.error('Error parsing examples:', e);
      }
    }

    return `${instructions}${examplesSection}\n\nCONVERSATION HISTORY:\n${conversationHistory}\n\nPlease generate a professional, helpful response to the customer's most recent message. Keep it concise and focused on their needs. Use the example conversations as a reference for tone and style.`;
  }

  /**
   * Get default instructions if not customized
   */
  private getDefaultInstructions(): string {
    return `You are a professional customer service assistant for an appliance repair business.

Your responsibilities:
- Answer questions about appliance repair services
- Help schedule appointments
- Provide pricing estimates when appropriate
- Be helpful, polite, and professional
- Keep responses concise and clear
- If you don't have specific information, acknowledge this and offer to have someone call them back

Business information:
- We repair all major appliance brands
- Service areas: [Update with your coverage area]
- Typical response time: Same day or next business day
- Services: Refrigerators, Washers, Dryers, Ovens, Dishwashers, etc.`;
  }

  /**
   * Get sender label for messages
   */
  private getSenderLabel(senderType: string): string {
    switch (senderType) {
      case 'customer':
        return 'Customer';
      case 'ai':
        return 'AI Assistant';
      case 'manual':
        return 'You';
      default:
        return 'Unknown';
    }
  }

  /**
   * Test API key validity
   */
  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 10,
          messages: [
            {
              role: 'user',
              content: 'Test',
            },
          ],
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error testing API key:', error);
      return false;
    }
  }
}

export default new ClaudeService();
