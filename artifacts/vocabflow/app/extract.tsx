import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardAvoidingView,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { router } from "expo-router";
import { Button, F, MaterialSheen } from "@/components/ui";
import { useVocabulary } from "@/contexts/VocabularyContext";
import { useColors } from "@/hooks/useColors";
import { useDictionary } from "@/hooks/useDictionary";
import { getDictionaryDraft } from "@/data/dictionary";
import {
  FREE_WORD_LIMIT,
  getAddableWordCount,
  getFreeWordSlots,
  MAX_EXTRACTION_TEXT_CHARACTERS,
  MAX_EXTRACTION_TEXT_BYTES,
  extractVocabularyFromText,
  utf8ByteLength,
} from "@/domain/vocabulary-extraction";
import { lookupDictionaryExtractionCandidates } from "@/data/vocabulary-extraction";

const MAX_EXTRACTION_FILE_BYTES = MAX_EXTRACTION_TEXT_BYTES;

type ResultRow = Awaited<ReturnType<typeof extractVocabularyFromText>>[number];

function normalizedTerm(term: string): string {
  return term.normalize("NFKC").trim().toLocaleLowerCase("en");
}

function partOfSpeechLabel(pos: string | null): string {
  const code = (pos ?? "").toLocaleLowerCase("en");
  if (["n", "noun"].includes(code)) return "Danh từ";
  if (["v", "verb", "vt", "vi"].includes(code)) return "Động từ";
  if (["a", "adj", "adjective"].includes(code)) return "Tính từ";
  if (["d", "adv", "adverb"].includes(code)) return "Trạng từ";
  if (["conj", "conjunction"].includes(code)) return "Liên từ";
  return pos?.trim() || "Khác";
}

