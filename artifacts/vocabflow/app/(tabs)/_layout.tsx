import React from "react";
import {
  Platform,
  StyleSheet,
  View,
  type ColorValue,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { MaterialSheen } from "@/components/ui";

// Start guests in the Thư Viện; they can reach the notebook from its tab.
export const unstable_settings = { anchor: "dictionary" };

const ICONS = {
  index: "book-open",
  dictionary: "book-open",
  courses: "grid",
  review: "repeat",
  blank: "check-square",
} as const;

function ClassicTabLayout() {
  const colors = useColors();
  const isWeb = Platform.OS === "web";

  const icon =
    (key: keyof typeof ICONS, hasDivider = true) =>
    ({ color, focused }: { color: ColorValue; focused: boolean }) => (
      <View
        style={[
          styles.tabIcon,
          {
            backgroundColor: focused ? colors.button : "transparent",
            borderColor: focused ? colors.goldSheen : "transparent",
            borderWidth: focused ? 1 : 0,
            shadowColor: colors.shade,
            shadowOffset: { width: 0, height: focused ? 2 : 0 },
            shadowOpacity: focused ? 0.28 : 0,
            shadowRadius: focused ? 5 : 0,
            elevation: focused ? 4 : 0,
          },
        ]}
      >
        {hasDivider ? (
          <View
            pointerEvents="none"
            style={[
              styles.tabDivider,
              { backgroundColor: colors.navigationInactive },
            ]}
          />
        ) : null}
        <Feather
          name={ICONS[key]}
          size={focused ? 25 : 27}
          color={
            focused
              ? colors.buttonForeground
              : typeof color === "string"
                ? color
                : colors.navigationInactive
          }
        />
      </View>
    );

  return (
    <Tabs
      backBehavior="initialRoute"
      screenOptions={{
        tabBarActiveTintColor: colors.navigationActive,
        tabBarInactiveTintColor: colors.navigationInactive,
        tabBarLabelStyle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 11,
          marginTop: 1,
          marginBottom: 5,
        },
        tabBarItemStyle: { paddingHorizontal: 0, paddingTop: 4 },
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: colors.shade,
          shadowOpacity: 0.22,
          shadowRadius: 12,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          overflow: "hidden",
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
        options={{ title: "Thư Viện", tabBarIcon: icon("dictionary", false) }}
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
    width: 54,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tabDivider: {
    position: "absolute",
    left: -14,
    width: 1,
    height: 38,
    borderRadius: 2,
    opacity: 0.48,
  },
});

export default function TabLayout() {
  return <ClassicTabLayout />;
}
