Perfect! Here's a complete `claude.md` file you can use with Claude Code. Save this as `claude.md` in your project folder:

```markdown
# SMS AI Assistant - Android App Build Instructions

## Project Overview
Create a fully functional React Native Android application for automated SMS management with AI responses for an appliance repair business.

## Core Requirements

### 1. Project Setup
- Create a new React Native project (latest stable version)
- Target Android API 33 (Android 13) minimum
- Use TypeScript for type safety
- Set up project structure with proper folder organization

### 2. Required Dependencies
Install and configure:
- `react-native` (latest stable)
- `@react-native-community/async-storage` - for local data persistence
- `react-native-contacts` - for contact management
- `react-native-fs` - for file system access (photos)
- `react-native-sqlite-storage` - for local database
- `react-native-permissions` - for handling Android permissions
- `@react-navigation/native` and `@react-navigation/bottom-tabs` - for navigation
- `axios` - for API calls

### 3. Android Permissions (AndroidManifest.xml)
Add the following permissions:
```xml
<uses-permission android:name="android.permission.RECEIVE_SMS" />
<uses-permission android:name="android.permission.READ_SMS" />
<uses-permission android:name="android.permission.SEND_SMS" />
<uses-permission android:name="android.permission.READ_CONTACTS" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

### 4. Native Android Code Requirements

#### SMS Broadcast Receiver
Create a native Android BroadcastReceiver in Java/Kotlin:
- Listen for incoming SMS messages
- Extract sender phone number and message content
- Store messages in local database
- Trigger AI response if auto-reply is enabled
- Handle MMS (photo messages)

File: `android/app/src/main/java/com/smsaiassistant/SmsReceiver.java`

#### Background Service
Create an Android Service:
- Run in foreground with notification
- Monitor for incoming messages 24/7
- Process AI responses in background
- Respect business hours settings

File: `android/app/src/main/java/com/smsaiassistant/SmsService.java`

#### Native Module Bridge
Create React Native bridge to communicate between JS and native Android:
- Methods to read SMS history
- Methods to send SMS
- Methods to check/request permissions
- Methods to start/stop background service
- Methods to read MMS attachments
- **NEW:** Method to open native contact picker and return contact info

File: `android/app/src/main/java/com/smsaiassistant/SmsModule.java`

### 5. Database Schema (SQLite)

Create tables:

**conversations**
```sql
CREATE TABLE conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number TEXT NOT NULL UNIQUE,
  contact_name TEXT,
  last_message TEXT,
  last_message_time INTEGER,
  unread_count INTEGER DEFAULT 0
);
```

**messages**
```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER,
  sender_type TEXT CHECK(sender_type IN ('customer', 'ai', 'manual')),
  message_text TEXT,
  photo_path TEXT,
  timestamp INTEGER,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
```

**settings**
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

### 6. Application Features

#### Screen 1: Messages List
- Display all conversations (phone number, last message, timestamp)
- Show unread count badge
- Pull to refresh
- Search/filter conversations
- Click to open conversation detail
- **NEW:** Floating action button (+) to initiate new conversations
- **NEW:** Modal with two options:
  1. Select from device contacts (native contact picker)
  2. Enter phone number manually with validation
- **NEW:** Automatic navigation to existing conversation if duplicate phone number

#### Screen 2: Conversation Detail
- Display full message history with sender indicators
- Show photos inline (clickable for full view)
- "Create Work Order" button in header
- Text input for manual replies
- "Generate AI Response" button
- Send button

#### Screen 3: AI Training
- Text area for custom instructions (editable)
- List of example conversations
- Ability to add/edit/delete examples
- Save button

#### Screen 4: Settings
- Auto-reply toggle switch
- "Notify before AI responds" checkbox
- Business hours start/end time pickers
- Auto-delete photos toggle and days selector
- Claude API key input (masked)
- Photo storage display (MB used, photo count)
- Test SMS permissions button

### 7. AI Integration (Claude API)

Create API service module that:
- Sends requests to `https://api.anthropic.com/v1/messages`
- Uses model: `claude-sonnet-4-20250514`
- Includes conversation history in context
- Includes custom instructions from training
- Handles image analysis for MMS photos
- Implements retry logic for failed requests
- Respects rate limits

Request format:
```javascript
{
  model: "claude-sonnet-4-20250514",
  max_tokens: 1000,
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "Custom instructions + conversation history" },
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "..." }}
      ]
    }
  ]
}
```

Store API key in AsyncStorage, never hardcode.

### 8. Work Order Feature

