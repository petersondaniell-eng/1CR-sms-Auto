import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ScrollView,
  Clipboard,
  AppState,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../constants/theme';
import type { Message } from '../types/nativeModules';
import type { RootStackParamList } from '../navigation/AppNavigator';
import databaseService from '../services/databaseService';
import claudeService from '../services/claudeService';
import smsEventService from '../services/smsEventService';

type RouteParams = RouteProp<RootStackParamList, 'ConversationDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ConversationDetailScreen = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const { phoneNumber, contactName } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [workOrderModalVisible, setWorkOrderModalVisible] = useState(false);
  const [workOrderData, setWorkOrderData] = useState({
    customerName: contactName || phoneNumber,
    phoneNumber: phoneNumber,
    address: '',
    applianceType: '',
    brand: '',
    modelNumber: '',
    issueDescription: '',
  });
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
    // Mark conversation as read
    databaseService.markConversationAsRead(phoneNumber);

    // Add Work Order button to header
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleCreateWorkOrder}
          style={{ marginRight: 16, padding: 8 }}>
          <Text style={{ color: Colors.primary, fontWeight: '600', fontSize: 16 }}>
            Work Order
          </Text>
        </TouchableOpacity>
      ),
    });

    // Listen for incoming SMS events
    smsEventService.startListening((event) => {
      console.log('ConversationDetailScreen: SMS event received:', event);
      // Only reload if the SMS is for this conversation
      if (event.sender === phoneNumber || event.sender === `+1${phoneNumber}` || `+1${event.sender}` === phoneNumber) {
        console.log('ConversationDetailScreen: SMS is for this conversation, reloading...');
        loadMessages();
      }
    });

    // Also reload when app comes to foreground
    const appStateListener = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('ConversationDetailScreen: App came to foreground, reloading...');
        loadMessages();
      }
    });

    // Cleanup listeners on unmount
    return () => {
      smsEventService.stopListening();
      appStateListener.remove();
    };
  }, [phoneNumber, navigation]);

  const loadMessages = async () => {
    try {
      const data = await databaseService.getConversationMessages(phoneNumber, 100);
      setMessages(data);
      setLoading(false);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const success = await databaseService.sendSms(phoneNumber, messageText);

      if (success) {
        // Reload messages to show the sent message
        await loadMessages();
      } else {
        Alert.alert('Error', 'Failed to send message');
        setInputText(messageText); // Restore the text
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setInputText(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleGenerateAI = async () => {
    if (generatingAI) return;

    setGeneratingAI(true);

    try {
      const aiResponse = await claudeService.generateResponse(messages);

      if (aiResponse) {
        setInputText(aiResponse);
        Alert.alert(
          'AI Response Generated',
          'Review the response and tap Send to deliver it.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to generate AI response. Please check your API key.');
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      Alert.alert('Error', 'Failed to generate AI response');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleCreateWorkOrder = () => {
    // Extract information from conversation using simple pattern matching
    const conversationText = messages.map(m => m.message_text).join(' ');

    // Try to extract address (look for street numbers + street names)
    const addressMatch = conversationText.match(/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)/i);
    if (addressMatch) {
      setWorkOrderData(prev => ({ ...prev, address: addressMatch[0] }));
    }

    // Try to extract appliance types
    const applianceKeywords = ['refrigerator', 'fridge', 'washer', 'dryer', 'dishwasher', 'oven', 'stove', 'microwave'];
    const foundAppliance = applianceKeywords.find(keyword =>
      conversationText.toLowerCase().includes(keyword)
    );
    if (foundAppliance) {
      setWorkOrderData(prev => ({ ...prev, applianceType: foundAppliance }));
    }

    // Try to extract issue description (last customer message)
    const lastCustomerMsg = messages.filter(m => m.sender_type === 'customer').pop();
    if (lastCustomerMsg) {
      setWorkOrderData(prev => ({ ...prev, issueDescription: lastCustomerMsg.message_text }));
    }

    setWorkOrderModalVisible(true);
  };

  const handleCopyWorkOrder = () => {
    const conversationHistory = messages
      .map(m => {
        const sender = m.sender_type === 'customer' ? 'Customer' : m.sender_type === 'ai' ? 'AI' : 'You';
        const date = new Date(m.timestamp).toLocaleString();
        return `[${date}] ${sender}: ${m.message_text}`;
      })
      .join('\n');

    const workOrder = `WORK ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}

CUSTOMER INFORMATION
Name: ${workOrderData.customerName}
Phone: ${workOrderData.phoneNumber}
Address: ${workOrderData.address || 'Not provided'}

APPLIANCE DETAILS
Type: ${workOrderData.applianceType || 'Not specified'}
Brand: ${workOrderData.brand || 'Not specified'}
Model #: ${workOrderData.modelNumber || 'Not specified'}

ISSUE DESCRIPTION
${workOrderData.issueDescription || 'No description provided'}

CONVERSATION HISTORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${conversationHistory}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    Clipboard.setString(workOrder);
    Alert.alert('Success', 'Work order copied to clipboard!');
    setWorkOrderModalVisible(false);
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCustomer = item.sender_type === 'customer';
    const isAI = item.sender_type === 'ai';

    return (
      <View
        style={[
          styles.messageBubble,
          isCustomer ? styles.customerBubble : styles.agentBubble,
        ]}>
        <View style={styles.messageHeader}>
          <Text style={styles.senderLabel}>
            {isCustomer ? 'Customer' : isAI ? 'AI Assistant' : 'You'}
          </Text>
          <Text style={styles.messageTimestamp}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
        <Text style={styles.messageText}>{item.message_text}</Text>
        {item.photo_path && (
          <Text style={styles.photoIndicator}>📷 Photo attached</Text>
        )}
      </View>
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
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation!</Text>
            </View>
          }
        />

        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.aiButton}
            onPress={handleGenerateAI}
            disabled={generatingAI}>
            <Text style={styles.aiButtonText}>
              {generatingAI ? '⏳' : '🤖'}
            </Text>
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textLight}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}>
            <Text style={styles.sendButtonText}>
              {sending ? '...' : 'Send'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={workOrderModalVisible}
        animationType="slide"
        onRequestClose={() => setWorkOrderModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Work Order</Text>
            <TouchableOpacity onPress={() => setWorkOrderModalVisible(false)}>
              <Text style={styles.modalCloseButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalSectionTitle}>Customer Information</Text>

            <Text style={styles.modalLabel}>Name</Text>
            <TextInput
              style={styles.modalInput}
              value={workOrderData.customerName}
              onChangeText={(text) => setWorkOrderData(prev => ({ ...prev, customerName: text }))}
              placeholder="Customer name"
            />

            <Text style={styles.modalLabel}>Phone</Text>
            <TextInput
              style={styles.modalInput}
              value={workOrderData.phoneNumber}
              editable={false}
            />

            <Text style={styles.modalLabel}>Address</Text>
            <TextInput
              style={styles.modalInput}
              value={workOrderData.address}
              onChangeText={(text) => setWorkOrderData(prev => ({ ...prev, address: text }))}
              placeholder="Service address"
            />

            <Text style={styles.modalSectionTitle}>Appliance Details</Text>

            <Text style={styles.modalLabel}>Type</Text>
            <TextInput
              style={styles.modalInput}
              value={workOrderData.applianceType}
              onChangeText={(text) => setWorkOrderData(prev => ({ ...prev, applianceType: text }))}
              placeholder="e.g., Refrigerator, Washer"
            />

            <Text style={styles.modalLabel}>Brand</Text>
            <TextInput
              style={styles.modalInput}
              value={workOrderData.brand}
              onChangeText={(text) => setWorkOrderData(prev => ({ ...prev, brand: text }))}
              placeholder="e.g., Samsung, LG"
            />

            <Text style={styles.modalLabel}>Model Number</Text>
            <TextInput
              style={styles.modalInput}
              value={workOrderData.modelNumber}
              onChangeText={(text) => setWorkOrderData(prev => ({ ...prev, modelNumber: text }))}
              placeholder="Model number if available"
            />

            <Text style={styles.modalSectionTitle}>Issue Description</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={workOrderData.issueDescription}
              onChangeText={(text) => setWorkOrderData(prev => ({ ...prev, issueDescription: text }))}
              placeholder="Describe the issue"
              multiline
              numberOfLines={4}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setWorkOrderModalVisible(false)}>
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCopyButton}
              onPress={handleCopyWorkOrder}>
              <Text style={styles.modalCopyButtonText}>Copy Work Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
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
  messagesContainer: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadows.small,
  },
  customerBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E7EB',
  },
  agentBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  senderLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.text,
    opacity: 0.7,
  },
  messageTimestamp: {
    fontSize: FontSizes.xs,
    color: Colors.textLight,
    opacity: 0.7,
  },
  messageText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: 20,
  },
  photoIndicator: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    paddingBottom: Spacing.xl + Spacing.md,
    backgroundColor: Colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'flex-end',
  },
  aiButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  aiButtonText: {
    fontSize: 24,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.text,
    maxHeight: 100,
    marginRight: Spacing.sm,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.textLight,
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: Spacing.xl * 2,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    fontSize: FontSizes.md,
    color: Colors.textLight,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.primary,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  modalSectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  modalLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  modalInput: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  modalTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.cardBackground,
  },
  modalCancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  modalCopyButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalCopyButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ConversationDetailScreen;
