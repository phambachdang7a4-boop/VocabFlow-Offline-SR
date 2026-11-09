import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { ScreenHeader, useBottomPad } from '@/components/ScreenHeader';
import { ErrorBanner, F, MaterialSheen } from '@/components/ui';
import { useColors } from '@/hooks/useColors';
import { COURSE_CATALOGS } from '@/data/course-catalog';
import { listCourseProgress, type CourseLessonProgress } from '@/data/vocabulary';

export default function CoursesScreen() {
  const c = useColors();
  const bottom = useBottomPad();
  const [progress, setProgress] = useState<CourseLessonProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const completedIds = new Set(progress.filter(item => item.completedAt).map(item => item.lessonId));

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

        <Text style={[styles.sectionTitle, { color: c.foreground }]}>Chọn khóa học</Text>
        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={c.primary} /><Text style={{ color: c.mutedForeground }}>Đang tải tiến độ…</Text></View>
        ) : COURSE_CATALOGS.map(course => {
          const completedCount = course.lessons.filter(lesson => completedIds.has(lesson.id)).length;
          const allComplete = course.lessons.length > 0 && completedCount === course.lessons.length;
          const wordCount = course.lessons.reduce((sum, lesson) => sum + lesson.words.length, 0);
          return (
            <Pressable
              key={course.id}
              testID={`course-card-${course.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${course.title}, ${course.lessons.length} bài học, ${wordCount} mục từ-nghĩa, đã hoàn thành ${completedCount} bài`}
              onPress={() => router.push(`/course-list/${course.id}` as never)}
              style={({ pressed }) => ({
                ...styles.courseCard,
                backgroundColor: allComplete ? c.successSoft : c.card,
                borderColor: allComplete ? c.success : c.border,
                opacity: pressed ? 0.84 : 1,
                shadowColor: c.shade, shadowOffset: { width: 0, height: pressed ? 1 : 4 },
                shadowOpacity: pressed ? 0.06 : 0.14, shadowRadius: pressed ? 2 : 7, elevation: pressed ? 1 : 3,
              })}
            >
              <MaterialSheen radius={20} />
              <View style={[styles.courseIcon, { backgroundColor: allComplete ? c.success : c.vocabCardAccent }]}>
                <Feather name={allComplete ? 'check' : 'book-open'} size={23} color={allComplete ? '#FFFFFF' : c.buttonForeground} />
              </View>
              <View style={styles.courseText}>
                <Text style={[styles.courseEyebrow, { color: allComplete ? c.successText : c.primary }]}>
                  {allComplete ? 'ĐÃ HOÀN THÀNH' : 'KHÓA HỌC OFFLINE'}
                </Text>
                <Text style={[styles.courseTitle, { color: allComplete ? c.successText : c.foreground }]}>{course.title}</Text>
                <Text style={[styles.courseMeta, { color: c.mutedForeground }]}>
                  {course.lessons.length} bài · {wordCount.toLocaleString('vi-VN')} mục từ-nghĩa
                </Text>
                {course.missingCount || course.skippedDuplicateCount ? (
                  <Text style={[styles.courseNote, { color: c.mutedForeground }]}>
                    {course.sourceCount} mục nguồn · thiếu {course.missingCount} trong kho · bỏ trùng {course.skippedDuplicateCount}
                  </Text>
                ) : null}
                <View style={styles.progressRow}>
                  <View style={[styles.track, styles.progressTrack, { backgroundColor: c.muted }]}>
                    <View style={[
                      styles.fill,
                      { width: `${(completedCount / course.lessons.length) * 100}%`, backgroundColor: allComplete ? c.success : c.accent },
                    ]} />
                  </View>
                  <Text style={[styles.progressText, { color: allComplete ? c.successText : c.primary }]}>
                    {completedCount}/{course.lessons.length}
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color={allComplete ? c.success : c.mutedForeground} />
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
  courseCard: { position: 'relative', borderWidth: 1, borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  courseIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  courseText: { flex: 1, gap: 3 },
  courseEyebrow: { fontFamily: F.s, fontSize: 10, letterSpacing: 1.2 },
  courseTitle: { fontFamily: F.b, fontSize: 22 },
  courseMeta: { fontFamily: F.m, fontSize: 13 },
  courseNote: { fontFamily: F.r, fontSize: 11, lineHeight: 15 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  progressTrack: { flex: 1 },
  progressText: { fontFamily: F.b, fontSize: 12, minWidth: 36, textAlign: 'right' },
  track: { height: 8, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
  sectionTitle: { fontFamily: F.b, fontSize: 18, marginTop: 6 },
  loading: { padding: 24, alignItems: 'center', gap: 10 },
});
