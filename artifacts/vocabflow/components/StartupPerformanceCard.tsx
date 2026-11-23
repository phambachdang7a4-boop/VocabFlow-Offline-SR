import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { F, MaterialSheen } from "@/components/ui";
import {
  averageStartupMilliseconds,
  formatStartupDuration,
  getStartupPerformanceSnapshot,
  loadStartupPerformance,
  subscribeToStartupPerformance,
} from "@/data/startup-performance";

const stateLabels = {
  installed: "Sẵn sàng",
  missing: "Chưa cài",
  damaged: "Lỗi",
  unavailable: "Không hỗ trợ",
  updateAvailable: "Có bản mới",
  error: "Không kiểm tra được",
} as const;

export function StartupPerformanceCard() {
  const c = useColors();
  const metrics = React.useSyncExternalStore(
    subscribeToStartupPerformance,
    getStartupPerformanceSnapshot,
    getStartupPerformanceSnapshot,
  );

  React.useEffect(() => {
    void loadStartupPerformance();
  }, []);

  if (Platform.OS === "web") return null;

  return (
    <View
      testID="startup-performance-card"
      style={[
        styles.card,
        {
          backgroundColor: c.card,
          borderColor: c.border,
          borderRadius: c.radius,
        },
      ]}
    >
      <MaterialSheen radius={c.radius} />
      <View style={styles.heading}>
        <View style={[styles.icon, { backgroundColor: c.secondary }]}>
          <Feather name="activity" size={19} color={c.primary} />
        </View>
        <View style={styles.headingText}>
          <Text style={[styles.title, { color: c.foreground }]}>
            Tốc độ sẵn sàng dữ liệu
          </Text>
          <Text style={[styles.detail, { color: c.mutedForeground }]}>
            Tự đo sau khi giao diện mở; không chặn app.
          </Text>
        </View>
      </View>
      <View style={styles.metrics}>
        <View
          style={[
            styles.metric,
            { backgroundColor: c.secondary, borderColor: c.border },
          ]}
        >
          <Text style={[styles.metricLabel, { color: c.mutedForeground }]}>
            Lần đầu đủ 4 gói
          </Text>
          <Text
            testID="startup-performance-first"
            style={[styles.metricValue, { color: c.foreground }]}
          >
            {formatStartupDuration(metrics?.firstCompleteMs ?? null)}
          </Text>
        </View>
        <View
          style={[
            styles.metric,
            { backgroundColor: c.secondary, borderColor: c.border },
          ]}
        >
          <Text style={[styles.metricLabel, { color: c.mutedForeground }]}>
            Trung bình · {metrics?.completeSamplesMs.length ?? 0} lần
          </Text>
          <Text
            testID="startup-performance-average"
            style={[styles.metricValue, { color: c.foreground }]}
          >
            {formatStartupDuration(
              averageStartupMilliseconds(metrics?.completeSamplesMs),
            )}
          </Text>
        </View>
      </View>
      {metrics?.latest ? (
        <>
          <Text
            testID="startup-performance-latest"
            style={[styles.latest, { color: c.primary }]}
          >
            Lần mở gần nhất:{" "}
            {formatStartupDuration(metrics.latest.totalMs)}
            {metrics.latest.complete
              ? " · đủ 4 gói"
              : " · còn gói chưa sẵn sàng"}
          </Text>
          {(
            [
              ["dictionary", "Từ điển"],
              ["courses", "Khóa học"],
              ["ipa", "IPA"],
              ["audio", "Audio"],
            ] as const
          ).map(([id, label]) => {
            const result = metrics.latest?.packages[id];
            return (
              <View
                key={id}
                style={[styles.packageRow, { borderTopColor: c.border }]}
              >
                <Text style={[styles.detail, { color: c.mutedForeground }]}>
                  {label} ·{" "}
                  {result ? stateLabels[result.state] : "chưa đo"}
                </Text>
                <Text style={[styles.metricLabel, { color: c.foreground }]}>
                  {result ? formatStartupDuration(result.durationMs) : "—"}
                </Text>
              </View>
            );
          })}
        </>
      ) : (
        <Text style={[styles.detail, { color: c.mutedForeground }]}>
          Sẽ có số liệu sau khi app kiểm tra đủ bốn gói offline.
        </Text>
      )}
      <Text style={[styles.footnote, { color: c.mutedForeground }]}>
        Trung bình trên tối đa 20 lần mở đủ dữ liệu. Bộ đo bắt đầu khi
        JavaScript chạy; không gồm tải mạng.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 14, gap: 12, overflow: "hidden" },
  heading: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  headingText: { flex: 1, gap: 3 },
  title: { fontFamily: F.b, fontSize: 16 },
  detail: { fontFamily: F.r, fontSize: 12, lineHeight: 17 },
  metrics: { flexDirection: "row", gap: 10 },
  metric: {
    flex: 1,
    minHeight: 70,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  metricLabel: { fontFamily: F.m, fontSize: 11 },
  metricValue: { fontFamily: F.b, fontSize: 18 },
  latest: { fontFamily: F.s, fontSize: 13 },
  packageRow: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footnote: { fontFamily: F.r, fontSize: 11, lineHeight: 16 },
});
