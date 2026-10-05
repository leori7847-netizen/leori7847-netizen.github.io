#!/usr/bin/env python3
"""Build the public JupyterLite notebooks from checked, static exercise sources."""

import json
from pathlib import Path

import nbformat


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "lite-src" / "files"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def notebook(question, exercise):
    question_id = question["id"]
    cells = [
        nbformat.v4.new_markdown_cell(
            f"# {question['title']}\n\n"
            f"题号：`{question_id}` · {question['level']} · "
            f"{question['timeLimitMinutes']} 分钟\n\n"
            "这是公开网站的浏览器练习本。按 `Shift + Enter` 运行当前代码单元格。"
            "首次启动 Python 内核或加载科学计算库时可能需要等待。\n\n"
            "**教学参考（非官方答案）：**左侧文件列表中打开 `教学参考.ipynb`；"
            "`逐步解析.md` 说明每一步为什么这样写。请先完成自己的答题本。"
        ),
        nbformat.v4.new_markdown_cell(
            "## 题目与交付要求\n\n"
            + question["questionText"]
            + ("\n\n**浏览器版说明：**" + exercise["note"] if exercise["note"] else "")
        ),
    ]
    if question_id == "SS-1-2-2-01":
        cells.append(nbformat.v4.new_code_cell(
            'import piplite\nawait piplite.install("jieba==0.42.1")'
        ))
    cells.extend([
        nbformat.v4.new_markdown_cell(
            "## 答题区\n\n"
            "题目中给出的空格或起始代码保留在下方。先补全，再逐格运行；"
            "运行报错时从最后一行错误信息检查。"
        ),
        nbformat.v4.new_code_cell(exercise["starter"]),
        nbformat.v4.new_markdown_cell(
            "## 完成后自查\n\n"
            "核对输出和题目要求的文件。练习保存在当前浏览器；换设备前请下载 `.ipynb`。"
        ),
    ])
    result = nbformat.v4.new_notebook(
        cells=cells,
        metadata={
            "kernelspec": {
                "display_name": "Python (Pyodide)",
                "language": "python",
                "name": "python",
            },
            "language_info": {"name": "python", "version": "3"},
        },
    )
    nbformat.validate(result)
    return result


def reference_notebook(question, exercise):
    cells = [nbformat.v4.new_markdown_cell(
        f"# {question['title']} · 教学参考\n\n"
        "这是帮助理解写法的参考实现，不是官方标准答案。请在 `answer.ipynb` "
        "独立作答；不要在本文件中覆盖自己的草稿。"
    )]
    if exercise["id"] == "SS-1-2-2-01":
        cells.append(nbformat.v4.new_code_cell(
            'import piplite\nawait piplite.install("jieba==0.42.1")'
        ))
    if exercise["explanations"]:
        cells.append(nbformat.v4.new_markdown_cell(
            "## 逐步理解\n\n" + "\n\n".join(
                f"{index}. {item}" for index, item in enumerate(exercise["explanations"], 1)
            )
        ))
    cells.append(nbformat.v4.new_code_cell(exercise["reference"]))
    result = nbformat.v4.new_notebook(
        cells=cells,
        metadata={
            "kernelspec": {"display_name": "Python (Pyodide)", "language": "python", "name": "python"},
            "language_info": {"name": "python", "version": "3"},
        },
    )
    nbformat.validate(result)
    return result


def main():
    questions = {
        item["id"]: item for item in read_json(ROOT / "data" / "questions.json")
        if item["practiceType"] in ("python_coding", "model_evaluation")
    }
    exercises = read_json(ROOT / "lite-src" / "exercises.json")
    if {item["id"] for item in exercises} != set(questions):
        raise ValueError("Public Python exercise list does not match the question bank")

    for exercise in exercises:
        question_id = exercise["id"]
        question = questions[question_id]
        directory = OUTPUT / question_id
        directory.mkdir(parents=True, exist_ok=True)
        for relative in exercise["files"]:
            if not (directory / relative).is_file():
                raise FileNotFoundError(directory / relative)
        nbformat.write(notebook(question, exercise), directory / "answer.ipynb")
        nbformat.write(reference_notebook(question, exercise), directory / "教学参考.ipynb")
        (directory / "题目.md").write_text(
            f"# {question['title']}\n\n{question['questionText']}\n", encoding="utf-8"
        )
        instructions = [
            "# 浏览器实操说明",
            "",
            "1. 双击 `answer.ipynb`，阅读题目并完成代码。",
            "2. 按 `Shift + Enter` 运行当前单元格。",
            "3. 若题目有数据附件，文件已放在本题文件夹中；按题目路径读取。",
            "4. 保存笔记本，并从菜单下载 `.ipynb` 备份。",
            "5. 先自己作答；需要核对时，打开同目录的 `教学参考.ipynb`。它不是官方标准答案。",
            "",
            "本版在当前浏览器内运行，记录不跨设备同步，也不提供本机版的交卷评分。",
        ]
        if exercise["note"]:
            instructions.extend(["", exercise["note"]])
        (directory / "操作说明.md").write_text("\n".join(instructions) + "\n", encoding="utf-8")
        if exercise["explanations"]:
            (directory / "逐步解析.md").write_text(
                "# 逐步解析\n\n" + "\n\n".join(
                    f"{index}. {text}" for index, text in enumerate(exercise["explanations"], 1)
                ) + "\n",
                encoding="utf-8",
            )
    print(f"Built {len(exercises)} browser exercise notebooks.")


if __name__ == "__main__":
    main()
