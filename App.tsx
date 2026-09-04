import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './src/types';
import { HomeScreen } from './src/screens/HomeScreen';
import { EditorScreen } from './src/screens/EditorScreen';
import { ViewerScreen } from './src/screens/ViewerScreen';
import { COLORS } from './src/constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    card: COLORS.cardBg,
    text: COLORS.textPrimary,
    border: COLORS.border,
    primary: COLORS.primary,
  },
};

export default function App() {
  return (
    <NavigationContainer theme={AppTheme}>
      <StatusBar style="light" backgroundColor={COLORS.background} />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Editor" component={EditorScreen} />
        <Stack.Screen name="Viewer" component={ViewerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
