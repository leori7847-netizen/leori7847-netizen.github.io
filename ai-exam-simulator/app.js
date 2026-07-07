const app = document.querySelector("#app");
const STORE_KEY = "ai_skill_exam_state_v1";
const UNLOCK_KEY = "ai_skill_exam_unlocked_v1";

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
  labels: [],
  labelResult: null,
  flowQuestionId: "",
  flowNodes: [],
  flowResult: null,
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
};

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || { attempts: [], wrong: {}, settings: {} };
  } catch {
    return { attempts: [], wrong: {}, settings: {} };
  }
}

function isUnlocked() {
  return sessionStorage.getItem(UNLOCK_KEY) === "1";
}

function bytesFromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function validateSharedPassword(password) {
  const vault = window.ENCRYPTED_QUESTION_BANK;
  if (!vault || !window.crypto?.subtle) throw new Error("password-vault-unavailable");
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: bytesFromBase64(vault.salt), iterations: vault.iterations },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytesFromBase64(vault.iv) }, key, bytesFromBase64(vault.data));
}

function renderLock(error = "") {
  app.innerHTML = `
    <main class="lock-page">
      <section class="lock-card card pad">
        <h1>人工智能算法测试员操作技能模拟考试平台</h1>
        <p>请输入与理论题库相同的访问密码。</p>
        <form class="lock-form" data-unlock-form>
          <input data-password type="password" autocomplete="current-password" placeholder="访问密码" autofocus />
          <button class="btn primary" type="submit">进入平台</button>
        </form>
        ${error ? `<div class="lock-error">${escapeHTML(error)}</div>` : ""}
      </section>
    </main>
  `;
}

async function unlockPlatform(password) {
  try {
    await validateSharedPassword(password);
    sessionStorage.setItem(UNLOCK_KEY, "1");
    await loadQuestionData();
  } catch {
    renderLock("密码不正确，或当前浏览器无法读取同源密码校验文件。");
  }
}

function saveStore() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state.store));
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

function routeTitle(current = route()) {
  if (current.startsWith("#/question/")) return "题目详情";
  const item = navItems.find(([href]) => href === current);
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
        <nav class="nav">
          ${navItems
            .map(([href, label]) => `<a class="${href === current ? "active" : ""}" href="${href}">${label}</a>`)
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
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "zh-Hans-CN"));
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
  const moduleRows = state.modules.length
    ? state.modules
    : unique(state.questions.map((q) => q.module)).map((module) => ({
        name: module,
        questionCount: state.questions.filter((q) => q.module === module).length,
        levels: unique(state.questions.filter((q) => q.module === module).map((q) => q.level)),
        practiceTypes: unique(state.questions.filter((q) => q.module === module).map((q) => q.practiceType)),
      }));
  layout(`
    <div class="grid cols-3">
      <div class="stat-card card"><strong>${s.total}</strong><span>题目总数</span></div>
      <div class="stat-card card"><strong>${s.moduleCount}</strong><span>能力模块数</span></div>
      <div class="stat-card card"><strong>${s.levelCount}</strong><span>覆盖等级数</span></div>
      <div class="stat-card card"><strong>${s.practiced}</strong><span>已练习题数</span></div>
      <div class="stat-card card"><strong>${s.averageScore}</strong><span>平均得分</span></div>
      <div class="stat-card card"><strong>${escapeHTML(s.weak)}</strong><span>薄弱模块</span></div>
    </div>
    <section class="card pad" style="margin-top:16px">
      <h3 class="section-title">快速入口</h3>
      <div class="quick-actions">
        <a class="quick-link" href="#/exam"><strong>开始模拟考试</strong><small>选等级、模块、题量</small></a>
        <a class="quick-link" href="#/bank"><strong>按等级/模块练习</strong><small>筛选题库并进入详情</small></a>
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
  const list = filteredQuestions();
  layout(`
    <section class="card pad">
      <div class="filters">
        <label class="field"><span>关键词 / 题号</span><input data-filter="keyword" value="${escapeHTML(state.filters.keyword)}" placeholder="题号、题名、平台标签" /></label>
        <label class="field"><span>能力模块</span><select data-filter="module">${options(unique(state.questions.map((q) => q.module)), state.filters.module, "全部模块")}</select></label>
        <label class="field"><span>技能等级</span><select data-filter="level">${options(unique(state.questions.map((q) => q.level)), state.filters.level, "全部等级")}</select></label>
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
                  <td><a class="btn" href="#/question/${encodeURIComponent(q.id)}">详情</a></td>
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
  return `
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
                <td>${r.points || 0}</td>
                <td>${escapeHTML(r.standard || "")}</td>
                <td>${got === undefined ? "" : got}</td>
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
  if (q.practiceType === "python_coding") return "#/practice/python";
  if (q.practiceType === "text_labeling") return "#/practice/labeling";
  if (q.practiceType === "flow_design") return "#/practice/flow";
  if (q.practiceType === "bbox_labeling") return "#/practice/bbox";
  if (q.practiceType === "dify_agent") return "#/practice/dify";
  return "#/exam";
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
          <a class="btn primary" href="${practiceLink(q)}" data-practice-question="${escapeHTML(q.id)}">开始练习</a>
          <button class="btn" data-action="copy-question" data-id="${escapeHTML(q.id)}">复制题目</button>
          <button class="btn danger" data-action="mark-wrong" data-id="${escapeHTML(q.id)}">加入错题本</button>
        </div>
        <h4>试题正文</h4>
        <div class="question-text">${escapeHTML(q.questionText)}</div>
      </section>
      <section class="card pad">
        <h3 class="section-title">评分标准</h3>
        ${rubricTable(q)}
      </section>
    </div>
  `);
}