When "Create Work Order" is clicked:
1. Extract information from conversation using simple parsing or AI
2. Open modal with editable fields:
   - Customer name (from contact or phone number)
   - Phone number
   - Address
   - Appliance type
   - Brand
   - Model number
   - Issue description
   - Full conversation history (read-only)
3. "Copy Work Order" button formats as:

```
WORK ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date: [timestamp]

CUSTOMER INFORMATION
Name: [name]
Phone: [phone]
Address: [address]

APPLIANCE DETAILS
Type: [type]
Brand: [brand]
Model #: [model]

ISSUE DESCRIPTION
[description]

CONVERSATION HISTORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[messages]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Copy to clipboard and show confirmation.

### 9. Photo Handling

For incoming MMS:
- Detect photo attachments
- Save to app's private storage: `[app-data]/photos/[phone-number]/[timestamp].jpg`
- Store file path in messages table
- Display thumbnails in conversation (max 300px wide)
- Full-screen viewer on tap with pinch-to-zoom
- Send photos to Claude API for analysis (base64 encode)

### 10. Background Processing

The app should:
- Start background service on app launch
- Restart service on device boot (BOOT_COMPLETED receiver)
- Show persistent notification when service is running
- Process messages even when app is closed
- Respect battery optimization (request exclusion if needed)
- Auto-reply only during business hours (if setting enabled)
- Show notification preview before sending (if "notify before respond" enabled)

### 11. Build Configuration

Update `android/app/build.gradle`:
```gradle
android {
    compileSdkVersion 33
    
    defaultConfig {
        applicationId "com.smsaiassistant"
        minSdkVersion 26
        targetSdkVersion 33
        versionCode 1
        versionName "1.0.0"
    }
    
    signingConfigs {
        release {
            // For now, use debug signing for testing
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    
    buildTypes {
        release {
            minifyEnabled false
            signingConfig signingConfigs.release
        }
    }
}
```

### 12. UI Styling

Use a modern, clean design:
- Primary color: Blue (#2563EB)
- Success color: Green (#16A34A)
- Background: Light gray (#F9FAFB)
- Cards: White with subtle shadow
- Text: Dark gray (#1F2937)
- Match the prototype UI shown in the web version

### 13. Error Handling

Implement proper error handling for:
- SMS permission denied
- API key missing or invalid
- Network errors during AI requests
- Storage full (photos)
- Database errors
- Invalid phone numbers

### 14. Testing & Debugging

Include:
- Console logging for all major operations
- Error boundaries in React components
- Test button in settings to verify SMS permissions
- Display API response time in dev mode

### 15. Build Instructions

After creating all files, provide commands for:
1. Installing dependencies: `npm install`
2. Linking native modules (if needed)
3. Building debug APK: `cd android && ./gradlew assembleDebug`
4. Building release APK: `cd android && ./gradlew assembleRelease`
5. Installing on connected device: `adb install android/app/build/outputs/apk/release/app-release.apk`

## Final Deliverables

When complete, the project should include:
- Complete React Native source code
- Native Android modules (Java/Kotlin)
- Database initialization scripts
- Build configuration files
- README with setup instructions
- APK ready for installation

## Critical Notes

- **NEVER use localStorage or sessionStorage** - use AsyncStorage instead
- **All SMS operations must go through native modules** - React Native doesn't have direct SMS access
- **Test on real device** - SMS functionality doesn't work on emulators
- **Request runtime permissions** - Android 6.0+ requires runtime permission requests
- **Optimize for battery** - Use JobScheduler or WorkManager for background tasks if needed

## Success Criteria

The app is complete when:
1. ✅ Can receive SMS and store in database
2. ✅ Can send SMS replies (manual and AI-generated)
3. ✅ AI generates contextual responses using conversation history
4. ✅ Photos can be received, viewed, and analyzed by AI
5. ✅ Work orders can be generated and copied
6. ✅ Background service runs continuously
7. ✅ All settings are persistent
8. ✅ APK can be installed and run on Android phone

Now build the complete application with all these features!
```

---

## How to Use This File:

1. **Create your project folder:**
```bash
mkdir sms-ai-assistant
cd sms-ai-assistant
```

2. **Save the above content as `claude.md`** in that folder

3. **Start Claude Code:**
```bash
claude code
```

4. **Point it to the file:**
```bash
Use the instructions in claude.md to build the complete SMS AI Assistant Android app
```

Claude Code will read the file and start building everything according to these specifications!

Let me know when you're ready to start and if you have any questions!