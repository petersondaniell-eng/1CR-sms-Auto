import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Message } from '../types/nativeModules';

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
      const apiKey = await AsyncStorage.getItem('claude_api_key');

      if (!apiKey) {
        console.error('Claude API key not found');
        return null;
      }

      // Build conversation context
      const conversationContext = this.buildConversationContext(
        messages,
        customInstructions
      );

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
      const apiKey = await AsyncStorage.getItem('claude_api_key');

      if (!apiKey) {
        console.error('Claude API key not found');
        return null;
      }

      // Build conversation context
      const textContext = this.buildConversationContext(messages, customInstructions);

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
  private buildConversationContext(
    messages: Message[],
    customInstructions?: string
  ): string {
    const instructions = customInstructions || this.getDefaultInstructions();

    const conversationHistory = messages
      .map(msg => {
        const senderLabel = this.getSenderLabel(msg.sender_type);
        return `${senderLabel}: ${msg.message_text}`;
      })
      .join('\n');

    return `${instructions}\n\nCONVERSATION HISTORY:\n${conversationHistory}\n\nPlease generate a professional, helpful response to the customer's most recent message. Keep it concise and focused on their needs.`;
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
