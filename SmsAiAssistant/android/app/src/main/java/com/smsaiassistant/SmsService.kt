package com.smsaiassistant

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.URL
import java.util.Base64
import javax.net.ssl.HttpsURLConnection

class SmsService : Service() {

    companion object {
        private const val TAG = "SmsService"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "sms_service_channel"
        private const val CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
        private const val CLAUDE_MODEL = "claude-sonnet-4-20250514"
    }

    private val serviceScope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "SmsService created")
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "SmsService started with action: ${intent?.action}")

        // Start as foreground service
        val notification = createNotification("SMS AI Assistant is running")
        startForeground(NOTIFICATION_ID, notification)

        when (intent?.action) {
            "GENERATE_AI_RESPONSE" -> {
                val sender = intent.getStringExtra("sender") ?: return START_STICKY
                val message = intent.getStringExtra("message") ?: return START_STICKY
                val photoPath = intent.getStringExtra("photoPath")
                handleAiResponse(sender, message, photoPath)
            }
            "START_SERVICE" -> {
                Log.d(TAG, "Service explicitly started")
            }
        }

        return START_STICKY // Service will be restarted if killed
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null // We don't provide binding
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        Log.d(TAG, "SmsService destroyed")
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "SMS AI Assistant Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps the SMS AI Assistant running in the background"
                setShowBadge(false)
            }

            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(contentText: String): Notification {
        val intent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("SMS AI Assistant")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun handleAiResponse(sender: String, message: String, photoPath: String? = null) {
        serviceScope.launch {
            try {
                Log.d(TAG, "Generating AI response for $sender" + if (photoPath != null) " (with photo)" else "")

                // Get conversation history
                val conversationHistory = getConversationHistory(sender)

                // Get custom instructions
                val customInstructions = getCustomInstructions()

                // Check if we should notify before responding
                val sharedPrefs = getSharedPreferences("app_settings", Context.MODE_PRIVATE)
                val notifyBeforeRespond = sharedPrefs.getBoolean("notify_before_respond", false)

                if (notifyBeforeRespond) {
                    showNotificationForApproval(sender, message)
                    return@launch
                }

                // Generate AI response (with photo if present)
                val aiResponse = if (photoPath != null) {
                    generateClaudeResponseWithImage(conversationHistory, customInstructions, photoPath)
                } else {
                    generateClaudeResponse(conversationHistory, customInstructions)
                }

                if (aiResponse != null) {
                    // Store AI response in database
                    val dbHelper = DatabaseHelper.getInstance(this@SmsService)
                    dbHelper.insertMessage(sender, aiResponse, System.currentTimeMillis(), "ai")

                    // Send SMS
                    sendSms(sender, aiResponse)

                    // Update notification
                    val notification = createNotification("Sent AI response to $sender")
                    val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    notificationManager.notify(NOTIFICATION_ID, notification)

                    // Notify React Native
                    notifyReactNative(sender, aiResponse)
                }

            } catch (e: Exception) {
                Log.e(TAG, "Error generating AI response: ${e.message}", e)
            }
        }
    }

    private suspend fun generateClaudeResponse(
        conversationHistory: String,
        customInstructions: String
    ): String? = withContext(Dispatchers.IO) {
        try {
            val sharedPrefs = getSharedPreferences("app_settings", Context.MODE_PRIVATE)
            val apiKey = sharedPrefs.getString("claude_api_key", "") ?: ""

            if (apiKey.isEmpty()) {
                Log.e(TAG, "Claude API key not set")
                return@withContext null
            }

            val url = URL(CLAUDE_API_URL)
            val connection = url.openConnection() as HttpsURLConnection

            connection.apply {
                requestMethod = "POST"
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("x-api-key", apiKey)
                setRequestProperty("anthropic-version", "2023-06-01")
                connectTimeout = 30000
                readTimeout = 30000
            }

            // Build request body
            val requestBody = JSONObject().apply {
                put("model", CLAUDE_MODEL)
                put("max_tokens", 1000)
                put("messages", JSONArray().apply {
                    put(JSONObject().apply {
                        put("role", "user")
                        put("content", buildPrompt(conversationHistory, customInstructions))
                    })
                })
            }

            Log.d(TAG, "Sending request to Claude API")

            connection.outputStream.use { os ->
                os.write(requestBody.toString().toByteArray())
            }

            val responseCode = connection.responseCode
            Log.d(TAG, "Claude API response code: $responseCode")

            if (responseCode == 200) {
                val response = connection.inputStream.bufferedReader().use { it.readText() }
                val jsonResponse = JSONObject(response)
                val content = jsonResponse.getJSONArray("content")
                if (content.length() > 0) {
                    val textContent = content.getJSONObject(0).getString("text")
                    Log.d(TAG, "AI Response: $textContent")
                    return@withContext textContent
                }
            } else {
                val errorStream = connection.errorStream?.bufferedReader()?.use { it.readText() }
                Log.e(TAG, "Claude API error: $errorStream")
            }

            return@withContext null

        } catch (e: Exception) {
            Log.e(TAG, "Error calling Claude API: ${e.message}", e)
            return@withContext null
        }
    }

    private suspend fun generateClaudeResponseWithImage(
        conversationHistory: String,
        customInstructions: String,
        photoPath: String
    ): String? = withContext(Dispatchers.IO) {
        try {
            val sharedPrefs = getSharedPreferences("app_settings", Context.MODE_PRIVATE)
            val apiKey = sharedPrefs.getString("claude_api_key", "") ?: ""

            if (apiKey.isEmpty()) {
                Log.e(TAG, "Claude API key not set")
                return@withContext null
            }

            // Read and encode photo
            val photoFile = File(photoPath)
            if (!photoFile.exists()) {
                Log.e(TAG, "Photo file not found: $photoPath")
                return@withContext generateClaudeResponse(conversationHistory, customInstructions)
            }

            val photoBytes = photoFile.readBytes()
            val base64Photo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Base64.getEncoder().encodeToString(photoBytes)
            } else {
                android.util.Base64.encodeToString(photoBytes, android.util.Base64.NO_WRAP)
            }

            val url = URL(CLAUDE_API_URL)
            val connection = url.openConnection() as HttpsURLConnection

            connection.apply {
                requestMethod = "POST"
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("x-api-key", apiKey)
                setRequestProperty("anthropic-version", "2023-06-01")
                connectTimeout = 30000
                readTimeout = 30000
            }

            // Build request body with image
            val prompt = buildPrompt(conversationHistory, customInstructions) +
                "\n\nThe customer has sent a photo. Please analyze the image and provide relevant assistance based on what you see."

            val requestBody = JSONObject().apply {
                put("model", CLAUDE_MODEL)
                put("max_tokens", 1000)
                put("messages", JSONArray().apply {
                    put(JSONObject().apply {
                        put("role", "user")
                        put("content", JSONArray().apply {
                            put(JSONObject().apply {
                                put("type", "text")
                                put("text", prompt)
                            })
                            put(JSONObject().apply {
                                put("type", "image")
                                put("source", JSONObject().apply {
                                    put("type", "base64")
                                    put("media_type", "image/jpeg")
                                    put("data", base64Photo)
                                })
                            })
                        })
                    })
                })
            }

            Log.d(TAG, "Sending request to Claude API with image")

            connection.outputStream.use { os ->
                os.write(requestBody.toString().toByteArray())
            }

            val responseCode = connection.responseCode
            Log.d(TAG, "Claude API response code: $responseCode")

            if (responseCode == 200) {
                val response = connection.inputStream.bufferedReader().use { it.readText() }
                val jsonResponse = JSONObject(response)
                val content = jsonResponse.getJSONArray("content")
                if (content.length() > 0) {
                    val textContent = content.getJSONObject(0).getString("text")
                    Log.d(TAG, "AI Response (with image): $textContent")
                    return@withContext textContent
                }
            } else {
                val errorStream = connection.errorStream?.bufferedReader()?.use { it.readText() }
                Log.e(TAG, "Claude API error: $errorStream")
            }

            return@withContext null

        } catch (e: Exception) {
            Log.e(TAG, "Error calling Claude API with image: ${e.message}", e)
            return@withContext null
        }
    }

    private fun buildPrompt(conversationHistory: String, customInstructions: String): String {
        return """
$customInstructions

CONVERSATION HISTORY:
$conversationHistory

Please generate a professional, helpful response to the customer's most recent message. Keep it concise and focused on their needs.
        """.trimIndent()
    }

    private fun getConversationHistory(sender: String): String {
        try {
            val dbHelper = DatabaseHelper.getInstance(this)
            val messages = dbHelper.getConversationMessages(sender, limit = 20)
            return messages.joinToString("\n") { msg ->
                val senderLabel = when (msg["sender_type"]) {
                    "customer" -> "Customer"
                    "ai" -> "AI Assistant"
                    "manual" -> "You"
                    else -> "Unknown"
                }
                "$senderLabel: ${msg["message_text"]}"
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting conversation history: ${e.message}", e)
            return ""
        }
    }

    private fun getCustomInstructions(): String {
        val sharedPrefs = getSharedPreferences("app_settings", Context.MODE_PRIVATE)
        return sharedPrefs.getString("custom_instructions",
            """You are a professional customer service assistant for an appliance repair business.

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
- Services: Refrigerators, Washers, Dryers, Ovens, Dishwashers, Ranges, Microwaves, etc."""
        ) ?: ""
    }

    private fun sendSms(phoneNumber: String, message: String) {
        try {
            val smsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                getSystemService(android.telephony.SmsManager::class.java)
            } else {
                @Suppress("DEPRECATION")
                android.telephony.SmsManager.getDefault()
            }

            // Split long messages if needed
            val parts = smsManager.divideMessage(message)
            if (parts.size > 1) {
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null)
            } else {
                smsManager.sendTextMessage(phoneNumber, null, message, null, null)
            }

            Log.d(TAG, "SMS sent to $phoneNumber")

        } catch (e: Exception) {
            Log.e(TAG, "Error sending SMS: ${e.message}", e)
        }
    }

    private fun showNotificationForApproval(sender: String, message: String) {
        // Create notification with action buttons for approval
        val approveIntent = Intent(this, SmsService::class.java).apply {
            action = "APPROVE_RESPONSE"
            putExtra("sender", sender)
            putExtra("message", message)
        }
        val approvePendingIntent = PendingIntent.getService(
            this, 0, approveIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("New message from $sender")
            .setContentText(message)
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .addAction(android.R.drawable.ic_menu_send, "Generate Response", approvePendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(sender.hashCode(), notification)
    }

    private fun notifyReactNative(sender: String, message: String) {
        try {
            val broadcastIntent = Intent("com.smsaiassistant.AI_RESPONSE_SENT").apply {
                putExtra("sender", sender)
                putExtra("message", message)
                putExtra("timestamp", System.currentTimeMillis())
                setPackage(packageName)
            }
            sendBroadcast(broadcastIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Error notifying React Native: ${e.message}", e)
        }
    }
}
