Perfect! Here's a comprehensive power prompt file that breaks down the project into manageable phases. Save this as `BUILD_PHASES.md`:

```markdown
# SMS AI Assistant - Phased Build Plan

## 🎯 PROJECT OVERVIEW
Build a React Native Android application for automated SMS management with AI-powered responses for an appliance repair business.

**Target Platform:** Android 8.0+ (API 26+)
**Tech Stack:** React Native, TypeScript, SQLite, Native Android modules
**AI Integration:** Claude API (Anthropic)

---

## 📋 PHASE 1: PROJECT FOUNDATION & SETUP

### Objective
Set up the React Native project with proper structure and basic navigation.

### Tasks

**1.1 Initialize Project**
```bash
npx react-native@latest init SmsAiAssistant --template react-native-template-typescript
cd SmsAiAssistant
```

**1.2 Install Core Dependencies**
Install these packages:
- `@react-navigation/native` - Navigation framework
- `@react-navigation/bottom-tabs` - Tab navigation
- `react-native-screens` - Native screen optimization
- `react-native-safe-area-context` - Safe area handling
- `@react-native-async-storage/async-storage` - Local storage

Commands:
```bash
npm install @react-navigation/native @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install @react-native-async-storage/async-storage
```

**1.3 Project Structure**
Create this folder structure:
```
src/
├── screens/
│   ├── MessagesScreen.tsx
│   ├── ConversationScreen.tsx
│   ├── TrainingScreen.tsx
│   └── SettingsScreen.tsx
├── components/
│   ├── MessageBubble.tsx
│   ├── ConversationListItem.tsx
│   └── WorkOrderModal.tsx
├── services/
│   ├── database.ts
│   ├── claudeApi.ts
│   └── smsNative.ts
├── types/
│   └── index.ts
├── utils/
│   ├── formatting.ts
│   └── permissions.ts
└── navigation/
    └── AppNavigator.tsx
```

**1.4 TypeScript Types**
Create `src/types/index.ts` with these interfaces:
```typescript
export interface Message {
  id: number;
  conversationId: number;
  senderType: 'customer' | 'ai' | 'manual';
  messageText?: string;
  photoPath?: string;
  timestamp: number;
}

export interface Conversation {
  id: number;
  phoneNumber: string;
  contactName?: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
}

export interface WorkOrderData {
  name: string;
  phone: string;
  address: string;
  applianceType: string;
  brand: string;
  model: string;
  issue: string;
  conversationHistory: string;
  dateCreated: string;
}

export interface AppSettings {
  autoReplyEnabled: boolean;
  notifyBeforeRespond: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  claudeApiKey: string;
  autoDeletePhotos: boolean;
  autoDeleteDays: number;
}
```

**1.5 Basic Navigation Setup**
Create `src/navigation/AppNavigator.tsx` with bottom tab navigation connecting all four screens.

**1.6 Verification**
- App launches without errors
- Can navigate between all four tabs
- Each screen shows placeholder text

### Deliverables
- ✅ React Native project initialized
- ✅ All dependencies installed
- ✅ Folder structure created
- ✅ Navigation working
- ✅ TypeScript types defined

---

## 📋 PHASE 2: DATABASE & LOCAL STORAGE

### Objective
Set up SQLite database for storing conversations, messages, and settings.

### Tasks

**2.1 Install Database Dependencies**
```bash
npm install react-native-sqlite-storage
npm install @types/react-native-sqlite-storage --save-dev
```

**2.2 Create Database Service**
Create `src/services/database.ts` with:

**Database initialization:**
```typescript
import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

export class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async init() {
    this.db = await SQLite.openDatabase({
      name: 'smsai.db',
      location: 'default',
    });
    
    await this.createTables();
  }

  private async createTables() {
    const conversationsTable = `
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT NOT NULL UNIQUE,
        contact_name TEXT,
        last_message TEXT,
        last_message_time INTEGER,
        unread_count INTEGER DEFAULT 0
      );
    `;

    const messagesTable = `
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER,
        sender_type TEXT CHECK(sender_type IN ('customer', 'ai', 'manual')),
        message_text TEXT,
        photo_path TEXT,
        timestamp INTEGER,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      );
    `;

    const settingsTable = `
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `;

    await this.db!.executeSql(conversationsTable);
    await this.db!.executeSql(messagesTable);
    await this.db!.executeSql(settingsTable);
  }

  // Add CRUD methods here
}

