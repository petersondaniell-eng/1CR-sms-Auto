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

interface ExampleConversation {
  id: string;
  customerMessage: string;
  idealResponse: string;
}

const TrainingScreen = () => {
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [examples, setExamples] = useState<ExampleConversation[]>([]);
  const [newCustomerMsg, setNewCustomerMsg] = useState('');
  const [newIdealResponse, setNewIdealResponse] = useState('');
  const [isAddingExample, setIsAddingExample] = useState(false);

  useEffect(() => {
    loadInstructions();
  }, []);

  const loadInstructions = async () => {
    try {
      const customInstructions = await settingsService.getSetting('customInstructions');
      setInstructions(customInstructions);

      // Load example conversations
      const storedExamples = await settingsService.getSetting('exampleConversations');
      if (storedExamples) {
        try {
          setExamples(JSON.parse(storedExamples));
        } catch (e) {
          console.error('Error parsing examples:', e);
        }
      }
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

  const handleAddExample = async () => {
    if (!newCustomerMsg.trim() || !newIdealResponse.trim()) {
      Alert.alert('Error', 'Please fill in both fields');
      return;
    }

    const newExample: ExampleConversation = {
      id: Date.now().toString(),
      customerMessage: newCustomerMsg.trim(),
      idealResponse: newIdealResponse.trim(),
    };

    const updatedExamples = [...examples, newExample];
    setExamples(updatedExamples);

    // Save to storage
    await settingsService.setSetting('exampleConversations', JSON.stringify(updatedExamples));

    setNewCustomerMsg('');
    setNewIdealResponse('');
    setIsAddingExample(false);
    Alert.alert('Success', 'Example conversation added');
  };

  const handleDeleteExample = async (id: string) => {
    Alert.alert(
      'Delete Example',
      'Are you sure you want to delete this example?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedExamples = examples.filter(ex => ex.id !== id);
            setExamples(updatedExamples);
            await settingsService.setSetting('exampleConversations', JSON.stringify(updatedExamples));
          },
        },
      ]
    );
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
          Add example conversations to help train the AI on your specific business needs.
        </Text>

        {examples.map((example) => (
          <View key={example.id} style={styles.exampleCard}>
            <View style={styles.exampleHeader}>
              <Text style={styles.exampleLabel}>Customer:</Text>
              <TouchableOpacity onPress={() => handleDeleteExample(example.id)}>
                <Text style={styles.deleteButton}>Delete</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.exampleText}>{example.customerMessage}</Text>

            <Text style={[styles.exampleLabel, {marginTop: Spacing.sm}]}>Ideal Response:</Text>
            <Text style={styles.exampleText}>{example.idealResponse}</Text>
          </View>
        ))}

        {isAddingExample ? (
          <View style={styles.card}>
            <Text style={styles.inputLabel}>Customer Message:</Text>
            <TextInput
              style={styles.input}
              value={newCustomerMsg}
              onChangeText={setNewCustomerMsg}
              placeholder="What time are you available tomorrow?"
              placeholderTextColor={Colors.textLight}
              multiline
            />

            <Text style={[styles.inputLabel, {marginTop: Spacing.md}]}>Ideal Response:</Text>
            <TextInput
              style={styles.input}
              value={newIdealResponse}
              onChangeText={setNewIdealResponse}
              placeholder="I'm available between 9 AM and 5 PM. What works best for you?"
              placeholderTextColor={Colors.textLight}
              multiline
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setIsAddingExample(false);
                  setNewCustomerMsg('');
                  setNewIdealResponse('');
                }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.addButton]}
                onPress={handleAddExample}>
                <Text style={styles.addButtonText}>Add Example</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.newExampleButton}
            onPress={() => setIsAddingExample(true)}>
            <Text style={styles.newExampleButtonText}>+ Add Example Conversation</Text>
          </TouchableOpacity>
        )}
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
  exampleCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  exampleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  exampleLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  exampleText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: 22,
  },
  deleteButton: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  input: {
    fontSize: FontSizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  button: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: Colors.primary,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  newExampleButton: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  newExampleButtonText: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});

export default TrainingScreen;