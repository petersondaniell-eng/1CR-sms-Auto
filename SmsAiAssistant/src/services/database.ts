import SQLite from 'react-native-sqlite-storage';
import { APP_CONFIG } from '../constants/config';
import { Conversation, Message, Settings } from '../types';

SQLite.DEBUG(true);
SQLite.enablePromise(true);

let database: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize the database and create tables if they don't exist
 */
export const initDatabase = async (): Promise<void> => {
  try {
    database = await SQLite.openDatabase({
      name: APP_CONFIG.DATABASE_NAME,
      location: 'default',
    });

    console.log('Database opened successfully');

    // Create conversations table
    await database.executeSql(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT NOT NULL UNIQUE,
        contact_name TEXT,
        last_message TEXT,
        last_message_time INTEGER,
        unread_count INTEGER DEFAULT 0
      );
    `);

    // Create messages table
    await database.executeSql(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER,
        sender_type TEXT CHECK(sender_type IN ('customer', 'ai', 'manual')),
        message_text TEXT,
        photo_path TEXT,
        timestamp INTEGER,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      );
    `);

    // Create settings table
    await database.executeSql(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    // Create indexes for better performance
    await database.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation
      ON messages(conversation_id);
    `);

    await database.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp
      ON messages(timestamp DESC);
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

/**
 * Close the database connection
 */
export const closeDatabase = async (): Promise<void> => {
  if (database) {
    await database.close();
    database = null;
    console.log('Database closed');
  }
};

// ==================== CONVERSATIONS ====================

/**
 * Get all conversations ordered by last message time
 */
export const getConversations = async (): Promise<Conversation[]> => {
  if (!database) throw new Error('Database not initialized');

  const [result] = await database.executeSql(
    'SELECT * FROM conversations ORDER BY last_message_time DESC'
  );

  const conversations: Conversation[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    conversations.push(result.rows.item(i));
  }

  return conversations;
};

/**
 * Get a single conversation by ID
 */
export const getConversation = async (id: number): Promise<Conversation | null> => {
  if (!database) throw new Error('Database not initialized');

  const [result] = await database.executeSql(
    'SELECT * FROM conversations WHERE id = ?',
    [id]
  );

  if (result.rows.length > 0) {
    return result.rows.item(0);
  }

  return null;
};

/**
 * Get or create a conversation by phone number
 */
export const getOrCreateConversation = async (
  phoneNumber: string,
  contactName: string | null = null
): Promise<Conversation> => {
  if (!database) throw new Error('Database not initialized');

  // Try to find existing conversation
  const [result] = await database.executeSql(
    'SELECT * FROM conversations WHERE phone_number = ?',
    [phoneNumber]
  );

  if (result.rows.length > 0) {
    return result.rows.item(0);
  }

  // Create new conversation
  const [insertResult] = await database.executeSql(
    `INSERT INTO conversations (phone_number, contact_name, last_message, last_message_time, unread_count)
     VALUES (?, ?, '', ?, 0)`,
    [phoneNumber, contactName, Date.now()]
  );

  return {
    id: insertResult.insertId,
    phone_number: phoneNumber,
    contact_name: contactName,
    last_message: '',
    last_message_time: Date.now(),
    unread_count: 0,
  };
};

/**
 * Update conversation's last message and timestamp
 */
export const updateConversation = async (
  id: number,
  lastMessage: string,
  timestamp: number
): Promise<void> => {
  if (!database) throw new Error('Database not initialized');

  await database.executeSql(
    `UPDATE conversations
     SET last_message = ?, last_message_time = ?
     WHERE id = ?`,
    [lastMessage, timestamp, id]
  );
};

/**
 * Update unread count for a conversation
 */
export const updateUnreadCount = async (
  id: number,
  increment: boolean = true
): Promise<void> => {
  if (!database) throw new Error('Database not initialized');

  if (increment) {
    await database.executeSql(
      'UPDATE conversations SET unread_count = unread_count + 1 WHERE id = ?',
      [id]
    );
  } else {
    await database.executeSql(
      'UPDATE conversations SET unread_count = 0 WHERE id = ?',
      [id]
    );
  }
};

// ==================== MESSAGES ====================

/**
 * Get all messages for a conversation
 */
export const getMessages = async (conversationId: number): Promise<Message[]> => {
  if (!database) throw new Error('Database not initialized');

  const [result] = await database.executeSql(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC',
    [conversationId]
  );

  const messages: Message[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    messages.push(result.rows.item(i));
  }

  return messages;
};

/**
 * Insert a new message
 */
export const insertMessage = async (
  conversationId: number,
  senderType: 'customer' | 'ai' | 'manual',
  messageText: string,
  photoPath: string | null = null,
  timestamp: number = Date.now()
): Promise<number> => {
  if (!database) throw new Error('Database not initialized');

  const [result] = await database.executeSql(
    `INSERT INTO messages (conversation_id, sender_type, message_text, photo_path, timestamp)
     VALUES (?, ?, ?, ?, ?)`,
    [conversationId, senderType, messageText, photoPath, timestamp]
  );

  // Update conversation's last message
  await updateConversation(conversationId, messageText, timestamp);

  return result.insertId;
};

/**
 * Delete messages older than a certain date
 */
export const deleteOldMessages = async (beforeTimestamp: number): Promise<number> => {
  if (!database) throw new Error('Database not initialized');

  const [result] = await database.executeSql(
    'DELETE FROM messages WHERE timestamp < ?',
    [beforeTimestamp]
  );

  return result.rowsAffected;
};

// ==================== SETTINGS ====================

/**
 * Get a setting value
 */
export const getSetting = async (key: string): Promise<string | null> => {
  if (!database) throw new Error('Database not initialized');

  const [result] = await database.executeSql(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );

  if (result.rows.length > 0) {
    return result.rows.item(0).value;
  }

  return null;
};

/**
 * Set a setting value
 */
export const setSetting = async (key: string, value: string): Promise<void> => {
  if (!database) throw new Error('Database not initialized');

  await database.executeSql(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
};

/**
 * Get all settings
 */
export const getAllSettings = async (): Promise<Record<string, string>> => {
  if (!database) throw new Error('Database not initialized');

  const [result] = await database.executeSql('SELECT * FROM settings');

  const settings: Record<string, string> = {};
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    settings[row.key] = row.value;
  }

  return settings;
};