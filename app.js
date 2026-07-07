const app = document.querySelector("#app");
const STORE_KEY = "ai_trainer_practice_state_v1";
let bank = null;
let allQuestions = [];
let pointOptions = [];
let typeOptions = [];
let difficultyOptions = [];

const icons = {
  flash: `<svg viewBox="0 0 24 24"><path d="M8 4h9a2 2 0 0 1 2 2v12"/><path d="M5 7h9a2 2 0 0 1 2 2v12"/><path d="M3 10h9a2 2 0 0 1 2 2v8H5a2 2 0 0 1-2-2z"/><path d="M8 14h3"/></svg>`,
  order: `<svg viewBox="0 0 24 24"><path d="M8 4h11v11"/><path d="m15 8 4-4 4 4"/><path d="M16 20H5V9"/><path d="m9 16-4 4-4-4"/></svg>`,
  boost: `<svg viewBox="0 0 24 24"><circle cx="7" cy="7" r="4"/><path d="M7 5v4"/><path d="M5 7h4"/><path d="M14 4h6v16H7v-5"/><path d="M14 9h3"/><path d="M12 13h5"/><path d="M12 17h5"/></svg>`,
  exam: `<svg viewBox="0 0 24 24"><path d="M5 3h11l3 3v15H5z"/><path d="M16 3v4h4"/><path d="M8 10h6"/><path d="M8 14h5"/><path d="m15 17 4-4 2 2-4 4h-2z"/></svg>`,
  random: `<svg viewBox="0 0 24 24"><path d="M4 7h3c2 0 3 1 5 4s3 4 5 4h3"/><path d="m17 12 3 3-3 3"/><path d="M4 17h3c1.4 0 2.4-.5 3.4-1.6"/><path d="M13.6 8.6C14.6 7.5 15.6 7 17 7h3"/><path d="m17 4 3 3-3 3"/></svg>`,
  select: `<svg viewBox="0 0 24 24"><path d="M6 3h12v18H6z"/><path d="M9 7h1"/><path d="m9 12 1 1 2-2"/><path d="M14 7h3"/><path d="M14 12h3"/><path d="M9 17h1"/><path d="M14 17h3"/></svg>`,
  browse: `<svg viewBox="0 0 24 24"><path d="M6 3h12v18H6z"/><path d="M9 8h6"/><path d="M9 13h4"/><path d="M12 18c2.8-3 6-3 9 0-3 3-6.2 3-9 0z"/><circle cx="16.5" cy="18" r="1.4"/></svg>`,
};

const modes = [
  { id: "flash", title: "闪卡学习", icon: "flash", color: "blue" },
  { id: "order", title: "顺序练习", icon: "order", color: "blue" },
  { id: "boost", title: "强化练习", icon: "boost", color: "blue" },
  { id: "exam", title: "模拟考试", icon: "exam", color: "red" },
  { id: "random", title: "随机练习", icon: "random", color: "blue" },
  { id: "select", title: "选题练习", icon: "select", color: "blue" },
  { id: "browse", title: "浏览题目", icon: "browse", color: "orange" },
];

const modeDetails = {
  flash: {
    short: "先回忆，后翻答案",
    rule: "闪卡模式不会让你先选项，先读题默想答案，再点击翻卡看答案，最后标记已掌握或还不熟。",
  },
  order: {
    short: "按题库原始顺序推进",
    rule: "顺序练习严格按照题库导入顺序推进，适合第一遍系统过题。",
  },
  boost: {
    short: "优先错题、收藏和难题",
    rule: "强化练习会优先抽错题，其次收藏、有笔记、未掌握高难度题；都没有时才回到全题库。",
  },
  exam: {
    short: "配置题量，倒计时交卷",
    rule: "模拟考试先设置题量、题型和抽题规则，考试中显示倒计时和答题卡，交卷后自动记录错题。",
  },
  random: {
    short: "每次重新洗牌",
    rule: "随机练习每次进入都会打乱题目顺序，适合打破顺序记忆。",
  },
  select: {
    short: "先筛选，再开练",
    rule: "选题练习先按知识点、题型、难度、关键词筛选，并预览命中题目，再开始练习。",
  },
  browse: {
    short: "只浏览，不答题",
    rule: "浏览题目是题库检索模式，直接查看题干和答案；需要练某题时再点“练这题”。",
  },
};

const scopeDetails = {
  wrong: {
    title: "错题练习",
    label: "错题",
    empty: "当前没有错题记录。",
    info: "来自首页错题统计，仅包含未掌握的错题。",
  },
  fav: {
    title: "收藏题练习",
    label: "收藏",
    empty: "当前没有收藏题。",
    info: "来自首页收藏统计，按题库原始顺序练习收藏题。",
  },
  notes: {
    title: "笔记题练习",
    label: "笔记",
    empty: "当前没有带笔记的题目。",
    info: "来自首页笔记统计，方便回看写过笔记的题。",
  },
  mastered: {
    title: "已掌握题回顾",
    label: "已掌握",
    empty: "当前没有标记为已掌握的题目。",
    info: "来自首页已掌握统计，用于抽查复盘已经掌握的题。",
  },
};

