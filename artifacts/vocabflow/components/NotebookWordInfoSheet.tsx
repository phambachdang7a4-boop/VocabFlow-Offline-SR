import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { VocabularyWord } from "@/data/types";
import { getDictionaryEntry } from "@/data/dictionary";
import {
  getRegionalIpaLookupForTerm,
  type RegionalIpaLookupResult,
} from "@/data/offline-regional-pronunciations";
import type { DictionaryPronunciation } from "@/domain/dictionary";
import {
  groupReviewPronunciations,
  reviewExampleTranslation,
} from "@/domain/review-result-details";
import { useSpeechPreferences } from "@/contexts/SpeechPreferencesContext";
import { useColors } from "@/hooks/useColors";
import { Button, ErrorBanner, F, MaterialSheen } from "@/components/ui";

type NotebookWordInfoSheetProps = {
  word: VocabularyWord | null;
  onClose: () => void;
  onFreeze: () => void;
  confirmDelete: boolean;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  busy?: boolean;
  actionError?: string | null;
};

function IpaRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.ipaRow}>
      <Text style={[styles.ipaAccent, { color, borderColor: color }]}>
        {label}
      </Text>
      <Text style={[styles.ipaValue, { color }]}>{value}</Text>
    </View>
  );
}

export function NotebookWordInfoSheet({
  word,
  onClose,
  onFreeze,
  confirmDelete,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  busy = false,
  actionError,
}: NotebookWordInfoSheetProps) {
  const c = useColors();
  const speech = useSpeechPreferences();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const lookupKey = word
    ? `${word.id}:${word.dictionaryEntryId ?? ""}:${word.term}`
    : "";
  const [pronunciationLookup, setPronunciationLookup] = useState<{
    key: string;
    pronunciations: DictionaryPronunciation[];
    regionalState: RegionalIpaLookupResult["state"] | "loading" | "not-needed";
  } | null>(null);

  useEffect(() => {
    if (!word) {
      setPronunciationLookup(null);
      return;
    }

    let active = true;
    const selectedWord = word;
    const loadPronunciations = async () => {
      let pronunciations: DictionaryPronunciation[] = [];
      let dictionaryLookupFailed = false;
      if (selectedWord.dictionaryEntryId != null) {
        try {
          pronunciations = (
            await getDictionaryEntry(selectedWord.dictionaryEntryId)
          ).pronunciations;
        } catch {
          dictionaryLookupFailed = true;
        }
      }

      let regionalState: RegionalIpaLookupResult["state"] | "not-needed" =
        "not-needed";
      if (
        selectedWord.dictionaryEntryId == null ||
        !groupReviewPronunciations(pronunciations, "").uk.length
      ) {
        try {
          const result = await getRegionalIpaLookupForTerm(selectedWord.term);
          regionalState =
            dictionaryLookupFailed && result.state !== "found"
              ? "failed"
              : result.state;
          if (result.state === "found") {
            pronunciations = [...pronunciations, ...result.pronunciations];
          }
        } catch {
          regionalState = "failed";
        }
      }

      if (active) {
        setPronunciationLookup({
          key: lookupKey,
          pronunciations,
          regionalState,
        });
      }
    };

    void loadPronunciations();
    return () => {
      active = false;
    };
  }, [lookupKey, word]);

  if (!word) return null;

  const pronunciationLines = groupReviewPronunciations(
    pronunciationLookup?.key === lookupKey
      ? pronunciationLookup.pronunciations
      : [],
    word.ipa,
  );
  const pronunciationState =
    pronunciationLookup?.key === lookupKey
      ? pronunciationLookup.regionalState
      : "loading";
  const ukIpa =
    pronunciationLines.uk.join(" · ") ||
    (pronunciationState === "loading"
      ? "Đang tra cứu IPA Anh-Anh…"
      : pronunciationState === "not-found"
        ? "Gói đã cài nhưng không có mục Anh-Anh cho từ này"
        : pronunciationState === "damaged"
          ? "Gói IPA bị lỗi · hãy cài lại trong Cài đặt"
          : pronunciationState === "failed"
            ? "Tra cứu IPA Anh-Anh thất bại · hãy thử lại"
            : pronunciationState === "not-needed"
              ? "Chưa có dữ liệu Anh-Anh"
              : "Chưa cài gói IPA Anh-Anh · tải gói trong Cài đặt");
  const exampleTranslation = reviewExampleTranslation(word.example);
  const sheetHeight = Math.min(Math.round(height * 0.66), 620);
  const bottomInset = Math.max(insets.bottom, Platform.OS === "web" ? 34 : 8);

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <View
        testID="notebook-word-info-overlay"
        style={[styles.overlay, { backgroundColor: c.overlay }]}
      >
        <Pressable
          testID="notebook-word-info-backdrop"
          accessibilityLabel="Đóng thông tin từ"
          style={StyleSheet.absoluteFill}
          onPress={busy ? undefined : onClose}
        />
        <View
          testID="notebook-word-info-sheet"
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              marginBottom: bottomInset + 6,
              backgroundColor: c.vocabCard,
              borderColor: c.navigationBorder,
              borderRadius: c.radius + 10,
              shadowColor: c.shade,
            },
          ]}
        >
          <MaterialSheen tone="navy" radius={c.radius + 10} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.eyebrow, { color: c.vocabCardMuted }]}>
              THÔNG TIN TỪ
            </Text>
            <Pressable
              testID="notebook-word-info-close"
              accessibilityRole="button"
              accessibilityLabel="Đóng thông tin từ"
              disabled={busy}
              onPress={onClose}
              hitSlop={10}
              style={styles.closeButton}
            >
              <Feather
                name="x"
                size={22}
                color={c.vocabCardForeground}
              />
            </Pressable>
          </View>

          <ScrollView
            testID="notebook-word-info-scroll"
            style={styles.infoScroll}
            contentContainerStyle={styles.infoContent}
            showsVerticalScrollIndicator
          >
            <View style={styles.infoGroup}>
              <Text style={[styles.label, { color: c.vocabCardMuted }]}>
                ĐÁP ÁN
              </Text>
              <Text
                testID="notebook-word-info-term"
                style={[styles.term, { color: c.vocabCardForeground }]}
              >
                {word.term}
              </Text>
            </View>

            <View style={styles.infoGroup}>
              <Text style={[styles.label, { color: c.vocabCardMuted }]}>
                PHIÊN ÂM
              </Text>
              <View style={styles.ipaLine}>
                <View style={styles.ipaRow}>
                  <Text
                    style={[
                      styles.ipaAccent,
                      {
                        color: c.vocabCardMuted,
                        borderColor: c.vocabCardMuted,
                      },
                    ]}
                  >
                    US
                  </Text>
                  <Text
                    testID="notebook-word-info-ipa-us"
                    style={[styles.ipaValue, { color: c.vocabCardMuted }]}
                  >
                    {pronunciationLines.us.join(" · ") || "Chưa có dữ liệu"}
                  </Text>
                  <Pressable
                    testID="notebook-word-info-speak"
                    accessibilityRole="button"
                    accessibilityLabel={`Phát âm ${word.term}`}
                    onPress={() => {
                      void speech.speakWord(word.term, word.dictionaryEntryId);
                    }}
                    hitSlop={8}
                    style={styles.audioButton}
                  >
                    <Feather
                      name="volume-2"
                      size={20}
                      color={c.vocabCardAccent}
                    />
                  </Pressable>
                </View>
                <IpaRow
                  label="UK"
                  value={ukIpa}
                  color={c.vocabCardMuted}
                />
                {pronunciationLines.unspecified.length ? (
                  <IpaRow
                    label="—"
                    value={pronunciationLines.unspecified.join(" · ")}
                    color={c.vocabCardMuted}
                  />
                ) : null}
              </View>
            </View>

            <View style={styles.infoGroup}>
              <Text style={[styles.label, { color: c.vocabCardMuted }]}>
                NGHĨA TIẾNG VIỆT
              </Text>
              <Text
                testID="notebook-word-info-meaning"
                style={[styles.value, { color: c.vocabCardForeground }]}
              >
                {word.meaning}
              </Text>
            </View>

            {word.example.trim() ? (
              <View style={styles.infoGroup}>
                <Text style={[styles.label, { color: c.vocabCardMuted }]}>
                  CÂU VÍ DỤ
                </Text>
                <Text
                  testID="notebook-word-info-example"
                  style={[
                    styles.example,
                    { color: c.vocabCardForeground },
                  ]}
                >
                  {word.example}
                </Text>
                {exampleTranslation ? (
                  <View style={styles.infoGroup}>
                    <Text style={[styles.label, { color: c.vocabCardMuted }]}>
                      DỊCH NGHĨA
                    </Text>
                    <Text
                      testID="notebook-word-info-example-translation"
                      style={[
                        styles.value,
                        { color: c.vocabCardForeground },
                      ]}
                    >
                      {exampleTranslation}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.infoGroup}>
              <Text style={[styles.label, { color: c.vocabCardMuted }]}>
                TIẾN ĐỘ ÔN
              </Text>
              <Text style={[styles.value, { color: c.vocabCardForeground }]}>
                {word.frozen
                  ? "Đã đóng băng — dừng ôn tập"
                  : word.completed
                    ? "Đã hoàn tất 6 cấp ôn"
                    : `Cấp ôn hiện tại: ${word.level} / 6`}
              </Text>
              <Text style={[styles.muted, { color: c.vocabCardMuted }]}>
                {word.frozen
                  ? "Vẫn tra cứu được và vẫn tính vào tổng số từ đã lưu."
                  : word.nextReviewOn
                    ? `Hạn ôn: ${word.nextReviewOn.split("-").reverse().join("/")}`
                    : "Không còn lịch ôn trong chu kỳ này."}
              </Text>
              <Text style={[styles.muted, { color: c.vocabCardMuted }]}>
                Đã trả lời {word.reviewCount} lần.
              </Text>
            </View>
          </ScrollView>

          {actionError ? <ErrorBanner message={actionError} /> : null}
          {confirmDelete ? (
            <View style={styles.confirmArea}>
              <Text style={[styles.confirmText, { color: c.vocabCardMuted }]}>
                Xóa “{word.term}” khỏi Sổ từ? Không thể hoàn tác.
              </Text>
              <View style={styles.actions}>
                <Button
                  testID="notebook-word-delete-cancel"
                  label="Huỷ"
                  variant="primary"
                  disabled={busy}
                  onPress={onCancelDelete}
                  style={styles.actionButton}
                />
                <Button
                  testID="notebook-word-delete-confirm"
                  label="Xóa từ"
                  icon="trash-2"
                  variant="danger"
                  loading={busy}
                  onPress={onConfirmDelete}
                  style={styles.actionButton}
                />
              </View>
            </View>
          ) : (
            <View style={styles.actions}>
              <Button
                testID="notebook-word-freeze"
                label={word.frozen ? "Bỏ đóng băng" : "Đóng băng"}
                icon={word.frozen ? "play-circle" : "pause-circle"}
                variant="primary"
                disabled={busy || word.completed}
                onPress={onFreeze}
                style={styles.actionButton}
              />
              <Button
                testID="notebook-word-delete"
                label="Xóa từ"
                icon="trash-2"
                variant="danger"
                disabled={busy}
                onPress={onRequestDelete}
                style={styles.actionButton}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  sheet: {
    width: "100%",
    maxWidth: 560,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 12,
    gap: 10,
  },
  sheetHeader: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: { fontFamily: F.b, fontSize: 11, letterSpacing: 1.2 },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  infoScroll: { flex: 1 },
  infoContent: { gap: 18, paddingBottom: 8 },
  infoGroup: { gap: 7 },
  label: { fontFamily: F.b, fontSize: 11, letterSpacing: 0.7 },
  term: { fontFamily: F.b, fontSize: 28, lineHeight: 34 },
  value: { fontFamily: F.r, fontSize: 16, lineHeight: 24 },
  muted: { fontFamily: F.m, fontSize: 13, lineHeight: 20 },
  example: {
    fontFamily: F.s,
    fontSize: 16,
    lineHeight: 24,
    fontStyle: "italic",
  },
  ipaLine: { gap: 4 },
  ipaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ipaAccent: {
    minWidth: 48,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderRadius: 6,
    fontFamily: F.b,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    overflow: "hidden",
  },
  ipaValue: { flex: 1, flexWrap: "wrap", fontFamily: F.m, fontSize: 13, lineHeight: 20 },
  audioButton: { width: 40, height: 36, alignItems: "center", justifyContent: "center" },
  actions: { flexDirection: "row", gap: 10, paddingTop: 2 },
  actionButton: { flex: 1 },
  confirmArea: { gap: 10, paddingTop: 2 },
  confirmText: { fontFamily: F.r, fontSize: 14, lineHeight: 20 },
});
