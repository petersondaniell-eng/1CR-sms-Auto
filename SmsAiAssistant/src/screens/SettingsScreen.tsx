import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../constants/theme';
import settingsService from '../services/settingsService';
import databaseService from '../services/databaseService';
import SmsModule from '../types/nativeModules';

const SettingsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [autoReply, setAutoReply] = useState(false);
  const [notifyBeforeSend, setNotifyBeforeSend] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [businessHoursStart, setBusinessHoursStart] = useState(9);
  const [businessHoursEnd, setBusinessHoursEnd] = useState(17);
  const [autoDeletePhotos, setAutoDeletePhotos] = useState(false);
  const [autoDeleteDays, setAutoDeleteDays] = useState(30);
  const [photoStorageInfo, setPhotoStorageInfo] = useState({ totalSizeMB: 0, photoCount: 0 });

  useEffect(() => {
    loadSettings();
    loadPhotoStorage();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await settingsService.getSettings();

      setAutoReply(settings.autoReplyEnabled);
      setNotifyBeforeSend(settings.notifyBeforeRespond);
      setApiKey(settings.claudeApiKey);
      setBusinessHoursStart(settings.businessHoursStart);
      setBusinessHoursEnd(settings.businessHoursEnd);
      setAutoDeletePhotos(settings.autoDeletePhotos);
      setAutoDeleteDays(settings.autoDeletePhotosDays);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPhotoStorage = async () => {
    try {
      const info = await databaseService.getPhotoStorageInfo();
      setPhotoStorageInfo(info);
    } catch (error) {
      console.error('Error loading photo storage:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (saving) return;

    setSaving(true);
    try {
      const success = await settingsService.saveSettings({
        autoReplyEnabled: autoReply,
        notifyBeforeRespond: notifyBeforeSend,
        claudeApiKey: apiKey,
        businessHoursStart,
        businessHoursEnd,
        autoDeletePhotos,
        autoDeletePhotosDays: autoDeleteDays,
      });

      if (success) {
        Alert.alert('Success', 'Settings saved successfully');

        // Start or stop background service based on auto-reply setting
        if (autoReply) {
          await SmsModule.startBackgroundService();
        }
      } else {
        Alert.alert('Error', 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestPermissions = async () => {
    try {
      const permissions = await SmsModule.checkSmsPermissions();

      const permissionStatus = `
SMS Permissions Status:

Send SMS: ${permissions.sendSms ? '✅' : '❌'}
Receive SMS: ${permissions.receiveSms ? '✅' : '❌'}
Read SMS: ${permissions.readSms ? '✅' : '❌'}

All permissions: ${permissions.allGranted ? '✅ Granted' : '❌ Missing'}
      `.trim();

      Alert.alert('SMS Permissions', permissionStatus, [
        {
          text: permissions.allGranted ? 'OK' : 'Request Permissions',
          onPress: permissions.allGranted ? undefined : handleRequestPermissions,
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } catch (error) {
      console.error('Error checking permissions:', error);
      Alert.alert('Error', 'Failed to check permissions');
    }
  };

  const handleRequestPermissions = async () => {
    try {
      await SmsModule.requestSmsPermissions();
      // Wait a moment then check again
      setTimeout(handleTestPermissions, 1000);
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const handleDeleteOldPhotos = async () => {
    if (!autoDeletePhotos) return;

    Alert.alert(
      'Delete Old Photos',
      `This will delete photos older than ${autoDeleteDays} days. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const deletedCount = await databaseService.deleteOldPhotos(autoDeleteDays);
              Alert.alert('Success', `Deleted ${deletedCount} old photos`);
              loadPhotoStorage();
            } catch (error) {
              console.error('Error deleting photos:', error);
              Alert.alert('Error', 'Failed to delete photos');
            }
          },
        },
      ]
    );
  };

  const formatHour = (hour: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Auto Reply Section */}
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Auto-Reply</Text>
              <Text style={styles.settingDescription}>
                Automatically respond to incoming SMS
              </Text>
            </View>
            <Switch
              value={autoReply}
              onValueChange={setAutoReply}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Notify Before Send */}
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Notify Before AI Responds</Text>
              <Text style={styles.settingDescription}>
                Show notification before sending AI reply
              </Text>
            </View>
            <Switch
              value={notifyBeforeSend}
              onValueChange={setNotifyBeforeSend}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Business Hours */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Business Hours</Text>
          <Text style={styles.cardDescription}>
            AI will only respond during these hours
          </Text>
          <View style={styles.timeRow}>
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Start: {formatHour(businessHoursStart)}</Text>
              <View style={styles.timeButtonRow}>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setBusinessHoursStart(Math.max(0, businessHoursStart - 1))}>
                  <Text style={styles.timeButtonText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setBusinessHoursStart(Math.min(23, businessHoursStart + 1))}>
                  <Text style={styles.timeButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>End: {formatHour(businessHoursEnd)}</Text>
              <View style={styles.timeButtonRow}>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setBusinessHoursEnd(Math.max(0, businessHoursEnd - 1))}>
                  <Text style={styles.timeButtonText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setBusinessHoursEnd(Math.min(23, businessHoursEnd + 1))}>
                  <Text style={styles.timeButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* API Key */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Claude API Key</Text>
          <Text style={styles.cardDescription}>
            Required for AI functionality
          </Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="sk-ant-..."
            secureTextEntry
            placeholderTextColor={Colors.textLight}
          />
        </View>

        {/* Photo Storage */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Photo Storage</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Auto-Delete Photos</Text>
              <Text style={styles.settingDescription}>
                Automatically delete old photos
              </Text>
            </View>
            <Switch
              value={autoDeletePhotos}
              onValueChange={setAutoDeletePhotos}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          {autoDeletePhotos && (
            <>
              <View style={styles.daysInputContainer}>
                <Text style={styles.settingLabel}>Delete after (days):</Text>
                <View style={styles.daysButtonRow}>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setAutoDeleteDays(Math.max(1, autoDeleteDays - 5))}>
                    <Text style={styles.timeButtonText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.daysValue}>{autoDeleteDays}</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setAutoDeleteDays(autoDeleteDays + 5)}>
                    <Text style={styles.timeButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteOldPhotos}>
                <Text style={styles.deleteButtonText}>Delete Old Photos Now</Text>
              </TouchableOpacity>
            </>
          )}
          <Text style={styles.storageInfo}>
            Storage used: {photoStorageInfo.totalSizeMB.toFixed(2)} MB ({photoStorageInfo.photoCount} photos)
          </Text>
        </View>

        {/* Test Permissions Button */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleTestPermissions}>
          <Text style={styles.secondaryButtonText}>Test SMS Permissions</Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveSettings}
          disabled={saving}>
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  cardTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  cardDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    marginBottom: Spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTextContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingLabel: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  settingDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeItem: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  timeLabel: {
    fontSize: FontSizes.md,
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  timeButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  timeButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
  },
  timeButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  daysInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  daysButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  daysValue: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginHorizontal: Spacing.md,
    minWidth: 40,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  storageInfo: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
    ...Shadows.medium,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.textLight,
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 2,
    borderColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
});

export default SettingsScreen;
