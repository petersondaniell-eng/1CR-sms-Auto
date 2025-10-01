# Windows Path Length Fix

## Issue
The project path is too long for Windows builds:
```
C:\Users\Owner\Desktop\App Development\1CR SMS Automation\SmsAiAssistant\
```

Combined with deep node_modules paths, this exceeds Windows' 260-character limit during C++ compilation.

## Solution: Move to Shorter Path

### Step 1: Create New Directory
```bash
mkdir C:\Dev
```

### Step 2: Move Project
Move the entire project folder from:
```
C:\Users\Owner\Desktop\App Development\1CR SMS Automation\
```

To:
```
C:\Dev\SMSApp\
```

**New full path will be:**
```
C:\Dev\SMSApp\SmsAiAssistant\android\
```

This saves ~50 characters, which is enough for the build to succeed.

### Step 3: Git Remote Will Still Work
The git remote configuration is stored in `.git/config` and will remain intact after moving. No changes needed!

### Step 4: Rebuild
```bash
cd C:\Dev\SMSApp\SmsAiAssistant\android
set JAVA_HOME=C:\Program Files\Java\jdk-21
gradlew clean assembleDebug
```

## Benefits
- ✅ Shorter base path (37 vs 87 characters)
- ✅ Standard development location
- ✅ Faster to type/navigate
- ✅ More professional structure
- ✅ Easier to work with in VS Code/IDE

## After Moving
Update any shortcuts, IDE project paths, or terminal bookmarks to point to the new location.