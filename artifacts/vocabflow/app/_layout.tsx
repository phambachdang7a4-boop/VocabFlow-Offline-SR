import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { VocabularyProvider } from "@/contexts/VocabularyContext";
import { SyncProvider } from "@/contexts/SyncContext";
import {
  AppearanceProvider,
  useAppearance,
} from "@/contexts/AppearanceContext";
import { SpeechPreferencesProvider } from "@/contexts/SpeechPreferencesContext";
import { ReviewPreferencesProvider } from "@/contexts/ReviewPreferencesContext";
import { SoundEffectsProvider } from "@/contexts/SoundEffectsContext";
import { useColors } from "@/hooks/useColors";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import {
  activateGuestDatabase,
  initializeAccountDatabase,
} from "@/data/vocabulary-sync";
import { storageFailureMessage } from "@/data/sqlite-connection";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Appearance, Platform, Pressable } from "react-native";
import * as SystemUI from "expo-system-ui";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { Redirect, router, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { MissionRewardCoordinator } from "@/components/MissionRewardCoordinator";
import { WebOfflineDataDialog } from "@/components/WebOfflineDataDialog";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = { anchor: "(tabs)" };

const queryClient = new QueryClient();
const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const clerkProxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL ?? "";
const apiDomain = process.env.EXPO_PUBLIC_DOMAIN;

if (!clerkPublishableKey) {
  throw new Error("Thiếu cấu hình đăng nhập Clerk cho VocabFlow.");
}

if (apiDomain) setBaseUrl(`https://${apiDomain}`);

function RootStack() {
  const c = useColors();

  return (
    <>
      <Stack
        screenOptions={{
          headerBackTitle: "Quay lại",
          headerStyle: { backgroundColor: c.header },
          headerTintColor: c.headerForeground,
          headerTitleStyle: {
            fontFamily: "Inter_600SemiBold",
            color: c.headerForeground,
          },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: c.background },
        }}
      >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
          animation: "slide_from_left",
          animationTypeForReplace: "push",
        }}
      />
      <Stack.Screen
        name="collection"
        options={{
          headerShown: false,
          animation: "slide_from_right",
          animationTypeForReplace: "push",
        }}
      />
      <Stack.Screen name="chest/[chestId]" options={{ title: "Mở rương" }} />
      <Stack.Screen name="word" options={{ title: "Từ vựng" }} />
      <Stack.Screen name="dictionary-entry" options={{ title: "Mục từ" }} />
      <Stack.Screen name="extract" options={{ title: "Mắt Quạ" }} />
      <Stack.Screen
        name="dictionary-sources"
        options={{ title: "Nguồn từ điển" }}
      />
      <Stack.Screen name="frozen" options={{ title: "Từ đã đóng băng" }} />
      <Stack.Screen
        name="settings"
        options={({ navigation }) => ({
          title: "Cài đặt",
          // Direct loads (e.g. web /settings) have no history: fall back to the Review tab.
          headerLeft: navigation.canGoBack()
            ? undefined
            : () => (
                <Pressable
                  testID="settings-back-review"
                  accessibilityRole="button"
                  accessibilityLabel="Về Ôn tập"
                  onPress={() => router.replace("/review")}
                  hitSlop={10}
                  style={{
                    width: 44,
                    height: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather
                    name="arrow-left"
                    size={22}
                    color={c.headerForeground}
                  />
                </Pressable>
              ),
        })}
      />
      </Stack>
      <MissionRewardCoordinator />
      <WebOfflineDataDialog />
    </>
  );
}

