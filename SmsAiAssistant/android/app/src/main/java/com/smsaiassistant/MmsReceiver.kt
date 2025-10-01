package com.smsaiassistant

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

class MmsReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "MmsReceiver"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return

        Log.d(TAG, "MMS Broadcast Received - Action: ${intent.action}")

        when (intent.action) {
            Telephony.Sms.Intents.WAP_PUSH_DELIVER_ACTION -> {
                Log.d(TAG, "WAP_PUSH_DELIVER received - MMS message")
                // For now, just log. Full MMS handling can be added later
                // MMS messages are more complex and require ContentProvider access
            }
            else -> {
                Log.w(TAG, "Unexpected action: ${intent.action}")
            }
        }
    }
}
