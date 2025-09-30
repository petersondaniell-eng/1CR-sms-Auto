// Database types
export interface Conversation {
  id: number;
  phone_number: string;
  contact_name: string | null;
  last_message: string;
  last_message_time: number;
  unread_count: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_type: 'customer' | 'ai' | 'manual';
  message_text: string;
  photo_path: string | null;
  timestamp: number;
}

export interface Settings {
  key: string;
  value: string;
}

// Navigation types
export type RootStackParamList = {
  Messages: undefined;
  ConversationDetail: { conversationId: number; phoneNumber: string };
  Training: undefined;
  Settings: undefined;
};

// API types
export interface ClaudeAPIRequest {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: Array<ClaudeTextContent | ClaudeImageContent>;
}

export interface ClaudeTextContent {
  type: 'text';
  text: string;
}

export interface ClaudeImageContent {
  type: 'image';
  source: {
    type: 'base64';
    media_type: 'image/jpeg' | 'image/png';
    data: string;
  };
}

export interface ClaudeAPIResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// Work Order types
export interface WorkOrder {
  customer_name: string;
  phone_number: string;
  address: string;
  appliance_type: string;
  brand: string;
  model_number: string;
  issue_description: string;
  conversation_history: string;
  date: string;
}