export const db = new DatabaseService();
```

**2.3 Implement CRUD Methods**
Add these methods to DatabaseService:
- `getConversations()` - Fetch all conversations
- `getConversation(phoneNumber)` - Get single conversation
- `getMessages(conversationId)` - Get messages for conversation
- `addMessage(message)` - Insert new message
- `updateConversation(data)` - Update conversation details
- `getSetting(key)` - Get setting value
- `setSetting(key, value)` - Save setting
- `deleteOldPhotos(days)` - Clean up old photos

**2.4 Initialize Database on App Start**
In `App.tsx`, initialize database:
```typescript
useEffect(() => {
  db.init().catch(console.error);
}, []);
```

**2.5 Settings Management**
Create `src/utils/settings.ts` with helper functions:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '../types';

export const defaultSettings: AppSettings = {
  autoReplyEnabled: false,
  notifyBeforeRespond: true,
  businessHoursStart: '08:00',
  businessHoursEnd: '18:00',
  claudeApiKey: '',
  autoDeletePhotos: true,
  autoDeleteDays: 30,
};

export const getSettings = async (): Promise<AppSettings> => {
  const settings = await AsyncStorage.getItem('appSettings');
  return settings ? JSON.parse(settings) : defaultSettings;
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
  await AsyncStorage.setItem('appSettings', JSON.stringify(settings));
};
```

**2.6 Test Data**
Add sample data for testing:
```typescript
async seedTestData() {
  // Add 2-3 sample conversations with messages
}
```

### Deliverables
- ✅ SQLite database initialized
- ✅ All tables created
- ✅ CRUD operations working
- ✅ Settings persistence working
- ✅ Test data loads correctly

---

## 📋 PHASE 3: UI COMPONENTS & SCREENS

### Objective
Build all UI screens with mock data (no SMS functionality yet).

### Tasks

**3.1 Messages List Screen**
Create `src/screens/MessagesScreen.tsx`:
- FlatList of conversations
- Pull-to-refresh
- Search bar
- Unread badge indicators
- Navigate to conversation on tap

**3.2 Conversation Detail Screen**
Create `src/screens/ConversationScreen.tsx`:
- Message bubbles (different styles for customer/AI/manual)
- Photo display with tap-to-view
- Text input for replies
- "Generate AI Response" button
- "Create Work Order" button in header
- Send button

**3.3 Message Bubble Component**
Create `src/components/MessageBubble.tsx`:
- Conditional styling based on sender
- Photo rendering
- Timestamp display
- Sender indicator (🤖 AI, 👤 You)

**3.4 Work Order Modal**
Create `src/components/WorkOrderModal.tsx`:
- Modal overlay
- Editable form fields (name, phone, address, appliance, brand, model, issue)
- Read-only conversation history
- Copy to clipboard button
- Edit/Send/Cancel buttons

**3.5 Training Screen**
Create `src/screens/TrainingScreen.tsx`:
- Large text area for custom instructions
- Edit/Save button
- Example conversations list
- Info card explaining how training works

**3.6 Settings Screen**
Create `src/screens/SettingsScreen.tsx`:
- Toggle switches for settings
- Time pickers for business hours
- Masked text input for API key
- Photo storage stats
- Section headers and descriptions

