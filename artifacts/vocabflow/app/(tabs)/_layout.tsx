import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { SymbolView } from 'expo-symbols';

// Keep Sổ từ (/) as the landing tab even though Tra Từ and Khóa Học are listed first.
export const unstable_settings = { anchor: 'index' };

function NativeTabLayout() {
  return (
    <NativeTabs backBehavior="initialRoute">
      <NativeTabs.Trigger name="dictionary">
        <NativeTabs.Trigger.Icon sf={{ default: 'character.book.closed', selected: 'character.book.closed.fill' }} />
        <NativeTabs.Trigger.Label>Tra Từ</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="courses">
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} />
        <NativeTabs.Trigger.Label>Khóa Học</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="review">
        <NativeTabs.Trigger.Icon sf={{ default: 'rectangle.on.rectangle', selected: 'rectangle.on.rectangle' }} />
        <NativeTabs.Trigger.Label>Ôn tập</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }} />
        <NativeTabs.Trigger.Label>Sổ từ</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="blank">
        <NativeTabs.Trigger.Icon sf={{ default: 'square', selected: 'square.fill' }} />
        <NativeTabs.Trigger.Label>Trống</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

const ICONS = {
  index: { sf: 'book', fe: 'book-open' },
  dictionary: { sf: 'character.book.closed', fe: 'search' },
  review: { sf: 'rectangle.on.rectangle', fe: 'layers' },
  courses: { sf: 'square.grid.2x2', fe: 'grid' },
  blank: { sf: 'square', fe: 'square' },
} as const;

function ClassicTabLayout() {
  const colors = useColors();
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
        tabBarActiveTintColor: colors.navigationActive,
        tabBarInactiveTintColor: colors.navigationInactive,
        tabBarLabelStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
        tabBarItemStyle: { paddingHorizontal: 0 },
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.navigation,
          borderTopWidth: 1,
          borderTopColor: colors.navigationBorder,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.navigation }]} />,
      }}
    >
      <Tabs.Screen name="dictionary" options={{ title: 'Tra Từ', tabBarIcon: icon('dictionary') }} />
      <Tabs.Screen name="courses" options={{ title: 'Khóa Học', tabBarIcon: icon('courses') }} />
      <Tabs.Screen name="review" options={{ title: 'Ôn tập', tabBarIcon: icon('review') }} />
      <Tabs.Screen name="index" options={{ title: 'Sổ từ', tabBarIcon: icon('index') }} />
      <Tabs.Screen name="blank" options={{ title: 'Trống', tabBarIcon: icon('blank') }} />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
