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
  filters: { point: "", type: "", difficulty: "", keyword: "" },
  browseLimit: 80,
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
  app.innerHTML = `
    ${header()}
    <section class="stats-grid" aria-label="学习统计">
      <div class="stat"><strong>${s.wrong}</strong><span>错题</span></div>
      <div class="stat"><strong>${s.favorite}</strong><span>收藏</span></div>
      <div class="stat"><strong>${s.notes}</strong><span>笔记</span></div>
      <div class="stat"><strong>${s.mastered}</strong><span>已掌握</span></div>
    </section>
    <main class="mode-grid" aria-label="刷题模式">
      ${modes
        .map(
          (mode) => `
          <button class="mode-tile" data-action="mode" data-mode="${mode.id}">
            <span class="tile-icon ${mode.color}">${icons[mode.icon]}</span>
            <span class="mode-title">${mode.title}</span>
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
    startExam();
    return;
  }
  startPractice(mode);
}

function startPractice(mode, customQueue = null, startIndex = 0) {
  let queue = customQueue ? [...customQueue] : [...allQuestions];
  if (mode === "random") queue = shuffle(queue);
  if (mode === "boost") {
    const wrongIds = new Set(Object.entries(store).filter(([, v]) => v.wrong && !v.mastered).map(([id]) => Number(id)));
    queue = allQuestions.filter((q) => wrongIds.has(q.id));
    if (!queue.length) queue = allQuestions.filter((q) => !recordFor(q.id).mastered && Number(q.difficulty) >= 3);
    if (!queue.length) queue = [...allQuestions];
    queue = shuffle(queue);
  }
  state = { ...state, view: "practice", mode, queue, index: startIndex, selected: [], result: null, revealed: false };
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

function filterPanel(action = "select-start") {
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
        <button class="primary-button" data-action="${action}">开始练习</button>
        <button class="ghost-button" data-action="clear-filter">重置筛选</button>
      </div>
    </section>
  `;
}

function renderSelect() {
  const list = filteredQuestions(state.filters);
  app.innerHTML = `
    ${header("选题练习")}
    ${filterPanel("select-start")}
    <section class="panel empty">当前筛选得到 ${list.length} 道题。选择条件后点击“开始练习”。</section>
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
        </div>
      </aside>
    </main>
  `;
}

function modeTitle() {
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
  return `
    ${renderOptions(q, [], state.revealed ? { correct: true } : null)}
    ${
      state.revealed
        ? `<div class="flash-answer"><strong>答案：</strong>${escapeHTML(answerText(q))}</div>
           <div class="card-actions">
             <button class="primary-button" data-action="flash-known">已掌握</button>
             <button class="ghost-button" data-action="flash-unknown">还不熟</button>
           </div>`
        : `<div class="card-actions"><button class="primary-button" data-action="reveal">显示答案</button></div>`
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

function scopedPractice(scope) {
  let queue = [];
  if (scope === "wrong") {
    queue = allQuestions.filter((q) => recordFor(q.id).wrong && !recordFor(q.id).mastered);
  }
  if (scope === "fav") {
    queue = allQuestions.filter((q) => recordFor(q.id).favorite);
  }
  if (scope === "notes") {
    queue = allQuestions.filter((q) => recordFor(q.id).note);
  }
  startPractice("order", queue);
}

function startExam() {
  const singles = allQuestions.filter((q) => q.type.includes("单选"));
  const multis = allQuestions.filter((q) => q.type.includes("多选"));
  const judges = allQuestions.filter((q) => q.type.includes("判断"));
  let examQuestions = [...sample(singles, 50), ...sample(multis, 20), ...sample(judges, 30)];
  if (examQuestions.length < 100) {
    const chosen = new Set(examQuestions.map((q) => q.id));
    examQuestions = [...examQuestions, ...sample(allQuestions.filter((q) => !chosen.has(q.id)), 100 - examQuestions.length)];
  }
  state.view = "exam";
  state.exam = { questions: shuffle(examQuestions).slice(0, 100), index: 0, answers: {}, submitted: false };
  render();
}

function renderExam() {
  const ex = state.exam;
  const q = ex.questions[ex.index];
  const selected = ex.answers[q.id] || [];
  const progress = Math.round(((ex.index + 1) / ex.questions.length) * 100);
  const answered = Object.keys(ex.answers).filter((id) => ex.answers[id]?.length).length;
  app.innerHTML = `
    ${header("模拟考试")}
    ${ex.submitted ? renderExamResult() : ""}
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
  return `
    <section class="exam-result panel">
      <p class="score">${correct} 分</p>
      <p>本次模拟考试共 ${ex.questions.length} 题，答对 ${correct} 题，答错 ${ex.questions.length - correct} 题。错题已自动加入错题本。</p>
    </section>
  `;
}

function submitExam() {
  if (!confirm("确认交卷并生成成绩？")) return;
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
    ${filterPanel("browse-practice")}
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
  if (state.view === "exam") renderExam();
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "mode") startMode(target.dataset.mode);
  if (action === "home") {
    state.view = "home";
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
  if (action === "flash-known") flashMark(true);
  if (action === "flash-unknown") flashMark(false);
  if (action === "show-wrong") scopedPractice("wrong");
  if (action === "show-fav") scopedPractice("fav");
  if (action === "show-notes") scopedPractice("notes");
  if (action === "select-start" || action === "browse-practice") {
    const list = filteredQuestions(state.filters);
    startPractice("order", list);
  }
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

function boot() {
  if (window.ENCRYPTED_QUESTION_BANK) {
    renderLock();
    return;
  }
  setQuestionBank(window.QUESTION_BANK || { title: "题库", total: 0, questions: [] });
  render();
}

boot();
