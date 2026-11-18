import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useVocabulary } from "@/contexts/VocabularyContext";
import {
  getDictionaryEntry,
  getDictionaryInflectionRoots,
} from "@/data/dictionary";
import { getOfflineRegionalIpaStatus } from "@/data/offline-regional-pronunciations";
import {
  dictionaryDraft,
  dictionaryPartOfSpeechLabel,
  exampleSegments,
  pronunciationAccent,
  sameWordSense,
  type DictionaryEntry,
  type DictionaryPartOfSpeech,
  type DictionarySense,
} from "@/domain/dictionary";
import { useColors } from "@/hooks/useColors";
import {
  Button,
  ErrorBanner,
  F,
  MaterialSheen,
  Skeleton,
} from "@/components/ui";
import { PartOfSpeechFilter } from "@/components/PartOfSpeechFilter";
import { useSpeechPreferences } from "@/contexts/SpeechPreferencesContext";
import { useSoundEffects } from "@/contexts/SoundEffectsContext";
import { soundCueFor, withSoundOutcome } from "@/domain/sound-cues";
import courseDictionaryIndex from "@/domain/course-dictionary-index.json";

const normalizeCourseTerm = (term: string) =>
  term.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
const COURSE_ID_BY_TITLE = new Map(
  courseDictionaryIndex.courses.map(({ id, title }) => [title, id]),
);
const COURSE_TERM_INDEX = new Map(
  courseDictionaryIndex.terms.map((term) => [
    normalizeCourseTerm(term.term),
    term,
  ]),
);

