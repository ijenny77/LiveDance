import 'react-native-url-polyfill/auto';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootStackParamList } from './src/navigation/types';
import { colors } from './src/theme';

import { JoinSessionScreen } from './src/screens/JoinSessionScreen';
import { StatusScreen } from './src/screens/StatusScreen';
import { LessonRoomScreen } from './src/screens/LessonRoomScreen';
import { AdminLoginScreen } from './src/screens/admin/AdminLoginScreen';
import { AdminDashboardScreen } from './src/screens/admin/AdminDashboardScreen';
import { AdminStudentsScreen } from './src/screens/admin/AdminStudentsScreen';
import { AdminLessonsScreen } from './src/screens/admin/AdminLessonsScreen';
import { AdminPaymentsScreen } from './src/screens/admin/AdminPaymentsScreen';
import { AdminAttendanceScreen } from './src/screens/admin/AdminAttendanceScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bgBase,
    card: colors.bgElevated,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.uvPurple,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator
          initialRouteName="JoinSession"
          screenOptions={{
            headerStyle: { backgroundColor: colors.bgElevated },
            headerTintColor: colors.textPrimary,
            contentStyle: { backgroundColor: colors.bgBase },
          }}
        >
          <Stack.Screen name="JoinSession" component={JoinSessionScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Status" component={StatusScreen} options={{ title: 'Session Status' }} />
          <Stack.Screen name="LessonRoom" component={LessonRoomScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AdminLogin" component={AdminLoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AdminStudents" component={AdminStudentsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AdminLessons" component={AdminLessonsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AdminPayments" component={AdminPaymentsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AdminAttendance" component={AdminAttendanceScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
        <StatusBar style="light" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
