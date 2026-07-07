#!/usr/bin/env python3
"""Seed a local SQLite database from normalized JSON files."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "exam_simulator.sqlite"
QUESTIONS_PATH = ROOT / "data" / "questions.json"
RUBRICS_PATH = ROOT / "data" / "rubrics.json"


SCHEMA = """
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  module TEXT,
  moduleCode TEXT,
  subModuleCode TEXT,
  level TEXT,
  questionType TEXT,
  practiceType TEXT,
  timeLimitMinutes INTEGER,
  score INTEGER,
  toolsAndEnvironment TEXT,
  questionText TEXT,
  sourcePages TEXT,
  platformTags TEXT,
  rawText TEXT
);

CREATE TABLE IF NOT EXISTS rubrics (
  id TEXT PRIMARY KEY,
  questionId TEXT NOT NULL,
  "order" INTEGER,
  item TEXT,
  requirement TEXT,
  points INTEGER,
  standard TEXT,
  remarks TEXT
);

CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  questionId TEXT NOT NULL,
  userAnswer TEXT,
  score INTEGER,
  startedAt TEXT,
  submittedAt TEXT,
  durationSeconds INTEGER,
  timeoutPenalty INTEGER DEFAULT 0,
  mode TEXT
);

CREATE TABLE IF NOT EXISTS attempt_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attemptId INTEGER NOT NULL,
  rubricId TEXT NOT NULL,
  earnedPoints INTEGER,
  maxPoints INTEGER,
  comment TEXT
);

CREATE TABLE IF NOT EXISTS wrong_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  questionId TEXT NOT NULL,
  attemptId INTEGER,
  reason TEXT,
  createdAt TEXT
);

CREATE TABLE IF NOT EXISTS study_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module TEXT,
  level TEXT,
  practiceType TEXT,
  totalAttempts INTEGER DEFAULT 0,
  averageScore REAL DEFAULT 0,
  averageDuration REAL DEFAULT 0
);
"""


def main() -> None:
    questions = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))
    rubrics = json.loads(RUBRICS_PATH.read_text(encoding="utf-8"))
    con = sqlite3.connect(DB_PATH)
    con.executescript(SCHEMA)
    con.execute("DELETE FROM rubrics")
    con.execute("DELETE FROM questions")
    for q in questions:
        con.execute(
            """
            INSERT INTO questions (
              id, title, module, moduleCode, subModuleCode, level, questionType,
              practiceType, timeLimitMinutes, score, toolsAndEnvironment,
              questionText, sourcePages, platformTags, rawText
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                q["id"],
                q["title"],
                q["module"],
                q["moduleCode"],
                q["subModuleCode"],
                q["level"],
                q["questionType"],
                q["practiceType"],
                q["timeLimitMinutes"],
                q["score"],
                q["toolsAndEnvironment"],
                q["questionText"],
                json.dumps(q["sourcePages"], ensure_ascii=False),
                json.dumps(q["platformTags"], ensure_ascii=False),
                q["rawText"],
            ),
        )
    for r in rubrics:
        con.execute(
            """
            INSERT INTO rubrics (id, questionId, "order", item, requirement, points, standard, remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                r["id"],
                r["questionId"],
                r["order"],
                r["item"],
                r["requirement"],
                r["points"],
                r["standard"],
                r["remarks"],
            ),
        )
    con.commit()
    con.close()
    print(f"Seeded {len(questions)} questions and {len(rubrics)} rubric rows -> {DB_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
