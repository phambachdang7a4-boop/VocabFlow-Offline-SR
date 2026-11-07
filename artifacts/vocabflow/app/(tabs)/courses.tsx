import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { ScreenHeader, useBottomPad } from '@/components/ScreenHeader';
import { ErrorBanner, F } from '@/components/ui';
import { useColors } from '@/hooks/useColors';
import { BASIC_COURSE_LESSONS, BASIC_COURSE_TITLE, BASIC_COURSE_WORD_COUNT } from '@/data/basic-course';
import { listCourseProgress, type CourseLessonProgress } from '@/data/vocabulary';

export default function CoursesScreen() {
  const c = useColors();
  const bottom = useBottomPad();
  const [progress, setProgress] = useState<CourseLessonProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const completedIds = new Set(progress.filter(item => item.completedAt).map(item => item.lessonId));
  const completedCount = completedIds.size;
  const allComplete = completedCount === BASIC_COURSE_LESSONS.length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProgress(await listCourseProgress());
      setError(null);
    } catch {
      setError('Không thể đọc tiến độ khóa học. Dữ liệu cũ vẫn được giữ nguyên.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScreenHeader kicker="HỌC THEO CHỦ ĐỀ" title="Khóa Học" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom }]} showsVerticalScrollIndicator={false}>
        {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}

        <View style={[
          styles.courseCard,
          { backgroundColor: allComplete ? c.successSoft : c.vocabCard, borderColor: allComplete ? c.success : c.vocabCard },
        ]}>
          <View style={[styles.courseIcon, { backgroundColor: allComplete ? c.success : c.vocabCardAccent }]}>
            <Feather name={allComplete ? 'check' : 'book-open'} size={23} color={allComplete ? '#FFFFFF' : c.buttonForeground} />
          </View>
          <View style={styles.courseText}>
            <Text style={[styles.courseEyebrow, { color: allComplete ? c.successText : c.vocabCardMuted }]}>
              {allComplete ? 'ĐÃ HOÀN THÀNH' : 'KHÓA HỌC OFFLINE'}
            </Text>
            <Text style={[styles.courseTitle, { color: allComplete ? c.successText : c.vocabCardForeground }]}>{BASIC_COURSE_TITLE}</Text>
            <Text style={[styles.courseMeta, { color: allComplete ? c.successText : c.vocabCardMuted }]}>
              {BASIC_COURSE_LESSONS.length} bài học · {BASIC_COURSE_WORD_COUNT.toLocaleString('vi-VN')} mục từ-nghĩa
            </Text>
          </View>
        </View>

        <View style={[styles.summary, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryTitle, { color: c.foreground }]}>Tiến độ khóa học</Text>
            <Text style={[styles.summaryValue, { color: allComplete ? c.successText : c.primary }]}>
              {completedCount}/{BASIC_COURSE_LESSONS.length} bài
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: c.muted }]}>
            <View style={[
              styles.fill,
              { width: `${(completedCount / BASIC_COURSE_LESSONS.length) * 100}%`, backgroundColor: allComplete ? c.success : c.accent },
            ]} />
          </View>
          <Text style={[styles.summaryNote, { color: c.mutedForeground }]}>
            Từ chỉ được thêm vào Sổ từ khi bạn chọn ở cuối bài.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: c.foreground }]}>Các bài học</Text>
        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={c.primary} /><Text style={{ color: c.mutedForeground }}>Đang tải tiến độ…</Text></View>
        ) : BASIC_COURSE_LESSONS.map((lesson, index) => {
          const complete = completedIds.has(lesson.id);
          const saved = progress.find(item => item.lessonId === lesson.id);
          return (
            <Pressable
              key={lesson.id}
              testID={`course-lesson-${lesson.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Bài ${index + 1}: ${lesson.title}, ${lesson.words.length} từ${complete ? ', đã hoàn thành' : ''}`}
              onPress={() => router.push(`/course/${lesson.id}` as never)}
              style={({ pressed }) => [
                styles.lessonCard,
                {
                  backgroundColor: complete ? c.successSoft : c.card,
                  borderColor: complete ? c.success : c.border,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <View style={[
                styles.lessonNumber,
                { backgroundColor: complete ? c.success : c.accentSoft },
              ]}>
                {complete
                  ? <Feather name="check" size={17} color="#FFFFFF" />
                  : <Text style={[styles.lessonNumberText, { color: c.primary }]}>{index + 1}</Text>}
              </View>
              <View style={styles.lessonInfo}>
                <Text style={[styles.lessonTitle, { color: complete ? c.successText : c.foreground }]}>{lesson.title}</Text>
                <Text style={[styles.lessonMeta, { color: c.mutedForeground }]}>
                  {lesson.words.length} từ{saved && !complete ? ' · Đang học' : ''}
                </Text>
              </View>
              <Feather name={complete ? 'check-circle' : 'chevron-right'} size={20} color={complete ? c.success : c.mutedForeground} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 12 },
  courseCard: { borderWidth: 1, borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  courseIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  courseText: { flex: 1, gap: 3 },
  courseEyebrow: { fontFamily: F.s, fontSize: 10, letterSpacing: 1.2 },
  courseTitle: { fontFamily: F.b, fontSize: 22 },
  courseMeta: { fontFamily: F.m, fontSize: 13 },
  summary: { borderWidth: 1, borderRadius: 16, padding: 15, gap: 10 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryTitle: { fontFamily: F.s, fontSize: 15 },
  summaryValue: { fontFamily: F.b, fontSize: 14 },
  track: { height: 8, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
  summaryNote: { fontFamily: F.r, fontSize: 12, lineHeight: 18 },
  sectionTitle: { fontFamily: F.b, fontSize: 18, marginTop: 6 },
  loading: { padding: 24, alignItems: 'center', gap: 10 },
  lessonCard: { minHeight: 76, borderRadius: 15, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  lessonNumber: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  lessonNumberText: { fontFamily: F.b, fontSize: 15 },
  lessonInfo: { flex: 1, gap: 3 },
  lessonTitle: { fontFamily: F.s, fontSize: 15 },
  lessonMeta: { fontFamily: F.r, fontSize: 12 },
});
