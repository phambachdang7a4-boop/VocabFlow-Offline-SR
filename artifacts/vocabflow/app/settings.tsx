import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useVocabulary } from "@/contexts/VocabularyContext";
import { useColors } from "@/hooks/useColors";
import {
  Button,
  ConfirmDialog,
  ErrorBanner,
  F,
  MaterialSheen,
} from "@/components/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useAppearance,
  type AppearanceMode,
} from "@/contexts/AppearanceContext";
import { useSpeechPreferences } from "@/contexts/SpeechPreferencesContext";
import { useReviewPreferences } from "@/contexts/ReviewPreferencesContext";
import { useSoundEffects } from "@/contexts/SoundEffectsContext";
import {
  TIMEBOUND_REVIEW_DURATION_OPTIONS,
  REVIEW_WORD_LIMIT_OPTIONS,
} from "@/domain/review-modes";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  parseAccountBackup,
  serializeAccountBackup,
  type AccountBackupFile,
  MAX_ACCOUNT_BACKUP_BYTES,
  summarizeAccountBackup,
} from "@/data/account-backup";
import {
  exportSyncSnapshot,
  replaceAccountSyncSnapshot,
  clearLocalAccountAfterCloudReset,
} from "@/data/vocabulary-sync";
import { resetLocalOnly } from "@/domain/data-reset";
import {
  deleteOfflineDictionary,
  downloadOfflineDictionary,
  getOfflineDictionaryDownloadSnapshot,
  downloadOfflineRegionalPronunciationPart,
  getOfflineDictionaryStatus,
  openDictionary,
  subscribeToOfflineDictionaryDownload,
} from "@/data/dictionary";
import {
  deleteOfflineRegionalIpa,
  getOfflineRegionalIpaPartsStatus,
  getOfflineRegionalIpaStatus,
  type RegionalIpaSourceId,
} from "@/data/offline-regional-pronunciations";
import {
  deleteOfflineAudio,
  downloadOfflineAudio,
  getOfflineAudioStatus,
} from "@/data/offline-audio";
import { DICTIONARY } from "@/domain/dictionary";
import { OFFLINE_AUDIO_DICTIONARY } from "@/domain/offline-audio";
import { REGIONAL_IPA_DICTIONARY } from "@/domain/regional-pronunciations";
import {
  deleteOfflineCourseData,
  downloadOfflineCourseData,
  getOfflineCourseDataStatus,
} from "@/data/offline-course-data";
import { OFFLINE_COURSE_DATA } from "@/domain/course-data-package";
import { StartupPerformanceCard } from "@/components/StartupPerformanceCard";

