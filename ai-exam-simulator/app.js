const app = document.querySelector("#app");
const STORE_KEY = "ai_skill_exam_state_v1";
const DATA_VERSION = "2026100401";
const LEVEL_ORDER = ["初级工", "中级工", "高级工", "技师", "高级技师"];

const navItems = [
  ["#/", "首页看板"],
  ["#/bank", "题库浏览"],
  ["#/exam", "模拟考试"],
  ["#/practice/python", "Python编程"],
  ["#/practice/labeling", "数据标注"],
  ["#/practice/flow", "流程设计"],
  ["#/practice/bbox", "BBox质检"],
  ["#/practice/dify", "Dify沙盘"],
  ["#/wrong", "错题本"],
  ["#/analytics", "学习分析"],
  ["#/settings", "设置"],
];

const practiceNames = {
  python_coding: "Python编程",
  text_labeling: "文本标注",
  bbox_labeling: "BBox质检",
  monitoring_ops: "系统运维",
  dify_agent: "Dify智能体",
  document_ocr: "文档识别",
  image_ai: "图像识别",
  model_evaluation: "模型评估",
  flow_design: "流程设计",
};

const state = {
  questions: [],
  modules: [],
  levels: [],
  filters: { keyword: "", module: "", level: "", practiceType: "", page: "" },
  pythonQuestionId: "",
  pythonCode: "",
  pythonResult: null,
  pythonRuntime: null,
  notebooks: {},
  lessonQuestionId: "",
  lessonStep: 0,
  labels: [],
  labelResult: null,
  flowQuestionId: "",
  flowNodes: [],
  flowResult: null,
  bboxPreview: null,
  bboxPreviewLoading: false,
  bboxPreviewError: "",
  bboxResult: null,
  caseFlowTab: "diagram",
  caseFlowConfirm: "",
  caseFlowSelected: "",
  caseFlowConnecting: "",
  meterPhoto: 0,
  meterZoom: 1,
  meterTab: "readings",
  exam: null,
  store: loadStore(),
};

const samples = {
  comments: [
    { id: "c1", raw: "<p>服务响应很快，识别结果准确，体验满意。</p>", clean: "", label: "" },
    { id: "c2", raw: "系统卡顿!!! 多次上传失败，真的失望。", clean: "", label: "" },
    { id: "c3", raw: "功能基本可用，界面还可以继续优化。", clean: "", label: "" },
    { id: "c4", raw: "报表导出稳定，推荐在班组培训使用。", clean: "", label: "" },
  ],
  pythonTemplate: `import pandas as pd

data = pd.read_csv("business_data.csv")
data = data.applymap(lambda x: x.strip() if isinstance(x, str) else x)
data["order_date"] = pd.to_datetime(data["order_date"], errors="coerce")
data["amount"].fillna(data["amount"].mean(), inplace=True)
data = data[data["amount"] >= 0]
data.drop_duplicates(inplace=True)

def get_amount_level(amt):
    if amt <= 100:
        return "低额"
    if amt <= 500:
        return "中额"
    return "高额"

data["amount_level"] = data["amount"].apply(get_amount_level)
print(f"清洗后数据总行数：{len(data)}")
print(f"amount列均值：{data['amount'].mean():.2f}")
print(f"amount列最大值：{data['amount'].max():.2f}")
data.to_csv("cleaned_data.csv", index=False)
`,
  lineLossStarter: `data = [
    {"id": "T001", "name": "城东 1 区", "supply": 12500, "sell": 11800},
    {"id": "T002", "name": "城东 2 区", "supply": 9800, "sell": 9750},
    {"id": "T003", "name": "城西 1 区", "supply": 15200, "sell": 13600},
    {"id": "T004", "name": "城西 2 区", "supply": 8600, "sell": 8900},
]

# 请在下方遍历数据，计算线损电量、线损率并判断状态。
`,
  lineLossAnswer: `data = [
    {"id": "T001", "name": "城东 1 区", "supply": 12500, "sell": 11800},
    {"id": "T002", "name": "城东 2 区", "supply": 9800, "sell": 9750},
    {"id": "T003", "name": "城西 1 区", "supply": 15200, "sell": 13600},
    {"id": "T004", "name": "城西 2 区", "supply": 8600, "sell": 8900},
]

for item in data:
    supply = item["supply"]
    sell = item["sell"]
    loss = supply - sell
    loss_rate = round(loss / supply * 100, 2)

    if loss_rate > 8:
        status = "高线损异常"
    elif loss < 0:
        status = "负线损异常"
    else:
        status = "线损正常"

    print(item["id"], item["name"], supply, sell, loss, loss_rate, status)
`,
  imagePreprocessStarter: `from pathlib import Path
import random
from PIL import Image, ImageEnhance

INPUT_DIR = Path("raw_images")
OUTPUT_DIR = Path("augmented_images")
TARGET_SIZE = 512

# 请完成：批量重命名、填充、随机裁剪、旋转、亮度/对比度增强和保存。
`,
  imagePreprocessAnswer: `from pathlib import Path
import random
from PIL import Image, ImageEnhance

INPUT_DIR = Path("raw_images")
OUTPUT_DIR = Path("augmented_images")
TARGET_SIZE = 512

def rename_images(input_dir):
    files = sorted(path for path in input_dir.iterdir() if path.suffix.lower() == ".jpg")
    renamed = []
    for index, path in enumerate(files, start=1):
        new_path = input_dir / f"insulator_defect_{index:04d}.jpg"
        if path != new_path:
            path.rename(new_path)
        renamed.append(new_path)
    return renamed

def pad_to_minimum(image):
    width, height = image.size
    if width < TARGET_SIZE or height < TARGET_SIZE:
        canvas = Image.new("RGB", (max(width, TARGET_SIZE), max(height, TARGET_SIZE)), (0, 0, 0))
        canvas.paste(image, ((canvas.width - width) // 2, (canvas.height - height) // 2))
        return canvas
    return image

def augment(image):
    image = pad_to_minimum(image)
    left = random.randint(0, image.width - TARGET_SIZE)
    top = random.randint(0, image.height - TARGET_SIZE)
    image = image.crop((left, top, left + TARGET_SIZE, top + TARGET_SIZE))
    angle = random.uniform(-15.0, 15.0)
    image = image.rotate(angle, resample=Image.Resampling.BICUBIC, fillcolor=(0, 0, 0))
    image = ImageEnhance.Brightness(image).enhance(random.uniform(0.8, 1.2))
    image = ImageEnhance.Contrast(image).enhance(1.5)
    return image

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for path in rename_images(INPUT_DIR):
        try:
            with Image.open(path) as image:
                result = augment(image.convert("RGB"))
                output_path = OUTPUT_DIR / f"{path.stem}_aug.jpg"
                result.save(output_path, quality=95)
                print(f"已保存：{output_path}")
        except OSError as error:
            print(f"跳过 {path.name}：{error}")

if __name__ == "__main__":
    main()
`,
  flowTemplate: [
    "数据源",
    "数据采集",
    "加密传输",
    "访问控制",
    "数据校验",
    "数据清洗",
    "异常检测",
    "缺失补全",
    "时序数据库",
    "模型测试",
    "监控告警",
    "人工审核",
    "结果反馈",
  ],
  performanceStarter: `import random
import time
from concurrent.futures import ThreadPoolExecutor

class TextGeneratorSimulator:
    def __init__(self, delay_ms=200, error_rate=0.02):
        self.delay_ms = delay_ms
        self.error_rate = error_rate

    def generate(self, prompt):
        # 任务 1：模拟响应延迟、随机失败，并返回一段续写文本。
        raise NotImplementedError("请先完成 generate 方法")


simulator = TextGeneratorSimulator(delay_ms=200, error_rate=0.02)
prompts = [
    "今天天气", "智能电表", "设备巡检", "故障预警", "客户服务",
    "数据质量", "模型训练", "安全生产", "节能方案", "应急处置",
]

def send_request(number, prompt):
    # 任务 2：记录开始时间，调用 generate，捕获失败，返回状态和耗时。
    raise NotImplementedError("请先完成 send_request 函数")


# 任务 3：依次发送 10 条不同文本，打印每条请求的状态与耗时。

# 任务 4：用 ThreadPoolExecutor(max_workers=5) 模拟 5 人并发。

# 任务 5：输出成功率、平均响应时间、吞吐量和最大/最小响应时间。

print(send_request(1, prompts[0]))  # 完成任务 2 后，可先运行这一条验证。
`,
  performanceAnswer: `import random
import time
from concurrent.futures import ThreadPoolExecutor

class TextGeneratorSimulator:
    def __init__(self, delay_ms=200, error_rate=0.02):
        self.delay_ms = delay_ms
        self.error_rate = error_rate

    def generate(self, prompt):
        delay = max(0, random.uniform(0.8, 1.2) * self.delay_ms / 1000)
        time.sleep(delay)
        if random.random() < self.error_rate:
            raise RuntimeError("模拟请求失败")
        return prompt + "，后续内容由模拟器生成。"


simulator = TextGeneratorSimulator(delay_ms=200, error_rate=0.02)
prompts = [
    "今天天气", "智能电表", "设备巡检", "故障预警", "客户服务",
    "数据质量", "模型训练", "安全生产", "节能方案", "应急处置",
]

def send_request(number, prompt):
    start = time.perf_counter()
    try:
        text = simulator.generate(prompt)
        status = "成功"
    except RuntimeError as error:
        text = str(error)
        status = "失败"
    elapsed_ms = (time.perf_counter() - start) * 1000
    return {"number": number, "prompt": prompt, "status": status,
            "elapsed_ms": elapsed_ms, "text": text}


def report(name, results, wall_seconds):
    print("\\n" + name)
    for row in results:
        print(f"请求{row['number']:02d} {row['prompt']} {row['status']} "
              f"{row['elapsed_ms']:.1f}ms {row['text']}")
    times = [row["elapsed_ms"] for row in results]
    success = sum(row["status"] == "成功" for row in results)
    print(f"成功率：{success / len(results):.1%}")
    print(f"平均响应时间：{sum(times) / len(times):.1f}ms")
    print(f"吞吐量：{len(results) / wall_seconds:.2f}次/秒")
    print(f"最短/最长响应：{min(times):.1f}ms / {max(times):.1f}ms")


start = time.perf_counter()
sequential = [send_request(i, prompt) for i, prompt in enumerate(prompts, 1)]
report("顺序测试：10 条不同文本", sequential, time.perf_counter() - start)

start = time.perf_counter()
with ThreadPoolExecutor(max_workers=5) as pool:
    concurrent = list(pool.map(send_request, range(1, 11), prompts))
report("并发测试：5 个用户", concurrent, time.perf_counter() - start)
`,
};

const caseFlowStages = [
  ["input", "数据输入", "来源、接入方式和原文保留"],
  ["detect", "多语言识别", "识别语种及混合语处理方式"],
  ["language", "分语言处理", "在下方四个分支分别填写规则"],
  ["clean", "文本清洗", "过滤冗余符号、空白和噪声"],
  ["normalize", "标准化转换", "大小写、缩写与词形统一"],
  ["quality", "质量校验", "空值、编码、语言标记等校验"],
  ["store", "输出存储", "记录格式、保存位置及交付方式"],
];
const caseFlowBranches = [
  ["zh", "中文", "分词与中文处理"],
  ["en", "英文", "词形还原等处理"],
  ["es", "西语", "重音及词形处理"],
  ["mixed", "混合语", "分段识别、回退或复核"],
];
const caseFlowRules = [
  ["special", "特殊字符", "说明过滤规则与 @#* 的保留条件"],
  ["caseRule", "大小写", "说明统一策略及适用范围"],
  ["abbreviations", "缩写对照", "至少写出一组原词 → 标准词"],
  ["extension", "新增语种", "描述配置文件或插件接口如何扩展"],
  ["encoding", "字符编码", "说明 UTF-8 写入及校验方式"],
  ["lineFormat", "单行格式", "说明每句一行的结构及换行处理"],
  ["languageTag", "语言标签", "说明标签取值及混合语标记"],
];
const caseFlowSampleRows = [
  { raw: "电费 APP 无法登录!!!", language: "", output: "" },
  { raw: "I CAN'T log in!!!", language: "", output: "" },
  { raw: "¿Dónde está mi factura??", language: "", output: "" },
  { raw: "电费 bill #123??", language: "", output: "" },
];
const caseFlowExample = {
  input: "接入咨询文本，记录请求编号与原文，统一按 UTF-8 读取。",
  detect: "识别中文、英文、西语；混合语按语段识别，低置信度转人工复核。",
  language: "按识别结果路由到对应规则，处理后汇入统一清洗环节。",
  zh: "中文分词；保留业务词、电费编号等专有表达。",
  en: "英文词形还原，将时态和复数归一。",
  es: "西语重音统一处理，保留或映射重音形式并记录规则。",
  mixed: "中英西语分段处理，再按原顺序拼接；无法判定的片段标记待复核。",
  clean: "去掉重复标点与多余空格，按业务白名单保留 @#*。",
  normalize: "英文统一小写；按缩写对照表替换，再执行各语种词形规则。",
  quality: "检查空文本、重复、语言标签、编码和业务符号；不合格数据进入复核队列。",
  store: "输出 UTF-8 JSONL：每句一行，含 id、language、cleaned_text；保存至指定目录。",
  special: "过滤无关控制字符及重复标点；保留账号 @、工单 # 和业务通配符 *。",
  caseRule: "英文字符统一小写；中文不受影响，业务编号保持原样。",
  abbreviations: "u → you；can't → cannot；保留对照表以便更新。",
  extension: "按语种代码加载独立规则配置；新增语种只需注册处理器与配置文件。",
  encoding: "写入时指定 UTF-8，读取导出文件时再验证编码。",
  lineFormat: "每条咨询输出一行 JSON，文本中的换行转为空格或转义。",
  languageTag: "使用 zh、en、es、mixed 四类标签，识别不确定时标记 review。",
};

const modelFillTemplate = `import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, f1_score
from sklearn.linear_model import LogisticRegression

data = pd.read_csv("____1____")
data = data.____2____().drop_duplicates().reset_index(drop=True)
X = data[____3____]
y = data[____4____]
X_train, X_test, y_train, y_test = train_test_split(X, y,
test_size=____5____, random_state=2026, stratify=____6____)
scaler = StandardScaler()
X_train_s = scaler.____7____(X_train)
X_test_s = scaler.____8____(X_test)
model = LogisticRegression(max_iter=2000, random_state=2026)
model.____9____(X_train_s, y_train)
y_pred = model.____10____(X_test_s)
accuracy = ____11____(y_test, y_pred)
f1 = ____12____(y_test, y_pred)
print("准确率：", accuracy)
print("F1：", f1)
print("F1 达到要求" if f1 >= ____13____ else "F1 未达到要求")
`;
const modelFillAnswers = [
  "04/SS-5-4-4-01_line_loss.csv", "dropna",
  '["供电量", "售电量", "用户数", "变压器容量", "平均负载率", "低电压用户占比", "运行年限", "线路总长度"]',
  '"是否异常"', "0.2", "y", "fit_transform", "transform", "fit", "predict", "accuracy_score", "f1_score", "0.70",
];
const modelFillHints = [
  "CSV 路径，不要再加引号", "清除缺失值的方法名", "8 个特征组成的 Python 列表，要带方括号", "标签列名称，要带引号",
  "测试集比例", "用于分层的标签变量", "在训练集上拟合并转换", "只转换测试集", "训练模型", "生成预测",
  "计算准确率的函数", "计算 F1 的函数", "F1 合格阈值",
];
const modelFillExplanations = [
  "read_csv 要知道从哪里读取数据。题目已给出文件路径；代码外面已有引号，所以空里不用再加引号。",
  "dropna 会删除含缺失值的行。题目已经写好后面的括号，这里只需填方法名；接下来还会去重和重新编号。",
  "这 8 列是模型判断异常时使用的线索，合称特征 X。一次选择多列，要把列名写成带方括号的列表；外层 data[...] 已写好。",
  "“是否异常”是模型要预测的正确答案列，称为标签 y。列名是文字，所以这一空要带引号。",
  "test_size 是留给测试的数据比例。0.2 表示 20% 测试、80% 训练，对应题目要求的 8:2。",
  "stratify=y 表示按“是否异常”的比例分层抽样，避免训练集或测试集里异常样本的比例偶然失衡。",
  "训练集要先让标准化器学习规则（fit），再按规则转换数据（transform），合起来就是 fit_transform。",
  "测试集只使用训练集学到的标准化规则进行转换，不能再次 fit；否则就提前用测试数据参与学习了。",
  "fit 是训练：把训练集的线索 X_train_s 和正确答案 y_train 交给逻辑回归模型学习。",
  "predict 是预测：让训练好的模型根据测试集线索 X_test_s 给出判断，结果存在 y_pred。",
  "accuracy_score 将预测和真实答案比较，算出总体有多少比例判断对了，这叫准确率。",
  "f1_score 同时考虑“报出的异常有多准”和“真正的异常找到了多少”。这题关注漏检，所以不能只看准确率。",
  "0.70 是题目指定的 F1 合格线；程序算出的 F1 达到它才显示“达到要求”，不是把 F1 固定写成 0.70。",
];
const randomForestFillTemplate = modelFillTemplate
  .replace("from sklearn.linear_model import LogisticRegression", "from sklearn.ensemble import RandomForestClassifier")
  .replace("LogisticRegression(max_iter=2000, random_state=2026)", "RandomForestClassifier(n_estimators=100, random_state=2026)");
const modelFillTasks = {
  "SS-5-4-4-01": {
    template: modelFillTemplate,
    answers: modelFillAnswers,
    hints: modelFillHints,
    explanations: modelFillExplanations,
  },
  "SS-5-4-4-02": {
    template: randomForestFillTemplate,
    answers: [
      "04/SS-5-4-4-02_payment_risk.csv", "dropna",
      '["月均用电量", "用电波动率", "平均账期", "历史违约次数", "客户星级", "行业类型", "合同容量", "入网年限"]',
      '"是否违约"', ...modelFillAnswers.slice(4),
    ],
    hints: modelFillHints,
    explanations: modelFillExplanations.map((text, index) => ({
      2: "这 8 列是判断客户是否可能违约的线索，合称特征 X。一次选多列要用带方括号的列表；外层 data[...] 已写好。列名要与 CSV 完全一致。",
      3: "“是否违约”是模型要预测的正确答案列，称为标签 y。列名是文字，所以要加引号。",
      5: "stratify=y 表示按“是否违约”的比例分层抽样，使训练集和测试集里的违约样本比例尽量接近。",
      8: "fit 是训练：把训练集的客户信息 X_train_s 和已知是否违约 y_train 交给随机森林模型学习。",
      11: "f1_score 同时考虑违约预测的准确程度和实际违约客户有没有被找到；只看总体准确率可能掩盖漏检。",
    })[index] || text),
  },
  "SS-5-4-4-03": {
    template: randomForestFillTemplate,
    answers: [
      "04/SS-5-4-4-03_line_icing.csv", "dropna",
      '["气温", "湿度", "风速", "降水量", "海拔", "导线温度", "凝结水量", "持续低温时长", "日最低气温"]',
      '"是否覆冰"', ...modelFillAnswers.slice(4, 12), "0.85",
    ],
    hints: modelFillHints.map((hint, index) => index === 2 ? "9 个特征组成的 Python 列表，要带方括号" : hint),
    explanations: modelFillExplanations.map((text, index) => ({
      2: "气温、湿度、风速等 9 列是模型判断是否覆冰的线索，合称特征 X。多列要写成带方括号的列表；外层 data[...] 已写好。列名必须与 CSV 一字不差。",
      3: "“是否覆冰”是模型要预测的正确答案列，称为标签 y。列名是文字，这一空要带引号。",
      5: "stratify=y 表示按“是否覆冰”的比例分层抽样，让训练集和测试集中的覆冰样本比例尽量接近。",
      8: "fit 是训练：把气象与线路数据 X_train_s 和已知的覆冰结果 y_train 交给随机森林模型学习。",
      11: "f1_score 同时考虑覆冰预测是否准确，以及真实覆冰有没有被找到；不能只看总体准确率。",
      12: "0.85 是这道覆冰题指定的 F1 合格线，比前两题的 0.70 更高。程序算出的 F1 达到它才显示“达到要求”。",
    })[index] || text),
  },
  "SS-5-4-4-04": {
    template: modelFillTemplate,
    answers: [
      "04/SS-5-4-4-04_terminal_comm.csv", "dropna",
      '["心跳间隔", "心跳丢失率", "信号强度", "误码率", "重传次数", "响应延迟", "CPU利用率", "内存利用率", "在线时长"]',
      '"是否异常"', ...modelFillAnswers.slice(4, 12), "0.80",
    ],
    hints: modelFillHints.map((hint, index) => index === 2 ? "9 个特征组成的 Python 列表；CPU利用率不带空格" : hint),
    explanations: modelFillExplanations.map((text, index) => ({
      2: "心跳间隔、丢失率等 9 列是判断通信异常的线索，合称特征 X。多列要写成带方括号的列表。实际 CSV 列名是“CPU利用率”和“内存利用率”，中间都没有空格。",
      3: "“是否异常”是模型要预测的正确答案列，称为标签 y。列名是文字，这一空要带引号。",
      5: "stratify=y 表示按通信异常与正常的比例分层抽样，让训练集和测试集中的异常样本比例尽量接近。",
      8: "fit 是训练：把终端通信数据 X_train_s 和已知的异常结果 y_train 交给逻辑回归模型学习。",
      11: "f1_score 同时考虑异常判断是否准确，以及真正的通信异常有没有被找到；不能只看总体准确率。",
      12: "0.80 是这道通信异常题指定的 F1 合格线。程序算出的 F1 达到它才显示“达到要求”。",
    })[index] || text),
  },
};

function modelBlankValues(questionId = state.pythonQuestionId) {
  state.store.modelBlanks ||= {};
  state.store.modelBlanks[questionId] ||= Array(13).fill("");
  return state.store.modelBlanks[questionId];
}

function filledModelCode(questionId, values = modelBlankValues(questionId)) {
  return modelFillTasks[questionId].template.replace(/____(\d{1,2})____/g, (_, number) => values[Number(number) - 1]);
}

