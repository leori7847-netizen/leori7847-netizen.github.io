#!/usr/bin/env python3
"""Normalize extracted PDF text into question and rubric JSON files.

The parser keeps the original page text in every question so later manual
review can repair table extraction quirks without losing source context.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from statistics import mean


ROOT = Path(__file__).resolve().parents[1]
RAW_PATH = ROOT / "data" / "raw_pdf_text.json"
QUESTIONS_PATH = ROOT / "data" / "questions.json"
RUBRICS_PATH = ROOT / "data" / "rubrics.json"
MODULES_PATH = ROOT / "data" / "modules.json"
LEVELS_PATH = ROOT / "data" / "levels.json"

LEVELS = ["初级工", "中级工", "高级工", "技师", "高级技师"]
TITLE_OVERRIDES = {
    "SS-3-2-2-01": "您负责监控一台负责模型推理的GPU服务器（显存24GB，CPU8核），请按照业务要求正确编写告警规则",
}

MODULES = {
    "SS-1": "数据采集和处理",
    "SS-2": "数据标注",
    "SS-3": "智能系统运维",
    "SS-4": "业务分析",
    "SS-5": "智能训练",
    "SS-6": "智能系统设计",
}


def clean_text(value: str) -> str:
    value = value.replace("版权属相关单位", "")
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def one_line(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def find_question_starts(pages: list[dict]) -> list[int]:
    starts: list[int] = []
    for index, page in enumerate(pages):
        text = page["text"]
        if "技能考核试题" not in text or "评分标准" in text:
            continue
        if re.search(r"编号\s+SS-\d+-\d+-\d+-\d+", text) and "试题正文" in text:
            starts.append(index)
    return starts


def get_id(text: str) -> str:
    match = re.search(r"编号\s+(SS-\d+-\d+-\d+-\d+)", text)
    if match:
        return match.group(1)
    match = re.search(r"(SS-\d+-\d+-)\s*(\d+-\d+)", text)
    if match:
        return f"{match.group(1)}{match.group(2)}"
    return ""


def get_title(text: str) -> str:
    match = re.search(r"试题正文\s+(.+?)\n(?:工具、设备、场地|已安装|普通办公|考核要求)", text, re.S)
    if match:
        return one_line(match.group(1))
    line = next((item for item in text.splitlines() if "试题正文" in item), "")
    return one_line(line.replace("试题正文", ""))


def get_tools(text: str) -> str:
    lines = text.splitlines()
    for index, line in enumerate(lines):
        if "工具、设备、场地" in line:
            current = one_line(line.split("工具、设备、场地", 1)[1])
            extra = []
            for next_line in lines[index + 1 : index + 4]:
                if any(stop in next_line for stop in ["根据", "给定", "你作为", "作为", "请", "具体考核"]):
                    break
                extra.append(one_line(next_line))
            return one_line(" ".join([current, *extra]))
    return ""


def get_question_body(text: str) -> str:
    match = re.search(r"试题正文\s+(.+)", text, re.S)
    return clean_text(match.group(1) if match else text)


def get_time_and_score(text: str) -> tuple[int, int]:
    match = re.search(r"单位\s+(\d{2,3})\s+题分\s+(\d{2,3})", text)
    if match:
        return int(match.group(1)), int(match.group(2))
    time_match = re.search(r"考试时限.*?(\d{2,3})", text, re.S)
    score_match = re.search(r"题分\s+(\d{2,3})", text)
    return int(time_match.group(1)) if time_match else 60, int(score_match.group(1)) if score_match else 100


def get_level(question_id: str, text: str) -> str:
    parts = question_id.split("-")
    if len(parts) >= 4:
        return {"1": "初级工", "2": "中级工", "3": "高级工", "4": "技师", "5": "高级技师"}.get(parts[3], "")
    head = text.split("试题正文", 1)[0]
    pattern = re.compile("高级技师|初级工|中级工|高级工|技师")
    matches = list(pattern.finditer(head))
    return matches[-1].group(0) if matches else ""


def get_codes(question_id: str, text: str) -> tuple[str, str]:
    module_code = question_id.rsplit("-", 4)[0] if question_id else ""
    module_code = "-".join(question_id.split("-")[:2]) if question_id else module_code
    sub = ""
    matches = re.findall(r"SS-\d+-\d+", text)
    if matches:
        sub = matches[-1]
    elif question_id:
        sub = "-".join(question_id.split("-")[:3])
    return module_code, sub


def classify(title: str, question_id: str, text: str) -> tuple[str, list[str]]:
    blob = f"{title} {text}"
    tags: list[str] = []
    practice = "flow_design"

    if question_id.startswith("SS-1"):
        practice = "python_coding"
        tags.extend(["Python", "CSV", "pandas"])
    elif question_id.startswith("SS-2-1") or any(key in title for key in ["情感分析", "评论"]):
        practice = "text_labeling"
        tags.extend(["Python", "文本标注", "情感分析"])
    elif question_id.startswith("SS-2-2") or any(key in title for key in ["YOLO", "边界框", "目标检测"]):
        practice = "bbox_labeling"
        tags.extend(["YOLOv5", "bbox", "标注质检"])
    elif question_id.startswith("SS-3") or any(key in title for key in ["告警", "GPU", "监控"]):
        practice = "monitoring_ops"
        tags.extend(["监控", "告警规则"])
    elif question_id.startswith("SS-5") or any(key in title for key in ["黄金测试", "稳健性", "分层评估", "能力矩阵", "算法测试", "训练流程优化"]):
        practice = "model_evaluation"
        tags.extend(["模型评估", "黄金测试集"])
    elif question_id.startswith("SS-6") or any(key in title for key in ["流程设计", "规范设计", "系统设计", "计算设计", "优化方案设计", "业务数据处理流程"]):
        practice = "flow_design"
        tags.extend(["流程图", "电网业务"])
    elif any(key in title for key in ["文档识别", "OCR", "铭牌"]):
        practice = "document_ocr"
        tags.extend(["OCR", "字段抽取"])
    elif any(key in title for key in ["图片识别", "图像", "表记读数"]):
        practice = "image_ai"
        tags.extend(["图像识别"])
    elif any(key in title for key in ["Dify", "智能体", "知识库", "天气助手", "企业大脑", "问数"]):
        practice = "dify_agent"
        tags.extend(["智能体", "流程编排"])

    if "jieba" in blob or "文本特征" in title:
        tags.extend(["jieba", "TF-IDF", "sklearn"])
    if "Dify" in blob:
        tags.append("Dify")
    return practice, sorted(set(tags))


def rubric_from_score_text(question_id: str, score_text: str, total_score: int) -> list[dict]:
    text = clean_text(score_text)
    after = text.split("评分标准", 1)[-1]
    lines = [one_line(line) for line in after.splitlines() if one_line(line)]
    items: list[dict] = []
    current: dict | None = None
    for line in lines:
        match = re.match(r"^(\d{1,2})\s+(.+)", line)
        if match:
            if current:
                items.append(current)
            order = int(match.group(1))
            item = match.group(2)
            current = {
                "id": f"{question_id}-R{order:02d}",
                "questionId": question_id,
                "order": order,
                "item": item[:80],
                "requirement": item,
                "points": 0,
                "standard": "",
                "remarks": "",
            }
        elif current:
            current["standard"] = one_line(f"{current['standard']} {line}")
    if current:
        items.append(current)
    if not items:
        items = [
            {
                "id": f"{question_id}-R01",
                "questionId": question_id,
                "order": 1,
                "item": "PDF评分标准",
                "requirement": "按PDF原评分标准逐项评分",
                "points": total_score,
                "standard": clean_text(score_text),
                "remarks": "自动抽取未能拆表，请人工校对。",
            }
        ]
    non_timeout = [item for item in items if "超时" not in item["item"]]
    even_points = total_score // max(1, len(non_timeout))
    for item in items:
        if "超时" in item["item"]:
            item["points"] = 0
            item["remarks"] = "每超1分钟扣1分，超过5分钟停止操作。"
        elif item["points"] == 0:
            item["points"] = even_points
    return items


def patch_key_rubrics(questions: list[dict], rubrics: list[dict]) -> None:
    by_id = {q["id"]: q for q in questions}
    replacements: dict[str, list[tuple[str, str, int, str]]] = {
        "SS-1-1-1-01": [
            ("导入必要的库", "正确导入所需的库 import pandas as pd", 8, "检查代码包含 pandas 导入。"),
            ("读取CSV格式的业务数据集", "data=pd.read_csv('business_data.csv')", 8, "检查 read_csv 和 business_data.csv。"),
            ("去除空格", "使用 applymap/strip 或等价方式去除字符串空格", 8, "检查 strip 处理。"),
            ("转换日期类型", "将 order_date 列转换为 datetime 日期类型", 10, "检查 to_datetime 和 order_date。"),
            ("处理缺失值", "amount 列缺失值用该列平均值填充", 10, "检查 fillna 和 mean。"),
            ("过滤异常值", "过滤 amount 小于0的异常值", 10, "检查 amount >= 0。"),
            ("删除重复记录", "删除数据集中的重复记录", 8, "检查 drop_duplicates。"),
            ("定义金额区间", "根据 amount 值标记低额/中额/高额", 10, "检查 amount_level 或 get_amount_level。"),
            ("新增 amount_level 列", "新增 amount_level 字段", 8, "检查 amount_level 列赋值。"),
            ("打印统计结果", "输出总行数、amount均值、最大值", 10, "检查 print、mean、max。"),
            ("保存 cleaned_data.csv", "将清洗后的数据集保存为 cleaned_data.csv", 10, "检查 to_csv 和 cleaned_data.csv。"),
        ],
        "SS-1-2-2-01": [
            ("导入必要的库", "导入 pandas、jieba、TfidfVectorizer", 12, "检查 pandas、jieba、TfidfVectorizer。"),
            ("读取文本CSV", "读取 text_classification_data.csv", 10, "检查 read_csv。"),
            ("定义停用词", "自定义常见中文停用词列表", 10, "检查 stopwords。"),
            ("中文分词和去停用词", "使用 jieba 对 content 分词并去除停用词", 18, "检查 jieba.lcut 与过滤逻辑。"),
            ("TF-IDF特征提取", "使用 sklearn TfidfVectorizer 生成特征向量", 18, "检查 TfidfVectorizer 和 fit_transform。"),
            ("打印预览与特征形状", "打印前3条处理结果和 TF-IDF shape", 12, "检查 head/shape/print。"),
            ("保存 cleaned_text.csv", "保存处理后的文本数据", 20, "检查 to_csv 和 cleaned_text.csv。"),
        ],
        "SS-2-1-1-01": [
            ("检查数据集", "读取 input_data.csv 并验证评论文本、用户ID字段", 15, "字段检查完整得分。"),
            ("明确类别定义", "定义正面、负面、中性情感类别", 15, "至少能区分正面/负面/中性。"),
            ("数据清洗", "去除HTML标签、特殊字符和空白行", 25, "手工或脚本模式均可。"),
            ("完成情感标注", "为每条清洗后的评论标注正面/负面/中性", 25, "检查标注完成率和类别合理性。"),
            ("统计与导出", "统计数量和占比并导出清洗标注结果", 20, "检查统计表和导出动作。"),
        ],
        "SS-6-3-3-01": [
            ("全流程覆盖", "包含数据来源、采集方式、传输协议、处理步骤、存储方案", 25, "流程节点覆盖完整。"),
            ("数据安全保障", "整合数据加密、访问控制、权限管理、脱敏等安全措施", 20, "符合电力行业数据安全规范。"),
            ("数据质量保证", "包含完整性校验、异常检测、缺失补全或修复策略", 20, "支撑高精度时序数据需求。"),
            ("流程合理性", "步骤清晰、衔接合理，符合电网设备监测业务场景", 20, "流程顺序和连接合理。"),
            ("合规性与创新性", "包含合规要求和流程优化创新点", 15, "体现法规标准和优化思路。"),
        ],
    }
    rubrics[:] = [item for item in rubrics if item["questionId"] not in replacements]
    for question_id, rows in replacements.items():
        if question_id not in by_id:
            continue
        for order, row in enumerate(rows, start=1):
            item, requirement, points, standard = row
            rubrics.append(
                {
                    "id": f"{question_id}-R{order:02d}",
                    "questionId": question_id,
                    "order": order,
                    "item": item,
                    "requirement": requirement,
                    "points": points,
                    "standard": standard,
                    "remarks": "",
                }
            )
    rubrics.sort(key=lambda item: (item["questionId"], item["order"]))
    rubric_map: dict[str, list[dict]] = {}
    for item in rubrics:
        rubric_map.setdefault(item["questionId"], []).append({k: v for k, v in item.items() if k != "questionId"})
    for question in questions:
        question["rubric"] = rubric_map.get(question["id"], question.get("rubric", []))




def rebuild_embedded_rubrics(questions: list[dict], rubrics: list[dict]) -> None:
    rubrics.sort(key=lambda item: (item["questionId"], item["order"], item["item"]))
    counters: dict[str, int] = {}
    grouped: dict[str, list[dict]] = {}
    for item in rubrics:
        question_id = item["questionId"]
        counters[question_id] = counters.get(question_id, 0) + 1
        item["order"] = counters[question_id]
        item["id"] = f"{question_id}-R{item['order']:02d}"
        grouped.setdefault(question_id, []).append({k: v for k, v in item.items() if k != "questionId"})
    for question in questions:
        question["rubric"] = grouped.get(question["id"], [])


def make_question(index: int, pages: list[dict], start: int, end: int) -> tuple[dict, list[dict]]:
    q_pages = pages[start:end]
    q_text = clean_text("\n".join(page["text"] for page in q_pages))
    question_id = get_id(q_text) or f"SS-AUTO-{index:03d}"
    title = TITLE_OVERRIDES.get(question_id) or get_title(q_text) or f"未命名试题 {index}"
    time_limit, score = get_time_and_score(q_text)
    module_code, sub_code = get_codes(question_id, q_text)
    module = MODULES.get(module_code, "")
    level = get_level(question_id, q_text)
    practice_type, tags = classify(title, question_id, q_text)
    score_start = end
    score_end = end
    while score_end < len(pages):
        next_text = pages[score_end]["text"]
        if score_end > score_start and "技能考核试题" in next_text and "评分标准" not in next_text and "试题正文" in next_text:
            break
        if "评分标准" not in next_text and score_end > score_start + 8:
            break
        score_end += 1
        if score_end < len(pages) and score_end in QUESTION_STARTS:
            break
    score_pages = [page["pageNumber"] for page in pages[score_start:score_end] if "评分标准" in page["text"] or page["pageNumber"] > pages[score_start]["pageNumber"] - 1]
    score_text = clean_text("\n".join(page["text"] for page in pages[score_start:score_end]))
    rubrics = rubric_from_score_text(question_id, score_text, score)
    question = {
        "id": question_id,
        "title": title,
        "module": module,
        "moduleCode": module_code,
        "subModuleCode": sub_code,
        "evaluationContent": "",
        "level": level,
        "questionType": "实际操作题",
        "timeLimitMinutes": time_limit,
        "score": score,
        "toolsAndEnvironment": get_tools(q_text),
        "questionText": get_question_body(q_text),
        "sourcePages": [page["pageNumber"] for page in q_pages],
        "rubricPages": score_pages,
        "platformTags": tags,
        "practiceType": practice_type,
        "inputFiles": infer_inputs(title, q_text, practice_type),
        "expectedOutputFiles": infer_outputs(title, q_text, practice_type),
        "rubric": [{k: v for k, v in item.items() if k != "questionId"} for item in rubrics],
        "timeoutRule": "每超1分钟扣1分，超过5分钟停止操作",
        "rawText": q_text,
    }
    return question, rubrics


def infer_inputs(title: str, text: str, practice_type: str) -> list[str]:
    files = sorted(set(re.findall(r"[\w_]+\.csv|[\w_]+\.txt|[\w_]+\.pdf|[\w_]+\.docx", text)))
    if practice_type == "python_coding" and "business_data.csv" not in files and "业务数据" in text:
        files.append("business_data.csv")
    if practice_type == "text_labeling" and not files:
        files.append("input_data.csv")
    if practice_type == "flow_design":
        files.append("流程节点模板.json")
    return files


def infer_outputs(title: str, text: str, practice_type: str) -> list[str]:
    files = sorted(set(re.findall(r"cleaned_[\w_]+\.csv|[\w_]+_report\.csv|[\w_]+\.json", text)))
    if "cleaned_data.csv" in text and "cleaned_data.csv" not in files:
        files.append("cleaned_data.csv")
    if "cleaned_text.csv" in text and "cleaned_text.csv" not in files:
        files.append("cleaned_text.csv")
    if practice_type == "text_labeling":
        files.extend(["labeled_comments.csv", "sentiment_stats.csv"])
    if practice_type == "flow_design":
        files.append("flow_design.json")
    return sorted(set(files))


def main() -> None:
    raw = json.loads(RAW_PATH.read_text(encoding="utf-8"))
    pages = raw["pages"]
    global QUESTION_STARTS
    QUESTION_STARTS = set(find_question_starts(pages))
    starts = sorted(QUESTION_STARTS)
    questions: list[dict] = []
    rubrics: list[dict] = []
    for pos, start in enumerate(starts, start=1):
        next_start = starts[pos] if pos < len(starts) else len(pages)
        score_start = next((idx for idx in range(start + 1, next_start) if "评分标准" in pages[idx]["text"]), next_start)
        question, question_rubrics = make_question(pos, pages, start, score_start)
        questions.append(question)
        rubrics.extend(question_rubrics)
    patch_key_rubrics(questions, rubrics)
    rebuild_embedded_rubrics(questions, rubrics)
    modules = []
    for code, name in MODULES.items():
        module_questions = [q for q in questions if q["moduleCode"] == code]
        modules.append(
            {
                "code": code,
                "name": name,
                "questionCount": len(module_questions),
                "levels": sorted(set(q["level"] for q in module_questions if q["level"])),
                "practiceTypes": sorted(set(q["practiceType"] for q in module_questions)),
            }
        )
    level_rows = [
        {
            "name": level,
            "questionCount": len([q for q in questions if q["level"] == level]),
            "modules": sorted(set(q["module"] for q in questions if q["level"] == level and q["module"])),
        }
        for level in LEVELS
    ]
    QUESTIONS_PATH.write_text(json.dumps(questions, ensure_ascii=False, indent=2), encoding="utf-8")
    RUBRICS_PATH.write_text(json.dumps(rubrics, ensure_ascii=False, indent=2), encoding="utf-8")
    MODULES_PATH.write_text(json.dumps(modules, ensure_ascii=False, indent=2), encoding="utf-8")
    LEVELS_PATH.write_text(json.dumps(level_rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Normalized {len(questions)} questions, {len(rubrics)} rubric rows")
    print(f"Average rubric rows/question: {mean([len(q['rubric']) for q in questions]):.1f}")


QUESTION_STARTS: set[int] = set()


if __name__ == "__main__":
    main()
