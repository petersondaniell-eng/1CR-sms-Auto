package com.smsaiassistant

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.telephony.TelephonyManager
import android.util.Log

/**
 * HeadlessSmsSendService - Required for default SMS app
 *
 * This service handles the "Respond via message" feature that appears
 * when receiving a phone call. It allows users to send a quick SMS reply
 * instead of answering the call.
 *
 * Required by Android for an app to be eligible as default SMS app.
 */
class HeadlessSmsSendService : Service() {

    companion object {
        private const val TAG = "HeadlessSmsSendService"
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null) {
            Log.w(TAG, "Intent is null")
            stopSelf(startId)
            return START_NOT_STICKY
        }

        val action = intent.action
        Log.d(TAG, "Service started with action: $action")

        if ("android.intent.action.RESPOND_VIA_MESSAGE" == action) {
            handleRespondViaMessage(intent)
        }

        stopSelf(startId)
        return START_NOT_STICKY
    }

    private fun handleRespondViaMessage(intent: Intent) {
        try {
            val extras = intent.extras
            if (extras == null) {
                Log.w(TAG, "No extras in intent")
                return
            }

            // Get the phone number
            val phoneNumber = intent.dataString?.removePrefix("sms:")?.removePrefix("smsto:")
                ?: intent.dataString?.removePrefix("mms:")?.removePrefix("mmsto:")
                ?: ""

            // Get the message text
            val message = intent.getStringExtra(Intent.EXTRA_TEXT)
                ?: intent.getStringExtra("android.intent.extra.TEXT")
                ?: ""

            Log.d(TAG, "Respond via message - Phone: $phoneNumber, Message: $message")

            if (phoneNumber.isNotEmpty() && message.isNotEmpty()) {
                // Send the SMS
                val dbHelper = DatabaseHelper.getInstance(applicationContext)

                // Store in database
                dbHelper.insertMessage(
                    phoneNumber,
                    message,
                    System.currentTimeMillis(),
                    "manual"
                )

                // Use SmsModule to send
                // Note: We can't call the React Native module directly from here,
                // so we'll use the Android SMS manager directly
                val smsManager = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                    applicationContext.getSystemService(android.telephony.SmsManager::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    android.telephony.SmsManager.getDefault()
                }

                smsManager.sendTextMessage(phoneNumber, null, message, null, null)
                Log.d(TAG, "SMS sent successfully")
            } else {
                Log.w(TAG, "Missing phone number or message")
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error handling respond via message: ${e.message}", e)
        }
    }
}