function renderModelFillEditor(q) {
  const task = modelFillTasks[q.id];
  const values = modelBlankValues(q.id);
  const code = task.template.split(/(____\d{1,2}____)/g).map((part) => {
    const match = /^____(\d{1,2})____$/.exec(part);
    if (!match) return escapeHTML(part);
    const number = Number(match[1]);
    const hint = task.hints[number - 1];
    return `<input class="code-blank" data-model-blank="${number}" aria-label="第 ${number} 空：${escapeHTML(hint)}" title="第 ${number} 空：${escapeHTML(hint)}" placeholder="第${number}空" value="${escapeHTML(values[number - 1] || "")}" autocomplete="off" spellcheck="false">`;
  }).join("");
  return `<div class="model-help" data-model-help role="note">
      <strong data-model-help-title>这道题的思路</strong>
      <p data-model-help-text>读入并清理数据 → 选出线索 X 和答案 y → 分出训练集、测试集 → 训练模型 → 用准确率和 F1 检查结果。</p>
    </div>
    <div class="fill-code" role="group" aria-label="题目原代码，填写 13 处空格">${code}</div>
    <details class="model-explanations"><summary>逐空解析：为什么这样填</summary>
      <p>X 是模型用来判断的线索，y 是已知的正确答案。先用训练集学习，再用没有参与学习的测试集检验。</p>
      <ol>${task.explanations.map((explanation, index) => `<li><strong>第 ${index + 1} 空 <code>${escapeHTML(task.answers[index])}</code></strong><p>${escapeHTML(explanation)}</p></li>`).join("")}</ol>
      <p><strong>最要紧的一点：</strong>第 7 空在训练集上学习标准化规则，第 8 空只能沿用这套规则，不能拿测试集重新学习。</p>
    </details>`;
}

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || { attempts: [], wrong: {}, settings: {} };
  } catch {
    return { attempts: [], wrong: {}, settings: {} };
  }
}

function saveStore() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state.store));
}

function lessonDraft(id) {
  state.store.lessons ||= {};
  state.store.lessons[id] ||= { notes: "", checked: [], code: "" };
  return state.store.lessons[id];
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function byId(id) {
  return state.questions.find((q) => q.id === id);
}

function firstByPractice(type) {
  return state.questions.find((q) => q.practiceType === type) || state.questions[0];
}

function route() {
  return location.hash || "#/";
}

function baseRoute(current = route()) {
  return current.split("?")[0];
}

function hashParams(current = route()) {
  const query = current.split("?")[1] || "";
  return new URLSearchParams(query);
}

function routeTitle(current = route()) {
  if (current.startsWith("#/learn/")) return "老师带练";
  if (current.startsWith("#/question/")) return "题目详情";
  const item = navItems.find(([href]) => href === baseRoute(current));
  return item ? item[1] : "实操模拟平台";
}

function theoryHomeHref() {
  if (location.pathname.includes("/ai-exam-simulator/")) return "../";
  if (location.protocol === "file:") return "../index.html";
  return "/theory/";
}

function layout(content, subtitle = "基于2026版操作技能题库的本地模拟演练") {
  const current = route();
  app.innerHTML = `
    <div class="app-layout">
      <aside class="sidebar">
        <div class="brand">
          <h1>人工智能算法测试员操作技能模拟考试平台</h1>
          <p>题库来自脱敏操作技能题库数据，页面保留页码和评分标准。</p>
        </div>
        <button class="mobile-menu-toggle" data-action="toggle-menu" aria-expanded="false" aria-controls="main-nav">☰ 菜单</button>
        <nav class="nav" id="main-nav">
          ${navItems
            .map(([href, label]) => `<a class="${href === baseRoute(current) ? "active" : ""}" href="${href}">${label}</a>`)
            .join("")}
        </nav>
      </aside>
      <main class="main">
        <header class="topbar">
          <div>
            <h2>${escapeHTML(routeTitle(current))}</h2>
            <p>${escapeHTML(subtitle)}</p>
          </div>
          <div class="button-row">
            <a class="btn" href="${theoryHomeHref()}">返回理论题库</a>
          </div>
        </header>
        <section class="content">${content}</section>
      </main>
    </div>
  `;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => {
    const left = LEVEL_ORDER.indexOf(a);
    const right = LEVEL_ORDER.indexOf(b);
    if (left !== -1 || right !== -1) return (left === -1 ? 99 : left) - (right === -1 ? 99 : right);
    return String(a).localeCompare(String(b), "zh-Hans-CN");
  });
}

function levelRows() {
  const rows = state.levels.length
    ? state.levels
    : LEVEL_ORDER.map((name) => ({ name, questionCount: state.questions.filter((q) => q.level === name).length }));
  return [...rows].sort((a, b) => LEVEL_ORDER.indexOf(a.name) - LEVEL_ORDER.indexOf(b.name));
}

function bankHrefForLevel(level) {
  return `#/bank?level=${encodeURIComponent(level)}`;
}

function stats() {
  const attempts = state.store.attempts || [];
  const practiced = new Set(attempts.map((item) => item.questionId));
  const averageScore = attempts.length
    ? Math.round(attempts.reduce((sum, item) => sum + (item.score || 0), 0) / attempts.length)
    : 0;
  const weak = weakModules()[0]?.module || "暂无";
  return {
    total: state.questions.length,
    moduleCount: unique(state.questions.map((q) => q.module)).length,
    levelCount: unique(state.questions.map((q) => q.level)).length,
    practiced: practiced.size,
    averageScore,
    weak,
  };
}

function weakModules() {
  const rows = unique(state.questions.map((q) => q.module)).map((module) => {
    const attempts = state.store.attempts.filter((item) => byId(item.questionId)?.module === module);
    const average = attempts.length ? Math.round(attempts.reduce((sum, item) => sum + item.score, 0) / attempts.length) : 0;
    return { module, average, attempts: attempts.length };
  });
  return rows.sort((a, b) => (a.attempts ? a.average : 101) - (b.attempts ? b.average : 101));
}

