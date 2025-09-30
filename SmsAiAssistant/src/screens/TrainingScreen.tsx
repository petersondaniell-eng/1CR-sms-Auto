import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../constants/theme';

const TrainingScreen = () => {
  const [instructions, setInstructions] = useState(
    'You are an AI assistant for an appliance repair business. Be helpful, professional, and concise in your responses. ' +
    'Help customers schedule appointments, answer questions about common appliance issues, and provide basic troubleshooting advice.'
  );

  const handleSave = () => {
    // TODO: Save to AsyncStorage
    Alert.alert('Success', 'AI training instructions saved successfully');
  };

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

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Instructions</Text>
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