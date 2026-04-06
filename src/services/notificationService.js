import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { registerPushToken, unregisterPushToken } from './approvalService';

// Expo Go doesn't support remote push notifications in SDK 53+.
// We detect Expo Go via appOwnership and skip expo-notifications entirely.
// The app falls back to polling in that case.
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Lazily load expo-notifications only in development/standalone builds
const Notifications = (() => {
  if (isExpoGo) return null;
  try {
    const N = require('expo-notifications');
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    return N;
  } catch {
    return null;
  }
})();

export const registerForPushNotifications = async () => {
  if (!Notifications) return null;
  try {
    if (!Device.isDevice) return null;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('approvals', {
        name: 'Zahtevi za odobravanje',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await registerPushToken(token);
    return token;
  } catch {
    return null;
  }
};

export const unregisterPushNotifications = async () => {
  try {
    await unregisterPushToken();
  } catch {
    // non-critical
  }
};

export const addNotificationListener = (callback) => {
  if (!Notifications) return { remove: () => {} };
  try {
    return Notifications.addNotificationResponseReceivedListener(callback);
  } catch {
    return { remove: () => {} };
  }
};

// Returns the approvalId from a notification, or null
export const getApprovalIdFromNotification = (notification) => {
  return notification?.request?.content?.data?.approvalId ?? null;
};
