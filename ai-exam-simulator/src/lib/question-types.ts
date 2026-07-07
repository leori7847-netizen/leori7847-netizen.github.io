export type PracticeType =
  | "python_coding"
  | "text_labeling"
  | "bbox_labeling"
  | "monitoring_ops"
  | "dify_agent"
  | "document_ocr"
  | "image_ai"
  | "model_evaluation"
  | "flow_design";

export type RubricItem = {
  id: string;
  order: number;
  item: string;
  requirement: string;
  points: number;
  standard: string;
  remarks?: string;
};

export type Question = {
  id: string;
  title: string;
  module: string;
  moduleCode: string;
  subModuleCode: string;
  level: string;
  questionType: string;
  practiceType: PracticeType;
  timeLimitMinutes: number;
  score: number;
  toolsAndEnvironment: string;
  questionText: string;
  sourcePages: number[];
  platformTags: string[];
  rubric: RubricItem[];
};
