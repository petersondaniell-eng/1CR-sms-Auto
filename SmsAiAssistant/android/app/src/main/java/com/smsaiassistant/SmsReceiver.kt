package com.smsaiassistant

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.Telephony
import android.telephony.SmsMessage
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

class SmsReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SmsReceiver"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return

        Log.d(TAG, "SMS Received - Action: ${intent.action}")

        when (intent.action) {
            Telephony.Sms.Intents.SMS_RECEIVED_ACTION -> {
                handleSmsReceived(context, intent)
            }
        }
    }

    private fun handleSmsReceived(context: Context, intent: Intent) {
        val bundle: Bundle? = intent.extras
        if (bundle == null) {
            Log.e(TAG, "Bundle is null")
            return
        }

        try {
            // Extract SMS messages from bundle
            val pdus = bundle.get("pdus") as? Array<*>
            if (pdus == null || pdus.isEmpty()) {
                Log.e(TAG, "No PDUs found")
                return
            }

            val format = bundle.getString("format")
            val messages = mutableListOf<SmsMessage>()

            for (pdu in pdus) {
                val message = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                    SmsMessage.createFromPdu(pdu as ByteArray, format)
                } else {
                    @Suppress("DEPRECATION")
                    SmsMessage.createFromPdu(pdu as ByteArray)
                }
                messages.add(message)
            }

            // Combine message parts if needed
            if (messages.isNotEmpty()) {
                val sender = messages[0].displayOriginatingAddress ?: "Unknown"
                val messageBody = messages.joinToString("") { it.messageBody ?: "" }
                val timestamp = messages[0].timestampMillis

                Log.d(TAG, "SMS from: $sender, Message: $messageBody")

                // Store message in database
                storeSmsInDatabase(context, sender, messageBody, timestamp)

                // Trigger AI response if enabled
                triggerAiResponse(context, sender, messageBody)

                // Send broadcast to React Native
                notifyReactNative(context, sender, messageBody, timestamp)
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error processing SMS: ${e.message}", e)
        }
    }

    private fun storeSmsInDatabase(context: Context, sender: String, message: String, timestamp: Long) {
        try {
            val dbHelper = DatabaseHelper.getInstance(context)
            dbHelper.insertMessage(sender, message, timestamp, "customer")
            Log.d(TAG, "Message stored in database")
        } catch (e: Exception) {
            Log.e(TAG, "Error storing message: ${e.message}", e)
        }
    }

    private fun triggerAiResponse(context: Context, sender: String, message: String) {
        // Check if auto-reply is enabled
        val sharedPrefs = context.getSharedPreferences("app_settings", Context.MODE_PRIVATE)
        val autoReplyEnabled = sharedPrefs.getBoolean("auto_reply_enabled", false)

        if (autoReplyEnabled) {
            // Check business hours
            if (isWithinBusinessHours(sharedPrefs)) {
                // Start service to generate AI response
                val serviceIntent = Intent(context, SmsService::class.java).apply {
                    action = "GENERATE_AI_RESPONSE"
                    putExtra("sender", sender)
                    putExtra("message", message)
                }
                context.startService(serviceIntent)
            } else {
                Log.d(TAG, "Outside business hours, skipping auto-reply")
            }
        }
    }

    private fun isWithinBusinessHours(sharedPrefs: android.content.SharedPreferences): Boolean {
        // Get business hours from settings (default 9 AM to 5 PM)
        val startHour = sharedPrefs.getInt("business_hours_start", 9)
        val endHour = sharedPrefs.getInt("business_hours_end", 17)

        val calendar = java.util.Calendar.getInstance()
        val currentHour = calendar.get(java.util.Calendar.HOUR_OF_DAY)

        return currentHour in startHour until endHour
    }

    private fun notifyReactNative(context: Context, sender: String, message: String, timestamp: Long) {
        try {
            // Send broadcast that React Native can listen to
            val broadcastIntent = Intent("com.smsaiassistant.SMS_RECEIVED").apply {
                putExtra("sender", sender)
                putExtra("message", message)
                putExtra("timestamp", timestamp)
                setPackage(context.packageName)
            }
            context.sendBroadcast(broadcastIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Error notifying React Native: ${e.message}", e)
        }
    }
}
