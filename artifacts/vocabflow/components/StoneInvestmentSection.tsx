import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { ErrorBanner, F, MaterialSheen } from "@/components/ui";
import {
  createStoneInvestment,
  getStoneInvestmentOverview,
  type StoneInvestmentOverview,
} from "@/data/vocabulary";
import {
  investmentFailureSettlement,
  investmentNetResult,
  investmentRate,
  investmentSuccessSettlement,
  STONE_INVESTMENT_PLANS,
  studyDaysRequired,
  MAX_STONE_INVESTMENT_PRINCIPAL,
  type StoneInvestmentDuration,
  type StoneInvestmentPlan,
} from "@/domain/stone-investments";

const PLANS: StoneInvestmentPlan[] = ["safe", "balanced", "risky"];
const DURATIONS: StoneInvestmentDuration[] = [7, 14];

export function StoneInvestmentSection() {
  const c = useColors();
  const [overview, setOverview] = useState<StoneInvestmentOverview | null>(
    null,
  );
  const [plan, setPlan] = useState<StoneInvestmentPlan>("safe");
  const [duration, setDuration] = useState<StoneInvestmentDuration>(7);
  const [principalText, setPrincipalText] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOverview(await getStoneInvestmentOverview());
      setError(null);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Không thể tải Thương Vụ.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const principal = Number(principalText.replace(/[^\d]/g, ""));
  const rate = investmentRate(plan, duration);
  const successSettlement =
    principal > 0
      ? investmentSuccessSettlement(plan, principal, duration)
      : 0;
  const failedSettlement =
    principal > 0 ? investmentFailureSettlement(plan, principal) : 0;
  const failureNet = investmentNetResult(failedSettlement, principal);
  const enoughStone =
    principal > 0 &&
    principal <= MAX_STONE_INVESTMENT_PRINCIPAL &&
    principal <= (overview?.stoneBalance ?? 0);
  const studyDays = useMemo(
    () => new Set(overview?.studyDays.map((day) => day.day) ?? []),
    [overview?.studyDays],
  );

  const startInvestment = async () => {
    if (!enoughStone) {
      setError("Nhập số Stone hợp lệ và không vượt quá số dư hiện có.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createStoneInvestment(plan, principal, duration);
      setPrincipalText("");
      await load();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Không thể bắt đầu Thương Vụ.",
      );
    } finally {
      setCreating(false);
    }
  };

  const confirmInvestment = () => {
    if (!enoughStone) {
      setError("Nhập số Stone hợp lệ và không vượt quá số dư hiện có.");
      return;
    }
    const config = STONE_INVESTMENT_PLANS[plan];
    const netFailure = Math.abs(failureNet);
    const lossDescription =
      plan === "risky"
        ? `Thất bại sẽ làm mất ${netFailure.toLocaleString("vi-VN")} Stone (${Math.abs(config.failedSettlementPercent - 100)}% vốn) và số dư có thể âm.`
        : `Thất bại chỉ hoàn ${failedSettlement.toLocaleString("vi-VN")} Stone.`;
    Alert.alert(
      "Xác nhận đầu tư",
      `${principal.toLocaleString("vi-VN")} Stone trong ${duration} ngày. Nếu hoàn thành đủ ngày, nhận ${successSettlement.toLocaleString("vi-VN")} Stone (lãi ${rate}%). ${lossDescription} Bỏ lỡ một ngày ôn hoặc học sẽ tính là thất bại.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Khóa Stone",
          style: plan === "risky" ? "destructive" : "default",
          onPress: () => void startInvestment(),
        },
      ],
    );
  };

  return (
    <View testID="stone-investment-section" style={styles.section}>
      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>
          Thương Vụ
        </Text>
        <Text style={[styles.hint, { color: c.mutedForeground }]}>
          Khóa Stone và ghi nhận ôn từ hoặc học khóa học mỗi ngày.
        </Text>
      </View>

      <View
        style={[
          styles.balanceCard,
          { backgroundColor: c.card, borderColor: c.border },
        ]}
      >
        <Feather name="circle" size={19} color={c.accent} />
        <Text style={[styles.balanceText, { color: c.foreground }]}>
          Số dư: {(overview?.stoneBalance ?? 0).toLocaleString("vi-VN")} Stone
        </Text>
      </View>

      <Text style={[styles.label, { color: c.foreground }]}>
        Chọn phương án
      </Text>
      {PLANS.map((choice) => {
        const selected = choice === plan;
        const config = STONE_INVESTMENT_PLANS[choice];
        const failedLoss =
          choice === "risky"
            ? "Thất bại: mất 120% vốn; số dư có thể âm"
            : `Thất bại: hoàn ${config.failedSettlementPercent}% vốn`;
        return (
          <Pressable
            key={choice}
            testID={`stone-investment-plan-${choice}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => setPlan(choice)}
            style={[
              styles.planCard,
              {
                backgroundColor: selected ? c.secondary : c.card,
                borderColor: selected ? c.primary : c.border,
              },
            ]}
          >
            <View style={styles.planCopy}>
              <Text
                style={[
                  styles.planTitle,
                  { color: selected ? c.primary : c.foreground },
                ]}
              >
                {config.title}
              </Text>
              <Text style={[styles.hint, { color: c.mutedForeground }]}>
                Lãi {config.ratePercent}% trong 7 ngày · {failedLoss}
              </Text>
            </View>
            <Feather
              name={selected ? "check-circle" : "circle"}
              size={20}
              color={selected ? c.primary : c.mutedForeground}
            />
          </Pressable>
        );
      })}

      <Text style={[styles.label, { color: c.foreground }]}>
        Thời hạn đầu tư
      </Text>
      <View style={styles.durationRow}>
        {DURATIONS.map((days) => (
          <Pressable
            key={days}
            testID={`stone-investment-duration-${days}`}
            accessibilityRole="button"
            accessibilityState={{ selected: duration === days }}
            onPress={() => setDuration(days)}
            style={[
              styles.durationButton,
              {
                backgroundColor: duration === days ? c.primary : c.card,
                borderColor: duration === days ? c.primary : c.border,
              },
            ]}
          >
            <Text
              style={[
                styles.durationText,
                {
                  color:
                    duration === days ? c.buttonForeground : c.foreground,
                },
              ]}
            >
              {days} ngày
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.hint, { color: c.mutedForeground }]}>
        Kỳ 14 ngày nhận lãi gấp 3 kỳ 7 ngày.
      </Text>

      <Text style={[styles.label, { color: c.foreground }]}>
        Số Stone muốn đầu tư
      </Text>
      <TextInput
        testID="stone-investment-principal"
        accessibilityLabel="Số Stone muốn đầu tư"
        value={principalText}
        onChangeText={(value) => setPrincipalText(value.replace(/[^\d]/g, ""))}
        keyboardType="number-pad"
        placeholder="Nhập số Stone"
        placeholderTextColor={c.mutedForeground}
        style={[
          styles.input,
          { color: c.foreground, backgroundColor: c.card, borderColor: c.border },
        ]}
      />
      {principal > 0 ? (
        <View
          testID="stone-investment-outcome-preview"
          style={[styles.preview, { backgroundColor: c.card, borderColor: c.border }]}
        >
          <Text style={[styles.previewText, { color: c.successText }]}>
            Đủ kỳ: nhận {successSettlement.toLocaleString("vi-VN")} Stone
            {" · "}lãi {rate}%
          </Text>
          <Text style={[styles.previewText, { color: c.destructive }]}>
            Thất bại:{" "}
            {plan === "risky"
              ? `mất ${Math.abs(failureNet).toLocaleString("vi-VN")} Stone`
              : `hoàn ${failedSettlement.toLocaleString("vi-VN")} Stone`}
          </Text>
        </View>
      ) : null}

      {error ? (
        <ErrorBanner message={error} onRetry={() => void load()} />
      ) : null}
      <Pressable
        testID="stone-investment-start"
        accessibilityRole="button"
        accessibilityState={{ disabled: !enoughStone || creating }}
        disabled={!enoughStone || creating}
        onPress={confirmInvestment}
        style={({ pressed }) => [
          styles.startButton,
          {
            backgroundColor: enoughStone ? c.accent : c.muted,
            borderColor: c.border,
            opacity: pressed && enoughStone ? 0.84 : 1,
          },
        ]}
      >
        {creating ? (
          <ActivityIndicator color={c.buttonForeground} />
        ) : (
          <Text style={[styles.startButtonText, { color: c.buttonForeground }]}>
            Bắt đầu Thương Vụ
          </Text>
        )}
      </Pressable>
      <Text style={[styles.footer, { color: c.mutedForeground }]}>
        Mỗi ngày cần có ít nhất một lượt ôn từ hoặc trả lời một câu trong bài
        học. Bỏ lỡ ngày nào sẽ thất bại. Các ngày học được lưu offline.
      </Text>

      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>
          Các khoản đầu tư
        </Text>
      </View>
      {loading && !overview ? (
        <ActivityIndicator color={c.primary} />
      ) : overview?.investments.length ? (
        overview.investments.map((investment) => {
          const requiredDays = studyDaysRequired(
            investment.startDay,
            investment.durationDays,
          );
          const completedCount = requiredDays.filter((day) =>
            studyDays.has(day),
          ).length;
          const result =
            investment.settlementAmount === null
              ? null
              : investmentNetResult(
                  investment.settlementAmount,
                  investment.principal,
                );
          return (
            <View
              key={investment.investmentId}
              testID={`stone-investment-${investment.investmentId}`}
              style={[
                styles.investmentCard,
                { backgroundColor: c.card, borderColor: c.border },
              ]}
            >
              <View style={styles.investmentTitleRow}>
                <Text style={[styles.planTitle, { color: c.foreground }]}>
                  {STONE_INVESTMENT_PLANS[investment.plan].title}
                </Text>
                <Text
                  style={[
                    styles.status,
                    {
                      color:
                        investment.status === "active"
                          ? c.primary
                          : investment.status === "succeeded"
                            ? c.successText
                            : c.destructive,
                    },
                  ]}
                >
                  {investment.status === "active"
                    ? "Đang đầu tư"
                    : investment.status === "succeeded"
                      ? "Thành công"
                      : "Thất bại"}
                </Text>
              </View>
              <Text style={[styles.hint, { color: c.mutedForeground }]}>
                {investment.principal.toLocaleString("vi-VN")} Stone ·{" "}
                {investment.durationDays} ngày · {investment.startDay} –{" "}
                {investment.endDay}
              </Text>
              {investment.status === "active" ? (
                <>
                  <Text style={[styles.hint, { color: c.mutedForeground }]}>
                    Đã ghi nhận {completedCount}/{investment.durationDays} ngày
                  </Text>
                  <View style={styles.dayDots}>
                    {requiredDays.map((day) => {
                      const done = studyDays.has(day);
                      const past = day < overview.today;
                      return (
                        <View
                          key={day}
                          testID={`stone-investment-day-${day}`}
                          style={[
                            styles.dayDot,
                            {
                              backgroundColor: done
                                ? c.success
                                : past
                                  ? c.destructive
                                  : c.muted,
                              borderColor: c.border,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                </>
              ) : (
                <Text
                  style={[
                    styles.hint,
                    {
                      color:
                        result !== null && result >= 0
                          ? c.successText
                          : c.destructive,
                    },
                  ]}
                >
                  {result !== null && result >= 0
                    ? `Lãi ${result.toLocaleString("vi-VN")} Stone`
                    : `Lỗ ${Math.abs(result ?? 0).toLocaleString("vi-VN")} Stone`}
                </Text>
              )}
            </View>
          );
        })
      ) : (
        <Text style={[styles.hint, { color: c.mutedForeground }]}>
          Chưa có khoản đầu tư nào.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10, marginTop: 18 },
  sectionHeading: { gap: 3, marginTop: 5 },
  sectionTitle: { fontFamily: F.b, fontSize: 18 },
  hint: { fontFamily: F.r, fontSize: 12, lineHeight: 17 },
  balanceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  balanceText: { fontFamily: F.b, fontSize: 14 },
  label: { fontFamily: F.s, fontSize: 13, marginTop: 2 },
  planCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planCopy: { flex: 1, gap: 3 },
  planTitle: { fontFamily: F.b, fontSize: 14 },
  durationRow: { flexDirection: "row", gap: 10 },
  durationButton: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  durationText: { fontFamily: F.b, fontSize: 13 },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontFamily: F.r,
    fontSize: 15,
  },
  preview: { gap: 5, borderWidth: 1, borderRadius: 12, padding: 11 },
  previewText: { fontFamily: F.s, fontSize: 12, lineHeight: 17 },
  startButton: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  startButtonText: { fontFamily: F.b, fontSize: 14 },
  footer: { fontFamily: F.r, fontSize: 11, lineHeight: 16 },
  investmentCard: { gap: 7, borderWidth: 1, borderRadius: 14, padding: 12 },
  investmentTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  status: { fontFamily: F.s, fontSize: 11 },
  dayDots: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  dayDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1 },
});