export default function SettingsScreen() {
  const c = useColors();
  const { words, frozenWords, loading, error, reload } = useVocabulary();
  const appearance = useAppearance();
  const speech = useSpeechPreferences();
  const reviewPreferences = useReviewPreferences();
  const sound = useSoundEffects();
  const [transferState, setTransferState] = React.useState<
    "exporting" | "importing" | "restoring" | null
  >(null);
  const [transferError, setTransferError] = React.useState<string | null>(null);
  const [transferNotice, setTransferNotice] = React.useState<string | null>(
    null,
  );
  const [restoreError, setRestoreError] = React.useState<string | null>(null);
  const [restoreCandidate, setRestoreCandidate] =
    React.useState<AccountBackupFile | null>(null);
  const [dictionaryStatus, setDictionaryStatus] = React.useState<
    "checking" | "missing" | "installed" | "damaged" | "unavailable"
  >("checking");
  const [audioStatus, setAudioStatus] = React.useState<
    "checking" | "missing" | "installed" | "damaged" | "unavailable"
  >("checking");
  const [audioBytes, setAudioBytes] = React.useState(0);
  const [courseDataStatus, setCourseDataStatus] = React.useState<
    | "checking"
    | "missing"
    | "installed"
    | "updateAvailable"
    | "damaged"
    | "unavailable"
  >("checking");
  const [courseDataBytes, setCourseDataBytes] = React.useState(0);
  const [regionalIpaStatus, setRegionalIpaStatus] = React.useState<
    "checking" | "missing" | "installed" | "damaged"
  >("checking");
  const [regionalIpaParts, setRegionalIpaParts] = React.useState<
    Record<
      RegionalIpaSourceId,
      "checking" | "missing" | "verified" | "installed"
    >
  >({
    us: "checking",
    uk: "checking",
    ukSupplement: "checking",
  });
  const [regionalIpaEntryCount, setRegionalIpaEntryCount] = React.useState(0);
  const [offlineAction, setOfflineAction] = React.useState<
    | "dictionary-download"
    | "dictionary-delete"
    | "audio-download"
    | "audio-delete"
    | "course-data-download"
    | "course-data-delete"
    | "regional-ipa-us-download"
    | "regional-ipa-uk-download"
    | "regional-ipa-delete"
    | null
  >(null);
  const [offlineStage, setOfflineStage] = React.useState<string | null>(null);
  const [audioDownloadStage, setAudioDownloadStage] = React.useState<
    "downloading" | "verifying" | "saving" | null
  >(null);
  const [offlineProgress, setOfflineProgress] = React.useState({
    bytesWritten: 0,
    totalBytes: 0,
  });
  const courseDownloadController = React.useRef<AbortController | null>(null);
  const audioDownloadController = React.useRef<AbortController | null>(null);
  const [offlineError, setOfflineError] = React.useState<string | null>(null);
  const [resetDialog, setResetDialog] = React.useState<"local" | null>(null);
  const [resetBusy, setResetBusy] = React.useState(false);
  const [resetError, setResetError] = React.useState<string | null>(null);
  const [resetNotice, setResetNotice] = React.useState<string | null>(null);
  const dictionaryDownload = React.useSyncExternalStore(
    subscribeToOfflineDictionaryDownload,
    getOfflineDictionaryDownloadSnapshot,
    getOfflineDictionaryDownloadSnapshot,
  );
  const dictionaryDownloadActive = dictionaryDownload.state === "downloading";
  const offlineBusy = Boolean(offlineAction) || dictionaryDownloadActive;
  const insets = useSafeAreaInsets();
  const bottom = (Platform.OS === "web" ? 34 : insets.bottom) + 24;
  const syncBusy = false;
  const restoreSummary = restoreCandidate
    ? summarizeAccountBackup(restoreCandidate)
    : null;
  const refreshOfflineStatus = React.useCallback(async () => {
    try {
      const [
        dictionary,
        audio,
        regionalIpa,
        regionalIpaPartsStatus,
        courseData,
      ] =
        await Promise.all([
          getOfflineDictionaryStatus(),
          getOfflineAudioStatus(),
          getOfflineRegionalIpaStatus(),
          getOfflineRegionalIpaPartsStatus(),
          Platform.OS === "web"
            ? getOfflineCourseDataStatus()
            : Promise.resolve(null),
        ]);
      setDictionaryStatus(dictionary.state);
      setAudioStatus(audio.state);
      setAudioBytes(audio.bytes);
      setRegionalIpaStatus(regionalIpa.state);
      setRegionalIpaEntryCount(regionalIpa.entryCount);
      setRegionalIpaParts(regionalIpaPartsStatus);
      if (courseData) {
        setCourseDataStatus(courseData.state);
        setCourseDataBytes(courseData.bytes);
      }
    } catch {
      setDictionaryStatus("unavailable");
      setAudioStatus("damaged");
      setAudioBytes(0);
      setRegionalIpaStatus("damaged");
      setRegionalIpaParts({
        us: "missing",
        uk: "missing",
        ukSupplement: "missing",
      });
      if (Platform.OS === "web") {
        setCourseDataStatus("damaged");
        setCourseDataBytes(0);
      }
    }
  }, []);
  React.useEffect(() => {
    void refreshOfflineStatus();
  }, [refreshOfflineStatus]);
  const sizeLabel = (bytes: number) =>
    `${(bytes / (1024 * 1024)).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
  const progressLabel =
    offlineProgress.totalBytes > 0
      ? `${Math.min(100, Math.round((offlineProgress.bytesWritten / offlineProgress.totalBytes) * 100))}% · ${sizeLabel(offlineProgress.bytesWritten)} / ${sizeLabel(offlineProgress.totalBytes)}`
      : `${sizeLabel(offlineProgress.bytesWritten)} đã tải`;
  const offlineProgressText = offlineAction
    ? `${offlineStage ?? "Đang xử lý"}${offlineAction.endsWith("download") && !(offlineAction === "dictionary-download" && dictionaryStatus === "unavailable") ? ` · ${progressLabel}` : "…"}`
    : null;
  const dictionaryProgressPercent =
    dictionaryDownload.totalBytes > 0
      ? Math.min(
          100,
          Math.round(
            (dictionaryDownload.bytesWritten / dictionaryDownload.totalBytes) *
              100,
          ),
        )
      : 0;
  const dictionaryStageLabel = {
    checking: "Đang kiểm tra từ điển",
    "awaiting-consent": "Chờ xác nhận",
    downloading: "Đang tải từ điển",
    verifying: "Đang xác minh tệp",
    importing: "Đang mở dữ liệu từ điển",
    "validating-import": "Đang kiểm tra dữ liệu SQLite",
    "updating-content": "Đang cập nhật nội dung",
    saving: "Đang lưu từ điển",
    "indexing-courses": "Đang thêm nhãn khóa học",
    ready: "Đã cài từ điển",
  } as const;
  const dictionaryProgressText =
    dictionaryDownload.state === "downloading"
      ? `${dictionaryStageLabel[dictionaryDownload.stage ?? "checking"]} · ${dictionaryProgressPercent}% · ${sizeLabel(dictionaryDownload.bytesWritten)} / ${sizeLabel(dictionaryDownload.totalBytes)}`
      : null;

  const handleDownloadDictionary = async () => {
    if (offlineBusy || syncBusy) return;
    setOfflineError(null);
    try {
      await downloadOfflineDictionary(dictionaryStatus !== "unavailable");
    } catch {
      // The module-level download snapshot keeps the error if this screen unmounts.
    } finally {
      await refreshOfflineStatus();
    }
  };

  const handleDownloadAudio = async () => {
    if (offlineBusy || syncBusy) return;
    setOfflineError(null);
    setOfflineAction("audio-download");
    setOfflineStage("Đang tải gói audio");
    setAudioDownloadStage("downloading");
    const controller = new AbortController();
    audioDownloadController.current = controller;
    setOfflineProgress({
      bytesWritten: audioBytes,
      totalBytes: OFFLINE_AUDIO_DICTIONARY.bytes,
    });
    try {
      await downloadOfflineAudio(
        (bytesWritten, totalBytes) =>
          setOfflineProgress({ bytesWritten, totalBytes }),
        controller.signal,
        (stage) => {
          setAudioDownloadStage(stage);
          setOfflineStage(
            {
              downloading: "Đang tải gói audio",
              verifying: "Đang xác minh gói audio",
              saving: "Đang lưu gói audio vào máy",
            }[stage],
          );
        },
      );
      setOfflineStage("Đã cài xong");
    } catch (cause) {
      if (controller.signal.aborted) {
        setOfflineError(null);
        setOfflineStage("Đã dừng tải audio; phần đã tải vẫn được giữ lại");
      } else {
        setOfflineError(
          cause instanceof Error ? cause.message : "Không thể cài audio offline.",
        );
      }
    } finally {
      if (audioDownloadController.current === controller) {
        audioDownloadController.current = null;
      }
      setAudioDownloadStage(null);
      setOfflineAction(null);
      await refreshOfflineStatus();
    }
  };

  const handleDownloadCourseData = async () => {
    if (offlineBusy || syncBusy) return;
    setOfflineError(null);
    setOfflineAction("course-data-download");
    setOfflineStage("Đang tải gói khóa học");
    const controller = new AbortController();
    courseDownloadController.current = controller;
    setOfflineProgress({
      bytesWritten: 0,
      totalBytes: OFFLINE_COURSE_DATA.bytes,
    });
    try {
      await downloadOfflineCourseData(
        (bytesWritten, totalBytes) =>
          setOfflineProgress({ bytesWritten, totalBytes }),
        controller.signal,
        (stage) => {
          const stageText = {
            downloading: "Đang tải gói khóa học",
            verifying: "Đang xác minh gói khóa học",
            validating: "Đang kiểm tra nội dung khóa học",
            saving: "Đang lưu gói khóa học",
          } as const;
          setOfflineStage(stageText[stage]);
        },
      );
      setOfflineStage("Đã cài xong gói khóa học");
      const latestDictionaryStatus = await getOfflineDictionaryStatus().catch(
        () => null,
      );
      if (latestDictionaryStatus?.state === "installed") {
        try {
          setOfflineStage("Đang cập nhật nhãn khóa học trong từ điển");
          await openDictionary((stage) => {
            if (stage === "indexing-courses") {
              setOfflineStage("Đang cập nhật nhãn khóa học trong từ điển");
            }
          }, { allowDownload: false });
          setOfflineStage("Đã cài xong gói khóa học");
        } catch (cause) {
          setOfflineError(
            `Gói khóa học đã cài, nhưng chưa thể cập nhật nhãn khóa học trong từ điển: ${
              cause instanceof Error ? cause.message : "Hãy thử lại."
            }`,
          );
        }
      }
    } catch (cause) {
      if (controller.signal.aborted) {
        setOfflineError(null);
        setOfflineStage("Đã dừng tải gói khóa học");
      } else {
        setOfflineError(
          cause instanceof Error
            ? cause.message
            : "Không thể cài gói khóa học offline.",
        );
      }
    } finally {
      if (courseDownloadController.current === controller) {
        courseDownloadController.current = null;
      }
      setOfflineAction(null);
      await refreshOfflineStatus();
    }
  };

  const handleDownloadRegionalIpaParts = async (
    rowId: "us" | "uk",
    sourceIds: readonly RegionalIpaSourceId[],
  ) => {
    if (offlineBusy || syncBusy) return;
    setOfflineError(null);
    setOfflineAction(`regional-ipa-${rowId}-download`);
    setOfflineStage("Đang chuẩn bị dữ liệu IPA");
    setOfflineProgress({
      bytesWritten: 0,
      totalBytes: sourceIds.reduce(
        (total, sourceId) => total + REGIONAL_IPA_DICTIONARY[sourceId].bytes,
        0,
      ),
    });
    try {
      const selectedTotalBytes = sourceIds.reduce(
        (total, sourceId) => total + REGIONAL_IPA_DICTIONARY[sourceId].bytes,
        0,
      );
      let bytesBefore = 0;
      let installedEntryCount: number | undefined;
      for (const sourceId of sourceIds) {
        const result = await downloadOfflineRegionalPronunciationPart(
          sourceId,
          (stage, bytesWritten) => {
            setOfflineStage(stage);
            if (stage.includes("ghép IPA")) {
              setOfflineProgress({
                bytesWritten: REGIONAL_IPA_DICTIONARY.sourceBytes,
                totalBytes: REGIONAL_IPA_DICTIONARY.sourceBytes,
              });
            } else {
              setOfflineProgress({
                bytesWritten: bytesBefore + bytesWritten,
                totalBytes: selectedTotalBytes,
              });
            }
          },
        );
        if (result.complete) {
          installedEntryCount = result.entryCount ?? 0;
          break;
        }
        bytesBefore += REGIONAL_IPA_DICTIONARY[sourceId].bytes;
      }
      setOfflineStage(
        installedEntryCount !== undefined
          ? `Đã cài ${installedEntryCount.toLocaleString("vi-VN")} mục IPA`
          : "Đã lưu các phần IPA đã kiểm tra",
      );
    } catch (cause) {
      setOfflineError(
        cause instanceof Error
          ? cause.message
          : "Không thể cài dữ liệu IPA offline.",
      );
    } finally {
      setOfflineAction(null);
      await refreshOfflineStatus();
    }
  };

  const handleDeleteOfflineResource = async (
    resource: "dictionary" | "audio" | "regional-ipa" | "course-data",
  ) => {
    if (offlineBusy || syncBusy) return;
    setOfflineError(null);
    setOfflineAction(
      resource === "dictionary"
        ? "dictionary-delete"
        : resource === "audio"
          ? "audio-delete"
          : resource === "regional-ipa"
            ? "regional-ipa-delete"
            : "course-data-delete",
    );
    setOfflineStage(
      resource === "dictionary"
        ? "Đang xóa từ điển"
        : resource === "audio"
          ? "Đang xóa audio"
          : resource === "regional-ipa"
            ? "Đang xóa dữ liệu IPA"
            : "Đang xóa gói khóa học · tiến độ vẫn được giữ",
    );
    try {
      if (resource === "dictionary") await deleteOfflineDictionary();
      else if (resource === "audio") await deleteOfflineAudio();
      else if (resource === "regional-ipa") await deleteOfflineRegionalIpa();
      else await deleteOfflineCourseData();
    } catch (cause) {
      setOfflineError(
        cause instanceof Error ? cause.message : "Không thể xóa gói offline.",
      );
    } finally {
      setOfflineAction(null);
      await refreshOfflineStatus();
    }
  };

  const handleResetAppData = async () => {
    if (!resetDialog || resetBusy || offlineBusy || transferState || syncBusy)
      return;
    setResetError(null);
    setResetNotice(null);
    setResetBusy(true);
    try {
      const clearOfflineResources = async () => {
        await deleteOfflineAudio();
        await deleteOfflineRegionalIpa();
        await deleteOfflineDictionary();
        await deleteOfflineCourseData();
      };
      const snapshot = await exportSyncSnapshot();
      await resetLocalOnly({
        currentRevision: snapshot.payload.revision,
        clearLocal: async (revision) =>
          clearLocalAccountAfterCloudReset(revision),
        clearOfflineResources,
      });
      await reload();
      await refreshOfflineStatus();
      setResetDialog(null);
      setResetNotice(
        "Đã xóa dữ liệu học và tài nguyên offline trên thiết bị này.",
      );
    } catch (cause) {
      setResetError(
        cause instanceof Error ? cause.message : "Không thể đặt lại dữ liệu.",
      );
    } finally {
      setResetBusy(false);
    }
  };

  const facts: {
    icon: keyof typeof Feather.glyphMap;
    title: string;
    body: string;
  }[] = [
    {
      icon: "smartphone",
      title: "Lưu trên thiết bị này",
      body: "Sổ từ được lưu trong bộ nhớ cục bộ của ứng dụng trên máy bạn.",
    },
    {
      icon: "wifi-off",
      title: "Học offline",
      body: "Tra từ, học và ôn tập dùng SQLite cục bộ; mở ứng dụng không cần mạng.",
    },
    {
      icon: "alert-triangle",
      title: "Dữ liệu trên thiết bị",
      body: "Sổ từ và tiến độ chỉ lưu trên máy này. Hãy xuất bản sao lưu trước khi gỡ ứng dụng.",
    },
  ];

  const handleExportData = async () => {
    setTransferError(null);
    setTransferNotice(null);
    setTransferState("exporting");
    try {
      const snapshot = await exportSyncSnapshot();
      const contents = serializeAccountBackup(snapshot.payload);
      const fileName = `vocabflow-sao-luu-${new Date().toISOString().slice(0, 10)}.json`;
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(
          new Blob([contents], { type: "application/json" }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setTransferNotice("Đã tải tệp sao lưu xuống thiết bị.");
      } else {
        const directory = FileSystem.cacheDirectory;
        if (!directory)
          throw new Error("Không thể tạo tệp sao lưu trên thiết bị.");
        const uri = `${directory}${fileName}`;
        await FileSystem.writeAsStringAsync(uri, contents, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        if (!(await Sharing.isAvailableAsync())) {
          throw new Error("Thiết bị không hỗ trợ chia sẻ tệp lúc này.");
        }
        await Sharing.shareAsync(uri, {
          mimeType: "application/json",
          dialogTitle: "Chia sẻ dữ liệu VocabFlow",
        });
      }
    } catch (cause) {
      setTransferError(
        cause instanceof Error
          ? cause.message
          : "Không thể tạo gói sao lưu. Hãy thử lại.",
      );
    } finally {
      setTransferState(null);
    }
  };

  const handleImportData = async () => {
    setTransferError(null);
    setTransferNotice(null);
    setTransferState("importing");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) throw new Error("Không tìm thấy tệp đã chọn.");
      if (asset.size !== undefined && asset.size > MAX_ACCOUNT_BACKUP_BYTES) {
        throw new Error("Tệp sao lưu quá lớn hoặc không hợp lệ.");
      }
      const contents =
        Platform.OS === "web" && asset.file
          ? await asset.file.text()
          : await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.UTF8,
            });
      setRestoreCandidate(parseAccountBackup(contents));
      setRestoreError(null);
    } catch (cause) {
      setTransferError(
        cause instanceof Error
          ? cause.message
          : "Không thể đọc tệp sao lưu. Hãy thử lại.",
      );
    } finally {
      setTransferState(null);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreCandidate || transferState) return;
    setRestoreError(null);
    setTransferState("restoring");
    try {
      await replaceAccountSyncSnapshot(restoreCandidate.payload);
      await reload();
      setRestoreCandidate(null);
      setTransferNotice("Đã khôi phục dữ liệu trên thiết bị này.");
    } catch (cause) {
      setRestoreError(
        cause instanceof Error
          ? cause.message
          : "Không thể khôi phục dữ liệu. Dữ liệu hiện tại chưa bị thay đổi.",
      );
    } finally {
      setTransferState(null);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: bottom,
          gap: 16,
        }}
      >
        {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
        <Text style={[styles.section, { color: c.mutedForeground }]}>
          HÌNH ẢNH
        </Text>
        <Text style={[styles.appearanceHint, { color: c.mutedForeground }]}>
          Bản sáng là mặc định. Lựa chọn áp dụng cho toàn bộ ứng dụng và được
          lưu trên thiết bị.
        </Text>
        <View
          style={[
            styles.appearanceGroup,
            {
              backgroundColor: c.card,
              borderColor: c.border,
              borderRadius: c.radius,
            },
          ]}
        >
          <MaterialSheen radius={c.radius} />
          {[
            {
              mode: "light" as AppearanceMode,
              title: "Sáng",
              detail: "Kem giấy · navy · vàng kính",
              icon: "sun" as const,
            },
            {
              mode: "dark" as AppearanceMode,
              title: "Tối",
              detail: "Xanh đen · navy · vàng",
              icon: "moon" as const,
            },
          ].map((option) => {
            const selected = appearance.mode === option.mode;
            return (
              <Pressable
                key={option.mode}
                testID={`appearance-${option.mode}`}
                accessibilityRole="radio"
                accessibilityLabel={`Giao diện ${option.title}`}
                accessibilityState={{
                  checked: selected,
                  disabled: appearance.loading || appearance.saving,
                }}
                disabled={appearance.loading || appearance.saving}
                onPress={() => {
                  void appearance.setMode(option.mode);
                }}
                style={({ pressed }) => [
                  styles.appearanceOption,
                  {
                    backgroundColor: selected ? c.button : c.headerButton,
                    borderColor: selected ? c.button : c.navigationBorder,
                    opacity: pressed
                      ? 0.75
                      : appearance.loading || appearance.saving
                        ? 0.55
                        : 1,
                    shadowColor: c.shade,
                    shadowOffset: { width: 0, height: pressed ? 1 : 3 },
                    shadowOpacity: pressed ? 0.06 : 0.15,
                    shadowRadius: 5,
                    elevation: pressed ? 1 : 2,
                  },
                ]}
              >
                <MaterialSheen tone={selected ? "gold" : "navy"} radius={14} />
                <Feather
                  name={option.icon}
                  size={19}
                  color={selected ? c.buttonForeground : c.headerForeground}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={[
                      styles.appearanceTitle,
                      {
                        color: selected
                          ? c.buttonForeground
                          : c.headerForeground,
                      },
                    ]}
                  >
                    {option.title}
                  </Text>
                  <Text
                    style={[
                      styles.appearanceDetail,
                      { color: selected ? c.buttonForeground : c.headerMuted },
                    ]}
                  >
                    {option.detail}
                  </Text>
                </View>
                {selected ? (
                  <Feather
                    name="check-circle"
                    size={19}
                    color={c.buttonForeground}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <View
          testID="graphics-quality-placeholder"
          style={[
            styles.qualityPlaceholder,
            { backgroundColor: c.card, borderColor: c.border },
          ]}
        >
          <Feather name="image" size={18} color={c.mutedForeground} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.appearanceTitle, { color: c.foreground }]}>
              Chất lượng đồ họa
            </Text>
            <Text style={[styles.appearanceDetail, { color: c.mutedForeground }]}>
              Sẽ bổ sung sau
            </Text>
          </View>
        </View>
        {appearance.error ? (
          <ErrorBanner
            message={appearance.error}
            onRetry={() => {
              void appearance.retryLoad();
            }}
          />
        ) : null}
        {appearance.loading ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.appearanceHint, { color: c.mutedForeground }]}
          >
            Đang tải lựa chọn giao diện…
          </Text>
        ) : null}
        {appearance.saving ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.appearanceHint, { color: c.mutedForeground }]}
          >
            Đang lưu giao diện…
          </Text>
        ) : null}
        <Text style={[styles.section, { color: c.mutedForeground }]}>
          ÂM THANH
        </Text>
        <Text style={[styles.appearanceHint, { color: c.mutedForeground }]}>
          Ưu tiên audio từ điển offline nếu đã cài; nếu chưa, dùng giọng tiếng
          Anh có sẵn trên điện thoại. Dữ liệu không được tải lên mạng.
        </Text>
        <View
          style={[
            styles.speechGroup,
            {
              backgroundColor: c.card,
              borderColor: c.border,
              borderRadius: c.radius,
            },
          ]}
        >
          <MaterialSheen radius={c.radius} />
          <View style={styles.speechRow}>
            <View style={styles.speechText}>
              <Text style={[styles.appearanceTitle, { color: c.foreground }]}>
                Tự phát âm khi hiện từ mới
              </Text>
              <Text
                style={[styles.appearanceDetail, { color: c.mutedForeground }]}
              >
                Tự phát âm khi mở thẻ mới.
              </Text>
            </View>
            <Switch
              testID="speech-auto-read"
              accessibilityLabel="Tự phát âm khi hiện từ mới"
              value={speech.autoRead}
              disabled={!speech.ready || speech.saving}
              onValueChange={(value) => {
                void speech.setAutoRead(value);
              }}
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor={c.card}
            />
          </View>
          <View
            style={[
              styles.speechRow,
              { borderTopWidth: 1, borderTopColor: c.border },
            ]}
          >
            <View style={styles.speechText}>
              <Text style={[styles.appearanceTitle, { color: c.foreground }]}>
                Đọc chậm
              </Text>
              <Text
                style={[styles.appearanceDetail, { color: c.mutedForeground }]}
              >
                Giảm tốc độ phát âm cho dễ nghe.
              </Text>
            </View>
            <Switch
              testID="speech-slow-read"
              accessibilityLabel="Đọc chậm"
              value={speech.slowRead}
              disabled={!speech.ready || speech.saving}
              onValueChange={(value) => {
                void speech.setSlowRead(value);
              }}
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor={c.card}
            />
          </View>
        </View>
        {speech.error ? (
          <ErrorBanner
            message={speech.error}
            onRetry={() => {
              void speech.retryLoad();
            }}
          />
        ) : null}
        <Text style={[styles.appearanceHint, { color: c.mutedForeground }]}>
          Nhạc piano chỉ phát ở tab Ôn tập, tự tắt trong phiên làm bài và trò
          nối từ. Âm lượng nhạc nhỏ hơn hiệu ứng; công tắc và mức âm lượng dưới
          đây điều khiển cả hai.
        </Text>
        <View
          style={[
            styles.speechGroup,
            {
              backgroundColor: c.card,
              borderColor: c.border,
              borderRadius: c.radius,
            },
          ]}
        >
          <View style={styles.speechRow}>
            <View style={styles.speechText}>
              <Text style={[styles.appearanceTitle, { color: c.foreground }]}>
                Âm thanh ứng dụng
              </Text>
              <Text
                style={[styles.appearanceDetail, { color: c.mutedForeground }]}
              >
                Hiệu ứng nhẹ và nhạc nền piano.
              </Text>
            </View>
            <Switch
              testID="sfx-enabled"
              accessibilityLabel="Âm thanh ứng dụng"
              value={sound.enabled}
              disabled={!sound.ready || sound.saving}
              onValueChange={(value) => {
                if (value) sound.unlockFromGesture();
                void sound.setEnabled(value);
              }}
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor={c.card}
            />
          </View>
          <View
            style={[
              styles.volumeRow,
              { borderTopWidth: 1, borderTopColor: c.border },
            ]}
          >
            <View style={styles.speechText}>
              <Text style={[styles.appearanceTitle, { color: c.foreground }]}>
                Âm lượng
              </Text>
              <Text
                testID="sfx-volume-value"
                style={[styles.appearanceDetail, { color: c.mutedForeground }]}
              >
                {Math.round(sound.volume * 100)}%
              </Text>
            </View>
            <View style={styles.volumeControls}>
              <Pressable
                testID="sfx-volume-down"
                accessibilityRole="button"
                accessibilityLabel="Giảm âm lượng"
                accessibilityState={{
                  disabled: !sound.ready || sound.saving || sound.volume <= 0,
                }}
                disabled={!sound.ready || sound.saving || sound.volume <= 0}
                onPress={() => {
                  sound.unlockFromGesture();
                  void sound.setVolume(sound.volume - 0.1);
                }}
                style={({ pressed }) => [
                  styles.volumeButton,
                  {
                    backgroundColor: c.secondary,
                    opacity:
                      !sound.ready || sound.saving || sound.volume <= 0
                        ? 0.45
                        : pressed
                          ? 0.65
                          : 1,
                  },
                ]}
              >
                <Feather name="minus" size={19} color={c.primary} />
              </Pressable>
              <Pressable
                testID="sfx-volume-up"
                accessibilityRole="button"
                accessibilityLabel="Tăng âm lượng"
                accessibilityState={{
                  disabled: !sound.ready || sound.saving || sound.volume >= 1,
                }}
                disabled={!sound.ready || sound.saving || sound.volume >= 1}
                onPress={() => {
                  sound.unlockFromGesture();
                  void sound.setVolume(sound.volume + 0.1);
                }}
                style={({ pressed }) => [
                  styles.volumeButton,
                  {
                    backgroundColor: c.secondary,
                    opacity:
                      !sound.ready || sound.saving || sound.volume >= 1
                        ? 0.45
                        : pressed
                          ? 0.65
                          : 1,
                  },
                ]}
              >
                <Feather name="plus" size={19} color={c.primary} />
              </Pressable>
            </View>
          </View>
        </View>
        {sound.error ? (
          <ErrorBanner
            message={sound.error}
            onRetry={() => {
              void sound.retryLoad();
            }}
          />
        ) : null}
        <Text style={[styles.section, { color: c.mutedForeground }]}>
          CHẾ ĐỘ LƯU TRỮ
        </Text>
        <View
          style={[
            styles.accountCard,
            {
              backgroundColor: c.card,
              borderColor: c.border,
              borderRadius: c.radius,
            },
          ]}
        >
          <MaterialSheen radius={c.radius} />
          <View style={styles.accountHeader}>
            <View
              style={[styles.accountIcon, { backgroundColor: c.secondary }]}
            >
              <Feather name="smartphone" size={19} color={c.primary} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.appearanceTitle, { color: c.foreground }]}>
                Chỉ lưu trên thiết bị
              </Text>
              <Text
                style={[
                  styles.appearanceDetail,
                  { color: c.mutedForeground },
                ]}
              >
                Không cần đăng nhập hoặc kết nối mạng để mở ứng dụng.
              </Text>
            </View>
          </View>
          <View style={[styles.syncRow, { borderTopColor: c.border }]}>
            <Feather name="lock" size={18} color={c.primary} />
            <Text
              style={[
                styles.appearanceDetail,
                { flex: 1, color: c.mutedForeground },
              ]}
            >
              Sổ từ và tiến độ nằm trong bộ nhớ ứng dụng. Hãy sao lưu trước khi
              gỡ ứng dụng hoặc đổi điện thoại.
            </Text>
          </View>
        </View>
        <Text style={[styles.section, { color: c.mutedForeground }]}>
          SAO LƯU & KHÔI PHỤC
        </Text>
        <Text style={[styles.appearanceHint, { color: c.mutedForeground }]}>
          Gói gồm sổ từ, tiến độ ôn, thống kê và phần thưởng; không gồm từ điển
          offline, audio hay thông tin tài khoản.
        </Text>
        <View
          style={[
            styles.backupCard,
            {
              backgroundColor: c.card,
              borderColor: c.border,
              borderRadius: c.radius,
            },
          ]}
        >
          <MaterialSheen radius={c.radius} />
          <Button
            testID="account-export-data"
            label="Xuất và chia sẻ tệp"
            icon="share-2"
            onPress={() => {
              void handleExportData();
            }}
            loading={transferState === "exporting"}
            disabled={transferState !== null}
          />
          <Button
            testID="account-import-data"
            label="Nhập tệp sao lưu"
            icon="upload"
            variant="ghost"
            onPress={() => {
              void handleImportData();
            }}
            loading={transferState === "importing"}
            disabled={transferState !== null || syncBusy}
          />
          <Text style={[styles.appearanceDetail, { color: c.mutedForeground }]}>
            Bản xuất lấy dữ liệu đang có trên thiết bị. Tệp JSON có thể đọc
            được; chỉ gửi cho người bạn tin cậy. Khôi phục sẽ thay toàn bộ dữ
            liệu học hiện tại trên máy này.
          </Text>
          {transferError ? <ErrorBanner message={transferError} /> : null}
          {transferNotice ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.transferNotice, { color: c.successText }]}
            >
              {transferNotice}
            </Text>
          ) : null}
        </View>
        <ConfirmDialog
          visible={restoreCandidate !== null}
          title="Thay thế dữ liệu hiện tại?"
          message={`Sổ từ, tiến độ ôn, trạng thái đóng băng, thống kê và phần thưởng trên thiết bị này sẽ được thay bằng tệp sao lưu. Hãy xuất bản sao lưu trước nếu bạn muốn giữ dữ liệu hiện tại.

Nội dung tệp:
• Từ cá nhân: ${restoreSummary?.personalWordCount ?? 0}
• Từ đã đóng băng: ${restoreSummary?.frozenWordCount ?? 0}
• Ngày có thống kê ôn: ${restoreSummary?.reviewStatDayCount ?? 0}`}
          confirmLabel="Ghi đè"
          onCancel={() => {
            setRestoreCandidate(null);
            setRestoreError(null);
          }}
          onConfirm={() => {
            void handleConfirmRestore();
          }}
          busy={transferState === "restoring"}
          error={restoreError}
        />
        <Text style={[styles.section, { color: c.mutedForeground }]}>
          ĐẶT LẠI DỮ LIỆU
        </Text>
        <View
          style={[
            styles.resetCard,
            {
              backgroundColor: c.card,
              borderColor: c.border,
              borderRadius: c.radius,
            },
          ]}
        >
          <MaterialSheen radius={c.radius} />
          <Text style={[styles.appearanceDetail, { color: c.mutedForeground }]}>
            Đặt lại sẽ xóa dữ liệu học và tài nguyên offline trên thiết bị này.
            Hãy xuất bản sao lưu trước nếu muốn giữ dữ liệu.
          </Text>
          <Button
            testID="reset-app-data"
            label="Đặt lại trên thiết bị"
            icon="trash-2"
            variant="danger"
            onPress={() => {
              setResetError(null);
              setResetDialog("local");
            }}
            disabled={
              syncBusy ||
              offlineBusy ||
              transferState !== null ||
              resetBusy
            }
          />
          {resetNotice ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.transferNotice, { color: c.successText }]}
            >
              {resetNotice}
            </Text>
          ) : null}
          {resetError ? <ErrorBanner message={resetError} /> : null}
        </View>
        <ConfirmDialog
          visible={resetDialog !== null}
          title="Đặt lại dữ liệu trên thiết bị?"
          message="Sẽ xóa sổ từ, tiến độ, lịch sử ôn, nhiệm vụ, phần thưởng và tài nguyên offline trên thiết bị này. Không thể hoàn tác."
          confirmLabel="Xóa dữ liệu thiết bị"
          onCancel={() => {
            if (!resetBusy) {
              setResetDialog(null);
              setResetError(null);
            }
          }}
          onConfirm={() => {
            void handleResetAppData();
          }}
          busy={resetBusy}
          error={resetError}
        />
        <Text style={[styles.section, { color: c.mutedForeground }]}>
          DỮ LIỆU HỌC TẬP
        </Text>
        <Text style={[styles.appearanceHint, { color: c.mutedForeground }]}>
          Từ điển, IPA và audio được tải riêng vào bộ nhớ ứng dụng, không nằm
          trong APK. Audio chiếm khoảng 307 MB; nên tải bằng Wi-Fi.
        </Text>
        <StartupPerformanceCard />
        <View
          testID="review-word-limit-settings"
          style={[
            styles.reviewLimitCard,
            {
              backgroundColor: c.card,
              borderColor: c.border,
              borderRadius: c.radius,
            },
          ]}
        >
          <MaterialSheen radius={c.radius} />
          <View style={styles.reviewLimitHeading}>
            <Text style={[styles.appearanceTitle, { color: c.foreground }]}>
              Số từ tối đa mỗi phiên ôn
            </Text>
            <Text
              style={[styles.appearanceDetail, { color: c.mutedForeground }]}
            >
              Áp dụng cho Cơ Bản, Speed Mode và Timebound.
            </Text>
          </View>
          <View style={styles.reviewLimitOptions}>
            {REVIEW_WORD_LIMIT_OPTIONS.map((limit) => {
              const selected = reviewPreferences.wordLimit === limit;
              return (
                <Pressable
                  key={limit}
                  testID={`review-word-limit-${limit}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${limit} từ mỗi phiên ôn`}
                  accessibilityState={{
                    selected,
                    disabled: !reviewPreferences.ready || reviewPreferences.saving,
                  }}
                  onPress={() => {
                    void reviewPreferences.setWordLimit(limit);
                  }}
                  disabled={!reviewPreferences.ready || reviewPreferences.saving}
                  style={({ pressed }) => [
                    styles.reviewLimitOption,
                    {
                      backgroundColor: selected ? c.primary : c.secondary,
                      borderColor: selected ? c.primary : c.border,
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.reviewLimitOptionText,
                      {
                        color: selected
                          ? c.primaryForeground
                          : c.foreground,
                      },
                    ]}
                  >
                    {limit}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.reviewLimitHeading}>
            <Text style={[styles.appearanceTitle, { color: c.foreground }]}>
              Thời lượng Timebound
            </Text>
            <Text style={[styles.appearanceDetail, { color: c.mutedForeground }]}>
              Chọn thời gian mỗi phiên · mặc định 10 phút.
            </Text>
          </View>
          <View
            testID="review-timebound-duration-settings"
            style={styles.reviewLimitOptions}
          >
            {TIMEBOUND_REVIEW_DURATION_OPTIONS.map((minutes) => {
              const selected =
                reviewPreferences.timeboundMinutes === minutes;
              return (
                <Pressable
                  key={minutes}
                  testID={`review-timebound-duration-${minutes}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${minutes} phút mỗi phiên Timebound`}
                  accessibilityState={{
                    selected,
                    disabled:
                      !reviewPreferences.ready || reviewPreferences.saving,
                  }}
                  onPress={() => {
                    void reviewPreferences.setTimeboundMinutes(minutes);
                  }}
                  disabled={
                    !reviewPreferences.ready || reviewPreferences.saving
                  }
                  style={({ pressed }) => [
                    styles.reviewLimitOption,
                    {
                      backgroundColor: selected ? c.primary : c.secondary,
                      borderColor: selected ? c.primary : c.border,
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.reviewLimitOptionText,
                      {
                        color: selected
                          ? c.primaryForeground
                          : c.foreground,
                      },
                    ]}
                  >
                    {minutes} phút
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.appearanceDetail, { color: c.mutedForeground }]}>
            {reviewPreferences.ready
              ? reviewPreferences.saving
                ? "Đang lưu lựa chọn…"
                : `Đang chọn ${reviewPreferences.wordLimit} từ · ${reviewPreferences.timeboundMinutes} phút · lưu trên thiết bị.`
              : "Đang tải cài đặt ôn tập…"}
          </Text>
          {reviewPreferences.error ? (
            <ErrorBanner
              message={reviewPreferences.error}
              onRetry={() => {
                void reviewPreferences.retryLoad();
              }}
            />
          ) : null}
        </View>
        <View
          style={[
            styles.offlineCard,
            {
              backgroundColor: c.card,
              borderColor: c.border,
              borderRadius: c.radius,
            },
          ]}
        >
          <MaterialSheen radius={c.radius} />
          <View style={styles.offlineResource}>
            <View
              style={[styles.offlineIcon, { backgroundColor: c.secondary }]}
            >
              <Feather name="book-open" size={19} color={c.primary} />
            </View>
            <View style={styles.offlineResourceText}>
              <Text style={[styles.appearanceTitle, { color: c.foreground }]}>
                Từ điển offline
              </Text>
              <Text
                testID="offline-dictionary-status"
                style={[styles.appearanceDetail, { color: c.mutedForeground }]}
              >
                {dictionaryStatus === "installed"
                  ? `Đã cài · ${sizeLabel(DICTIONARY.bytes)}`
                  : dictionaryDownload.state === "completed"
                    ? `Đã cài · ${sizeLabel(DICTIONARY.bytes)}`
                    : dictionaryDownloadActive
                      ? dictionaryProgressText
                  : dictionaryStatus === "damaged"
                    ? "Tệp bị thiếu hoặc lỗi · cần tải lại"
                    : dictionaryStatus === "unavailable"
                      ? "Không kiểm tra được · dữ liệu chưa bị xóa"
                    : dictionaryStatus === "checking"
                      ? "Đang kiểm tra…"
                      : `Chưa cài · ${sizeLabel(DICTIONARY.bytes)}`}
              </Text>
            </View>
          </View>
          <View style={styles.offlineActions}>
            <Button
              testID="offline-dictionary-download"
              label={
                dictionaryDownloadActive
                  ? "Đang tải…"
                  : dictionaryStatus === "damaged"
                  ? "Tải lại"
                  : dictionaryStatus === "unavailable"
                    ? "Thử lại"
                    : "Tải từ điển"
              }
              icon={
                dictionaryStatus === "unavailable" ? "refresh-cw" : "download"
              }
              onPress={() => {
                void handleDownloadDictionary();
              }}
              loading={dictionaryDownloadActive}
              disabled={
                offlineBusy ||
                syncBusy ||
                dictionaryStatus === "installed" ||
                dictionaryDownload.state === "completed" ||
                dictionaryStatus === "checking"
              }
              style={{ flex: 1 }}
            />
            <Button
              testID="offline-dictionary-delete"
              label="Xóa"
              icon="trash-2"
              variant="ghost"
              onPress={() => {
                void handleDeleteOfflineResource("dictionary");
              }}
              loading={offlineAction === "dictionary-delete"}
              disabled={
                offlineBusy ||
                syncBusy ||
                dictionaryStatus === "missing" ||
                dictionaryStatus === "unavailable" ||
                dictionaryStatus === "checking"
              }
              style={{ flex: 1 }}
            />
          </View>
          {dictionaryDownloadActive ? (
            <View style={styles.courseDownloadProgress}>
              <View
                accessibilityRole="progressbar"
                accessibilityLabel="Tiến độ tải từ điển"
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: dictionaryProgressPercent,
                }}
                style={[
                  styles.courseDownloadTrack,
                  { backgroundColor: c.secondary },
                ]}
              >
                <View
                  style={[
                    styles.courseDownloadFill,
                    {
                      backgroundColor: c.primary,
                      width: `${dictionaryProgressPercent}%`,
                    },
                  ]}
                />
              </View>
              <Text
                testID="offline-dictionary-progress"
                accessibilityLiveRegion="polite"
                style={[styles.appearanceDetail, { color: c.primary }]}
              >
                {dictionaryProgressText}
              </Text>
            </View>
          ) : null}
          {dictionaryDownload.state === "failed" &&
          dictionaryDownload.error ? (
            <ErrorBanner message={dictionaryDownload.error} />
          ) : null}
          {Platform.OS === "web" ? (
            <>
          <View style={[styles.offlineDivider, { borderColor: c.border }]} />
          <View style={styles.offlineResource}>
            <View
              style={[styles.offlineIcon, { backgroundColor: c.secondary }]}
            >
              <Feather name="layers" size={19} color={c.primary} />
            </View>
            <View style={styles.offlineResourceText}>
              <Text style={[styles.appearanceTitle, { color: c.foreground }]}>
                Khóa học offline
              </Text>
              <Text
                testID="offline-course-data-status"
                style={[styles.appearanceDetail, { color: c.mutedForeground }]}
              >
                {courseDataStatus === "installed"
                  ? `Đã tải · ${sizeLabel(courseDataBytes)} · ${OFFLINE_COURSE_DATA.courseCount} khóa học`
                  : courseDataStatus === "damaged"
                    ? "Gói bị lỗi hoặc thiếu · cần tải lại"
                    : courseDataStatus === "updateAvailable"
                      ? "Có phiên bản mới · cập nhật gói khóa học"
                    : courseDataStatus === "unavailable"
                      ? "Không thể lưu khóa học offline trên nền tảng này"
                      : courseDataStatus === "checking"
                        ? "Đang kiểm tra…"
                        : courseDataBytes > 0
                          ? `Đã tải một phần · ${sizeLabel(courseDataBytes)} / ${sizeLabel(OFFLINE_COURSE_DATA.bytes)}`
                          : `Chưa tải · ${sizeLabel(OFFLINE_COURSE_DATA.bytes)} · ${OFFLINE_COURSE_DATA.courseCount} khóa học`}
              </Text>
            </View>
          </View>
          <Text style={[styles.appearanceDetail, { color: c.mutedForeground }]}>
            Tải một lần để học ngoại tuyến. Xóa gói này không xóa tiến độ bài
            học, từ đã lưu hay lịch ôn.
          </Text>
          <View style={styles.offlineActions}>
            <Button
              testID="offline-course-data-download"
              label={
                offlineAction === "course-data-download"
                  ? "Dừng tải"
                  : courseDataStatus === "installed"
                  ? "Đã cài"
                   : courseDataStatus === "damaged"
                     ? "Tải lại"
                     : courseDataStatus === "updateAvailable"
                       ? "Cập nhật"
                    : courseDataBytes > 0
                      ? "Tiếp tục tải"
                      : "Tải gói"
              }
              icon={
                offlineAction === "course-data-download"
                  ? "x-circle"
                  : courseDataStatus === "damaged" ||
                courseDataStatus === "updateAvailable"
                  ? "refresh-cw"
                  : "download"
              }
              onPress={() => {
                if (offlineAction === "course-data-download") {
                  courseDownloadController.current?.abort();
                } else {
                  void handleDownloadCourseData();
                }
              }}
              loading={false}
              disabled={
                (offlineBusy &&
                  offlineAction !== "course-data-download") ||
                (syncBusy && offlineAction !== "course-data-download") ||
                (offlineAction !== "course-data-download" &&
                  (courseDataStatus === "installed" ||
                    courseDataStatus === "checking" ||
                    courseDataStatus === "unavailable"))
              }
              style={{ flex: 1 }}
            />
            <Button
              testID="offline-course-data-delete"
              label="Xóa gói"
              icon="trash-2"
              variant="ghost"
              onPress={() => {
                void handleDeleteOfflineResource("course-data");
              }}
              loading={offlineAction === "course-data-delete"}
              disabled={
                offlineBusy ||
                syncBusy ||
                (courseDataStatus === "missing" && courseDataBytes === 0) ||
                courseDataStatus === "checking" ||
                courseDataStatus === "unavailable"
              }
              style={{ flex: 1 }}
            />
          </View>
          {offlineAction === "course-data-download" ? (
            <View style={styles.courseDownloadProgress}>
              <View
                accessibilityRole="progressbar"
                accessibilityLabel="Tiến độ tải gói khóa học"
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: Math.min(
                    100,
                    Math.round(
                      (offlineProgress.bytesWritten /
                        Math.max(1, offlineProgress.totalBytes)) *
                        100,
                    ),
                  ),
                }}
                style={[
                  styles.courseDownloadTrack,
                  { backgroundColor: c.secondary },
                ]}
              >
                <View
                  style={[
                    styles.courseDownloadFill,
                    {
                      backgroundColor: c.primary,
                      width: `${Math.min(
                        100,
                        Math.round(
                          (offlineProgress.bytesWritten /
                            Math.max(1, offlineProgress.totalBytes)) *
                            100,
                        ),
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text
                testID="offline-progress"
                accessibilityLiveRegion="polite"
                style={[styles.appearanceDetail, { color: c.primary }]}
              >
                {offlineProgressText}
              </Text>
            </View>
          ) : null}
          <View style={[styles.offlineDivider, { borderColor: c.border }]} />
            </>
          ) : null}
          <View style={styles.offlineResource}>
            <View
              style={[styles.offlineIcon, { backgroundColor: c.secondary }]}
            >
              <Feather name="globe" size={19} color={c.primary} />
            </View>
            <View style={styles.offlineResourceText}>
              <Text style={[styles.appearanceTitle, { color: c.foreground }]}>
                IPA ngoại tuyến
              </Text>
              <Text
                testID="offline-regional-ipa-status"
                style={[styles.appearanceDetail, { color: c.mutedForeground }]}
              >
                {regionalIpaStatus === "installed"
                  ? `Đã cài đầy đủ · ${regionalIpaEntryCount.toLocaleString("vi-VN")} mục`
                  : regionalIpaStatus === "damaged"
                    ? "Kho IPA lỗi · các phần đã xác minh vẫn được giữ"
                    : regionalIpaStatus === "checking"
                      ? "Đang kiểm tra…"
                      : `Tải riêng từng phần · tổng ${sizeLabel(REGIONAL_IPA_DICTIONARY.sourceBytes)}`}
              </Text>
            </View>
          </View>
          <Text style={[styles.appearanceDetail, { color: c.mutedForeground }]}>
            Cần cài từ điển trước. Anh-Anh bao gồm dữ liệu chính và phần bổ sung;
            kho IPA dùng được sau khi toàn bộ dữ liệu được xác minh và ghép.
          </Text>
          {([
            {
              id: "us",
              label: REGIONAL_IPA_DICTIONARY.us.label,
              sourceIds: ["us"],
            },
            {
              id: "uk",
              label: "Anh-Anh",
              sourceIds: ["uk", "ukSupplement"],
            },
          ] as const).map(({ id, label, sourceIds }) => {
            const rowStates = sourceIds.map((sourceId) => regionalIpaParts[sourceId]);
            const verifiedCount = rowStates.filter(
              (state) => state === "verified" || state === "installed",
            ).length;
            const rowChecking = rowStates.some((state) => state === "checking");
            const rowHasMissing = rowStates.some((state) => state === "missing");
            const action = `regional-ipa-${id}-download`;
            const canRetryAssembly =
              regionalIpaStatus !== "installed" &&
              regionalIpaParts.us !== "missing" &&
              regionalIpaParts.uk !== "missing" &&
              regionalIpaParts.ukSupplement !== "missing";
            const rowTotalBytes = sourceIds.reduce(
              (total, sourceId) =>
                total + REGIONAL_IPA_DICTIONARY[sourceId].bytes,
              0,
            );
            const partStatus =
              regionalIpaStatus === "installed"
                ? "Đã cài"
                : rowChecking
                  ? "Đang kiểm tra…"
                  : verifiedCount > 0
                    ? id === "uk"
                      ? verifiedCount === sourceIds.length
                        ? canRetryAssembly
                          ? "Đã xác minh đủ 2 phần · chờ ghép"
                          : "Đã xác minh đủ 2 phần · chờ Anh-Mỹ để ghép"
                        : `Đã xác minh ${verifiedCount}/2 phần · còn 1 phần`
                      : canRetryAssembly
                        ? "Đã xác minh · chờ ghép"
                        : "Đã tải và xác minh · chờ đủ phần"
                    : `Chưa tải · ${sizeLabel(rowTotalBytes)}`;
            const canDownloadRow = rowHasMissing || canRetryAssembly;
            return (
              <View
                key={id}
                style={[
                  styles.ipaPartRow,
                  { borderTopColor: c.border },
                ]}
              >
                <View style={styles.offlineResourceText}>
                  <Text style={[styles.appearanceTitle, { color: c.foreground }]}>
                    {label}
                  </Text>
                  <Text
                    testID={`offline-regional-ipa-${id}-status`}
                    style={[styles.appearanceDetail, { color: c.mutedForeground }]}
                  >
                    {partStatus}
                  </Text>
                </View>
                <Button
                  testID={
                    id === "us"
                      ? "offline-regional-ipa-download"
                      : `offline-regional-ipa-download-${id}`
                  }
                  label={
                    regionalIpaStatus === "installed"
                      ? "Đã cài"
                      : canRetryAssembly && !rowHasMissing
                        ? "Thử ghép"
                        : rowHasMissing
                          ? verifiedCount > 0
                            ? "Tải phần còn lại"
                            : id === "uk"
                              ? "Tải Anh-Anh"
                              : "Tải phần"
                          : "Đã xác minh"
                  }
                  icon={
                    rowHasMissing
                      ? "download"
                      : canRetryAssembly
                        ? "refresh-cw"
                        : "check"
                  }
                  onPress={() => {
                    void handleDownloadRegionalIpaParts(id, sourceIds);
                  }}
                  loading={offlineAction === action}
                  disabled={
                    offlineBusy ||
                    syncBusy ||
                    dictionaryStatus !== "installed" ||
                    !canDownloadRow ||
                    regionalIpaStatus === "installed" ||
                    rowChecking
                  }
                />
              </View>
            );
          })}
          <Button
            testID="offline-regional-ipa-delete"
            label="Xóa dữ liệu IPA"
            icon="trash-2"
            variant="ghost"
            onPress={() => {
              void handleDeleteOfflineResource("regional-ipa");
            }}
            loading={offlineAction === "regional-ipa-delete"}
            disabled={
              offlineBusy ||
              syncBusy ||
              (regionalIpaStatus === "missing" &&
                regionalIpaParts.us === "missing" &&
                regionalIpaParts.uk === "missing" &&
                regionalIpaParts.ukSupplement === "missing") ||
              regionalIpaStatus === "checking"
            }
          />
          <View style={[styles.offlineDivider, { borderColor: c.border }]} />
          <View style={styles.offlineResource}>
            <View
              style={[styles.offlineIcon, { backgroundColor: c.secondary }]}
            >
              <Feather name="volume-2" size={19} color={c.primary} />
            </View>
            <View style={styles.offlineResourceText}>
              <Text style={[styles.appearanceTitle, { color: c.foreground }]}>
                Audio phát âm
              </Text>
              <Text
                testID="offline-audio-status"
                style={[styles.appearanceDetail, { color: c.mutedForeground }]}
              >
                {audioStatus === "installed"
                  ? `Đã cài · ${sizeLabel(OFFLINE_AUDIO_DICTIONARY.bytes)} · ${OFFLINE_AUDIO_DICTIONARY.entryCount.toLocaleString("vi-VN")} từ`
                  : audioStatus === "damaged"
                    ? "Tệp bị thiếu hoặc lỗi · cần tải lại"
                    : audioStatus === "unavailable"
                      ? "Tải offline chỉ hỗ trợ trên ứng dụng Android"
                      : audioStatus === "checking"
                        ? "Đang kiểm tra…"
                        : audioBytes > 0
                          ? `Đã tải ${sizeLabel(audioBytes)} / ${sizeLabel(OFFLINE_AUDIO_DICTIONARY.bytes)} · có thể tiếp tục`
                          : `Chưa cài · ${sizeLabel(OFFLINE_AUDIO_DICTIONARY.bytes)} · ${OFFLINE_AUDIO_DICTIONARY.entryCount.toLocaleString("vi-VN")} từ`}
              </Text>
            </View>
          </View>
          <View style={styles.offlineActions}>
            <Button
              testID="offline-audio-download"
              label={
                offlineAction === "audio-download"
                  ? audioDownloadStage === "downloading"
                    ? "Dừng tải"
                    : audioDownloadStage === "verifying"
                      ? "Đang xác minh"
                      : "Đang lưu"
                  : audioStatus === "damaged"
                    ? "Tải lại"
                    : audioBytes > 0
                      ? "Tiếp tục tải"
                      : "Tải audio"
              }
              icon={
                offlineAction === "audio-download" &&
                audioDownloadStage === "downloading"
                  ? "x-circle"
                  : "download"
              }
              onPress={() => {
                if (offlineAction === "audio-download") {
                  audioDownloadController.current?.abort();
                } else {
                  void handleDownloadAudio();
                }
              }}
              loading={false}
              disabled={
                (offlineBusy &&
                  (offlineAction !== "audio-download" ||
                    audioDownloadStage !== "downloading")) ||
                (syncBusy && offlineAction !== "audio-download") ||
                (offlineAction !== "audio-download" &&
                  (audioStatus === "installed" ||
                    audioStatus === "checking" ||
                    audioStatus === "unavailable"))
              }
              style={{ flex: 1 }}
            />
            <Button
              testID="offline-audio-delete"
              label="Xóa"
              icon="trash-2"
              variant="ghost"
              onPress={() => {
                void handleDeleteOfflineResource("audio");
              }}
              loading={offlineAction === "audio-delete"}
              disabled={
                offlineBusy ||
                syncBusy ||
                audioStatus === "missing" ||
                audioStatus === "checking" ||
                audioStatus === "unavailable"
              }
              style={{ flex: 1 }}
            />
          </View>
          {offlineProgressText &&
          offlineAction !== "course-data-download" ? (
            <Text
              testID="offline-progress"
              accessibilityLiveRegion="polite"
              style={[styles.appearanceDetail, { color: c.primary }]}
            >
              {offlineProgressText}
            </Text>
          ) : null}
          {offlineError ? <ErrorBanner message={offlineError} /> : null}
        </View>
        <View
          style={[
            styles.stat,
            {
              backgroundColor: c.vocabCard,
              borderRadius: c.radius + 6,
              position: "relative",
              shadowColor: c.shade,
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: 0.2,
              shadowRadius: 9,
              elevation: 4,
            },
          ]}
        >
          <MaterialSheen tone="navy" radius={c.radius + 6} />
          <Text style={[styles.statLabel, { color: c.accentSoft }]}>
            SỐ TỪ ĐÃ LƯU
          </Text>
          <Text style={[styles.statNum, { color: c.primaryForeground }]}>
            {loading && words.length === 0 ? "—" : words.length}
          </Text>
          <Text style={[styles.statSub, { color: c.primaryForeground }]}>
            từ trong sổ của bạn
          </Text>
        </View>
        <Button
          testID="open-frozen-words"
          label={`Từ đã đóng băng (${frozenWords.length})`}
          icon="pause-circle"
          variant="ghost"
          onPress={() => router.push("/frozen")}
        />
        <Text style={[styles.section, { color: c.mutedForeground }]}>
          DỮ LIỆU CỦA BẠN
        </Text>
        <View
          style={[
            styles.group,
            {
              backgroundColor: c.card,
              borderColor: c.border,
              borderRadius: c.radius,
            },
          ]}
        >
          <MaterialSheen radius={c.radius} />
          {facts.map((f, i) => (
            <View
              key={f.title}
              style={[
                styles.fact,
                i > 0 && { borderTopWidth: 1, borderTopColor: c.border },
              ]}
            >
              <View style={[styles.factIcon, { backgroundColor: c.secondary }]}>
                <Feather name={f.icon} size={18} color={c.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.factTitle, { color: c.foreground }]}>
                  {f.title}
                </Text>
                <Text style={[styles.factBody, { color: c.mutedForeground }]}>
                  {f.body}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stat: { padding: 22, gap: 2 },
  statLabel: { fontFamily: F.b, fontSize: 11, letterSpacing: 2 },
  statNum: { fontFamily: F.b, fontSize: 56, letterSpacing: -2 },
  statSub: { fontFamily: F.m, fontSize: 14, opacity: 0.85 },
  section: { fontFamily: F.b, fontSize: 12, letterSpacing: 1.6, marginTop: 6 },
  appearanceHint: { fontFamily: F.r, fontSize: 14, lineHeight: 20 },
  appearanceGroup: { borderWidth: 1, padding: 10, gap: 10 },
  reviewLimitCard: { borderWidth: 1, padding: 14, gap: 12, overflow: "hidden" },
  reviewLimitHeading: { gap: 4 },
  reviewLimitOptions: { flexDirection: "row", gap: 8 },
  reviewLimitOption: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewLimitOptionText: { fontFamily: F.b, fontSize: 13 },
  qualityPlaceholder: {
    minHeight: 68,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  appearanceOption: {
    minHeight: 66,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  appearanceTitle: { fontFamily: F.b, fontSize: 16 },
  appearanceDetail: { fontFamily: F.r, fontSize: 12, lineHeight: 17 },
  speechGroup: { borderWidth: 1, overflow: "hidden" },
  offlineCard: { borderWidth: 1, padding: 14, gap: 12, overflow: "hidden" },
  offlineResource: { flexDirection: "row", alignItems: "center", gap: 12 },
  offlineIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  offlineResourceText: { flex: 1, gap: 3 },
  offlineActions: { flexDirection: "row", gap: 10 },
  courseDownloadProgress: { gap: 7 },
  courseDownloadTrack: { height: 6, borderRadius: 6, overflow: "hidden" },
  courseDownloadFill: { height: "100%", borderRadius: 6 },
  ipaPartRow: {
    minHeight: 72,
    paddingTop: 10,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  offlineDivider: { borderTopWidth: 1 },
  resetCard: { borderWidth: 1, padding: 14, gap: 12, overflow: "hidden" },
  speechRow: {
    minHeight: 76,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  volumeRow: {
    minHeight: 76,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  volumeControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  volumeButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  speechText: { flex: 1, gap: 3 },
  backupCard: { borderWidth: 1, padding: 14, gap: 10 },
  transferNotice: { fontFamily: F.m, fontSize: 13, lineHeight: 19 },
  accountCard: { borderWidth: 1, overflow: "hidden" },
  accountHeader: {
    minHeight: 76,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  syncRow: {
    minHeight: 76,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  smallAction: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  smallActionText: { fontFamily: F.s, fontSize: 12 },
  accountError: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontFamily: F.r,
    fontSize: 13,
    lineHeight: 18,
  },
  signOutButton: {
    minHeight: 48,
    marginHorizontal: 15,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  signOutText: { fontFamily: F.s, fontSize: 14 },
  group: { borderWidth: 1 },
  fact: { flexDirection: "row", gap: 14, padding: 16 },
  factIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  factTitle: { fontFamily: F.s, fontSize: 15 },
  factBody: { fontFamily: F.r, fontSize: 14, lineHeight: 20 },
});