let store = loadStore();
let filterTimer = null;
let state = {
  view: "home",
  mode: "",
  queue: [],
  index: 0,
  selected: [],
  result: null,
  revealed: false,
  modeInfo: "",
  practiceTitle: "",
  scope: "",
  filters: { point: "", type: "", difficulty: "", keyword: "" },
  browseLimit: 80,
  examConfig: { count: "50", source: "balanced", type: "", point: "" },
  exam: null,
};

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveStore() {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function bytesFromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function decryptQuestionBank(password) {
  const vault = window.ENCRYPTED_QUESTION_BANK;
  if (!vault) return window.QUESTION_BANK || { title: "题库", total: 0, questions: [] };
  if (!window.crypto?.subtle) throw new Error("crypto-unavailable");
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: bytesFromBase64(vault.salt),
      iterations: vault.iterations,
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytesFromBase64(vault.iv) },
    key,
    bytesFromBase64(vault.data),
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
}

function renderLock(error = "") {
  app.innerHTML = `
    <main class="lock-screen">
      <section class="lock-card panel">
        <div class="lock-icon">${icons.exam}</div>
        <h1>人工智能训练师技师理论题库</h1>
        <p>请输入访问密码后继续刷题。</p>
        <a class="simulator-entry compact" href="./ai-exam-simulator/?v=2026070701">
          <strong>进入操作技能实操模拟平台</strong>
          <span>Python / 标注 / 流程设计在线演练</span>
        </a>
        <form class="lock-form" data-unlock-form>
          <input data-password type="password" autocomplete="current-password" placeholder="访问密码" autofocus />
          <button class="primary-button" type="submit">进入网站</button>
        </form>
        ${error ? `<div class="lock-error">${escapeHTML(error)}</div>` : ""}
      </section>
    </main>
  `;
}

async function unlockSite(password) {
  try {
    const payload = await decryptQuestionBank(password);
    setQuestionBank(payload);
    render();
  } catch {
    renderLock("密码不正确，或当前浏览器不支持安全解密。");
  }
}

function exportRecords() {
  const payload = {
    app: "ai-trainer-question-bank",
    version: 1,
    exportedAt: new Date().toISOString(),
    source: bank.source,
    total: bank.total,
    records: store,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ai题库刷题记录-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importRecords(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      const records = payload.records || payload.store || payload;
      if (!records || typeof records !== "object" || Array.isArray(records)) {
        throw new Error("invalid records");
      }
      store = { ...store, ...records };
      saveStore();
      alert("记录已导入。");
      render();
    } catch {
      alert("导入失败：请选择从本网站导出的 JSON 记录文件。");
    }
  };
  reader.readAsText(file);
}

function recordFor(id) {
  const key = String(id);
  store[key] ||= { wrong: false, favorite: false, mastered: false, note: "", attempts: 0, correct: 0 };
  return store[key];
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function answerText(q) {
  const map = Object.fromEntries(q.options.map((o) => [o.key, o.text]));
  return q.answer.map((key) => `${key}. ${map[key] || ""}`).join("　");
}

function sameAnswer(a, b) {
  return [...a].sort().join("") === [...b].sort().join("");
}

function isMultiple(q) {
  return q.answer.length > 1 || q.type.includes("多选");
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sample(items, count) {
  return shuffle(items).slice(0, count);
}

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "zh-Hans-CN"));
}

function setQuestionBank(payload) {
  bank = payload || { title: "题库", total: 0, questions: [] };
  allQuestions = bank.questions || [];
  pointOptions = sortedUnique(allQuestions.map((q) => q.point));
  typeOptions = sortedUnique(allQuestions.map((q) => q.type));
  difficultyOptions = sortedUnique(allQuestions.map((q) => q.difficulty));
}

function stats() {
  let wrong = 0;
  let favorite = 0;
  let notes = 0;
  let mastered = 0;
  for (const q of allQuestions) {
    const item = store[String(q.id)];
    if (!item) continue;
    if (item.wrong && !item.mastered) wrong += 1;
    if (item.favorite) favorite += 1;
    if (item.note) notes += 1;
    if (item.mastered) mastered += 1;
  }
  return { wrong, favorite, notes, mastered };
}

