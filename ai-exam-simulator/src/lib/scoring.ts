import type { Question } from "./question-types";

export type ScoreItem = {
  rubricId: string;
  earnedPoints: number;
  maxPoints: number;
  comment: string;
};

export function sumRubricScore(question: Question, passedRubricIds: string[]): { score: number; items: ScoreItem[] } {
  const passed = new Set(passedRubricIds);
  const items = question.rubric.map((rubric) => ({
    rubricId: rubric.id,
    earnedPoints: passed.has(rubric.id) ? rubric.points : 0,
    maxPoints: rubric.points,
    comment: passed.has(rubric.id) ? "已满足该评分点" : "未满足该评分点",
  }));
  return {
    score: Math.min(question.score, items.reduce((total, item) => total + item.earnedPoints, 0)),
    items,
  };
}
