# 人工智能算法测试员操作技能模拟考试平台

这是理论刷题站下的实操模拟平台子应用，入口路径为：

```text
./ai-exam-simulator/
```

## 新增题库附件核对（2026-10-03）

本机 `人工智能技师/` 中的 257 页 PDF 与本站 `docs/question_bank.pdf` 的 SHA-256 完全一致；36 个题号均已在 `data/questions.json` 中。原始 `题目附件/` 共 33 个文件，其中 31 个与本站逐字节相同。`SS-4-5-5-01/数据.xlsx` 保持本站已有的姓名和电话脱敏版本，不使用原始个人信息。

`SS-2-2-2-01` 的 `demo_dataset.zip` 约 390 MB，含 10,000 张交通图片和对应 YOLO TXT 标注。原始 ZIP 在本地放到 `data/attachments/SS-2-2-2-01/`；题目详情、零基础跟练和 BBox 质检页提供下载。BBox 页展示从 ZIP 中抽取的 5 组真实样例，可改写标签、逐行检查类别与坐标、下载检查通过的 TXT。页面只对当前样例做格式和边界检查；完整数据集的批量分析、漏标判断及 A/B/C 分类仍需在原始附件上完成。原始 ZIP 和预览图片已加入 Git 忽略，不随公开网站发布。

如果搬迁项目或重新取得 ZIP，在项目目录运行以下命令重建预览：

```sh
python3 scripts/build_bbox_preview.py
```

## 本地运行

推荐从实操平台目录启动本地服务，它会同时服务实操平台和上级理论题库。第一次使用真实 Python 运行功能时，先创建独立环境并安装依赖：

```bash
cd /Users/kk/Desktop/Codex输出/人工智能训练师考试/question_practice_site/ai-exam-simulator
/Users/kk/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m venv --system-site-packages .venv
.venv/bin/python3 -m pip install -r requirements-local.txt
.venv/bin/python3 -c "import pandas, sklearn, PIL; print('Python 环境可用')"
```

上面的 Python 3.12 路径是这台 Mac 当前已验证可用的路径。如果它以后不存在，请改用你安装的 Python 3.11 或更新版本创建 `.venv`；不要直接用本机当前的系统 Python 3.9。

然后启动服务：

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

在“Python编程”中选择 `SS-6-4-4-04` 可运行线损计算题；选择 `SS-5-4-4-01` 至 `SS-5-4-4-04` 会看到与各自原题一致的 13 处代码填空，填齐后再点“运行 Python”。四题分别使用逻辑回归线损 CSV、随机森林电费风险 CSV、随机森林覆冰 CSV、逻辑回归终端通信 CSV。覆冰题有 9 个特征、F1 合格线是 0.85；终端通信题也有 9 个特征、F1 合格线是 0.80，实际 CSV 列名 `CPU利用率` 和 `内存利用率` 不含空格。四题的填空草稿分别保存在当前浏览器，也可以各自一键清空。点进任一空格会显示这一空的简明解释；代码框下方的“逐空解析”可展开查看全部答案和原因。运行结果区会显示真实标准输出、错误和针对常见错误的提示。其余 Python 题暂保留结构检查，未标为可真实运行。直接用 `file://` 打开页面或使用公开网站时，Python 运行接口不可用。

`SS-4-3-3-02` 图像预处理题有独立本地操作台。选中此题后，从空白 `.py` 文件编写脚本；运行时服务会在临时目录放入三张模拟 JPG 和一张不应处理的 PNG，真实执行你的代码，并预览生成的 `augmented_images/` 图片。可下载脚本及逐张输出图。20 项检查分别标记“通过”“未通过”或“待人工复核”，不生成官方分数；原 PDF 配分栏为空，题头 60 分钟与末项 90 分钟有矛盾。模拟素材由生成的绝缘子图片制成，不是原题附件。要重新生成静态练习图片，可运行 `.venv/bin/python3 scripts/build_image_practice_fixtures.py`。

