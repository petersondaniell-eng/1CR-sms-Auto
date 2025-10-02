package com.smsaiassistant

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.util.Log

class DatabaseHelper private constructor(context: Context) : SQLiteOpenHelper(
    context,
    DATABASE_NAME,
    null,
    DATABASE_VERSION
) {

    companion object {
        private const val TAG = "DatabaseHelper"
        private const val DATABASE_NAME = "sms_ai_assistant.db"
        private const val DATABASE_VERSION = 1

        // Tables
        private const val TABLE_CONVERSATIONS = "conversations"
        private const val TABLE_MESSAGES = "messages"
        private const val TABLE_SETTINGS = "settings"

        // Conversations columns
        private const val COL_CONV_ID = "id"
        private const val COL_CONV_PHONE = "phone_number"
        private const val COL_CONV_NAME = "contact_name"
        private const val COL_CONV_LAST_MSG = "last_message"
        private const val COL_CONV_LAST_TIME = "last_message_time"
        private const val COL_CONV_UNREAD = "unread_count"

        // Messages columns
        private const val COL_MSG_ID = "id"
        private const val COL_MSG_CONV_ID = "conversation_id"
        private const val COL_MSG_SENDER_TYPE = "sender_type"
        private const val COL_MSG_TEXT = "message_text"
        private const val COL_MSG_PHOTO = "photo_path"
        private const val COL_MSG_TIMESTAMP = "timestamp"

        // Settings columns
        private const val COL_SETTING_KEY = "key"
        private const val COL_SETTING_VALUE = "value"

        @Volatile
        private var instance: DatabaseHelper? = null

        fun getInstance(context: Context): DatabaseHelper {
            return instance ?: synchronized(this) {
                instance ?: DatabaseHelper(context.applicationContext).also { instance = it }
            }
        }
    }

    override fun onCreate(db: SQLiteDatabase?) {
        try {
            // Create conversations table
            val createConversationsTable = """
                CREATE TABLE $TABLE_CONVERSATIONS (
                    $COL_CONV_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                    $COL_CONV_PHONE TEXT NOT NULL UNIQUE,
                    $COL_CONV_NAME TEXT,
                    $COL_CONV_LAST_MSG TEXT,
                    $COL_CONV_LAST_TIME INTEGER,
                    $COL_CONV_UNREAD INTEGER DEFAULT 0
                )
            """.trimIndent()

            // Create messages table
            val createMessagesTable = """
                CREATE TABLE $TABLE_MESSAGES (
                    $COL_MSG_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                    $COL_MSG_CONV_ID INTEGER,
                    $COL_MSG_SENDER_TYPE TEXT CHECK($COL_MSG_SENDER_TYPE IN ('customer', 'ai', 'manual')),
                    $COL_MSG_TEXT TEXT,
                    $COL_MSG_PHOTO TEXT,
                    $COL_MSG_TIMESTAMP INTEGER,
                    FOREIGN KEY ($COL_MSG_CONV_ID) REFERENCES $TABLE_CONVERSATIONS($COL_CONV_ID)
                )
            """.trimIndent()

            // Create settings table
            val createSettingsTable = """
                CREATE TABLE $TABLE_SETTINGS (
                    $COL_SETTING_KEY TEXT PRIMARY KEY,
                    $COL_SETTING_VALUE TEXT
                )
            """.trimIndent()

            db?.execSQL(createConversationsTable)
            db?.execSQL(createMessagesTable)
            db?.execSQL(createSettingsTable)

            // Create indexes for better performance
            db?.execSQL("CREATE INDEX idx_messages_conv_id ON $TABLE_MESSAGES($COL_MSG_CONV_ID)")
            db?.execSQL("CREATE INDEX idx_messages_timestamp ON $TABLE_MESSAGES($COL_MSG_TIMESTAMP)")

            Log.d(TAG, "Database created successfully")

        } catch (e: Exception) {
            Log.e(TAG, "Error creating database: ${e.message}", e)
        }
    }

    override fun onUpgrade(db: SQLiteDatabase?, oldVersion: Int, newVersion: Int) {
        // Handle database upgrades
        db?.execSQL("DROP TABLE IF EXISTS $TABLE_MESSAGES")
        db?.execSQL("DROP TABLE IF EXISTS $TABLE_CONVERSATIONS")
        db?.execSQL("DROP TABLE IF EXISTS $TABLE_SETTINGS")
        onCreate(db)
    }

    // Insert or update a message
    fun insertMessage(phoneNumber: String, messageText: String, timestamp: Long, senderType: String, photoPath: String? = null): Long {
        val db = writableDatabase
        var messageId: Long = -1

        try {
            db.beginTransaction()

            // Get or create conversation
            val conversationId = getOrCreateConversation(phoneNumber)

            // Insert message
            val messageValues = ContentValues().apply {
                put(COL_MSG_CONV_ID, conversationId)
                put(COL_MSG_SENDER_TYPE, senderType)
                put(COL_MSG_TEXT, messageText)
                put(COL_MSG_PHOTO, photoPath)
                put(COL_MSG_TIMESTAMP, timestamp)
            }

            messageId = db.insert(TABLE_MESSAGES, null, messageValues)

            // Update conversation
            val conversationValues = ContentValues().apply {
                put(COL_CONV_LAST_MSG, messageText)
                put(COL_CONV_LAST_TIME, timestamp)
                if (senderType == "customer") {
                    // Increment unread count for customer messages
                    put(COL_CONV_UNREAD, getUnreadCount(conversationId) + 1)
                }
            }

            db.update(TABLE_CONVERSATIONS, conversationValues, "$COL_CONV_ID = ?", arrayOf(conversationId.toString()))

            db.setTransactionSuccessful()
            Log.d(TAG, "Message inserted successfully: ID=$messageId")

        } catch (e: Exception) {
            Log.e(TAG, "Error inserting message: ${e.message}", e)
        } finally {
            db.endTransaction()
        }

        return messageId
    }

    private fun getOrCreateConversation(phoneNumber: String): Long {
        val db = writableDatabase

        // Check if conversation exists
        val cursor = db.query(
            TABLE_CONVERSATIONS,
            arrayOf(COL_CONV_ID),
            "$COL_CONV_PHONE = ?",
            arrayOf(phoneNumber),
            null, null, null
        )

        return if (cursor.moveToFirst()) {
            val id = cursor.getLong(cursor.getColumnIndexOrThrow(COL_CONV_ID))
            cursor.close()
            id
        } else {
            cursor.close()

            // Create new conversation
            val values = ContentValues().apply {
                put(COL_CONV_PHONE, phoneNumber)
                put(COL_CONV_LAST_TIME, System.currentTimeMillis())
            }

            db.insert(TABLE_CONVERSATIONS, null, values)
        }
    }

    // Get all conversations
    fun getAllConversations(): List<Map<String, Any?>> {
        val conversations = mutableListOf<Map<String, Any?>>()
        val db = readableDatabase

        try {
            val cursor = db.query(
                TABLE_CONVERSATIONS,
                null,
                null, null, null, null,
                "$COL_CONV_LAST_TIME DESC"
            )

            while (cursor.moveToNext()) {
                conversations.add(cursorToConversationMap(cursor))
            }

            cursor.close()

        } catch (e: Exception) {
            Log.e(TAG, "Error getting conversations: ${e.message}", e)
        }

        return conversations
    }

    // Get messages for a conversation
    fun getConversationMessages(phoneNumber: String, limit: Int = 100): List<Map<String, Any?>> {
        val messages = mutableListOf<Map<String, Any?>>()
        val db = readableDatabase

        try {
            // Get conversation ID
            val convCursor = db.query(
                TABLE_CONVERSATIONS,
                arrayOf(COL_CONV_ID),
                "$COL_CONV_PHONE = ?",
                arrayOf(phoneNumber),
                null, null, null
            )

            if (convCursor.moveToFirst()) {
                val conversationId = convCursor.getLong(convCursor.getColumnIndexOrThrow(COL_CONV_ID))
                convCursor.close()

                // Get messages
                val msgCursor = db.query(
                    TABLE_MESSAGES,
                    null,
                    "$COL_MSG_CONV_ID = ?",
                    arrayOf(conversationId.toString()),
                    null, null,
                    "$COL_MSG_TIMESTAMP DESC",
                    limit.toString()
                )

                while (msgCursor.moveToNext()) {
                    messages.add(cursorToMessageMap(msgCursor))
                }

                msgCursor.close()
            } else {
                convCursor.close()
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error getting messages: ${e.message}", e)
        }

        return messages.reversed() // Return in chronological order
    }

    // Mark conversation as read
    fun markConversationAsRead(phoneNumber: String) {
        val db = writableDatabase

        try {
            val values = ContentValues().apply {
                put(COL_CONV_UNREAD, 0)
            }

            db.update(
                TABLE_CONVERSATIONS,
                values,
                "$COL_CONV_PHONE = ?",
                arrayOf(phoneNumber)
            )

            Log.d(TAG, "Conversation marked as read: $phoneNumber")

        } catch (e: Exception) {
            Log.e(TAG, "Error marking conversation as read: ${e.message}", e)
        }
    }

    // Delete conversation and all its messages
    fun deleteConversation(phoneNumber: String) {
        val db = writableDatabase

        try {
            // First get the conversation ID
            val cursor = db.query(
                TABLE_CONVERSATIONS,
                arrayOf(COL_CONV_ID),
                "$COL_CONV_PHONE = ?",
                arrayOf(phoneNumber),
                null, null, null
            )

            if (cursor.moveToFirst()) {
                val conversationId = cursor.getLong(cursor.getColumnIndexOrThrow(COL_CONV_ID))
                cursor.close()

                // Delete all messages for this conversation
                val messagesDeleted = db.delete(
                    TABLE_MESSAGES,
                    "$COL_MSG_CONV_ID = ?",
                    arrayOf(conversationId.toString())
                )

                // Delete the conversation
                val conversationsDeleted = db.delete(
                    TABLE_CONVERSATIONS,
                    "$COL_CONV_ID = ?",
                    arrayOf(conversationId.toString())
                )

                Log.d(TAG, "Deleted conversation $conversationId: $conversationsDeleted conversation, $messagesDeleted messages")
            } else {
                cursor.close()
                Log.w(TAG, "Conversation not found for phone: $phoneNumber")
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error deleting conversation: ${e.message}", e)
        }
    }

    private fun getUnreadCount(conversationId: Long): Int {
        val db = readableDatabase
        val cursor = db.query(
            TABLE_CONVERSATIONS,
            arrayOf(COL_CONV_UNREAD),
            "$COL_CONV_ID = ?",
            arrayOf(conversationId.toString()),
            null, null, null
        )

        val count = if (cursor.moveToFirst()) {
            cursor.getInt(cursor.getColumnIndexOrThrow(COL_CONV_UNREAD))
        } else {
            0
        }

        cursor.close()
        return count
    }

    // Helper functions to convert cursor to map
    private fun cursorToConversationMap(cursor: Cursor): Map<String, Any?> {
        return mapOf(
            "id" to cursor.getLong(cursor.getColumnIndexOrThrow(COL_CONV_ID)),
            "phone_number" to cursor.getString(cursor.getColumnIndexOrThrow(COL_CONV_PHONE)),
            "contact_name" to cursor.getString(cursor.getColumnIndexOrThrow(COL_CONV_NAME)),
            "last_message" to cursor.getString(cursor.getColumnIndexOrThrow(COL_CONV_LAST_MSG)),
            "last_message_time" to cursor.getLong(cursor.getColumnIndexOrThrow(COL_CONV_LAST_TIME)),
            "unread_count" to cursor.getInt(cursor.getColumnIndexOrThrow(COL_CONV_UNREAD))
        )
    }

    private fun cursorToMessageMap(cursor: Cursor): Map<String, Any?> {
        return mapOf(
            "id" to cursor.getLong(cursor.getColumnIndexOrThrow(COL_MSG_ID)),
            "conversation_id" to cursor.getLong(cursor.getColumnIndexOrThrow(COL_MSG_CONV_ID)),
            "sender_type" to cursor.getString(cursor.getColumnIndexOrThrow(COL_MSG_SENDER_TYPE)),
            "message_text" to cursor.getString(cursor.getColumnIndexOrThrow(COL_MSG_TEXT)),
            "photo_path" to cursor.getString(cursor.getColumnIndexOrThrow(COL_MSG_PHOTO)),
            "timestamp" to cursor.getLong(cursor.getColumnIndexOrThrow(COL_MSG_TIMESTAMP))
        )
    }

    // Delete old photos (for cleanup)
    fun getOldPhotoMessages(daysOld: Int): List<String> {
        val photos = mutableListOf<String>()
        val db = readableDatabase
        val cutoffTime = System.currentTimeMillis() - (daysOld * 24 * 60 * 60 * 1000L)

        try {
            val cursor = db.query(
                TABLE_MESSAGES,
                arrayOf(COL_MSG_PHOTO),
                "$COL_MSG_PHOTO IS NOT NULL AND $COL_MSG_TIMESTAMP < ?",
                arrayOf(cutoffTime.toString()),
                null, null, null
            )

            while (cursor.moveToNext()) {
                val photoPath = cursor.getString(cursor.getColumnIndexOrThrow(COL_MSG_PHOTO))
                if (photoPath != null) {
                    photos.add(photoPath)
                }
            }

            cursor.close()

        } catch (e: Exception) {
            Log.e(TAG, "Error getting old photos: ${e.message}", e)
        }

        return photos
    }
}
