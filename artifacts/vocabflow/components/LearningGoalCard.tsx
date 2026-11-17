import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Button, F, MaterialSheen } from "@/components/ui";
import {
  LEARNING_GOAL_OPTIONS,
  type LearningGoalId,
  type LearningGoalOption,
} from "@/domain/learning-goals";
import { useColors } from "@/hooks/useColors";

export type RecommendedGoalLesson = {
  title: string;
  focus: string;
  isResume: boolean;
};

type LearningGoalCardProps = {
  goal: LearningGoalOption | null;
  courseTitle: string | null;
  recommendation: RecommendedGoalLesson | null;
  loading: boolean;
  saving: boolean;
  onChoose: (goal: LearningGoalId) => Promise<boolean>;
  onOpenCourse: () => void;
};

export function LearningGoalCard({
  goal,
  courseTitle,
  recommendation,
  loading,
  saving,
  onChoose,
  onOpenCourse,
}: LearningGoalCardProps) {
  const c = useColors();
  const [expanded, setExpanded] = useState(false);

  const chooseGoal = async (goalId: LearningGoalId) => {
    if (saving) return;
    if (await onChoose(goalId)) setExpanded(false);
  };

  return (
    <View
      testID="learning-goal-card"
      style={[
        styles.card,
        { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius + 2 },
      ]}
    >
      <MaterialSheen tone="navy" radius={c.radius + 2} />
      <View style={styles.heading}>
        <View style={[styles.iconWrap, { backgroundColor: c.accent }]}>
          <Feather
            name={goal?.icon ?? "target"}
            size={21}
            color={c.accentForeground}
          />
        </View>
        <View style={styles.headingCopy}>
          <Text style={[styles.kicker, { color: c.primary }]}>
            {goal ? "MỤC TIÊU CỦA BẠN" : "BẮT ĐẦU TỪ ĐIỀU BẠN CẦN"}
          </Text>
          <Text style={[styles.title, { color: c.foreground }]}>
            {goal?.title ?? "Chọn mục tiêu học"}
          </Text>
          <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
            {goal
              ? `${courseTitle ?? "Khóa học phù hợp"} · ${goal.description}`
              : "Chọn một hướng học để nhận gợi ý khóa phù hợp."}
          </Text>
        </View>
      </View>

      {goal ? (
        <View
          testID="learning-goal-recommendation"
          style={[
            styles.recommendation,
            { backgroundColor: c.secondary, borderColor: c.border },
          ]}
        >
          <View style={styles.recommendationLabelRow}>
            <Feather name="compass" size={15} color={c.primary} />
            <Text style={[styles.recommendationLabel, { color: c.primary }]}>
              {loading ? "ĐANG TÌM BÀI PHÙ HỢP" : "GỢI Ý TIẾP THEO"}
            </Text>
          </View>
          {loading ? (
            <Text style={[styles.recommendationFocus, { color: c.mutedForeground }]}>
              Đang tải tiến độ học của bạn…
            </Text>
          ) : recommendation ? (
            <>
              <Text style={[styles.recommendationTitle, { color: c.foreground }]}>
                {recommendation.isResume ? "Bài đang học dở" : "Bài tiếp theo"} ·{" "}
                {recommendation.title}
              </Text>
              <Text style={[styles.recommendationFocus, { color: c.mutedForeground }]}>
                {recommendation.focus}
              </Text>
            </>
          ) : (
            <Text style={[styles.recommendationFocus, { color: c.mutedForeground }]}>
              Bạn đã hoàn thành các bài trong khóa này. Mở khóa để ôn lại hoặc chọn mục tiêu khác.
            </Text>
          )}
        </View>
      ) : null}

      {expanded ? (
        <View testID="learning-goal-options" style={styles.options}>
          <Text style={[styles.optionsTitle, { color: c.foreground }]}>
            Bạn muốn cải thiện điều gì?
          </Text>
          {LEARNING_GOAL_OPTIONS.map((option) => {
            const selected = goal?.id === option.id;
            return (
              <Pressable
                key={option.id}
                testID={`learning-goal-option-${option.id}`}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: saving }}
                accessibilityLabel={`${option.title}. ${option.description}`}
                disabled={saving}
                onPress={() => void chooseGoal(option.id)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: selected ? c.secondary : c.card,
                    borderColor: selected ? c.primary : c.border,
                    opacity: pressed || saving ? 0.78 : 1,
                  },
                ]}
              >
                <Feather name={option.icon} size={19} color={c.primary} />
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionTitle, { color: c.foreground }]}>
                    {option.title}
                  </Text>
                  <Text style={[styles.optionDescription, { color: c.mutedForeground }]}>
                    {option.description}
                  </Text>
                </View>
                {selected ? (
                  <Feather name="check-circle" size={19} color={c.success} />
                ) : (
                  <Feather name="chevron-right" size={19} color={c.mutedForeground} />
                )}
              </Pressable>
            );
          })}
          {!goal ? (
            <Pressable
              testID="learning-goal-dismiss"
              accessibilityRole="button"
              onPress={() => setExpanded(false)}
              style={styles.dismiss}
            >
              <Text style={[styles.dismissText, { color: c.mutedForeground }]}>
                Để sau, tôi sẽ tự chọn khóa học
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        {goal ? (
          <>
            <Button
              testID="learning-goal-open-course"
              label={loading ? "Đang tải…" : "Mở lộ trình"}
              icon="arrow-right"
              onPress={onOpenCourse}
              disabled={loading || !courseTitle}
              style={styles.primaryAction}
            />
            <Pressable
              testID="learning-goal-change"
              accessibilityRole="button"
              disabled={saving}
              onPress={() => setExpanded((value) => !value)}
              style={styles.changeAction}
            >
              <Feather name="refresh-cw" size={16} color={c.primary} />
              <Text style={[styles.changeText, { color: c.primary }]}>
                {expanded ? "Đóng lựa chọn" : "Đổi mục tiêu"}
              </Text>
            </Pressable>
          </>
        ) : !expanded ? (
          <Button
            testID="learning-goal-choose"
            label="Chọn mục tiêu"
            icon="target"
            onPress={() => setExpanded(true)}
            style={styles.primaryAction}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    padding: 15,
    gap: 12,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  headingCopy: { flex: 1, minWidth: 0, gap: 3 },
  kicker: { fontFamily: F.s, fontSize: 10, letterSpacing: 1.1 },
  title: { fontFamily: F.b, fontSize: 17, lineHeight: 22 },
  subtitle: { fontFamily: F.r, fontSize: 12, lineHeight: 18 },
  recommendation: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 12,
    gap: 5,
  },
  recommendationLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recommendationLabel: { fontFamily: F.s, fontSize: 10, letterSpacing: 0.9 },
  recommendationTitle: { fontFamily: F.b, fontSize: 14, lineHeight: 19 },
  recommendationFocus: { fontFamily: F.r, fontSize: 12, lineHeight: 18 },
  options: { gap: 9 },
  optionsTitle: { fontFamily: F.b, fontSize: 14, marginBottom: 1 },
  option: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  optionCopy: { flex: 1, minWidth: 0, gap: 2 },
  optionTitle: { fontFamily: F.s, fontSize: 13 },
  optionDescription: { fontFamily: F.r, fontSize: 11, lineHeight: 15 },
  dismiss: { minHeight: 38, justifyContent: "center", alignItems: "center" },
  dismissText: { fontFamily: F.s, fontSize: 12 },
  actions: { gap: 7 },
  primaryAction: { minHeight: 48 },
  changeAction: {
    minHeight: 38,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 10,
  },
  changeText: { fontFamily: F.s, fontSize: 12 },
});