`SS-6-4-4-02`“智能文本生成系统性能测试”按原题归入 Python 编程，不使用通用流程节点画布。其专用操作台提供 90 分钟题干、Python 编辑器、练习骨架、空白重练、真实运行输出、`.py` 下载和按题库第 234–235 页整理的自查项。参考实现只是教学示例，不是官方答案；自查勾选不是自动评分。题设 2% 的随机失败率并不保证 10 次请求中必有失败。启动本地服务后在“Python编程”选择该题即可；代码运行在本机，不要执行来源不明的脚本。

在“流程设计”选择 `SS-6-4-4-03` 可练习“智能客服系统业务数据处理流程设计”。这道题的专用操作台按题库第 237–239 页设置七环节流程图、中英西及混合语分支、清洗与标准化规则表、验证样例、90 分钟计时和交卷核对。填写内容自动保存于当前浏览器；“空白重练”及“载入示例方案”均需在页面上再次确认，后者只是教学参考。可导出 SVG 流程图及可用 Excel 打开的 CSV 规则表。题库只指定 Excel 与流程绘图软件，没有指定考场软件界面或文件格式；导出格式是本地练习选择，并非官方交卷要求。核对页只提示字段覆盖，不给出虚构的考试分数。

`SS-4-4-4-03`“变电站表记读数识别流程设计”有按原题动作制作的专属操作台。打开本地站点后，在“题库浏览”搜索题号，进入“题目详情”点“独立实操”，或在“老师带练”点“打开操作台”；也可直接访问 `#/practice/meter`。先开始 60 分钟计时，打开图片查看器逐张观察 5 张原题照片，填写照片 1～3 的读数，再写完整识别流程、算法及优势、照片 4～5 的误差原因与处理办法。交卷前关闭图片查看器，点击“交卷并检查”。页面准确核对 3 个读数，并列出主观题的原评分要点供人工自查；不运行 YOLO 或 DeepLabv3+，也不生成未经核实的官方分数。草稿保存在当前浏览器，“空白重练”需二次确认。

终端通信题使用随题 CSV 和原题逻辑回归代码时，F1 可能低于 0.80；这表示模型指标未达标，不等于 Python 运行失败。按题目要求如实输出判断结果。

代码在你的 Mac 上执行，运行接口只监听 `127.0.0.1`，每次使用独立临时目录，并设置超时与输出限制；但这**不是操作系统级安全沙箱**，只能运行自己写的或确认可信的代码，不要粘贴陌生脚本。练习代码和记录仍保存在当前浏览器；服务不会保存用户代码。

运行接口自检：

```bash
node --test server/python-runtime.test.mjs
```

## 公开发布说明

GitHub Pages 发布版本只包含脱敏后的运行数据和静态页面。以下来源文件不提交到公网仓库：

公开站已为全部 15 道 Python 与模型评估题提供 JupyterLite 练习本。点击“Python编程”，选题后点“打开浏览器 Jupyter”即可在浏览器内运行 Python，无需安装本地环境。各题保留原题的代码空格或从头编写方式；CSV 放在同题号目录，图像增强题使用明确标注的模拟图片。中文分词题会在浏览器中安装 `jieba`，模型题首次导入 `pandas` 与 `scikit-learn` 时需要下载组件。

浏览器内核使用 Pyodide。`SS-6-4-4-02` 性能测试题使用 `asyncio` 模拟 5 人并发；原题线程池写法需在本地 Jupyter 练习。浏览器练习记录保存在当前浏览器；换设备或清除网站数据前，应从 Jupyter 菜单下载 `.ipynb`。公开版不连接本地自动评分接口，也不读取 `.local-jupyter/`。

重新生成公开浏览器环境：

```sh
python3 scripts/build_public_lite_content.py
python3 -m venv .jupyterlite-build-env
.jupyterlite-build-env/bin/pip install -r requirements-public-lite.txt
.jupyterlite-build-env/bin/jupyter lite build --lite-dir lite-src --output-dir lite --apps lab --no-sourcemaps --no-unused-shared-packages
```

