import { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { addNotificationListener, getApprovalIdFromNotification } from '../services/notificationService';

import AuthStack from './AuthStack';
import MainTabs from './MainTabs';

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const navigationRef = useRef(null);
  // Holds approvalId from a notification tapped while user was logged out
  const pendingApprovalRef = useRef(null);

  // When user logs in after tapping a notification, navigate to the pending approval
  useEffect(() => {
    if (user && pendingApprovalRef.current && navigationRef.current) {
      const approvalId = pendingApprovalRef.current;
      pendingApprovalRef.current = null;
      // Small delay to let MainTabs mount
      setTimeout(() => {
        navigationRef.current?.navigate('ApprovalsTab', {
          screen: 'ApprovalDetail',
          params: { approvalId },
        });
      }, 300);
    }
  }, [user]);

  // Handle tap on push notification → deep link to ApprovalDetail
  useEffect(() => {
    const sub = addNotificationListener((response) => {
      const approvalId = getApprovalIdFromNotification(response.notification);
      if (!approvalId) return;

      if (user && navigationRef.current) {
        navigationRef.current.navigate('ApprovalsTab', {
          screen: 'ApprovalDetail',
          params: { approvalId },
        });
      } else {
        // Not logged in — store for after login
        pendingApprovalRef.current = approvalId;
      }
    });

    return () => sub.remove();
  }, [user]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