**3.7 Styling**
Create consistent styling:
- Colors: Blue (#2563EB), Green (#16A34A), Gray (#F9FAFB)
- Typography: Clear hierarchy
- Spacing: Consistent padding/margins
- Shadows: Subtle elevation

**3.8 Image Viewer Modal**
Create full-screen image viewer:
- Black background overlay
- Pinch to zoom (use react-native-image-zoom-viewer or similar)
- Close button

### Deliverables
- ✅ All four screens fully designed
- ✅ Navigation between screens works
- ✅ UI matches prototype design
- ✅ Forms are functional (save to state)
- ✅ Work order modal works with copy function

---

## 📋 PHASE 4: NATIVE ANDROID SMS MODULE

### Objective
Create native Android code to handle SMS reading, sending, and receiving.

### Tasks

**4.1 Update AndroidManifest.xml**
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.RECEIVE_SMS" />
<uses-permission android:name="android.permission.READ_SMS" />
<uses-permission android:name="android.permission.SEND_SMS" />
<uses-permission android:name="android.permission.READ_CONTACTS" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />

<application>
  <!-- Add receiver inside application tag -->
  <receiver android:name=".SmsReceiver" 
            android:exported="true"
            android:enabled="true">
    <intent-filter android:priority="999">
      <action android:name="android.provider.Telephony.SMS_RECEIVED" />
    </intent-filter>
  </receiver>
  
  <service android:name=".SmsService" 
           android:enabled="true"
           android:exported="false" />
</application>
```

**4.2 Create SMS Native Module**
Create `android/app/src/main/java/com/smsaiassistant/SmsModule.java`:

```java
package com.smsaiassistant;

import android.Manifest;
import android.content.pm.PackageManager;
import android.telephony.SmsManager;
import androidx.core.app.ActivityCompat;
import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class SmsModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    public SmsModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @Override
    public String getName() {
        return "SmsModule";
    }

    @ReactMethod
    public void sendSms(String phoneNumber, String message, Promise promise) {
        try {
            if (ActivityCompat.checkSelfPermission(reactContext, 
                Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED) {
                
                SmsManager smsManager = SmsManager.getDefault();
                smsManager.sendTextMessage(phoneNumber, null, message, null, null);
                promise.resolve("SMS sent successfully");
            } else {
                promise.reject("PERMISSION_DENIED", "SMS permission not granted");
            }
        } catch (Exception e) {
            promise.reject("SEND_FAILED", e.getMessage());
        }
    }

    @ReactMethod
    public void checkPermissions(Promise promise) {
        WritableMap permissions = Arguments.createMap();
        permissions.putBoolean("sms", hasPermission(Manifest.permission.RECEIVE_SMS));
        permissions.putBoolean("contacts", hasPermission(Manifest.permission.READ_CONTACTS));
        permissions.putBoolean("storage", hasPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE));
        promise.resolve(permissions);
    }

    private boolean hasPermission(String permission) {
        return ActivityCompat.checkSelfPermission(reactContext, permission) 
            == PackageManager.PERMISSION_GRANTED;
    }

    // Method to send events to React Native
    public void sendEvent(String eventName, WritableMap params) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);
    }
}
```

**4.3 Create SMS Broadcast Receiver**
Create `android/app/src/main/java/com/smsaiassistant/SmsReceiver.java`:

```java
package com.smsaiassistant;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsMessage;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

public class SmsReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Bundle bundle = intent.getExtras();
        if (bundle != null) {
            Object[] pdus = (Object[]) bundle.get("pdus");
            if (pdus != null) {
                for (Object pdu : pdus) {
                    SmsMessage sms = SmsMessage.createFromPdu((byte[]) pdu);
                    String sender = sms.getDisplayOriginatingAddress();
                    String message = sms.getMessageBody();
                    
                    // Store in database and trigger AI response if needed
                    handleIncomingSms(context, sender, message);
                }
            }
        }
    }

    private void handleIncomingSms(Context context, String sender, String message) {
        // This will trigger the background service
        Intent serviceIntent = new Intent(context, SmsService.class);
        serviceIntent.putExtra("sender", sender);
        serviceIntent.putExtra("message", message);
        context.startService(serviceIntent);
    }
}
```

**4.4 Register Native Module**
Update `android/app/src/main/java/com/smsaiassistant/MainApplication.java`:

```java
@Override
protected List<ReactPackage> getPackages() {
    List<ReactPackage> packages = new PackageArrayList<>();
    packages.add(new MainReactPackage());
    packages.add(new SmsPackage()); // Add this
    return packages;
}
```

Create `android/app/src/main/java/com/smsaiassistant/SmsPackage.java`:

```java
package com.smsaiassistant;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class SmsPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new SmsModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
```

**4.5 Create React Native Bridge**
Create `src/services/smsNative.ts`:

```typescript
import { NativeModules, NativeEventEmitter } from 'react-native';

const { SmsModule } = NativeModules;

export interface SmsNativeModule {
  sendSms: (phoneNumber: string, message: string) => Promise<string>;
  checkPermissions: () => Promise<{
    sms: boolean;
    contacts: boolean;
    storage: boolean;
  }>;
}