`lite-src/exercises.json` 保存已核对的起始代码及题目索引，`lite-src/files/` 保存本批公开练习素材。推送这些源文件后，GitHub Actions 自动生成并提交 `lite/` 静态文件；公开站仍使用现有 GitHub Pages 分支发布方式。

真实本机内核、自动检查、工作区和交卷记录仍只在按上文步骤启动的本机服务中使用；`.local-jupyter/` 不发布。流程绘图等纯浏览器练习仍可在公开站点使用，记录只保存在当前浏览器。
公开题目只带不含个人信息的练习 CSV 和模拟图像；其他原始附件（包括评论数据及现场照片）仍只留在本机。依赖附件的看图读数与 BBox 质检需回到本机练习。

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

- 零基础跟练：从首页“从零跟练第1题”进入；线损计算与图像预处理题提供分步讲解、写法提示、代码草稿和逐步结构检查。
- 其他题：从题库列表点“跟练”，先看基础概念与操作顺序，再写练习记录并逐项自评。没有专用操作台的题不会跳到别的题。
- Python 编程题：线损计算题 `SS-6-4-4-04` 支持真实本地 Python 运行和练习参考评分。点击“运行并参考评分”后，系统核对原题四条输出，再替换为未展示的测试数据复测计算、分类及 8% 边界；成功运行时自动核验上限 90 分。若语法错误或运行失败，系统仍从有效代码结构中检查数据、循环、字段、公式和判断条件，最多可得 46 分参考分，运行结果项不得分；只写关键词或注释不计分。代码规范 10 分留给人工核对。原卷配分列尚未核实，这套权重不是官方考试分数；修改代码后旧结果会清除。模型测试 `SS-5-4-4-01` 至 `SS-5-4-4-04` 各按原题提供 13 处填空，并支持各自真实 CSV、pandas 和 scikit-learn 运行。`SS-6-4-4-02` 提供 Python 性能测试专用操作台。其他结构检查仅是参考分。其余 Python 题尚未接入真实运行，也不会生成图片等题目成果。
- 文本标注题：评论清洗、正面/负面/中性标注、统计、导出 CSV。
- 流程设计题：`SS-6-4-4-03` 使用独立的流程图及规则表操作台；其余流程题暂用通用节点画布与参考结构检查，不能把参考分当成真实考试分数。
- 表记读数题：`SS-4-4-4-03` 使用原题 5 张现场照片的独立考试操作台，练人工读数、流程设计及误差分析；不提供未经训练的自动识别结果。
- BBox 质检题：YOLO label 检查界面已预留。
- Dify 题：按当前需求先保留入口和题库识别，暂不展开。
- 模拟考试：支持等级、模块、题量、随机/顺序、倒计时、交卷报告、错题记录。
- 学习分析：练习次数、平均分、错题和模块掌握度看板。

### 从零开始练一题

1. 打开本地网址，直接进入题库或实操跟练，无需密码。
2. 首页点击“从零跟练第1题”，依次阅读每一步的讲解，在右侧代码区自己完成该步；需要时展开写法提示。
3. 点击“检查这一步”，根据缺失项修改代码，再进入下一步。草稿自动保存在当前浏览器。
4. 完成后点“转入独立练习”，在代码区点“运行 Python”看真实输出或报错，再修改代码；“检查代码结构”的参考分不等于真实运行成绩。
5. 图像预处理题可从题库搜索 `SS-4-3-3-02` 先跟练，再点“打开操作台”。独立操作台有模拟图片，可直接练习真实运行；它们不代表考场原图。

## 自检

```bash
node server/validate.mjs
```

该命令会检查页面路由、题库 JSON、题库页码、评分标准，以及 Python、标注、流程设计三类必需题型。


## 新版题库同步

当前实操平台已按 2026 版操作技能题库重新抽取，并按技能等级分类：

