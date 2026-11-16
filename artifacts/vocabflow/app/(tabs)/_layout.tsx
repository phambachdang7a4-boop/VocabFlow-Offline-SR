import React from "react";
import {
  Image,
  Platform,
  StyleSheet,
  View,
  type ColorValue,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { Tabs } from "expo-router";
import { MaterialSheen } from "@/components/ui";

// Start guests in the Thư Viện; they can reach the notebook from its tab.
export const unstable_settings = { anchor: "dictionary" };

const ICONS = {
  index: require("../../assets/navigation/notebook.png"),
  dictionary: require("../../assets/navigation/library.png"),
  courses: require("../../assets/navigation/courses.png"),
  review: require("../../assets/navigation/review.png"),
  blank: require("../../assets/navigation/missions.png"),
} as const;

function ClassicTabLayout() {
  const colors = useColors();
  const isWeb = Platform.OS === "web";

  const icon =
    (key: keyof typeof ICONS, hasDivider = true) =>
    ({ focused }: { color: ColorValue; focused: boolean }) => (
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
        <Image
          source={ICONS[key]}
          resizeMode="contain"
          accessible={false}
          style={[
            styles.tabArtwork,
            key === "dictionary"
              ? styles.libraryArtwork
              : key === "courses"
                ? styles.courseArtwork
                : key === "review"
                  ? styles.reviewArtwork
                  : key === "index"
                    ? styles.notebookArtwork
                    : styles.missionsArtwork,
          ]}
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
  tabArtwork: {
    maxWidth: 48,
    maxHeight: 40,
  },
  libraryArtwork: {
    width: 47,
    height: 36,
  },
  courseArtwork: {
    width: 36,
    height: 38,
  },
  reviewArtwork: {
    width: 40,
    height: 39,
  },
  notebookArtwork: {
    width: 36,
    height: 39,
  },
  missionsArtwork: {
    width: 32,
    height: 40,
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
