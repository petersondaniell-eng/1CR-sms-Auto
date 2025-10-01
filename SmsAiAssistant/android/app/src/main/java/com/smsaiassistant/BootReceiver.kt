package com.smsaiassistant

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return

        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d(TAG, "Device boot completed, starting SMS service")

            try {
                val serviceIntent = Intent(context, SmsService::class.java).apply {
                    action = "START_SERVICE"
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }

                Log.d(TAG, "SMS service started successfully")

            } catch (e: Exception) {
                Log.e(TAG, "Error starting service on boot: ${e.message}", e)
            }
        }
    }
}
