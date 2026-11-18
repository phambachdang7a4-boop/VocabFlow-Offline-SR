import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  downloadOfflineCourseData,
  getOfflineCourseDataStatus,
  type OfflineCourseDataDownloadStage,
} from "@/data/offline-course-data";
import { OFFLINE_COURSE_DATA } from "@/domain/course-data-package";
import { useColors } from "@/hooks/useColors";
import { Button, F } from "./ui";

type CourseDownloadState =
  | "checking"
  | "missing"
  | "installed"
  | "updateAvailable"
  | "damaged"
  | "unavailable"
  | "downloading"
  | "failed"
  | "cancelled";

const RESOURCE_ROWS = [
  {
    id: "dictionary",
    icon: "book-open" as const,
    title: "Từ điển",
    detail: "44,2 MB · Cài trong Expo Go trên Android",
  },
  {
    id: "ipa",
    icon: "mic" as const,
    title: "IPA ngoại tuyến",
    detail: "7,9 MB · Cài cùng từ điển trong Expo Go",
  },
  {
    id: "audio",
    icon: "volume-2" as const,
    title: "Âm thanh",
    detail: "321,8 MB · Chỉ hỗ trợ Android",
  },
] as const;

const COURSE_BYTES = OFFLINE_COURSE_DATA.bytes;

