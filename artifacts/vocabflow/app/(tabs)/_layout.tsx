import React from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';

// Keep Sổ từ (/) as the landing tab even though Tra Từ is listed first.
export const unstable_settings = { anchor: 'index' };

function NativeTabLayout() {
  return (
    <NativeTabs backBehavior="initialRoute">
      <NativeTabs.Trigger name="dictionary">
        <NativeTabs.Trigger.Icon sf={{ default: 'character.book.closed', selected: 'character.book.closed.fill' }} />
        <NativeTabs.Trigger.Label>Tra Từ</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }} />
        <NativeTabs.Trigger.Label>Sổ từ</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="review">
        <NativeTabs.Trigger.Icon sf={{ default: 'rectangle.on.rectangle', selected: 'rectangle.on.rectangle' }} />
        <NativeTabs.Trigger.Label>Ôn tập</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
        <NativeTabs.Trigger.Label>Cài đặt</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

const ICONS = {
  index: { sf: 'book', fe: 'book-open' },
  dictionary: { sf: 'character.book.closed', fe: 'search' },
  review: { sf: 'rectangle.on.rectangle', fe: 'layers' },
  settings: { sf: 'gearshape', fe: 'settings' },
} as const;

function ClassicTabLayout() {
  const colors = useColors();
  const isDark = useColorScheme() === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  const icon = (key: keyof typeof ICONS) =>
    ({ color }: { color: any }) =>
      isIOS ? (
        <SymbolView name={ICONS[key].sf} tintColor={color} size={24} />
      ) : (
        <Feather name={ICONS[key].fe} size={22} color={color} />
      );

  return (
    <Tabs
      backBehavior="initialRoute"
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ),
      }}
    >
      <Tabs.Screen name="dictionary" options={{ title: 'Tra Từ', tabBarIcon: icon('dictionary') }} />
      <Tabs.Screen name="index" options={{ title: 'Sổ từ', tabBarIcon: icon('index') }} />
      <Tabs.Screen name="review" options={{ title: 'Ôn tập', tabBarIcon: icon('review') }} />
      <Tabs.Screen name="settings" options={{ title: 'Cài đặt', tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
