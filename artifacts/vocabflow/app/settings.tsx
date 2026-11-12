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
import { useClerk, useUser } from "@clerk/expo";
import { useVocabulary } from "@/contexts/VocabularyContext";
import { useSyncStatus } from "@/contexts/SyncContext";
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
import { useSoundEffects } from "@/contexts/SoundEffectsContext";
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
} from "@/data/vocabulary-sync";
import {
  deleteOfflineDictionary,
  getOfflineDictionaryStatus,
  installOfflineRegionalPronunciations,
  openDictionary,
} from "@/data/dictionary";
import {
  deleteOfflineRegionalIpa,
  getOfflineRegionalIpaStatus,
} from "@/data/offline-regional-pronunciations";
import {
  deleteOfflineAudio,
  downloadOfflineAudio,
  getOfflineAudioStatus,
} from "@/data/offline-audio";
import { DICTIONARY } from "@/domain/dictionary";
import { OFFLINE_AUDIO_DICTIONARY } from "@/domain/offline-audio";
import { REGIONAL_IPA_DICTIONARY } from "@/domain/regional-pronunciations";

export default function SettingsScreen() {
  const c = useColors();
  const { words, frozenWords, loading, error, reload } = useVocabulary();
  const appearance = useAppearance();
  const speech = useSpeechPreferences();
  const sound = useSoundEffects();
  const sync = useSyncStatus();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [accountError, setAccountError] = React.useState<string | null>(null);
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
    "checking" | "missing" | "installed" | "damaged"
  >("checking");
  const [audioStatus, setAudioStatus] = React.useState<
    "checking" | "missing" | "installed" | "damaged" | "unavailable"
  >("checking");
  const [regionalIpaStatus, setRegionalIpaStatus] = React.useState<
    "checking" | "missing" | "installed" | "damaged"
  >("checking");
  const [regionalIpaEntryCount, setRegionalIpaEntryCount] = React.useState(0);
  const [offlineAction, setOfflineAction] = React.useState<
    | "dictionary-download"
    | "dictionary-delete"
    | "audio-download"
    | "audio-delete"
    | "regional-ipa-download"
    | "regional-ipa-delete"
    | null
  >(null);
  const [offlineStage, setOfflineStage] = React.useState<string | null>(null);
  const [offlineProgress, setOfflineProgress] = React.useState({
    bytesWritten: 0,
    totalBytes: 0,
  });
  const [offlineError, setOfflineError] = React.useState<string | null>(null);
  const [resetDialog, setResetDialog] = React.useState(false);
  const [resetBusy, setResetBusy] = React.useState(false);
  const [resetError, setResetError] = React.useState<string | null>(null);
  const [resetNotice, setResetNotice] = React.useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const bottom = (Platform.OS === "web" ? 34 : insets.bottom) + 24;
  const syncBusy = sync.state === "checking" || sync.state === "syncing";
  const restoreSummary = restoreCandidate
    ? summarizeAccountBackup(restoreCandidate)
    : null;
  const refreshOfflineStatus = React.useCallback(async () => {
    try {
      const [dictionary, audio, regionalIpa] = await Promise.all([
        getOfflineDictionaryStatus(),
        getOfflineAudioStatus(),
        getOfflineRegionalIpaStatus(),
      ]);
      setDictionaryStatus(dictionary.state);
      setAudioStatus(audio.state);
      setRegionalIpaStatus(regionalIpa.state);
      setRegionalIpaEntryCount(regionalIpa.entryCount);
    } catch {
      setDictionaryStatus("damaged");
      setAudioStatus("damaged");
      setRegionalIpaStatus("damaged");
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
    ? `${offlineStage ?? "Đang xử lý"}${offlineAction.endsWith("download") ? ` · ${progressLabel}` : "…"}`
    : null;

  const handleDownloadDictionary = async () => {
    if (offlineAction || syncBusy) return;
    setOfflineError(null);
    setOfflineAction("dictionary-download");
    setOfflineStage("Đang chuẩn bị từ điển");
    setOfflineProgress({ bytesWritten: 0, totalBytes: DICTIONARY.bytes });
    try {
      await openDictionary(
        (stage) => {
          setOfflineStage(
            {
              checking: "Đang kiểm tra",
              "awaiting-consent": "Chờ xác nhận",
              downloading: "Đang tải từ điển",
              verifying: "Đang xác minh tệp",
              importing: "Đang cài từ điển",
              ready: "Đã cài xong",
            }[stage],
          );
        },
        {
          allowDownload: true,
          onProgress: (bytesWritten, totalBytes) =>
            setOfflineProgress({ bytesWritten, totalBytes }),
        },
      );
      setOfflineStage("Đã cài xong");
    } catch (cause) {
      setOfflineError(
        cause instanceof Error
          ? cause.message
          : "Không thể cài từ điển offline.",
      );
    } finally {
      setOfflineAction(null);
      await refreshOfflineStatus();
    }
  };

  const handleDownloadAudio = async () => {
    if (offlineAction || syncBusy) return;
    setOfflineError(null);
    setOfflineAction("audio-download");
    setOfflineStage("Đang tải gói audio");
    setOfflineProgress({
      bytesWritten: 0,
      totalBytes: OFFLINE_AUDIO_DICTIONARY.bytes,
    });
    try {
      await downloadOfflineAudio((bytesWritten, totalBytes) =>
        setOfflineProgress({ bytesWritten, totalBytes }),
      );
      setOfflineStage("Đã cài xong");
    } catch (cause) {
      setOfflineError(
        cause instanceof Error ? cause.message : "Không thể cài audio offline.",
      );
    } finally {
      setOfflineAction(null);
      await refreshOfflineStatus();
    }
  };

  const handleDownloadRegionalIpa = async () => {
    if (offlineAction || syncBusy) return;
    setOfflineError(null);
    setOfflineAction("regional-ipa-download");
    setOfflineStage("Đang chuẩn bị IPA");
    setOfflineProgress({
      bytesWritten: 0,
      totalBytes: REGIONAL_IPA_DICTIONARY.sourceBytes,
    });
    try {
      const result = await installOfflineRegionalPronunciations(
        (stage, bytesWritten, totalBytes) => {
          setOfflineStage(stage);
          setOfflineProgress({ bytesWritten, totalBytes });
        },
      );
      setOfflineStage(
        `Đã cài ${result.entryCount.toLocaleString("vi-VN")} mục IPA`,
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
    resource: "dictionary" | "audio" | "regional-ipa",
  ) => {
    if (offlineAction || syncBusy) return;
    setOfflineError(null);
    setOfflineAction(
      resource === "dictionary"
        ? "dictionary-delete"
        : resource === "audio"
          ? "audio-delete"
          : "regional-ipa-delete",
    );
    setOfflineStage(
      resource === "dictionary"
        ? "Đang xóa từ điển"
        : resource === "audio"
          ? "Đang xóa audio"
          : "Đang xóa dữ liệu IPA",
    );
    try {
      if (resource === "dictionary") await deleteOfflineDictionary();
      else if (resource === "audio") await deleteOfflineAudio();
      else await deleteOfflineRegionalIpa();
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
    if (resetBusy || offlineAction || transferState || syncBusy) return;
    if (!sync.online) {
      setResetError(
        "Cần kết nối Internet để xóa dữ liệu cloud. Dữ liệu chưa bị thay đổi.",
      );
      return;
    }
    setResetError(null);
    setResetNotice(null);
    setResetBusy(true);
    try {
      await sync.resetAccountData(async () => {
        await deleteOfflineAudio();
        await deleteOfflineRegionalIpa();
        await deleteOfflineDictionary();
      });
      await reload();
      await refreshOfflineStatus();
      setResetDialog(false);
      setResetNotice(
        "Đã đặt lại dữ liệu tài khoản trên cloud và thiết bị này.",
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
      body: "Tra từ, học và ôn tập dùng SQLite cục bộ. Khi có mạng, sổ từ và tiến độ sẽ đồng bộ với tài khoản.",
    },
    {
      icon: "alert-triangle",
      title: "Dữ liệu tài khoản",
      body: "Đăng xuất không xóa dữ liệu. Bản chưa đồng bộ chỉ nằm trên thiết bị; hãy kết nối mạng trước khi gỡ ứng dụng.",
    },
  ];

  const syncStatus = {
    checking: "Đang kiểm tra kết nối…",
    offline: "Ngoại tuyến · dữ liệu vẫn lưu trên thiết bị",
    syncing: "Đang đồng bộ dữ liệu…",
    synced: "Đã đồng bộ với tài khoản",
    pending: "Có thay đổi đang chờ đồng bộ",
    error: sync.message ?? "Đồng bộ chưa thành công.",
  }[sync.state];

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
    if (syncBusy) {
      setRestoreError(
        "Đang đồng bộ dữ liệu. Hãy đợi xong rồi xác nhận khôi phục.",
      );
      return;
    }
    setRestoreError(null);
    setTransferState("restoring");
    try {
      await replaceAccountSyncSnapshot(restoreCandidate.payload);
      await reload();
      setRestoreCandidate(null);
      setTransferNotice(
        "Đã khôi phục trên thiết bị. Tài khoản sẽ được thay thế khi đồng bộ thành công.",
      );
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

  const handleSignOut = async () => {
    setAccountError(null);
    try {
      await signOut();
    } catch {
      setAccountError("Không thể đăng xuất lúc này. Hãy thử lại.");
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
          GIAO DIỆN
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
          PHÁT ÂM
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
        <Text style={[styles.section, { color: c.mutedForeground }]}>
          TÀI KHOẢN & ĐỒNG BỘ
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
          {user ? (
            <>
              <View style={styles.accountHeader}>
                <View
                  style={[styles.accountIcon, { backgroundColor: c.secondary }]}
                >
                  <Feather name="user" size={19} color={c.primary} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text
                    style={[styles.appearanceTitle, { color: c.foreground }]}
                  >
                    Đang đăng nhập
                  </Text>
                  <Text
                    style={[
                      styles.appearanceDetail,
                      { color: c.mutedForeground },
                    ]}
                  >
                    {user?.primaryEmailAddress?.emailAddress ??
                      "Tài khoản VocabFlow"}
                  </Text>
                </View>
              </View>
              <View style={[styles.syncRow, { borderTopColor: c.border }]}>
                {sync.state === "syncing" || sync.state === "checking" ? (
                  <ActivityIndicator size="small" color={c.primary} />
                ) : (
                  <Feather
                    name={
                      sync.state === "synced"
                        ? "check-circle"
                        : sync.state === "error"
                          ? "alert-circle"
                          : "cloud"
                    }
                    size={18}
                    color={sync.state === "error" ? "#C0392B" : c.primary}
                  />
                )}
                <View style={{ flex: 1, gap: 3 }}>
                  <Text
                    accessibilityLiveRegion="polite"
                    style={[styles.appearanceTitle, { color: c.foreground }]}
                  >
                    {syncStatus}
                  </Text>
                  {sync.lastSyncedAt ? (
                    <Text
                      style={[
                        styles.appearanceDetail,
                        { color: c.mutedForeground },
                      ]}
                    >
                      Lần gần nhất:{" "}
                      {new Date(sync.lastSyncedAt).toLocaleString("vi-VN")}
                    </Text>
                  ) : null}
                </View>
                {sync.state === "error" ||
                sync.state === "pending" ||
                sync.state === "offline" ? (
                  <Pressable
                    testID="sync-retry"
                    accessibilityRole="button"
                    accessibilityLabel="Thử đồng bộ lại"
                    onPress={() => {
                      void sync.retry();
                    }}
                    style={[
                      styles.smallAction,
                      { backgroundColor: c.secondary },
                    ]}
                  >
                    <Feather name="refresh-cw" size={16} color={c.primary} />
                    <Text
                      style={[styles.smallActionText, { color: c.primary }]}
                    >
                      Thử lại
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              {sync.state === "error" || accountError ? (
                <Text
                  accessibilityRole="alert"
                  style={[styles.accountError, { color: "#C0392B" }]}
                >
                  {accountError ?? sync.message}
                </Text>
              ) : null}
              <Pressable
                testID="account-sign-out"
                accessibilityRole="button"
                onPress={() => {
                  void handleSignOut();
                }}
                style={[styles.signOutButton, { borderColor: c.border }]}
              >
                <Feather name="log-out" size={17} color={c.primary} />
                <Text style={[styles.signOutText, { color: c.primary }]}>
                  Đăng xuất
                </Text>
              </Pressable>
              <Text
                style={[styles.appearanceDetail, { color: c.mutedForeground }]}
              >
                Đăng xuất không xóa sổ từ hoặc dữ liệu trên máy.
              </Text>
            </>
          ) : (
            <>
              <View style={styles.accountHeader}>
                <View
                  style={[styles.accountIcon, { backgroundColor: c.secondary }]}
                >
                  <Feather name="smartphone" size={19} color={c.primary} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text
                    style={[styles.appearanceTitle, { color: c.foreground }]}
                  >
                    Chế độ khách
                  </Text>
                  <Text
                    style={[
                      styles.appearanceDetail,
                      { color: c.mutedForeground },
                    ]}
                  >
                    Từ và tiến độ chỉ lưu trên thiết bị này.
                  </Text>
                </View>
              </View>
              <View style={[styles.syncRow, { borderTopColor: c.border }]}>
                <Feather name="cloud-off" size={18} color={c.mutedForeground} />
                <Text
                  style={[
                    styles.appearanceDetail,
                    { flex: 1, color: c.mutedForeground },
                  ]}
                >
                  Đăng nhập để đồng bộ giữa các thiết bị.
                </Text>
              </View>
              <Button
                testID="guest-sign-in"
                label="Đăng nhập hoặc tạo tài khoản"
                icon="log-in"
                onPress={() => router.push("/(auth)/sign-in")}
              />
            </>
          )}
        </View>
        <Text style={[styles.section, { color: c.mutedForeground }]}>
          SAO LƯU & KHÔI PHỤC
        </Text>
        <Text style={[styles.appearanceHint, { color: c.mutedForeground }]}>
          Gói gồm sổ từ, tiến độ ôn, thống kê và phần thưởng; không gồm từ điển
          offline, audio hay thông tin đăng nhập.
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
            disabled={!user || transferState !== null}
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
            disabled={!user || transferState !== null || syncBusy}
          />
          <Text style={[styles.appearanceDetail, { color: c.mutedForeground }]}>
            Bản xuất lấy dữ liệu đang có trên thiết bị, kể cả thay đổi chưa đồng
            bộ. Tệp JSON có thể đọc được; chỉ gửi cho người bạn tin cậy. Khôi
            phục sẽ thay toàn bộ dữ liệu học hiện tại.
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
          message={`Sổ từ, tiến độ ôn, trạng thái đóng băng, thống kê và phần thưởng trên thiết bị cùng tài khoản sẽ được thay bằng tệp này. Các thiết bị khác sẽ nhận dữ liệu mới khi đồng bộ; thay đổi chưa đồng bộ ở đó có thể bị thay thế. Nếu đang ngoại tuyến, tài khoản sẽ được cập nhật khi có mạng. Hãy xuất bản sao lưu trước nếu bạn muốn giữ dữ liệu hiện tại.

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
          DỮ LIỆU OFFLINE
        </Text>
        <Text style={[styles.appearanceHint, { color: c.mutedForeground }]}>
          Từ điển, IPA và audio được tải riêng vào bộ nhớ ứng dụng, không nằm
          trong APK. Audio chiếm khoảng 307 MB; nên tải bằng Wi-Fi.
        </Text>
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
                  : dictionaryStatus === "damaged"
                    ? "Tệp bị thiếu hoặc lỗi · cần tải lại"
                    : dictionaryStatus === "checking"
                      ? "Đang kiểm tra…"
                      : `Chưa cài · ${sizeLabel(DICTIONARY.bytes)}`}
              </Text>
            </View>
          </View>
          <View style={styles.offlineActions}>
            <Button
              testID="offline-dictionary-download"
              label={dictionaryStatus === "damaged" ? "Tải lại" : "Tải từ điển"}
              icon="download"
              onPress={() => {
                void handleDownloadDictionary();
              }}
              loading={offlineAction === "dictionary-download"}
              disabled={
                Boolean(offlineAction) ||
                syncBusy ||
                dictionaryStatus === "installed" ||
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
                Boolean(offlineAction) ||
                syncBusy ||
                dictionaryStatus === "missing" ||
                dictionaryStatus === "checking"
              }
              style={{ flex: 1 }}
            />
          </View>
          <View style={[styles.offlineDivider, { borderColor: c.border }]} />
          <View style={styles.offlineResource}>
            <View
              style={[styles.offlineIcon, { backgroundColor: c.secondary }]}
            >
              <Feather name="globe" size={19} color={c.primary} />
            </View>
            <View style={styles.offlineResourceText}>
              <Text style={[styles.appearanceTitle, { color: c.foreground }]}>
                Phiên âm IPA Anh-Mỹ/Anh-Anh
              </Text>
              <Text
                testID="offline-regional-ipa-status"
                style={[styles.appearanceDetail, { color: c.mutedForeground }]}
              >
                {regionalIpaStatus === "installed"
                  ? `Đã cài · ${regionalIpaEntryCount.toLocaleString("vi-VN")} mục`
                  : regionalIpaStatus === "damaged"
                    ? "Dữ liệu bị lỗi · cần tải lại"
                    : regionalIpaStatus === "checking"
                      ? "Đang kiểm tra…"
                      : `Chưa cài · khoảng ${sizeLabel(REGIONAL_IPA_DICTIONARY.sourceBytes)}`}
              </Text>
            </View>
          </View>
          <Text style={[styles.appearanceDetail, { color: c.mutedForeground }]}>
            Bổ sung IPA cho các từ có dữ liệu; tải một lần để tra cứu ngoại tuyến.
            Cần cài từ điển trước.
          </Text>
          <View style={styles.offlineActions}>
            <Button
              testID="offline-regional-ipa-download"
              label={regionalIpaStatus === "damaged" ? "Tải lại IPA" : "Tải IPA"}
              icon="download"
              onPress={() => {
                void handleDownloadRegionalIpa();
              }}
              loading={offlineAction === "regional-ipa-download"}
              disabled={
                Boolean(offlineAction) ||
                syncBusy ||
                dictionaryStatus !== "installed" ||
                regionalIpaStatus === "installed" ||
                regionalIpaStatus === "checking"
              }
              style={{ flex: 1 }}
            />
            <Button
              testID="offline-regional-ipa-delete"
              label="Xóa"
              icon="trash-2"
              variant="ghost"
              onPress={() => {
                void handleDeleteOfflineResource("regional-ipa");
              }}
              loading={offlineAction === "regional-ipa-delete"}
              disabled={
                Boolean(offlineAction) ||
                syncBusy ||
                regionalIpaStatus === "missing" ||
                regionalIpaStatus === "checking"
              }
              style={{ flex: 1 }}
            />
          </View>
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
                        : `Chưa cài · ${sizeLabel(OFFLINE_AUDIO_DICTIONARY.bytes)} · ${OFFLINE_AUDIO_DICTIONARY.entryCount.toLocaleString("vi-VN")} từ`}
              </Text>
            </View>
          </View>
          <View style={styles.offlineActions}>
            <Button
              testID="offline-audio-download"
              label={audioStatus === "damaged" ? "Tải lại" : "Tải audio"}
              icon="download"
              onPress={() => {
                void handleDownloadAudio();
              }}
              loading={offlineAction === "audio-download"}
              disabled={
                Boolean(offlineAction) ||
                syncBusy ||
                audioStatus === "installed" ||
                audioStatus === "checking" ||
                audioStatus === "unavailable"
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
                Boolean(offlineAction) ||
                syncBusy ||
                audioStatus === "missing" ||
                audioStatus === "checking" ||
                audioStatus === "unavailable"
              }
              style={{ flex: 1 }}
            />
          </View>
          {offlineProgressText ? (
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
        <Text style={[styles.section, { color: c.mutedForeground }]}>
          ĐẶT LẠI ỨNG DỤNG
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
            Xóa sổ từ, tiến độ và thống kê trên thiết bị này và toàn bộ tài
            khoản trên các thiết bị khác. Từ điển, IPA và audio offline cũng sẽ bị
            xóa. Không thể hoàn tác; cần Internet để xác nhận xóa cloud.
          </Text>
          <Button
            testID="reset-app-data"
            label="Đặt lại mọi dữ liệu"
            icon="trash-2"
            variant="danger"
            onPress={() => {
              setResetError(null);
              setResetDialog(true);
            }}
            disabled={
              !user ||
              !sync.online ||
              syncBusy ||
              Boolean(offlineAction) ||
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
          visible={resetDialog}
          title="Xóa mọi dữ liệu VocabFlow?"
          message={
            "Sẽ xóa vĩnh viễn sổ từ, cấp ôn, lịch sử ôn, nhiệm vụ, phần thưởng và dữ liệu học trên thiết bị này cùng tài khoản cloud ở tất cả thiết bị. Từ điển, IPA và audio offline cũng sẽ bị xóa khỏi thiết bị này.\n\nCần Internet. Nếu máy chủ không xác nhận xóa cloud, dữ liệu trên thiết bị và tài nguyên offline sẽ được giữ nguyên. Không thể hoàn tác."
          }
          confirmLabel="Xóa cloud và thiết bị"
          onCancel={() => {
            if (!resetBusy) {
              setResetDialog(false);
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
          HIỆU ỨNG GIAO DIỆN
        </Text>
        <Text style={[styles.appearanceHint, { color: c.mutedForeground }]}>
          Âm thanh được lưu trong ứng dụng, không tải lên mạng. Tắt bất cứ lúc
          nào trong phần cài đặt này.
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
                Âm thanh giao diện
              </Text>
              <Text
                style={[styles.appearanceDetail, { color: c.mutedForeground }]}
              >
                Phản hồi nhẹ khi lưu, trả lời và hoàn thành bài học.
              </Text>
            </View>
            <Switch
              testID="sfx-enabled"
              accessibilityLabel="Âm thanh giao diện"
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
                Âm lượng hiệu ứng
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
                accessibilityLabel="Giảm âm lượng hiệu ứng"
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
                accessibilityLabel="Tăng âm lượng hiệu ứng"
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
