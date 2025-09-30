import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../constants/theme';

const SettingsScreen = () => {
  const [autoReply, setAutoReply] = useState(false);
  const [notifyBeforeSend, setNotifyBeforeSend] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [businessHoursStart, setBusinessHoursStart] = useState('09:00');
  const [businessHoursEnd, setBusinessHoursEnd] = useState('17:00');
  const [autoDeletePhotos, setAutoDeletePhotos] = useState(false);
  const [autoDeleteDays, setAutoDeleteDays] = useState('30');

  const handleTestPermissions = () => {
    Alert.alert(
      'Test Permissions',
      'This will check SMS, contacts, and storage permissions (Coming in Phase 2)'
    );
  };

  const handleSaveSettings = () => {
    // TODO: Save to AsyncStorage
    Alert.alert('Success', 'Settings saved successfully');
  };

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
          <View style={styles.timeInputRow}>
            <View style={styles.timeInputContainer}>
              <Text style={styles.timeLabel}>Start</Text>
              <TextInput
                style={styles.timeInput}
                value={businessHoursStart}
                onChangeText={setBusinessHoursStart}
                placeholder="09:00"
                keyboardType="default"
              />
            </View>
            <View style={styles.timeInputContainer}>
              <Text style={styles.timeLabel}>End</Text>
              <TextInput
                style={styles.timeInput}
                value={businessHoursEnd}
                onChangeText={setBusinessHoursEnd}
                placeholder="17:00"
                keyboardType="default"
              />
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
            <View style={styles.daysInputContainer}>
              <Text style={styles.settingLabel}>Delete after (days):</Text>
              <TextInput
                style={styles.daysInput}
                value={autoDeleteDays}
                onChangeText={setAutoDeleteDays}
                keyboardType="numeric"
                placeholder="30"
              />
            </View>
          )}
          <Text style={styles.storageInfo}>Storage used: 0 MB (0 photos)</Text>
        </View>

        {/* Test Permissions Button */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleTestPermissions}>
          <Text style={styles.secondaryButtonText}>Test SMS Permissions</Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
          <Text style={styles.saveButtonText}>Save Settings</Text>
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
  timeInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeInputContainer: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  timeLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  timeInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    textAlign: 'center',
  },
  daysInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  daysInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.text,
    width: 80,
    marginLeft: Spacing.md,
    textAlign: 'center',
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