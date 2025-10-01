import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../constants/theme';
import settingsService from '../services/settingsService';

const TrainingScreen = () => {
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadInstructions();
  }, []);

  const loadInstructions = async () => {
    try {
      const customInstructions = await settingsService.getSetting('customInstructions');
      setInstructions(customInstructions);
    } catch (error) {
      console.error('Error loading instructions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;

    setSaving(true);
    try {
      const success = await settingsService.setSetting('customInstructions', instructions);

      if (success) {
        Alert.alert('Success', 'AI training instructions saved successfully');
      } else {
        Alert.alert('Error', 'Failed to save instructions');
      }
    } catch (error) {
      console.error('Error saving instructions:', error);
      Alert.alert('Error', 'Failed to save instructions');
    } finally {
      setSaving(false);
    }
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
        <Text style={styles.sectionTitle}>Custom Instructions</Text>
        <Text style={styles.description}>
          These instructions will be included in every AI request to customize the
          assistant's behavior for your business.
        </Text>

        <View style={styles.card}>
          <TextInput
            style={styles.textArea}
            value={instructions}
            onChangeText={setInstructions}
            multiline
            numberOfLines={10}
            placeholder="Enter custom instructions for the AI..."
            placeholderTextColor={Colors.textLight}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}>
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Instructions'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Example Conversations</Text>
        <Text style={styles.description}>
          Add example conversations to help train the AI on your specific business
          needs (Coming in Phase 2).
        </Text>

        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderText}>
            Example conversation training coming soon
          </Text>
        </View>
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
  sectionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: FontSizes.md,
    color: Colors.textLight,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.small,
    marginBottom: Spacing.md,
  },
  textArea: {
    fontSize: FontSizes.md,
    color: Colors.text,
    minHeight: 200,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
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
  placeholderCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.small,
  },
  placeholderText: {
    fontSize: FontSizes.md,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
});

export default TrainingScreen;