function renderHome() {
  const s = stats();
  const technicianQuestions = state.questions.filter((q) => q.level === "技师");
  const recommendedQuestion = byId("SS-6-4-4-04") || technicianQuestions[0];
  const moduleRows = state.modules.length
    ? state.modules
    : unique(state.questions.map((q) => q.module)).map((module) => ({
        name: module,
        questionCount: state.questions.filter((q) => q.module === module).length,
        levels: unique(state.questions.filter((q) => q.module === module).map((q) => q.level)),
        practiceTypes: unique(state.questions.filter((q) => q.module === module).map((q) => q.practiceType)),
      }));
  layout(`
    <section class="practice-start card pad">
      <div>
        <span class="practice-start__eyebrow">技师备考入口</span>
        <h2>开始实操练习</h2>
        <p>已为你整理 ${technicianQuestions.length} 道技师题，建议从电力营销线损计算开始。</p>
      </div>
      <div class="button-row practice-start__actions">
        ${recommendedQuestion ? `<a class="btn primary" href="#/learn/${encodeURIComponent(recommendedQuestion.id)}">从零跟练第1题</a>` : ""}
        <a class="btn" href="${bankHrefForLevel("技师")}">查看技师12题</a>
      </div>
    </section>
    <div class="grid cols-3">
      <div class="stat-card card"><strong>${s.total}</strong><span>题目总数</span></div>
      <div class="stat-card card"><strong>${s.moduleCount}</strong><span>能力模块数</span></div>
      <div class="stat-card card"><strong>${s.levelCount}</strong><span>覆盖等级数</span></div>
      <div class="stat-card card"><strong>${s.practiced}</strong><span>已练习题数</span></div>
      <div class="stat-card card"><strong>${s.averageScore}</strong><span>平均得分</span></div>
      <div class="stat-card card"><strong>${escapeHTML(s.weak)}</strong><span>薄弱模块</span></div>
    </div>
    <section class="card pad" style="margin-top:16px">
      <h3 class="section-title">技能等级分类</h3>
      <div class="level-actions">
        ${levelRows()
          .map(
            (row) => `<a class="level-link" href="${bankHrefForLevel(row.name)}"><strong>${escapeHTML(row.name)}</strong><span>${row.questionCount} 题</span></a>`,
          )
          .join("")}
      </div>
    </section>
    <section class="card pad" style="margin-top:16px">
      <h3 class="section-title">快速入口</h3>
      <div class="quick-actions">
        <a class="quick-link" href="#/exam"><strong>开始模拟考试</strong><small>选等级、模块、题量</small></a>
        <a class="quick-link" href="${bankHrefForLevel("技师")}"><strong>技师逐题练习</strong><small>查看12道技师题并进入练习</small></a>
        <a class="quick-link" href="#/practice/python"><strong>Python编程练习</strong><small>模拟运行和逐项评分</small></a>
        <a class="quick-link" href="#/practice/labeling"><strong>数据标注练习</strong><small>清洗、标注、统计导出</small></a>
        <a class="quick-link" href="#/practice/flow"><strong>流程设计练习</strong><small>节点画布和完整性检查</small></a>
        <a class="quick-link" href="#/wrong"><strong>查看错题本</strong><small>自动记录扣分题</small></a>
        <a class="quick-link" href="#/practice/dify"><strong>Dify智能体沙盘</strong><small>按你的要求先预留</small></a>
        <a class="quick-link" href="#/analytics"><strong>备考进度看板</strong><small>统计练习和薄弱项</small></a>
      </div>
    </section>
    <section class="card pad" style="margin-top:16px">
      <h3 class="section-title">能力模块看板</h3>
      <div class="grid cols-3">
        ${moduleRows
          .map((m) => {
            const attempts = state.store.attempts.filter((item) => byId(item.questionId)?.module === m.name);
            const done = attempts.length ? Math.min(100, Math.round((new Set(attempts.map((a) => a.questionId)).size / m.questionCount) * 100)) : 0;
            const avg = attempts.length ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length) : 0;
            return `
              <article class="card pad">
                <h4 style="margin:0 0 10px">${escapeHTML(m.name)}</h4>
                <div class="tag-row">
                  <span class="tag">${m.questionCount} 题</span>
                  <span class="tag">${escapeHTML((m.levels || []).join(" / "))}</span>
                </div>
                <p class="muted">推荐平台：${escapeHTML((m.practiceTypes || []).map((t) => practiceNames[t] || t).join("、") || "待识别")}</p>
                <div class="progress-bar"><span style="--value:${done}%"></span></div>
                <p class="muted">完成度 ${done}% · 平均得分 ${avg}</p>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `);
}

function filteredQuestions() {
  const f = state.filters;
  const keyword = f.keyword.trim().toLowerCase();
  return state.questions.filter((q) => {
    if (f.module && q.module !== f.module) return false;
    if (f.level && q.level !== f.level) return false;
    if (f.practiceType && q.practiceType !== f.practiceType) return false;
    if (f.page && !(q.sourcePages || []).map(String).includes(String(f.page))) return false;
    if (keyword) {
      const haystack = [q.id, q.title, q.module, q.level, q.practiceType, q.questionText, (q.platformTags || []).join(" ")]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });
}

function options(values, selected, label) {
  return `<option value="">${label}</option>${values
    .map((value) => `<option value="${escapeHTML(value)}" ${value === selected ? "selected" : ""}>${escapeHTML(value)}</option>`)
    .join("")}`;
}

function renderBank() {
  const requestedLevel = hashParams().get("level");
  if (requestedLevel && requestedLevel !== state.filters.level) state.filters.level = requestedLevel;
  const list = filteredQuestions();
  layout(`
    <section class="card pad">
      <div class="filters">
        <label class="field"><span>关键词 / 题号</span><input data-filter="keyword" value="${escapeHTML(state.filters.keyword)}" placeholder="题号、题名、平台标签" /></label>
        <label class="field"><span>能力模块</span><select data-filter="module">${options(unique(state.questions.map((q) => q.module)), state.filters.module, "全部模块")}</select></label>
        <label class="field"><span>技能等级</span><select data-filter="level">${options(levelRows().map((row) => row.name), state.filters.level, "全部等级")}</select></label>
        <label class="field"><span>题型</span><select data-filter="practiceType">${options(unique(state.questions.map((q) => q.practiceType)), state.filters.practiceType, "全部题型")}</select></label>
        <label class="field"><span>题库页码</span><input data-filter="page" value="${escapeHTML(state.filters.page)}" placeholder="例如 5" /></label>
      </div>
      <div class="button-row">
        <button class="btn" data-action="clear-filters">重置筛选</button>
        <span class="muted">当前 ${list.length} 道题</span>
      </div>
    </section>
    <section class="card table-wrap" style="margin-top:14px">
      <table>
        <thead>
          <tr>
            <th>题号</th><th>题目名称</th><th>能力模块</th><th>等级</th><th>时限</th><th>题分</th><th>推荐演练平台</th><th>题库页码</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${list
            .map(
              (q) => `
                <tr>
                  <td>${escapeHTML(q.id)}</td>
                  <td>${escapeHTML(q.title)}</td>
                  <td>${escapeHTML(q.module)}</td>
                  <td>${escapeHTML(q.level)}</td>
                  <td>${q.timeLimitMinutes}分钟</td>
                  <td>${q.score}</td>
                  <td>${escapeHTML(practiceNames[q.practiceType] || q.practiceType)}</td>
                  <td>${(q.sourcePages || []).join(", ")}</td>
                  <td><a class="btn primary" href="#/learn/${encodeURIComponent(q.id)}">跟练</a></td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </section>
  `);
}

function rubricTable(q, scored = null) {
  const rows = q.rubric || [];
  const unverifiedPoints = q.id === "SS-6-4-4-04";
  return `
    ${unverifiedPoints ? `<p class="muted">原卷评分项目可参考，但配分列尚未核实；下表不显示导入时平均分配的分值。右侧为独立的练习参考评分。</p>` : ""}
    <div class="table-wrap">
      <table class="rubric-table">
        <thead><tr><th>序号</th><th>考核内容</th><th>评分要求</th><th>配分</th><th>得分标准</th><th>得分</th><th>备注</th></tr></thead>
        <tbody>
          ${rows
            .map((r, index) => {
              const got = scored?.items?.[index]?.earned;
              return `<tr>
                <td>${r.order || index + 1}</td>
                <td>${escapeHTML(r.item)}</td>
                <td>${escapeHTML(r.requirement)}</td>
                <td>${unverifiedPoints ? "待核对" : r.points || 0}</td>
                <td>${escapeHTML(r.standard || "")}</td>
                <td>${unverifiedPoints || got === undefined ? "" : got}</td>
                <td>${escapeHTML(scored?.items?.[index]?.comment || r.remarks || "")}</td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function practiceLink(q) {
  if (q.id === "SS-4-4-4-03") return "#/practice/meter";
  if (q.practiceType === "python_coding") return "#/practice/python";
  if (q.practiceType === "model_evaluation") return "#/practice/python";
  if (q.practiceType === "text_labeling") return "#/practice/labeling";
  if (q.practiceType === "flow_design") return "#/practice/flow";
  if (q.practiceType === "bbox_labeling") return "#/practice/bbox";
  if (q.practiceType === "dify_agent") return "#/practice/dify";
  return "#/exam";
}

function hasPracticeWorkbench(q) {
  return q.id === "SS-4-4-4-03" || ["model_evaluation", "python_coding", "text_labeling", "flow_design", "bbox_labeling"].includes(q.practiceType);
}

function renderAttachments(q) {
  if (!q.attachments?.length) return "";
  return `<div class="exam-attachments"><h4>题目附件</h4><div class="attachment-list">${q.attachments.map(file =>
    !['127.0.0.1', 'localhost'].includes(location.hostname)
      ? `<span class="tag">${escapeHTML(file.split('/').pop())} · 仅本机提供</span>`
      : `<a class="tag" href="${encodeURI(file)}" ${file.endsWith('.zip') ? 'download' : 'target="_blank" rel="noopener"'}>${escapeHTML(file.split('/').pop())}</a>`
  ).join('')}</div>${q.id === 'SS-2-2-2-01' ? '<p class="muted">完整数据集约 390 MB，含 10,000 张图像及对应的 YOLO TXT 标注；下方操作台只展示其中 5 组真实样例。</p>' : ''}</div>`;
}

function renderQuestionDetail(id) {
  const q = byId(decodeURIComponent(id));
  if (!q) {
    layout(`<section class="card empty">没有找到该题。</section>`);
    return;
  }
  layout(`
    <div class="detail-layout">
      <section class="card pad">
        <div class="tag-row">
          <span class="tag">${escapeHTML(q.id)}</span>
          <span class="tag">${escapeHTML(q.module)}</span>
          <span class="tag">${escapeHTML(q.level)}</span>
          <span class="tag">${q.timeLimitMinutes}分钟</span>
          <span class="tag">${q.score}分</span>
          <span class="tag">题库页 ${q.sourcePages.join(", ")}</span>
        </div>
        <h3>${escapeHTML(q.title)}</h3>
        <p><strong>工具、设备、场地：</strong>${escapeHTML(q.toolsAndEnvironment || "见题库原文")}</p>
        <p><strong>推荐复刻平台：</strong>${escapeHTML(practiceNames[q.practiceType] || q.practiceType)} · ${(q.platformTags || []).map(escapeHTML).join(" / ")}</p>
        <div class="button-row">
          <a class="btn primary" href="#/learn/${encodeURIComponent(q.id)}">零基础跟练</a>
          ${hasPracticeWorkbench(q) ? `<a class="btn" href="${practiceLink(q)}" data-practice-question="${escapeHTML(q.id)}">独立实操</a>` : ""}
          <button class="btn" data-action="copy-question" data-id="${escapeHTML(q.id)}">复制题目</button>
          <button class="btn danger" data-action="mark-wrong" data-id="${escapeHTML(q.id)}">加入错题本</button>
        </div>
        ${renderAttachments(q)}
        <h4>试题正文</h4>
        <div class="question-text">${escapeHTML(q.questionText)}</div>
      </section>
      <section class="card pad">
        <h3 class="section-title">评分标准</h3>
        ${q.id === 'SS-2-2-2-01' ? '<p class="muted">本题评分表的自动文字抽取有错列；请以原 PDF 第 17–20 页的评分标准为准。操作台只检查标注格式与边界，不给出正式分数。</p>' : ''}
        ${rubricTable(q)}
      </section>
    </div>
  `);
}

const guidedLessons = {
  "SS-6-4-4-04": [
    { title: "认识数据与循环", concept: "data 是一组台区记录。for item in data 会逐条取出记录，item 是当前这一条。", task: "先保留题目给的数据，再用 for 循环取出 supply 和 sell。", example: 'for item in data:\n    supply = item["supply"]\n    sell = item["sell"]', checks: [0, 1, 2] },
    { title: "计算线损", concept: "线损电量 = 供电量 - 售电量；线损率 = 线损电量 ÷ 供电量 × 100%。例如 T001 的线损是 700 kWh，线损率是 5.60%。", task: "在循环内部写出两个公式，让每条记录都得到自己的计算结果。", example: "loss = supply - sell\nloss_rate = round(loss / supply * 100, 2)", checks: [3, 4] },
    { title: "判断与输出", concept: "先看线损率是否大于 8%，再看线损电量是否小于 0，最后用 else 处理正常情况。缩进表示这些动作都在循环内。", task: "写 if / elif / else，并用 print 输出每条台区的编号、名称、计算值和状态。", example: 'if loss_rate > 8:\n    status = "高线损异常"\nelif loss < 0:\n    status = "负线损异常"\nelse:\n    status = "线损正常"', checks: [5, 6, 7] },
  ],
  "SS-4-3-3-02": [
    { title: "找图片并规范命名", concept: "raw_images 是输入文件夹。只处理 .jpg；:04d 表示把序号补足四位，例如 1 变成 0001。", task: "遍历文件夹、筛选 JPG，生成 insulator_defect_0001.jpg 这样的名字并重命名。", example: 'files = sorted(path for path in INPUT_DIR.iterdir() if path.suffix.lower() == ".jpg")\nfor index, path in enumerate(files, start=1):\n    path.rename(INPUT_DIR / f"insulator_defect_{index:04d}.jpg")', checks: [0, 1, 2, 3] },
    { title: "填充、裁剪与旋转", concept: "图片不足 512 像素时先补黑边，再随机选起点裁成 512×512。旋转角度只在 -15 到 +15 度之间，空白处填黑。", task: "打开图片，处理小图，随机裁剪，然后旋转。", example: 'with Image.open(path) as image:\n    width, height = image.size\n    if width < 512 or height < 512:\n        canvas = Image.new("RGB", (max(width, 512), max(height, 512)), (0, 0, 0))\n        canvas.paste(image, (0, 0))\n        image = canvas\n    left = random.randint(0, image.width - 512)\n    top = random.randint(0, image.height - 512)\n    image = image.crop((left, top, left + 512, top + 512))\n    image = image.rotate(random.uniform(-15, 15), fillcolor=(0, 0, 0))', checks: [4, 5, 6, 7, 8, 9, 10] },
    { title: "调整亮度与对比度", concept: "亮度系数 0.8 到 1.2 是随机变化；对比度固定增强到 1.5 倍。顺序是先亮度、后对比度。", task: "用 ImageEnhance 完成两次变换。", example: 'image = ImageEnhance.Brightness(image).enhance(random.uniform(0.8, 1.2))\nimage = ImageEnhance.Contrast(image).enhance(1.5)', checks: [11, 12, 13, 14] },
    { title: "保存结果", concept: "结果放到 augmented_images 文件夹。原文件名保留，再加 _aug；主函数把各步串起来。", task: "创建输出目录，以 _aug.jpg 命名保存，并检查程序入口。", example: 'OUTPUT_DIR.mkdir(parents=True, exist_ok=True)\noutput_path = OUTPUT_DIR / f"{path.stem}_aug.jpg"\nimage.save(output_path)\n\nif __name__ == "__main__":\n    main()', checks: [15, 16, 17, 18, 19] },
  ],
};

const lessonBasics = {
  dify_agent: { idea: "智能体可以理解成一条工作流：用户输入 → 处理节点 → 模型或工具 → 输出。", actions: ["写出用户会输入什么", "列出需要的知识、图片或工具", "画出节点顺序与分支条件", "用一个正常样例和一个异常样例检查输出"] },
  model_evaluation: { idea: "模型评估要分清训练集和测试集。标准化器只能用训练集拟合；F1 用精确率和召回率共同衡量结果。", actions: ["找到数据和目标列", "分层划分训练集、测试集", "仅在训练集拟合标准化器和模型", "在测试集预测并计算 F1"] },
  image_ai: { idea: "图像识别任务一般经历图片输入、预处理、识别、结果校验和保存输出。", actions: ["确认输入图片与目标结果", "列出预处理和识别顺序", "设计识别失败时的处理", "检查输出格式与保存位置"] },
  flow_design: { idea: "流程设计要先确定起点和终点，再把处理、判断、异常和反馈节点按数据流连接。", actions: ["写出输入和输出", "摆放主要处理节点", "加入判断与异常分支", "逐项核对评分表并检查是否能走通"] },
  bbox_labeling: { idea: "BBox 是包围目标的矩形框；需要同时检查类别、坐标范围以及宽高是否有效。", actions: ["确认图片尺寸和类别", "画框并记录坐标", "检查越界和零宽高", "导出并复核标注结果"] },
  document_ocr: { idea: "OCR 是把图片中的文字转成可编辑文本，之后还要校验字段和格式。", actions: ["确认输入文档", "列出需提取字段", "处理模糊或漏识别内容", "输出结构化结果"] },
  monitoring_ops: { idea: "系统运维题通常要求发现异常、判断影响、执行处理并留下验证记录。", actions: ["读监控指标", "定位异常点", "写出处理顺序", "记录恢复后的验证结果"] },
};

const lineLossRows = [
  { id: "T001", supply: 12500, sell: 11800 },
  { id: "T002", supply: 9800, sell: 9750 },
  { id: "T003", supply: 15200, sell: 13600 },
  { id: "T004", supply: 8600, sell: 8900 },
];

function renderLineLossExercise(draft) {
  const calculations = draft.calculations || {};
  return `
    <div class="lesson-math">
      <h4>先算四条台区数据</h4>
      <p>例如 T001：12500 - 11800 = 700 kWh；700 ÷ 12500 × 100% = 5.60%。请独立填完其余各行。</p>
      <div class="table-wrap"><table><thead><tr><th>台区</th><th>供电量</th><th>售电量</th><th>线损电量</th><th>线损率 %</th><th>状态</th></tr></thead><tbody>
        ${lineLossRows.map((row) => `<tr><td>${row.id}</td><td>${row.supply}</td><td>${row.sell}</td>
          <td><input aria-label="${row.id} 线损电量" inputmode="decimal" data-loss-row="${row.id}" data-loss-field="loss" value="${escapeHTML(calculations[row.id]?.loss || "")}" /></td>
          <td><input aria-label="${row.id} 线损率" inputmode="decimal" data-loss-row="${row.id}" data-loss-field="rate" value="${escapeHTML(calculations[row.id]?.rate || "")}" /></td>
          <td><select aria-label="${row.id} 状态" data-loss-row="${row.id}" data-loss-field="status">${["", "线损正常", "高线损异常", "负线损异常"].map((value) => `<option value="${value}" ${calculations[row.id]?.status === value ? "selected" : ""}>${value || "请选择"}</option>`).join("")}</select></td>
        </tr>`).join("")}
      </tbody></table></div>
      <button class="btn primary" data-action="check-line-loss">核对计算结果</button>
      ${draft.lossFeedback ? `<p class="lesson-feedback" role="status">${escapeHTML(draft.lossFeedback)}</p>` : ""}
    </div>`;
}

const meterQuestionId = "SS-4-4-4-03";
const meterReadings = [0.56, 0.64, 0.52];
const meterFields = {
  flow: [
    ["detect", "找到表盘", "如何从整张照片定位表盘？"],
    ["crop", "裁剪表盘", "定位之后怎样取得表盘局部图？"],
    ["segment", "分出刻度和指针", "怎样区分刻度线与读数指针？"],
    ["unwrap", "展开扇形", "怎样把弧形刻度变成便于比较的位置？"],
    ["coordinates", "取得横坐标", "展开后需要记录哪些位置？"],
    ["percent", "计算位置百分比", "怎样确定指针落在量程的哪个比例？"],
    ["value", "换算读数", "怎样由百分比和量程得到 MPa？"],
  ],
  algorithms: [
    ["detector", "目标检测算法及优势", "写出算法名称，并解释为什么适合找表盘。"],
    ["segmenter", "语义分割算法及优势", "写出算法名称，并解释为什么适合分出刻度与指针。"],
  ],
  errors: [
    ["photo4cause", "照片 4：误差原因", "观察照片 4，什么挡住了刻度？"],
    ["photo4fix", "照片 4：解决办法", "刻度被挡住时怎样发现并处理？"],
    ["photo5cause", "照片 5：误差原因", "照片 5 有什么容易被认错的指针？"],
    ["photo5fix", "照片 5：解决办法", "标注和训练时怎样避免混淆？"],
  ],
};

function meterDraft() {
  const draft = lessonDraft(meterQuestionId);
  draft.meter ||= { answers: {}, opened: false, viewerOpen: false, review: null, startedAt: null };
  return draft.meter;
}

function meterClockText() {
  const start = meterDraft().startedAt;
  if (!start) return "未开始";
  const elapsed = Math.max(0, Math.floor((Date.now() - start) / 1000));
  if (elapsed > 65 * 60) return "超时超过 5 分钟，请停止作答";
  if (elapsed > 60 * 60) return `超时 ${Math.ceil((elapsed - 60 * 60) / 60)} 分钟`;
  const remaining = 60 * 60 - elapsed;
  return `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
}

function renderMeterFields(fields, answers) {
  return fields.map(([key, title, hint], index) => `<label class="meter-field"><span>${index + 1}. ${escapeHTML(title)}</span><small>${escapeHTML(hint)}</small><textarea data-meter-field="${key}" rows="3" placeholder="在这里写自己的操作或判断">${escapeHTML(answers[key] || "")}</textarea></label>`).join("");
}

function renderMeterPractice() {
  const q = byId(meterQuestionId);
  if (!['127.0.0.1', 'localhost'].includes(location.hostname)) {
    layout(`<section class="card pad"><h3>${escapeHTML(q.title)}</h3><p>本题需观察原题的 5 张现场照片。照片属于本机题目附件，未在公开网站发布；请在本机启动项目完成看图读数和交卷检查。</p><div class="button-row"><a class="btn primary" href="#/learn/${q.id}">老师带练</a><a class="btn" href="#/question/${q.id}">原题与评分标准</a><a class="btn" href="./README.md">本机运行步骤</a></div></section>`, '现场图片仅在本机提供');
    return;
  }
  const draft = meterDraft();
  const answers = draft.answers;
  const photo = Math.min(state.meterPhoto, q.attachments.length - 1);
  const tabs = [["readings", "看图读数"], ["flow", "识别流程"], ["analysis", "算法与误差"], ["review", "检查结果"]];
  const review = draft.review;
  const filled = Object.keys(meterFields).flatMap((key) => meterFields[key]).filter(([key]) => (answers[key] || "").trim()).length;
  layout(`
    <div class="lesson-header"><div><div class="tag-row"><span class="tag">${q.id}</span><span class="tag">技师</span><span class="tag">60 分钟</span></div><h3>${escapeHTML(q.title)}</h3><p>使用原题 5 张照片完成读数、流程设计和误差分析。所有草稿只保存在本机浏览器。</p></div><a class="btn" href="#/question/${q.id}">原题与评分标准</a></div>
    <div class="meter-toolbar"><div><span>考试倒计时</span><strong data-meter-clock>${meterClockText()}</strong></div><button class="btn" data-action="meter-start">${draft.startedAt ? "重新计时" : "开始 60 分钟计时"}</button><button class="btn" data-action="meter-reset">空白重练</button></div>
    <div class="meter-layout">
      <section class="card pad meter-viewer" aria-label="现场照片查看器">
        <div class="meter-viewer-head"><h3>现场表记照片</h3><button class="btn" data-action="meter-toggle-viewer">${draft.viewerOpen ? "关闭图片查看器" : "打开图片查看器"}</button></div>
        ${draft.viewerOpen ? `<div class="meter-photo-tabs" role="group" aria-label="选择表记照片">${q.attachments.map((_, index) => `<button class="btn ${index === photo ? "primary" : ""}" data-action="meter-photo" data-index="${index}" aria-pressed="${index === photo}">照片 ${index + 1}</button>`).join("")}</div>
          <div class="meter-image-frame"><img src="${encodeURI(q.attachments[photo])}" alt="现场表记照片 ${photo + 1}" style="transform:scale(${state.meterZoom})"></div>
          <label class="meter-zoom">放大照片 <input type="range" min="1" max="3" step="0.1" value="${state.meterZoom}" data-meter-zoom></label>
          <a class="meter-original" href="${encodeURI(q.attachments[photo])}" target="_blank" rel="noopener">在新窗口查看原图</a>` : `<p class="muted">先打开图片查看器，依次观察照片 1～5。交卷前记得关闭。</p>`}
      </section>
      <section class="card pad meter-answers">
        <div class="meter-tabs" role="tablist" aria-label="本题答题部分">${tabs.map(([id, title]) => `<button role="tab" class="${state.meterTab === id ? "active" : ""}" aria-selected="${state.meterTab === id}" data-action="meter-tab" data-tab="${id}">${title}</button>`).join("")}</div>
        ${state.meterTab === "readings" ? `<h3>照片 1～3：人工读数</h3><p class="muted">观察指针位置并写出读数，单位 MPa。照片 4、5 用于后面的误差分析。</p><div class="meter-reading-grid">${meterReadings.map((_, index) => `<label class="field"><span>照片 ${index + 1} 的读数（MPa）</span><input data-meter-field="reading${index + 1}" inputmode="decimal" placeholder="例如 0.50" value="${escapeHTML(answers[`reading${index + 1}`] || "")}"></label>`).join("")}</div><button class="btn primary" data-action="meter-next" data-tab="flow">继续：识别流程</button>` : ""}
        ${state.meterTab === "flow" ? `<h3>设计完整识别流程</h3><p class="muted">依照图像处理先后顺序写清每一步的输入、操作和输出。这里考的是方案设计，不运行模型。</p>${renderMeterFields(meterFields.flow, answers)}<button class="btn primary" data-action="meter-next" data-tab="analysis">继续：算法与误差</button>` : ""}
        ${state.meterTab === "analysis" ? `<h3>算法与异常照片</h3><p class="muted">分别说明算法、优点，以及照片 4 和 5 的误差原因与处理办法。</p>${renderMeterFields([...meterFields.algorithms, ...meterFields.errors], answers)}<button class="btn primary" data-action="meter-submit">交卷并检查</button>` : ""}
        ${state.meterTab === "review" ? `<h3>练习检查</h3>${review ? `<p class="meter-review-summary">读数正确 ${review.readings.filter(Boolean).length} / 3；文字答题已填写 ${filled} / 13 项。文字部分需自行对照评分要点，以下不是官方分数。</p>
          <ul class="meter-review-list">${review.readings.map((correct, index) => `<li>照片 ${index + 1}：${correct ? "读数正确" : `应为 ${meterReadings[index].toFixed(2)} MPa；你的填写：${escapeHTML(answers[`reading${index + 1}`] || "未填")}`}</li>`).join("")}</ul>
          <p>${draft.opened ? "已打开过图片查看器" : "尚未打开图片查看器"}；${draft.viewerOpen ? "图片查看器仍打开，请关闭后完成工作终结" : "图片查看器已关闭"}。</p>
          <details open><summary>对照原评分标准逐项复核文字答案</summary><ol><li>流程：检测表盘 → 裁剪 → 分割刻度和指针 → 扇形展开 → 求横坐标 → 算指针位置百分比 → 按量程换算读数。</li><li>算法：目标检测可举 YOLO，说明速度快、误检较低；语义分割可举 DeepLabv3+，说明适合分割不同大小目标且边界较清晰。</li><li>照片 4：标签遮挡刻度；可根据刻度数量与长度识别遮挡及缺失刻度。</li><li>照片 5：另有告警值指针；标注时只标读数指针，增加这类表盘训练样本。</li></ol></details>` : `<p class="muted">还没有交卷。完成读数、流程和误差分析后点击“交卷并检查”。</p>`}<button class="btn" data-action="meter-tab" data-tab="analysis">返回修改答案</button>` : ""}
      </section>
    </div>
  `, "按原题附件与评分标准练习；不运行目标检测或语义分割模型。");
}

function renderLesson(id) {
  const q = byId(decodeURIComponent(id));
  if (!q) return layout('<section class="card empty">没有找到该题。</section>');
  if (state.lessonQuestionId !== q.id) {
    state.lessonQuestionId = q.id;
    state.lessonStep = 0;
  }
  const draft = lessonDraft(q.id);
  const steps = guidedLessons[q.id];
  if (steps && !draft.code) draft.code = q.id === "SS-6-4-4-04" ? samples.lineLossStarter : samples.imagePreprocessStarter;
  const step = steps?.[state.lessonStep];
  const scored = steps && draft.code ? scorePython(q, draft.code) : null;
  const basics = lessonBasics[q.practiceType] || { idea: "先认清输入、操作步骤和最终成果，再逐条核对评分要求。", actions: ["读题并找出输入", "列出需要完成的动作", "保存最终成果", "对照评分表检查"] };
  const checks = step?.checks.map((index) => ({ rubric: q.rubric[index], result: scored?.items[index] }));
  const completed = checks?.filter((row) => row.result?.earned).length || 0;
  const total = (q.rubric || []).filter((row) => row.points > 0).length;
  layout(`
    <div class="lesson-header">
      <div><div class="tag-row"><span class="tag">${escapeHTML(q.level)}</span><span class="tag">${escapeHTML(q.id)}</span><span class="tag">${q.timeLimitMinutes} 分钟</span></div>
        <h3>${escapeHTML(q.title)}</h3><p>本题要交什么：${escapeHTML((q.expectedOutputFiles || []).join("、") || "按题目要求完成操作并保存结果")}</p></div>
      <a class="btn" href="#/question/${encodeURIComponent(q.id)}">查看原题与评分标准</a>
    </div>
    ${renderAttachments(q)}
    ${steps ? `
      <div class="lesson-progress" aria-label="跟练进度">${steps.map((item, index) => `<button class="lesson-progress__step ${index === state.lessonStep ? "active" : ""}" data-action="lesson-step" data-index="${index}" aria-current="${index === state.lessonStep ? "step" : "false"}">${index + 1}. ${escapeHTML(item.title)}</button>`).join("")}</div>
      <div class="lesson-layout">
        <section class="lesson-work">
          <p class="lesson-kicker">第 ${state.lessonStep + 1} / ${steps.length} 步</p><h3>${escapeHTML(step.title)}</h3>
          <p><strong>先理解：</strong>${escapeHTML(step.concept)}</p><p><strong>现在动手：</strong>${escapeHTML(step.task)}</p>
          ${q.id === "SS-6-4-4-04" && state.lessonStep === 1 ? renderLineLossExercise(draft) : ""}
          <details class="lesson-hint"><summary>看这一小步的写法提示</summary><pre>${escapeHTML(step.example)}</pre></details>
          <div class="button-row"><button class="btn primary" data-action="lesson-check">检查这一步</button><button class="btn" data-action="lesson-prev" ${state.lessonStep === 0 ? "disabled" : ""}>上一步</button><button class="btn" data-action="lesson-next" ${state.lessonStep === steps.length - 1 ? "disabled" : ""}>下一步</button></div>
          ${draft.feedback ? `<p class="lesson-feedback" role="status">${escapeHTML(draft.feedback)}</p>` : ""}
          <h4>本步得分点 ${completed} / ${checks.length}</h4>
          <ul class="lesson-checks">${checks.map(({ rubric, result }) => `<li><span class="${result?.earned ? "passed" : ""}">${result?.earned ? "✓" : "○"}</span> ${escapeHTML(rubric.item)} <small>${escapeHTML(result?.comment || "待检查")}</small></li>`).join("")}</ul>
        </section>
        <section class="lesson-editor"><label for="lesson-code">你的代码（自动保存在本机）</label><textarea id="lesson-code" class="code-editor" data-lesson-code spellcheck="false">${escapeHTML(draft.code)}</textarea>
          <p class="muted">这里先检查代码结构。线损题转入独立练习后，还可以在本地服务中真正运行 Python。</p>
          <a class="btn success" href="${practiceLink(q)}" data-practice-question="${escapeHTML(q.id)}" data-from-lesson="true">转入独立练习</a></section>
      </div>` : `
      <section class="lesson-work"><p class="lesson-kicker">逐项练习单</p><h3>先把题目拆成可完成的动作</h3>
        <p><strong>老师先讲：</strong>${escapeHTML(basics.idea)}</p>
        <ol class="lesson-actions">${basics.actions.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ol>
        <p>读原题后在下方写出你的操作与结果。每完成一项就勾选；勾选是自评记录，不会自动判定正确。</p>
        <div class="question-text">${escapeHTML(q.questionText)}</div>
        <label class="field"><span>我的操作步骤与结果（自动保存在本机）</span><textarea data-lesson-notes>${escapeHTML(draft.notes)}</textarea></label>
        <h4>评分项：已核对 ${draft.checked.length} / ${total}</h4>
        <div class="lesson-checks">${(q.rubric || []).filter((row) => row.points > 0).map((row) => `<label><input type="checkbox" data-lesson-rubric="${escapeHTML(row.id)}" ${draft.checked.includes(row.id) ? "checked" : ""}> ${escapeHTML(row.item)}（${row.points} 分）</label>`).join("")}</div>
        <div class="button-row"><a class="btn" href="#/question/${encodeURIComponent(q.id)}">查看完整评分标准</a>${hasPracticeWorkbench(q) ? `<a class="btn primary" href="${practiceLink(q)}" data-practice-question="${escapeHTML(q.id)}">打开操作台</a>` : ""}</div>
      </section>`}
  `, "跟着讲解完成题目，练习进度只保存在当前浏览器。");
}

function scorePython(q, code) {
  if (q.id === "SS-4-3-3-02") {
    const checks = [
      [/listdir|glob\s*\(|iterdir\s*\(/, "获取输入目录文件"],
      [/endswith\s*\(\s*["']\.jpg|suffix(?:\.lower\(\))?\s*==\s*["']\.jpg/, "筛选 JPG 文件"],
      [/insulator_defect_.+04d/, "生成四位流水号文件名"],
      [/\.rename\s*\(|os\.rename\s*\(/, "执行物理重命名"],
      [/Image\.open\s*\(|cv2\.imread\s*\(/, "读取图像"],
      [/(?:width|height|\w+)\s*<\s*512/, "判断小尺寸图像"],
      [/Image\.new\s*\(|copyMakeBorder|\.resize\s*\(/, "填充或缩放图像"],
      [/random\.randint\s*\(/, "生成随机裁剪坐标"],
      [/\.crop\s*\([\s\S]*512|\[\s*\w+\s*:\s*\w+\s*\+\s*512/, "裁剪为 512 x 512"],
      [/random\.uniform\s*\(\s*-15(?:\.0)?\s*,\s*15(?:\.0)?\s*\)/, "抽取 -15 到 15 度旋转角"],
      [/\.rotate\s*\([\s\S]*fillcolor\s*=\s*\(\s*0\s*,\s*0\s*,\s*0\s*\)|warpAffine[\s\S]*BORDER_CONSTANT/, "旋转并用纯黑填充"],
      [/random\.uniform\s*\(\s*0\.8\s*,\s*1\.2\s*\)/, "生成亮度调整系数"],
      [/ImageEnhance\.Brightness|convertScaleAbs/, "执行亮度变换"],
      [/enhance\s*\(\s*1\.5\s*\)|alpha\s*=\s*1\.5/, "设置 1.5 倍对比度"],
      [/ImageEnhance\.Contrast|convertScaleAbs/, "执行对比度变换"],
      [/mkdir\s*\([\s\S]*exist_ok\s*=\s*True|makedirs\s*\([\s\S]*exist_ok\s*=\s*True/, "创建输出目录"],
      [/_aug\.jpg|_aug["']/, "添加 _aug 输出后缀"],
      [/\.save\s*\(|cv2\.imwrite\s*\(/, "保存增强图像"],
      [/def\s+main\s*\(|try\s*:/, "结构化主函数或容错处理"],
      [/if\s+__name__\s*==\s*["']__main__["']/, "使用标准程序入口"],
    ];
    let scoredIndex = 0;
    const items = (q.rubric || []).map((r) => {
      if (!(r.points || 0)) return { earned: 0, max: 0, comment: "按时完成不扣分。" };
      const check = checks[scoredIndex];
      scoredIndex += 1;
      const passed = check?.[0].test(code) || false;
      return { earned: passed ? r.points : 0, max: r.points, comment: passed ? `已完成：${check[1]}` : `未检测到：${check?.[1] || r.item}` };
    });
    const score = Math.min(q.score, items.reduce((sum, item) => sum + item.earned, 0));
    return {
      score,
      items,
      console: [
        "代码结构检查完成（未执行 Python）。",
        "已检查：批量重命名、512 x 512 裁剪、旋转、亮度和对比度增强。",
        `命中评分点：${items.filter((item) => item.earned > 0).length} / 20`,
        "本题未随题提供 raw_images 原图，因此当前为代码结构模拟运行。",
      ].join("\n"),
    };
  }
  if (q.id === "SS-6-4-4-04") {
    const checks = [
      [/data\s*=\s*\[/, "使用题目数据"],
      [/for\s+\w+\s+in\s+data\s*:/, "循环遍历台区"],
      [/\[\s*["']supply["']\s*\].*\[\s*["']sell["']\s*\]/s, "取得供电量和售电量"],
      [/\w+\s*=\s*\w+\s*-\s*\w+/, "计算线损电量"],
      [/\/\s*\w+\s*\*\s*100|\*\s*100\s*\/\s*\w+/, "计算线损率"],
      [/if\s+.+>\s*8[\s\S]+elif\s+.+<\s*0|if\s+.+<\s*0[\s\S]+elif\s+.+>\s*8/, "判断三类线损状态"],
      [/print\s*\(/, "打印完整结果"],
      [/^\s{4}\S/m, "使用规范缩进"],
    ];
    const items = (q.rubric || []).map((r, index) => {
      const passed = checks[index]?.[0].test(code) || false;
      return { earned: passed ? r.points || 0 : 0, max: r.points || 0, comment: passed ? `已完成：${checks[index][1]}` : `未检测到：${checks[index]?.[1] || r.item}` };
    });
    const score = Math.min(q.score, items.reduce((sum, item) => sum + item.earned, 0));
    return {
      score,
      items,
      console: [
        "代码结构检查完成（未执行 Python）。",
        "点击“运行 Python”才能看到你的程序实际打印的内容。",
      ].join("\n"),
    };
  }
  const checks = [
    [/import\s+pandas|from\s+pandas|pd\./, "导入 pandas"],
    [/read_csv\(.+business_data\.csv|read_csv\(.+text_classification_data\.csv/, "读取指定 CSV"],
    [/strip\(|applymap|str\.strip/, "去除空格或文本清洗"],
    [/to_datetime|jieba\.lcut|jieba\.cut/, "日期转换或中文分词"],
    [/fillna|stopwords|停用词/, "缺失值或停用词处理"],
    [/amount.*>=\s*0|TfidfVectorizer|fit_transform/, "异常过滤或特征提取"],
    [/drop_duplicates|processed_content|cleaned_text/, "去重或生成处理列"],
    [/amount_level|get_amount_level|shape/, "新增字段或输出特征形状"],
    [/print\(/, "打印控制台结果"],
    [/to_csv\(.+cleaned_data\.csv|to_csv\(.+cleaned_text\.csv/, "保存目标 CSV"],
  ];
  const matched = checks.filter(([pattern]) => pattern.test(code));
  const rubric = q.rubric || [];
  const items = rubric.map((r, index) => {
    const passed = index < matched.length || checks[index]?.[0].test(code);
    return {
      earned: passed ? r.points || 0 : 0,
      max: r.points || 0,
      comment: passed ? `命中：${matched[index]?.[1] || r.item}` : "未在代码中检测到对应实现。",
    };
  });
  const score = Math.min(q.score, items.reduce((sum, item) => sum + item.earned, 0));
  return {
    score,
    items,
    console: [
      "代码结构检查完成（未执行 Python）。",
      score >= 80 ? "主要步骤已覆盖；仍需在真实环境运行验证。" : "仍有关键步骤未覆盖。",
    ].join("\n"),
  };
}

function explainPythonRuntime(q, result) {
  if (result.timedOut) return "运行超时。请检查是否写了不会结束的循环，或程序是否在等待输入。";
  if (result.truncated) return "输出过长，运行已停止。请减少循环打印或检查是否反复报错。";
  if (result.exitCode !== 0) {
    const error = result.stderr || "";
    if (/NotImplementedError/.test(error)) return "练习骨架中的任务还没写完。请从报错最后一行指出的 generate 或 send_request 开始，写好后再运行。";
    if (/IndentationError|TabError/.test(error)) return "缩进错误：检查 for、if、elif、else 后面的代码是否向右缩进一致。";
    if (/SyntaxError/.test(error)) return "语法错误：查看下方报错指出的行号，检查冒号、括号和引号。";
    if (/ModuleNotFoundError/.test(error)) return "缺少 Python 库：请按 README 安装项目依赖并重新启动本地服务。";
    if (/FileNotFoundError/.test(error)) return "找不到文件：检查代码中的路径是否与题目提供的路径完全一致。";
    if (/NameError/.test(error)) return "变量名错误：检查变量是否先定义后使用，以及拼写是否一致。";
    if (/ZeroDivisionError/.test(error)) return "发生除以零：计算线损率前需要检查供电量是否为 0。";
    return "程序运行失败。先看下方报错的最后一行，再定位它提示的代码行。";
  }
  if (q.id === "SS-4-3-3-02") {
    const report = result.imagePractice;
    if (report?.unavailable) return report.unavailable;
    const count = report?.outputs?.length || 0;
    return count === 3
      ? "程序运行结束，已生成三张增强图片。请查看图片对照及逐项核对；随机性和光度参数仍需人工复核。"
      : `程序运行结束，但只找到 ${count} / 3 张有效增强图片。请检查目录、文件名和保存语句。`;
  }
  if (q.id === "SS-6-4-4-04") {
    if (result.grade?.unavailable) return `程序已运行，但${result.grade.unavailable}`;
    if (result.grade) return `程序已运行，自动核验 ${result.grade.score} / ${result.grade.max}。下方可查看未通过的检查项；代码规范另需人工核对。`;
    const hasNumber = (line, value) => {
      const number = String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const suffix = String(value).includes(".") ? "0*" : "(?:\\.0+)?";
      return new RegExp(`(^|[^\\d.-])${number}${suffix}(?=$|[^\\d.])`).test(line);
    };
    const expected = [
      ["T001", "700", "5.6", "线损正常"],
      ["T002", "50", "0.51", "线损正常"],
      ["T003", "1600", "10.53", "高线损异常"],
      ["T004", "-300", "-3.49", "负线损异常"],
    ];
    const lines = result.stdout.split(/\r?\n/);
    const missing = expected.filter(([id, loss, rate, status]) => !lines.some((line) => line.includes(id) && hasNumber(line, loss) && hasNumber(line, rate) && line.includes(status)));
    return missing.length
      ? `程序已运行，但有 ${missing.length} 条台区结果未能核对。请逐行打印编号、线损电量、线损率和状态；再对照题目检查。`
      : "运行成功：四条台区的线损电量、线损率和状态均与预期相符。此处只核对输出，不替代人工评分。";
  }
  if (modelFillTasks[q.id]) {
    if (!(/准确率\s*[：:]|accuracy\s*[：:]/i.test(result.stdout) && /F1\s*[：:]/i.test(result.stdout))) {
      return "程序已运行，但未看到准确率和 F1；请检查最后的计算与 print 语句。";
    }
    if (result.stdout.includes("F1 未达到要求")) {
      return `程序运行成功，但这份数据的 F1 低于题设 ${modelFillTasks[q.id].answers[12]}；指标未达标不等于填空或运行出错。请核对代码后如实记录结果。`;
    }
    return `运行成功，已输出准确率和 F1。请再核对是否使用分层划分、仅在训练集拟合标准化器，以及 F1 是否达到 ${modelFillTasks[q.id].answers[12]}。`;
  }
  if (q.id === "SS-6-4-4-02") return result.stdout.trim()
    ? "程序已运行。请逐项核对：10 条不同文本、每条状态和耗时、5 人并发，以及成功率和响应时间等统计。能运行不代表已通过评分。"
    : "Python 已执行，但没有打印测试结果。练习骨架仍需完成请求调用、逐条记录和统计输出。";
  return "程序已运行。请按题目逐项核对输出及生成文件。";
}

const performanceChecks = [
  "类接收文本，并返回模拟续写内容",
  "延迟和错误率可配置；随机失败时程序不会整体崩溃",
  "顺序发送 10 条不同文本，逐条记录状态与响应时间",
  "用 5 个并发线程发起请求，并能区分各请求结果",
  "计算成功率、平均响应时间、吞吐量及最大/最小响应时间",
];

const imagePracticeFiles = [
  { name: "inspection_small.jpg", size: "420 × 320", note: "小图，检验填充或缩放" },
  { name: "inspection_tall.jpg", size: "700 × 900", note: "竖图，检验随机裁剪" },
  { name: "inspection_wide.jpg", size: "1200 × 800", note: "宽图，检验随机裁剪" },
];

const imageRubricLabels = [
  "定位并遍历输入目录", "只处理 JPG", "生成四位编号文件名", "实际重命名原图",
  "读取图像", "识别小于 512 的图", "填充或等比缩放小图", "随机裁剪坐标合法",
  "裁剪为 512×512", "旋转角在 ±15°", "旋转空白处填黑", "亮度系数 0.8–1.2",
  "执行亮度变换", "对比度系数 1.5", "执行对比度变换", "创建输出目录",
  "输出文件加 _aug 后缀", "物理保存增强图片", "脚本完整运行", "规范交付与用时",
];

function renderImageWorkbench(q, pythonOptions) {
  const report = state.pythonRuntime?.imagePractice;
  const running = state.pythonRuntime?.running;
  const outputs = report?.outputs || [];
  const items = report?.items || imageRubricLabels.map((name, index) => ({ order: index + 1, name, state: "待运行", evidence: "" }));
  layout(`
    <div class="image-workbench">
      <section class="image-task">
        <label class="field"><span>选择 Python 题</span><select data-action="select-python-question">${pythonOptions}</select></label>
        <div class="tag-row"><span class="tag">${q.id}</span><span class="tag">${q.level}</span><span class="tag">${q.timeLimitMinutes}分钟</span><span class="tag">题库页 32–36</span></div>
        <h3>${escapeHTML(q.title)}</h3>
        <p class="muted">原题要求编写完整 Python 脚本；这里提供模拟图片，并在本机真实运行。原题没有附带图片文件。</p>
        <h4>交付目标</h4>
        <ol class="image-task-steps">
          <li>从 <code>raw_images/</code> 找出 JPG，按四位编号实际重命名。</li>
          <li>小图先填充或等比缩放，再随机裁成 512×512。</li>
          <li>在 ±15° 内旋转并填黑；随机调整亮度，对比度设为 1.5 倍。</li>
          <li>将三张结果以 <code>_aug.jpg</code> 保存至 <code>augmented_images/</code>。</li>
        </ol>
        <details class="model-explanations"><summary>查看原题全文</summary><div class="question-text">${escapeHTML(q.questionText)}</div></details>
        <p class="muted">原 PDF 评分表列出 20 项动作，但配分栏为空；题头写 60 分钟，末项出现 90 分钟。本台只逐项反馈，不显示虚构的官方总分。</p>
      </section>
      <section class="image-tools">
        <div class="button-row">
          <button class="btn primary" data-action="run-python-real" ${running ? "disabled" : ""}>${running ? "运行中…" : "运行 Python"}</button>
          <button class="btn" data-action="download-image-code">下载 .py</button>
          <button class="btn" data-action="load-image-starter">载入练习骨架</button>
          <button class="btn" data-action="clear-image-code">空白重练</button>
        </div>
        <p class="muted">脚本草稿自动保存在当前浏览器。每次运行都会重新准备相同的模拟素材；运行只在本机服务中可用。</p>
        <h4>raw_images/ <span class="image-count">3 JPG · 1 PNG 干扰文件</span></h4>
        <div class="image-gallery">${imagePracticeFiles.map((file) => `<figure class="image-file"><img src="./data/practice-images/raw_images/${file.name}" alt="模拟素材：${escapeHTML(file.note)}" loading="lazy"><figcaption><strong>${file.name}</strong><span>${file.size} · ${file.note}</span></figcaption></figure>`).join("")}</div>
        <p class="muted">另有 <code>ignore.png</code>，按题意不应被重命名或增强。</p>
        <label class="field"><span>答题脚本 SS-4-3-3-02.py</span><textarea class="code-editor image-code-editor" data-python-code spellcheck="false" placeholder="从这里开始编写完整的 Python 脚本">${escapeHTML(state.pythonCode)}</textarea></label>
        <details class="model-explanations"><summary>查看教学参考实现（非官方答案）</summary><p>先自己练习。载入参考实现会替换当前编辑器内容。</p><button class="btn" data-action="load-image-answer">载入参考实现</button></details>
        <h4>运行结果</h4>
        <p class="muted" role="status" data-runtime-feedback>${escapeHTML(state.pythonRuntime?.feedback || "尚未运行。运行后会显示终端信息、生成的图片和逐项核对。")}</p>
        <pre class="console" data-runtime-output>${escapeHTML(running ? "正在运行…" : [state.pythonRuntime?.stdout, state.pythonRuntime?.stderr].filter(Boolean).join("\n") || "尚未运行。")}</pre>
        <h4>augmented_images/ <span class="image-count">${outputs.length} / 3 张有效图片</span></h4>
        ${outputs.length ? `<div class="image-gallery">${outputs.map((file) => `<figure class="image-file"><img src="${escapeHTML(file.dataUrl)}" alt="${escapeHTML(file.name)} 的实际运行结果"><figcaption><strong>${escapeHTML(file.name)}</strong><span>${file.width} × ${file.height} · <a href="${escapeHTML(file.dataUrl)}" download="${escapeHTML(file.name)}">下载图片</a></span></figcaption></figure>`).join("")}</div>` : `<p class="muted">尚无可预览的增强图片。</p>`}
        <h4>按原卷动作逐项核对</h4>
        ${report?.unavailable ? `<p class="muted">${escapeHTML(report.unavailable)}</p>` : ""}
        <div class="image-checks">${items.map((item) => `<div class="image-check"><span class="image-check__number">${item.order}</span><strong>${escapeHTML(item.name)}</strong><span class="image-check__state" data-state="${escapeHTML(item.state)}">${escapeHTML(item.state)}</span>${item.evidence ? `<p>${escapeHTML(item.evidence)}</p>` : ""}</div>`).join("")}</div>
        <p class="muted">“待人工复核”表示单次运行无法证明随机性、参数范围或视觉效果，需要查看代码并多次运行；自动结果不等于正式成绩。</p>
      </section>
    </div>
  `);
}

function renderPerformanceWorkbench(q, pythonOptions) {
  const running = state.pythonRuntime?.running;
  const checked = state.store.performanceChecks || [];
  layout(`
    <div class="sandbox-layout performance-layout">
      <section class="card pad">
        <label class="field"><span>选择 Python 题</span><select data-action="select-python-question">${pythonOptions}</select></label>
        <div class="tag-row"><span class="tag">${q.id}</span><span class="tag">${q.level}</span><span class="tag">${q.timeLimitMinutes}分钟</span><span class="tag">题库页 ${q.sourcePages.join(", ")}</span></div>
        <h3>${escapeHTML(q.title)}</h3>
        <p class="muted">原题指定普通计算机、Python 和文本编辑器。这里模拟编写、运行、观察结果和保存脚本，不模拟真实外部 API。</p>
        <h4>试题任务</h4>
        <ol class="lesson-actions">
          <li>编写 <code>TextGeneratorSimulator</code> 类，接收输入文本并返回模拟续写。</li>
          <li>让响应延迟和随机错误率可配置，例如约 200 毫秒、2% 失败率。</li>
          <li>顺序发送 10 条不同文本，保存每次请求的状态与响应时间。</li>
          <li>使用 Python 线程模拟 5 人并发，记录各请求结果。</li>
          <li>统计成功率、平均响应时间、吞吐量，以及最大/最小响应时间等指标。</li>
        </ol>
        <details class="model-explanations"><summary>查看题库原文（含 OCR 断行）</summary><div class="question-text">${escapeHTML(q.questionText)}</div></details>
        <h4>交卷前逐项核对</h4>
        <div class="performance-checks">${performanceChecks.map((item, index) => `<label><input type="checkbox" data-performance-check="${index}" ${checked.includes(index) ? "checked" : ""}>${escapeHTML(item)}</label>`).join("")}</div>
        <p class="muted">以上是按题库第 234–235 页整理的自查项，不是自动评分；原评分表还会看代码清晰度和结果记录。</p>
        <details class="model-explanations"><summary>零基础提示：按什么顺序写</summary>
          <ol>
            <li><strong>先写类：</strong><code>class</code> 是模拟器的蓝图，<code>__init__</code> 保存延迟和错误率。</li>
            <li><strong>再模拟一次请求：</strong><code>time.sleep</code> 接受秒，200 毫秒要除以 1000；<code>random.random()</code> 小于错误率时抛出错误。</li>
            <li><strong>记录结果：</strong>用 <code>time.perf_counter()</code> 在请求前后计时；用 <code>try/except</code> 把失败也记下来。</li>
            <li><strong>再做两轮测试：</strong>先顺序循环 10 条不同文本，再用 <code>ThreadPoolExecutor(max_workers=5)</code> 测并发。</li>
            <li><strong>最后统计：</strong>成功率 = 成功数 / 请求数；吞吐量 = 请求数 / 总耗时。10 次请求未必恰好出现 2% 的失败，可临时调高错误率验证异常处理，再改回题设值。</li>
          </ol>
        </details>
      </section>
      <section class="card pad">
        <label class="field performance-mobile-picker"><span>选择 Python 题</span><select data-action="select-python-question">${pythonOptions}</select></label>
        <h3 class="performance-mobile-title">${escapeHTML(q.title)}</h3>
        <div class="button-row">
          <button class="btn primary" data-action="run-python-real" ${running ? "disabled" : ""}>${running ? "运行中…" : "运行 Python"}</button>
          <button class="btn" data-action="download-python-answer">下载 .py</button>
          <button class="btn" data-action="load-performance-starter">载入练习骨架</button>
          <button class="btn" data-action="clear-performance-code">空白重练</button>
        </div>
        <p class="muted">代码草稿自动保存在当前浏览器；真实运行仅在本机服务网址可用。题目是编程题，画流程图不能代替脚本。</p>
        <label class="field"><span>答题文件 SS-6-4-4-02.py</span><textarea class="code-editor performance-editor" data-python-code spellcheck="false" placeholder="在这里编写 Python 脚本">${escapeHTML(state.pythonCode)}</textarea></label>
        <h4>真实运行结果</h4>
        <p class="muted" role="status" data-runtime-feedback>${escapeHTML(state.pythonRuntime?.feedback || "点击“运行 Python”后查看实际输出或报错。")}</p>
        <pre class="console" data-runtime-output>${escapeHTML(running ? "正在运行…" : [state.pythonRuntime?.stdout, state.pythonRuntime?.stderr].filter(Boolean).join("\n") || (state.pythonRuntime?.exitCode === 0 ? "程序已执行，但没有输出。" : "尚未运行。"))}</pre>
        <details class="model-explanations"><summary>查看一份参考实现（非官方答案）</summary>
          <p>先自己尝试；需要对照时再展开。载入参考实现会替换当前编辑器内容。</p>
          <div class="button-row"><button class="btn" data-action="load-performance-answer">载入参考实现到编辑器</button></div>
          <pre class="performance-reference">${escapeHTML(samples.performanceAnswer)}</pre>
        </details>
      </section>
    </div>
  `);
}

function oldPythonDraft(qid) {
  const values = state.store.modelBlanks?.[qid];
  if (modelFillTasks[qid] && values?.some(value => value.trim())) {
    return modelFillTasks[qid].template.replace(/____(\d+)____/g, (blank, number) => values[Number(number) - 1] || blank);
  }
  return state.store.pythonDrafts?.[qid] || state.store.lessons?.[qid]?.code || '';
}

function notebookContext() {
  const mode = state.store.notebookMode || 'practice';
  const key = `${state.pythonQuestionId}:${mode}`;
  return { mode, key, record: state.notebooks[key] ||= {} };
}

function notebookTitle(q) { return q.title.split(/。|\s*装有\s*Python/)[0]; }

function publicLiteNotebookUrl(questionId) {
  return `./lite/lab/index.html?path=${encodeURIComponent(`${questionId}/answer.ipynb`)}`;
}

async function prepareNotebook(options = {}) {
  const questionId = state.pythonQuestionId;
  const { mode, record } = notebookContext();
  if (record.busy) return;
  record.busy = true;
  record.error = '';
  renderPythonSandbox();
  try {
    const response = await fetch('/api/jupyter/open', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ questionId, mode, ...options }) });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || '请从本机服务打开网站，并安装 Jupyter 依赖。');
    }
    record.workspace = await response.json();
    record.result = record.workspace.lastResult || null;
  } catch (error) { record.error = error.message; }
  finally {
    record.busy = false;
    if (location.hash.startsWith('#/practice/python')) renderPythonSandbox();
  }
}

function renderPythonSandbox() {
  const questions = state.questions.filter(q => ['python_coding', 'model_evaluation'].includes(q.practiceType));
  const q = questions.find(q => q.id === (state.pythonQuestionId || state.store.pythonQuestionId)) || questions[0];
  state.pythonQuestionId = q.id;
  if (!['127.0.0.1', 'localhost'].includes(location.hostname)) {
    layout(`
      <section class="notebook-workbench">
        <div class="notebook-toolbar">
          <label class="field"><span>Python 考试题 · ${questions.length} 题</span><select data-action="select-python-question">
            ${questions.map(item => `<option value="${item.id}" ${item.id === q.id ? 'selected' : ''}>${escapeHTML(item.level)} · ${item.id} · ${escapeHTML(notebookTitle(item))}</option>`).join('')}
          </select></label>
        </div>
        <h3>${escapeHTML(notebookTitle(q))}</h3>
        <div class="tag-row"><span class="tag">${q.id}</span><span class="tag">${q.timeLimitMinutes} 分钟</span><span class="tag">浏览器 Python</span></div>
        <p class="muted">这道题可在浏览器 Jupyter 中编写并运行。练习保存在当前浏览器，不会自动同步到其他设备。</p>
        <div class="button-row">
          <a class="btn primary" href="${publicLiteNotebookUrl(q.id)}" target="_blank" rel="noopener">打开浏览器 Jupyter ↗</a>
          <a class="btn" href="#/learn/${q.id}">老师带练</a>
          <a class="btn" href="#/question/${q.id}">原题与评分标准</a>
          <a class="btn" href="./README.md">本机运行步骤</a>
        </div>
        <p class="public-lite-note"><strong>首次使用：</strong>打开后等待右上角内核就绪，点击代码单元格，补写代码，再按 Shift + Enter 运行。需要换设备时请先下载笔记本。${q.id === 'SS-6-4-4-02' ? '性能测试题在浏览器内使用 asyncio 模拟并发，线程池写法需用本地 Jupyter 练习。' : ''}</p>
        <details open><summary>题目与交付要求</summary><div class="question-text">${escapeHTML(q.questionText)}</div></details>
      </section>
    `, 'Python 题目');
    return;
  }
  const { mode, record } = notebookContext();
  const workspace = record.workspace;
  const result = record.result;
  const busy = record.busy;
  const download = name => `/api/jupyter/artifact?id=${encodeURIComponent(result.submissionId)}&file=${name}`;
  layout(`
    <section class="notebook-workbench">
      <div class="notebook-toolbar">
        <label class="field"><span>Python 考试题 · ${questions.length} 题</span><select data-action="select-python-question">
          ${questions.map(item => `<option value="${item.id}" ${item.id === q.id ? 'selected' : ''}>${escapeHTML(item.level)} · ${item.id} · ${escapeHTML(notebookTitle(item))}</option>`).join('')}
        </select></label>
        <fieldset class="notebook-modes"><legend>模式</legend>
          <label><input type="radio" name="notebook-mode" value="practice" data-action="notebook-mode" ${mode === 'practice' ? 'checked' : ''}>教学练习</label>
          <label><input type="radio" name="notebook-mode" value="exam" data-action="notebook-mode" ${mode === 'exam' ? 'checked' : ''}>模拟考试</label>
        </fieldset>
        <span class="notebook-clock" data-notebook-clock></span>
      </div>
      <h3>${escapeHTML(notebookTitle(q))}</h3>
      <div class="tag-row"><span class="tag">${q.id}</span><span class="tag">${q.timeLimitMinutes} 分钟</span><span class="tag">JupyterLab · Python 3</span></div>
      <div class="button-row notebook-actions">
        ${workspace ? `<a class="btn primary" href="${escapeHTML(workspace.url)}" target="_blank" rel="noopener">打开 JupyterLab ↗</a>` : ''}
        <button class="btn success" data-action="notebook-submit" ${!workspace || busy ? 'disabled' : ''}>${record.submitting ? '正在重新运行检查…' : '提交已保存答案'}</button>
        <button class="btn" data-action="notebook-new" ${busy ? 'disabled' : ''}>新一轮练习</button>
        ${mode === 'practice' && oldPythonDraft(q.id) ? `<button class="btn" data-action="notebook-import" ${busy ? 'disabled' : ''}>导入旧网页草稿</button>` : ''}
        ${record.error ? '<button class="btn" data-action="notebook-retry">重新连接</button>' : ''}
      </div>
      <p role="status" class="muted">${escapeHTML(record.error || (busy ? record.submitting ? '正在用空白内核检查已保存的答题文件。' : '正在准备 Jupyter 考试文件…' : workspace ? `答题文件：${workspace.path}/answer.ipynb` : '准备本机考试环境'))}</p>
      <div class="notebook-sections">
        <details open><summary>题目与交付要求</summary><div class="question-text">${escapeHTML(q.questionText)}</div></details>
        <details><summary>数据文件</summary><ul>${(workspace?.files || []).map(file => `<li><code>${escapeHTML(file)}</code></li>`).join('') || '<li>本题的数据见题目正文。</li>'}</ul>${q.id === 'SS-4-3-3-02' ? '<p>本题使用模拟图片。</p>' : ''}</details>
        ${mode === 'practice' ? `<details><summary>老师带练与解析</summary><p><a href="#/learn/${q.id}">查看老师带练</a></p>${(modelFillTasks[q.id]?.explanations || []).map((text, i) => `<p>${i + 1}. ${escapeHTML(text)}</p>`).join('')}<p>教学参考.ipynb 与逐步解析.md 位于本轮练习文件夹。</p></details>` : ''}
      </div>
      <section class="notebook-results"><h3>提交检查</h3>
        ${result ? `<p>${result.exitCode === 0 ? '已保存的笔记本从头运行完成。' : '本次检查有未完成项，请查看报错。'} · 保存时间：${new Date(result.savedAt).toLocaleString()}</p>
          <div class="button-row"><a class="btn" href="${download('answer.py')}">下载 .py</a><a class="btn" href="${download('executed.ipynb')}">下载检查后笔记本</a><a class="btn" href="${download('submission.zip')}">下载交卷包</a></div>
          <pre class="console">${escapeHTML([result.stdout, result.stderr].filter(Boolean).join('\n') || '本次没有打印输出。')}</pre>
          <ul>${(result.checks || []).map(item => `<li><strong>${escapeHTML(item.state)} · ${escapeHTML(item.name)}</strong>：${escapeHTML(item.evidence)}</li>`).join('')}</ul>
          ${result.grade ? renderLineLossGrade(result.grade) : ''}
          ${result.imagePractice?.outputs?.length ? `<div class="image-gallery">${result.imagePractice.outputs.filter(image => image.dataUrl).map(image => `<figure class="image-file"><img src="${image.dataUrl}" alt="${escapeHTML(image.name)} 的检查结果"><figcaption>${escapeHTML(image.name)} · ${image.width} × ${image.height}</figcaption></figure>`).join('')}</div>` : ''}
          ${result.imagePractice ? `<ul>${(result.imagePractice.items || []).map(item => `<li>${escapeHTML(item.state)} · ${escapeHTML(item.name)}：${escapeHTML(item.evidence)}</li>`).join('')}</ul>` : ''}
          ${!result.grade ? '<p class="muted">运行检查不等于正式成绩；题目要求和输出内容仍需逐项核对。</p>' : ''}` : '<p class="muted">尚未提交检查。</p>'}
      </section>
    </section>
  `, 'Jupyter 本机考试环境');
  updateNotebookClock();
  if (!workspace && !busy && !record.error) void prepareNotebook();
}

function updateNotebookClock() {
  const element = document.querySelector('[data-notebook-clock]');
  if (!element) return;
  const { mode, record } = notebookContext();
  if (!record.workspace) { element.textContent = ''; return; }
  const elapsed = Math.max(0, Math.floor((Date.now() - record.workspace.startedAt) / 1000));
  const remaining = record.workspace.timeLimitMinutes * 60 - elapsed;
  const seconds = mode === 'exam' ? Math.abs(remaining) : elapsed;
  element.textContent = `${mode === 'exam' ? remaining < 0 ? '已超时' : '剩余' : '用时'} ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
setInterval(updateNotebookClock, 1000);

function renderLegacyPythonSandbox() {
  const pythonQuestions = state.questions.filter((q) => q.practiceType === "python_coding" || modelFillTasks[q.id]);
  const q = byId(state.pythonQuestionId || state.store.pythonQuestionId) || pythonQuestions[0];
  state.pythonQuestionId = q?.id || "";
  const modelFill = Boolean(modelFillTasks[q.id]);
  if (!modelFill && !state.pythonCode) {
    const saved = state.store.pythonDrafts?.[q.id];
    if (typeof saved === "string") state.pythonCode = saved;
    else if (q.id === "SS-4-3-3-02") state.pythonCode = "";
    else if (q.id === "SS-6-4-4-04") state.pythonCode = samples.lineLossStarter;
    else if (q.id === "SS-6-4-4-02") state.pythonCode = samples.performanceStarter;
    else state.pythonCode = samples.pythonTemplate;
  }
  const runnable = q.id === "SS-6-4-4-04" || modelFill;
  const running = state.pythonRuntime?.running;
  const pythonOptions = pythonQuestions.map((item) => `<option value="${item.id}" ${item.id === q.id ? "selected" : ""}>${escapeHTML(item.id)} · ${escapeHTML(item.title)}</option>`).join("");
  if (q.id === "SS-4-3-3-02") return renderImageWorkbench(q, pythonOptions);
  if (q.id === "SS-6-4-4-02") return renderPerformanceWorkbench(q, pythonOptions);
  layout(`
    <div class="sandbox-layout ${modelFill ? "model-fill-layout" : ""}">
      <section class="card pad">
        <label class="field"><span>选择 Python 题</span><select data-action="select-python-question">
          ${pythonOptions}
        </select></label>
        <div class="tag-row">
          <span class="tag">${q.id}</span><span class="tag">${q.level}</span><span class="tag">${q.timeLimitMinutes}分钟</span><span class="tag">题库页 ${q.sourcePages.join(", ")}</span>
        </div>
        <h3>${escapeHTML(q.title)}</h3>
        <div class="question-text">${escapeHTML(q.questionText)}</div>
        <h4>评分标准</h4>
        ${rubricTable(q, state.pythonResult)}
      </section>
      <section class="card pad">
        ${modelFill ? `<label class="field model-mobile-picker"><span>选择 Python 题</span><select data-action="select-python-question">${pythonOptions}</select></label>` : ""}
        <div class="button-row">
          ${!modelFill ? `<button class="btn" data-action="load-python-template">载入示例答案</button>` : ""}
          ${q.practiceType === "python_coding" && q.id !== "SS-6-4-4-04" ? `<button class="btn" data-action="check-python-structure">检查代码结构</button><button class="btn success" data-action="submit-python">保存本次检查</button>` : ""}
          ${runnable ? `<button class="btn primary" data-action="run-python-real" ${running ? "disabled" : ""}>${running ? "运行中…" : q.id === "SS-6-4-4-04" ? "运行并参考评分" : "运行 Python"}</button>` : ""}
          ${modelFill ? `<button class="btn" data-action="clear-model-blanks" ${running ? "disabled" : ""}>清空填写</button>` : ""}
        </div>
        ${modelFill ? `<p class="muted">按原题填写 13 处空格；其余代码已固定。题目 CSV 已放在运行目录的 04/ 文件夹，填空自动保存在当前浏览器。</p>` : runnable ? `<p class="muted">真实运行仅在本机服务中可用。${q.id === "SS-6-4-4-04" ? "运行后会替换台区数据复测；练习分不是官方考试成绩。" : "运行后会核对四条台区的结果。"}代码草稿自动保存在当前浏览器。</p>` : ""}
        ${modelFill ? renderModelFillEditor(q) : `<textarea class="code-editor" data-python-code spellcheck="false">${escapeHTML(state.pythonCode)}</textarea>`}
        ${runnable ? `<h4>真实运行结果</h4><p class="muted" role="status" data-runtime-feedback>${escapeHTML(state.pythonRuntime?.feedback || "点击“运行 Python”后，这里会显示实际输出或报错。")}</p><pre class="console" data-runtime-output>${escapeHTML(state.pythonRuntime?.running ? "正在运行…" : [state.pythonRuntime?.stdout, state.pythonRuntime?.stderr].filter(Boolean).join("\n") || "尚未运行。")}</pre>` : ""}
        ${q.id === "SS-6-4-4-04" ? renderLineLossGrade(state.pythonRuntime?.grade) : q.practiceType === "python_coding" ? `<h4>代码结构参考检查</h4><pre class="console">${escapeHTML(state.pythonResult?.console || "尚未检查；结构分不是实际运行成绩。")}</pre><div class="score-panel"><strong>${state.pythonResult?.score ?? 0}</strong><span class="muted"> / ${q.score} 代码结构参考分</span></div>` : ""}
      </section>
    </div>
  `);
}

function renderLineLossGrade(grade) {
  if (!grade) return `<div data-grade-panel><h4>练习参考评分</h4><p class="muted">运行后显示逐项核对结果；另有代码规范需人工核对。</p></div>`;
  if (grade.unavailable) return `<div data-grade-panel><h4>练习参考评分</h4><p class="muted">${escapeHTML(grade.unavailable)}</p></div>`;
  const partial = grade.mode === "partial";
  return `<div data-grade-panel><h4>练习参考评分</h4><div class="score-panel"><strong>${grade.score}</strong><span class="muted"> / ${grade.max} ${partial ? "代码检查参考分（运行项未得分）" : "自动核验分"}；另有 ${grade.manual} 分代码规范待人工核对</span></div>
    ${partial ? `<p class="muted">${escapeHTML(grade.note || "程序未成功运行：仅核对可从有效代码结构确认的步骤，计算结果与输出暂不给分。")}</p>` : ""}
    <div class="table-wrap"><table class="rubric-table"><thead><tr><th>练习检查项</th><th>得分</th><th>核对依据</th></tr></thead><tbody>${grade.items.map((item) => `<tr><td>${escapeHTML(item.name)}</td><td>${item.earned} / ${item.max}</td><td>${escapeHTML(item.evidence)}</td></tr>`).join("")}</tbody></table></div>
    <p class="muted">这是本地练习权重，不是原卷配分或正式考试成绩。代码规范、可读性与考场操作仍需人工核对。</p></div>`;
}

function cleanComment(value) {
  return value.replace(/<[^>]+>/g, "").replace(/[^\u4e00-\u9fa5A-Za-z0-9，。！？,.!?\s]/g, "").replace(/\s+/g, " ").trim();
}

function guessSentiment(text) {
  if (/满意|好|推荐|准确|快|稳定/.test(text)) return "正面";
  if (/失败|失望|卡顿|差|问题/.test(text)) return "负面";
  return "中性";
}

function scoreLabels(q) {
  const completed = state.labels.filter((item) => item.clean && item.label).length;
  const counts = { 正面: 0, 负面: 0, 中性: 0 };
  state.labels.forEach((item) => {
    if (item.label) counts[item.label] += 1;
  });
  const ratio = completed / state.labels.length;
  const rubric = q.rubric || [];
  const items = rubric.map((r, index) => {
    const pass =
      (index === 0 && completed > 0) ||
      (index === 1 && Object.values(counts).some(Boolean)) ||
      (index === 2 && state.labels.every((item) => item.clean)) ||
      (index === 3 && completed === state.labels.length) ||
      (index === 4 && completed === state.labels.length);
    return { earned: pass ? r.points || 0 : 0, max: r.points || 0, comment: pass ? "已完成对应标注动作。" : "仍需补齐该项操作。" };
  });
  return { score: Math.round(items.reduce((sum, item) => sum + item.earned, 0) * ratio), items, counts };
}

function renderLabelingSandbox() {
  const q = firstByPractice("text_labeling");
  if (!state.labels.length) state.labels = samples.comments.map((item) => ({ ...item }));
  layout(`
    <div class="sandbox-layout">
      <section class="card pad">
        <div class="tag-row"><span class="tag">${q.id}</span><span class="tag">${q.level}</span><span class="tag">题库页 ${q.sourcePages.join(", ")}</span></div>
        <h3>${escapeHTML(q.title)}</h3>
        <div class="question-text">${escapeHTML(q.questionText)}</div>
        <h4>评分标准</h4>
        ${rubricTable(q, state.labelResult)}
      </section>
      <section class="card pad">
        <div class="button-row">
          <button class="btn" data-action="clean-label-text">清洗文本</button>
          <button class="btn" data-action="auto-label">批量标注</button>
          <button class="btn primary" data-action="submit-labels">提交评分</button>
          <button class="btn" data-action="export-labels">导出CSV</button>
        </div>
        <div class="label-list" style="margin-top:12px">
          ${state.labels
            .map(
              (item) => `
              <article class="label-item">
                <p><strong>原文：</strong>${escapeHTML(item.raw)}</p>
                <label class="field"><span>清洗后文本</span><input data-label-clean="${item.id}" value="${escapeHTML(item.clean)}" /></label>
                <label class="field"><span>情感类别</span><select data-label-kind="${item.id}">
                  ${["", "正面", "负面", "中性"].map((v) => `<option value="${v}" ${item.label === v ? "selected" : ""}>${v || "待标注"}</option>`).join("")}
                </select></label>
              </article>`,
            )
            .join("")}
        </div>
        <section class="card pad score-panel" style="margin-top:12px">
          <strong>${state.labelResult?.score ?? 0}</strong><span class="muted"> / ${q.score} 分</span>
          <p class="muted">统计：正面 ${state.labelResult?.counts?.正面 || 0}，负面 ${state.labelResult?.counts?.负面 || 0}，中性 ${state.labelResult?.counts?.中性 || 0}</p>
        </section>
      </section>
    </div>
  `);
}

function scoreFlow(q) {
  const required = ["数据源", "数据采集", "数据校验", "数据清洗", "模型测试", "监控告警", "人工审核", "结果反馈"];
  const security = ["加密传输", "访问控制", "权限管理", "数据脱敏"];
  const quality = ["完整性校验", "异常检测", "缺失补全", "时序数据库"];
  const labels = state.flowNodes.map((node) => node.label);
  const has = (items) => items.some((item) => labels.includes(item));
  const groups = [
    required.every((item) => labels.includes(item)),
    has(security),
    has(quality),
    labels.length >= 8,
    labels.includes("系统优化") || labels.includes("结果反馈"),
  ];
  const items = (q.rubric || []).map((r, index) => ({
    earned: groups[index] ? r.points || 0 : 0,
    max: r.points || 0,
    comment: groups[index] ? "流程覆盖该评分点。" : "流程节点仍缺少该评分点。",
  }));
  return { score: Math.min(q.score, items.reduce((sum, item) => sum + item.earned, 0)), items };
}

function caseFlowDraft() {
  state.store.flowCaseDrafts ||= {};
  state.store.flowCaseDrafts["SS-6-4-4-03"] ||= {
    fields: {},
    samples: caseFlowSampleRows.map((row) => ({ ...row })),
    canvas: { nodes: [], edges: [] },
  };
  const draft = state.store.flowCaseDrafts["SS-6-4-4-03"];
  draft.canvas ||= { nodes: [], edges: [] };
  return draft;
}

function caseFlowExampleCanvas() {
  const positions = {
    input: [42, 65], detect: [270, 65], language: [498, 65],
    zh: [42, 240], en: [270, 240], es: [498, 240], mixed: [726, 240],
    clean: [42, 455], normalize: [270, 455], quality: [498, 455], store: [726, 455],
  };
  const titles = [...caseFlowStages, ...caseFlowBranches];
  const nodes = titles.map(([id, title]) => ({ id, key: id, title, type: id === "detect" ? "decision" : ["input", "store"].includes(id) ? "data" : "process", x: positions[id][0], y: positions[id][1] }));
  const pairs = [["input", "detect"], ["detect", "language"], ...caseFlowBranches.flatMap(([key]) => [["language", key], [key, "clean"]]), ["clean", "normalize"], ["normalize", "quality"], ["quality", "store"]];
  return { nodes, edges: pairs.map(([from, to]) => ({ from, to, label: "" })) };
}

function caseFlowCanvasNode(draft, id) {
  return draft.canvas.nodes.find((node) => node.id === id);
}

function caseFlowCanvasPath(from, to) {
  const width = 176;
  const height = 92;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const forward = dx >= 0;
    const x1 = from.x + (forward ? width : 0);
    const x2 = to.x + (forward ? 0 : width);
    const y1 = from.y + height / 2;
    const y2 = to.y + height / 2;
    const middle = (x1 + x2) / 2;
    return { d: `M${x1} ${y1} C${middle} ${y1} ${middle} ${y2} ${x2} ${y2}`, x: middle, y: (y1 + y2) / 2 - 7 };
  }
  const forward = dy >= 0;
  const x1 = from.x + width / 2;
  const x2 = to.x + width / 2;
  const y1 = from.y + (forward ? height : 0);
  const y2 = to.y + (forward ? 0 : height);
  const middle = (y1 + y2) / 2;
  return { d: `M${x1} ${y1} C${x1} ${middle} ${x2} ${middle} ${x2} ${y2}`, x: (x1 + x2) / 2, y: middle - 7 };
}

function caseFlowCanvasSvg(draft) {
  const nodes = draft.canvas.nodes;
  const edgeMarkup = draft.canvas.edges.map((edge) => {
    const from = caseFlowCanvasNode(draft, edge.from);
    const to = caseFlowCanvasNode(draft, edge.to);
    if (!from || !to) return "";
    const path = caseFlowCanvasPath(from, to);
    return `<path d="${path.d}" fill="none" stroke="#2c6da4" stroke-width="2" marker-end="url(#caseflow-arrow)"/><text x="${path.x}" y="${path.y}" text-anchor="middle" font-size="12" fill="#234c73">${escapeHTML(edge.label || "")}</text>`;
  }).join("");
  const nodeMarkup = nodes.map((node) => {
    const detail = node.key ? draft.fields[node.key] || "" : node.detail || "";
    const title = escapeHTML(node.title);
    const lines = Array.from(String(detail)).reduce((parts, char) => {
      if (!parts.length || parts[parts.length - 1].length >= 19) parts.push("");
      parts[parts.length - 1] += char;
      return parts;
    }, []).slice(0, 2);
    const x = node.x, y = node.y;
    const shape = node.type === "decision"
      ? `<path d="M${x + 88} ${y} L${x + 176} ${y + 46} L${x + 88} ${y + 92} L${x} ${y + 46} Z" fill="#fff8eb" stroke="#ae8545" stroke-width="2"/>`
      : `<rect x="${x}" y="${y}" width="176" height="92" rx="${node.type === "end" ? 38 : 5}" fill="${node.type === "data" ? "#e9f4fa" : "#fff"}" stroke="#6e9abf" stroke-width="2"/>`;
    return `${shape}<text x="${x + 88}" y="${y + 31}" text-anchor="middle" font-size="16" font-weight="700" fill="#123a5b">${title}</text>${lines.map((line, index) => `<text x="${x + 88}" y="${y + 54 + index * 17}" text-anchor="middle" font-size="11" fill="#526579">${escapeHTML(line)}</text>`).join("")}`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="980" height="690" viewBox="0 0 980 690"><rect width="980" height="690" fill="#f9fbfd"/><defs><marker id="caseflow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#2c6da4"/></marker></defs>${edgeMarkup}${nodeMarkup}</svg>`;
}

function renderCaseFlowKeepingScroll() {
  const old = app.querySelector(".caseflow-canvas-scroll");
  const left = old?.scrollLeft || 0;
  const top = old?.scrollTop || 0;
  renderFlowSandbox();
  const next = app.querySelector(".caseflow-canvas-scroll");
  if (next) { next.scrollLeft = left; next.scrollTop = top; }
}

function refreshCaseFlowEdges() {
  const svg = app.querySelector(".caseflow-canvas-lines");
  if (!svg) return;
  const draft = caseFlowDraft();
  svg.querySelectorAll("g").forEach((element) => element.remove());
  for (const edge of draft.canvas.edges) {
    const from = caseFlowCanvasNode(draft, edge.from);
    const to = caseFlowCanvasNode(draft, edge.to);
    if (!from || !to) continue;
    const path = caseFlowCanvasPath(from, to);
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    line.setAttribute("d", path.d);
    line.setAttribute("class", "caseflow-edge");
    line.setAttribute("marker-end", "url(#caseflow-arrow)");
    group.append(line);
    if (edge.label) {
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", path.x);
      label.setAttribute("y", path.y);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("class", "caseflow-edge-label");
      label.textContent = edge.label;
      group.append(label);
    }
    svg.append(group);
  }
}

function caseFlowTimeLeft() {
  return Math.max(0, (state.store.caseFlowTimerEndsAt || 0) - Date.now());
}

function caseFlowClockText() {
  const remaining = state.store.caseFlowTimerEndsAt ? caseFlowTimeLeft() : 90 * 60 * 1000;
  return `${String(Math.floor(remaining / 60000)).padStart(2, "0")}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0")}`;
}

function caseFlowReview(fields) {
  const groups = [
    ["七个核心环节", caseFlowStages.map(([key]) => [key, caseFlowStages.find(([id]) => id === key)[1]])],
    ["多语言适配", caseFlowBranches.map(([key, title]) => [key, title])],
    ["清洗与标准化规则", caseFlowRules.slice(0, 3).map(([key, title]) => [key, title])],
    ["语种扩展", [["extension", "新增语种"]]],
    ["输出规范", caseFlowRules.slice(4).map(([key, title]) => [key, title])],
  ];
  return groups.map(([title, items]) => ({
    title,
    filled: items.filter(([key]) => String(fields[key] || "").trim()).length,
    total: items.length,
    missing: items.filter(([key]) => !String(fields[key] || "").trim()).map(([, label]) => label),
  }));
}

function caseFlowSvg(fields) {
  const pieces = ['<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1210" viewBox="0 0 960 1210">',
    '<rect width="960" height="1210" fill="#fff"/>',
    '<text x="480" y="38" text-anchor="middle" font-size="22" font-weight="700" fill="#17202a">智能客服多语言数据处理流程</text>'];
  const lines = (value, x, y, size = 34, limit = 3) => {
    const chars = Array.from(String(value || "待填写"));
    const chunks = [];
    for (let index = 0; index < chars.length && chunks.length < limit; index += size) {
      const more = index + size < chars.length && chunks.length === limit - 1;
      chunks.push(chars.slice(index, index + size - (more ? 1 : 0)).join("") + (more ? "…" : ""));
    }
    return chunks.map((line, index) => `<text x="${x}" y="${y + index * 18}" text-anchor="middle" font-size="12" fill="#425466">${escapeHTML(line)}</text>`).join("");
  };
  const box = (x, y, width, height, title, detail, small = false) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="5" fill="${small ? "#f4f8fd" : "#fff"}" stroke="#7da6d0" stroke-width="1.5"/><text x="${x + width / 2}" y="${y + 26}" text-anchor="middle" font-size="${small ? 15 : 17}" font-weight="700" fill="#08345f">${escapeHTML(title)}</text>${lines(detail, x + width / 2, y + 48, small ? 13 : 34, small ? 3 : 2)}`;
  const arrow = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="#3675ad" stroke-width="2" fill="none" marker-end="url(#arrow)"/>`;
  pieces.push('<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="#3675ad"/></marker></defs>');
  const positions = { input: 70, detect: 200, language: 330, clean: 660, normalize: 790, quality: 920, store: 1050 };
  for (const [key, title] of caseFlowStages) pieces.push(box(230, positions[key], 500, 92, title, fields[key]));
  for (const [index, [key, title]] of caseFlowBranches.entries()) pieces.push(box(30 + index * 235, 455, 195, 120, title, fields[key], true));
  pieces.push(arrow(480, 162, 480, 200), arrow(480, 292, 480, 330));
  for (let index = 0; index < 4; index++) {
    const x = 127.5 + index * 235;
    pieces.push(arrow(480, 422, x, 455), arrow(x, 575, 480, 660));
  }
  pieces.push(arrow(480, 752, 480, 790), arrow(480, 882, 480, 920), arrow(480, 1012, 480, 1050));
  pieces.push('<text x="480" y="1185" text-anchor="middle" font-size="12" fill="#667085">详细规则见同题规则表 CSV；本图为练习产物，非官方模板。</text></svg>');
  return pieces.join("");
}

function caseFlowCsv(draft) {
  const rows = [["类别", "项目", "填写内容"]];
  for (const [key, title] of caseFlowStages) rows.push(["流程环节", title, draft.fields[key] || ""]);
  for (const [key, title] of caseFlowBranches) rows.push(["语种规则", title, draft.fields[key] || ""]);
  for (const [key, title] of caseFlowRules) rows.push(["专项规则", title, draft.fields[key] || ""]);
  rows.push([], ["样例原文", "语言标签", "处理后单行文本"]);
  for (const row of draft.samples) rows.push([row.raw, row.language, row.output]);
  return "\ufeff" + rows.map((row) => row.map((value) => `"${String(value || "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
}

function caseFlowCanvasView(draft) {
  const selected = caseFlowCanvasNode(draft, state.caseFlowSelected);
  const palette = [...caseFlowStages, ...caseFlowBranches];
  const edges = draft.canvas.edges.map((edge, index) => {
    const from = caseFlowCanvasNode(draft, edge.from);
    const to = caseFlowCanvasNode(draft, edge.to);
    if (!from || !to) return "";
    const path = caseFlowCanvasPath(from, to);
    return `<g><path d="${path.d}" class="caseflow-edge" marker-end="url(#caseflow-arrow)"/><text x="${path.x}" y="${path.y}" class="caseflow-edge-label" text-anchor="middle">${escapeHTML(edge.label || "")}</text></g>`;
  }).join("");
  const nodeHtml = draft.canvas.nodes.map((node) => {
    const detail = node.key ? draft.fields[node.key] || "" : node.detail || "";
    return `<button type="button" class="caseflow-canvas-node ${node.type} ${state.caseFlowSelected === node.id ? "selected" : ""} ${state.caseFlowConnecting === node.id ? "connecting" : ""}" style="left:${node.x}px;top:${node.y}px" data-action="caseflow-select-node" data-id="${escapeHTML(node.id)}" aria-label="${escapeHTML(node.title)}节点，拖动调整位置">
      <span class="caseflow-node-title">${escapeHTML(node.title)}</span><span class="caseflow-node-detail">${escapeHTML(detail || "填写处理方法")}</span>
    </button>`;
  }).join("");
  const related = selected ? draft.canvas.edges.map((edge, index) => ({ edge, index })).filter(({ edge }) => edge.from === selected.id || edge.to === selected.id) : [];
  return `<div class="caseflow-drawing">
    <div class="caseflow-palette"><strong>节点工具</strong><div class="caseflow-palette-buttons">${palette.map(([key, title]) => `<button class="btn" data-action="caseflow-add-node" data-key="${key}">${escapeHTML(title)}</button>`).join("")}</div>
      <div class="caseflow-palette-buttons"><button class="btn" data-action="caseflow-add-node" data-type="process">处理框</button><button class="btn" data-action="caseflow-add-node" data-type="decision">判断框</button><button class="btn" data-action="caseflow-add-node" data-type="data">数据框</button></div></div>
    <div class="caseflow-drawing-main"><div class="caseflow-canvas-scroll"><div class="caseflow-canvas" data-caseflow-canvas>
      <svg class="caseflow-canvas-lines" width="980" height="690" viewBox="0 0 980 690" aria-hidden="true"><defs><marker id="caseflow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#2c6da4"/></marker></defs>${edges}</svg>
      ${nodeHtml || '<div class="caseflow-empty">从上方添加节点，再拖动排布。选择一个节点后点“从此连线”，再点目标节点。</div>'}
    </div></div><aside class="caseflow-inspector"><h4>节点属性</h4>${selected ? `
      <label class="field"><span>名称</span><input data-caseflow-node-field="title" value="${escapeHTML(selected.title)}"></label>
      <label class="field"><span>形状</span><select data-caseflow-node-field="type">${[["process", "处理框"], ["decision", "判断框"], ["data", "数据框"], ["end", "圆角终点"]].map(([value, label]) => `<option value="${value}" ${selected.type === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
      <label class="field"><span>处理方法</span><textarea data-caseflow-node-field="detail" rows="5" placeholder="输入、处理步骤、输出">${escapeHTML(selected.key ? draft.fields[selected.key] || "" : selected.detail || "")}</textarea></label>
      <div class="caseflow-inspector-actions"><button class="btn primary" data-action="caseflow-connect">${state.caseFlowConnecting === selected.id ? "取消连线" : "从此连线"}</button><button class="btn danger" data-action="caseflow-remove-node">删除节点</button></div>
      <h4>相关连线</h4>${related.length ? related.map(({ edge, index }) => `<div class="caseflow-edge-row"><span>${escapeHTML(caseFlowCanvasNode(draft, edge.from)?.title || "")} → ${escapeHTML(caseFlowCanvasNode(draft, edge.to)?.title || "")}</span><input aria-label="连线文字" data-caseflow-edge-label="${index}" value="${escapeHTML(edge.label || "")}" placeholder="例如：中文"><button class="btn danger" data-action="caseflow-remove-edge" data-index="${index}" aria-label="删除连线">×</button></div>`).join("") : '<p class="muted">暂无连线</p>'}
    ` : '<p class="muted">选择画布中的节点，编辑名称和处理方法。</p>'}</aside></div>
    <p class="muted caseflow-drawing-status" role="status">${state.caseFlowConnecting ? "连线中：点击要连接到的目标节点。" : `已放置 ${draft.canvas.nodes.length} 个节点、${draft.canvas.edges.length} 条连线。草稿自动保存在本机浏览器。`}</p>
  </div>`;
}

function renderCaseFlowWorkbench(q, flowQuestions) {
  const draft = caseFlowDraft();
  const fields = draft.fields;
  const options = flowQuestions.map((item) => `<option value="${item.id}" ${item.id === q.id ? "selected" : ""}>${escapeHTML(item.id)} · ${escapeHTML(item.title)}</option>`).join("");
  const tabs = [["diagram", "流程图"], ["rules", "规则表"], ["review", "交卷核对"]];
  const field = (key, title, hint) => `<label class="caseflow-field"><span>${escapeHTML(title)}</span><textarea data-caseflow-field="${key}" placeholder="${escapeHTML(hint)}">${escapeHTML(fields[key] || "")}</textarea></label>`;
  const diagram = caseFlowCanvasView(draft);
  const ruleGroups = [
    ["清洗与标准化", caseFlowRules.slice(0, 3)],
    ["扩展与输出", caseFlowRules.slice(3)],
  ];
  const rules = `<div class="caseflow-rule-groups">${ruleGroups.map(([title, items]) => `<section><h4>${title}</h4><div class="caseflow-rule-grid">${items.map(([key, label, hint]) => field(key, label, hint)).join("")}</div></section>`).join("")}</div>
    <h4>验证样例</h4>
    <div class="table-wrap"><table class="caseflow-samples"><thead><tr><th>原文</th><th>语言标签</th><th>处理后单行文本</th><th></th></tr></thead><tbody>${draft.samples.map((row, index) => `<tr>
      <td><textarea data-caseflow-sample="${index}" data-caseflow-column="raw" aria-label="第 ${index + 1} 行原文">${escapeHTML(row.raw)}</textarea></td>
      <td><select data-caseflow-sample="${index}" data-caseflow-column="language" aria-label="第 ${index + 1} 行语言标签">${["", "zh", "en", "es", "mixed", "review"].map((value) => `<option value="${value}" ${row.language === value ? "selected" : ""}>${value || "待选"}</option>`).join("")}</select></td>
      <td><textarea data-caseflow-sample="${index}" data-caseflow-column="output" aria-label="第 ${index + 1} 行处理结果">${escapeHTML(row.output)}</textarea></td>
      <td><button class="btn danger" data-action="caseflow-remove-sample" data-index="${index}" aria-label="${state.caseFlowConfirm === `remove-${index}` ? `确认移除第 ${index + 1} 行` : `移除第 ${index + 1} 行`}">${state.caseFlowConfirm === `remove-${index}` ? "确认" : "×"}</button></td>
    </tr>`).join("")}</tbody></table></div>
    <div class="button-row"><button class="btn" data-action="caseflow-add-sample">添加样例</button></div>
    <p class="muted">样例是练习用自拟数据；题库没有给出固定输入文件。</p>`;
  const placed = new Set(draft.canvas.nodes.map((node) => node.key));
  const review = `<div class="caseflow-review-list"><section class="caseflow-review-item"><strong>流程图结构</strong><span>${caseFlowStages.filter(([key]) => placed.has(key)).length} / 7 个核心环节已放置，${draft.canvas.edges.length} 条连线</span><p>还需核对顺序、分支与箭头方向；这里只统计，不自动判定方案正确。</p></section>${caseFlowReview(fields).map((group) => `<section class="caseflow-review-item">
      <strong>${escapeHTML(group.title)}</strong><span>${group.filled} / ${group.total} 项已填写</span>
      <p>${group.missing.length ? `待补：${escapeHTML(group.missing.join("、"))}` : "字段已填齐，请对照原题人工核对内容是否合理。"}</p>
    </section>`).join("")}</div>
    <p class="muted">这里只检查是否填写，不自动判定方案正确，也不生成考场分数。原题评分表还有步骤合理性与规则说明要求。</p>`;
  layout(`
    <section class="caseflow-header">
      <label class="field"><span>选择流程设计题</span><select data-action="select-flow-question">${options}</select></label>
      <div class="tag-row"><span class="tag">${q.id}</span><span class="tag">${q.level}</span><span class="tag">${q.timeLimitMinutes}分钟</span><span class="tag">题库页 ${q.sourcePages.join(", ")}</span></div>
      <h3>${escapeHTML(q.title)}</h3>
    </section>
    <div class="caseflow-layout caseflow-design-layout">
      <aside class="caseflow-task">
        <h4>考核任务</h4>
        <ol><li>设计数据输入、语种识别、分语言处理、清洗、标准化、质检和输出存储。</li>
          <li>说明中文、英文、西语及混合语的处理规则。</li>
          <li>写明 @#* 保留、大小写、缩写词对照、扩展方式与 UTF-8 单行输出。</li></ol>
        <details><summary>查看题库原文</summary><div class="question-text">${escapeHTML(q.questionText)}</div></details>
        <p class="muted">题库指定 Excel 与流程绘图软件，但未指定具体软件界面或交卷文件格式。这里提供相近的绘图与规则表练习。</p>
      </aside>
      <section class="caseflow-work">
        <div class="caseflow-timer"><div><span>本题限时</span><strong data-caseflow-countdown>${caseFlowClockText()}</strong></div><button class="btn" data-action="caseflow-start-timer">${state.store.caseFlowTimerEndsAt ? "重新计时" : "开始 90 分钟计时"}</button></div>
        <div class="button-row caseflow-toolbar">
          <button class="btn" data-action="caseflow-example">${state.caseFlowConfirm === "example" ? "确认替换为示例" : "载入示例方案"}</button>
          <button class="btn" data-action="caseflow-clear">${state.caseFlowConfirm === "clear" ? "确认清空重练" : "空白重练"}</button>
          <button class="btn" data-action="caseflow-export-svg">导出所画流程图 SVG</button>
          <button class="btn" data-action="caseflow-export-csv">导出规则表 CSV</button>
        </div>
        ${state.caseFlowConfirm ? `<p class="caseflow-confirm">将${state.caseFlowConfirm === "example" ? "替换这道题已填写的内容" : state.caseFlowConfirm === "clear" ? "清空这道题的流程图、规则表和样例" : "移除这条验证样例"}。再次点击确认，或<button class="caseflow-cancel" data-action="caseflow-cancel">取消</button>。</p>` : ""}
        <div class="caseflow-tabs" role="tablist" aria-label="答题视图">${tabs.map(([id, label]) => `<button role="tab" aria-selected="${state.caseFlowTab === id}" class="${state.caseFlowTab === id ? "active" : ""}" data-action="caseflow-tab" data-tab="${id}">${label}</button>`).join("")}</div>
        <div class="caseflow-panel">${state.caseFlowTab === "diagram" ? diagram : state.caseFlowTab === "rules" ? rules : review}</div>
      </section>
    </div>
  `);
}

function renderFlowSandbox() {
  const flowQuestions = state.questions.filter((q) => q.practiceType === "flow_design");
  const q = flowQuestions.find((item) => item.id === (state.flowQuestionId || state.store.flowQuestionId)) || flowQuestions[0];
  state.flowQuestionId = q?.id || "";
  if (q.id === "SS-6-4-4-03") return renderCaseFlowWorkbench(q, flowQuestions);
  const palette = ["数据源", "数据采集", "加密传输", "访问控制", "权限管理", "数据校验", "数据清洗", "异常检测", "缺失补全", "时序数据库", "特征工程", "模型训练", "模型测试", "模型上线", "监控告警", "人工审核", "结果反馈", "系统优化"];
  layout(`
    <div class="flow-route-note"><span>智能文本生成系统性能测试是 Python 编程题。</span><a class="btn" href="#/practice/python" data-practice-question="SS-6-4-4-02">打开该题操作台</a></div>
    <section class="card pad" style="margin-bottom:14px">
      <label class="field"><span>选择流程设计题</span><select data-action="select-flow-question">
        ${flowQuestions.map((item) => `<option value="${item.id}" ${item.id === q.id ? "selected" : ""}>${escapeHTML(item.id)} · ${escapeHTML(item.title)}</option>`).join("")}
      </select></label>
    </section>
    <div class="detail-layout">
      <section class="card pad">
        <div class="tag-row"><span class="tag">${q.id}</span><span class="tag">${q.level}</span><span class="tag">题库页 ${q.sourcePages.join(", ")}</span></div>
        <h3>${escapeHTML(q.title)}</h3>
        <div class="question-text">${escapeHTML(q.questionText)}</div>
      </section>
      <section class="card pad">
        <div class="button-row">
          <button class="btn" data-action="load-flow-template">载入标准模板</button>
          <button class="btn primary" data-action="check-flow">一键检查流程</button>
          <button class="btn" data-action="export-flow">导出流程图JSON</button>
          <button class="btn danger" data-action="clear-flow">清空画布</button>
        </div>
        <div class="flow-workbench" style="margin-top:12px">
          <aside class="node-palette">
            ${palette.map((item) => `<button class="btn" data-action="add-flow-node" data-node="${escapeHTML(item)}">${escapeHTML(item)}</button>`).join("")}
          </aside>
          <div class="canvas" aria-label="流程图画布">
            ${
              state.flowNodes.length
                ? state.flowNodes
                    .map(
                      (node, index) => `<article class="flow-node">
                        <strong>${index + 1}. ${escapeHTML(node.label)}</strong>
                        <small>${index === 0 ? "开始" : "连接上一节点"} -> ${index === state.flowNodes.length - 1 ? "结束" : "下一节点"}</small>
                        <button class="btn danger" data-action="remove-flow-node" data-index="${index}">移除</button>
                      </article>`,
                    )
                    .join("")
                : '<div class="empty">从左侧添加节点，或载入标准模板。</div>'
            }
          </div>
          <aside class="node-config">
            <h4 style="margin:0">节点配置</h4>
            <p class="muted">当前节点数：${state.flowNodes.length}</p>
            <p class="muted">连接规则：新增节点自动接到上一节点，导出时保留顺序和节点名称。</p>
          </aside>
        </div>
        <h4>评分标准</h4>
        ${rubricTable(q, state.flowResult)}
        <section class="card pad score-panel" style="margin-top:12px">
          <strong>${state.flowResult?.score ?? 0}</strong><span class="muted"> / ${q.score} 分</span>
        </section>
      </section>
    </div>
  `);
}

async function loadBBoxPreview() {
  state.bboxPreviewLoading = true;
  try {
    const response = await fetch(`./data/bbox-preview/samples.json?v=${DATA_VERSION}`);
    if (!response.ok) throw new Error(['127.0.0.1', 'localhost'].includes(location.hostname)
      ? '本地预览素材未找到，请按 README 生成。'
      : '原始交通图片未在公开网站发布；请在本机启动项目练习 BBox 质检。');
    state.bboxPreview = await response.json();
    state.bboxPreviewError = '';
  } catch (error) { state.bboxPreviewError = error.message; }
  finally {
    state.bboxPreviewLoading = false;
    if (baseRoute() === '#/practice/bbox') renderBBoxSandbox();
  }
}

function inspectBBox(text, classCount) {
  return text.split(/\r?\n/).map((line, index) => {
    const parts = line.trim().split(/\s+/);
    if (!line.trim()) return null;
    if (parts.length !== 5) return { line: index + 1, message: '应有类别、中心 x、中心 y、宽、高共 5 个数。' };
    const numbers = parts.map(Number);
    if (numbers.some(value => !Number.isFinite(value))) return { line: index + 1, message: '包含非数字。' };
    const [id, x, y, w, h] = numbers;
    if (!Number.isInteger(id) || id < 0 || id >= classCount) return { line: index + 1, message: `类别 ID 应为 0～${classCount - 1}。` };
    if (w <= 0 || h <= 0) return { line: index + 1, message: '宽和高必须大于 0。' };
    if (x - w / 2 < 0 || x + w / 2 > 1 || y - h / 2 < 0 || y + h / 2 > 1) return { line: index + 1, message: '框超出图片边界 [0, 1]。' };
    return { line: index + 1, message: '格式与边界通过。', box: { x, y, w, h, id } };
  }).filter(Boolean);
}

function renderBBoxSandbox() {
  const q = firstByPractice('bbox_labeling');
  const samples = state.bboxPreview?.samples || [];
  const selected = samples.find(item => item.id === state.store.bboxSampleId) || samples[0];
  if (selected && state.store.bboxSampleId !== selected.id) {
    state.store.bboxSampleId = selected.id;
    saveStore();
  }
  const draft = selected ? state.store.bboxDrafts?.[selected.id] ?? selected.label : '';
  const rows = selected ? inspectBBox(draft, state.bboxPreview.classes.length) : [];
  const checked = state.bboxResult?.sampleId === selected?.id ? state.bboxResult : null;
  const boxes = rows.filter(row => row.box).map(row => {
    const { x, y, w, h } = row.box;
    return `<rect x="${(x - w / 2) * 1000}" y="${(y - h / 2) * 1000}" width="${w * 1000}" height="${h * 1000}" fill="none" stroke="#19b870" stroke-width="3"/>`;
  }).join('');
  layout(`
    <div class="sandbox-layout bbox-layout">
      <section class="card pad">
        <div class="tag-row"><span class="tag">${q.id}</span><span class="tag">${q.level}</span><span class="tag">题库页 ${q.sourcePages.join(', ')}</span></div>
        <h3>${escapeHTML(q.title)}</h3>
        <div class="question-text">${escapeHTML(q.questionText)}</div>
        ${renderAttachments(q)}
      </section>
      <section class="card pad">
        <h3 class="section-title">原始数据标注质检</h3>
        ${selected ? `<label class="field"><span>预览样例</span><select data-action="bbox-select-sample">${samples.map(item => `<option value="${item.id}" ${item.id === selected.id ? 'selected' : ''}>${item.id}</option>`).join('')}</select></label>
          <div class="bbox-preview-image"><img src="./data/bbox-preview/${encodeURI(selected.image)}" alt="${escapeHTML(selected.id)} 交通场景图像"><svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">${boxes}</svg></div>
          <label class="field"><span>对应的 YOLO TXT 标注（类别 ID、中心 x、中心 y、宽、高）</span><textarea data-bbox-label spellcheck="false">${escapeHTML(draft)}</textarea></label>
          <p class="muted">类别：${state.bboxPreview.classes.map((name, index) => `${index} ${escapeHTML(name)}`).join('、')}。绿色框只显示可解析且未越界的标注。</p>
          <div class="button-row"><button class="btn primary" data-action="bbox-check">检查当前标注</button><button class="btn" data-action="bbox-export" ${!checked || checked.rows.some(row => !row.box) || !checked.rows.length ? 'disabled' : ''}>下载修正后的 TXT</button></div>
          ${checked ? `<div class="bbox-feedback" role="status"><strong>${checked.rows.filter(row => row.box).length} 条通过，${checked.rows.filter(row => !row.box).length} 条待修正</strong><ul>${checked.rows.map(row => `<li>第 ${row.line} 行：${escapeHTML(row.message)}</li>`).join('')}</ul></div>` : '<p class="muted">修改标注后点击检查；漏标和目标类别是否正确仍需对照图片人工判断。</p>'}
        ` : `<p role="status">${escapeHTML(state.bboxPreviewError || '正在读取原始附件样例…')}</p>`}
      </section>
    </div>
  `);
  if (!state.bboxPreview && !state.bboxPreviewLoading && !state.bboxPreviewError) void loadBBoxPreview();
}

function renderDifyPlaceholder() {
  const difyCount = state.questions.filter((q) => q.practiceType === "dify_agent").length;
  layout(`
    <section class="card pad">
      <h3 class="section-title">Dify / 智能体沙盘</h3>
      <p>按你这次的要求，Dify 题先不展开实现；题库中已识别 ${difyCount} 道智能体相关题，后续可以继续接节点画布、Prompt 配置和运行日志。</p>
      <div class="grid cols-3">
        <div class="card pad"><strong>左侧节点栏</strong><p class="muted">开始、LLM、知识库、HTTP、条件、结束等节点预留。</p></div>
        <div class="card pad"><strong>中间流程画布</strong><p class="muted">后续可复用流程设计画布逻辑。</p></div>
        <div class="card pad"><strong>右侧配置与日志</strong><p class="muted">预留 Dify API / 本地 mock 接口。</p></div>
      </div>
    </section>
  `);
}

function renderExam() {
  if (!state.exam) {
    layout(`
      <section class="card pad">
        <div class="grid cols-4">
          <label class="field"><span>等级</span><select data-exam-config="level">${options(levelRows().map((row) => row.name), "", "全部等级")}</select></label>
          <label class="field"><span>模块</span><select data-exam-config="module">${options(unique(state.questions.map((q) => q.module)), "", "全部模块")}</select></label>
          <label class="field"><span>题目数量</span><select data-exam-config="count"><option>3</option><option>5</option><option>10</option></select></label>
          <label class="field"><span>抽题方式</span><select data-exam-config="random"><option value="true">随机抽题</option><option value="false">PDF顺序</option></select></label>
        </div>
        <div class="button-row" style="margin-top:14px">
          <button class="btn primary" data-action="start-exam">开始考试</button>
          <span class="muted">考试中自动暂存答案，提交后按评分清单生成报告。</span>
        </div>
      </section>
    `);
    return;
  }
  const ex = state.exam;
  const q = ex.questions[ex.index];
  const answer = ex.answers[q.id] || {};
  const remaining = Math.max(0, ex.endsAt - Date.now());
  const minutes = String(Math.floor(remaining / 60000)).padStart(2, "0");
  const seconds = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");
  layout(`
    <div class="exam-shell">
      <section class="card pad">
        <div class="tag-row"><span class="tag">第 ${ex.index + 1} / ${ex.questions.length} 题</span><span class="tag">${q.id}</span><span class="tag">${q.level}</span></div>
        <h3>${escapeHTML(q.title)}</h3>
        <div class="question-text">${escapeHTML(q.questionText)}</div>
        <label class="field" style="margin-top:12px"><span>作答记录</span><textarea data-exam-answer="${q.id}">${escapeHTML(answer.text || "")}</textarea></label>
        ${['python_coding', 'model_evaluation'].includes(q.practiceType) ? `<a class="btn primary" href="#/practice/python" data-practice-question="${q.id}" data-notebook-exam="true">打开 Jupyter 考试操作台</a>` : ''}
        <h4>评分清单自评</h4>
        <div class="grid">
          ${(q.rubric || [])
            .map(
              (r) => `<label><input type="checkbox" data-exam-rubric="${q.id}" value="${r.id}" ${(answer.checked || []).includes(r.id) ? "checked" : ""} /> ${escapeHTML(r.item)}（${r.points || 0}分）</label>`,
            )
            .join("")}
        </div>
      </section>
      <aside class="card pad">
        <div class="countdown">${minutes}:${seconds}</div>
        <p class="muted">严格倒计时已开启，当前为本地模拟。</p>
        <div class="button-row">
          <button class="btn" data-action="exam-prev" ${ex.index === 0 ? "disabled" : ""}>上一题</button>
          <button class="btn" data-action="exam-next" ${ex.index === ex.questions.length - 1 ? "disabled" : ""}>下一题</button>
          <button class="btn primary" data-action="submit-exam">交卷</button>
        </div>
        <h4>答题卡</h4>
        <div class="grid cols-3">
          ${ex.questions.map((item, index) => `<button class="btn ${ex.answers[item.id] ? "success" : ""}" data-action="exam-jump" data-index="${index}">${index + 1}</button>`).join("")}
        </div>
      </aside>
    </div>
  `);
}

function startExam() {
  const config = Object.fromEntries([...app.querySelectorAll("[data-exam-config]")].map((el) => [el.dataset.examConfig, el.value]));
  let list = state.questions.filter((q) => (!config.level || q.level === config.level) && (!config.module || q.module === config.module));
  if (config.random === "true") list = [...list].sort(() => Math.random() - 0.5);
  list = list.slice(0, Number(config.count || 3));
  state.exam = {
    questions: list,
    index: 0,
    answers: {},
    startedAt: new Date().toISOString(),
    endsAt: Date.now() + Math.max(1, list.reduce((sum, q) => sum + (q.timeLimitMinutes || 60), 0)) * 60000,
  };
  render();
}

function submitExam() {
  const ex = state.exam;
  const report = ex.questions.map((q) => {
    const answer = ex.answers[q.id] || { checked: [] };
    const score = (q.rubric || []).filter((r) => (answer.checked || []).includes(r.id)).reduce((sum, r) => sum + (r.points || 0), 0);
    recordAttempt(q, Math.min(q.score, score), "exam", answer);
    return { q, score: Math.min(q.score, score) };
  });
  state.exam = null;
  const total = report.reduce((sum, row) => sum + row.score, 0);
  layout(`
    <section class="card pad score-panel">
      <strong>${total}</strong><span class="muted"> 分</span>
      <p>本次考试 ${report.length} 题，结果已写入练习记录，低于 80 分的题已进入错题本。</p>
    </section>
    <section class="card table-wrap" style="margin-top:14px">
      <table><thead><tr><th>题号</th><th>题名</th><th>得分</th><th>操作</th></tr></thead><tbody>
        ${report.map(({ q, score }) => `<tr><td>${q.id}</td><td>${escapeHTML(q.title)}</td><td>${score} / ${q.score}</td><td><a class="btn" href="#/question/${q.id}">查看评分标准</a></td></tr>`).join("")}
      </tbody></table>
    </section>
  `, "交卷完成，已生成本地成绩报告。");
}

function recordAttempt(q, score, mode, detail) {
  const attempt = {
    id: Date.now(),
    questionId: q.id,
    mode,
    score,
    maxScore: q.score,
    detail,
    submittedAt: new Date().toISOString(),
  };
  state.store.attempts.push(attempt);
  if (score < Math.round(q.score * 0.8)) {
    state.store.wrong[q.id] = { questionId: q.id, attemptId: attempt.id, reason: `得分 ${score}/${q.score}`, createdAt: attempt.submittedAt };
  } else {
    delete state.store.wrong[q.id];
  }
  saveStore();
}

function renderWrong() {
  const rows = Object.values(state.store.wrong || {}).map((item) => ({ ...item, q: byId(item.questionId) })).filter((item) => item.q);
  layout(`
    <section class="card table-wrap">
      ${
        rows.length
          ? `<table><thead><tr><th>题号</th><th>题名</th><th>原因</th><th>加入时间</th><th>操作</th></tr></thead><tbody>
            ${rows.map((row) => `<tr><td>${row.q.id}</td><td>${escapeHTML(row.q.title)}</td><td>${escapeHTML(row.reason)}</td><td>${new Date(row.createdAt).toLocaleString("zh-CN")}</td><td><a class="btn" href="#/question/${row.q.id}">重新练习</a></td></tr>`).join("")}
          </tbody></table>`
          : '<div class="empty">暂无错题。提交低于80分的练习后会自动加入。</div>'
      }
    </section>
  `);
}

function renderAnalytics() {
  const rows = unique(state.questions.map((q) => q.module)).map((module) => {
    const attempts = state.store.attempts.filter((a) => byId(a.questionId)?.module === module);
    const avg = attempts.length ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length) : 0;
    return { module, attempts: attempts.length, avg };
  });
  layout(`
    <div class="grid cols-3">
      <div class="stat-card card"><strong>${state.store.attempts.length}</strong><span>练习次数</span></div>
      <div class="stat-card card"><strong>${stats().averageScore}</strong><span>平均得分</span></div>
      <div class="stat-card card"><strong>${Object.keys(state.store.wrong || {}).length}</strong><span>错题数量</span></div>
    </div>
    <section class="card pad" style="margin-top:14px">
      <h3 class="section-title">模块掌握情况</h3>
      <div class="analysis-bars">
        ${rows
          .map(
            (row) => `<div class="bar-row">
              <strong>${escapeHTML(row.module)}</strong>
              <div class="progress-bar"><span style="--value:${row.avg}%"></span></div>
              <span>${row.avg}%</span>
            </div>`,
          )
          .join("")}
      </div>
    </section>
    <section class="card pad" style="margin-top:14px">
      <h3 class="section-title">复习建议</h3>
      <p>${escapeHTML(weakModules()[0]?.attempts ? `优先复习 ${weakModules()[0].module}，当前平均分 ${weakModules()[0].average}。` : "先完成一次 Python、标注、流程设计练习，系统会生成薄弱模块建议。")}</p>
    </section>
  `);
}

function renderSettings() {
  layout(`
    <section class="card pad">
      <h3 class="section-title">本地设置与数据</h3>
      <p>练习记录保存在浏览器 localStorage，不上传服务器。</p>
      <div class="button-row">
        <button class="btn" data-action="export-records">导出JSON记录</button>
        <button class="btn danger" data-action="clear-records">清空记录</button>
      </div>
      <h4>本地运行与扩展接口</h4>
      <ul>
        <li>线损计算与一题技师模型测试支持本地 Python 运行；仅运行自己信任的代码。</li>
        <li>其他 Python 题及更严格的进程隔离仍待逐题接入。</li>
        <li>OCR / 多模态识别：server/routes/files.ts</li>
        <li>Dify / 智能体：server/routes/questions.ts 与 .env.example</li>
      </ul>
    </section>
  `);
}

function render() {
  const current = route();
  if (!state.questions.length) {
    layout(`<section class="card empty">题库加载中...</section>`);
    return;
  }
  const currentBase = baseRoute(current);
  if (currentBase === "#/" || currentBase === "") renderHome();
  else if (currentBase === "#/bank") renderBank();
  else if (current.startsWith("#/learn/")) renderLesson(current.split("/").slice(2).join("/"));
  else if (current.startsWith("#/question/")) renderQuestionDetail(current.split("/").slice(2).join("/"));
  else if (currentBase === "#/exam") renderExam();
  else if (currentBase === "#/practice/python") renderPythonSandbox();
  else if (currentBase === "#/practice/labeling") renderLabelingSandbox();
  else if (currentBase === "#/practice/flow") renderFlowSandbox();
  else if (currentBase === "#/practice/bbox") renderBBoxSandbox();
  else if (currentBase === "#/practice/meter") renderMeterPractice();
  else if (currentBase === "#/practice/dify") renderDifyPlaceholder();
  else if (currentBase === "#/wrong") renderWrong();
  else if (currentBase === "#/analytics") renderAnalytics();
  else if (currentBase === "#/settings") renderSettings();
  else renderHome();
}

function download(filename, text, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

let caseFlowDrag = null;
let caseFlowSuppressClick = false;
app.addEventListener("pointerdown", (event) => {
  const element = event.target.closest("[data-action='caseflow-select-node']");
  if (!element || event.button !== 0 || state.caseFlowConnecting) return;
  const node = caseFlowCanvasNode(caseFlowDraft(), element.dataset.id);
  if (!node) return;
  caseFlowDrag = { element, node, x: event.clientX, y: event.clientY, left: node.x, top: node.y, moved: false };
  element.setPointerCapture(event.pointerId);
});
app.addEventListener("pointermove", (event) => {
  if (!caseFlowDrag) return;
  const dx = event.clientX - caseFlowDrag.x;
  const dy = event.clientY - caseFlowDrag.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) caseFlowDrag.moved = true;
  if (!caseFlowDrag.moved) return;
  caseFlowDrag.node.x = Math.max(0, Math.min(804, Math.round(caseFlowDrag.left + dx)));
  caseFlowDrag.node.y = Math.max(0, Math.min(598, Math.round(caseFlowDrag.top + dy)));
  caseFlowDrag.element.style.left = `${caseFlowDrag.node.x}px`;
  caseFlowDrag.element.style.top = `${caseFlowDrag.node.y}px`;
  refreshCaseFlowEdges();
});
app.addEventListener("pointerup", () => {
  if (!caseFlowDrag) return;
  if (caseFlowDrag.moved) { caseFlowSuppressClick = true; saveStore(); }
  caseFlowDrag = null;
});
app.addEventListener("pointercancel", () => { caseFlowDrag = null; });

app.addEventListener("focusin", (event) => {
  const number = Number(event.target.dataset.modelBlank);
  const explanation = modelFillTasks[state.pythonQuestionId]?.explanations[number - 1];
  if (!number || !explanation) return;
  const title = app.querySelector("[data-model-help-title]");
  const body = app.querySelector("[data-model-help-text]");
  if (title) title.textContent = `第 ${number} 空：${modelFillTasks[state.pythonQuestionId].hints[number - 1]}`;
  if (body) body.textContent = explanation;
});

app.addEventListener("input", (event) => {
  if (event.target.dataset.caseflowNodeField) {
    const draft = caseFlowDraft();
    const node = caseFlowCanvasNode(draft, state.caseFlowSelected);
    if (node) {
      const field = event.target.dataset.caseflowNodeField;
      if (field === "detail" && node.key) draft.fields[node.key] = event.target.value;
      else node[field] = event.target.value;
      const visible = app.querySelector(`[data-action="caseflow-select-node"][data-id="${CSS.escape(node.id)}"]`);
      if (visible) {
        visible.querySelector(".caseflow-node-title").textContent = node.title;
        visible.querySelector(".caseflow-node-detail").textContent = node.key ? draft.fields[node.key] || "填写处理方法" : node.detail || "填写处理方法";
      }
      saveStore();
    }
  }
  if (event.target.dataset.caseflowEdgeLabel !== undefined) {
    const edge = caseFlowDraft().canvas.edges[Number(event.target.dataset.caseflowEdgeLabel)];
    if (edge) { edge.label = event.target.value; saveStore(); refreshCaseFlowEdges(); }
  }
  if (event.target.dataset.caseflowField) {
    caseFlowDraft().fields[event.target.dataset.caseflowField] = event.target.value;
    saveStore();
  }
  if (event.target.dataset.caseflowSample !== undefined) {
    const row = caseFlowDraft().samples[Number(event.target.dataset.caseflowSample)];
    if (row) row[event.target.dataset.caseflowColumn] = event.target.value;
    saveStore();
  }
  const filter = event.target.dataset.filter;
  if (filter) {
    state.filters[filter] = event.target.value;
    if (baseRoute() === "#/bank" && hashParams().has("level")) {
      history.replaceState(null, "", `${location.pathname}${location.search}#/bank`);
    }
    renderBank();
  }
  if (event.target.dataset.pythonCode !== undefined) {
    state.pythonCode = event.target.value;
    state.store.pythonDrafts ||= {};
    state.store.pythonDrafts[state.pythonQuestionId] = state.pythonCode;
    state.pythonRuntime = null;
    const feedback = app.querySelector("[data-runtime-feedback]");
    const output = app.querySelector("[data-runtime-output]");
    const grade = app.querySelector("[data-grade-panel]");
    if (feedback) feedback.textContent = "代码已修改，请重新运行。";
    if (output) output.textContent = "尚未运行当前代码。";
    if (grade) grade.innerHTML = "<h4>练习参考评分</h4><p class=\"muted\">代码已修改，请重新运行后查看练习参考评分。</p>";
    saveStore();
  }
  if (event.target.dataset.bboxLabel !== undefined) {
    const sampleId = state.store.bboxSampleId || state.bboxPreview?.samples?.[0]?.id;
    if (sampleId) {
      state.store.bboxDrafts ||= {};
      state.store.bboxDrafts[sampleId] = event.target.value;
      state.bboxResult = null;
      saveStore();
      const feedback = app.querySelector('.bbox-feedback');
      if (feedback) feedback.textContent = '标注已修改，请重新检查。';
      const exportButton = app.querySelector('[data-action="bbox-export"]');
      if (exportButton) exportButton.disabled = true;
    }
  }
  if (event.target.dataset.modelBlank !== undefined) {
    modelBlankValues()[Number(event.target.dataset.modelBlank) - 1] = event.target.value;
    state.pythonRuntime = null;
    saveStore();
    const feedback = app.querySelector("[data-runtime-feedback]");
    const output = app.querySelector("[data-runtime-output]");
    if (feedback) feedback.textContent = "填空已修改，请重新运行。";
    if (output) output.textContent = "尚未运行当前填空。";
  }
  if (event.target.dataset.lessonCode !== undefined) {
    const draft = lessonDraft(state.lessonQuestionId);
    draft.code = event.target.value;
    draft.feedback = "";
    saveStore();
  }
  if (event.target.dataset.lessonNotes !== undefined) {
    lessonDraft(state.lessonQuestionId).notes = event.target.value;
    saveStore();
  }
  if (event.target.dataset.meterField !== undefined) {
    const draft = meterDraft();
    draft.answers[event.target.dataset.meterField] = event.target.value;
    draft.review = null;
    saveStore();
  }
  if (event.target.dataset.meterZoom !== undefined) {
    state.meterZoom = Number(event.target.value);
    const photo = app.querySelector(".meter-image-frame img");
    if (photo) photo.style.transform = `scale(${state.meterZoom})`;
  }
  const lossRow = event.target.dataset.lossRow;
  if (lossRow) {
    const draft = lessonDraft(state.lessonQuestionId);
    draft.calculations ||= {};
    draft.calculations[lossRow] ||= {};
    draft.calculations[lossRow][event.target.dataset.lossField] = event.target.value;
    draft.lossFeedback = "";
    saveStore();
  }
  const cleanId = event.target.dataset.labelClean;
  if (cleanId) {
    const item = state.labels.find((row) => row.id === cleanId);
    if (item) item.clean = event.target.value;
  }
  const examAnswer = event.target.dataset.examAnswer;
  if (examAnswer && state.exam) {
    state.exam.answers[examAnswer] ||= { checked: [], text: "" };
    state.exam.answers[examAnswer].text = event.target.value;
  }
});

app.addEventListener("change", (event) => {
  const action = event.target.dataset.action;
  if (event.target.dataset.caseflowNodeField === "type") {
    const node = caseFlowCanvasNode(caseFlowDraft(), state.caseFlowSelected);
    if (node) { node.type = event.target.value; saveStore(); renderCaseFlowKeepingScroll(); }
  }
  if (action === 'notebook-mode') {
    state.store.notebookMode = event.target.value;
    saveStore();
    renderPythonSandbox();
  }
  if (event.target.dataset.caseflowSample !== undefined) {
    const row = caseFlowDraft().samples[Number(event.target.dataset.caseflowSample)];
    if (row) row[event.target.dataset.caseflowColumn] = event.target.value;
    saveStore();
  }
  if (event.target.dataset.lossRow) {
    const draft = lessonDraft(state.lessonQuestionId);
    draft.calculations ||= {};
    draft.calculations[event.target.dataset.lossRow] ||= {};
    draft.calculations[event.target.dataset.lossRow][event.target.dataset.lossField] = event.target.value;
    saveStore();
  }
  if (action === "select-python-question") {
    state.pythonQuestionId = event.target.value;
    state.store.pythonQuestionId = state.pythonQuestionId;
    saveStore();
    state.pythonResult = null;
    state.pythonRuntime = null;
    state.pythonCode = "";
    renderPythonSandbox();
  }
  if (event.target.dataset.performanceCheck !== undefined) {
    const index = Number(event.target.dataset.performanceCheck);
    const checked = new Set(state.store.performanceChecks || []);
    if (event.target.checked) checked.add(index);
    else checked.delete(index);
    state.store.performanceChecks = [...checked].sort((a, b) => a - b);
    saveStore();
  }
  if (action === "select-flow-question") {
    state.flowQuestionId = event.target.value;
    state.store.flowQuestionId = state.flowQuestionId;
    saveStore();
    state.flowResult = null;
    state.flowNodes = [];
    state.caseFlowTab = "diagram";
    state.caseFlowConfirm = "";
    renderFlowSandbox();
  }
  if (action === 'bbox-select-sample') {
    state.store.bboxSampleId = event.target.value;
    state.bboxResult = null;
    saveStore();
    renderBBoxSandbox();
  }
  const labelKind = event.target.dataset.labelKind;
  if (labelKind) {
    const item = state.labels.find((row) => row.id === labelKind);
    if (item) item.label = event.target.value;
  }
  const lessonRubric = event.target.dataset.lessonRubric;
  if (lessonRubric) {
    const draft = lessonDraft(state.lessonQuestionId);
    const checked = new Set(draft.checked);
    if (event.target.checked) checked.add(lessonRubric);
    else checked.delete(lessonRubric);
    draft.checked = [...checked];
    saveStore();
    renderLesson(state.lessonQuestionId);
  }
  const examRubric = event.target.dataset.examRubric;
  if (examRubric && state.exam) {
    state.exam.answers[examRubric] ||= { checked: [], text: "" };
    const checked = new Set(state.exam.answers[examRubric].checked || []);
    if (event.target.checked) checked.add(event.target.value);
    else checked.delete(event.target.value);
    state.exam.answers[examRubric].checked = [...checked];
  }
});

app.addEventListener("click", async (event) => {
  const practiceTarget = event.target.closest("[data-practice-question]");
  if (practiceTarget) {
    const q = byId(practiceTarget.dataset.practiceQuestion);
    if (practiceTarget.dataset.notebookExam) { state.store.notebookMode = 'exam'; saveStore(); }
    if (practiceTarget.dataset.fromLesson && q?.practiceType === "python_coding") {
      state.pythonQuestionId = q.id;
      state.store.pythonQuestionId = q.id;
      saveStore();
      state.pythonCode = lessonDraft(q.id).code;
      state.pythonResult = null;
      state.pythonRuntime = null;
    }
    if (["python_coding", "model_evaluation"].includes(q?.practiceType) && state.pythonQuestionId !== q.id) {
      state.pythonQuestionId = q.id;
      state.store.pythonQuestionId = q.id;
      saveStore();
      state.pythonCode = "";
      state.pythonResult = null;
      state.pythonRuntime = null;
    }
    if (q?.practiceType === "flow_design" && state.flowQuestionId !== q.id) {
      state.flowQuestionId = q.id;
      state.store.flowQuestionId = q.id;
      saveStore();
      state.flowNodes = [];
      state.flowResult = null;
    }
  }
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "caseflow-select-node") {
    if (caseFlowSuppressClick) { caseFlowSuppressClick = false; return; }
    const id = target.dataset.id;
    if (state.caseFlowConnecting && state.caseFlowConnecting !== id) {
      const edges = caseFlowDraft().canvas.edges;
      if (!edges.some((edge) => edge.from === state.caseFlowConnecting && edge.to === id)) edges.push({ from: state.caseFlowConnecting, to: id, label: "" });
      state.caseFlowConnecting = "";
      saveStore();
    }
    state.caseFlowSelected = id;
    renderCaseFlowKeepingScroll();
    return;
  }
  if (action === "caseflow-add-node") {
    const draft = caseFlowDraft();
    const key = target.dataset.key || "";
    const existing = key && draft.canvas.nodes.find((node) => node.key === key);
    if (existing) state.caseFlowSelected = existing.id;
    else {
      const entry = [...caseFlowStages, ...caseFlowBranches].find(([id]) => id === key);
      const count = draft.canvas.nodes.length;
      const node = { id: key || `custom-${Date.now()}-${count}`, key, title: entry?.[1] || (target.dataset.type === "decision" ? "判断条件" : "处理步骤"), type: target.dataset.type || (key === "detect" ? "decision" : ["input", "store"].includes(key) ? "data" : "process"), x: 35 + (count % 4) * 225, y: 65 + Math.floor(count / 4) * 155 };
      draft.canvas.nodes.push(node);
      state.caseFlowSelected = node.id;
      saveStore();
    }
    renderCaseFlowKeepingScroll();
    return;
  }
  if (action === "caseflow-connect") {
    state.caseFlowConnecting = state.caseFlowConnecting === state.caseFlowSelected ? "" : state.caseFlowSelected;
    renderCaseFlowKeepingScroll();
    return;
  }
  if (action === "caseflow-remove-node") {
    const draft = caseFlowDraft();
    draft.canvas.nodes = draft.canvas.nodes.filter((node) => node.id !== state.caseFlowSelected);
    draft.canvas.edges = draft.canvas.edges.filter((edge) => edge.from !== state.caseFlowSelected && edge.to !== state.caseFlowSelected);
    state.caseFlowSelected = "";
    state.caseFlowConnecting = "";
    saveStore();
    renderCaseFlowKeepingScroll();
    return;
  }
  if (action === "caseflow-remove-edge") {
    caseFlowDraft().canvas.edges.splice(Number(target.dataset.index), 1);
    saveStore();
    renderCaseFlowKeepingScroll();
    return;
  }
  if (action === "meter-tab" || action === "meter-next") {
    state.meterTab = target.dataset.tab;
    renderMeterPractice();
    return;
  }
  if (action === "meter-photo") {
    state.meterPhoto = Number(target.dataset.index);
    state.meterZoom = 1;
    renderMeterPractice();
    return;
  }
  if (action === "meter-toggle-viewer") {
    const draft = meterDraft();
    draft.viewerOpen = !draft.viewerOpen;
    if (draft.viewerOpen) draft.opened = true;
    saveStore();
    renderMeterPractice();
    return;
  }
  if (action === "meter-start") {
    if (meterDraft().startedAt && !confirm("重新开始 60 分钟计时？已写答案会保留。")) return;
    meterDraft().startedAt = Date.now();
    saveStore();
    renderMeterPractice();
    return;
  }
  if (action === "meter-reset") {
    if (!confirm("清空这道题的读数、文字答案和计时记录，重新练习？")) return;
    lessonDraft(meterQuestionId).meter = { answers: {}, opened: false, viewerOpen: false, review: null, startedAt: null };
    state.meterTab = "readings";
    state.meterPhoto = 0;
    state.meterZoom = 1;
    saveStore();
    renderMeterPractice();
    return;
  }
  if (action === "meter-submit") {
    const draft = meterDraft();
    draft.review = { readings: meterReadings.map((expected, index) => {
      const value = (draft.answers[`reading${index + 1}`] || "").trim().replace(/\s*MPa$/i, "");
      return value !== "" && Number.isFinite(Number(value)) && Math.abs(Number(value) - expected) < 0.005;
    }) };
    saveStore();
    state.meterTab = "review";
    renderMeterPractice();
    return;
  }
  if (action === 'notebook-new' || action === 'notebook-import' || action === 'notebook-retry') {
    await prepareNotebook({ fresh: action !== 'notebook-retry',
      ...(action === 'notebook-import' ? { draft: oldPythonDraft(state.pythonQuestionId) } : {}) });
    return;
  }
  if (action === 'notebook-submit') {
    const questionId = state.pythonQuestionId;
    const { record } = notebookContext();
    if (record.busy || !record.workspace) return;
    record.busy = true;
    record.submitting = true;
    record.error = '';
    renderPythonSandbox();
    try {
      const response = await fetch('/api/jupyter/submit', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ questionId, path: record.workspace.path }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '提交检查失败');
      record.result = result;
    } catch (error) { record.error = error.message; }
    finally {
      record.busy = false;
      record.submitting = false;
      if (location.hash.startsWith('#/practice/python')) renderPythonSandbox();
    }
    return;
  }
  if (action === "toggle-menu") {
    const sidebar = target.closest(".sidebar");
    const open = sidebar.classList.toggle("menu-open");
    target.setAttribute("aria-expanded", String(open));
  }
  if (action === "lesson-step" || action === "lesson-prev" || action === "lesson-next") {
    const steps = guidedLessons[state.lessonQuestionId] || [];
    const index = action === "lesson-step" ? Number(target.dataset.index) : state.lessonStep + (action === "lesson-next" ? 1 : -1);
    state.lessonStep = Math.max(0, Math.min(steps.length - 1, index));
    lessonDraft(state.lessonQuestionId).feedback = "";
    renderLesson(state.lessonQuestionId);
  }
  if (action === "lesson-check") {
    const q = byId(state.lessonQuestionId);
    const draft = lessonDraft(q.id);
    const step = guidedLessons[q.id][state.lessonStep];
    const result = scorePython(q, draft.code);
    const missing = step.checks.filter((index) => !result.items[index]?.earned);
    draft.feedback = missing.length ? `本步已覆盖 ${step.checks.length - missing.length}/${step.checks.length} 个检查点。下一步先补：${missing.map((index) => result.items[index]?.comment).join("；")}` : "本步代码结构检查全部通过，可以进入下一步。";
    saveStore();
    renderLesson(q.id);
  }
  if (action === "check-line-loss") {
    const draft = lessonDraft("SS-6-4-4-04");
    const errors = [];
    for (const row of lineLossRows) {
      const answer = draft.calculations?.[row.id] || {};
      const loss = row.supply - row.sell;
      const rate = Number((loss / row.supply * 100).toFixed(2));
      const status = rate > 8 ? "高线损异常" : loss < 0 ? "负线损异常" : "线损正常";
      if (Number(answer.loss) !== loss || answer.loss === "") errors.push(`${row.id} 线损电量应为 ${loss} kWh`);
      if (Number(answer.rate) !== rate || answer.rate === "") errors.push(`${row.id} 线损率应为 ${rate.toFixed(2)}%`);
      if (answer.status !== status) errors.push(`${row.id} 状态应为${status}`);
    }
    draft.lossFeedback = errors.length ? `已核对 12 项，需修改 ${errors.length} 项：${errors.join("；")}` : "12 项计算与状态判断全部正确。现在把同样的逻辑写进右侧代码。";
    saveStore();
    renderLesson("SS-6-4-4-04");
  }
  if (action === "clear-filters") {
    state.filters = { keyword: "", module: "", level: "", practiceType: "", page: "" };
    if (baseRoute() === "#/bank" && hashParams().has("level")) location.hash = "#/bank";
    else renderBank();
  }
  if (action === "copy-question") {
    const q = byId(target.dataset.id);
    if (q) await navigator.clipboard?.writeText(`${q.id} ${q.title}\n\n${q.questionText}`);
  }
  if (action === "mark-wrong") {
    const q = byId(target.dataset.id);
    state.store.wrong[q.id] = { questionId: q.id, reason: "手动加入错题本", createdAt: new Date().toISOString() };
    saveStore();
    renderQuestionDetail(q.id);
  }
  if (action === "load-python-template") {
    if (state.pythonQuestionId === "SS-4-3-3-02") state.pythonCode = samples.imagePreprocessAnswer;
    else if (state.pythonQuestionId === "SS-6-4-4-04") state.pythonCode = samples.lineLossAnswer;
    else state.pythonCode = samples.pythonTemplate;
    state.pythonResult = null;
    state.pythonRuntime = null;
    state.store.pythonDrafts ||= {};
    state.store.pythonDrafts[state.pythonQuestionId] = state.pythonCode;
    saveStore();
    renderPythonSandbox();
  }
  if (action === "load-performance-starter" || action === "load-performance-answer" || action === "clear-performance-code") {
    if (action !== "load-performance-starter" && !confirm(action === "clear-performance-code" ? "确认清空当前脚本，开始空白练习？" : "参考实现会替换当前脚本，确认载入？")) return;
    state.pythonCode = action === "clear-performance-code" ? "" : action === "load-performance-answer" ? samples.performanceAnswer : samples.performanceStarter;
    state.pythonRuntime = null;
    state.store.pythonDrafts ||= {};
    state.store.pythonDrafts["SS-6-4-4-02"] = state.pythonCode;
    saveStore();
    renderPythonSandbox();
    app.querySelector("[data-python-code]")?.focus();
  }
  if (action === "download-python-answer" && state.pythonQuestionId === "SS-6-4-4-02") {
    download("SS-6-4-4-02.py", state.pythonCode, "text/x-python;charset=utf-8");
  }
  if (action === "download-image-code" && state.pythonQuestionId === "SS-4-3-3-02") {
    download("SS-4-3-3-02.py", state.pythonCode, "text/x-python;charset=utf-8");
  }
  if (["load-image-starter", "load-image-answer", "clear-image-code"].includes(action) && state.pythonQuestionId === "SS-4-3-3-02") {
    if (state.pythonCode.trim() && !confirm("这会替换当前脚本。确认继续？")) return;
    state.pythonCode = action === "load-image-starter" ? samples.imagePreprocessStarter : action === "load-image-answer" ? samples.imagePreprocessAnswer : "";
    state.pythonResult = null;
    state.pythonRuntime = null;
    state.store.pythonDrafts ||= {};
    state.store.pythonDrafts[state.pythonQuestionId] = state.pythonCode;
    saveStore();
    renderPythonSandbox();
    app.querySelector("[data-python-code]")?.focus();
  }
  if (action === "clear-model-blanks") {
    if (!confirm("确认清空这道题的 13 个填空？清空后无法恢复。")) return;
    modelBlankValues(state.pythonQuestionId).fill("");
    state.pythonRuntime = null;
    saveStore();
    renderPythonSandbox();
    app.querySelector('[data-model-blank="1"]')?.focus();
  }
  if (action === "check-python-structure" || action === "submit-python") {
    const q = byId(state.pythonQuestionId) || firstByPractice("python_coding");
    state.pythonResult = scorePython(q, state.pythonCode);
    if (action === "submit-python") recordAttempt(q, state.pythonResult.score, "python_coding", { code: state.pythonCode, items: state.pythonResult.items });
    renderPythonSandbox();
  }
  if (action === "run-python-real") {
    const q = byId(state.pythonQuestionId);
    const values = modelFillTasks[q.id] ? modelBlankValues(q.id) : null;
    const missing = values ? values.map((value, index) => value.trim() ? null : index + 1).filter(Boolean) : [];
    if (missing.length) {
      state.pythonRuntime = { feedback: `请先填写第 ${missing.join("、")} 空，再运行。`, stdout: "", stderr: "" };
      renderPythonSandbox();
      app.querySelector(`[data-model-blank="${missing[0]}"]`)?.focus();
      return;
    }
    const code = values ? filledModelCode(q.id, values) : state.pythonCode;
    if (!code.trim()) {
      state.pythonRuntime = { feedback: "代码区还是空白，请先编写脚本或载入练习骨架。", stdout: "", stderr: "" };
      renderPythonSandbox();
      app.querySelector("[data-python-code]")?.focus();
      return;
    }
    state.pythonRuntime = { running: true, feedback: "正在本机运行代码…" };
    renderPythonSandbox();
    try {
      if (!["127.0.0.1", "localhost"].includes(location.hostname)) throw new Error("请使用 README 中的本地服务网址打开页面。直接打开文件或公开网站无法运行 Python。");
      const response = await fetch("/api/python/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId: q.id, code }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `运行接口返回 ${response.status}`);
      if (state.pythonQuestionId === q.id && (values || state.pythonCode === code)) state.pythonRuntime = { ...result, feedback: explainPythonRuntime(q, result) };
    } catch (error) {
      if (state.pythonQuestionId === q.id) state.pythonRuntime = { stdout: "", stderr: "", feedback: `无法运行：${error.message}` };
    }
    if (state.pythonQuestionId === q.id && baseRoute() === "#/practice/python") renderPythonSandbox();
  }
  if (action === "clean-label-text") {
    state.labels.forEach((item) => {
      item.clean = cleanComment(item.raw);
    });
    renderLabelingSandbox();
  }
  if (action === "auto-label") {
    state.labels.forEach((item) => {
      item.clean ||= cleanComment(item.raw);
      item.label = guessSentiment(item.clean);
    });
    renderLabelingSandbox();
  }
  if (action === "submit-labels") {
    const q = firstByPractice("text_labeling");
    state.labelResult = scoreLabels(q);
    recordAttempt(q, state.labelResult.score, "text_labeling", { labels: state.labels, items: state.labelResult.items });
    renderLabelingSandbox();
  }
  if (action === "export-labels") {
    const rows = ["id,raw,clean,label", ...state.labels.map((item) => `${item.id},"${item.raw}","${item.clean}","${item.label}"`)];
    download("labeled_comments.csv", rows.join("\n"), "text/csv");
  }
  if (action === "caseflow-tab") {
    state.caseFlowConfirm = "";
    state.caseFlowTab = target.dataset.tab;
    renderFlowSandbox();
  }
  if (action === "caseflow-cancel") {
    state.caseFlowConfirm = "";
    renderFlowSandbox();
  }
  if (action === "caseflow-start-timer") {
    state.store.caseFlowTimerEndsAt = Date.now() + 90 * 60 * 1000;
    saveStore();
    renderFlowSandbox();
  }
  if (action === "caseflow-example") {
    if (state.caseFlowConfirm !== "example") {
      state.caseFlowConfirm = "example";
      return renderFlowSandbox();
    }
    state.caseFlowConfirm = "";
    const draft = caseFlowDraft();
    draft.fields = { ...caseFlowExample };
    draft.canvas = caseFlowExampleCanvas();
    state.caseFlowSelected = "";
    state.caseFlowConnecting = "";
    draft.samples = [
      { raw: "电费 APP 无法登录!!!", language: "zh", output: "电费 APP 无法登录" },
      { raw: "I CAN'T log in!!!", language: "en", output: "i cannot log in" },
      { raw: "¿Dónde está mi factura??", language: "es", output: "donde esta mi factura" },
      { raw: "电费 bill #123??", language: "mixed", output: "电费 bill #123" },
    ];
    saveStore();
    renderFlowSandbox();
  }
  if (action === "caseflow-clear") {
    if (state.caseFlowConfirm !== "clear") {
      state.caseFlowConfirm = "clear";
      return renderFlowSandbox();
    }
    state.caseFlowConfirm = "";
    delete state.store.flowCaseDrafts?.["SS-6-4-4-03"];
    state.caseFlowSelected = "";
    state.caseFlowConnecting = "";
    state.caseFlowTab = "diagram";
    saveStore();
    renderFlowSandbox();
  }
  if (action === "caseflow-add-sample") {
    caseFlowDraft().samples.push({ raw: "", language: "", output: "" });
    saveStore();
    renderFlowSandbox();
  }
  if (action === "caseflow-remove-sample") {
    if (state.caseFlowConfirm !== `remove-${target.dataset.index}`) {
      state.caseFlowConfirm = `remove-${target.dataset.index}`;
      return renderFlowSandbox();
    }
    state.caseFlowConfirm = "";
    caseFlowDraft().samples.splice(Number(target.dataset.index), 1);
    saveStore();
    renderFlowSandbox();
  }
  if (action === "caseflow-export-svg") {
    download("SS-6-4-4-03_流程图.svg", caseFlowCanvasSvg(caseFlowDraft()), "image/svg+xml;charset=utf-8");
  }
  if (action === "caseflow-export-csv") {
    download("SS-6-4-4-03_处理规则表.csv", caseFlowCsv(caseFlowDraft()), "text/csv;charset=utf-8");
  }
  if (action === "add-flow-node") {
    state.flowNodes.push({ id: Date.now(), label: target.dataset.node });
    renderFlowSandbox();
  }
  if (action === "remove-flow-node") {
    state.flowNodes.splice(Number(target.dataset.index), 1);
    state.flowResult = null;
    renderFlowSandbox();
  }
  if (action === "load-flow-template") {
    state.flowNodes = samples.flowTemplate.map((label, index) => ({ id: index + 1, label }));
    state.flowResult = null;
    renderFlowSandbox();
  }
  if (action === "check-flow") {
    const q = byId(state.flowQuestionId) || firstByPractice("flow_design");
    state.flowResult = scoreFlow(q);
    recordAttempt(q, state.flowResult.score, "flow_design", { nodes: state.flowNodes, items: state.flowResult.items });
    renderFlowSandbox();
  }
  if (action === "export-flow") {
    download("flow_design.json", JSON.stringify({ nodes: state.flowNodes }, null, 2));
  }
  if (action === "clear-flow") {
    state.flowNodes = [];
    state.flowResult = null;
    renderFlowSandbox();
  }
  if (action === 'bbox-check') {
    const sampleId = state.store.bboxSampleId || state.bboxPreview?.samples?.[0]?.id;
    const sample = state.bboxPreview?.samples?.find(item => item.id === sampleId);
    if (sample) {
      const draft = state.store.bboxDrafts?.[sampleId] ?? sample.label;
      state.bboxResult = { sampleId, rows: inspectBBox(draft, state.bboxPreview.classes.length) };
      renderBBoxSandbox();
    }
  }
  if (action === 'bbox-export' && state.bboxResult?.rows.length && state.bboxResult.rows.every(row => row.box)) {
    const sampleId = state.bboxResult.sampleId;
    const sample = state.bboxPreview.samples.find(item => item.id === sampleId);
    const draft = state.store.bboxDrafts?.[sampleId] ?? sample.label;
    download(`${sampleId}.txt`, `${draft.trim()}\n`, 'text/plain;charset=utf-8');
  }
  if (action === "start-exam") startExam();
  if (action === "exam-prev" && state.exam?.index > 0) {
    state.exam.index -= 1;
    renderExam();
  }
  if (action === "exam-next" && state.exam?.index < state.exam.questions.length - 1) {
    state.exam.index += 1;
    renderExam();
  }
  if (action === "exam-jump") {
    state.exam.index = Number(target.dataset.index);
    renderExam();
  }
  if (action === "submit-exam") submitExam();
  if (action === "export-records") {
    download("ai-exam-records.json", JSON.stringify(state.store, null, 2));
  }
  if (action === "clear-records") {
    if (confirm("确认清空本地练习记录？")) {
      state.store = { attempts: [], wrong: {}, settings: {} };
      saveStore();
      renderSettings();
    }
  }
});

window.addEventListener("hashchange", render);
setInterval(() => {
  if (route() === "#/exam" && state.exam) renderExam();
  if (route() === "#/practice/flow") {
    const clock = app.querySelector("[data-caseflow-countdown]");
    if (clock) clock.textContent = caseFlowClockText();
  }
  if (route() === "#/practice/meter") {
    const clock = app.querySelector("[data-meter-clock]");
    if (clock) clock.textContent = meterClockText();
  }
}, 1000);

async function loadQuestionData() {
  try {
    const [questions, modules, levels] = await Promise.all([
      fetch(`./data/questions.json?v=${DATA_VERSION}`).then((res) => res.json()),
      fetch(`./data/modules.json?v=${DATA_VERSION}`).then((res) => res.json()),
      fetch(`./data/levels.json?v=${DATA_VERSION}`).then((res) => res.json()),
    ]);
    state.questions = questions;
    state.modules = modules;
    state.levels = levels;
    render();
  } catch (error) {
    layout(`<section class="card empty">题库加载失败：${escapeHTML(error.message)}。请确认 data/questions.json 存在，并通过本地服务打开页面。</section>`);
  }
}

async function boot() {
  await loadQuestionData();
}

boot();
