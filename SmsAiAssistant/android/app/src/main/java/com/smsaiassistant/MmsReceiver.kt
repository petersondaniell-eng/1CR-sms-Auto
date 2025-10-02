package com.smsaiassistant

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.database.Cursor
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.Telephony
import android.util.Log
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream

class MmsReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "MmsReceiver"
        private const val MMS_CONTENT_URI = "content://mms"
        private const val MMS_PART_CONTENT_URI = "content://mms/part"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return

        Log.d(TAG, "===== MMS RECEIVER TRIGGERED =====")
        Log.d(TAG, "Action: ${intent.action}")

        when (intent.action) {
            Telephony.Sms.Intents.WAP_PUSH_DELIVER_ACTION -> {
                Log.d(TAG, "WAP_PUSH_DELIVER received - Processing MMS message")
                handleMmsReceived(context)
            }
            else -> {
                Log.w(TAG, "Unexpected action: ${intent.action}")
            }
        }

        Log.d(TAG, "===== MMS RECEIVER FINISHED =====")
    }

    private fun handleMmsReceived(context: Context) {
        try {
            Log.d(TAG, "Querying MMS database for latest message...")

            // Query the most recent MMS message
            val cursor: Cursor? = context.contentResolver.query(
                Uri.parse(MMS_CONTENT_URI),
                arrayOf("_id", "date", "m_type"),
                null,
                null,
                "date DESC"
            )

            cursor?.use {
                if (it.moveToFirst()) {
                    val mmsId = it.getString(it.getColumnIndexOrThrow("_id"))
                    val messageType = it.getInt(it.getColumnIndexOrThrow("m_type"))

                    Log.d(TAG, "Found MMS ID: $mmsId, Type: $messageType")

                    // Type 132 = Retrieve.conf (received MMS)
                    if (messageType == 132) {
                        processMmsMessage(context, mmsId)
                    } else {
                        Log.d(TAG, "Skipping MMS - not a received message type")
                    }
                } else {
                    Log.w(TAG, "No MMS messages found in database")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling MMS: ${e.message}", e)
        }
    }

    private fun processMmsMessage(context: Context, mmsId: String) {
        try {
            Log.d(TAG, "Processing MMS message ID: $mmsId")

            // Get sender address
            val sender = getMmsSender(context, mmsId)
            Log.d(TAG, "MMS Sender: $sender")

            // Get message text and photos
            val parts = getMmsParts(context, mmsId)
            val messageText = parts["text"] ?: ""
            val photoPath = parts["photo"]

            Log.d(TAG, "MMS Text: $messageText")
            Log.d(TAG, "MMS Photo: $photoPath")

            if (messageText.isNotEmpty() || photoPath != null) {
                // Store in database
                val dbHelper = DatabaseHelper.getInstance(context)
                val timestamp = System.currentTimeMillis()

                dbHelper.insertMessage(
                    sender ?: "Unknown",
                    messageText.ifEmpty { "[Photo]" },
                    timestamp,
                    "customer",
                    photoPath
                )

                Log.d(TAG, "MMS stored in database")

                // Notify React Native
                notifyReactNative(context, sender ?: "Unknown", messageText, photoPath, timestamp)

                // Trigger AI response if enabled
                triggerAiResponse(context, sender ?: "Unknown", messageText, photoPath)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error processing MMS message: ${e.message}", e)
        }
    }

    private fun getMmsSender(context: Context, mmsId: String): String? {
        try {
            val cursor = context.contentResolver.query(
                Uri.parse("$MMS_CONTENT_URI/$mmsId/addr"),
                arrayOf("address", "type"),
                null,
                null,
                null
            )

            cursor?.use {
                while (it.moveToNext()) {
                    val type = it.getInt(it.getColumnIndexOrThrow("type"))
                    // Type 137 = From address
                    if (type == 137) {
                        return it.getString(it.getColumnIndexOrThrow("address"))
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting MMS sender: ${e.message}", e)
        }
        return null
    }

    private fun getMmsParts(context: Context, mmsId: String): Map<String, String?> {
        val result = mutableMapOf<String, String?>()
        var textContent = ""
        var photoPath: String? = null

        try {
            val cursor = context.contentResolver.query(
                Uri.parse(MMS_PART_CONTENT_URI),
                arrayOf("_id", "ct", "text", "_data"),
                "mid=?",
                arrayOf(mmsId),
                null
            )

            cursor?.use {
                val partCount = it.count
                Log.d(TAG, "Found $partCount MMS parts for message $mmsId")

                while (it.moveToNext()) {
                    val partId = it.getString(it.getColumnIndexOrThrow("_id"))
                    val contentType = it.getString(it.getColumnIndexOrThrow("ct"))
                    val dataPath = it.getString(it.getColumnIndexOrThrow("_data"))

                    Log.d(TAG, "MMS Part $partId - Content Type: $contentType, Data Path: $dataPath")

                    when {
                        contentType == "text/plain" -> {
                            val text = it.getString(it.getColumnIndexOrThrow("text"))
                            if (text != null) {
                                textContent += text
                                Log.d(TAG, "Text extracted: $text")
                            }
                        }
                        contentType?.startsWith("image/") == true -> {
                            Log.d(TAG, "Image part detected! Attempting to extract...")
                            // Extract and save photo
                            photoPath = extractAndSavePhoto(context, partId, mmsId)
                            if (photoPath != null) {
                                Log.d(TAG, "Photo extraction SUCCESS: $photoPath")
                            } else {
                                Log.e(TAG, "Photo extraction FAILED for part $partId")
                            }
                        }
                        else -> {
                            Log.d(TAG, "Skipping part with content type: $contentType")
                        }
                    }
                }
            }

            result["text"] = textContent
            result["photo"] = photoPath
        } catch (e: Exception) {
            Log.e(TAG, "Error getting MMS parts: ${e.message}", e)
        }

        return result
    }

    private fun extractAndSavePhoto(context: Context, partId: String, mmsId: String): String? {
        try {
            val partUri = Uri.parse("$MMS_PART_CONTENT_URI/$partId")
            val inputStream: InputStream? = context.contentResolver.openInputStream(partUri)

            if (inputStream != null) {
                // Decode bitmap
                val bitmap = BitmapFactory.decodeStream(inputStream)
                inputStream.close()

                if (bitmap != null) {
                    // Create photos directory
                    val photosDir = File(context.filesDir, "photos")
                    if (!photosDir.exists()) {
                        photosDir.mkdirs()
                    }

                    // Save photo with timestamp
                    val timestamp = System.currentTimeMillis()
                    val photoFile = File(photosDir, "mms_${mmsId}_${timestamp}.jpg")

                    FileOutputStream(photoFile).use { out ->
                        bitmap.compress(Bitmap.CompressFormat.JPEG, 90, out)
                    }

                    Log.d(TAG, "Photo saved: ${photoFile.absolutePath}")
                    return photoFile.absolutePath
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting MMS photo: ${e.message}", e)
        }
        return null
    }

    private fun notifyReactNative(context: Context, sender: String, message: String, photoPath: String?, timestamp: Long) {
        try {
            val broadcastIntent = Intent("com.smsaiassistant.MMS_RECEIVED").apply {
                putExtra("sender", sender)
                putExtra("message", message)
                putExtra("photoPath", photoPath)
                putExtra("timestamp", timestamp)
                setPackage(context.packageName)
            }
            context.sendBroadcast(broadcastIntent)
            Log.d(TAG, "Notified React Native about MMS")
        } catch (e: Exception) {
            Log.e(TAG, "Error notifying React Native: ${e.message}", e)
        }
    }

    private fun triggerAiResponse(context: Context, sender: String, message: String, photoPath: String?) {
        try {
            val sharedPrefs = context.getSharedPreferences("app_settings", Context.MODE_PRIVATE)
            val autoReplyEnabled = sharedPrefs.getBoolean("auto_reply_enabled", false)

            if (autoReplyEnabled) {
                // Start service to generate AI response with photo
                val serviceIntent = Intent(context, SmsService::class.java).apply {
                    action = "GENERATE_AI_RESPONSE"
                    putExtra("sender", sender)
                    putExtra("message", message)
                    putExtra("photoPath", photoPath)
                }
                context.startService(serviceIntent)
                Log.d(TAG, "Triggered AI response for MMS")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error triggering AI response: ${e.message}", e)
        }
    }
}
