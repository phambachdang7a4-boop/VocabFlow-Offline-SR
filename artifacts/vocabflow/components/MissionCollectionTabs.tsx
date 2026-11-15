import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { F, MaterialSheen } from "@/components/ui";

export type MissionCollectionTab = "missions" | "shop" | "collection";

const TABS: { id: MissionCollectionTab; label: string }[] = [
  { id: "missions", label: "Nhiệm Vụ" },
  { id: "shop", label: "Cửa Hàng" },
  { id: "collection", label: "Bộ Sưu Tập" },
];

export function MissionCollectionTabs({
  active,
}: {
  active: MissionCollectionTab;
}) {
  const c = useColors();

  return (
    <View
      testID="mission-collection-tabs"
      accessibilityRole="tablist"
      style={[
        styles.track,
        {
          backgroundColor: c.secondary,
          borderColor: c.border,
          borderRadius: c.radius + 4,
        },
      ]}
    >
      {TABS.map((tab) => {
        const selected = active === tab.id;
        return (
          <Pressable
            key={tab.id}
            testID={`mission-collection-tab-${tab.id}`}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              if (tab.id === "collection") {
                router.replace("/collection");
              } else if (tab.id === "shop") {
                router.replace({
                  pathname: "/(tabs)/blank",
                  params: { panel: "shop" },
                });
              } else {
                router.replace("/(tabs)/blank");
              }
            }}
            style={({ pressed }) => [
              styles.tab,
              {
                backgroundColor: selected ? c.vocabCard : "transparent",
                borderRadius: c.radius,
                opacity: pressed ? 0.84 : 1,
              },
            ]}
          >
            {selected ? <MaterialSheen tone="navy" radius={c.radius} /> : null}
            <Text
              style={[
                styles.label,
                {
                  color: selected ? c.vocabCardForeground : c.mutedForeground,
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    gap: 4,
    borderWidth: 1,
    padding: 4,
  },
  tab: {
    position: "relative",
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  label: { fontFamily: F.s, fontSize: 14 },
});