function scorePython(q, code) {
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
      "模拟运行完成。",
      q.id === "SS-1-1-1-01" ? "清洗后数据总行数：6\namount列均值：314.33\namount列最大值：900.00" : "前3条处理文本已打印\nTF-IDF 特征矩阵形状：(6, 18)",
      score >= 80 ? "自动评分：主要步骤完整。" : "自动评分：仍有关键步骤未覆盖。",
    ].join("\n"),
  };
}

function renderPythonSandbox() {
  const pythonQuestions = state.questions.filter((q) => q.practiceType === "python_coding");
  const q = byId(state.pythonQuestionId) || pythonQuestions[0];
  state.pythonQuestionId = q?.id || "";
  if (!state.pythonCode) state.pythonCode = samples.pythonTemplate;
  layout(`
    <div class="sandbox-layout">
      <section class="card pad">
        <label class="field"><span>选择 Python 题</span><select data-action="select-python-question">
          ${pythonQuestions.map((item) => `<option value="${item.id}" ${item.id === q.id ? "selected" : ""}>${escapeHTML(item.id)} · ${escapeHTML(item.title)}</option>`).join("")}
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
        <div class="button-row">
          <button class="btn" data-action="load-python-template">载入示例答案</button>
          <button class="btn primary" data-action="run-python">模拟运行</button>
          <button class="btn success" data-action="submit-python">提交评分</button>
        </div>
        <textarea class="code-editor" data-python-code spellcheck="false">${escapeHTML(state.pythonCode)}</textarea>
        <div class="console">${escapeHTML(state.pythonResult?.console || "控制台输出会显示在这里。第一阶段采用静态规则模拟运行，真实沙箱接口已在 server/routes/python-runner.ts 预留。")}</div>
        <section class="card pad score-panel" style="margin-top:12px">
          <strong>${state.pythonResult?.score ?? 0}</strong>
          <span class="muted"> / ${q.score} 分</span>
          <p class="muted">生成文件：${escapeHTML((q.expectedOutputFiles || []).join("、") || "按题目要求")}</p>
        </section>
      </section>
    </div>
  `);
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

function renderFlowSandbox() {
  const flowQuestions = state.questions.filter((q) => q.practiceType === "flow_design");
  const q = byId(state.flowQuestionId) || flowQuestions[0];
  state.flowQuestionId = q?.id || "";
  const palette = ["数据源", "数据采集", "加密传输", "访问控制", "权限管理", "数据校验", "数据清洗", "异常检测", "缺失补全", "时序数据库", "特征工程", "模型训练", "模型测试", "模型上线", "监控告警", "人工审核", "结果反馈", "系统优化"];
  layout(`
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

function renderBBoxSandbox() {
  const q = firstByPractice("bbox_labeling");
  layout(`
    <div class="sandbox-layout">
      <section class="card pad">
        <div class="tag-row"><span class="tag">${q.id}</span><span class="tag">${q.level}</span><span class="tag">题库页 ${q.sourcePages.join(", ")}</span></div>
        <h3>${escapeHTML(q.title)}</h3>
        <div class="question-text">${escapeHTML(q.questionText)}</div>
      </section>
      <section class="card pad">
        <h3 class="section-title">目标检测标注质检</h3>
        <div class="grid cols-2">
          <label class="field"><span>YOLO label 内容</span><textarea>0 0.50 0.50 0.40 0.30
1 1.12 0.20 0.10 0.20
2 0.32 0.41 0.00 0.18</textarea></label>
          <div>
            <div class="question-text" style="min-height:220px">
              图像预览区：当前样例检测到 2 个问题，坐标越界 1 条，宽度为 0 1 条。
            </div>
            <div class="button-row" style="margin-top:12px">
              <button class="btn primary" data-action="mock-bbox-check">检查标注</button>
              <button class="btn">导出修复后的YOLO txt</button>
            </div>
          </div>
        </div>
        ${rubricTable(q)}
      </section>
    </div>
  `);
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
          <label class="field"><span>等级</span><select data-exam-config="level">${options(unique(state.questions.map((q) => q.level)), "", "全部等级")}</select></label>
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
      <h4>扩展接口预留</h4>
      <ul>
        <li>真实 Python 沙箱：server/routes/python-runner.ts</li>
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
  if (current === "#/" || current === "") renderHome();
  else if (current === "#/bank") renderBank();
  else if (current.startsWith("#/question/")) renderQuestionDetail(current.split("/").slice(2).join("/"));
  else if (current === "#/exam") renderExam();
  else if (current === "#/practice/python") renderPythonSandbox();
  else if (current === "#/practice/labeling") renderLabelingSandbox();
  else if (current === "#/practice/flow") renderFlowSandbox();
  else if (current === "#/practice/bbox") renderBBoxSandbox();
  else if (current === "#/practice/dify") renderDifyPlaceholder();
  else if (current === "#/wrong") renderWrong();
  else if (current === "#/analytics") renderAnalytics();
  else if (current === "#/settings") renderSettings();
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
  URL.revokeObjectURL(url);
}

app.addEventListener("input", (event) => {
  const filter = event.target.dataset.filter;
  if (filter) {
    state.filters[filter] = event.target.value;
    renderBank();
  }
  if (event.target.dataset.pythonCode !== undefined) {
    state.pythonCode = event.target.value;
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
  if (action === "select-python-question") {
    state.pythonQuestionId = event.target.value;
    state.pythonResult = null;
    state.pythonCode = "";
    renderPythonSandbox();
  }
  if (action === "select-flow-question") {
    state.flowQuestionId = event.target.value;
    state.flowResult = null;
    state.flowNodes = [];
    renderFlowSandbox();
  }
  const labelKind = event.target.dataset.labelKind;
  if (labelKind) {
    const item = state.labels.find((row) => row.id === labelKind);
    if (item) item.label = event.target.value;
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
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "clear-filters") {
    state.filters = { keyword: "", module: "", level: "", practiceType: "", page: "" };
    renderBank();
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
    state.pythonCode = samples.pythonTemplate;
    state.pythonResult = null;
    renderPythonSandbox();
  }
  if (action === "run-python" || action === "submit-python") {
    const q = byId(state.pythonQuestionId) || firstByPractice("python_coding");
    state.pythonResult = scorePython(q, state.pythonCode);
    if (action === "submit-python") recordAttempt(q, state.pythonResult.score, "python_coding", { code: state.pythonCode, items: state.pythonResult.items });
    renderPythonSandbox();
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
  if (action === "mock-bbox-check") alert("已检查：发现坐标越界和宽度为0的标注，请修复后导出。");
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

app.addEventListener("submit", (event) => {
  if (event.target.dataset.unlockForm === undefined) return;
  event.preventDefault();
  const password = event.target.querySelector("[data-password]")?.value || "";
  unlockPlatform(password);
});

window.addEventListener("hashchange", render);
setInterval(() => {
  if (route() === "#/exam" && state.exam) renderExam();
}, 1000);

async function loadQuestionData() {
  try {
    const [questions, modules, levels] = await Promise.all([
      fetch("./data/questions.json").then((res) => res.json()),
      fetch("./data/modules.json").then((res) => res.json()),
      fetch("./data/levels.json").then((res) => res.json()),
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
  if (!isUnlocked()) {
    renderLock();
    return;
  }
  await loadQuestionData();
}

boot();