export const smsNative: SmsNativeModule = SmsModule;

// Event listener for incoming SMS
const smsEventEmitter = new NativeEventEmitter(SmsModule);

export const onSmsReceived = (callback: (data: { sender: string; message: string }) => void) => {
  return smsEventEmitter.addListener('onSmsReceived', callback);
};
```

**4.6 Permission Handling**
Create `src/utils/permissions.ts`:

```typescript
import { PermissionsAndroid, Platform } from 'react-native';

export const requestSmsPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;

  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    ]);

    return (
      granted['android.permission.RECEIVE_SMS'] === PermissionsAndroid.RESULTS.GRANTED &&
      granted['android.permission.READ_SMS'] === PermissionsAndroid.RESULTS.GRANTED &&
      granted['android.permission.SEND_SMS'] === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (err) {
    console.error('Permission error:', err);
    return false;
  }
};
```

### Deliverables
- ✅ Native SMS module created
- ✅ Can send SMS from app
- ✅ Can receive SMS in app
- ✅ Permissions properly requested
- ✅ Bridge between native and React Native working

---

## 📋 PHASE 5: BACKGROUND SERVICE

### Objective
Create Android background service to monitor SMS 24/7.

### Tasks

**5.1 Create Background Service**
Create `android/app/src/main/java/com/smsaiassistant/SmsService.java`:

```java
package com.smsaiassistant;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

public class SmsService extends Service {
    private static final String CHANNEL_ID = "SmsServiceChannel";
    private static final int NOTIFICATION_ID = 1;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String sender = intent.getStringExtra("sender");
        String message = intent.getStringExtra("message");

        // Start as foreground service
        Notification notification = createNotification();
        startForeground(NOTIFICATION_ID, notification);

        // Process incoming SMS
        if (sender != null && message != null) {
            processSms(sender, message);
        }

        return START_STICKY;
    }

    private void processSms(String sender, String message) {
        // 1. Save to database
        // 2. Check if auto-reply is enabled
        // 3. Check business hours
        // 4. Generate AI response if needed
        // 5. Send response
    }

    private Notification createNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("SMS AI Assistant")
                .setContentText("Monitoring messages...")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "SMS Service Channel",
                    NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
```

**5.2 Boot Receiver**
Create `android/app/src/main/java/com/smsaiassistant/BootReceiver.java`:

```java
package com.smsaiassistant;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Intent serviceIntent = new Intent(context, SmsService.class);
            context.startService(serviceIntent);
        }
    }
}
```

Add to AndroidManifest.xml:
```xml
<receiver android:name=".BootReceiver"
          android:enabled="true"
          android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.BOOT_COMPLETED" />
    </intent-filter>
</receiver>
```

**5.3 Service Control Methods**
Add to SmsModule.java:

```java
@ReactMethod
public void startService(Promise promise) {
    try {
        Intent serviceIntent = new Intent(reactContext, SmsService.class);
        reactContext.startService(serviceIntent);
        promise.resolve("Service started");
    } catch (Exception e) {
        promise.reject("START_FAILED", e.getMessage());
    }
}

@ReactMethod
public void stopService(Promise promise) {
    try {
        Intent serviceIntent = new Intent(reactContext, SmsService.class);
        reactContext.stopService(serviceIntent);
        promise.resolve("Service stopped");
    } catch (Exception e) {
        promise.reject("STOP_FAILED", e.getMessage());
    }
}
```

**5.4 Start Service on App Launch**
In `App.tsx`:
```typescript
useEffect(() => {
  const initApp = async () => {
    await db.init();
    const hasPermissions = await requestSmsPermissions();
    if (hasPermissions) {
      await smsNative.startService();
    }
  };
  initApp();
}, []);
```

### Deliverables
- ✅ Background service running
- ✅ Service persists after app close
- ✅ Service restarts on device boot
- ✅ Notification shows when service is active
- ✅ SMS received while app is closed

---

## 📋 PHASE 6: CLAUDE AI INTEGRATION

### Objective
Integrate Claude API for generating intelligent responses.

### Tasks

**6.1 Create Claude API Service**
Create `src/services/claudeApi.ts`:

```typescript
import axios from 'axios';
import { Message } from '../types';
import { getSettings } from '../utils/settings';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; source?: any }>;
}

