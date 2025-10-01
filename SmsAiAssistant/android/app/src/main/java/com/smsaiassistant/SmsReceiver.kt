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
        Log.d(TAG, "===== SMS RECEIVER TRIGGERED =====")

        if (context == null) {
            Log.e(TAG, "Context is null!")
            return
        }

        if (intent == null) {
            Log.e(TAG, "Intent is null!")
            return
        }

        Log.d(TAG, "Action: ${intent.action}")
        Log.d(TAG, "Package: ${context.packageName}")

        try {
            when (intent.action) {
                Telephony.Sms.Intents.SMS_DELIVER_ACTION -> {
                    Log.d(TAG, "SMS_DELIVER received - processing as default SMS app")
                    handleSmsReceived(context, intent)
                }
                Telephony.Sms.Intents.WAP_PUSH_DELIVER_ACTION -> {
                    Log.d(TAG, "MMS received - processing as default SMS app")
                    handleSmsReceived(context, intent)
                }
                else -> {
                    Log.w(TAG, "Unexpected action: ${intent.action}")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "CRITICAL ERROR in onReceive: ${e.message}", e)
            e.printStackTrace()
        }

        Log.d(TAG, "===== SMS RECEIVER FINISHED =====")
    }

    private fun handleSmsReceived(context: Context, intent: Intent) {
        Log.d(TAG, "=== handleSmsReceived START ===")

        val bundle: Bundle? = intent.extras
        if (bundle == null) {
            Log.e(TAG, "Bundle is null")
            return
        }

        Log.d(TAG, "Bundle keys: ${bundle.keySet()}")

        try {
            // Extract SMS messages from bundle
            val pdus = bundle.get("pdus") as? Array<*>
            if (pdus == null || pdus.isEmpty()) {
                Log.e(TAG, "No PDUs found in bundle")
                return
            }

            Log.d(TAG, "Found ${pdus.size} PDU(s)")

            val format = bundle.getString("format")
            Log.d(TAG, "SMS format: $format")

            val messages = mutableListOf<SmsMessage>()

            for ((index, pdu) in pdus.withIndex()) {
                try {
                    val message = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                        SmsMessage.createFromPdu(pdu as ByteArray, format)
                    } else {
                        @Suppress("DEPRECATION")
                        SmsMessage.createFromPdu(pdu as ByteArray)
                    }
                    messages.add(message)
                    Log.d(TAG, "PDU $index parsed successfully")
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing PDU $index: ${e.message}", e)
                }
            }

            // Combine message parts if needed
            if (messages.isNotEmpty()) {
                val sender = messages[0].displayOriginatingAddress ?: "Unknown"
                val messageBody = messages.joinToString("") { it.messageBody ?: "" }
                val timestamp = messages[0].timestampMillis

                Log.d(TAG, "Parsed SMS - From: $sender, Length: ${messageBody.length} chars, Time: $timestamp")
                Log.d(TAG, "Message preview: ${messageBody.take(50)}...")

                // Store message in database
                Log.d(TAG, "Storing in database...")
                storeSmsInDatabase(context, sender, messageBody, timestamp)

                // Trigger AI response if enabled
                Log.d(TAG, "Checking for AI response...")
                triggerAiResponse(context, sender, messageBody)

                // Send broadcast to React Native
                Log.d(TAG, "Notifying React Native...")
                notifyReactNative(context, sender, messageBody, timestamp)

                Log.d(TAG, "SMS processing completed successfully")
            } else {
                Log.e(TAG, "No messages were parsed from PDUs")
            }

        } catch (e: Exception) {
            Log.e(TAG, "CRITICAL ERROR processing SMS: ${e.message}", e)
            e.printStackTrace()
        }

        Log.d(TAG, "=== handleSmsReceived END ===")
    }

    private fun storeSmsInDatabase(context: Context, sender: String, message: String, timestamp: Long) {
        try {
            Log.d(TAG, "Getting DatabaseHelper instance...")
            val dbHelper = DatabaseHelper.getInstance(context)

            Log.d(TAG, "Calling insertMessage - sender: $sender, timestamp: $timestamp, type: customer")
            val messageId = dbHelper.insertMessage(sender, message, timestamp, "customer")

            Log.d(TAG, "Message stored in database with ID: $messageId")
        } catch (e: Exception) {
            Log.e(TAG, "CRITICAL ERROR storing message in database: ${e.message}", e)
            e.printStackTrace()
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
