package com.smsaiassistant

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.provider.ContactsContract
import android.provider.Telephony
import android.telephony.SmsManager
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class SmsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "SmsModule"
        private const val PERMISSION_REQUEST_CODE = 1001
        private const val PICK_CONTACT_REQUEST = 1002
    }

    private var pickContactPromise: Promise? = null

    override fun getName(): String {
        return "SmsModule"
    }

    // Start background service
    @ReactMethod
    fun startBackgroundService(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, SmsService::class.java).apply {
                action = "START_SERVICE"
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }

            promise.resolve(true)
            Log.d(TAG, "Background service started")

        } catch (e: Exception) {
            Log.e(TAG, "Error starting background service: ${e.message}", e)
            promise.reject("ERROR", "Failed to start background service: ${e.message}")
        }
    }

    // Stop background service
    @ReactMethod
    fun stopBackgroundService(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, SmsService::class.java)
            reactApplicationContext.stopService(intent)
            promise.resolve(true)
            Log.d(TAG, "Background service stopped")

        } catch (e: Exception) {
            Log.e(TAG, "Error stopping background service: ${e.message}", e)
            promise.reject("ERROR", "Failed to stop background service: ${e.message}")
        }
    }

    // Check if SMS permissions are granted
    @ReactMethod
    fun checkSmsPermissions(promise: Promise) {
        try {
            val sendSmsGranted = ContextCompat.checkSelfPermission(
                reactApplicationContext,
                Manifest.permission.SEND_SMS
            ) == PackageManager.PERMISSION_GRANTED

            val receiveSmsGranted = ContextCompat.checkSelfPermission(
                reactApplicationContext,
                Manifest.permission.RECEIVE_SMS
            ) == PackageManager.PERMISSION_GRANTED

            val readSmsGranted = ContextCompat.checkSelfPermission(
                reactApplicationContext,
                Manifest.permission.READ_SMS
            ) == PackageManager.PERMISSION_GRANTED

            val result = Arguments.createMap().apply {
                putBoolean("sendSms", sendSmsGranted)
                putBoolean("receiveSms", receiveSmsGranted)
                putBoolean("readSms", readSmsGranted)
                putBoolean("allGranted", sendSmsGranted && receiveSmsGranted && readSmsGranted)
            }

            promise.resolve(result)

        } catch (e: Exception) {
            Log.e(TAG, "Error checking permissions: ${e.message}", e)
            promise.reject("ERROR", "Failed to check permissions: ${e.message}")
        }
    }

    // Request SMS permissions
    @ReactMethod
    fun requestSmsPermissions(promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity
            if (activity == null) {
                promise.reject("ERROR", "No activity available")
                return
            }

            val permissions = arrayOf(
                Manifest.permission.SEND_SMS,
                Manifest.permission.RECEIVE_SMS,
                Manifest.permission.READ_SMS,
                Manifest.permission.READ_CONTACTS
            )

            ActivityCompat.requestPermissions(activity, permissions, PERMISSION_REQUEST_CODE)
            promise.resolve(true)

        } catch (e: Exception) {
            Log.e(TAG, "Error requesting permissions: ${e.message}", e)
            promise.reject("ERROR", "Failed to request permissions: ${e.message}")
        }
    }

    // Send SMS
    @ReactMethod
    fun sendSms(phoneNumber: String, message: String, promise: Promise) {
        try {
            // Check permission
            if (ContextCompat.checkSelfPermission(
                    reactApplicationContext,
                    Manifest.permission.SEND_SMS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                promise.reject("PERMISSION_DENIED", "SMS permission not granted")
                return
            }

            val smsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                reactApplicationContext.getSystemService(SmsManager::class.java)
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getDefault()
            }

            // Split long messages if needed
            val parts = smsManager.divideMessage(message)
            if (parts.size > 1) {
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null)
            } else {
                smsManager.sendTextMessage(phoneNumber, null, message, null, null)
            }

            // Store in database
            val dbHelper = DatabaseHelper.getInstance(reactApplicationContext)
            dbHelper.insertMessage(phoneNumber, message, System.currentTimeMillis(), "manual")

            promise.resolve(true)
            Log.d(TAG, "SMS sent to $phoneNumber")

        } catch (e: Exception) {
            Log.e(TAG, "Error sending SMS: ${e.message}", e)
            promise.reject("ERROR", "Failed to send SMS: ${e.message}")
        }
    }

    // Get all conversations
    @ReactMethod
    fun getAllConversations(promise: Promise) {
        try {
            val dbHelper = DatabaseHelper.getInstance(reactApplicationContext)
            val conversations = dbHelper.getAllConversations()

            val result = Arguments.createArray()
            conversations.forEach { conv ->
                val map = Arguments.createMap().apply {
                    putInt("id", (conv["id"] as Long).toInt())
                    putString("phone_number", conv["phone_number"] as? String)
                    putString("contact_name", conv["contact_name"] as? String)
                    putString("last_message", conv["last_message"] as? String)
                    putDouble("last_message_time", (conv["last_message_time"] as? Long)?.toDouble() ?: 0.0)
                    putInt("unread_count", conv["unread_count"] as? Int ?: 0)
                }
                result.pushMap(map)
            }

            promise.resolve(result)

        } catch (e: Exception) {
            Log.e(TAG, "Error getting conversations: ${e.message}", e)
            promise.reject("ERROR", "Failed to get conversations: ${e.message}")
        }
    }

    // Get messages for a conversation
    @ReactMethod
    fun getConversationMessages(phoneNumber: String, limit: Int, promise: Promise) {
        try {
            val dbHelper = DatabaseHelper.getInstance(reactApplicationContext)
            val messages = dbHelper.getConversationMessages(phoneNumber, limit)

            val result = Arguments.createArray()
            messages.forEach { msg ->
                val map = Arguments.createMap().apply {
                    putInt("id", (msg["id"] as Long).toInt())
                    putInt("conversation_id", (msg["conversation_id"] as Long).toInt())
                    putString("sender_type", msg["sender_type"] as? String)
                    putString("message_text", msg["message_text"] as? String)
                    putString("photo_path", msg["photo_path"] as? String)
                    putDouble("timestamp", (msg["timestamp"] as? Long)?.toDouble() ?: 0.0)
                }
                result.pushMap(map)
            }

            promise.resolve(result)

        } catch (e: Exception) {
            Log.e(TAG, "Error getting messages: ${e.message}", e)
            promise.reject("ERROR", "Failed to get messages: ${e.message}")
        }
    }

    // Mark conversation as read
    @ReactMethod
    fun markConversationAsRead(phoneNumber: String, promise: Promise) {
        try {
            val dbHelper = DatabaseHelper.getInstance(reactApplicationContext)
            dbHelper.markConversationAsRead(phoneNumber)
            promise.resolve(true)

        } catch (e: Exception) {
            Log.e(TAG, "Error marking conversation as read: ${e.message}", e)
            promise.reject("ERROR", "Failed to mark conversation as read: ${e.message}")
        }
    }

    // Get photo storage info
    @ReactMethod
    fun getPhotoStorageInfo(promise: Promise) {
        try {
            val photosDir = reactApplicationContext.getExternalFilesDir("photos")
            var totalSize: Long = 0
            var photoCount = 0

            photosDir?.walkTopDown()?.forEach { file ->
                if (file.isFile) {
                    totalSize += file.length()
                    photoCount++
                }
            }

            val result = Arguments.createMap().apply {
                putDouble("totalSizeMB", totalSize / (1024.0 * 1024.0))
                putInt("photoCount", photoCount)
            }

            promise.resolve(result)

        } catch (e: Exception) {
            Log.e(TAG, "Error getting photo storage info: ${e.message}", e)
            promise.reject("ERROR", "Failed to get photo storage info: ${e.message}")
        }
    }

    // Delete old photos
    @ReactMethod
    fun deleteOldPhotos(daysOld: Int, promise: Promise) {
        try {
            val dbHelper = DatabaseHelper.getInstance(reactApplicationContext)
            val oldPhotos = dbHelper.getOldPhotoMessages(daysOld)

            var deletedCount = 0
            oldPhotos.forEach { photoPath ->
                val file = java.io.File(photoPath)
                if (file.exists() && file.delete()) {
                    deletedCount++
                }
            }

            promise.resolve(deletedCount)
            Log.d(TAG, "Deleted $deletedCount old photos")

        } catch (e: Exception) {
            Log.e(TAG, "Error deleting old photos: ${e.message}", e)
            promise.reject("ERROR", "Failed to delete old photos: ${e.message}")
        }
    }

    // Insert a message (for manual entries or AI responses)
    @ReactMethod
    fun insertMessage(
        phoneNumber: String,
        messageText: String,
        senderType: String,
        promise: Promise
    ) {
        try {
            val dbHelper = DatabaseHelper.getInstance(reactApplicationContext)
            val messageId = dbHelper.insertMessage(
                phoneNumber,
                messageText,
                System.currentTimeMillis(),
                senderType
            )

            promise.resolve(messageId.toDouble())

        } catch (e: Exception) {
            Log.e(TAG, "Error inserting message: ${e.message}", e)
            promise.reject("ERROR", "Failed to insert message: ${e.message}")
        }
    }

    // Send event to React Native
    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    // Pick a contact from device contacts
    @ReactMethod
    fun pickContact(promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity
            if (activity == null) {
                promise.reject("ERROR", "No activity available")
                return
            }

            pickContactPromise = promise

            val intent = Intent(Intent.ACTION_PICK, ContactsContract.CommonDataKinds.Phone.CONTENT_URI)
            activity.startActivityForResult(intent, PICK_CONTACT_REQUEST)

        } catch (e: Exception) {
            Log.e(TAG, "Error picking contact: ${e.message}", e)
            promise.reject("ERROR", "Failed to open contact picker: ${e.message}")
        }
    }

    // Handle activity result for contact picker
    private val activityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
            if (requestCode == PICK_CONTACT_REQUEST) {
                if (resultCode == Activity.RESULT_OK && data != null) {
                    handleContactPicked(data)
                } else {
                    pickContactPromise?.reject("CANCELLED", "Contact picker was cancelled")
                    pickContactPromise = null
                }
            }
        }
    }

    init {
        reactApplicationContext.addActivityEventListener(activityEventListener)
    }

    private fun handleContactPicked(data: Intent) {
        try {
            val contactUri: Uri = data.data ?: run {
                pickContactPromise?.reject("ERROR", "No contact data returned")
                pickContactPromise = null
                return
            }

            val cursor: Cursor? = reactApplicationContext.contentResolver.query(
                contactUri,
                arrayOf(
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                    ContactsContract.CommonDataKinds.Phone.NUMBER
                ),
                null,
                null,
                null
            )

            cursor?.use {
                if (it.moveToFirst()) {
                    val nameIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
                    val numberIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)

                    val name = if (nameIndex >= 0) it.getString(nameIndex) ?: "Unknown" else "Unknown"
                    val number = if (numberIndex >= 0) it.getString(numberIndex) ?: "" else ""

                    // Remove formatting from phone number (keep only digits)
                    val cleanNumber = number.replace(Regex("[^0-9]"), "")

                    val result = Arguments.createMap().apply {
                        putString("name", name)
                        putString("phoneNumber", cleanNumber)
                    }

                    pickContactPromise?.resolve(result)
                } else {
                    pickContactPromise?.reject("ERROR", "No contact information found")
                }
            } ?: run {
                pickContactPromise?.reject("ERROR", "Failed to read contact data")
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error reading contact: ${e.message}", e)
            pickContactPromise?.reject("ERROR", "Failed to read contact: ${e.message}")
        } finally {
            pickContactPromise = null
        }
    }

    // Check if app is default SMS app
    @ReactMethod
    fun isDefaultSmsApp(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                val defaultSmsPackage = Telephony.Sms.getDefaultSmsPackage(reactApplicationContext)
                val isDefault = defaultSmsPackage == reactApplicationContext.packageName
                promise.resolve(isDefault)
                Log.d(TAG, "Is default SMS app: $isDefault (default: $defaultSmsPackage, us: ${reactApplicationContext.packageName})")
            } else {
                // Before KitKat, there was no default SMS app concept
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking default SMS app: ${e.message}", e)
            promise.reject("ERROR", "Failed to check default SMS app: ${e.message}")
        }
    }

    // Request to become default SMS app
    @ReactMethod
    fun requestDefaultSmsApp(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                val activity = reactApplicationContext.currentActivity
                if (activity == null) {
                    promise.reject("ERROR", "No activity available")
                    Log.e(TAG, "No activity available for SMS app request")
                    return
                }

                val defaultSmsPackage = Telephony.Sms.getDefaultSmsPackage(reactApplicationContext)
                val ourPackage = reactApplicationContext.packageName

                Log.d(TAG, "Current default SMS package: $defaultSmsPackage")
                Log.d(TAG, "Our package name: $ourPackage")

                if (defaultSmsPackage != ourPackage) {
                    try {
                        val intent = Intent(Telephony.Sms.Intents.ACTION_CHANGE_DEFAULT)
                        intent.putExtra(Telephony.Sms.Intents.EXTRA_PACKAGE_NAME, ourPackage)

                        // Try to start the activity
                        activity.startActivity(intent)

                        promise.resolve(true)
                        Log.d(TAG, "Started ACTION_CHANGE_DEFAULT intent")
                    } catch (activityException: Exception) {
                        Log.e(TAG, "Failed to start ACTION_CHANGE_DEFAULT: ${activityException.message}", activityException)

                        // Fallback: Open app settings if the intent doesn't work
                        try {
                            val settingsIntent = Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                            settingsIntent.data = Uri.parse("package:$ourPackage")
                            activity.startActivity(settingsIntent)
                            promise.resolve(true)
                            Log.d(TAG, "Opened app settings as fallback")
                        } catch (settingsException: Exception) {
                            Log.e(TAG, "Failed to open settings: ${settingsException.message}", settingsException)
                            promise.reject("ERROR", "Could not open SMS settings: ${settingsException.message}")
                        }
                    }
                } else {
                    promise.resolve(true)
                    Log.d(TAG, "Already default SMS app")
                }
            } else {
                promise.resolve(true)
                Log.d(TAG, "Android version < KitKat, no default SMS app concept")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting default SMS app: ${e.message}", e)
            promise.reject("ERROR", "Failed to request default SMS app: ${e.message}")
        }
    }

    // Constants accessible from JavaScript
    override fun getConstants(): MutableMap<String, Any> {
        return hashMapOf(
            "SENDER_TYPE_CUSTOMER" to "customer",
            "SENDER_TYPE_AI" to "ai",
            "SENDER_TYPE_MANUAL" to "manual"
        )
    }
}