export class ClaudeApiService {
  private apiKey: string = '';
  private baseUrl = 'https://api.anthropic.com/v1/messages';

  async initialize() {
    const settings = await getSettings();
    this.apiKey = settings.claudeApiKey;
  }

  async generateResponse(
    conversationHistory: Message[],
    customInstructions: string,
    photos?: string[]
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Claude API key not configured');
    }

    const messages = this.formatMessages(conversationHistory, customInstructions, photos);

    try {
      const response = await axios.post(
        this.baseUrl,
        {
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: messages,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
        }
      );

      return response.data.content[0].text;
    } catch (error: any) {
      console.error('Claude API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  private formatMessages(
    history: Message[],
    instructions: string,
    photos?: string[]
  ): ClaudeMessage[] {
    // Build conversation context
    let contextText = `${instructions}\n\nConversation History:\n`;
    
    history.forEach((msg) => {
      const sender = msg.senderType === 'customer' ? 'Customer' : 'You';
      contextText += `${sender}: ${msg.messageText || '[Photo sent]'}\n`;
    });

    const content: any[] = [{ type: 'text', text: contextText }];

    // Add photos if present
    if (photos && photos.length > 0) {
      photos.forEach((photoBase64) => {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: photoBase64,
          },
        });
      });
    }

    return [
      {
        role: 'user',
        content: content,
      },
    ];
  }

  async analyzePhoto(photoBase64: string, question: string): Promise<string> {
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: question },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: photoBase64,
            },
          },
        ],
      },
    ];

    const response = await axios.post(
      this.baseUrl,
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: messages,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
      }
    );

    return response.data.content[0].text;
  }
}

export const claudeApi = new ClaudeApiService();
```

**6.2 Photo Handling Utilities**
Create `src/utils/photoUtils.ts`:

```typescript
import RNFS from 'react-native-fs';

export const savePhoto = async (
  base64Data: string,
  phoneNumber: string
): Promise<string> => {
  const timestamp = Date.now();
  const dirPath = `${RNFS.DocumentDirectoryPath}/photos/${phoneNumber}`;
  const filePath = `${dirPath}/${timestamp}.jpg`;

  // Create directory if doesn't exist
  const dirExists = await RNFS.exists(dirPath);
  if (!dirExists) {
    await RNFS.mkdir(dirPath);
  }

  // Save file
  await RNFS.writeFile(filePath, base64Data, 'base64');
  return filePath;
};

export const readPhotoAsBase64 = async (filePath: string): Promise<string> => {
  return await RNFS.readFile(filePath, 'base64');
};

