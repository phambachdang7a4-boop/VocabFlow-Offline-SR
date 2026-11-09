import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorBanner, F } from '@/components/ui';
import { useColors } from '@/hooks/useColors';
import { COURSE_CATALOGS } from '@/data/course-catalog';
import { listCourseProgress, type CourseLessonProgress } from '@/data/vocabulary';

export default function CourseListScreen() {
  const params = useLocalSearchParams<{ courseId?: string | string[] }>();
  const courseId = Array.isArray(params.courseId) ? params.courseId[0] : params.courseId;
  const course = useMemo(() => COURSE_CATALOGS.find(item => item.id === courseId), [courseId]);
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState<CourseLessonProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProgress(await listCourseProgress());
      setError(null);
    } catch {
      setError('Không thể đọc tiến độ bài học. Dữ liệu cũ vẫn được giữ nguyên.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!course) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.title, { color: c.foreground }]}>Không tìm thấy khóa học</Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={[styles.backText, { color: c.primary }]}>Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  const completedCount = course.lessons.filter(lesson =>
    progress.some(item => item.lessonId === lesson.id && item.completedAt),
  ).length;
  const allComplete = completedCount === course.lessons.length;
  const totalWords = course.lessons.reduce((sum, lesson) => sum + lesson.words.length, 0);

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: c.header }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại danh sách khóa học"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={22} color={c.headerForeground} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.kicker, { color: c.headerMuted }]}>KHÓA HỌC OFFLINE</Text>
          <Text style={[styles.title, { color: c.headerForeground }]} numberOfLines={1}>{course.title}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}
        <View style={[styles.summary, { backgroundColor: allComplete ? c.successSoft : c.card, borderColor: allComplete ? c.success : c.border }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryTitle, { color: c.foreground }]}>
              {totalWords.toLocaleString('vi-VN')} mục từ-nghĩa · {course.lessons.length} bài
            </Text>
            <Text style={[styles.progressText, { color: allComplete ? c.successText : c.primary }]}>
              {completedCount}/{course.lessons.length}
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: c.muted }]}>
            <View style={[
              styles.fill,
              { width: `${(completedCount / course.lessons.length) * 100}%`, backgroundColor: allComplete ? c.success : c.accent },
            ]} />
          </View>
          <Text style={[styles.attribution, { color: c.mutedForeground }]}>{course.attribution}</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: c.foreground }]}>Các bài học</Text>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={c.primary} />
            <Text style={{ color: c.mutedForeground }}>Đang tải tiến độ…</Text>
          </View>
        ) : course.lessons.map((lesson, index) => {
          const saved = progress.find(item => item.lessonId === lesson.id);
          const complete = Boolean(saved?.completedAt);
          return (
            <Pressable
              key={lesson.id}
              testID={`course-lesson-${lesson.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Bài ${index + 1}: ${lesson.title}, ${lesson.words.length} mục từ-nghĩa${complete ? ', đã hoàn thành' : ''}`}
              onPress={() => router.push(`/course/${lesson.id}` as never)}
              style={({ pressed }) => ({
                ...styles.lessonCard,
                backgroundColor: complete ? c.successSoft : c.card,
                borderColor: complete ? c.success : c.border,
                opacity: pressed ? 0.84 : 1,
              })}
            >
              <View style={[styles.lessonNumber, { backgroundColor: complete ? c.success : c.accentSoft }]}>
                {complete
                  ? <Feather name="check" size={16} color="#FFFFFF" />
                  : <Text style={[styles.lessonNumberText, { color: c.primary }]}>{index + 1}</Text>}
              </View>
              <View style={styles.lessonText}>
                <Text style={[styles.lessonTitle, { color: complete ? c.successText : c.foreground }]}>{lesson.title}</Text>
                <Text style={[styles.lessonMeta, { color: c.mutedForeground }]}>
                  {lesson.words.length} mục từ-nghĩa{saved && !complete ? ' · Đang học' : ''}
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
  center: { alignItems: 'center', justifyContent: 'center', gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 15 },
  backButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: 3 },
  kicker: { fontFamily: F.s, fontSize: 10, letterSpacing: 1.1 },
  title: { fontFamily: F.b, fontSize: 22 },
  backText: { fontFamily: F.s, fontSize: 15 },
  content: { padding: 18, paddingBottom: 40, gap: 11 },
  summary: { borderWidth: 1, borderRadius: 16, padding: 15, gap: 9 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  summaryTitle: { fontFamily: F.s, fontSize: 14, flex: 1 },
  progressText: { fontFamily: F.b, fontSize: 13 },
  track: { height: 8, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
  attribution: { fontFamily: F.r, fontSize: 10, lineHeight: 15 },
  sectionTitle: { fontFamily: F.b, fontSize: 18, marginTop: 6 },
  loading: { padding: 24, alignItems: 'center', gap: 10 },
  lessonCard: { minHeight: 70, borderRadius: 15, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  lessonNumber: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  lessonNumberText: { fontFamily: F.b, fontSize: 14 },
  lessonText: { flex: 1, gap: 3 },
  lessonTitle: { fontFamily: F.s, fontSize: 15 },
  lessonMeta: { fontFamily: F.r, fontSize: 12 },
});