export default function ExtractVocabularyScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const dictionary = useDictionary();
  const { words, saveWord } = useVocabulary();
  const [sourceText, setSourceText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [selectedTerms, setSelectedTerms] = useState<Set<string>>(new Set());
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hideExisting, setHideExisting] = useState(true);
  const [sortAlphabetically, setSortAlphabetically] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);

  const savedTerms = useMemo(
    () => new Set(words.map((word) => normalizedTerm(word.term))),
    [words],
  );
  const remainingSlots = getFreeWordSlots(words.length);
  const visibleResults = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("en");
    const filtered = results.filter((result) => {
      if (hideExisting && savedTerms.has(normalizedTerm(result.term))) return false;
      if (!query) return true;
      return [
        result.term,
        result.entry.senses[0]?.definition ?? "",
        result.sentence,
      ].some((value) => value.toLocaleLowerCase("en").includes(query));
    });
    return filtered.sort((left, right) =>
      sortAlphabetically
        ? left.term.localeCompare(right.term, "en")
        : right.count - left.count || left.term.localeCompare(right.term, "en"),
    );
  }, [hideExisting, results, savedTerms, searchQuery, sortAlphabetically]);
  const selectedResults = useMemo(
    () =>
      results.filter(
        (result) =>
          selectedTerms.has(normalizedTerm(result.term)) &&
          !savedTerms.has(normalizedTerm(result.term)),
      ),
    [results, savedTerms, selectedTerms],
  );

  const chooseTextFile = async () => {
    setError(null);
    setNotice(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: "text/plain",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      if (!asset) throw new Error("Không tìm thấy tệp đã chọn.");
      if (!asset.name.toLocaleLowerCase("en").endsWith(".txt")) {
        throw new Error("Chỉ hỗ trợ tệp .txt mã hóa UTF-8.");
      }
      if (asset.size !== undefined && asset.size > MAX_EXTRACTION_FILE_BYTES) {
        throw new Error("Tệp TXT quá lớn. Giới hạn là 1 MB.");
      }
      const contents =
        Platform.OS === "web" && asset.file
          ? await asset.file.text()
          : await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.UTF8,
            });
      if (
        contents.length > MAX_EXTRACTION_TEXT_CHARACTERS ||
        utf8ByteLength(contents) > MAX_EXTRACTION_FILE_BYTES
      ) {
        throw new Error("Tệp TXT quá lớn. Giới hạn là 1 MB.");
      }
      setSourceText(contents);
      setFileName(asset.name);
      setResults([]);
      setSelectedTerms(new Set());
      setNotice("Đã đọc tệp TXT trên thiết bị.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Không thể đọc tệp TXT. Hãy thử lại.",
      );
    }
  };

  const runExtraction = async () => {
    setError(null);
    setNotice(null);
    setSelectedTerms(new Set());
    setExpandedTerm(null);
    if (!dictionary.ready) {
      setError("Cần có từ điển SQLite offline trên thiết bị trước khi trích xuất.");
      return;
    }
    if (sourceText.length > MAX_EXTRACTION_TEXT_CHARACTERS) {
      setError("Văn bản quá lớn. Giới hạn là 1 MB.");
      return;
    }
    setIsExtracting(true);
    setProgress(0);
    try {
      const extracted = await extractVocabularyFromText(
        sourceText,
        lookupDictionaryExtractionCandidates,
        {
          onProgress: (value) => setProgress(value.percent),
        },
      );
      setResults(extracted);
      setNotice(
        extracted.length
          ? `Đã tìm thấy ${extracted.length} từ có trong từ điển offline.`
          : "Không tìm thấy từ phù hợp trong từ điển offline.",
      );
    } catch (failure) {
      setResults([]);
      setError(
        failure instanceof Error
          ? failure.message
          : "Không thể xử lý văn bản. Hãy thử lại.",
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleSelected = (term: string) => {
    const key = normalizedTerm(term);
    setSelectedTerms((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectVisible = () => {
    setSelectedTerms((current) => {
      const next = new Set(current);
      for (const result of visibleResults) {
        if (!savedTerms.has(normalizedTerm(result.term))) {
          next.add(normalizedTerm(result.term));
        }
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedTerms(new Set());

  const addSelected = async () => {
    setError(null);
    setNotice(null);
    if (selectedResults.length === 0) return;
    if (remainingSlots === 0) {
      setUpgradeMessage(
        "Sổ từ đã đạt giới hạn 100 từ của gói Free. Chưa có chức năng nâng cấp trong ứng dụng.",
      );
      return;
    }

    const addNow = selectedResults.slice(
      0,
      getAddableWordCount(words.length, selectedResults.length),
    );
    let added = 0;
    setIsAdding(true);
    try {
      for (const result of addNow) {
        const sense = result.entry.senses[0];
        if (!sense) continue;
        const draft = await getDictionaryDraft(result.entry.id, sense.id);
        await saveWord({ ...draft, example: result.sentence });
        added += 1;
      }
      setSelectedTerms(new Set());
      setNotice(`Đã thêm ${added} từ vào Sổ ở cấp 1.`);
      if (selectedResults.length > addNow.length) {
        setUpgradeMessage(
          `Đã thêm ${added} từ và đạt giới hạn 100 từ của gói Free. Các từ còn lại chưa được thêm; chức năng nâng cấp chưa có trong ứng dụng.`,
        );
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? `Đã thêm ${added} từ trước khi gặp lỗi: ${failure.message}`
          : `Đã thêm ${added} từ trước khi gặp lỗi khi lưu.`,
      );
    } finally {
      setIsAdding(false);
    }
  };

  const renderResult = ({ item }: { item: ResultRow }) => {
    const key = normalizedTerm(item.term);
    const isSaved = savedTerms.has(key);
    const isSelected = selectedTerms.has(key);
    const expanded = expandedTerm === key;
    const firstSense = item.entry.senses[0];
    return (
      <View
        testID={`extract-result-${key}`}
        style={[
          styles.resultCard,
          { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius },
        ]}
      >
        <View style={styles.resultTop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Mở chi tiết ${item.term}`}
            onPress={() => setExpandedTerm(expanded ? null : key)}
            style={styles.resultDetailsButton}
          >
            <View style={styles.termLine}>
              <Text style={[styles.term, { color: c.foreground }]} numberOfLines={1}>
                {item.term}
              </Text>
              <Text style={[styles.count, { color: c.primary }]}>
                ×{item.count}
              </Text>
            </View>
            <Text style={[styles.meta, { color: c.mutedForeground }]}>
              {[
                item.entry.ipa,
                item.entry.region?.toLocaleUpperCase("en"),
                partOfSpeechLabel(firstSense?.pos ?? null),
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected, disabled: isSaved }}
            accessibilityLabel={
              isSaved ? `${item.term} đã có trong Sổ` : `Chọn ${item.term}`
            }
            disabled={isSaved}
            onPress={() => toggleSelected(item.term)}
            style={[
              styles.checkbox,
              {
                borderColor: isSelected ? c.primary : c.border,
                backgroundColor: isSelected ? c.primary : "transparent",
                opacity: isSaved ? 0.45 : 1,
              },
            ]}
          >
            {isSaved ? (
              <Feather name="check" size={17} color={c.mutedForeground} />
            ) : isSelected ? (
              <Feather name="check" size={17} color={c.buttonForeground} />
            ) : null}
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Xem nghĩa và câu gốc của ${item.term}`}
          onPress={() => setExpandedTerm(expanded ? null : key)}
        >
          <Text style={[styles.definition, { color: c.foreground }]} numberOfLines={2}>
            {firstSense?.definition ?? "Chưa có nghĩa tiếng Việt"}
          </Text>
          {isSaved ? (
            <Text style={[styles.savedLabel, { color: c.mutedForeground }]}>
              Đã có trong Sổ
            </Text>
          ) : null}
          <Text style={[styles.expandHint, { color: c.mutedForeground }]}>
            {expanded ? "Thu gọn" : `${item.entry.senses.length} nghĩa · xem câu gốc`}
          </Text>
        </Pressable>
        {expanded ? (
          <View style={[styles.expanded, { borderTopColor: c.border }]}>
            {item.entry.senses.map((sense, index) => (
              <View key={sense.id} style={styles.senseItem}>
                <Text style={[styles.sensePos, { color: c.primary }]}>
                  {index + 1}. {partOfSpeechLabel(sense.pos)}
                  {sense.subPos ? ` · ${sense.subPos}` : ""}
                </Text>
                <Text style={[styles.definition, { color: c.foreground }]}>
                  {sense.definition}
                </Text>
              </View>
            ))}
            <Text style={[styles.sentenceLabel, { color: c.mutedForeground }]}>
              Câu gốc
            </Text>
            <Text style={[styles.sentence, { color: c.foreground }]}>
              {item.sentence}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  const ListHeader = (
    <View style={styles.listHeader}>
      <View
        style={[
          styles.offlineCard,
          { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius },
        ]}
      >
        <View style={styles.headingRow}>
          <View style={[styles.headingIcon, { backgroundColor: c.accent }]}>
            <Feather name="eye" size={21} color={c.accentForeground} />
          </View>
          <View style={styles.headingCopy}>
            <Text style={[styles.title, { color: c.foreground }]}>Trích từ vựng</Text>
            <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
              Mắt Quạ · xử lý trên thiết bị
            </Text>
          </View>
        </View>
        <Text style={[styles.offlineNote, { color: c.mutedForeground }]}>
          Dán văn bản hoặc chọn TXT. Từ và nghĩa chỉ được tra trong SQLite offline; không dịch câu, không xử lý PDF.
        </Text>
        <View style={styles.slotLine}>
          <Feather name="bookmark" size={16} color={c.primary} />
          <Text
            testID="extract-free-slots"
            style={[styles.slotText, { color: c.foreground }]}
          >
            Còn {remainingSlots}/100 chỗ
          </Text>
          <Text style={[styles.currentCount, { color: c.mutedForeground }]}>
            {words.length} từ trong Sổ
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.inputCard,
          { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius },
        ]}
      >
        <Text style={[styles.fieldLabel, { color: c.foreground }]}>
          Văn bản tiếng Anh
        </Text>
        <TextInput
          testID="extract-source-text"
          accessibilityLabel="Dán văn bản tiếng Anh"
          value={sourceText}
          onChangeText={(value) => {
            setSourceText(value);
            setFileName(null);
            setResults([]);
            setSelectedTerms(new Set());
            setNotice(null);
            if (value.length > MAX_EXTRACTION_TEXT_CHARACTERS) {
              setError("Văn bản quá lớn. Giới hạn là 1 MB.");
            } else {
              setError(null);
            }
          }}
          placeholder="Dán một đoạn văn tiếng Anh vào đây…"
          placeholderTextColor={c.mutedForeground}
          multiline
          textAlignVertical="top"
          autoCapitalize="sentences"
          autoCorrect={false}
          maxLength={MAX_EXTRACTION_TEXT_CHARACTERS}
          style={[
            styles.sourceInput,
            {
              color: c.foreground,
              backgroundColor: c.background,
              borderColor: c.border,
              borderRadius: Math.max(10, c.radius - 4),
            },
          ]}
        />
        {fileName ? (
          <Text style={[styles.fileName, { color: c.mutedForeground }]}>
            Tệp: {fileName}
          </Text>
        ) : null}
        <View style={styles.inputActions}>
          <Button
            testID="extract-pick-txt"
            label="Chọn tệp TXT"
            icon="file-text"
            variant="ghost"
            onPress={() => void chooseTextFile()}
            disabled={isExtracting || isAdding}
            style={styles.secondaryButton}
          />
          <Button
            testID="extract-run"
            label="Trích từ"
            icon="search"
            onPress={() => void runExtraction()}
            disabled={!sourceText.trim() || !dictionary.ready || isAdding}
            loading={isExtracting}
            style={styles.primaryButton}
          />
        </View>
        {!dictionary.ready ? (
          <View style={styles.dictionaryStatus}>
            {dictionary.loading ? (
              <ActivityIndicator size="small" color={c.primary} />
            ) : (
              <Feather name="alert-circle" size={16} color={c.destructive} />
            )}
            <Text style={[styles.statusText, { color: c.mutedForeground }]}>
              {dictionary.loading
                ? "Đang kiểm tra từ điển offline…"
                : "Cần cài từ điển offline trước; Mắt Quạ sẽ không tự tải dữ liệu."}
            </Text>
            {!dictionary.loading ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/settings")}
                hitSlop={8}
              >
                <Text style={[styles.settingsLink, { color: c.primary }]}>
                  Cài đặt
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {isExtracting ? (
          <View style={styles.progressWrap}>
            <View
              style={[styles.progressTrack, { backgroundColor: c.muted }]}
            >
              <View
                testID="extract-progress-bar"
                style={[
                  styles.progressFill,
                  { backgroundColor: c.primary, width: `${progress}%` },
                ]}
              />
            </View>
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.progressText, { color: c.mutedForeground }]}
            >
              Đang trích xuất… {progress}%
            </Text>
          </View>
        ) : null}
      </View>

      {error ? (
        <View
          accessibilityRole="alert"
          style={[
            styles.messageBox,
            { backgroundColor: c.destructiveSoft, borderColor: c.destructive },
          ]}
        >
          <Feather name="alert-circle" size={17} color={c.destructive} />
          <Text style={[styles.messageText, { color: c.destructiveText }]}>
            {error}
          </Text>
        </View>
      ) : null}
      {notice ? (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.messageBox,
            { backgroundColor: c.accent, borderColor: c.border },
          ]}
        >
          <Feather name="check-circle" size={17} color={c.primary} />
          <Text style={[styles.messageText, { color: c.foreground }]}>
            {notice}
          </Text>
        </View>
      ) : null}

      {results.length > 0 ? (
        <View style={styles.resultsHeader}>
          <View style={styles.resultsHeadingLine}>
            <View>
              <Text style={[styles.sectionTitle, { color: c.foreground }]}>
                Kết quả · {visibleResults.length} từ
              </Text>
              <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
                Chọn nghĩa đầu tiên để thêm vào lịch ôn cấp 1.
              </Text>
            </View>
            <View style={styles.sortActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  sortAlphabetically ? "Sắp xếp theo tần suất" : "Sắp xếp A đến Z"
                }
                onPress={() => setSortAlphabetically((value) => !value)}
                style={[styles.sortButton, { borderColor: c.border }]}
              >
                <Feather name="list" size={16} color={c.primary} />
                <Text style={[styles.sortButtonText, { color: c.foreground }]}>
                  {sortAlphabetically ? "Tần suất" : "A–Z"}
                </Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.filterRow}>
            <View
              style={[
                styles.listSearch,
                { backgroundColor: c.card, borderColor: c.border },
              ]}
            >
              <Feather name="search" size={17} color={c.mutedForeground} />
              <TextInput
                testID="extract-results-search"
                accessibilityLabel="Tìm trong danh sách từ"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Tìm trong kết quả"
                placeholderTextColor={c.mutedForeground}
                autoCapitalize="none"
                style={[styles.listSearchInput, { color: c.foreground }]}
              />
              {searchQuery ? (
                <Pressable
                  accessibilityLabel="Xóa tìm kiếm trong kết quả"
                  onPress={() => setSearchQuery("")}
                  hitSlop={8}
                >
                  <Feather name="x-circle" size={18} color={c.mutedForeground} />
                </Pressable>
              ) : null}
            </View>
          </View>
          <View style={styles.optionsRow}>
            <View style={styles.switchRow}>
              <Switch
                testID="extract-hide-saved"
                value={hideExisting}
                onValueChange={setHideExisting}
                trackColor={{ false: c.border, true: c.primary }}
                thumbColor={c.card}
              />
              <Text style={[styles.switchLabel, { color: c.foreground }]}>
                Ẩn từ đã có
              </Text>
            </View>
            <View style={styles.bulkActions}>
              <Pressable
                accessibilityRole="button"
                onPress={selectVisible}
                hitSlop={8}
              >
                <Text style={[styles.bulkAction, { color: c.primary }]}>
                  Chọn tất cả
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={clearSelection}
                hitSlop={8}
              >
                <Text style={[styles.bulkAction, { color: c.primary }]}>
                  Bỏ chọn
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: c.background }]}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <FlatList
        testID="extract-results-list"
        data={visibleResults}
        keyExtractor={(item) => normalizedTerm(item.term)}
        renderItem={renderResult}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          results.length > 0
            ? () => (
            <View style={styles.emptyResults}>
              <Feather name="search" size={24} color={c.mutedForeground} />
              <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
                {hideExisting &&
                !searchQuery.trim() &&
                results.every((item) =>
                  savedTerms.has(normalizedTerm(item.term)),
                )
                  ? "Các từ này đã có trong Sổ. Tắt “Ẩn từ đã có” để xem."
                  : "Không có từ phù hợp bộ lọc."}
              </Text>
            </View>
              )
            : undefined
        }
        renderScrollComponent={(props) => (
          <KeyboardAwareScrollView {...props} bottomOffset={24} />
        )}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews={Platform.OS === "android"}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 16,
        }}
      />
      <View
        style={[
          styles.footer,
          {
            backgroundColor: c.background,
            borderTopColor: c.border,
            paddingBottom: Math.max(10, insets.bottom),
          },
        ]}
      >
        <Text style={[styles.footerCount, { color: c.mutedForeground }]}>
          {selectedResults.length} đã chọn · còn {remainingSlots}/100 chỗ
        </Text>
        <Button
          testID="extract-add-selected"
          label={`Thêm ${selectedResults.length} từ đã chọn`}
          icon="plus"
          onPress={() => void addSelected()}
          disabled={selectedResults.length === 0 || isExtracting || isAdding}
          loading={isAdding}
        />
      </View>
      <Modal
        transparent
        visible={upgradeMessage !== null}
        animationType="fade"
        onRequestClose={() => setUpgradeMessage(null)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: c.overlay }]}
          onPress={() => setUpgradeMessage(null)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: c.card,
                borderColor: c.border,
                borderRadius: c.radius + 6,
              },
            ]}
            onPress={() => {}}
          >
            <MaterialSheen />
            <View style={[styles.modalIcon, { backgroundColor: c.accent }]}>
              <Feather name="award" size={23} color={c.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>
              Đã chạm giới hạn Free
            </Text>
            <Text style={[styles.modalMessage, { color: c.mutedForeground }]}>
              {upgradeMessage}
            </Text>
            <Button
              testID="extract-upgrade-dismiss"
              label="Đóng"
              onPress={() => setUpgradeMessage(null)}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listHeader: { gap: 14, paddingBottom: 14 },
  offlineCard: { borderWidth: 1, padding: 16, gap: 12 },
  headingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headingIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headingCopy: { flex: 1, gap: 2 },
  title: { fontFamily: F.b, fontSize: 21 },
  subtitle: { fontFamily: F.r, fontSize: 13, lineHeight: 18 },
  offlineNote: { fontFamily: F.r, fontSize: 14, lineHeight: 21 },
  slotLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  slotText: { fontFamily: F.s, fontSize: 14 },
  currentCount: { marginLeft: "auto", fontFamily: F.r, fontSize: 12 },
  inputCard: { borderWidth: 1, padding: 14, gap: 10 },
  fieldLabel: { fontFamily: F.s, fontSize: 14 },
  sourceInput: {
    minHeight: 145,
    maxHeight: 230,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontFamily: F.r,
    fontSize: 15,
    lineHeight: 22,
  },
  fileName: { fontFamily: F.r, fontSize: 12 },
  inputActions: { flexDirection: "row", gap: 10 },
  secondaryButton: { flex: 1, paddingHorizontal: 10 },
  primaryButton: { flex: 1, paddingHorizontal: 10 },
  dictionaryStatus: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusText: { flex: 1, fontFamily: F.r, fontSize: 12, lineHeight: 17 },
  settingsLink: { fontFamily: F.s, fontSize: 13 },
  progressWrap: { gap: 6 },
  progressTrack: { height: 7, borderRadius: 8, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 8 },
  progressText: { fontFamily: F.m, fontSize: 12 },
  messageBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  messageText: { flex: 1, fontFamily: F.m, fontSize: 13, lineHeight: 19 },
  resultsHeader: { gap: 12, paddingTop: 2 },
  resultsHeadingLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitle: { fontFamily: F.b, fontSize: 18 },
  sortActions: { flexDirection: "row", gap: 8 },
  sortButton: {
    minHeight: 40,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  sortButtonText: { fontFamily: F.s, fontSize: 12 },
  filterRow: { flexDirection: "row", gap: 8 },
  listSearch: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listSearchInput: { flex: 1, fontFamily: F.r, fontSize: 14, paddingVertical: 8 },
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  switchLabel: { fontFamily: F.m, fontSize: 13 },
  bulkActions: { flexDirection: "row", gap: 14 },
  bulkAction: { fontFamily: F.s, fontSize: 12 },
  resultCard: { borderWidth: 1, padding: 14, marginBottom: 9 },
  resultTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  resultDetailsButton: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: "center" },
  termLine: { flexDirection: "row", alignItems: "center", gap: 10 },
  term: { flexShrink: 1, fontFamily: F.b, fontSize: 17 },
  count: { fontFamily: F.b, fontSize: 15 },
  meta: { fontFamily: F.r, fontSize: 12, marginTop: 2 },
  checkbox: {
    width: 42,
    height: 42,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  definition: { fontFamily: F.r, fontSize: 14, lineHeight: 20, marginTop: 7 },
  savedLabel: { fontFamily: F.s, fontSize: 11, marginTop: 5 },
  expandHint: { fontFamily: F.m, fontSize: 11, marginTop: 6 },
  expanded: { marginTop: 10, paddingTop: 8, borderTopWidth: 1 },
  senseItem: { marginBottom: 8 },
  sensePos: { fontFamily: F.s, fontSize: 12 },
  sentenceLabel: { fontFamily: F.s, fontSize: 12, marginTop: 3 },
  sentence: { fontFamily: F.r, fontSize: 13, lineHeight: 19, marginTop: 3 },
  emptyResults: { alignItems: "center", gap: 8, padding: 24 },
  emptyText: { fontFamily: F.r, fontSize: 14, textAlign: "center" },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  footerCount: { fontFamily: F.m, fontSize: 12, textAlign: "center" },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    overflow: "hidden",
    gap: 14,
  },
  modalIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontFamily: F.b, fontSize: 19, textAlign: "center" },
  modalMessage: { fontFamily: F.r, fontSize: 14, lineHeight: 21, textAlign: "center" },
});
