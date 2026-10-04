#!/usr/bin/env python3
"""Build the sanitized starter content for the public JupyterLite site."""

import json
from pathlib import Path

import nbformat


ROOT = Path(__file__).resolve().parents[1]
QUESTION_ID = "SS-6-4-4-04"
OUTPUT_DIR = ROOT / "lite-src" / "files" / QUESTION_ID


def load_json(path: Path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def main():
    questions = load_json(ROOT / "data" / "questions.json")
    seeds = load_json(ROOT / "data" / "notebook-seeds.json")
    question = next(item for item in questions if item["id"] == QUESTION_ID)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    notebook = nbformat.v4.new_notebook(
        metadata={
            "kernelspec": {
                "display_name": "Python (Pyodide)",
                "language": "python",
                "name": "python",
            },
            "language_info": {"name": "python", "version": "3"},
        }
    )
    notebook.cells = [
        nbformat.v4.new_markdown_cell(
            f"# {question['title']}\n\n"
            f"题号：`{QUESTION_ID}` · {question['level']} · {question['timeLimitMinutes']} 分钟\n\n"
            "这是公开网站的浏览器练习本。Python 在当前浏览器中运行，不需要安装本机环境。"
            "首次启动内核需要联网加载组件，可能要等待几十秒。"
        ),
        nbformat.v4.new_markdown_cell(
            "## 操作要求\n\n"
            "逐条读取四个台区的数据，计算线损电量和线损率，并按规则输出状态：\n\n"
            "- 线损电量 = 供电量 - 售电量\n"
            "- 线损率 = 线损电量 / 供电量 × 100，保留两位小数\n"
            "- 线损率大于 8%：高线损异常\n"
            "- 线损电量小于 0：负线损异常\n"
            "- 其他情况：线损正常\n\n"
            "完成后按 `Shift + Enter` 运行代码。"
        ),
        nbformat.v4.new_code_cell(seeds["samples"]["lineLossStarter"]),
        nbformat.v4.new_markdown_cell(
            "## 运行后自查\n\n"
            "应打印 4 行，每行包含台区编号、名称、供电量、售电量、线损电量、线损率和状态。\n\n"
            "练习会自动保存在当前浏览器。换手机或清除浏览器数据后不会自动同步，"
            "请用菜单 `文件 → 下载` 保存笔记本。"
        ),
    ]
    nbformat.write(notebook, OUTPUT_DIR / "answer.ipynb")

    question_text = (
        f"# {question['title']}\n\n"
        f"- 题号：{QUESTION_ID}\n"
        f"- 等级：{question['level']}\n"
        f"- 时限：{question['timeLimitMinutes']} 分钟\n"
        f"- 交付文件：{', '.join(question.get('expectedOutputFiles', []))}\n\n"
        "## 题目正文\n\n"
        f"{question['questionText']}\n"
    )
    (OUTPUT_DIR / "题目.md").write_text(question_text, encoding="utf-8")

    guide = """# 浏览器实操说明

1. 双击 `answer.ipynb` 打开答题本。
2. 点击代码单元格，在注释下方补写代码。
3. 按 `Shift + Enter` 运行当前单元格；第一次运行需等待浏览器 Python 内核启动。
4. 出现红色输出表示代码报错，从最后一行错误信息开始检查。
5. 使用 `文件 → 保存笔记本` 保存到当前浏览器。
6. 需要带走答案时，使用 `文件 → 下载` 导出 `.ipynb`。

注意：这是浏览器内 Python，不是服务器 Jupyter。关闭页面后记录通常仍在本浏览器中，
但不会自动同步到其他手机或电脑，也不提供本地版的自动评分与交卷 ZIP。
"""
    (OUTPUT_DIR / "操作说明.md").write_text(guide, encoding="utf-8")


if __name__ == "__main__":
    main()