```text
初级工：3 题
中级工：3 题
高级工：6 题
技师：12 题
高级技师：12 题
```

如需从 PDF 重新生成运行数据：

```bash
cd /Users/kk/Desktop/Codex输出/人工智能训练师考试/question_practice_site/ai-exam-simulator
python3 scripts/extract_pdf.py
python3 scripts/normalize_questions.py
node server/validate.mjs
```

新版题目附件已同步到：

```text
data/attachments/<题号>/
```

题目详情页会显示该题对应附件；页面运行数据会自动移除来源单位字样，避免公开页面出现来源单位名称。
# 本机 Jupyter 考试环境（2026-10-03）

Python 编程与模型评估共 15 道题现统一进入真实 JupyterLab。网站保留题目、教学解析、用时和提交反馈；Jupyter 负责编辑单元格、运行内核、管理数据文件和保存笔记本。

## 启动

在本项目目录执行（要求 Python 3.10+ 和 Node.js 20+）：

```sh
python3 -m venv .venv
.venv/bin/python3 -m pip install -r requirements-local.txt
npm run dev
```

打开 `http://127.0.0.1:5173/theory/ai-exam-simulator/#/practice/python`。选择题目后网站会自动启动本机 Jupyter 并准备文件，点击“打开 JupyterLab”进入真实笔记本。Jupyter 使用空闲本机端口及自动生成的认证令牌，无需手动输入密码。网站和 Jupyter 只监听 `127.0.0.1`。如 5173 已被其他项目占用，可用 `PORT=5174 npm run dev`，并访问对应端口。

## 一次完整练习

1. 选择题目及“教学练习”或“模拟考试”，打开 JupyterLab。
2. 左侧文件列表中，`题目.md` 是题目，`answer.ipynb` 是本轮答题文件。CSV 保留题设目录结构；图像题使用已标明的模拟图片。
3. 补全代码或编写完整脚本。选中单元格，按 Shift+Enter 运行；使用 Kernel 菜单中断或重启内核。
4. 使用 File → Save Notebook（或 Ctrl+S / Command+S）保存 `answer.ipynb`。
5. 回网站点击“提交已保存答案”。检查使用磁盘中最后保存的内容，在新内核及原始数据副本中重新执行，保留原答题文件。
6. 查看输出、错误和已接入的专项检查。下载 `.py`、带检查输出的 `.ipynb` 或完整交卷 ZIP。

教学模式提供 `教学参考.ipynb`、`逐步解析.md`；考试模式不在本轮文件夹生成这些文件，保留题设代码空缺并记录倒计时。模拟考试不锁卷，也不是防作弊系统。可以在真正考试前练习从空白内核“Restart Kernel and Run All”。

“新一轮练习”创建新文件夹，旧轮次不会删除。已有的网页草稿可通过“导入旧网页草稿”转入新笔记本，浏览器中的旧记录仍保留。不要修改 `answer.ipynb` 的文件名；检查入口读取该文件。

## 数据与评分边界

所有练习、笔记本和交卷档案保存在 `.local-jupyter/`，已加入 Git 忽略，不作为网站静态文件发布。工作区下按题号、模式和轮次分目录。停止 `npm run dev` 会同时停止由其启动的 Jupyter；重启后从网站重新打开笔记本即可恢复磁盘文件。

全部题目支持真实运行和干净内核复查。线损计算题保留原有练习参考评分（含运行失败时可核对的部分分）；图片题保留文件及尺寸等逐项检查；其他题目前显示运行与交付文件检查，不虚构官方分数。数据指标未达到题设门槛不一定意味着代码错误，应结合题意核对。

## 验证

```sh
.venv/bin/python3 scripts/check-jupyter.py
npm run test:python
node --check app.js
```

验证脚本使用临时目录，在真实新内核中执行全部 15 题的教学参考实现，并检查旧草稿保留、新建轮次、错误反馈和路径限制；不会修改学生的练习工作区。未填完的考试模板本来就不可正确运行，需先作答。

---
