# Testing Guide - SMS AI Assistant

## Phase 1 Status: Pre-Testing (JDK Compatibility Issue)

### Current Issue

The project requires **JDK 21 or JDK 23** (LTS versions) to build successfully.

**Problem**: JDK 25 is currently installed, but Gradle 8.14.3 does not support Java 25 (class file major version 69).

### Solution: Install JDK 21 LTS

#### Option 1: Download Oracle JDK 21 (Recommended)
1. Download from: https://www.oracle.com/java/technologies/downloads/#java21
2. Choose: Windows x64 Installer
3. Install to default location: `C:\Program Files\Java\jdk-21`
4. Set JAVA_HOME environment variable:
   ```bash
   setx JAVA_HOME "C:\Program Files\Java\jdk-21"
   setx PATH "%JAVA_HOME%\bin;%PATH%"
   ```

#### Option 2: Use Adoptium OpenJDK 21
1. Download from: https://adoptium.net/temurin/releases/?version=21
2. Install and set JAVA_HOME as above

### Building the Android APK

Once JDK 21 is installed:

```bash
cd "SmsAiAssistant/android"
./gradlew assembleDebug
```

The APK will be located at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Installing on Android Device

#### Prerequisites
1. **Enable Developer Options** on your Android phone:
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
   - Go back to Settings > Developer Options

2. **Enable USB Debugging**:
   - In Developer Options, enable "USB Debugging"

3. **Install ADB** (Android Debug Bridge):
   - Download Android Platform Tools: https://developer.android.com/tools/releases/platform-tools
   - Extract and add to PATH

#### Install APK
```bash
# Check device is connected
adb devices

# Install the app
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or use React Native CLI
npm run android
```

### Testing Checklist

Once installed, verify:

- [ ] App launches without crashes
- [ ] Navigation between 3 tabs works (Messages, Training, Settings)
- [ ] Database initializes successfully (check logs)
- [ ] UI renders correctly with proper colors and styling
- [ ] Settings screen displays all options
- [ ] Training screen shows AI instructions textarea
- [ ] Messages screen shows "No conversations yet" placeholder

### Known Limitations (Phase 1)

- **No SMS functionality yet** - Native modules will be added in Phase 2
- **No AI integration** - API service will be added in Phase 2
- **No permission requests** - Runtime permissions in Phase 2
- **No work order feature** - Coming in Phase 2
- **No conversation detail screen** - Coming in Phase 2

### Development Environment

**Recommended Setup**:
- Node.js 20+
- JDK 21 LTS
- Android SDK (API 26-36)
- React Native 0.81.4
- Android phone running Android 8.0+ (API 26+)

### Troubleshooting

#### Build fails with "Unsupported class file major version 69"
- You're using JDK 25. Install JDK 21 instead.

#### "adb: command not found"
- Install Android Platform Tools and add to PATH

#### "No devices found"
- Enable USB Debugging on phone
- Use correct USB cable (some are charging-only)
- Accept USB debugging prompt on phone

#### Metro bundler errors
```bash
# Clear cache and restart
cd SmsAiAssistant
npm start -- --reset-cache
```

#### Gradle build is slow
```bash
# Enable Gradle daemon (add to gradle.properties)
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.caching=true
```

### Next Steps

After successful Phase 1 testing:
1. ✅ Verify app structure works
2. ✅ Confirm UI/Navigation functional
3. ✅ Database initialization works
4. → Proceed to Phase 2: Native Android modules
5. → Add SMS BroadcastReceiver
6. → Implement background service
7. → Create React Native bridge

---

## Phase 2 Preview

Phase 2 will add:
- Native Android SMS receiver (Java/Kotlin)
- Background service for 24/7 monitoring
- SmsModule bridge to React Native
- Conversation detail screen
- Claude API integration service
- Permission request handling
- Work order feature
- Photo handling (MMS)

Stay tuned!