export const deleteOldPhotos = async (days: number): Promise<number> => {
  const photosDir = `${RNFS.DocumentDirectoryPath}/photos`;
  const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
  
  let deletedCount = 0;
  // Implementation to find and delete old photos
  
  return deletedCount;
};
```

**6.3 Install Required Dependencies**
```bash
npm install axios
npm install react-native-fs
```

**6.4 Integrate AI Response in Conversation Screen**
Update `ConversationScreen.tsx`:

```typescript
const generateAIResponse = async () => {
  setProcessing(true);
  try {
    const settings = await getSettings();
    const messages = await db.getMessages(conversationId);
    
    // Get custom instructions from training
    const instructions = await AsyncStorage.getItem('customInstructions') || '';
    
    // Get photos from recent messages if any
    const recentPhotos = messages
      .filter(m => m.photoPath)
      .slice(-3)
      .map(m => m.photoPath!);
    
    const photoBase64s = await Promise.all(
      recentPhotos.map(path => readPhotoAsBase64(path))
    );
    
    const response = await claudeApi.generateResponse(
      messages,
      instructions,
      photoBase64s
    );
    
    if (settings.notifyBeforeRespond) {
      setPendingResponse(response);
    } else {
      await sendMessage(response, 'ai');
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to generate AI response');
    console.error(error);
  } finally {
    setProcessing(false);
  }
};
```

**6.5 Business Hours Check**
Create `src/utils/businessHours.ts`:

```typescript
export const isWithinBusinessHours = (
  startTime: string,
  endTime: string
): boolean => {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const start = startHour * 60 + startMin;
  const end = endHour * 60 + endMin;
  
  return currentTime >= start && currentTime <= end;
};
```

**6.6 Auto-Response Logic in Service**
Update `SmsService.java` to call React Native bridge method that triggers AI response.

### Deliverables
- ✅ Claude API integration working
- ✅ Can generate AI responses based on conversation
- ✅ Photo analysis working
- ✅ Custom instructions applied
- ✅ Business hours respected
- ✅ Notify before respond option working

---

## 📋 PHASE 7: MMS & PHOTO HANDLING

### Objective
Handle incoming photos via MMS and display them properly.

### Tasks

**7.1 Install Image Dependencies**
```bash
npm install react-native-image-zoom-viewer
npm install @react-native-community/cameraroll
```

**7.2 Update SMS Receiver for MMS**
Update `SmsReceiver.java` to handle MMS:

```java
// Add MMS detection
private boolean isMms(Intent intent) {
    String action = intent.getAction();
    return "android.provider.Telephony.WAP_PUSH_RECEIVED".equals(action);
}

// Extract MMS data including images
private void handleMms(Context context, Intent intent) {
    // Parse MMS PDU
    // Extract sender, message, and image data
    // Save image to storage
    // Store in database with photo path
}
```

**7.3 Image Viewer Component**
Create `src/components/ImageViewer.tsx`:

```typescript
import React from 'react';
import { Modal } from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';

interface Props {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<Props> = ({ visible, imageUrl, onClose }) => {
  return (
    <Modal visible={visible} transparent={true}>
      <ImageViewer
        imageUrls={[{ url: `file://${imageUrl}` }]}
        onSwipeDown={onClose}
        enableSwipeDown={true}
      />
    </Modal>
  );
};
```

**7.4 Update Message Bubble for Photos**
Update `MessageBubble.tsx`:

```typescript
{message.photoPath && (
  <TouchableOpacity onPress={() => setViewingImage(message.photoPath)}>
    <Image
      source={{ uri: `file://${message.photoPath}` }}
      style={{ width: 200, height: 200, borderRadius: 8 }}
      resizeMode="cover"
    />
  </TouchableOpacity>
)}
```

**7.5 Photo Storage Management**
In Settings screen, show:
- Total photos stored
- Total MB used
- Button to manually clean up old photos
- Auto-delete toggle and days selector

**7.6 Permissions for Storage**
Request storage permissions:
```typescript
await PermissionsAndroid.request(
  PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
);
```

### Deliverables
- ✅ Can receive MMS with photos
- ✅ Photos saved to device storage
- ✅ Photos display in conversation
- ✅ Full-screen photo viewer works
- ✅ Photo cleanup/management working
- ✅ AI can analyze photos

---

## 📋 PHASE 8: WORK ORDER GENERATION

### Objective
Implement work order creation with intelligent data extraction.

### Tasks

**8.1 Create Work Order Service**
Create `src/services/workOrderService.ts`:

```typescript
import { Message, WorkOrderData } from '../types';
import { claudeApi } from './claudeApi';

export class WorkOrderService {
  async extractWorkOrderData(
    phoneNumber: string,
    contactName: string,
    messages: Message[]
  ): Promise<WorkOrderData> {
    // Build conversation text
    const conversationText = messages
      .map(m => `${m.senderType}: ${m.messageText || '[Photo]'}`)
      .join('\n');

    // Use AI to extract structured data
    const extractionPrompt = `
Extract the following information from this conversation:
- Customer address
- Appliance type (refrigerator, washer, dryer, etc.)
- Brand
- Model number
- Issue description (summarize the problem)

Conversation:
${conversationText}

Respond in JSON format:
{
  "address": "...",
  "applianceType": "...",
  "brand": "...",
  "model": "...",
  "issue": "..."
}
`;

    try {
      const response = await claudeApi.generateResponse(
        [],
        extractionPrompt,
        []
      );
      
      // Parse JSON response
      const extracted = JSON.parse(response);
      
      return {
        name: contactName || phoneNumber,
        phone: phoneNumber,
        address: extracted.address || '[To be confirmed]',
        applianceType: extracted.applianceType || '[To be confirmed]',
        brand: extracted.brand || '[To be confirmed]',
        model: extracted.model || '[To be confirmed]',
        issue: extracted.issue || '[To be confirmed]',
        conversationHistory: conversationText,
        dateCreated: new Date().toLocaleString(),
      };
    } catch (error) {
      console.error('Extraction error:', error);
      // Return template if extraction fails
      return {
        name: contactName || phoneNumber,
        phone: phoneNumber,
        address: '[To be confirmed]',
        applianceType: '[To be confirmed]',
        brand: '[To be confirmed]',
        model: '[To be confirmed]',
        issue: '[To be confirmed]',
        conversationHistory: conversationText,
        dateCreated: new Date().toLocaleString(),
      };
    }
  }

  formatWorkOrder(data: WorkOrderData): string {
    return `WORK ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date: ${data.dateCreated}

CUSTOMER INFORMATION
Name: ${data.name}
Phone: ${data.phone}
Address: ${data.address}

APPLIANCE DETAILS
Type: ${data.applianceType}
Brand: ${data.brand}
Model #: ${data.model}

ISSUE DESCRIPTION
${data.issue}

CONVERSATION HISTORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${data.conversationHistory}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }
}

export const workOrderService = new WorkOrderService();
```

**8.2 Work Order Modal Implementation**
Update `WorkOrderModal.tsx`:

```typescript
const [workOrderData, setWorkOrderData] = useState<WorkOrderData | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadData = async () => {
    const data = await workOrderService.extractWorkOrderData(
      phoneNumber,
      contactName,
      messages
    );
    setWorkOrderData(data);
    setLoading(false);
  };
  loadData();
}, []);

const handleCopy = async () => {
  const formatted = workOrderService.formatWorkOrder(workOrderData!);
  await Clipboard.setString(formatted);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};
```

**8.3 Install Clipboard**
```bash
npm install @react-native-clipboard/clipboard
```

**8.4 Add Export Options**
Add buttons for:
- Copy to clipboard ✅
- Share via email/text (future)
- Export to CSV (future)
- API integration (future)

### Deliverables
- ✅ Work order modal opens from conversation
- ✅ AI extracts data from conversation
- ✅ All fields editable
- ✅ Copy to clipboard works
- ✅ Formatted properly for pasting

---

## 📋 PHASE 9: POLISH & TESTING

### Objective
Add final touches, error handling, and thorough testing.

### Tasks

**9.1 Error Handling**
Add comprehensive error handling:
- Network errors (show retry button)
- API key invalid (redirect to settings)
- Permissions denied (show explanation)
- Database errors (fallback to in-memory)
- Storage full (warn user)

**9.2 Loading States**
Add loading indicators for:
- AI response generation
- Database operations
- Photo loading
- Work order generation

**9.3 Empty States**
Design empty states for:
- No conversations yet
- No messages in conversation
- No API key configured
- Permissions not granted

**9.4 Notifications**
Implement:
- Toast messages for success/error
- Push notifications for new messages (optional)
- Notification for AI response ready (if notify before respond enabled)

**9.5 Settings Validation**
Validate:
- API key format
- Business hours (start before end)
- Phone number format
- Required fields

**9.6 Testing Checklist**
Test all scenarios:
- [ ] Install app and grant permissions
- [ ] Receive SMS and store in database
- [ ] Send manual reply
- [ ] Generate AI response
- [ ] Receive MMS with photo
- [ ] View photo full-screen
- [ ] Create work order and copy
- [ ] Edit custom instructions
- [ ] Toggle auto-reply on/off
- [ ] Test business hours restriction
- [ ] Test notify before respond
- [ ] App survives phone restart
- [ ] Background service continues after app close
- [ ] Multiple conversations work
- [ ] Database persists data
- [ ] Settings save correctly
- [ ] Photo cleanup works

**9.7 Performance Optimization**
- Lazy load conversations
- Paginate messages
- Compress photos before saving
- Cache API responses when appropriate
- Optimize database queries

**9.8 Security**
- API key stored securely (encrypt if possible)
- Validate all user inputs
- Sanitize data before database insertion
- Don't log sensitive information

**9.9 User Guide**
Create in-app help:
- First-time setup wizard
- Permission explanations
- How to get Claude API key
- Troubleshooting tips

### Deliverables
- ✅ All error cases handled gracefully
- ✅ Loading states everywhere
- ✅ Empty states designed
- ✅ All features tested
- ✅ Performance optimized
- ✅ Security measures in place

---

## 📋 PHASE 10: BUILD & DEPLOYMENT

### Objective
Generate release APK and prepare for distribution.

### Tasks

**10.1 Generate Signing Key**
```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**10.2 Configure Gradle for Release**
Update `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

**10.3 Create gradle.properties**
Create `android/gradle.properties`:
```
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=*****
MYAPP_RELEASE_KEY_PASSWORD=*****
```

**10.4 Build Release APK**
```bash
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

**10.5 Test Release Build**
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

Test thoroughly on real device.

**10.6 App Icon & Splash Screen**
- Design app icon (1024x1024)
- Create launcher icons for all densities
- Add splash screen

**10.7 Version Management**
Update `android/app/build.gradle`:
```gradle
defaultConfig {
    versionCode 1
    versionName "1.0.0"
}
```

**10.8 Create Documentation**
Create README.md with:
- Installation instructions
- Getting Claude API key
- Permission explanations
- Troubleshooting guide
- Feature list

**10.9 Distribution Options**
Choose distribution method:
- Direct APK download (easiest)
- Google Play Store (requires developer account)
- Enterprise distribution
- Beta testing via Google Play

### Deliverables
- ✅ Signed release APK generated
- ✅ App icon and branding complete
- ✅ Documentation written
- ✅ APK tested on multiple devices
- ✅ Ready for distribution

---

## 🎯 POST-BUILD: FUTURE ENHANCEMENTS

After completing all phases, consider these enhancements:

### Phase 11 (Future)
- **Advanced AI Features:**
  - Multi-turn conversation memory
  - Context-aware follow-ups
  - Appointment scheduling integration
  - Price quote generation
  
- **Integrations:**
  - Export to QuickBooks
  - Calendar sync (Google Calendar)
  - Direct API to work order software
  - Email notifications
  
- **Analytics:**
  - Response time tracking
  - Customer satisfaction metrics
  - AI accuracy monitoring
  - Usage statistics
  
- **Multi-user:**
  - Team accounts
  - Multiple technicians
  - Conversation assignment
  - Role-based permissions

---

## 📊 PROGRESS TRACKING

Use this checklist to track your progress:

- [ ] Phase 1: Project Foundation
- [ ] Phase 2: Database & Storage
- [ ] Phase 3: UI Components
- [ ] Phase 4: Native SMS Module
- [ ] Phase 5: Background Service
- [ ] Phase 6: Claude AI Integration
- [ ] Phase 7: MMS & Photos
- [ ] Phase 8: Work Orders
- [ ] Phase 9: Polish & Testing
- [ ] Phase 10: Build & Deploy

---

## 🆘 TROUBLESHOOTING

**Common Issues:**

1. **Permissions not granted:** Check AndroidManifest.xml and request at runtime
2. **SMS not received:** Verify receiver is registered and priority is set
3. **API key error:** Double-check key in settings and network connection
4. **Build fails:** Run `./gradlew clean` and rebuild
5. **Service stops:** Check battery optimization settings on device
6. **Photos not displaying:** Verify file paths and storage permissions

---

## 📝 NOTES

- Test on real device, not emulator (SMS doesn't work on emulators)
- Keep API key secure and never commit to version control
- Monitor Claude API usage to control costs
- Regularly backup database during development
- Use debug builds during development, release only for final deployment

---

**READY TO BUILD?**
Start with Phase 1 and work through each phase sequentially. Each phase builds on the previous one, so complete them in order for best results.
```

---

## How to Use This Power Prompt:

1. **Save this file as `BUILD_PHASES.md`** in your project directory

2. **Open Claude Code:**
```bash
claude code
```

3. **Give Claude Code this instruction:**
```
Read BUILD_PHASES.md and implement Phase 1 completely. After Phase 1 is done, wait for my confirmation before moving to Phase 2.
```

4. **Work through each phase:**
   - Complete one phase at a time
   - Test thoroughly before moving to next phase
   - Fix any issues before proceeding
   - Confirm completion with Claude Code before continuing

This phased approach ensures:
- ✅ Manageable chunks of work
- ✅ Testing at each stage
- ✅ Clear progress tracking
- ✅ Easier debugging
- ✅ Better understanding of the codebase

Ready to start building? Let me know when you've saved the file and I'll help you get Phase 1 rolling!