function header(title = bank.title) {
  return `
    <header class="topbar">
      <div class="brand">
        <h1>${escapeHTML(title)}</h1>
        <p>${escapeHTML(bank.source)} · 共 ${bank.total} 题 · 本地离线刷题</p>
      </div>
      <div class="top-actions">
        <span class="pill">${new Date().toLocaleDateString("zh-CN")}</span>
        ${state.view === "home" ? "" : `<button class="ghost-button" data-action="home">返回首页</button>`}
        <button class="ghost-button" data-action="export">导出记录</button>
        <button class="ghost-button" data-action="import">导入记录</button>
        <button class="danger-button" data-action="reset">清空记录</button>
        <input class="import-input" data-import-file type="file" accept="application/json,.json" />
      </div>
    </header>
  `;
}

function renderHome() {
  const s = stats();
  const statItems = [
    { scope: "wrong", value: s.wrong, label: "错题" },
    { scope: "fav", value: s.favorite, label: "收藏" },
    { scope: "notes", value: s.notes, label: "笔记" },
    { scope: "mastered", value: s.mastered, label: "已掌握" },
  ];
  app.innerHTML = `
    ${header()}
    <section class="stats-grid" aria-label="学习统计">
      ${statItems
        .map(
          (item) => `
            <button class="stat" type="button" data-action="stat-scope" data-scope="${item.scope}" aria-label="查看${item.label}题目">
              <strong>${item.value}</strong>
              <span>${item.label}</span>
              <small>${item.value ? "点击进入" : "暂无记录"}</small>
            </button>
          `,
        )
        .join("")}
    </section>
    <section class="simulator-banner panel">
      <div>
        <span class="tag">2026版操作技能题库</span>
        <h2>人工智能算法测试员实操模拟平台</h2>
        <p>基于 PDF 操作技能题库，提供 Python 编程、数据标注、流程设计、模拟考试和学习分析。</p>
      </div>
      <a class="primary-button" href="./ai-exam-simulator/?v=2026070701">进入实操模拟平台</a>
    </section>
    <main class="mode-grid" aria-label="刷题模式">
      ${modes
        .map(
          (mode) => `
          <button class="mode-tile" data-action="mode" data-mode="${mode.id}">
            <span class="tile-icon ${mode.color}">${icons[mode.icon]}</span>
            <span class="mode-title">${mode.title}</span>
            <span class="mode-caption">${modeDetails[mode.id].short}</span>
          </button>
        `,
        )
        .join("")}
    </main>
  `;
}

function startMode(mode) {
  if (mode === "browse") {
    state.view = "browse";
    state.filters = { point: "", type: "", difficulty: "", keyword: "" };
    state.browseLimit = 80;
    render();
    return;
  }
  if (mode === "select") {
    state.view = "select";
    state.filters = { point: "", type: "", difficulty: "", keyword: "" };
    render();
    return;
  }
  if (mode === "exam") {
    state.view = "exam-setup";
    state.exam = null;
    render();
    return;
  }
  startPractice(mode);
}

function boostQueue() {
  const entries = Object.entries(store);
  const idsBy = (predicate) => new Set(entries.filter(([, v]) => predicate(v)).map(([id]) => String(id)));
  const wrongIds = idsBy((v) => v.wrong && !v.mastered);
  let queue = allQuestions.filter((q) => wrongIds.has(String(q.id)));
  if (queue.length) return { queue: shuffle(queue), info: `来自错题本 ${queue.length} 题` };

  const favoriteIds = idsBy((v) => v.favorite);
  queue = allQuestions.filter((q) => favoriteIds.has(String(q.id)));
  if (queue.length) return { queue: shuffle(queue), info: `来自收藏题 ${queue.length} 题` };

  const noteIds = idsBy((v) => v.note);
  queue = allQuestions.filter((q) => noteIds.has(String(q.id)));
  if (queue.length) return { queue: shuffle(queue), info: `来自有笔记题 ${queue.length} 题` };

  queue = allQuestions.filter((q) => !recordFor(q.id).mastered && Number(q.difficulty) >= 3);
  if (queue.length) return { queue: shuffle(queue), info: `来自未掌握高难度题 ${queue.length} 题` };

  return { queue: shuffle(allQuestions), info: "暂无薄弱记录，临时改为全题库随机强化" };
}

function startPractice(mode, customQueue = null, startIndex = 0, customInfo = "", customTitle = "") {
  let queue = customQueue ? [...customQueue] : [...allQuestions];
  let modeInfo = customInfo || modeDetails[mode]?.rule || "";
  if (mode === "order") {
    modeInfo = customInfo || `按题库原始顺序练习，共 ${queue.length} 题。`;
  }
  if (mode === "random") {
    queue = shuffle(queue);
    modeInfo = customInfo || `已重新随机洗牌，共 ${queue.length} 题。`;
  }
  if (mode === "boost") {
    const boosted = boostQueue();
    queue = boosted.queue;
    modeInfo = boosted.info;
  }
  state = { ...state, view: "practice", mode, modeInfo, practiceTitle: customTitle, scope: "", queue, index: startIndex, selected: [], result: null, revealed: false };
  render();
}

