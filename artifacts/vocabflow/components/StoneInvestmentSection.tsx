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
  useStoneInvestmentCollateral,
  type StoneInvestmentOverview,
} from "@/data/vocabulary";
import {
  FORCE_MAJEURE_RATES,
  investmentFailureSettlement,
  investmentNetResult,
  investmentRate,
  investmentSuccessSettlement,
  STONE_INVESTMENT_PLANS,
  studyDaysRequired,
  MAX_STONE_INVESTMENT_PRINCIPAL,
  type StoneInvestmentDuration,
  type StoneInvestmentCapitalInvite,
  type StoneInvestmentPlan,
} from "@/domain/stone-investments";

const PLANS: StoneInvestmentPlan[] = ["safe", "balanced", "risky"];
const DURATIONS: StoneInvestmentDuration[] = [7, 14];

export function StoneInvestmentSection({
  inventoryRevision = 0,
  onInventoryChange,
}: {
  inventoryRevision?: number;
  onInventoryChange?: () => void;
}) {
  const c = useColors();
  const [overview, setOverview] = useState<StoneInvestmentOverview | null>(
    null,
  );
  const [plan, setPlan] = useState<StoneInvestmentPlan>("safe");
  const [duration, setDuration] = useState<StoneInvestmentDuration>(7);
  const [capitalInvite, setCapitalInvite] =
    useState<StoneInvestmentCapitalInvite>(null);
  const [principalText, setPrincipalText] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [claimingCollateral, setClaimingCollateral] = useState<string | null>(
    null,
  );
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
    }, [inventoryRevision, load]),
  );

  const principal = Number(principalText.replace(/[^\d]/g, ""));
  const rate = investmentRate(plan, duration, capitalInvite);
  const successSettlement =
    principal > 0
      ? investmentSuccessSettlement(plan, principal, duration, capitalInvite)
      : 0;
  const failedSettlement =
    principal > 0
      ? investmentFailureSettlement(plan, principal, capitalInvite)
      : 0;
  const failureNet = investmentNetResult(failedSettlement, principal);
  const enoughStone =
    principal > 0 &&
    principal <= MAX_STONE_INVESTMENT_PRINCIPAL &&
    principal <= (overview?.stoneBalance ?? 0);
  const studyDays = useMemo(
    () => new Set(overview?.studyDays.map((day) => day.day) ?? []),
    [overview?.studyDays],
  );

  const startInvestment = async (useLowInsurance: boolean) => {
    if (!enoughStone) {
      setError("Nhập số Stone hợp lệ và không vượt quá số dư hiện có.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createStoneInvestment(plan, principal, duration, {
        lowInsuranceUsed: useLowInsurance,
        capitalInvite,
      });
      setPrincipalText("");
      setCapitalInvite(null);
      await load();
      onInventoryChange?.();
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

  const showInvestmentConfirmation = (useLowInsurance: boolean) => {
    if (!enoughStone) {
      setError("Nhập số Stone hợp lệ và không vượt quá số dư hiện có.");
      return;
    }
    const config = STONE_INVESTMENT_PLANS[plan];
    const netFailure = Math.abs(failureNet);
    const lossDescription =
      useLowInsurance
        ? "Bảo hiểm chỉ hoàn lại vốn nếu thất bại do lỡ ngày học/ôn; dự án vẫn ghi nhận thất bại."
        : plan === "risky"
          ? `Thất bại sẽ làm mất ${netFailure.toLocaleString("vi-VN")} Stone (${Math.abs(config.failedSettlementPercent - 100)}% vốn trước thư góp vốn) và số dư có thể âm.`
          : `Thất bại chỉ hoàn ${failedSettlement.toLocaleString("vi-VN")} Stone.`;
    const forceMajeureDescription =
      ` Force majeure có xác suất ${FORCE_MAJEURE_RATES[plan]}% cho khoản này; nếu xảy ra, khoản đầu tư thất bại theo mức lỗ của gói dù đã học đủ. Bảo hiểm không che sự cố này.`;
    const inviteDescription =
      capitalInvite === "low"
        ? " Thư góp vốn thấp sẽ tiêu hao ngay; lãi nhân 1,15 lần và mức lỗ nhân 1,3 lần."
        : capitalInvite === "high"
          ? " Thư góp vốn cao sẽ tiêu hao ngay; lãi nhân 1,3 lần và mức lỗ nhân 1,4 lần."
          : "";
    Alert.alert(
      "Xác nhận đầu tư",
      `${principal.toLocaleString("vi-VN")} Stone trong ${duration} ngày. Nếu hoàn thành đủ ngày, nhận ${successSettlement.toLocaleString("vi-VN")} Stone (lãi ${rate}%). ${lossDescription}${inviteDescription}${forceMajeureDescription} Bỏ lỡ một ngày ôn hoặc học sẽ tính là thất bại.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Khóa Stone",
          style: plan === "risky" ? "destructive" : "default",
          onPress: () => void startInvestment(useLowInsurance),
        },
      ],
    );
  };

  const confirmInvestment = () => {
    if (!enoughStone) {
      setError("Nhập số Stone hợp lệ và không vượt quá số dư hiện có.");
      return;
    }
    if (plan === "risky" && (overview?.inventory.low_insurance ?? 0) > 0) {
      Alert.alert(
        "Dùng Bảo Hiểm cấp thấp?",
        "Nếu chọn, bảo hiểm sẽ tiêu hao ngay. Khi lỡ đúng một ngày ôn/học trong gói rủi ro, bạn được hoàn vốn thay vì mất Stone.",
        [
          {
            text: "Không dùng",
            style: "cancel",
            onPress: () => showInvestmentConfirmation(false),
          },
          {
            text: "Dùng bảo hiểm",
            onPress: () => showInvestmentConfirmation(true),
          },
        ],
      );
      return;
    }
    showInvestmentConfirmation(false);
  };

  const claimCollateral = (investmentId: string) => {
    Alert.alert(
      "Dùng Tài Sản Thế Chấp?",
      "Vật phẩm sẽ bị tiêu hao và hoàn lại vốn cho khoản đầu tư rủi ro đã thất bại. Khoản này không sinh lãi.",
      [
        { text: "Để sau", style: "cancel" },
        {
          text: "Dùng thế chấp",
          onPress: () => {
            setClaimingCollateral(investmentId);
            void useStoneInvestmentCollateral(investmentId)
              .then(async () => {
                await load();
                onInventoryChange?.();
              })
              .catch((failure: unknown) =>
                setError(
                  failure instanceof Error
                    ? failure.message
                    : "Không thể dùng Tài Sản Thế Chấp.",
                ),
              )
              .finally(() => setClaimingCollateral(null));
          },
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
                Lãi {config.ratePercent}%/7 ngày · Bất khả kháng{" "}
                {FORCE_MAJEURE_RATES[choice]}% mỗi khoản · {failedLoss}
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
        Thư mời góp vốn
      </Text>
      <View style={styles.inviteRow}>
        {(
          [
            {
              id: null,
              title: "Không dùng",
              inventory: 0,
              detail: "Giữ nguyên tỷ lệ",
            },
            {
              id: "low",
              title: "Góp vốn thấp",
              inventory: overview?.inventory.low_capital_invite ?? 0,
              detail: "Lãi ×1,15 · Lỗ ×1,3",
            },
            {
              id: "high",
              title: "Góp vốn cao",
              inventory: overview?.inventory.high_capital_invite ?? 0,
              detail: "Lãi ×1,3 · Lỗ ×1,4",
            },
          ] as const
        ).map((option) => {
          const selected = option.id === capitalInvite;
          const unavailable = option.id !== null && option.inventory < 1;
          return (
            <Pressable
              key={option.id ?? "none"}
              testID={`stone-investment-invite-${option.id ?? "none"}`}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: unavailable }}
              disabled={unavailable}
              onPress={() => setCapitalInvite(option.id)}
              style={[
                styles.inviteOption,
                {
                  backgroundColor: selected ? c.secondary : c.card,
                  borderColor: selected ? c.primary : c.border,
                  opacity: unavailable ? 0.5 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.inviteTitle,
                  { color: selected ? c.primary : c.foreground },
                ]}
              >
                {option.title}
              </Text>
              <Text style={[styles.inviteMeta, { color: c.mutedForeground }]}>
                {option.detail}
              </Text>
              {option.id !== null ? (
                <Text style={[styles.inviteMeta, { color: c.mutedForeground }]}>
                  Có {option.inventory}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.hint, { color: c.mutedForeground }]}>
        Thư góp vốn dùng một lần khi bắt đầu bất kỳ gói nào. Khi thất bại, mức
        lỗ ròng cũng được nhân theo thư đã chọn.
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
                <>
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
                      ? result === 0
                        ? "Đã hoàn vốn, không phát sinh lãi/lỗ"
                        : `Lãi ${result.toLocaleString("vi-VN")} Stone`
                      : `Lỗ ${Math.abs(result ?? 0).toLocaleString("vi-VN")} Stone`}
                  </Text>
                  {investment.status === "failed" &&
                  investment.plan === "risky" &&
                  (!investment.lowInsuranceUsed ||
                    investment.forceMajeureHit) &&
                  !investment.collateralUsed &&
                  (overview.inventory.collateral_asset ?? 0) > 0 ? (
                    <Pressable
                      testID={`stone-investment-collateral-${investment.investmentId}`}
                      accessibilityRole="button"
                      disabled={claimingCollateral === investment.investmentId}
                      onPress={() => claimCollateral(investment.investmentId)}
                      style={[
                        styles.collateralButton,
                        {
                          backgroundColor: c.secondary,
                          borderColor: c.primary,
                        },
                      ]}
                    >
                      {claimingCollateral === investment.investmentId ? (
                        <ActivityIndicator color={c.primary} />
                      ) : (
                        <Text
                          style={[
                            styles.inviteTitle,
                            { color: c.primary, textAlign: "center" },
                          ]}
                        >
                          Dùng Tài Sản Thế Chấp để hoàn vốn
                        </Text>
                      )}
                    </Pressable>
                  ) : null}
                  {investment.lowInsuranceUsed ? (
                    <Text style={[styles.hint, { color: c.mutedForeground }]}>
                      Đã dùng Bảo Hiểm cấp thấp
                    </Text>
                  ) : null}
                  {investment.forceMajeureHit ? (
                    <Text style={[styles.hint, { color: c.destructive }]}>
                      Sự cố bất khả kháng đã xảy ra
                    </Text>
                  ) : null}
                  {investment.collateralUsed ? (
                    <Text style={[styles.hint, { color: c.mutedForeground }]}>
                      Đã tiêu hao Tài Sản Thế Chấp
                    </Text>
                  ) : null}
                </>
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
  inviteRow: { flexDirection: "row", gap: 7 },
  inviteOption: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 9,
    gap: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteTitle: { fontFamily: F.b, fontSize: 11 },
  inviteMeta: { fontFamily: F.r, fontSize: 9, lineHeight: 13, textAlign: "center" },
  collateralButton: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 11,
    padding: 9,
    justifyContent: "center",
  },
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
