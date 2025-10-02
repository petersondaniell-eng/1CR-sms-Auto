import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  AppState,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../constants/theme';
import type { Conversation } from '../types/nativeModules';
import type { RootStackParamList } from '../navigation/AppNavigator';
import databaseService from '../services/databaseService';
import SmsModule from '../types/nativeModules';
import { validatePhoneNumber, formatPhoneNumberForDisplay } from '../utils/phoneUtils';
import smsEventService from '../services/smsEventService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MessagesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newConversationModalVisible, setNewConversationModalVisible] = useState(false);
  const [phoneNumberInput, setPhoneNumberInput] = useState('');
  const [isDefaultSmsApp, setIsDefaultSmsApp] = useState(true);
  const [showSmsAppPrompt, setShowSmsAppPrompt] = useState(false);

  const loadConversations = async () => {
    try {
      const data = await databaseService.getAllConversations();
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadConversations();
    checkDefaultSmsApp();

    // Listen for incoming SMS events from native code
    smsEventService.startListening((event) => {
      console.log('MessagesScreen: New SMS received:', event);
      // Reload conversations to show the new message
      loadConversations();
    });

    // Also reload when app comes to foreground (in case SMS arrived while backgrounded)
    const appStateListener = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('App came to foreground, reloading conversations...');
        loadConversations();
      }
    });

    // Cleanup listeners on unmount
    return () => {
      smsEventService.stopListening();
      appStateListener.remove();
    };
  }, []);

  const checkDefaultSmsApp = async () => {
    try {
      const isDefault = await SmsModule.isDefaultSmsApp();
      setIsDefaultSmsApp(isDefault);
      if (!isDefault) {
        setShowSmsAppPrompt(true);
      }
    } catch (error) {
      console.error('Error checking default SMS app:', error);
    }
  };

  const handleSetDefaultSmsApp = async () => {
    try {
      await SmsModule.requestDefaultSmsApp();
      setShowSmsAppPrompt(false);
      // Recheck after user interacts with settings
      setTimeout(checkDefaultSmsApp, 1000);
    } catch (error) {
      console.error('Error requesting default SMS app:', error);
      Alert.alert('Error', 'Failed to open SMS app settings');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (hours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleConversationPress = (conversation: Conversation) => {
    navigation.navigate('ConversationDetail', {
      phoneNumber: conversation.phone_number,
      contactName: conversation.contact_name,
    });
  };

  const handlePickContact = async () => {
    try {
      const contact = await SmsModule.pickContact();
      setNewConversationModalVisible(false);

      // Create conversation and navigate
      await databaseService.createConversation(contact.phoneNumber, contact.name);
      navigation.navigate('ConversationDetail', {
        phoneNumber: contact.phoneNumber,
        contactName: contact.name,
      });

      // Reload conversations list
      loadConversations();

    } catch (error: any) {
      if (error.code !== 'CANCELLED') {
        console.error('Error picking contact:', error);
        Alert.alert('Error', 'Failed to select contact');
      }
    }
  };

  const handleManualPhoneNumber = async () => {
    const validation = validatePhoneNumber(phoneNumberInput);

    if (!validation.isValid) {
      Alert.alert('Invalid Phone Number', validation.error || 'Please enter a valid phone number');
      return;
    }

    try {
      setNewConversationModalVisible(false);
      setPhoneNumberInput('');

      // Create conversation and navigate
      await databaseService.createConversation(validation.formatted);
      navigation.navigate('ConversationDetail', {
        phoneNumber: validation.formatted,
        contactName: formatPhoneNumberForDisplay(validation.formatted),
      });

      // Reload conversations list
      loadConversations();

    } catch (error) {
      console.error('Error creating conversation:', error);
      Alert.alert('Error', 'Failed to create conversation');
    }
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    Alert.alert(
      'Delete Conversation',
      `Delete conversation with ${conversation.contact_name || conversation.phone_number}? This will delete all messages.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteConversation(conversation.phone_number);
              loadConversations(); // Reload the list
            } catch (error) {
              console.error('Error deleting conversation:', error);
              Alert.alert('Error', 'Failed to delete conversation');
            }
          },
        },
      ]
    );
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationCard}
      onPress={() => handleConversationPress(item)}
      onLongPress={() => handleDeleteConversation(item)}>
      <View style={styles.conversationHeader}>
        <Text style={styles.contactName}>
          {item.contact_name || item.phone_number}
        </Text>
        <Text style={styles.timestamp}>
          {formatTimestamp(item.last_message_time)}
        </Text>
      </View>
      <View style={styles.conversationFooter}>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.last_message || 'No messages yet'}
        </Text>
        {item.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>{item.unread_count}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {showSmsAppPrompt && !isDefaultSmsApp && (
          <View style={styles.smsAppBanner}>
            <View style={styles.smsAppBannerContent}>
              <Text style={styles.smsAppBannerText}>
                📱 To receive incoming messages, set this app as your default SMS app{'\n'}
                {'\n'}
                <Text style={styles.smsAppBannerInstructions}>
                  Manual Steps:{'\n'}
                  1. Open Android Settings{'\n'}
                  2. Go to Apps → Default apps{'\n'}
                  3. Tap SMS app{'\n'}
                  4. Select "SMS AI Assistant"
                </Text>
              </Text>
              <TouchableOpacity
                style={styles.smsAppBannerButton}
                onPress={handleSetDefaultSmsApp}>
                <Text style={styles.smsAppBannerButtonText}>Try Auto-Set</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.smsAppBannerClose}
              onPress={() => setShowSmsAppPrompt(false)}>
              <Text style={styles.smsAppBannerCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>
                Tap the + button to start a conversation
              </Text>
            </View>
          }
        />

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setNewConversationModalVisible(true)}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* New Conversation Modal */}
      <Modal
        visible={newConversationModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setNewConversationModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>New Conversation</Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handlePickContact}>
              <Text style={styles.modalButtonIcon}>👤</Text>
              <Text style={styles.modalButtonText}>Select from Contacts</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.inputLabel}>Enter Phone Number</Text>
            <TextInput
              style={styles.phoneInput}
              value={phoneNumberInput}
              onChangeText={setPhoneNumberInput}
              placeholder="(555) 123-4567"
              placeholderTextColor={Colors.textLight}
              keyboardType="phone-pad"
              autoFocus
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setNewConversationModalVisible(false);
                  setPhoneNumberInput('');
                }}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  !phoneNumberInput.trim() && styles.modalConfirmButtonDisabled,
                ]}
                onPress={handleManualPhoneNumber}
                disabled={!phoneNumberInput.trim()}>
                <Text style={styles.modalConfirmButtonText}>Start Chat</Text>
              </TouchableOpacity>
            </View>
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
  smsAppBanner: {
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B',
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smsAppBannerContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  smsAppBannerText: {
    fontSize: FontSizes.sm,
    color: '#92400E',
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  smsAppBannerInstructions: {
    fontSize: FontSizes.xs,
    color: '#78350F',
    fontWeight: '600',
    lineHeight: 16,
  },
  smsAppBannerButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  smsAppBannerButtonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  smsAppBannerClose: {
    padding: Spacing.xs,
  },
  smsAppBannerCloseText: {
    fontSize: 20,
    color: '#92400E',
    fontWeight: '300',
  },
  listContainer: {
    padding: Spacing.md,
  },
  conversationCard: {
    backgroundColor: Colors.cardBackground,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadows.small,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  contactName: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  timestamp: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: FontSizes.md,
    color: Colors.textLight,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
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
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
    elevation: 5,
  },
  fabIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  modalButtonIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  modalButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    fontSize: FontSizes.sm,
    color: Colors.textLight,
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  phoneInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: Spacing.md,
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
  modalConfirmButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalConfirmButtonDisabled: {
    backgroundColor: Colors.textLight,
    opacity: 0.5,
  },
  modalConfirmButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default MessagesScreen;