# 人工智能算法测试员操作技能模拟考试平台

这是理论刷题站下的实操模拟平台子应用，入口路径为：

```text
./ai-exam-simulator/
```

## 本地运行

推荐从实操平台目录启动内置静态服务，它会同时服务实操平台和上级理论题库：

```bash
cd /Users/kk/Desktop/Codex输出/人工智能训练师考试/question_practice_site/ai-exam-simulator
node server/static-dev.mjs
```

打开：

```text
http://127.0.0.1:5173/theory/
http://127.0.0.1:5173/theory/ai-exam-simulator/
```

如果 5173 已被占用，先结束旧服务或改用其他静态服务端口。

## 公开发布说明

GitHub Pages 发布版本只包含脱敏后的运行数据和静态页面。以下来源文件不提交到公网仓库：

```text
docs/question_bank.pdf
data/raw_pdf_text.json
data/exam_simulator.sqlite
```

前端实际读取：

```text
data/questions.json
data/rubrics.json
data/modules.json
data/levels.json
data/demo_datasets/*.csv
```

## 题库数据

`data/questions.json` 是页面运行用题库，包含题号、题干、模块、等级、题库页码、评分标准和推荐练习类型。公开数据不保留原始 OCR 全文 `rawText` 字段。

新增题目至少包含：

```json
{
  "id": "SS-x-x-x-xx",
  "title": "题目名称",
  "module": "能力模块",
  "level": "技能等级",
  "practiceType": "python_coding",
  "timeLimitMinutes": 60,
  "score": 100,
  "questionText": "脱敏后的题干",
  "sourcePages": [5],
  "rubric": []
}
```

支持的 `practiceType` 包括 `python_coding`、`text_labeling`、`bbox_labeling`、`monitoring_ops`、`dify_agent`、`document_ocr`、`image_ai`、`model_evaluation`、`flow_design`。

## 当前覆盖

- Python 编程题：在线代码区、模拟运行、逐项评分、控制台输出。
- 文本标注题：评论清洗、正面/负面/中性标注、统计、导出 CSV。
- 流程设计题：节点画布、标准模板、一键检查、导出 JSON。
- BBox 质检题：YOLO label 检查界面已预留。
- Dify 题：按当前需求先保留入口和题库识别，暂不展开。
- 模拟考试：支持等级、模块、题量、随机/顺序、倒计时、交卷报告、错题记录。
- 学习分析：练习次数、平均分、错题和模块掌握度看板。

## 自检

```bash
node server/validate.mjs
```

该命令会检查页面路由、题库 JSON、题库页码、评分标准，以及 Python、标注、流程设计三类必需题型。