function filteredQuestions(filters) {
  const keyword = filters.keyword.trim().toLowerCase();
  return allQuestions.filter((q) => {
    if (filters.point && q.point !== filters.point) return false;
    if (filters.type && q.type !== filters.type) return false;
    if (filters.difficulty && q.difficulty !== filters.difficulty) return false;
    if (keyword) {
      const haystack = [q.id, q.point, q.type, q.stem, q.options.map((o) => o.text).join(" "), q.answer.join("")]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });
}

function filterPanel(action = "select-start", options = {}) {
  const showStart = options.showStart !== false;
  const startLabel = options.startLabel || "开始练习";
  const makeOptions = (values, selected, allLabel) =>
    `<option value="">${allLabel}</option>${values.map((v) => `<option value="${escapeHTML(v)}" ${v === selected ? "selected" : ""}>${escapeHTML(v)}</option>`).join("")}`;
  return `
    <section class="filters panel">
      <label>知识点
        <select data-filter="point">${makeOptions(pointOptions, state.filters.point, "全部知识点")}</select>
      </label>
      <label>题型
        <select data-filter="type">${makeOptions(typeOptions, state.filters.type, "全部题型")}</select>
      </label>
      <label>难度
        <select data-filter="difficulty">${makeOptions(difficultyOptions, state.filters.difficulty, "全部难度")}</select>
      </label>
      <label>搜索
        <input data-filter="keyword" value="${escapeHTML(state.filters.keyword)}" placeholder="题干 / 选项 / 答案" />
      </label>
      <div class="browse-actions">
        ${showStart ? `<button class="primary-button" data-action="${action}">${startLabel}</button>` : `<span class="pill">仅浏览，不计分</span>`}
        <button class="ghost-button" data-action="clear-filter">重置筛选</button>
      </div>
    </section>
  `;
}

function renderSelect() {
  const list = filteredQuestions(state.filters);
  app.innerHTML = `
    ${header("选题练习")}
    <section class="mode-help panel"><strong>选题练习规则</strong><span>${modeDetails.select.rule}</span></section>
    ${filterPanel("select-start", { startLabel: `练筛选出的 ${list.length} 题` })}
    <section class="panel select-preview">
      <h2>筛选预览</h2>
      <p>当前筛选得到 ${list.length} 道题。这里先确认范围，再开始练习，避免入口看起来和顺序练习一样。</p>
      <div class="preview-list">
        ${list
          .slice(0, 12)
          .map((q) => `<article><span>#${q.id}</span><strong>${escapeHTML(q.stem)}</strong><small>${escapeHTML(q.type)} · ${escapeHTML(q.point)} · 难度 ${escapeHTML(q.difficulty)}</small></article>`)
          .join("")}
      </div>
      ${list.length > 12 ? `<p class="muted-text">仅预览前 12 题，开始后会进入完整筛选题集。</p>` : ""}
      ${list.length ? "" : `<div class="empty">没有匹配的题目，请调整筛选条件。</div>`}
    </section>
  `;
}

function renderPractice() {
  const q = state.queue[state.index];
  if (!q) {
    app.innerHTML = `${header("练习")}<section class="panel empty">没有找到可练习的题目。</section>`;
    return;
  }
  const rec = recordFor(q.id);
  const progress = Math.round(((state.index + 1) / state.queue.length) * 100);
  app.innerHTML = `
    ${header(modeTitle())}
    <main class="practice-layout">
      <section class="question-card panel">
        <div class="question-meta">
          <span class="tag">第 ${state.index + 1} / ${state.queue.length} 题</span>
          <span class="tag">${escapeHTML(q.type)}</span>
          <span class="tag">${escapeHTML(q.point)}</span>
          <span class="tag">难度 ${escapeHTML(q.difficulty)}</span>
          <span class="tag">原题号 ${q.id}</span>
        </div>
        <div class="mode-help inline"><strong>${escapeHTML(modeTitle())}</strong><span>${escapeHTML(state.modeInfo || modeDetails[state.mode]?.rule || "")}</span></div>
        <div class="progress-track"><div class="progress-fill" style="--progress:${progress}%"></div></div>
        <h2 class="stem">${escapeHTML(q.stem)}</h2>
        ${state.mode === "flash" ? renderFlash(q, rec) : renderOptions(q, state.selected, state.result)}
        ${state.result ? renderResult(q, state.result) : ""}
        <div class="card-actions">
          ${state.mode === "flash" ? "" : `<button class="primary-button" data-action="submit">提交答案</button>`}
          <button class="ghost-button" data-action="favorite">${rec.favorite ? "取消收藏" : "收藏"}</button>
          <button class="ghost-button" data-action="mastered">${rec.mastered ? "取消掌握" : "已掌握"}</button>
        </div>
        <div class="nav-actions">
          <button class="ghost-button" data-action="prev" ${state.index === 0 ? "disabled" : ""}>上一题</button>
          <button class="ghost-button" data-action="next">${state.index === state.queue.length - 1 ? "回到首页" : "下一题"}</button>
        </div>
      </section>
      <aside class="side-panel panel">
        <h2>本题笔记</h2>
        <textarea class="note-area" data-note="${q.id}" placeholder="写下易错点、记忆口诀或解析">${escapeHTML(rec.note || "")}</textarea>
        <div class="quick-list">
          <button class="ghost-button" data-action="show-wrong">只练错题</button>
          <button class="ghost-button" data-action="show-fav">只练收藏</button>
          <button class="ghost-button" data-action="show-notes">只看有笔记</button>
          <button class="ghost-button" data-action="show-mastered">只看已掌握</button>
        </div>
      </aside>
    </main>
  `;
}

function modeTitle() {
  if (state.practiceTitle) return state.practiceTitle;
  const found = modes.find((m) => m.id === state.mode);
  return found ? found.title : "练习";
}

function renderOptions(q, selected, result) {
  return `
    <div class="options">
      ${q.options
        .map((option) => {
          const isSelected = selected.includes(option.key);
          let cls = isSelected ? " selected" : "";
          if (result) {
            if (q.answer.includes(option.key)) cls += " correct";
            else if (isSelected) cls += " wrong";
          }
          return `
            <button class="option${cls}" data-action="choose" data-key="${option.key}">
              <span class="letter">${option.key}</span>
              <span class="option-text">${escapeHTML(option.text)}</span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderFlash(q, rec) {
  const optionList = q.options
    .map((option) => `<li><strong>${option.key}.</strong> ${escapeHTML(option.text)}</li>`)
    .join("");
  return `
    ${
      state.revealed
        ? `<div class="flash-card back">
             <div class="flash-face-label">背面</div>
             <div class="flash-back-answer"><strong>答案：</strong>${escapeHTML(answerText(q))}</div>
             <ul class="flash-option-list">${optionList}</ul>
           </div>
           <div class="card-actions">
             <button class="primary-button" data-action="flash-known">已掌握</button>
             <button class="ghost-button" data-action="flash-unknown">还不熟</button>
             <button class="ghost-button" data-action="flash-front">再看题面</button>
           </div>`
        : `<button class="flash-card front" data-action="reveal" type="button">
             <span class="flash-face-label">正面</span>
             <span class="flash-front-text">先在心里回忆答案，准备好后翻到背面核对。</span>
             <span class="flash-flip-button">翻卡看答案</span>
           </button>`
    }
    ${rec.wrong && !rec.mastered ? `<div class="answer-box bad">这道题仍在错题本里。</div>` : ""}
  `;
}

function renderResult(q, result) {
  const cls = result.correct ? "good" : "bad";
  return `
    <div class="answer-box ${cls}">
      <strong>${result.correct ? "回答正确" : "回答错误"}</strong><br />
      正确答案：${escapeHTML(answerText(q))}
      ${q.remark ? `<br />备注：${escapeHTML(q.remark)}` : ""}
    </div>
  `;
}

function choose(key) {
  const q = state.view === "exam" ? state.exam.questions[state.exam.index] : state.queue[state.index];
  if (!q) return;
  if (state.view === "exam") {
    const current = state.exam.answers[q.id] || [];
    state.exam.answers[q.id] = isMultiple(q)
      ? current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
      : [key];
    render();
    return;
  }
  if (state.result || state.mode === "flash") return;
  state.selected = isMultiple(q)
    ? state.selected.includes(key)
      ? state.selected.filter((item) => item !== key)
      : [...state.selected, key]
    : [key];
  render();
}

function submitAnswer() {
  const q = state.queue[state.index];
  if (!q || !state.selected.length) return;
  const correct = sameAnswer(state.selected, q.answer);
  const rec = recordFor(q.id);
  rec.attempts += 1;
  if (correct) {
    rec.correct += 1;
    rec.wrong = false;
  } else {
    rec.wrong = true;
    rec.mastered = false;
  }
  state.result = { correct };
  saveStore();
  render();
}

function move(delta) {
  if (state.index + delta < 0) return;
  if (state.index + delta >= state.queue.length) {
    state.view = "home";
    render();
    return;
  }
  state.index += delta;
  state.selected = [];
  state.result = null;
  state.revealed = false;
  render();
}

function toggleField(field) {
  const q = state.queue[state.index];
  if (!q) return;
  const rec = recordFor(q.id);
  rec[field] = !rec[field];
  if (field === "mastered" && rec.mastered) rec.wrong = false;
  saveStore();
  render();
}

function flashMark(known) {
  const q = state.queue[state.index];
  if (!q) return;
  const rec = recordFor(q.id);
  rec.attempts += 1;
  if (known) {
    rec.mastered = true;
    rec.wrong = false;
    rec.correct += 1;
  } else {
    rec.mastered = false;
    rec.wrong = true;
  }
  saveStore();
  move(1);
}

function savedRecord(id) {
  return store[String(id)] || {};
}

function scopedQuestions(scope) {
  if (scope === "wrong") return allQuestions.filter((q) => savedRecord(q.id).wrong && !savedRecord(q.id).mastered);
  if (scope === "fav") return allQuestions.filter((q) => savedRecord(q.id).favorite);
  if (scope === "notes") return allQuestions.filter((q) => savedRecord(q.id).note);
  if (scope === "mastered") return allQuestions.filter((q) => savedRecord(q.id).mastered);
  return [];
}

function scopedPractice(scope) {
  const detail = scopeDetails[scope];
  if (!detail) return;
  const queue = scopedQuestions(scope);
  if (!queue.length) {
    state = { ...state, view: "scope-empty", scope, practiceTitle: detail.title };
    render();
    return;
  }
  startPractice("order", queue, 0, `${detail.info} 共 ${queue.length} 题。`, detail.title);
}

function renderScopeEmpty() {
  const detail = scopeDetails[state.scope] || { title: "学习记录", empty: "当前没有记录。" };
  app.innerHTML = `
    ${header(detail.title)}
    <section class="panel empty scope-empty">
      <h2>${escapeHTML(detail.empty)}</h2>
      <p>先在练习中提交答案、收藏题目、填写笔记或标记掌握后，这里会自动生成对应题目入口。</p>
      <div class="card-actions">
        <button class="primary-button" data-action="mode" data-mode="order">去顺序练习</button>
        <button class="ghost-button" data-action="home">返回首页</button>
      </div>
    </section>
  `;
}

function formatDuration(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function renderExamSetup() {
  const makeOptions = (values, selected, label) =>
    `<option value="">${label}</option>${values.map((v) => `<option value="${escapeHTML(v)}" ${v === selected ? "selected" : ""}>${escapeHTML(v)}</option>`).join("")}`;
  const cfg = state.examConfig;
  const matching = allQuestions.filter((q) => (!cfg.type || q.type === cfg.type) && (!cfg.point || q.point === cfg.point));
  app.innerHTML = `
    ${header("模拟考试")}
    <section class="mode-help panel"><strong>模拟考试规则</strong><span>${modeDetails.exam.rule}</span></section>
    <section class="exam-setup panel">
      <div>
        <h2>考前设置</h2>
        <p>这里先配置题量、题型、知识点和抽题规则；开始后会进入倒计时考试界面。</p>
      </div>
      <div class="setup-grid">
        <label>题量
          <select data-exam-config="count">
            ${[20, 50, 100].map((n) => `<option value="${n}" ${String(n) === cfg.count ? "selected" : ""}>${n} 题</option>`).join("")}
          </select>
        </label>
        <label>题型
          <select data-exam-config="type">${makeOptions(typeOptions, cfg.type, "全部题型")}</select>
        </label>
        <label>知识点
          <select data-exam-config="point">${makeOptions(pointOptions, cfg.point, "全部知识点")}</select>
        </label>
        <label>抽题规则
          <select data-exam-config="source">
            <option value="balanced" ${cfg.source === "balanced" ? "selected" : ""}>均衡抽题</option>
            <option value="order" ${cfg.source === "order" ? "selected" : ""}>PDF原顺序</option>
            <option value="random" ${cfg.source === "random" ? "selected" : ""}>完全随机</option>
            <option value="wrong" ${cfg.source === "wrong" ? "selected" : ""}>错题重考</option>
          </select>
        </label>
      </div>
      <div class="exam-summary">
        <span class="tag">可抽 ${matching.length} 题</span>
        <span class="tag">预计 ${Math.max(10, Number(cfg.count || 50))} 分钟</span>
        <span class="tag">交卷后生成成绩</span>
      </div>
      <div class="browse-actions">
        <button class="primary-button" data-action="start-exam">开始考试</button>
        <button class="ghost-button" data-action="home">返回首页</button>
      </div>
    </section>
  `;
}

function startExam() {
  const config = { ...state.examConfig };
  let pool = allQuestions.filter((q) => (!config.type || q.type === config.type) && (!config.point || q.point === config.point));
  if (config.source === "wrong") {
    const wrongIds = new Set(Object.entries(store).filter(([, v]) => v.wrong && !v.mastered).map(([id]) => String(id)));
    pool = allQuestions.filter((q) => wrongIds.has(String(q.id)));
  }
  if (config.source === "random" || config.source === "balanced" || config.source === "wrong") pool = shuffle(pool);
  const count = Math.min(Number(config.count || 50), pool.length);
  const examQuestions = pool.slice(0, count);
  if (!examQuestions.length) {
    alert("当前条件下没有可考试题目，请调整考前设置。");
    return;
  }
  const durationMinutes = Math.max(10, count);
  state.view = "exam";
  state.exam = {
    questions: examQuestions,
    index: 0,
    answers: {},
    submitted: false,
    config,
    startedAt: Date.now(),
    endsAt: Date.now() + durationMinutes * 60 * 1000,
    durationMinutes,
  };
  render();
}

function renderExam() {
  const ex = state.exam;
  const q = ex.questions[ex.index];
  const selected = ex.answers[q.id] || [];
  const progress = Math.round(((ex.index + 1) / ex.questions.length) * 100);
  const answered = Object.keys(ex.answers).filter((id) => ex.answers[id]?.length).length;
  const remaining = ex.submitted ? 0 : ex.endsAt - Date.now();
  app.innerHTML = `
    ${header("模拟考试")}
    ${ex.submitted ? renderExamResult() : ""}
    <section class="mode-help panel"><strong>考试进行中</strong><span>题量 ${ex.questions.length} · ${ex.config.source === "order" ? "PDF原顺序" : ex.config.source === "wrong" ? "错题重考" : ex.config.source === "random" ? "完全随机" : "均衡抽题"} · 倒计时结束会自动交卷。</span></section>
    <main class="exam-grid">
      <section class="question-card panel">
        <div class="question-meta">
          <span class="tag">第 ${ex.index + 1} / ${ex.questions.length} 题</span>
          <span class="tag">${escapeHTML(q.type)}</span>
          <span class="tag">${escapeHTML(q.point)}</span>
          <span class="tag">已答 ${answered}</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="--progress:${progress}%"></div></div>
        <h2 class="stem">${escapeHTML(q.stem)}</h2>
        ${renderOptions(q, selected, ex.submitted ? { correct: sameAnswer(selected, q.answer) } : null)}
        ${ex.submitted ? renderResult(q, { correct: sameAnswer(selected, q.answer) }) : ""}
        <div class="nav-actions">
          <button class="ghost-button" data-action="exam-prev" ${ex.index === 0 ? "disabled" : ""}>上一题</button>
          <button class="ghost-button" data-action="exam-next" ${ex.index === ex.questions.length - 1 ? "disabled" : ""}>下一题</button>
          ${ex.submitted ? "" : `<button class="primary-button" data-action="exam-submit">交卷</button>`}
        </div>
      </section>
      <aside class="exam-nav panel">
        <h2>答题卡</h2>
        <div class="exam-clock">${ex.submitted ? "已交卷" : formatDuration(remaining)}</div>
        <p>已答 ${answered} / ${ex.questions.length}</p>
        <div class="exam-buttons">
          ${ex.questions
            .map(
              (item, index) =>
                `<button class="exam-num ${ex.answers[item.id]?.length ? "done" : ""}" data-action="exam-jump" data-index="${index}">${index + 1}</button>`,
            )
            .join("")}
        </div>
      </aside>
    </main>
  `;
}

function renderExamResult() {
  const ex = state.exam;
  let correct = 0;
  for (const q of ex.questions) {
    const picked = ex.answers[q.id] || [];
    if (sameAnswer(picked, q.answer)) correct += 1;
  }
  const rate = Math.round((correct / ex.questions.length) * 100);
  return `
    <section class="exam-result panel">
      <p class="score">${correct} 分</p>
      <p>本次模拟考试共 ${ex.questions.length} 题，答对 ${correct} 题，正确率 ${rate}%。错题已自动加入错题本。</p>
    </section>
  `;
}

function submitExam(auto = false) {
  if (!auto && !confirm("确认交卷并生成成绩？")) return;
  const ex = state.exam;
  for (const q of ex.questions) {
    const picked = ex.answers[q.id] || [];
    const rec = recordFor(q.id);
    rec.attempts += 1;
    if (sameAnswer(picked, q.answer)) {
      rec.correct += 1;
      rec.wrong = false;
    } else {
      rec.wrong = true;
      rec.mastered = false;
    }
  }
  ex.submitted = true;
  saveStore();
  render();
}

function renderBrowse() {
  const list = filteredQuestions(state.filters);
  app.innerHTML = `
    ${header("浏览题目")}
    <section class="mode-help panel"><strong>浏览题目规则</strong><span>${modeDetails.browse.rule}</span></section>
    ${filterPanel("browse-practice", { showStart: false })}
    <section class="browse-list">
      ${list
        .slice(0, state.browseLimit)
        .map((q) => {
          const rec = recordFor(q.id);
          return `
            <article class="browse-item">
              <div class="question-meta">
                <span class="tag">#${q.id}</span>
                <span class="tag">${escapeHTML(q.type)}</span>
                <span class="tag">${escapeHTML(q.point)}</span>
                <span class="tag">难度 ${escapeHTML(q.difficulty)}</span>
                ${rec.wrong && !rec.mastered ? `<span class="tag">错题</span>` : ""}
                ${rec.favorite ? `<span class="tag">收藏</span>` : ""}
              </div>
              <h3>${escapeHTML(q.stem)}</h3>
              <p>答案：${escapeHTML(answerText(q))}</p>
              <div class="browse-actions">
                <button class="ghost-button" data-action="practice-one" data-id="${q.id}">练这题</button>
              </div>
            </article>
          `;
        })
        .join("")}
    </section>
    ${
      list.length > state.browseLimit
        ? `<div class="browse-actions"><button class="ghost-button" data-action="more">加载更多（${state.browseLimit} / ${list.length}）</button></div>`
        : ""
    }
    ${list.length ? "" : `<section class="panel empty">没有匹配的题目。</section>`}
  `;
}

function render() {
  if (state.view === "home") renderHome();
  if (state.view === "practice") renderPractice();
  if (state.view === "select") renderSelect();
  if (state.view === "browse") renderBrowse();
  if (state.view === "scope-empty") renderScopeEmpty();
  if (state.view === "exam-setup") renderExamSetup();
  if (state.view === "exam") renderExam();
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "mode") startMode(target.dataset.mode);
  if (action === "home") {
    state.view = "home";
    state.practiceTitle = "";
    state.scope = "";
    render();
  }
  if (action === "reset" && confirm("确认清空错题、收藏、笔记和掌握记录？")) {
    store = {};
    saveStore();
    render();
  }
  if (action === "export") exportRecords();
  if (action === "import") {
    const input = app.querySelector("[data-import-file]");
    if (input) input.click();
  }
  if (action === "choose") choose(target.dataset.key);
  if (action === "submit") submitAnswer();
  if (action === "prev") move(-1);
  if (action === "next") move(1);
  if (action === "favorite") toggleField("favorite");
  if (action === "mastered") toggleField("mastered");
  if (action === "reveal") {
    state.revealed = true;
    render();
  }
  if (action === "flash-front") {
    state.revealed = false;
    render();
  }
  if (action === "flash-known") flashMark(true);
  if (action === "flash-unknown") flashMark(false);
  if (action === "stat-scope") scopedPractice(target.dataset.scope);
  if (action === "show-wrong") scopedPractice("wrong");
  if (action === "show-fav") scopedPractice("fav");
  if (action === "show-notes") scopedPractice("notes");
  if (action === "show-mastered") scopedPractice("mastered");
  if (action === "select-start") {
    const list = filteredQuestions(state.filters);
    startPractice("order", list, 0, `来自选题筛选 ${list.length} 题，将按筛选结果顺序练习。`);
  }
  if (action === "start-exam") startExam();
  if (action === "clear-filter") {
    state.filters = { point: "", type: "", difficulty: "", keyword: "" };
    render();
  }
  if (action === "practice-one") {
    const q = allQuestions.find((item) => item.id === Number(target.dataset.id));
    if (q) startPractice("order", [q]);
  }
  if (action === "more") {
    state.browseLimit += 80;
    render();
  }
  if (action === "exam-prev" && state.exam.index > 0) {
    state.exam.index -= 1;
    render();
  }
  if (action === "exam-next" && state.exam.index < state.exam.questions.length - 1) {
    state.exam.index += 1;
    render();
  }
  if (action === "exam-jump") {
    state.exam.index = Number(target.dataset.index);
    render();
  }
  if (action === "exam-submit") submitExam();
});

app.addEventListener("input", (event) => {
  const noteId = event.target.dataset.note;
  if (noteId) {
    recordFor(noteId).note = event.target.value.trim();
    saveStore();
  }
  const filter = event.target.dataset.filter;
  if (filter) {
    state.filters[filter] = event.target.value;
    if (state.view === "browse") state.browseLimit = 80;
    clearTimeout(filterTimer);
    filterTimer = setTimeout(render, 260);
  }
});

app.addEventListener("change", (event) => {
  if (event.target.dataset.importFile !== undefined) {
    importRecords(event.target.files?.[0]);
    event.target.value = "";
    return;
  }
  const examConfig = event.target.dataset.examConfig;
  if (examConfig) {
    state.examConfig[examConfig] = event.target.value;
    renderExamSetup();
    return;
  }
  const filter = event.target.dataset.filter;
  if (!filter) return;
  state.filters[filter] = event.target.value;
  if (state.view === "browse") state.browseLimit = 80;
  render();
});

app.addEventListener("submit", (event) => {
  if (event.target.dataset.unlockForm === undefined) return;
  event.preventDefault();
  const password = event.target.querySelector("[data-password]")?.value || "";
  unlockSite(password);
});

setInterval(() => {
  if (state.view !== "exam" || !state.exam || state.exam.submitted) return;
  if (Date.now() >= state.exam.endsAt) submitExam(true);
  else renderExam();
}, 1000);

function boot() {
  if (window.ENCRYPTED_QUESTION_BANK) {
    renderLock();
    return;
  }
  setQuestionBank(window.QUESTION_BANK || { title: "题库", total: 0, questions: [] });
  render();
}

boot();
