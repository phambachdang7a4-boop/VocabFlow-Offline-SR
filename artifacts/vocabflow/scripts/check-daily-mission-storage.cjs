const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createRepository, loadTs } = require('./test-support.cjs');

const missionDomain = loadTs(join(__dirname, '../domain/daily-missions.ts'));
const candidateDays = ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'];
const day = candidateDays.find((candidate) =>
  missionDomain.evaluateDailyMissions(candidate, {
    reviewedCount: 0,
    addedWordCount: 0,
    completedLessonCount: 0,
    qualifiedGradeCount: 0,
  }, []).some((mission) => mission.type === 'grade'),
);
const gradeMission = missionDomain.evaluateDailyMissions(day, {
  reviewedCount: 0,
  addedWordCount: 0,
  completedLessonCount: 0,
  qualifiedGradeCount: 0,
}, []).find((mission) => mission.type === 'grade');
const root = mkdtempSync(join(tmpdir(), 'vocabflow-daily-missions-'));
const harness = createRepository(root, `${day}T12:00:00`);

(async () => {
  try {
    for (let index = 0; index < gradeMission.target; index += 1) {
      await harness.repo.recordReviewSessionResult({
        sessionId: `qualified-session-${index}`,
        startedAt: new Date(`${day}T12:00:00`).getTime(),
        reviewedCount: 30,
        correctCount: 27,
        grade: 'A',
        completed: true,
      });
    }

    const firstOverview = await harness.repo.getDailyMissionOverview(day);
    const firstGradeMission = firstOverview.missions.find((mission) => mission.type === 'grade');
    assert.equal(firstGradeMission.progress, firstGradeMission.target);
    assert.equal(firstGradeMission.rewarded, true, 'The eligible grade mission grants its Stone.');
    assert.equal(firstOverview.stoneBalance, firstGradeMission.stoneReward);

    await harness.repo.recordReviewSessionResult({
      sessionId: 'qualified-session-0',
      startedAt: new Date(`${day}T12:00:00`).getTime(),
      reviewedCount: 30,
      correctCount: 27,
      grade: 'A',
      completed: true,
    });
    const secondOverview = await harness.repo.getDailyMissionOverview(day);
    assert.equal(secondOverview.stoneBalance, firstOverview.stoneBalance, 'Retrying the same session cannot duplicate Stone.');
    assert.equal(secondOverview.missions.find((mission) => mission.type === 'grade').rewarded, true);

    const nextDay = candidateDays[candidateDays.indexOf(day) + 1];
    const nextDayOverview = await harness.repo.getDailyMissionOverview(nextDay);
    assert.ok(nextDayOverview.missions.every((mission) => mission.progress === 0 && !mission.rewarded), 'Daily progress resets on the next day.');
    assert.equal(nextDayOverview.stoneBalance, firstOverview.stoneBalance, 'Previously earned Stone carries forward.');
  } finally {
    harness.db.close();
    rmSync(root, { recursive: true, force: true });
  }
  console.log('Daily mission storage, grade qualification, and exactly-once Stone passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