function RootLayoutNav() {
  const c = useColors();
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const segments = useSegments();
  const [scopedUserId, setScopedUserId] = useState<string | null | undefined>(
    undefined,
  );
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [scopeAttempt, setScopeAttempt] = useState(0);
  const inAuthFlow = segments.some(
    (segment) =>
      segment === "(auth)" || segment === "sign-in" || segment === "sign-up",
  );

  useEffect(() => {
    setAuthTokenGetter(
      Platform.OS !== "web" && isSignedIn ? () => getToken() : null,
    );
    return () => setAuthTokenGetter(null);
  }, [getToken, isSignedIn]);

  useEffect(() => {
    let active = true;
    const nextUserId =
      isLoaded && isSignedIn ? (userId ?? null) : null;
    setScopedUserId(undefined);
    setScopeError(null);

    const setup = nextUserId
      ? initializeAccountDatabase(nextUserId)
      : activateGuestDatabase();

    void setup
      .then(() => {
        if (active) setScopedUserId(nextUserId);
      })
      .catch((failure) => {
        if (active)
          setScopeError(
            storageFailureMessage(
              failure,
              "Không thể mở dữ liệu của tài khoản này. Dữ liệu chưa bị xóa.",
            ),
          );
      });

    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, scopeAttempt, userId]);

  if (isLoaded && isSignedIn === undefined) {
    return (
      <View
        testID="startup-loading-backdrop"
        style={{ flex: 1, backgroundColor: c.background }}
      />
    );
  }
  if (isLoaded && isSignedIn && inAuthFlow) return <Redirect href="/(tabs)" />;

  if (scopeError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 28,
          backgroundColor: c.background,
        }}
      >
        <Text
          style={{
            color: c.foreground,
            fontFamily: "Inter_600SemiBold",
            fontSize: 20,
            textAlign: "center",
          }}
        >
          Chưa mở được sổ từ
        </Text>
        <Text
          accessibilityRole="alert"
          style={{
            color: c.mutedForeground,
            fontFamily: "Inter_400Regular",
            fontSize: 15,
            lineHeight: 22,
            textAlign: "center",
            marginTop: 10,
          }}
        >
          {scopeError}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setScopeAttempt((value) => value + 1)}
          style={{
            backgroundColor: c.accent,
            borderRadius: 14,
            padding: 16,
            marginTop: 22,
          }}
        >
          <Text
            style={{
              color: c.foreground,
              fontFamily: "Inter_600SemiBold",
              textAlign: "center",
            }}
          >
            Thử lại
          </Text>
        </Pressable>
      </View>
    );
  }

  if (isSignedIn) {
    if (scopedUserId !== userId) {
      return (
        <View
          testID="startup-loading-backdrop"
          style={{ flex: 1, backgroundColor: c.background }}
        />
      );
    }
    return (
      <SyncProvider key={userId} userId={userId}>
        <VocabularyProvider key={userId}>
          <RootStack />
        </VocabularyProvider>
      </SyncProvider>
    );
  }

  if (scopedUserId !== null) {
    return (
      <View
        testID="startup-loading-backdrop"
        style={{ flex: 1, backgroundColor: c.background }}
      />
    );
  }

  return (
    <SyncProvider key="guest" userId="">
      <VocabularyProvider key="guest">
        <RootStack />
      </VocabularyProvider>
    </SyncProvider>
  );
}

function AppearanceFrame() {
  const { mode, ready } = useAppearance();
  const c = useColors();
  const splashHidden = useRef(false);
  useEffect(() => {
    if (!ready) return;
    if (Platform.OS !== "web") {
      Appearance.setColorScheme(mode);
      void SystemUI.setBackgroundColorAsync(c.background)
        .then(() => {
          if (!splashHidden.current) {
            splashHidden.current = true;
            void SplashScreen.hideAsync();
          }
        })
        .catch((error) => {
          console.warn("Could not set the native app background color.", error);
          if (!splashHidden.current) {
            splashHidden.current = true;
            void SplashScreen.hideAsync();
          }
        });
      return;
    }
    if (typeof document !== "undefined") {
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
      <KeyboardProvider>
        <RootLayoutNav />
      </KeyboardProvider>
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
            <ClerkProvider
              publishableKey={clerkPublishableKey}
              tokenCache={tokenCache}
              proxyUrl={clerkProxyUrl}
            >
              <ReviewPreferencesProvider>
                <SpeechPreferencesProvider>
                  <SoundEffectsProvider>
                    <AppearanceFrame />
                  </SoundEffectsProvider>
                </SpeechPreferencesProvider>
              </ReviewPreferencesProvider>
            </ClerkProvider>
          </ErrorBoundary>
        </AppearanceProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
