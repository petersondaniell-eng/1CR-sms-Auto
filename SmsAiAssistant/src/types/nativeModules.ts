import { NativeModules } from 'react-native';

export interface SmsPermissions {
  sendSms: boolean;
  receiveSms: boolean;
  readSms: boolean;
  allGranted: boolean;
}

export interface Conversation {
  id: number;
  phone_number: string;
  contact_name?: string;
  last_message?: string;
  last_message_time: number;
  unread_count: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_type: 'customer' | 'ai' | 'manual';
  message_text: string;
  photo_path?: string;
  timestamp: number;
}

export interface PhotoStorageInfo {
  totalSizeMB: number;
  photoCount: number;
}

export interface SmsModuleType {
  // Service management
  startBackgroundService(): Promise<boolean>;
  stopBackgroundService(): Promise<boolean>;

  // Permissions
  checkSmsPermissions(): Promise<SmsPermissions>;
  requestSmsPermissions(): Promise<boolean>;

  // SMS operations
  sendSms(phoneNumber: string, message: string): Promise<boolean>;

  // Database operations
  getAllConversations(): Promise<Conversation[]>;
  getConversationMessages(phoneNumber: string, limit: number): Promise<Message[]>;
  markConversationAsRead(phoneNumber: string): Promise<boolean>;
  insertMessage(
    phoneNumber: string,
    messageText: string,
    senderType: 'customer' | 'ai' | 'manual'
  ): Promise<number>;

  // Photo management
  getPhotoStorageInfo(): Promise<PhotoStorageInfo>;
  deleteOldPhotos(daysOld: number): Promise<number>;

  // Constants
  SENDER_TYPE_CUSTOMER: string;
  SENDER_TYPE_AI: string;
  SENDER_TYPE_MANUAL: string;
}

const { SmsModule } = NativeModules;

if (!SmsModule) {
  throw new Error(
    'SmsModule native module is not available. Make sure the native code is properly linked.'
  );
}

export default SmsModule as SmsModuleType;
