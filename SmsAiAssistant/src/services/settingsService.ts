import AsyncStorage from '@react-native-async-storage/async-storage';
import SmsModule from '../types/nativeModules';

export interface AppSettings {
  autoReplyEnabled: boolean;
  notifyBeforeRespond: boolean;
  businessHoursStart: number; // 0-23
  businessHoursEnd: number; // 0-23
  claudeApiKey: string;
  customInstructions: string;
  autoDeletePhotos: boolean;
  autoDeletePhotosDays: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  autoReplyEnabled: false,
  notifyBeforeRespond: true,
  businessHoursStart: 9,
  businessHoursEnd: 17,
  claudeApiKey: '',
  customInstructions: `You are a professional customer service assistant for an appliance repair business.

BUSINESS HOURS & COMMUNICATION POLICY:
- Normal business hours: 9:00 AM - 5:00 PM (Monday-Friday)
- Messages monitored 24/7 for customer convenience
- After-hours responses should gather complete information and set expectations

RESPONSE STRATEGY:

During Business Hours (9 AM - 5 PM):
- Respond with full service details and immediate scheduling options
- Offer same-day or next-business-day appointments
- Provide pricing estimates when appropriate

Outside Business Hours (Evenings, Nights, Weekends):
- Thank them for reaching out and acknowledge the after-hours timing
- Assure them we received their message and will follow up promptly
- Gather ALL necessary information so we can hit the ground running:
  * Customer's full name (first and last)
  * Service address (street, city, zip)
  * Phone number to reach them
  * Appliance type and brand
  * Detailed description of the problem
  * Model number if available (or offer to help locate it)
  * Any photos of the appliance or service tag they can send
- Set clear expectations: "A technician will contact you first thing tomorrow morning by [TIME]"
- Keep tone warm and helpful, not robotic

CORE RESPONSIBILITIES:
- Answer questions about appliance repair services
- Help schedule appointments and gather scheduling preferences
- Collect complete customer information for work orders
- Be helpful, polite, and professional at all times
- Keep responses conversational but concise (2-4 sentences when possible)
- If you don't have specific pricing, acknowledge this and note that we'll provide a quote during the callback

BUSINESS INFORMATION:
- We repair all major appliance brands
- Service areas: [Update with your coverage area]
- Standard response time: Same day or next business day
- Services: Refrigerators, Washers, Dryers, Ovens, Dishwashers, Ranges, Microwaves, etc.

EXAMPLE AFTER-HOURS RESPONSE:
"Thanks for reaching out, [Name]! I received your message about your [appliance] issue. Since it's currently after our normal business hours (9 AM - 5 PM), a technician will contact you first thing tomorrow morning by 9:30 AM to schedule your service. To help us prepare, could you provide: your full address, a brief description of what's happening with the [appliance], and if possible, the brand and model number? This will help our technician come prepared with the right parts."`,
  autoDeletePhotos: false,
  autoDeletePhotosDays: 30,
};

class SettingsService {
  private settings: AppSettings | null = null;

  /**
   * Load all settings from AsyncStorage
   */
  async loadSettings(): Promise<AppSettings> {
    try {
      const settingsJson = await AsyncStorage.getItem('app_settings');

      if (settingsJson) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(settingsJson) };
      } else {
        this.settings = DEFAULT_SETTINGS;
      }

      return this.settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      this.settings = DEFAULT_SETTINGS;
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Save settings to AsyncStorage
   */
  async saveSettings(settings: Partial<AppSettings>): Promise<boolean> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...settings };

      await AsyncStorage.setItem('app_settings', JSON.stringify(updatedSettings));
      this.settings = updatedSettings;

      // Sync to native SharedPreferences for background service
      try {
        await SmsModule.syncSettings(updatedSettings);
        console.log('Settings synced to native SharedPreferences');
      } catch (syncError) {
        console.error('Error syncing settings to native:', syncError);
        // Don't fail the entire save operation if sync fails
      }

      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }

  /**
   * Get current settings (from cache or load)
   */
  async getSettings(): Promise<AppSettings> {
    if (this.settings) {
      return this.settings;
    }
    return await this.loadSettings();
  }

  /**
   * Get a specific setting value
   */
  async getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
    const settings = await this.getSettings();
    return settings[key];
  }

  /**
   * Save a specific setting
   */
  async setSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<boolean> {
    return await this.saveSettings({ [key]: value } as Partial<AppSettings>);
  }

  /**
   * Reset all settings to defaults
   */
  async resetSettings(): Promise<boolean> {
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(DEFAULT_SETTINGS));
      this.settings = DEFAULT_SETTINGS;
      return true;
    } catch (error) {
      console.error('Error resetting settings:', error);
      return false;
    }
  }

  /**
   * Check if auto-reply should be active based on business hours
   */
  isWithinBusinessHours(): boolean {
    if (!this.settings) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();

    return (
      currentHour >= this.settings.businessHoursStart &&
      currentHour < this.settings.businessHoursEnd
    );
  }

  /**
   * Get Claude API key
   */
  async getApiKey(): Promise<string> {
    return await this.getSetting('claudeApiKey');
  }

  /**
   * Save Claude API key
   */
  async saveApiKey(apiKey: string): Promise<boolean> {
    return await this.setSetting('claudeApiKey', apiKey);
  }
}

export default new SettingsService();
