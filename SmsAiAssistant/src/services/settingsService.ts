import AsyncStorage from '@react-native-async-storage/async-storage';

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
- Services: Refrigerators, Washers, Dryers, Ovens, Dishwashers, etc.`,
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
