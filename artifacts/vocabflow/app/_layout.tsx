import React, { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { VocabularyProvider } from '@/contexts/VocabularyContext';
import { AppearanceProvider, useAppearance } from '@/contexts/AppearanceContext';
import { useColors } from '@/hooks/useColors';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Appearance, Platform, Pressable } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Quay lại',
        headerStyle: { backgroundColor: c.header },
        headerTintColor: c.headerForeground,
        headerTitleStyle: { fontFamily: 'Inter_600SemiBold', color: c.headerForeground },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="word" options={{ title: 'Từ vựng' }} />
      <Stack.Screen name="dictionary-entry" options={{ title: 'Mục từ' }} />
      <Stack.Screen name="dictionary-sources" options={{ title: 'Nguồn từ điển' }} />
      <Stack.Screen name="frozen" options={{ title: 'Từ đã đóng băng' }} />
      <Stack.Screen name="settings" options={({ navigation }) => ({
        title: 'Cài đặt',
        // Direct loads (e.g. web /settings) have no history: fall back to the Review tab.
        headerLeft: navigation.canGoBack() ? undefined : () => (
          <Pressable testID="settings-back-review" accessibilityRole="button" accessibilityLabel="Về Ôn tập"
            onPress={() => router.replace('/review')} hitSlop={10}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="arrow-left" size={22} color={c.headerForeground} />
          </Pressable>
        ),
      })} />
    </Stack>
  );
}

function AppearanceFrame() {
  const { mode, ready } = useAppearance();
  const c = useColors();
  const splashHidden = useRef(false);
  useEffect(() => {
    if (!ready) return;
    if (Platform.OS !== 'web') {
      Appearance.setColorScheme(mode);
      void SystemUI.setBackgroundColorAsync(c.background).then(() => {
        if (!splashHidden.current) {
          splashHidden.current = true;
          void SplashScreen.hideAsync();
        }
      }).catch(error => {
        console.warn('Could not set the native app background color.', error);
        if (!splashHidden.current) {
          splashHidden.current = true;
          void SplashScreen.hideAsync();
        }
      });
      return;
    }
    if (typeof document !== 'undefined') {
      document.documentElement.style.colorScheme = mode;
      document.documentElement.style.backgroundColor = c.background;
      document.body.style.backgroundColor = c.background;
    }
    if (!splashHidden.current) {
      splashHidden.current = true;
      void SplashScreen.hideAsync();
    }
  }, [mode, ready, c.background]);
  // Wait only on the first read; retries later must not unmount navigation/SRS.
  if (!ready) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar style="light" />
      <KeyboardProvider><RootLayoutNav /></KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppearanceProvider>
          <ErrorBoundary>
            <VocabularyProvider><AppearanceFrame /></VocabularyProvider>
          </ErrorBoundary>
        </AppearanceProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
