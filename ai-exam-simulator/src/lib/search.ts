import type { Question } from "./question-types";

export function questionMatchesKeyword(question: Question, keyword: string): boolean {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return true;
  return [question.id, question.title, question.module, question.level, question.questionText, question.platformTags.join(" ")]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}
