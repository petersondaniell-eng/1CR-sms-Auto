import SmsModule from '../types/nativeModules';
import type { Conversation, Message } from '../types/nativeModules';

class DatabaseService {
  /**
   * Get all conversations sorted by most recent
   */
  async getAllConversations(): Promise<Conversation[]> {
    try {
      return await SmsModule.getAllConversations();
    } catch (error) {
      console.error('Error getting conversations:', error);
      return [];
    }
  }

  /**
   * Get messages for a specific phone number
   */
  async getConversationMessages(
    phoneNumber: string,
    limit: number = 100
  ): Promise<Message[]> {
    try {
      return await SmsModule.getConversationMessages(phoneNumber, limit);
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  /**
   * Mark conversation as read (clear unread count)
   */
  async markConversationAsRead(phoneNumber: string): Promise<boolean> {
    try {
      return await SmsModule.markConversationAsRead(phoneNumber);
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      return false;
    }
  }

  /**
   * Insert a new message into the database
   */
  async insertMessage(
    phoneNumber: string,
    messageText: string,
    senderType: 'customer' | 'ai' | 'manual'
  ): Promise<number> {
    try {
      return await SmsModule.insertMessage(phoneNumber, messageText, senderType);
    } catch (error) {
      console.error('Error inserting message:', error);
      return -1;
    }
  }

  /**
   * Send SMS and save to database
   */
  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    try {
      // SmsModule.sendSms already stores in database
      return await SmsModule.sendSms(phoneNumber, message);
    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  }

  /**
   * Get photo storage information
   */
  async getPhotoStorageInfo() {
    try {
      return await SmsModule.getPhotoStorageInfo();
    } catch (error) {
      console.error('Error getting photo storage info:', error);
      return { totalSizeMB: 0, photoCount: 0 };
    }
  }

  /**
   * Delete photos older than specified days
   */
  async deleteOldPhotos(daysOld: number): Promise<number> {
    try {
      return await SmsModule.deleteOldPhotos(daysOld);
    } catch (error) {
      console.error('Error deleting old photos:', error);
      return 0;
    }
  }
}

export default new DatabaseService();
