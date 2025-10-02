import { DeviceEventEmitter, NativeModules, NativeEventEmitter } from 'react-native';

class SmsEventService {
  private listeners: Map<string, any> = new Map();

  /**
   * Start listening for SMS events from native code
   */
  startListening(callback: (event: { sender: string; message: string; timestamp: number }) => void) {
    console.log('SmsEventService: Starting to listen for SMS events...');

    // Listen to DeviceEventEmitter for events from native bridge
    const listener = DeviceEventEmitter.addListener(
      'SMS_RECEIVED',
      (event) => {
        console.log('SmsEventService: SMS event received:', event);
        callback(event);
      }
    );

    this.listeners.set('sms', listener);
    console.log('SmsEventService: Listener registered for SMS_RECEIVED');
  }

  /**
   * Stop listening for SMS events
   */
  stopListening() {
    console.log('SmsEventService: Stopping SMS event listener...');
    const listener = this.listeners.get('sms');
    if (listener) {
      listener.remove();
      this.listeners.delete('sms');
      console.log('SmsEventService: Listener removed');
    }
  }
}

export default new SmsEventService();