/** Shared reading view for one dictionary entry. Caller guarantees a valid id and a ready dictionary. */
export function DictionaryEntryView({
  id,
  bottomPad,
  onBack,
  backLabel = "Quay lại",
}: {
  id: number;
  bottomPad: number;
  onBack: () => void;
  backLabel?: string;
}) {
  const c = useColors();
  const {
    words,
    saveWord,
    loading: bookLoading,
    error: bookError,
    reload,
  } = useVocabulary();
  const speech = useSpeechPreferences();
  const sound = useSoundEffects();
  const [saving, setSaving] = useState<number | null>(null);
  const [committed, setCommitted] = useState<Set<string>>(() => new Set());
  const [lastSaved, setLastSaved] = useState<{
    key: string;
    definition: string;
  } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveLock = useRef(false);
  const committedRef = useRef<Set<string>>(new Set());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [entry, setEntry] = useState<DictionaryEntry | null>(null);
  const [inflectionRoots, setInflectionRoots] = useState<
    { id: number; term: string }[]
  >([]);
  const [regionalIpaInstalled, setRegionalIpaInstalled] = useState<
    boolean | null
  >(null);
  const [senses, setSenses] = useState<DictionarySense[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  // null is automatic first-in-source selection; [] is an explicit All choice.
  const [parts, setParts] = useState<DictionaryPartOfSpeech[] | null>(null);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [filterTick, setFilterTick] = useState(0);
  const reqRef = useRef(0);
  const hasFocusedOnce = useRef(false);
  const partsRef = useRef(parts);
  partsRef.current = parts;
  const hasEntryRef = useRef(false);
  const selectedParts = useMemo(
    () => parts ?? entry?.partsOfSpeech.slice(0, 1) ?? [],
    [parts, entry?.partsOfSpeech],
  );

  useFocusEffect(
    useCallback(() => {
      if (entry && speech.ready && speech.autoRead)
        void speech.speakWord(entry.term, entry.id);
      return () => {
        void speech.stopSpeaking();
      };
    }, [
      entry?.id,
      speech.ready,
      speech.autoRead,
      speech.speakWord,
      speech.stopSpeaking,
    ]),
  );

  useEffect(() => {
    let active = true;
    setInflectionRoots([]);
    if (!entry) return () => {
      active = false;
    };
    getDictionaryInflectionRoots(entry.id).then(
      (roots) => {
        if (active) setInflectionRoots(roots);
      },
      () => {
        if (active) setInflectionRoots([]);
      },
    );
    return () => {
      active = false;
    };
  }, [entry?.id]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getOfflineRegionalIpaStatus().then((status) => {
        if (active) setRegionalIpaInstalled(status.state === "installed");
      });
      // Refresh the entry when returning from Settings after installing the IPA pack.
      if (hasFocusedOnce.current) setTick((value) => value + 1);
      else hasFocusedOnce.current = true;
      return () => {
        active = false;
      };
    }, []),
  );

  useEffect(() => {
    const rid = ++reqRef.current;
    hasEntryRef.current = false;
    setLoading(true);
    setError(null);
    setMoreError(null);
    setEntry(null);
    setSenses([]);
    setHasMore(false);
    setLoadingMore(false);
    setFilterLoading(false);
    setFilterError(null);
    getDictionaryEntry(id, 0, partsRef.current ?? "first")
      .then(
        (e) => {
          if (reqRef.current === rid) {
            hasEntryRef.current = true;
            setEntry(e);
            setSenses(e.senses);
            setHasMore(e.hasMore);
          }
        },
        (e) => {
          if (reqRef.current === rid)
            setError(e instanceof Error ? e.message : "Không thể mở mục từ.");
        },
      )
      .finally(() => {
        if (reqRef.current === rid) setLoading(false);
      });
    return () => {
      reqRef.current += 1;
    };
  }, [id, tick]);

  // Filter changes keep the entry header and reload page 0 for the new selection only.
  const partsKey = parts?.join(",") ?? "first";
  const firstFilter = useRef(true);
  useEffect(() => {
    if (firstFilter.current) {
      firstFilter.current = false;
      return;
    }
    if (!hasEntryRef.current) {
      setTick((n) => n + 1);
      return;
    }
    const rid = ++reqRef.current;
    setSenses([]);
    setHasMore(false);
    setLoadingMore(false);
    setMoreError(null);
    setFilterError(null);
    setFilterLoading(true);
    getDictionaryEntry(id, 0, partsRef.current ?? "first")
      .then(
        (e) => {
          if (reqRef.current === rid) {
            setEntry((prev) =>
              prev
                ? {
                    ...prev,
                    ...e,
                    partsOfSpeech: prev.partsOfSpeech.length
                      ? prev.partsOfSpeech
                      : e.partsOfSpeech,
                  }
                : e,
            );
            setSenses(e.senses);
            setHasMore(e.hasMore);
          }
        },
        (e) => {
          if (reqRef.current === rid)
            setFilterError(
              e instanceof Error ? e.message : "Không thể lọc nghĩa.",
            );
        },
      )
      .finally(() => {
        if (reqRef.current === rid) setFilterLoading(false);
      });
  }, [partsKey, filterTick, id]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || !entry || filterLoading) return;
    const rid = reqRef.current;
    setLoadingMore(true);
    setMoreError(null);
    getDictionaryEntry(id, senses.length, selectedParts)
      .then(
        (e) => {
          if (reqRef.current !== rid) return;
          setSenses((prev) => {
            const seen = new Set(prev.map((s) => s.id));
            return [...prev, ...e.senses.filter((s) => !seen.has(s.id))];
          });
          setHasMore(e.hasMore);
        },
        (e) => {
          if (reqRef.current === rid)
            setMoreError(
              e instanceof Error ? e.message : "Không thể tải thêm nghĩa.",
            );
        },
      )
      .finally(() => {
        if (reqRef.current === rid) setLoadingMore(false);
      });
  }, [
    hasMore,
    loadingMore,
    entry,
    id,
    senses.length,
    selectedParts,
    filterLoading,
  ]);

  const senseKey = (entryId: number, senseId: number) =>
    `${entryId}:${senseId}`;
  // Per-meaning lookup: a saved sense never blocks other senses of the same headword.
  const existingFor = (sense: DictionarySense) =>
    entry
      ? words.find((w) => sameWordSense(w, dictionaryDraft(entry, sense)))
      : undefined;
  const savedCount = entry
    ? senses.filter(
        (s) => existingFor(s) || committed.has(senseKey(entry.id, s.id)),
      ).length
    : 0;
  const saveSense = async (sense: DictionarySense) => {
    if (!entry || bookLoading || bookError || saveLock.current) return;
    const key = senseKey(entry.id, sense.id);
    if (existingFor(sense) || committedRef.current.has(key)) return;
    const draft = dictionaryDraft(entry, sense);
    saveLock.current = true;
    setSaving(sense.id);
    setSaveError(null);
    sound.unlockFromGesture();
    try {
      await withSoundOutcome(
        () => saveWord(draft),
        (cue) => {
          if (mounted.current) sound.play(cue);
        },
        soundCueFor("wordSaved"),
      );
      // Commit can succeed even if the provider's subsequent read fails; keep the marker.
      committedRef.current.add(key);
      if (mounted.current) {
        setCommitted(new Set(committedRef.current));
        setLastSaved({ key, definition: sense.definition });
      }
    } catch (failure) {
      if (mounted.current)
        setSaveError(
          failure instanceof Error
            ? failure.message
            : "Không thể lưu nghĩa này. Hãy thử lại.",
        );
    } finally {
      saveLock.current = false;
      if (mounted.current) setSaving(null);
    }
  };

  const backRow = (
    <Pressable
      testID="entry-back"
      accessibilityRole="button"
      accessibilityLabel={backLabel}
      onPress={onBack}
      hitSlop={8}
      style={({ pressed }) => [styles.back, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Feather name="arrow-left" size={16} color={c.dictHead} />
      <Text style={[styles.backText, { color: c.dictHead }]}>{backLabel}</Text>
    </Pressable>
  );

  if (error) {
    return (
      <ScrollView
        style={{ backgroundColor: c.dictPage }}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: bottomPad,
          gap: 12,
        }}
      >
        {backRow}
        <ErrorBanner message={error} onRetry={() => setTick((n) => n + 1)} />
      </ScrollView>
    );
  }
  if (loading || !entry) {
    return (
      <View style={{ flex: 1, padding: 20, backgroundColor: c.dictPage }}>
        <Skeleton h={90} />
        <Skeleton h={80} />
        <Skeleton h={80} />
      </View>
    );
  }

  const openWord = (wordId: number) =>
    router.push({ pathname: "/word", params: { id: String(wordId) } });
  const accentPronunciations = {
    us: entry.pronunciations.filter((p) => pronunciationAccent(p.region) === "us"),
    uk: entry.pronunciations.filter((p) => pronunciationAccent(p.region) === "uk"),
  };
  const accentIpa = {
    us: [
      ...new Set(
        accentPronunciations.us.map((p) => p.ipa.trim()).filter(Boolean),
      ),
    ],
    uk: [
      ...new Set(
        accentPronunciations.uk.map((p) => p.ipa.trim()).filter(Boolean),
      ),
    ],
  };
  const sameRegionalIpa =
    accentIpa.us.length > 0 &&
    accentIpa.us.join(" · ") === accentIpa.uk.join(" · ");
  const otherPronunciations = entry.pronunciations.filter(
    (p) => pronunciationAccent(p.region) === null,
  );

  const header = (
    <View style={{ gap: 14, marginBottom: 8 }}>
      {backRow}
      {bookError ? <ErrorBanner message={bookError} onRetry={reload} /> : null}
      {saveError ? <ErrorBanner message={saveError} /> : null}
      {lastSaved ? (
        <Text
          testID="entry-save-success"
          accessibilityLiveRegion="polite"
          style={[styles.noticeTitle, { color: c.dictSaved }]}
        >
          Đã lưu nghĩa “{lastSaved.definition}” vào Sổ từ.
        </Text>
      ) : null}
      <View style={{ gap: 10 }}>
        <View style={styles.termRow}>
          <Text
            style={[styles.term, { color: c.dictHead, flex: 1 }]}
            selectable
          >
            {entry.term}
          </Text>
          <Pressable
            testID="dictionary-speak-word"
            accessibilityRole="button"
            accessibilityLabel={`Phát âm ${entry.term}`}
            onPress={() => {
              void speech.speakWord(entry.term, entry.id);
            }}
            hitSlop={10}
            style={styles.speakerButton}
          >
            <Feather name="volume-2" size={23} color={c.dictHead} />
          </Pressable>
        </View>
        {entry.courseTags?.length ? (
          <View
            testID="dictionary-course-tags"
            style={styles.courseTags}
            accessibilityLabel={`Thuộc khóa học: ${entry.courseTags.join(", ")}`}
          >
            {entry.courseTags.map((tag) => {
              const courseId = COURSE_ID_BY_TITLE.get(tag);
              const indexedTerm = COURSE_TERM_INDEX.get(
                normalizeCourseTerm(entry.term),
              );
              const lessonIds = courseId
                ? indexedTerm?.lessonIdsByCourse?.[courseId]
                : undefined;
              const tagStyle = [
                styles.courseTag,
                { backgroundColor: c.dictChip, borderColor: c.dictLine },
              ];
              const tagTextStyle = [
                styles.courseTagText,
                { color: c.dictHead },
              ];
              return courseId && lessonIds?.length ? (
                <Pressable
                  key={tag}
                  testID={`entry-course-${courseId}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Mở bài học ${tag} về ${entry.term}`}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/courses",
                      params: {
                        courseId,
                        term: entry.term,
                        lessonIds: lessonIds.join(","),
                      },
                    })
                  }
                  style={({ pressed }) => [
                    ...tagStyle,
                    { opacity: pressed ? 0.65 : 1 },
                  ]}
                >
                  <Text style={tagTextStyle}>{tag}</Text>
                  <Feather name="arrow-up-right" size={12} color={c.dictHead} />
                </Pressable>
              ) : (
                <View key={tag} style={tagStyle}>
                  <Text style={tagTextStyle}>{tag}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
        {inflectionRoots.length ? (
          <View style={styles.rootsRow}>
            {inflectionRoots.map((root) => (
              <Pressable
                key={root.id}
                testID={`entry-root-shortcut-${root.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Mở từ gốc ${root.term}`}
                onPress={() =>
                  router.push({
                    pathname: "/dictionary-entry",
                    params: { id: String(root.id) },
                  })
                }
                hitSlop={6}
                style={({ pressed }) => [
                  styles.rootShortcut,
                  {
                    backgroundColor: c.dictChip,
                    opacity: pressed ? 0.65 : 1,
                  },
                ]}
              >
                <Feather name="corner-up-right" size={14} color={c.dictHead} />
                <Text style={[styles.rootShortcutText, { color: c.dictHead }]}>
                  Từ gốc: {root.term}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {sameRegionalIpa ? (
          <View
            testID="entry-pronunciation-shared"
            style={styles.ipaRow}
          >
            <Text style={[styles.region, { color: c.dictMuted }]}>
              Anh-Mỹ · Anh-Anh
            </Text>
            <Text
              testID="entry-ipa-shared"
              style={[styles.ipa, { color: c.dictInk }]}
              selectable
            >
              {accentIpa.us.join(" · ")}
            </Text>
          </View>
        ) : (
          (["us", "uk"] as const).map((accent) => (
            <View
              key={accent}
              testID={`entry-pronunciation-${accent}`}
              style={styles.ipaRow}
            >
              <Text style={[styles.region, { color: c.dictMuted }]}>
                {accent === "us" ? "Anh-Mỹ" : "Anh-Anh"}
              </Text>
              <Text
                testID={`entry-ipa-${accent}`}
                style={[styles.ipa, { color: c.dictInk }]}
                selectable
              >
                {accentIpa[accent].join(" · ")}
              </Text>
            </View>
          ))
        )}
        {regionalIpaInstalled === false ? (
          <Pressable
            testID="entry-regional-ipa-install"
            accessibilityRole="button"
            onPress={() => router.push("/settings")}
            style={styles.ipaInstallHint}
          >
            <Feather name="download" size={14} color={c.dictMuted} />
            <Text style={[styles.ipaInstallText, { color: c.dictMuted }]}>
              Tải thêm IPA Anh-Mỹ/Anh-Anh trong Cài đặt
            </Text>
          </Pressable>
        ) : null}
        {otherPronunciations.map((p, i) => (
          <View key={`${p.ipa}-${i}`} style={styles.ipaRow}>
            {p.region ? (
              <Text style={[styles.region, { color: c.dictMuted }]}>
                {p.region.toUpperCase()}
              </Text>
            ) : null}
            <Text style={[styles.ipa, { color: c.dictInk }]} selectable>
              {p.ipa}
            </Text>
          </View>
        ))}
      </View>
      {savedCount > 0 ? (
        <Text
          testID="entry-saved-count"
          style={[styles.small, { color: c.dictMuted }]}
        >
          {savedCount} nghĩa đang hiển thị đã có trong sổ. Mỗi nghĩa là một thẻ
          ôn riêng; các nghĩa khác vẫn lưu được.
        </Text>
      ) : null}
      <View style={[styles.rule, { backgroundColor: c.dictLine }]} />
    </View>
  );

  const renderSense = ({
    item,
    index,
  }: {
    item: DictionarySense;
    index: number;
  }) => {
    const kind = [
      dictionaryPartOfSpeechLabel(item.pos),
      item.subPos?.trim(),
    ].filter(Boolean).join(" · ");
    return (
      <View
        testID={`entry-sense-${item.id}`}
        style={[styles.sense, { borderBottomColor: c.dictLine }]}
      >
        <View style={styles.senseTop}>
          <Text style={[styles.num, { color: c.dictInk }]}>{index + 1}.</Text>
          <View style={{ flex: 1, gap: 6 }}>
            {kind ? (
              <View style={[styles.kind, { backgroundColor: c.dictChip }]}>
                <Text style={[styles.kindText, { color: c.dictHead }]}>
                  {kind}
                </Text>
              </View>
            ) : null}
            <Text style={[styles.def, { color: c.dictHead }]} selectable>
              {item.definition}
            </Text>
          </View>
          {(() => {
            const existing = existingFor(item);
            const done = committed.has(senseKey(entry.id, item.id));
            const inBook = !!existing || done;
            const busy = saving === item.id;
            return (
              <Pressable
                testID={
                  inBook
                    ? `entry-sense-open-${item.id}`
                    : `entry-add-${item.id}`
                }
                accessibilityRole="button"
                disabled={
                  existing
                    ? false
                    : saving !== null || !!bookLoading || !!bookError || done
                }
                accessibilityLabel={
                  inBook
                    ? `Mở nghĩa ${index + 1} trong sổ`
                    : `Lưu nghĩa ${index + 1} vào sổ`
                }
                onPress={() => {
                  if (existing) {
                    openWord(existing.id);
                    return;
                  }
                  if (done) return;
                  void saveSense(item);
                }}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.add,
                  {
                    backgroundColor: inBook
                      ? c.dictChip
                      : pressed
                        ? c.dictAddPressed
                        : c.dictAdd,
                    borderColor: inBook ? c.border : c.buttonPressed,
                    opacity:
                      saving !== null && !busy ? 0.6 : pressed ? 0.86 : 1,
                    shadowColor: c.shade,
                    shadowOffset: { width: 0, height: pressed ? 1 : 3 },
                    shadowOpacity: pressed ? 0.06 : 0.14,
                    shadowRadius: pressed ? 2 : 5,
                    elevation: pressed ? 1 : 2,
                  },
                ]}
              >
                <MaterialSheen tone={inBook ? "navy" : "gold"} radius={18} />
                <Feather
                  name={inBook ? "book-open" : "plus-circle"}
                  size={16}
                  color={inBook ? c.dictHead : c.dictAddInk}
                />
                <Text
                  style={[
                    styles.addText,
                    { color: inBook ? c.dictHead : c.dictAddInk },
                  ]}
                >
                  {inBook
                    ? existing?.frozen
                      ? "Đóng băng"
                      : "Trong sổ"
                    : busy
                      ? "Đang lưu…"
                      : "Lưu từ"}
                </Text>
              </Pressable>
            );
          })()}
        </View>
        {item.example ? (
          <View style={styles.exRow}>
            <View style={[styles.bullet, { backgroundColor: c.dictInk }]} />
            <Text style={[styles.example, { color: c.dictInk }]} selectable>
              {exampleSegments(item.example, entry.term).map((part, index) => (
                <Text
                  key={index}
                  style={part.underline ? styles.exampleHeadword : undefined}
                >
                  {part.text}
                </Text>
              ))}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  const changeParts = (next: DictionaryPartOfSpeech[], force = false) => {
    const unchanged = next.join(",") === selectedParts.join(",");
    if (unchanged && !force && !filterError) return;
    // Invalidate in the event itself: an earlier page can finish before React
    // runs the selection effect. Never paint those rows under a new filter.
    reqRef.current += 1;
    setSenses([]);
    setHasMore(false);
    setLoadingMore(false);
    setMoreError(null);
    setFilterError(null);
    setFilterLoading(true);
    setParts(next);
    if (unchanged) setFilterTick((value) => value + 1);
  };
  const filtered = selectedParts.length > 0;
  const empty = filterLoading ? (
    <View testID="entry-filter-loading">
      <Skeleton h={80} />
      <Skeleton h={80} />
    </View>
  ) : filterError ? (
    <View style={{ gap: 10 }}>
      <ErrorBanner
        message={filterError}
        onRetry={() => changeParts(selectedParts, true)}
      />
      <Button
        testID="entry-filter-reset"
        label="Xem tất cả nghĩa"
        variant="ghost"
        onPress={() => changeParts([])}
      />
    </View>
  ) : filtered ? (
    <View testID="entry-filter-empty" style={{ gap: 10 }}>
      <Text style={[styles.small, { color: c.dictMuted }]}>
        Không có nghĩa nào thuộc từ loại đã chọn.
      </Text>
      <Button
        testID="entry-filter-reset"
        label="Xem tất cả nghĩa"
        variant="ghost"
        onPress={() => changeParts([])}
      />
    </View>
  ) : (
    <Text style={[styles.small, { color: c.dictMuted }]}>
      Mục từ này chưa có nghĩa nào.
    </Text>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.dictPage }}>
      <PartOfSpeechFilter
        available={entry.partsOfSpeech}
        selected={selectedParts}
        onChange={changeParts}
      />
      <FlatList
        testID="entry-senses"
        style={{ backgroundColor: c.dictPage }}
        data={senses}
        keyExtractor={(s) => String(s.id)}
        renderItem={renderSense}
        extraData={[
          words,
          committed,
          saving,
          bookLoading,
          bookError,
          filterLoading,
          filterError,
        ]}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        contentContainerStyle={{ padding: 20, paddingBottom: bottomPad }}
        ListEmptyComponent={empty}
        ListFooterComponent={
          moreError || hasMore ? (
            <View style={{ gap: 12, marginTop: 16 }}>
              {moreError ? (
                <ErrorBanner message={moreError} onRetry={loadMore} />
              ) : null}
              {hasMore ? (
                <Button
                  testID="entry-load-more"
                  label="Xem thêm nghĩa"
                  variant="ghost"
                  loading={loadingMore}
                  onPress={loadMore}
                />
              ) : null}
            </View>
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    minHeight: 32,
  },
  backText: { fontFamily: F.s, fontSize: 14 },
  term: { fontFamily: F.b, fontSize: 36, letterSpacing: -0.8 },
  termRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  courseTags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  courseTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  courseTagText: { fontFamily: F.s, fontSize: 12 },
  rootsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rootShortcut: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
  },
  rootShortcutText: { fontFamily: F.s, fontSize: 13 },
  speakerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  ipaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  region: { fontFamily: F.s, fontSize: 12, letterSpacing: 1, minWidth: 36 },
  ipa: { fontFamily: F.m, fontSize: 16 },
  ipaInstallHint: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 3 },
  ipaInstallText: { fontFamily: F.s, fontSize: 12 },
  notice: { padding: 14, gap: 6 },
  noticeTitle: { fontFamily: F.s, fontSize: 15 },
  small: { fontFamily: F.r, fontSize: 14, lineHeight: 20 },
  rule: { height: 1, marginTop: 4 },
  sense: { paddingVertical: 18, gap: 12, borderBottomWidth: 1 },
  senseTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  num: { fontFamily: F.b, fontSize: 17, lineHeight: 25 },
  kind: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  kindText: { fontFamily: F.s, fontSize: 12 },
  def: { fontFamily: F.s, fontSize: 17, lineHeight: 25 },
  add: {
    position: "relative",
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: 18,
  },
  addText: { fontFamily: F.s, fontSize: 13 },
  exRow: {
    flexDirection: "row",
    gap: 10,
    paddingLeft: 26,
    alignItems: "flex-start",
  },
  bullet: { width: 5, height: 5, borderRadius: 3, marginTop: 9 },
  example: { flex: 1, fontFamily: F.r, fontSize: 15, lineHeight: 22 },
  exampleHeadword: { textDecorationLine: "underline" },
});