function formatMegabytes(bytes: number): string {
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function stateMessage(
  state: CourseDownloadState,
  percent: number,
  phase: OfflineCourseDataDownloadStage,
): string {
  switch (state) {
    case "checking":
      return "Đang kiểm tra dữ liệu trên máy…";
    case "downloading":
      if (phase === "verifying") return "Đang xác minh gói khóa học…";
      if (phase === "validating") return "Đang kiểm tra nội dung khóa học…";
      if (phase === "saving") return "Đang lưu gói khóa học…";
      return `Đang tải · ${percent}%`;
    case "installed":
      return "Đã sẵn sàng ngoại tuyến";
    case "updateAvailable":
      return "Đang cập nhật phiên bản mới…";
    case "damaged":
    case "missing":
      return "Đang chuẩn bị tải…";
    case "unavailable":
      return "Không thể kiểm tra dữ liệu trên trình duyệt";
    case "failed":
      return "Tải chưa hoàn tất";
    case "cancelled":
      return "Đã dừng · có thể tiếp tục sau";
  }
}

export function WebOfflineDataDialog() {
  const c = useColors();
  const mounted = useRef(false);
  const autoStartAllowed = useRef(true);
  const downloadPromise = useRef<Promise<void> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const [visible, setVisible] = useState(Platform.OS === "web");
  const [state, setState] = useState<CourseDownloadState>("checking");
  const [phase, setPhase] =
    useState<OfflineCourseDataDownloadStage>("downloading");
  const [bytesWritten, setBytesWritten] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const startDownload = useCallback(async () => {
    if (downloadPromise.current) {
      await downloadPromise.current.catch(() => undefined);
    }
    if (
      !mounted.current ||
      Platform.OS !== "web" ||
      !autoStartAllowed.current
    ) {
      return;
    }

    const nextController = new AbortController();
    controller.current = nextController;
    setError(null);
    setPhase("downloading");
    setState("downloading");

    const task = downloadOfflineCourseData(
      (written) => {
        if (mounted.current) setBytesWritten(written);
      },
      nextController.signal,
      (nextPhase) => {
        if (mounted.current) setPhase(nextPhase);
      },
    );
    downloadPromise.current = task;

    try {
      await task;
      if (!mounted.current) return;
      setBytesWritten(COURSE_BYTES);
      setState("installed");
    } catch (cause) {
      if (!mounted.current) return;
      if (nextController.signal.aborted) {
        setState("cancelled");
      } else {
        setState("failed");
        setError(
          cause instanceof Error
            ? cause.message
            : "Không thể tải gói khóa học.",
        );
      }
    } finally {
      if (downloadPromise.current === task) downloadPromise.current = null;
      if (controller.current === nextController) controller.current = null;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (Platform.OS !== "web") return;

    let active = true;
    setVisible(true);
    void (async () => {
      try {
        const status = await getOfflineCourseDataStatus();
        if (!active || !mounted.current || !autoStartAllowed.current) return;
        setBytesWritten(Math.min(status.bytes, COURSE_BYTES));
        setState(status.state);
        if (status.state === "installed") return;
        if (status.state === "unavailable") {
          setError("Trình duyệt không cho phép mở dữ liệu offline.");
          return;
        }
        await startDownload();
      } catch (cause) {
        if (!active || !mounted.current) return;
        setState("failed");
        setError(
          cause instanceof Error
            ? cause.message
            : "Không thể kiểm tra gói khóa học.",
        );
      }
    })();

    return () => {
      active = false;
      mounted.current = false;
      controller.current?.abort();
    };
  }, [startDownload]);

  const stopAndClose = () => {
    autoStartAllowed.current = false;
    controller.current?.abort();
    setVisible(false);
  };

  const percent = Math.max(
    0,
    Math.min(100, Math.round((bytesWritten / COURSE_BYTES) * 100)),
  );
  const isBusy = state === "checking" || state === "downloading";
  const courseComplete = state === "installed";

  if (Platform.OS !== "web") return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={stopAndClose}
      statusBarTranslucent
    >
      <View
        style={[styles.overlay, { backgroundColor: c.overlay }]}
        testID="web-offline-data-dialog"
      >
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: c.card,
              borderColor: c.border,
              borderRadius: c.radius + 8,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: c.accentSoft }]}>
              <Feather name="download-cloud" size={22} color={c.accent} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: c.foreground }]}>
                Dữ liệu ngoại tuyến
              </Text>
              <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
                Đang tự tải gói khóa học cho web.
              </Text>
            </View>
            <Pressable
              testID="web-offline-data-close"
              accessibilityRole="button"
              accessibilityLabel="Đóng và dừng tải"
              onPress={stopAndClose}
              hitSlop={12}
              style={styles.closeButton}
            >
              <Feather name="x" size={21} color={c.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.resourceCard,
                { borderColor: c.border, backgroundColor: c.background },
              ]}
            >
              <View style={styles.rowHeading}>
                <View style={[styles.resourceIcon, { backgroundColor: c.accentSoft }]}>
                  <Feather name="layers" size={19} color={c.accent} />
                </View>
                <View style={styles.resourceCopy}>
                  <Text style={[styles.resourceTitle, { color: c.foreground }]}>
                    Gói khóa học
                  </Text>
                  <Text style={[styles.resourceDetail, { color: c.mutedForeground }]}>
                    {OFFLINE_COURSE_DATA.courseCount} khóa · {formatMegabytes(COURSE_BYTES)}
                  </Text>
                </View>
                {isBusy ? (
                  <ActivityIndicator color={c.primary} />
                ) : courseComplete ? (
                  <Feather name="check-circle" size={20} color={c.success} />
                ) : null}
              </View>
              <View
                accessibilityRole="progressbar"
                accessibilityLabel="Tiến độ tải gói khóa học"
                accessibilityValue={{ min: 0, max: 100, now: percent }}
                style={[styles.progressTrack, { backgroundColor: c.muted }]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${percent}%`,
                      backgroundColor: courseComplete ? c.success : c.accent,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.statusText,
                  { color: error ? c.destructiveText : c.mutedForeground },
                ]}
              >
                {error ?? stateMessage(state, percent, phase)}
                {state === "downloading"
                  ? ` · ${formatMegabytes(bytesWritten)} / ${formatMegabytes(COURSE_BYTES)}`
                  : ""}
              </Text>
            </View>

            {RESOURCE_ROWS.map((resource) => (
              <View
                key={resource.id}
                style={[
                  styles.resourceCard,
                  styles.nativeOnlyCard,
                  { borderColor: c.border, backgroundColor: c.background },
                ]}
              >
                <View style={styles.rowHeading}>
                  <View style={[styles.resourceIcon, { backgroundColor: c.muted }]}>
                    <Feather
                      name={resource.icon}
                      size={19}
                      color={c.mutedForeground}
                    />
                  </View>
                  <View style={styles.resourceCopy}>
                    <Text style={[styles.resourceTitle, { color: c.foreground }]}>
                      {resource.title}
                    </Text>
                    <Text style={[styles.resourceDetail, { color: c.mutedForeground }]}>
                      {resource.detail}
                    </Text>
                  </View>
                  <Feather name="smartphone" size={18} color={c.mutedForeground} />
                </View>
                <View
                  accessibilityLabel={`${resource.title}: không tải trên web`}
                  style={[styles.progressTrack, { backgroundColor: c.muted }]}
                >
                  <View style={[styles.progressFill, styles.notApplicableFill]} />
                </View>
                <Text style={[styles.statusText, { color: c.mutedForeground }]}>
                  Chuyển sang Expo Go để tải gói này.
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            {state === "downloading" ? (
              <Button
                testID="web-offline-data-stop"
                label="Dừng tải"
                icon="x"
                variant="ghost"
                onPress={() => controller.current?.abort()}
              />
            ) : state === "failed" || state === "cancelled" ? (
              <Button
                testID="web-offline-data-retry"
                label={state === "cancelled" ? "Tiếp tục tải" : "Thử lại"}
                icon="refresh-cw"
                onPress={() => void startDownload()}
              />
            ) : (
              <Button
                testID="web-offline-data-done"
                label="Đóng"
                icon="check"
                onPress={stopAndClose}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 28,
  },
  dialog: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "92%",
    borderWidth: 1,
    padding: 18,
    overflow: "hidden",
    gap: 14,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 11 },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, gap: 3 },
  title: { fontFamily: F.b, fontSize: 19 },
  subtitle: { fontFamily: F.r, fontSize: 13, lineHeight: 18 },
  closeButton: { padding: 5 },
  list: { flexShrink: 1 },
  listContent: { gap: 9, paddingBottom: 2 },
  resourceCard: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 12,
    gap: 8,
  },
  nativeOnlyCard: { opacity: 0.9 },
  rowHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  resourceIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  resourceCopy: { flex: 1, gap: 2 },
  resourceTitle: { fontFamily: F.s, fontSize: 14 },
  resourceDetail: { fontFamily: F.r, fontSize: 12, lineHeight: 17 },
  progressTrack: { height: 7, borderRadius: 5, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 5 },
  notApplicableFill: { width: "0%" },
  statusText: { fontFamily: F.m, fontSize: 11, lineHeight: 16 },
  footer: { paddingTop: 2 },
});
