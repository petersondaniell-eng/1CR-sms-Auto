export const API_CONFIG = {
  CLAUDE_API_URL: 'https://api.anthropic.com/v1/messages',
  CLAUDE_MODEL: 'claude-sonnet-4-20250514',
  MAX_TOKENS: 1000,
  API_VERSION: '2023-06-01',
};

export const APP_CONFIG = {
  DATABASE_NAME: 'sms_assistant.db',
  DATABASE_VERSION: 1,
  PHOTO_STORAGE_PATH: 'photos',
  MAX_PHOTO_WIDTH: 300,
  DEFAULT_BUSINESS_HOURS_START: '09:00',
  DEFAULT_BUSINESS_HOURS_END: '17:00',
  DEFAULT_AUTO_DELETE_DAYS: 30,
};

export const STORAGE_KEYS = {
  API_KEY: '@sms_assistant:api_key',
  AUTO_REPLY: '@sms_assistant:auto_reply',
  NOTIFY_BEFORE_SEND: '@sms_assistant:notify_before_send',
  BUSINESS_HOURS_START: '@sms_assistant:business_hours_start',
  BUSINESS_HOURS_END: '@sms_assistant:business_hours_end',
  AUTO_DELETE_PHOTOS: '@sms_assistant:auto_delete_photos',
  AUTO_DELETE_DAYS: '@sms_assistant:auto_delete_days',
  AI_INSTRUCTIONS: '@sms_assistant:ai_instructions',
};