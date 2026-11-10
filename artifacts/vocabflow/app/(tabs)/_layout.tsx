import React from "react";
import { Platform, StyleSheet, View, type ColorValue } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/native-tabs";
import { SymbolView } from "expo-symbols";
import { MaterialSheen } from "@/components/ui";

// Keep Sổ từ (/) as the landing tab.
export const unstable_settings = { anchor: "index" };

function NativeTabLayout() {
  return (
    <NativeTabs backBehavior="initialRoute">
      <NativeTabs.Trigger name="dictionary">
        <NativeTabs.Trigger.Icon
          sf={{
            default: "character.book.closed",
            selected: "character.book.closed.fill",
          }}
        />
        <NativeTabs.Trigger.Label>Tra Từ</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="courses">
        <NativeTabs.Trigger.Icon
          sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }}
        />
        <NativeTabs.Trigger.Label>Khóa học</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="review">
        <NativeTabs.Trigger.Icon
          sf={{ default: "arrow.2.circlepath", selected: "arrow.2.circlepath" }}
        />
        <NativeTabs.Trigger.Label>Ôn tập</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf={{ default: "book", selected: "book.fill" }}
        />
        <NativeTabs.Trigger.Label>Sổ từ</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="blank">
        <NativeTabs.Trigger.Icon
          sf={{ default: "checklist", selected: "checklist" }}
        />
        <NativeTabs.Trigger.Label>Nhiệm Vụ</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

const ICONS = {
  index: { sf: "book", fe: "book-open" },
  dictionary: { sf: "character.book.closed", fe: "search" },
  courses: { sf: "square.grid.2x2", fe: "grid" },
  review: { sf: "arrow.2.circlepath", fe: "repeat" },
  blank: { sf: "checklist", fe: "check-square" },
} as const;

function ClassicTabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const icon =
    (key: keyof typeof ICONS, hasDivider = true) =>
    ({ color, focused }: { color: ColorValue; focused: boolean }) => (
      <View
        style={[
          styles.tabIcon,
          {
            backgroundColor: focused ? colors.button : "transparent",
            borderColor: focused ? colors.accentSoft : "transparent",
            borderWidth: focused ? 1 : 0,
            shadowColor: colors.shade,
            shadowOffset: { width: 0, height: focused ? 2 : 0 },
            shadowOpacity: focused ? 0.24 : 0,
            shadowRadius: focused ? 4 : 0,
            elevation: focused ? 3 : 0,
          },
        ]}
      >
        {hasDivider ? (
          <View
            pointerEvents="none"
            style={[
              styles.tabDivider,
              { backgroundColor: colors.navigationBorder },
            ]}
          />
        ) : null}
        {isIOS ? (
          <SymbolView
            name={ICONS[key].sf}
            tintColor={focused ? colors.buttonForeground : color}
            size={focused ? 20 : 22}
          />
        ) : (
          <Feather
            name={ICONS[key].fe}
            size={focused ? 20 : 22}
            color={
              focused
                ? colors.buttonForeground
                : typeof color === "string"
                  ? color
                  : colors.navigationInactive
            }
          />
        )}
      </View>
    );

  return (
    <Tabs
      backBehavior="initialRoute"
      screenOptions={{
        tabBarActiveTintColor: colors.navigationActive,
        tabBarInactiveTintColor: colors.navigationInactive,
        tabBarLabelStyle: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
        tabBarItemStyle: { paddingHorizontal: 0 },
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.navigation,
          borderTopWidth: 1,
          borderTopColor: colors.navigationBorder,
          elevation: 0,
          shadowColor: colors.shade,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () => (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.navigation },
            ]}
          >
            <MaterialSheen tone="navy" radius={0} />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="dictionary"
        options={{ title: "Tra Từ", tabBarIcon: icon("dictionary", false) }}
      />
      <Tabs.Screen
        name="courses"
        options={{ title: "Khóa học", tabBarIcon: icon("courses") }}
      />
      <Tabs.Screen
        name="review"
        options={{ title: "Ôn tập", tabBarIcon: icon("review") }}
      />
      <Tabs.Screen
        name="index"
        options={{ title: "Sổ từ", tabBarIcon: icon("index") }}
      />
      <Tabs.Screen
        name="blank"
        options={{ title: "Nhiệm Vụ", tabBarIcon: icon("blank") }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 48,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tabDivider: {
    position: "absolute",
    left: -20,
    width: 2,
    height: 26,
    borderRadius: 2,
    opacity: 0.6,
  },
});

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
