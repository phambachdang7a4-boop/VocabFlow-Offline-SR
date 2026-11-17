import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  isLearningGoalId,
  type LearningGoalId,
} from "../domain/learning-goals";

export const LEARNING_GOAL_KEY = "vocabflow.learning-goal.v1";

export async function readLearningGoal(): Promise<LearningGoalId | null> {
  const stored = await AsyncStorage.getItem(LEARNING_GOAL_KEY);
  return isLearningGoalId(stored) ? stored : null;
}

export async function writeLearningGoal(
  goal: LearningGoalId,
): Promise<void> {
  if (!isLearningGoalId(goal)) {
    throw new Error("Mục tiêu học tập không hợp lệ.");
  }
  await AsyncStorage.setItem(LEARNING_GOAL_KEY, goal);
}
