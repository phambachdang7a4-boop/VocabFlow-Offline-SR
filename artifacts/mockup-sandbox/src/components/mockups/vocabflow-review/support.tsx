import React from "react";
import { Pressable, Text, View } from "react-native-web";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CircleCheck,
  CircleX,
  Flag,
  Play,
  PauseCircle,
  RefreshCw,
  Settings,
  X,
} from "lucide-react";

export const F = {
  r: "Inter",
  m: "Inter",
  s: "Inter",
  b: "Inter",
};

export const colors = {
  background: "#F7F1E3",
  card: "#FBF7EE",
  foreground: "#23232D",
  primary: "#2F4F86",
  primaryForeground: "#F7F3EA",
  secondary: "#E6E3DA",
  secondaryForeground: "#22396A",
  mutedForeground: "#5E5B57",
  accent: "#22396A",
  destructiveText: "#A0301F",
  destructiveSoft: "#F6DDD8",
  successText: "#2E6B44",
  reviewRightSoft: "#DCEDE1",
  reviewHint: "#2F4F86",
  reviewPaper: "#FDFAF3",
  reviewTrack: "#E6E3DA",
  border: "#DDD3BE",
  input: "#FDFAF3",
  gold: "#E9B949",
  radius: 14,
};

const iconMap = {
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "book-open": BookOpen,
  calendar: CalendarDays,
  check: Check,
  "check-circle": CircleCheck,
  "x-circle": CircleX,
  flag: Flag,
  play: Play,
  "pause-circle": PauseCircle,
  "refresh-cw": RefreshCw,
  settings: Settings,
  x: X,
};

export type IconName = keyof typeof iconMap;

export function Icon({
  name,
  size = 18,
  color = colors.primary,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const Component = iconMap[name];
  return <Component size={size} color={color} strokeWidth={2} />;
}

export interface VocabularyWord {
  id: number;
  term: string;
  meaning: string;
  ipa?: string;
  example?: string;
  level: number;
  reviewCount: number;
}

export interface ReviewExercise {
  kind: "meaning" | "cloze";
  prompt: string;
  hint: string | null;
  fallback?: boolean;
}

export function useColors() {
  return colors;
}

export function useVocabulary() {
  return {
    recordReview: async (_id: number, _correct: boolean, _expected: number) => {},
    setWordFrozen: async (_id: number, _frozen: boolean) => {},
  };
}

export function checkReviewAnswer(value: string, expected: string) {
  return value.trim().toLocaleLowerCase() === expected.trim().toLocaleLowerCase();
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.destructiveSoft }}>
      <Text style={{ color: colors.destructiveText, fontFamily: F.m }}>{message}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled,
  loading,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger" | "accent";
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}) {
  const primary = variant === "primary";
  const danger = variant === "danger";
  const backgroundColor = primary ? colors.gold : danger ? colors.destructiveSoft : "transparent";
  const foregroundColor = primary ? colors.foreground : danger ? colors.destructiveText : colors.primary;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 56,
        paddingHorizontal: 20,
        borderRadius: 28,
        borderWidth: primary || danger ? 0 : 1,
        borderColor: colors.border,
        backgroundColor: disabled ? colors.secondary : backgroundColor,
        opacity: disabled ? 0.65 : 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
      }}
    >
      {icon ? <Icon name={icon} color={disabled ? colors.mutedForeground : foregroundColor} /> : null}
      <Text style={{ color: disabled ? colors.mutedForeground : foregroundColor, fontFamily: F.s, fontSize: 16 }}>
        {loading ? "Đang lưu…" : label}
      </Text>
    </Pressable>
  );
}
