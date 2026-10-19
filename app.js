(() => {
  "use strict";

  const D = window.GAME_DATA;
  const STORE_KEY = "gacha-2010-state-v1";
  const SPIN_MS = 6000;       // thời gian mỗi vòng quay gacha
  const BONUS_SPIN_MS = 3500; // thời gian mỗi lượt quay bonus (người thứ 2 trở đi)
  const RARITY = {
    common:    { color: "var(--r-common)",    get label() { return t("rarity.common"); } },
    rare:      { color: "var(--r-rare)",      get label() { return t("rarity.rare"); } },
    epic:      { color: "var(--r-epic)",      get label() { return t("rarity.epic"); } },
    legendary: { color: "var(--r-legendary)", get label() { return t("rarity.legendary"); } }
  };
  const AVATAR_COLORS = [
    ["#ff7aa2", "#e8457a"], ["#ffb26b", "#f0753a"], ["#c38bff", "#8e4fe0"],
    ["#6ad1c0", "#2f9e8f"], ["#ff8a8a", "#e04848"], ["#7fb8ff", "#3f7fe0"],
    ["#f9a8d4", "#db2777"], ["#ffd36b", "#e0a21c"], ["#a3e48b", "#4fa83a"]
  ];

  const $ = (sel) => document.querySelector(sel);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (n) => Math.floor(Math.random() * n);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));

  /* ---------------- Ngôn ngữ (VI / EN) ---------------- */
  const I18N = window.I18N || { vi: {} };
  const LANGS = Object.keys(I18N);
  /** Chữ giao diện theo ngôn ngữ hiện tại, `{x}` được thay bằng vars.x. */
  function t(key, vars) {
    const str = (I18N[lang] || {})[key] ?? I18N.vi[key] ?? key;
    return vars ? str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : str;
  }
  /** Dữ liệu trong data.js: nếu có bản `en` thì ghép đè lên bản tiếng Việt. */
  const L = (o) => (lang !== "vi" && o && o[lang] ? { ...o, ...o[lang] } : o);

  /** Áp chữ cho các phần tử tĩnh có data-i18n* trong HTML. */
  function applyStaticI18n() {
    document.documentElement.lang = lang;
    document.title = t("doc.title");
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => { el.title = t(el.dataset.i18nTitle); });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
    document.querySelectorAll("[data-i18n-alt]").forEach((el) => { el.alt = t(el.dataset.i18nAlt); });
    document.querySelectorAll("[data-lang]").forEach((b) => {
      b.classList.toggle("on", b.dataset.lang === lang);
      b.setAttribute("aria-pressed", b.dataset.lang === lang);
    });
  }

  function setLang(next) {
    if (!LANGS.includes(next) || next === lang) return;
    lang = next;
    state.lang = lang;
    save();
    applyStaticI18n();
    renderAll();
  }

  /** Escape HTML rồi đổi `đoạn code` thành <code> inline. */
  const richText = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");

  /** Tô màu cú pháp JS đơn giản cho khối code trong câu hỏi. */
  const TOKEN = /(\/\/.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|\b(\d+(?:\.\d+)?)\b|\b(var|let|const|for|while|if|else|function|return|typeof|new|of|in|class|async|await|true|false|null|undefined|NaN)\b|([A-Za-z_$][\w$]*)(?=\s*\()/gm;
  function highlight(code) {
    let out = "", last = 0, m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(code))) {
      out += esc(code.slice(last, m.index));
      const cls = m[1] ? "c-com" : m[2] ? "c-str" : m[3] ? "c-num" : m[4] ? "c-kw" : "c-fn";
      out += `<span class="${cls}">${esc(m[0])}</span>`;
      last = m.index + m[0].length;
    }
    return out + esc(code.slice(last));
  }

  /* ---------------- State ---------------- */
  // results[womanIndex] = { q, correct, p?, m? }
  const freshState = () => ({ used: { q: [], p: [], m: [] }, results: {}, rescue: null, sound: true, lang: "vi", order: randomOrder(D.women.length) });

  /** Hoán vị ngẫu nhiên 0..n-1 (thứ tự hiện các bạn nữ, cố định cho tới khi xoá lịch sử). */
  function randomOrder(n) {
    const a = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  let state = load();
  let lang = state.lang && (window.I18N || {})[state.lang] ? state.lang : "vi";

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && s.used && s.results) return sanitize(s);
    } catch (e) { /* ignore */ }
    return freshState();
  }
  /** Bỏ các chỉ số không còn tồn tại khi data.js bị sửa (bớt câu hỏi / thử thách / nam). */
  function sanitize(s) {
    const n = D.women.length;
    const o = s.order;
    if (!Array.isArray(o) || o.length !== n || new Set(o).size !== n || o.some((i) => !(i >= 0 && i < n))) s.order = randomOrder(n);
    const size = { q: D.questions.length, p: D.punishments.length, m: D.men.length };
    Object.keys(size).forEach((k) => { s.used[k] = (s.used[k] || []).filter((i) => i < size[k]); });
    Object.keys(s.results).forEach((w) => {
      const r = s.results[w];
      const bad = w >= D.women.length || (r.p != null && r.p >= size.p) ||
        (r.ms || (r.m != null ? [r.m] : [])).some((m) => m >= size.m);
      if (bad) delete s.results[w];
    });
    if (s.rescue && (s.rescue.qi >= ((D.rescue || {}).questions || []).length || s.rescue.ms.some((m) => m >= size.m))) s.rescue = null;
    return s;
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  const POOLS = { q: D.questions, p: D.punishments, m: D.men };

  function available(kind) {
    const all = POOLS[kind].map((_, i) => i);
    const left = all.filter((i) => !state.used[kind].includes(i));
    return left.length ? left : all; // hết thì quay vòng lại
  }
  function pick(kind) {
    const list = available(kind);
    return list[rand(list.length)];
  }
  function markUsed(kind, i) {
    if (!state.used[kind].includes(i)) state.used[kind].push(i);
  }

  /**
   * Chọn câu hỏi cho bạn nữ `w`: câu có `for` trùng tên bạn ấy thì ưu tiên;
   * câu đã giữ cho người khác thì không random trúng (trừ khi hết câu).
   */
  function pickQuestion(w) {
    const name = D.women[w];
    const fresh = (i) => !state.used.q.includes(i);
    const all = D.questions.map((_, i) => i);
    const mine = all.filter((i) => D.questions[i].for === name && fresh(i));
    if (mine.length) return mine[rand(mine.length)];
    const open = all.filter((i) => !D.questions[i].for && fresh(i));
    if (open.length) return open[rand(open.length)];
    return pick("q");
  }

  /**
   * Chọn thử thách cho bạn nữ `w`:
   *  - Thử thách có `for` trùng tên bạn ấy → luôn ra cái đó (giữ riêng, người khác không trúng).
   *  - Còn lại: rút ngẫu nhiên trong các thử thách CHƯA ra trước → không bỏ sót cái nào.
   *  - Ra đủ hết rồi thì chỉ thử thách Thường (common) được ra lại;
   *    Hiếm / Sử thi… chỉ ra đúng 1 lần.
   */
  function pickPunishment(w) {
    const name = D.women[w];
    const all = D.punishments.map((_, i) => i);
    const unused = (i) => !state.used.p.includes(i);
    const mine = all.filter((i) => D.punishments[i].for === name);
    if (mine.length) {
      const fresh = mine.filter(unused);
      return (fresh.length ? fresh : mine)[rand((fresh.length ? fresh : mine).length)];
    }
    const open = all.filter((i) => !D.punishments[i].for);
    const pool = open.length ? open : all;
    const fresh = pool.filter(unused);
    if (fresh.length) return fresh[rand(fresh.length)];
    const commons = pool.filter((i) => D.punishments[i].rarity === "common");
    return (commons.length ? commons : pool)[rand((commons.length ? commons : pool).length)];
  }

  /** Số bạn nam phải chịu phạt cho thử thách `p`. */
  function victimsOf(p) {
    const pun = D.punishments[p];
    return pun.victims || (D.victimsByRarity || {})[pun.rarity] || 1;
  }
  /** Chọn `n` bạn nam khác nhau, ưu tiên người chưa bị gọi. */
  function pickMen(n) {
    const chosen = [];
    for (let k = 0; k < n; k++) {
      let list = available("m").filter((i) => !chosen.includes(i));
      if (!list.length) list = D.men.map((_, i) => i).filter((i) => !chosen.includes(i));
      if (!list.length) break;
      chosen.push(list[rand(list.length)]);
    }
    return chosen;
  }
  /** Danh sách nam của một kết quả (tương thích dữ liệu cũ chỉ có `m`). */
  const menOf = (r) => r.ms || (r.m != null ? [r.m] : []);
  /** "A", "A và B", "A, B và C" */
  function joinNames(names) {
    return names.length < 2 ? names.join("") : names.slice(0, -1).join(", ") + t("and") + names[names.length - 1];
  }

  /* ---------------- Sound (WebAudio) ---------------- */
  let audio;
  function tone(freq, dur = 0.05, type = "triangle", vol = 0.08) {
    if (!state.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
      o.connect(g).connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + dur);
    } catch (e) { /* ignore */ }
  }
  const tick = () => tone(1200 + rand(200), 0.03, "square", 0.03);
  function fanfare() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.25, "triangle", 0.1), i * 120));
  }
  function ding() { tone(880, 0.3, "sine", 0.12); setTimeout(() => tone(1320, 0.35, "sine", 0.1), 90); }

  /* ---------------- Confetti ---------------- */
  function celebrate(big) {
    if (typeof window.confetti !== "function") return;
    const colors = ["#e8457a", "#ff9ab8", "#ffd6e3", "#f4b942", "#ffffff"];
    window.confetti({ particleCount: big ? 160 : 80, spread: 90, origin: { y: 0.6 }, colors });
    if (big) {
      setTimeout(() => window.confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0 }, colors }), 250);
      setTimeout(() => window.confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1 }, colors }), 400);
    }
  }

  /* ---------------- Petals background ---------------- */
  function spawnPetals() {
    const box = $("#petals");
    const n = window.innerWidth < 640 ? 18 : 34;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span");
      p.className = "petal" + (i % 3 === 0 ? " alt" : "");
      const size = 10 + Math.random() * 12;
      p.style.left = Math.random() * 100 + "vw";
      p.style.width = size + "px";
      p.style.height = size * 0.75 + "px";
      p.style.animationDuration = 8 + Math.random() * 10 + "s";
      p.style.animationDelay = -Math.random() * 18 + "s";
      p.style.setProperty("--drift", (Math.random() * 200 - 100) + "px");
      p.style.setProperty("--spin", (360 + Math.random() * 540) + "deg");
      box.appendChild(p);
    }
  }

  /* ---------------- Render game screen ---------------- */
  function renderStats() {
    const left = (k) => POOLS[k].length - state.used[k].length;
    const played = Object.keys(state.results).length;
    $("#stats").innerHTML = `
      <span class="stat">${t("stats.played", { n: played, total: D.women.length })}</span>
      <span class="stat">${t("stats.questions", { n: left("q") })}</span>
      <span class="stat">${t("stats.challenges", { n: left("p") })}</span>
      <span class="stat">${t("stats.men", { n: left("m") })}</span>`;
  }

  function renderWomen() {
    const grid = $("#women-grid");
    grid.innerHTML = "";
    state.order.forEach((i, pos) => { // thứ tự ngẫu nhiên
      const name = D.women[i];
      const r = state.results[i];
      const [c1, c2] = AVATAR_COLORS[i % AVATAR_COLORS.length];
      const btn = document.createElement("button");
      btn.className = "woman" + (r ? (r.p != null ? " done" : " missed") : "");
      btn.style.animationDelay = pos * 0.05 + "s";
      btn.innerHTML = `
        <span class="woman-avatar" style="--c1:${c1};--c2:${c2}">${esc(name.charAt(0).toUpperCase())}</span>
        <span class="woman-name">${esc(name)}</span>
        <span class="woman-tag">${t(r ? (r.p != null ? "women.done" : "women.missed") : "women.new")}</span>`;
      btn.addEventListener("click", () => openWoman(i));
      grid.appendChild(btn);
    });
  }

  const POINTS = { common: 1, rare: 2, epic: 3, legendary: 5 };
  const DAMAGE_STEPS = [0, 1, 25, 50, 75, 100];
  const damageLabel = (pct) => t("dmg." + DAMAGE_STEPS.filter((min) => pct >= min).pop());
  let freshW = null; // bạn nữ vừa nhận quà → highlight trên bảng vàng

  /** Hàng avatar chữ cái + tên các anh. */
  function menRowHTML(ms) {
    const MAX = 4;
    const avs = ms.slice(0, MAX).map((m) => {
      const [c] = AVATAR_COLORS[m % AVATAR_COLORS.length];
      return `<span style="--av:${c}">${esc(D.men[m].charAt(0).toUpperCase())}</span>`;
    }).join("") + (ms.length > MAX ? `<span class="more">+${ms.length - MAX}</span>` : "");
    return `<div class="loot-men">
      <div class="loot-avatars">${avs}</div>
      <span class="loot-names">${esc(joinNames(ms.map((m) => D.men[m])))}</span>
    </div>`;
  }

  function renderBoard() {
    const list = $("#board-list");
    const entries = Object.entries(state.results)
      .filter(([, r]) => r.p != null)
      .sort((a, b) => (a[1].t || 0) - (b[1].t || 0));

    // Thanh "mức thiệt hại"
    const max = D.punishments.reduce((sum, p) => sum + POINTS[p.rarity], 0);
    const dmg = entries.reduce((sum, [, r]) => sum + POINTS[D.punishments[r.p].rarity], 0);
    const pct = max ? Math.min(100, Math.round((dmg / max) * 100)) : 0;
    $("#dmg-pct").textContent = pct + "%";
    $("#dmg-fill").style.width = pct + "%";
    $("#dmg-label").textContent = damageLabel(pct);
    $("#damage").classList.toggle("panic", pct >= 75);

    const saved = state.rescue && state.rescue.saved;
    const rescueHTML = state.rescue ? `<li class="loot rescue${saved ? " saved" : ""}">
        <div class="loot-top">
          <span class="loot-no">${t("board.rescue")}</span>
          <span class="rarity-tag" style="--rc:${saved ? "#4fae7c" : "var(--danger)"}">${t(saved ? "board.saved" : "board.failed")}</span>
        </div>
        <p class="loot-task">${saved ? t("board.savedTask") : t("board.pushups", { n: state.rescue.pushups })}</p>
        ${menRowHTML(state.rescue.ms)}
      </li>` : "";

    if (!entries.length) {
      list.innerHTML = rescueHTML + `<li class="board-empty">
        <span class="smug">😏</span>
        <p>${t("board.empty")}</p>
        <small>${t("board.emptySub")}</small>
      </li>`;
      return;
    }
    list.innerHTML = entries
      .map(([w, r], k) => {
        const p = L(D.punishments[r.p]);
        const rar = RARITY[p.rarity];
        const fresh = String(w) === String(freshW) ? " fresh" : "";
        return `<li class="loot ${p.rarity}${fresh}" style="--rc:${rar.color}">
          <div class="loot-top">
            <span class="loot-no">#${k + 1}</span>
            <span class="rarity-tag" style="--rc:${rar.color}">${rar.label}</span>
          </div>
          <p class="loot-task">${esc(p.text)}</p>
          ${menRowHTML(menOf(r))}
          <div class="loot-for">${t("board.for")} <b>${esc(D.women[w])}</b></div>
        </li>`;
      })
      .reverse() // mới nhất lên đầu
      .join("");
    list.insertAdjacentHTML("afterbegin", rescueHTML);
    freshW = null;
  }

  function renderAll() {
    renderStats(); renderWomen(); renderBoard(); renderRescueCta();
    $("#btn-photo").hidden = !allWomenPlayed();
  }

  /* ---------------- Modal ---------------- */
  const modal = $("#modal");
  let current = null;  // { w, q, correct }
  let spinning = false;

  function showPanel(id) {
    ["#panel-question", "#panel-gacha", "#panel-result", "#panel-preview", "#panel-confirm", "#panel-rescue", "#panel-photo"]
      .forEach((p) => { $(p).hidden = p !== id; });
    // Gacha, kết quả, kho thử thách: mở rộng 80% màn hình cho máy chiếu
    $(".modal-box").classList.toggle("wide", ["#panel-gacha", "#panel-result", "#panel-preview", "#panel-rescue", "#panel-photo"].includes(id));
    $(".modal-box").scrollTop = 0;
  }
  function openModal() { modal.classList.add("open"); modal.setAttribute("aria-hidden", "false"); }
  function closeModal() {
    if (spinning) return;
    stopRescueTimer();
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    current = null;
  }

  function openWoman(w) {
    const r = state.results[w];
    if (r && r.p != null) { showResult(w, r, false); openModal(); return; }
    if (r) return; // đã trả lời sai và kết thúc lượt

    current = { w, q: pickQuestion(w), correct: null };
    const q = L(D.questions[current.q]);
    $("#q-woman").textContent = D.women[w];
    $("#q-number").textContent = t("q.number", { n: current.q + 1 });
    $("#q-text").innerHTML = richText(q.q);
    const codeBox = $("#q-code");
    codeBox.hidden = !q.code;
    codeBox.querySelector("code").innerHTML = q.code ? highlight(q.code) : "";
    $("#answer").classList.remove("show");
    $("#act-judge").hidden = true;
    $("#act-go").hidden = true;
    $("#wrong-box").hidden = true;

    const box = $("#q-options");
    box.innerHTML = "";
    const allCorrect = Array.isArray(q.correct); // correct: [..] → mọi đáp án đều đúng, giữ nguyên thứ tự
    const twoOptions = allCorrect || (q.correct != null && q.wrong != null);
    $("#act-reveal").hidden = twoOptions; // câu cũ chỉ có `a` → giữ cách "Xem đáp án"
    if (twoOptions) {
      // 2 đáp án, thứ tự A/B xáo ngẫu nhiên
      const opts = allCorrect
        ? q.correct.map((text) => ({ text, ok: true }))
        : shuffle([{ text: q.correct, ok: true }, { text: q.wrong, ok: false }]);
      opts.forEach((o, i) => {
        const b = document.createElement("button");
        b.className = "q-opt";
        b.dataset.ok = o.ok ? "1" : "";
        b.innerHTML = `<span class="letter">${"ABCD"[i]}</span><span>${richText(o.text)}</span>`;
        b.addEventListener("click", () => chooseAnswer(b));
        box.appendChild(b);
      });
      $("#a-label").textContent = t("q.explain");
      $("#a-text").innerHTML = richText(q.note || "");
    } else {
      $("#a-label").textContent = t("q.answer");
      $("#a-text").innerHTML = richText(q.a || "");
    }
    showPanel("#panel-question");
    openModal();
  }

  /** Bạn nữ chọn 1 trong 2 đáp án → hồi hộp → lộ kết quả. */
  async function chooseAnswer(btn) {
    if (spinning) return;
    spinning = true;
    modal.classList.add("locked");
    const opts = [...document.querySelectorAll(".q-opt")];
    opts.forEach((b) => { b.disabled = true; });
    btn.classList.add("picked");
    for (let i = 0; i < 4; i++) { tick(); await sleep(90); } // hồi hộp ngắn ~0.36s
    btn.classList.remove("picked");

    const ok = btn.dataset.ok === "1";
    const allOk = opts.every((b) => b.dataset.ok === "1"); // câu "đáp án nào cũng đúng": chỉ sáng ô được chọn
    opts.forEach((b) => {
      if (allOk) b.classList.add(b === btn ? "is-correct" : "dim");
      else if (b.dataset.ok === "1") b.classList.add("is-correct");
      else if (b === btn) b.classList.add("is-wrong");
      else b.classList.add("dim");
    });
    if ($("#a-text").textContent) $("#answer").classList.add("show");

    current.correct = ok;
    if (ok) {
      ding();
      celebrate(false);
      $("#act-go").hidden = false;
    } else {
      tone(180, 0.25, "sawtooth", 0.08);
      setTimeout(() => tone(130, 0.4, "sawtooth", 0.08), 180);
      $("#wrong-box").hidden = false;
    }
    spinning = false;
    modal.classList.remove("locked");
  }

  function reveal() {
    $("#answer").classList.add("show");
    $("#act-reveal").hidden = true;
    $("#act-judge").hidden = false;
    ding();
  }

  function answeredWrong() {
    current.correct = false;
    $("#act-judge").hidden = true;
    $("#wrong-box").hidden = false;
  }

  function endTurn() {
    markUsed("q", current.q);
    state.results[current.w] = { q: current.q, correct: false, t: Date.now() };
    save();
    renderAll();
    closeModal();
  }

  /* ---------------- Gacha ---------------- */
  function setupGacha() {
    current.p = pickPunishment(current.w);
    current.ms = pickMen(victimsOf(current.p));
    $("#g-woman").textContent = D.women[current.w];
    $("#btn-spin").disabled = false;
    $("#btn-spin").hidden = false;
    showPanel("#panel-gacha"); // phải hiện panel trước để đo được kích thước cuộn
    resetMachine("p");
    resetMachine("m");
    $("#victims").innerHTML = "";
    $("#m-count").textContent = "";
  }

  function itemHTML(kind, i) {
    if (kind === "p") {
      const p = L(D.punishments[i]);
      return `<div class="reel-item" style="--rc:${RARITY[p.rarity].color}"><span class="dot"></span>${esc(p.text)}</div>`;
    }
    return `<div class="reel-item big"><span class="face">🙋‍♂️</span>${esc(D.men[i])}</div>`;
  }

  /** Độ dời X để phần tử thứ `idx` của cuộn nằm đúng giữa khung. */
  function centerX(strip, idx) {
    const W = strip.firstElementChild.offsetWidth;
    const view = strip.parentElement.clientWidth;
    return -(idx * W + W / 2 - view / 2);
  }

  /**
   * Dãy item cho cuộn quay, không để 1 tên lặp lại trong khoảng `gap` ô liền nhau
   * (≈ số ô nhìn thấy trong khung). `fixed` = { vị trí: item } bắt buộc (VD ô trúng).
   */
  function reelSeq(pool, len, fixed) {
    const gap = Math.min(pool.length - 1, 8);
    const fixedAt = Object.entries(fixed).map(([p, x]) => [Number(p), x]);
    if (pool.length <= 9 && fixedAt.length <= 1) {
      // Ít item (VD 7 thử thách): xoay vòng 1 hoán vị ngẫu nhiên, canh để ô bắt buộc rơi đúng chỗ
      const perm = shuffle(pool);
      const [fp, fx] = fixedAt[0] || [0, perm[0]];
      const shift = perm.indexOf(fx) - fp;
      return Array.from({ length: len }, (_, p) => perm[(((p + shift) % perm.length) + perm.length) % perm.length]);
    }
    const seq = [];
    let bag = [];
    for (let p = 0; p < len; p++) {
      if (fixed[p] != null) { seq.push(fixed[p]); continue; }
      const ok = (x) => !seq.slice(-gap).includes(x) &&
        !fixedAt.some(([fp, fx]) => fx === x && Math.abs(fp - p) <= gap);
      if (!bag.some(ok)) bag = shuffle(pool);
      const k = bag.findIndex(ok);
      if (k >= 0) { seq.push(bag.splice(k, 1)[0]); continue; }
      const alt = pool.filter(ok);
      seq.push(alt.length ? alt[rand(alt.length)] : pool[rand(pool.length)]);
    }
    return seq;
  }

  function resetMachine(kind) {
    const strip = $("#reel-" + kind);
    const machine = $("#machine-" + kind);
    machine.classList.add("idle");
    machine.classList.remove("landed");
    machine.style.removeProperty("--glow");
    $("#foot-" + kind).textContent = t("g.waiting");
    // Hiển thị vài item ngẫu nhiên trong lúc chờ, item giữa nằm trong khung
    const pool = POOLS[kind].map((_, i) => i);
    strip.innerHTML = reelSeq(pool, 9, {}).map((i) => itemHTML(kind, i)).join("");
    strip.style.transform = `translateX(${centerX(strip, 4)}px)`;
  }

  /*
   * Đường cong quãng đường theo thời gian (0..1 → 0..1):
   *   - ACCEL đầu: tăng tốc từ chậm → nhanh (vận tốc tăng dạng t²)
   *   - giữa: chạy hết tốc lực
   *   - DECEL cuối: chậm dần rồi dừng hẳn (vận tốc giảm dạng t²)
   */
  const ACCEL = 0.25, DECEL = 0.45;
  const TOTAL = ACCEL / 3 + (1 - ACCEL - DECEL) + DECEL / 3;
  function spinCurve(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    if (t < ACCEL) return (t * t * t) / (3 * ACCEL * ACCEL) / TOTAL;
    if (t < 1 - DECEL) return (ACCEL / 3 + (t - ACCEL)) / TOTAL;
    const s = 1 - t;
    return (TOTAL - (s * s * s) / (3 * DECEL * DECEL)) / TOTAL;
  }

  // Khi tab bị ẩn requestAnimationFrame dừng → dùng setTimeout để vòng quay không bị treo
  const nextFrame = (cb) => (document.hidden ? setTimeout(() => cb(performance.now()), 16) : requestAnimationFrame(cb));

  /** Quay cuộn ngang `kind` trong `duration` ms và dừng ở phần tử `target`. */
  function spinReel(kind, target, duration, startItem = null) {
    const strip = $("#reel-" + kind);
    const pool = POOLS[kind].map((_, i) => i);
    const FILL = 70;
    const fixed = { [FILL]: target };
    if (startItem != null) fixed[2] = startItem; // bắt đầu từ người vừa trúng → chuyển cảnh liền mạch
    const seq = reelSeq(pool, FILL + 5, fixed);

    strip.innerHTML = seq.map((i) => itemHTML(kind, i)).join("");
    const W = strip.firstElementChild.offsetWidth;
    const startX = centerX(strip, 2);
    const endX = centerX(strip, FILL);
    strip.style.transform = `translateX(${startX}px)`;

    return new Promise((resolve) => {
      let t0 = null;
      let lastCell = 0;
      const step = (now) => {
        if (t0 === null) t0 = now;
        const t = Math.min((now - t0) / duration, 1);
        const x = startX + (endX - startX) * spinCurve(t);
        strip.style.transform = `translateX(${x}px)`;
        const cell = Math.floor((startX - x) / W);
        if (cell !== lastCell) { lastCell = cell; tick(); }
        if (t < 1) nextFrame(step);
        else resolve();
      };
      nextFrame(step);
    });
  }

  async function runGacha() {
    if (spinning) return;
    spinning = true;
    modal.classList.add("locked");
    $("#btn-spin").disabled = true;

    // Vòng 1: thử thách
    const mp = $("#machine-p");
    mp.classList.remove("idle");
    $("#foot-p").textContent = t("g.spinning");
    await spinReel("p", current.p, SPIN_MS);
    const pun = D.punishments[current.p];
    const rar = RARITY[pun.rarity];
    mp.style.setProperty("--glow", rar.color);
    mp.classList.add("landed");
    const ms = current.ms;
    const n = ms.length;
    $("#foot-p").innerHTML = `<span class="rarity-tag" style="--rc:${rar.color}">${rar.label}</span>` +
      `<span class="victim-count">${t("g.victims", { n })}</span>`;
    ding();
    celebrate(false);
    if (n > 1) {
      // Hiệu ứng ×N ngay khi ra thử thách
      await sleep(450);
      await multiplierBurst(n, rar.color);
      await sleep(300);
    } else {
      await sleep(1100);
    }

    // Vòng 2: người được chọn (có thể nhiều người tuỳ độ hiếm)
    const mm = $("#machine-m");
    mm.classList.remove("idle");
    $("#m-count").textContent = `0/${n}`;

    for (let i = 0; i < n; i++) {
      if (i > 0) {
        mm.classList.remove("landed");
        $("#foot-m").textContent = t("g.next", { i: i + 1, n });
        tone(300, 0.25, "triangle", 0.06);
        setTimeout(() => tone(600, 0.2, "triangle", 0.06), 120);
      } else {
        $("#foot-m").textContent = t("g.first");
      }
      await spinReel("m", ms[i], i === 0 ? SPIN_MS : BONUS_SPIN_MS, i > 0 ? ms[i - 1] : null);
      mm.style.setProperty("--glow", "var(--gold)");
      mm.classList.add("landed");
      $("#foot-m").textContent = t(i === n - 1 ? "g.enough" : "g.you");
      addVictimChip(ms[i], i);
      $("#m-count").textContent = `${i + 1}/${n}`;
      ding();
      await sleep(i === n - 1 ? 1300 : 900);
    }

    // Lưu kết quả
    markUsed("q", current.q);
    markUsed("p", current.p);
    ms.forEach((m) => markUsed("m", m));
    const result = { q: current.q, correct: current.correct, p: current.p, ms, t: Date.now() };
    state.results[current.w] = result;
    save();
    freshW = current.w;
    renderAll();

    spinning = false;
    modal.classList.remove("locked");
    showResult(current.w, result, true);
  }

  function addVictimChip(m, i) {
    const chip = document.createElement("span");
    chip.className = "victim-chip";
    const face = ["😭", "😱", "🫠", "😵", "🥲", "😩"][rand(6)];
    chip.innerHTML = `<small>${i + 1}</small><span class="sob">${face}</span>${esc(D.men[m])}`;
    $("#victims").appendChild(chip);
  }

  const BONUS_TITLES = { 2: "DOUBLE KILL!", 3: "TRIPLE KILL!!", 4: "QUADRA KILL!!!", 5: "PENTA KILL!!!!" };
  const STAR_COLORS = ["#f4c14f", "#ffffff", "#f58fac"];

  /** Âm "boing" trượt tần số kiểu hoạt hình. */
  function slide(from, to, dur, type = "sine", vol = 0.1) {
    if (!state.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator();
      const g = audio.createGain();
      const t = audio.currentTime;
      o.type = type;
      o.frequency.setValueAtTime(from, t);
      o.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(audio.destination);
      o.start();
      o.stop(t + dur);
    } catch (e) { /* ignore */ }
  }

  /** Hiệu ứng ×N toàn màn hình: bông hoa nở, nhụy hiện ×N, cánh hoa bung ra. */
  async function multiplierBurst(n, color) {
    const el = $("#bonus");
    const box = $(".modal-box");
    el.style.setProperty("--bc", color);
    $("#bonus-title").textContent = `×${n}`;
    $("#bonus-sub").textContent = t("bonus.sub", { title: BONUS_TITLES[n] || "MULTI KILL!!!", n });

    // Cánh hoa bay toả tròn từ tâm + vài ngôi sao lấp lánh
    const petals = Array.from({ length: 26 + n * 4 }, (_, i) => {
      const ang = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 30; // vmax
      return `<i class="fx-petal${i % 3 ? "" : " alt"}" style="--w:${14 + rand(16)}px;` +
        `--x:${(Math.cos(ang) * dist).toFixed(1)}vmax;--y:${(Math.sin(ang) * dist).toFixed(1)}vmax;` +
        `--rot:${rand(720) - 360}deg;--d:${(0.3 + Math.random() * 0.35).toFixed(2)}s"></i>`;
    });
    const stars = Array.from({ length: 10 }, (_, i) => {
      const x = rand(2) ? 6 + rand(26) : 68 + rand(26);
      return `<i class="fx-star" style="--x:${x}%;--y:${8 + rand(84)}%;--s:${18 + rand(22)}px;` +
        `--c:${STAR_COLORS[i % STAR_COLORS.length]};--d:${(0.4 + Math.random() * 0.9).toFixed(2)}s">✦</i>`;
    });
    $("#bonus-fx").innerHTML = petals.join("") + stars.join("");
    setMeme($("#bonus-meme"), "bonus");
    el.classList.remove("show");
    box.classList.remove("shake");
    void el.offsetWidth; // chạy lại animation
    el.classList.add("show");

    // Âm thanh: chuông leng keng đi lên khi hoa nở → "pop" khi hiện ×N
    [523, 659, 784, 988, 1175, 1319, 1568, 2093].forEach((f, i) => setTimeout(() => tone(f, 0.25, "sine", 0.05), i * 45));
    setTimeout(() => {
      box.classList.add("shake");
      slide(220, 660, 0.18, "triangle", 0.1);
    }, 420);

    if (typeof window.confetti === "function") {
      const colors = [getComputedStyle(document.documentElement).getPropertyValue(color.slice(4, -1)).trim() || "#e8457a", "#ffd3df", "#f4c14f", "#ffffff"];
      setTimeout(() => window.confetti({
        particleCount: 50 + n * 15, spread: 120, startVelocity: 40, origin: { y: 0.5 },
        colors, shapes: ["circle"], scalar: 1.1, zIndex: 60,
      }), 420);
    }
    await sleep(2800);
    el.classList.remove("show");
    box.classList.remove("shake");
  }

  /* ---------------- Meme & các kiểu khóc ---------------- */
  const MEMES = D.memes || {};
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const memeList = (kind) => (MEMES[kind] || []).filter(Boolean);
  const pickMeme = (kind) => { const l = memeList(kind); return l.length ? l[rand(l.length)] : null; };

  /** Gắn meme ngẫu nhiên vào thẻ <img>, ẩn nếu không có hoặc lỗi tải. */
  function setMeme(img, kind) {
    const src = pickMeme(kind);
    img.hidden = !src;
    if (!src) { img.removeAttribute("src"); return; }
    img.onerror = () => { img.hidden = true; };
    img.src = src;
  }

  const d = () => (Math.random() * 0.9).toFixed(2) + "s";
  const CRY_STYLES = {
    sob: {
      caption: "khóc ròng",
      html: () => `<div class="cry-face">
        <i class="cry-eye l"></i><i class="cry-eye r"></i>
        <i class="cry-stream l"></i><i class="cry-stream r"></i>
        <i class="tear l" style="--d:${d()}"></i><i class="tear l" style="--d:${d()}"></i><i class="tear l" style="--d:${d()}"></i>
        <i class="tear r" style="--d:${d()}"></i><i class="tear r" style="--d:${d()}"></i><i class="tear r" style="--d:${d()}"></i>
        <i class="cry-mouth"></i>
      </div>`
    },
    fountain: {
      caption: "khóc như đài phun nước",
      html: () => `<div class="cry-face fountain">
        <i class="cry-eye l"></i><i class="cry-eye r"></i>
        ${Array.from({ length: 5 }, (_, i) => `<i class="tear l" style="--d:${(i * 0.18).toFixed(2)}s"></i><i class="tear r" style="--d:${(i * 0.18 + 0.09).toFixed(2)}s"></i>`).join("")}
        <i class="cry-mouth"></i>
      </div>`
    },
    cloud: {
      caption: "mưa trong lòng",
      html: () => `<div class="cs cs-cloud">
        <span class="cloud">🌧️</span>
        ${[38, 58, 78, 98].map((x) => `<i class="drop" style="left:${x}px;--d:${d()}"></i>`).join("")}
        <span class="cs-main">😞</span>
      </div>`
    },
    soul: {
      caption: "hồn lìa khỏi xác",
      html: () => `<div class="cs cs-soul"><span class="ghost">👻</span><span class="cs-main">😵</span></div>`
    },
    melt: {
      caption: "tan chảy",
      html: () => `<div class="cs cs-melt"><i class="puddle"></i><span class="cs-main">🫠</span></div>`
    },
    noo: {
      caption: "NOOOO!",
      html: () => `<div class="cs cs-noo"><span class="noo">NOOOO!</span><span class="cs-main">🧎‍♂️</span></div>`
    },
    broke: {
      caption: "ví bay màu",
      html: () => `<div class="cs cs-broke">
        ${["💸", "💵", "💸", "🪙"].map((b) => `<span class="bill" style="--d:${d()};--x:${rand(120) - 60}px;--r:${rand(90) - 45}deg">${b}</span>`).join("")}
        <span class="cs-main">😩</span>
      </div>`
    }
  };

  /** Một icon khóc duy nhất ở giữa (có meme thì dùng 1 meme). */
  function renderCriers() {
    const box = $("#r-criers");
    const sob = `<div class="crier">${CRY_STYLES.sob.html()}</div>`;
    const meme = pickMeme("cry");
    box.classList.remove("many");
    box.innerHTML = meme
      ? `<div class="crier meme"><figure class="meme-card" style="--tilt:-3deg"><img src="${esc(meme)}" alt=""></figure></div>`
      : sob;
    const img = box.querySelector("img");
    if (img) img.addEventListener("error", () => { box.innerHTML = sob; });
  }

  function showResult(w, r, fresh) {
    const pun = L(D.punishments[r.p]);
    const rar = RARITY[pun.rarity];
    const names = menOf(r).map((m) => D.men[m]);
    const LD = L(D);
    const tpl = names.length > 1 && LD.resultTemplateMany ? LD.resultTemplateMany : LD.resultTemplate;
    const menHTML = names.length < 2
      ? `<span class="hl-man">${esc(names[0] || "")}</span>`
      : names.slice(0, -1).map((x) => `<span class="hl-man">${esc(x)}</span>`).join(", ") +
        `${t("and")}<span class="hl-man">${esc(names[names.length - 1])}</span>`;
    const sentence = esc(tpl)
      .replace("{man}", menHTML)
      .replace("{punishment}", `<span class="hl-task">${esc(pun.text)}</span>`)
      .replace("{woman}", `<span class="hl-woman">${esc(D.women[w])}</span>`);
    const tag = $("#r-rarity");
    tag.textContent = rar.label;
    tag.style.setProperty("--rc", rar.color);
    $("#r-sentence").innerHTML = sentence + " 💝";
    $("#r-note").textContent = r.correct === false
      ? t("r.mercy")
      : t("r.congrats");
    renderCriers();
    showPanel("#panel-result");
    if (fresh) { fanfare(); celebrate(true); setTimeout(() => cryRain(names.length), 600); }
  }

  /** Mưa nhẹ rơi chéo khắp màn hình (~3s), kèm gợn nước dưới đáy. */
  function cryRain(victims = 1) {
    const box = document.createElement("div");
    box.className = "cry-rain";
    const n = Math.round((window.innerWidth < 640 ? 50 : 110) * (1 + (victims - 1) * 0.15));
    let html = "";
    for (let i = 0; i < n; i++) {
      html += `<i class="drop" style="--x:${(Math.random() * 120).toFixed(1)}vw;--h:${40 + rand(60)}px;` +
        `--o:${(0.35 + Math.random() * 0.6).toFixed(2)};--t:${(0.55 + Math.random() * 0.35).toFixed(2)}s;` +
        `--d:${(-Math.random() * 0.8).toFixed(2)}s"></i>`;
    }
    for (let i = 0; i < 14; i++) {
      html += `<i class="ripple" style="--x:${rand(100)}vw;--y:${2 + rand(14)}vh;--d:${(Math.random() * 1).toFixed(2)}s"></i>`;
    }
    box.innerHTML = html;
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3100);
  }

  /* ---------------- Kho thử thách (preview) ---------------- */
  const RARITY_ORDER = ["legendary", "epic", "rare", "common"]; // độ hiếm giảm dần
  const STARS = { common: 1, rare: 2, epic: 3, legendary: 4 };

  function openPreview() {
    current = null;
    const owners = {};
    // Một thử thách Thường có thể có nhiều chủ
    Object.entries(state.results)
      .filter(([, r]) => r.p != null)
      .sort((a, b) => (a[1].t || 0) - (b[1].t || 0))
      .forEach(([w, r]) => { (owners[r.p] = owners[r.p] || []).push({ w, ms: menOf(r) }); });
    const items = D.punishments.map((p, i) => ({ ...L(p), i }));

    let k = 0; // thứ tự hiện để so le animation
    $("#pv-grid").innerHTML = RARITY_ORDER.map((rk) => {
      const group = items.filter((p) => p.rarity === rk);
      if (!group.length) return "";
      const rar = RARITY[rk];
      const head = `<div class="pv-group-head" style="--d:${(k * 0.06).toFixed(2)}s">
          <span class="rarity-tag" style="--rc:${rar.color}">${rar.label}</span>
          <span class="pv-stars" style="--rc:${rar.color}">${"★".repeat(STARS[rk])}</span>
          <span class="pv-count">${t("pv.count", { n: group.length })}</span>
        </div>`;
      k++;
      const rows = group.map((p) => {
        const own = owners[p.i] || [];
        const repeat = rk === "common"; // Thường: vẫn còn trong kho dù đã có chủ
        const done = own.length && !repeat;
        const ownersHTML = own.map((o) =>
          `<p class="pv-owner"><b>${esc(joinNames(o.ms.map((m) => D.men[m])))}</b> → ${esc(D.women[o.w])}</p>`).join("");
        const badge = !own.length ? "" : repeat
          ? `<span class="pv-stamp again">${t("pv.times", { n: own.length })}</span>`
          : `<span class="pv-stamp">${t("pv.taken")}</span>`;
        return `<div class="pv-card ${rk}${done ? " used" : ""}" style="--rc:${rar.color};--d:${(k++ * 0.06).toFixed(2)}s">
          <div class="pv-main">
            <p class="pv-text">${esc(p.text)}</p>
            ${ownersHTML}
          </div>
          <div class="pv-side">
            <span class="pv-victims">${t("pv.victims", { n: victimsOf(p.i) })}</span>
            ${badge}
          </div>
        </div>`;
      }).join("");
      return `<section class="pv-group">${head}${rows}</section>`;
    }).join("");

    const used = Object.keys(owners).length;
    $("#pv-sub").textContent =
      t("pv.sub", { total: D.punishments.length, used, left: D.punishments.length - used });
    showPanel("#panel-preview");
    openModal();
  }

  /* ---------------- VÒNG GIẢI CỨU ---------------- */
  const R = D.rescue || { pushups: 20, seconds: 15, questions: [] };
  let rescueRun = null;   // { ms, qi }
  let quizLive = false; // đang chờ trả lời câu hỏi giải cứu

  const survivors = () => D.men.map((_, i) => i).filter((i) => !state.used.m.includes(i));
  const allWomenPlayed = () => Object.keys(state.results).length >= D.women.length;

  function renderRescueCta() {
    const cta = $("#rescue-cta");
    cta.hidden = !allWomenPlayed() || !R.questions.length;
    if (cta.hidden) return;
    const btn = $("#btn-rescue");
    cta.classList.toggle("done", !!state.rescue);
    if (state.rescue) {
      const saved = state.rescue.saved;
      $("#rescue-cta-title").textContent = t(saved ? "rs.ctaSaved" : "rs.ctaDone");
      $("#rescue-cta-sub").textContent = saved
        ? t("rs.ctaSavedSub", { n: state.rescue.ms.length })
        : t("rs.ctaDoneSub", { n: state.rescue.ms.length, p: state.rescue.pushups });
      btn.textContent = t("rs.review");
      btn.hidden = false;
      return;
    }
    const n = survivors().length;
    $("#rescue-cta-title").textContent = n ? t("rs.ctaLeft", { n }) : t("rs.ctaNone");
    $("#rescue-cta-sub").textContent = t(n ? "rs.ctaLeftSub" : "rs.ctaNoneSub");
    btn.textContent = t("rs.cta");
    btn.hidden = !n;
  }

  function rescueStep(id) {
    ["#rs-intro", "#rs-quiz", "#rs-fail", "#rs-saved"].forEach((x) => { $(x).hidden = x !== id; });
  }

  /**
   * test = true: mở thẳng vòng giải cứu để thử (nút ẩn: double-click bông hoa 🌸 trên header).
   * Không cần chơi đủ 9 bạn nữ và KHÔNG lưu gì vào lịch sử.
   */
  function openRescue(test = false) {
    if (state.rescue && !test) {
      rescueRun = { ms: state.rescue.ms, qi: state.rescue.qi };
      showPanel("#panel-rescue");
      if (state.rescue.saved) showSaved(false);
      else showPushups();
      openModal();
      return;
    }
    let ms = survivors();
    if (test && !ms.length) ms = D.men.map((_, i) => i);
    rescueRun = { ms, qi: rand(R.questions.length), test };
    $("#rs-test").hidden = !test;
    $("#rs-team").innerHTML = rescueRun.ms
      .map((m, i) => `<span class="victim-chip" style="--d:${i * 0.06}s"><span class="sob">😰</span>${esc(D.men[m])}</span>`)
      .join("");
    rescueStep("#rs-intro");
    showPanel("#panel-rescue");
    openModal();
    [330, 0, 330, 0].forEach((f, i) => f && setTimeout(() => tone(f, 0.35, "square", 0.05), i * 400));
  }

  function stopRescueTimer() {
    quizLive = false;
  }

  function startQuiz() {
    const q = L(R.questions[rescueRun.qi]);
    const open = !q.options || !q.options.length; // câu đố tự luận, không có đáp án chọn sẵn
    $("#rs-question").textContent = q.q;
    $("#rs-question").classList.toggle("open", open);
    $("#rs-note").textContent = "";
    $("#rs-after").hidden = true;
    $("#rs-judge").hidden = true;
    $("#rs-think").hidden = !open;
    $("#rs-reveal").hidden = true;
    $("#rs-stamp").classList.remove("show");
    const box = $("#rs-options");
    box.innerHTML = "";
    (q.options || []).forEach((text, i) => {
      const b = document.createElement("button");
      b.className = "rs-opt";
      b.innerHTML = `<span class="letter">${"ABCD"[i]}</span><span>${esc(text)}</span>`;
      b.addEventListener("click", () => chooseRescue(i));
      box.appendChild(b);
    });
    rescueStep("#rs-quiz");

    quizLive = true; // không đếm giờ, MC tự bấm "Xem đáp án"
  }

  /** Câu đố tự luận: bấm "Xem đáp án" → lật đáp án + giải thích, chờ MC chấm. */
  function revealPuzzle(timeout = false) {
    if (!quizLive) return;
    stopRescueTimer();
    const q = L(R.questions[rescueRun.qi]);
    $("#rs-think").hidden = true;
    $("#rs-answer").textContent = q.answer || "";
    $("#rs-explain").textContent = q.note || "";
    $("#rs-reveal").hidden = false;
    $("#rs-note").textContent = (timeout ? t("rs.timeout") + " " : "") + t("rs.judge");
    $("#rs-judge").hidden = false;
    ding();
  }

  /** MC chấm câu đố: đúng → giải cứu, sai → hít đất. */
  function judgePuzzle(ok) {
    if (rescueRun.test) { // chế độ test: chỉ diễn hiệu ứng, không đụng lịch sử
      if (ok) showSaved(true);
      else { tone(180, 0.25, "sawtooth", 0.08); showPushups(); }
      return;
    }
    state.rescue = { ms: rescueRun.ms, qi: rescueRun.qi, pushups: R.pushups || 20, t: Date.now() };
    if (ok) {
      state.rescue.saved = true;
      rescueRun.ms.forEach((m) => markUsed("m", m));
      save();
      renderAll();
      showSaved(true);
      return;
    }
    tone(180, 0.25, "sawtooth", 0.08);
    setTimeout(() => tone(130, 0.4, "sawtooth", 0.08), 180);
    save();
    renderAll();
    showPushups();
  }

  /** Màn giải cứu thành công: huy hiệu ✓ nở ra, tia nắng, các anh nhảy lên lần lượt. */
  function showSaved(fresh) {
    const step = $("#rs-saved");
    $("#rs-saved-team").innerHTML = rescueRun.ms
      .map((m, i) => {
        const [c] = AVATAR_COLORS[m % AVATAR_COLORS.length];
        return `<span class="victim-chip saved-chip" style="--d:${(0.9 + i * 0.05).toFixed(2)}s;--av:${c}">` +
          `<small>${esc(D.men[m].charAt(0).toUpperCase())}</small>${esc(D.men[m])}</span>`;
      })
      .join("");
    step.classList.remove("play");
    rescueStep("#rs-saved");
    void step.offsetWidth; // chạy lại animation
    step.classList.add("play");
    if (!fresh) return;
    // Nốt nhạc đi lên khi dấu ✓ được vẽ, rồi fanfare
    [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.18, "sine", 0.08), 250 + i * 110));
    setTimeout(fanfare, 650);
    if (typeof window.confetti === "function") {
      const colors = ["#4fae7c", "#a8e0bf", "#f4c14f", "#ffffff", "#f58fac"];
      setTimeout(() => {
        window.confetti({ particleCount: 90, angle: 60, spread: 65, startVelocity: 55, origin: { x: 0, y: 0.75 }, colors, zIndex: 60 });
        window.confetti({ particleCount: 90, angle: 120, spread: 65, startVelocity: 55, origin: { x: 1, y: 0.75 }, colors, zIndex: 60 });
      }, 550);
      setTimeout(() => window.confetti({ particleCount: 70, spread: 100, startVelocity: 35, origin: { y: 0.35 }, colors, shapes: ["star"], zIndex: 60 }), 1000);
    }
  }

  async function chooseRescue(idx) {
    if (spinning || !quizLive) return;
    stopRescueTimer();
    spinning = true;
    modal.classList.add("locked");
    const q = L(R.questions[rescueRun.qi]);
    const opts = [...document.querySelectorAll(".rs-opt")];
    opts.forEach((b) => { b.disabled = true; });

    if (idx != null) {
      opts[idx].classList.add("picked");
      $("#rs-note").textContent = t("rs.checking");
      for (let i = 0; i < 14; i++) { tick(); await sleep(140); }
      opts[idx].classList.remove("picked");
    } else {
      $("#rs-note").textContent = t("rs.timeout");
      await sleep(600);
    }

    // Tất cả đều sai
    for (const b of opts) {
      b.classList.add("wrong");
      tone(180, 0.18, "sawtooth", 0.08);
      await sleep(260);
    }
    $("#rs-stamp").classList.remove("show");
    void $("#rs-stamp").offsetWidth;
    $("#rs-stamp").classList.add("show");
    tone(110, 0.7, "sawtooth", 0.16);
    await sleep(1500);

    // Lật đáp án E
    const e = document.createElement("button");
    e.className = "rs-opt correct";
    e.disabled = true;
    e.innerHTML = `<span class="letter">E</span><span>${esc(q.answer)}</span>`;
    $("#rs-options").appendChild(e);
    ding();
    $("#rs-note").textContent = q.note || "";
    await sleep(900);
    $("#rs-after").hidden = false;

    if (!rescueRun.test) {
      state.rescue = { ms: rescueRun.ms, qi: rescueRun.qi, pushups: R.pushups || 20, t: Date.now() };
      save();
      renderAll();
    }
    spinning = false;
    modal.classList.remove("locked");
  }

  function pusherHTML(name, i) {
    return `<div class="pusher" style="--d:-${(i * 0.17).toFixed(2)}s">
      <svg viewBox="0 0 220 120" aria-hidden="true">
        <line class="pu-ground" x1="10" y1="110" x2="210" y2="110"/>
        <line class="pu-arm" x1="80" y1="108" x2="80" y2="74"/>
        <g class="pu-body">
          <line x1="190" y1="106" x2="72" y2="96"/>
          <circle class="pu-head" cx="56" cy="90" r="14"/>
          <circle class="pu-sweat" cx="48" cy="72" r="4"/>
        </g>
      </svg>
      <p>${esc(name)}</p>
    </div>`;
  }

  function showPushups() {
    const MAX = 10;
    const ms = rescueRun.ms;
    let html = ms.slice(0, MAX).map((m, i) => pusherHTML(D.men[m], i)).join("");
    if (ms.length > MAX) html += `<div class="pusher more"><p>${t("rs.more", { n: ms.length - MAX })}</p></div>`;
    $("#pushup-stage").innerHTML = html;
    $("#rs-fail-lead").innerHTML = t("rs.failLead", { n: (state.rescue && state.rescue.pushups) || R.pushups || 20 });
    setMeme($("#rs-meme"), "rescue");
    rescueStep("#rs-fail");
    // Thua là cả đội tính đã bị gọi → "Nam chưa bị gọi" về 0
    if (rescueRun.test) return;
    rescueRun.ms.forEach((m) => markUsed("m", m));
    save();
    renderAll();
  }

  /* ---------------- Ảnh Bảng vàng (landscape 1920×1080) ---------------- */
  const cssColor = (v) => {
    const m = /var\((--[\w-]+)\)/.exec(v);
    return m ? getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() : v;
  };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /** Cắt chữ thành nhiều dòng vừa `maxW`, tối đa `maxLines` (dòng cuối thêm …). */
  function wrapLines(ctx, text, maxW, maxLines) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width <= maxW || !line) line = test;
      else { lines.push(line); line = w; }
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      lines.length = maxLines;
      let last = lines[maxLines - 1];
      while (last && ctx.measureText(last + "…").width > maxW) last = last.slice(0, -1);
      lines[maxLines - 1] = last + "…";
    }
    return lines;
  }

  async function drawBoardImage() {
    const W = 1920, H = 1080, PAD = 72;
    const FONT = '"Be Vietnam Pro", system-ui, sans-serif';
    const SCRIPT = '"Dancing Script", cursive';
    try {
      await Promise.all([
        document.fonts.load(`800 40px ${FONT}`), document.fonts.load(`600 40px ${FONT}`),
        document.fonts.load(`italic 400 40px ${FONT}`), document.fonts.load(`700 40px ${SCRIPT}`)
      ]);
    } catch (e) { /* dùng font dự phòng */ }

    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");

    // Nền
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#fff0f3"); bg.addColorStop(0.5, "#fffaf9"); bg.addColorStop(1, "#fff4ec");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 46; i++) { // cánh hoa
      ctx.save();
      ctx.translate(Math.random() * W, Math.random() * H);
      ctx.rotate(Math.random() * Math.PI);
      ctx.fillStyle = `rgba(255, ${120 + rand(80)}, ${160 + rand(40)}, ${0.18 + Math.random() * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 8 + rand(10), 5 + rand(5), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Tiêu đề
    ctx.textBaseline = "alphabetic";
    ctx.font = `92px ${FONT}`;
    ctx.fillText("🏆", PAD, 150);
    ctx.fillStyle = "#3d2b35";
    ctx.font = `800 76px ${FONT}`;
    ctx.fillText($(".board-head h2").textContent.trim() || t("board.title"), PAD + 120, 132);
    ctx.fillStyle = "#8f7a85";
    ctx.font = `600 28px ${FONT}`;
    const today = new Date().toLocaleDateString(t("ph.locale"));
    ctx.fillText(t("ph.subtitle", { company: D.companyName || "", date: today }), PAD + 124, 176);

    // Thanh thiệt hại (góc phải)
    const entries = Object.entries(state.results)
      .filter(([, r]) => r.p != null)
      .sort((a, b) => (a[1].t || 0) - (b[1].t || 0));
    const max = D.punishments.reduce((sum, p) => sum + POINTS[p.rarity], 0);
    const dmg = entries.reduce((sum, [, r]) => sum + POINTS[D.punishments[r.p].rarity], 0);
    const pct = max ? Math.min(100, Math.round((dmg / max) * 100)) : 0;
    const label = damageLabel(pct);
    const bx = W - PAD - 560, by = 64, bw = 560;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, bx, by, bw, 128, 22); ctx.fill();
    ctx.strokeStyle = "#f2e4ea"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#3d2b35";
    ctx.font = `700 24px ${FONT}`;
    ctx.fillText(t("board.damage"), bx + 24, by + 40);
    ctx.textAlign = "right";
    ctx.fillStyle = "#c23e66";
    ctx.font = `800 30px ${FONT}`;
    ctx.fillText(pct + "%", bx + bw - 24, by + 42);
    ctx.textAlign = "left";
    ctx.fillStyle = "#f3e6d0";
    roundRect(ctx, bx + 24, by + 58, bw - 48, 18, 9); ctx.fill();
    const barG = ctx.createLinearGradient(bx + 24, 0, bx + bw - 24, 0);
    barG.addColorStop(0, "#8cc7a6"); barG.addColorStop(0.5, "#f0c35e"); barG.addColorStop(0.8, "#ec7d97"); barG.addColorStop(1, "#d9485f");
    ctx.fillStyle = barG;
    if (pct > 0) { roundRect(ctx, bx + 24, by + 58, Math.max(18, (bw - 48) * pct / 100), 18, 9); ctx.fill(); }
    ctx.fillStyle = "#8f7a85";
    ctx.font = `600 22px ${FONT}`;
    ctx.fillText(label, bx + 24, by + 108);

    // Số liệu
    const victims = entries.reduce((n, [, r]) => n + menOf(r).length, 0);
    const chips = [t("ph.chipWomen", { n: entries.length }), t("ph.chipMen", { n: victims })];
    if (state.rescue) chips.push(state.rescue.saved
      ? t("ph.chipSaved", { n: state.rescue.ms.length })
      : t("ph.chipRescue", { n: state.rescue.ms.length, p: state.rescue.pushups }));
    let cx = PAD;
    ctx.font = `700 24px ${FONT}`;
    chips.forEach((t) => {
      const w = ctx.measureText(t).width + 40;
      ctx.fillStyle = "#ffffff";
      roundRect(ctx, cx, 220, w, 46, 23); ctx.fill();
      ctx.strokeStyle = "#f2e4ea"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#3d2b35";
      ctx.fillText(t, cx + 20, 252);
      cx += w + 14;
    });

    // Thẻ kết quả
    const cards = entries.map(([w, r], k) => ({ w, r, k }));
    if (state.rescue) cards.push({ rescue: true });
    const n = Math.max(cards.length, 1);
    const cols = n <= 4 ? n : n <= 6 ? 3 : n <= 8 ? 4 : 5;
    const rows = Math.ceil(n / cols);
    const GAP = 24, top = 296, areaH = H - top - 86;
    const cw = (W - PAD * 2 - GAP * (cols - 1)) / cols;
    const ch = Math.min(400, (areaH - GAP * (rows - 1)) / rows);

    cards.forEach((c, i) => {
      const x = PAD + (i % cols) * (cw + GAP);
      const y = top + Math.floor(i / cols) * (ch + GAP);
      const color = c.rescue ? (state.rescue.saved ? "#4fae7c" : "#d9485f") : cssColor(RARITY[D.punishments[c.r.p].rarity].color);

      // Khung thẻ + vạch màu bên trái
      ctx.save();
      ctx.shadowColor = "rgba(74, 22, 49, .14)"; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
      ctx.fillStyle = c.rescue ? (state.rescue.saved ? "#f3fbf6" : "#fff5f5") : "#ffffff";
      roundRect(ctx, x, y, cw, ch, 20); ctx.fill();
      ctx.restore();
      ctx.save();
      roundRect(ctx, x, y, cw, ch, 20); ctx.clip();
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 8, ch);
      ctx.restore();
      ctx.strokeStyle = "#f2e4ea"; ctx.lineWidth = 1.5;
      roundRect(ctx, x, y, cw, ch, 20); ctx.stroke();

      const ix = x + 30, iw = cw - 54;
      let ty = y + 44;

      // Hàng trên: số thứ tự + nhãn độ hiếm
      ctx.fillStyle = "#8f7a85";
      ctx.font = `800 20px ${FONT}`;
      ctx.fillText(c.rescue ? t("board.rescue") : `#${c.k + 1}`, ix, ty);
      if (!c.rescue) {
        const tag = RARITY[D.punishments[c.r.p].rarity].label.toUpperCase();
        ctx.font = `800 15px ${FONT}`;
        const tw = ctx.measureText(tag).width + 22;
        ctx.fillStyle = color;
        roundRect(ctx, x + cw - 24 - tw, ty - 21, tw, 28, 14); ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText(tag, x + cw - 24 - tw + 11, ty - 2);
      }
      ty += 46;

      // Thử thách
      ctx.fillStyle = "#3d2b35";
      ctx.font = `800 26px ${FONT}`;
      const taskText = c.rescue
        ? (state.rescue.saved ? t("board.savedTask") : t("board.pushups", { n: state.rescue.pushups }))
        : L(D.punishments[c.r.p]).text;
      wrapLines(ctx, taskText, iw, 3).forEach((l) => { ctx.fillText(l, ix, ty); ty += 34; });
      ty += 12;

      // Avatar + tên các anh
      const men = c.rescue ? state.rescue.ms : menOf(c.r);
      const shown = men.slice(0, 4);
      shown.forEach((m, j) => {
        const ax = ix + 16 + j * 24;
        ctx.beginPath(); ctx.arc(ax, ty - 8, 17, 0, Math.PI * 2);
        ctx.fillStyle = "#fff"; ctx.fill();
        ctx.beginPath(); ctx.arc(ax, ty - 8, 15, 0, Math.PI * 2);
        ctx.fillStyle = AVATAR_COLORS[m % AVATAR_COLORS.length][0]; ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = `800 14px ${FONT}`;
        ctx.textAlign = "center";
        ctx.fillText(D.men[m].charAt(0).toUpperCase(), ax, ty - 3);
        ctx.textAlign = "left";
      });
      if (men.length > 4) {
        ctx.fillStyle = "#8f7a85";
        ctx.font = `800 16px ${FONT}`;
        ctx.fillText(`+${men.length - 4}`, ix + 16 + 4 * 24 - 4, ty - 2);
      }
      ty += 30;
      ctx.fillStyle = "#3d6fc4";
      ctx.font = `700 21px ${FONT}`;
      wrapLines(ctx, joinNames(men.map((m) => D.men[m])), iw, 3).forEach((l) => { ctx.fillText(l, ix, ty); ty += 28; });

      // Chân thẻ: dành cho …
      if (!c.rescue) {
        const fy = y + ch - 26;
        ctx.strokeStyle = "#f2e4ea"; ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.moveTo(ix, fy - 34); ctx.lineTo(x + cw - 24, fy - 34); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#8f7a85";
        ctx.font = `600 19px ${FONT}`;
        const forLabel = t("board.for");
        ctx.fillText(forLabel, ix, fy);
        const forW = ctx.measureText(forLabel + " ").width;
        ctx.fillStyle = "#c23e66";
        ctx.font = `800 23px ${FONT}`;
        ctx.fillText(wrapLines(ctx, D.women[c.w], iw - forW, 1)[0], ix + forW, fy);
      }
    });

    if (!entries.length && !state.rescue) {
      ctx.fillStyle = "#8f7a85";
      ctx.font = `700 40px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText(t("ph.empty"), W / 2, top + 200);
      ctx.textAlign = "left";
    }

    // Chân trang
    ctx.fillStyle = "#c23e66";
    ctx.font = `700 34px ${SCRIPT}`;
    ctx.fillText(t("ph.footer"), PAD, H - 34);
    ctx.textAlign = "right";
    ctx.fillStyle = "#8f7a85";
    ctx.font = `600 22px ${FONT}`;
    ctx.fillText("🌸 mgm HCM 20/10", W - PAD, H - 38);
    ctx.textAlign = "left";

    return cv;
  }

  let photoBlob = null;

  async function openPhoto() {
    current = null;
    const sh = $("#shutter");
    sh.classList.remove("flash");
    void sh.offsetWidth;
    sh.classList.add("flash");
    tone(1800, 0.05, "square", 0.08);
    setTimeout(() => tone(900, 0.08, "square", 0.06), 70);

    $("#ph-status").textContent = t("ph.making");
    $("#ph-img").removeAttribute("src");
    showPanel("#panel-photo");
    openModal();

    const cv = await drawBoardImage();
    const url = cv.toDataURL("image/png");
    $("#ph-img").src = url;
    $("#ph-download").href = url;
    $("#ph-download").download = `${t("ph.file")}-${new Date().toISOString().slice(0, 10)}.png`;
    photoBlob = await new Promise((r) => cv.toBlob(r, "image/png"));
    $("#ph-status").textContent = t("ph.ready");
  }

  async function copyPhoto() {
    const status = $("#ph-status");
    try {
      if (!photoBlob || !navigator.clipboard || !window.ClipboardItem) throw new Error("unsupported");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": photoBlob })]);
      status.textContent = t("ph.copied");
      ding();
    } catch (e) {
      status.textContent = t("ph.copyFail");
    }
  }

  /* ---------------- Trang chủ / xoá lịch sử ---------------- */
  function openConfirm({ icon, title, text, buttons }) {
    current = null;
    $("#c-icon").textContent = icon;
    $("#c-title").textContent = title;
    $("#c-text").textContent = text;
    const box = $("#c-actions");
    box.innerHTML = "";
    buttons.forEach(({ label, cls, onClick }) => {
      const b = document.createElement("button");
      b.className = "btn " + cls;
      b.textContent = label;
      b.addEventListener("click", onClick);
      box.appendChild(b);
    });
    showPanel("#panel-confirm");
    openModal();
  }

  function clearHistory() {
    const sound = state.sound;
    state = freshState();
    state.sound = sound;
    state.lang = lang;
    save();
    renderAll();
  }

  function goHome() {
    $("#game").classList.remove("active");
    $("#intro").classList.add("active"); // hiện lại => hoạt hoạ intro chạy lại từ đầu
    window.scrollTo(0, 0);
  }

  /* ---------------- Events ---------------- */
  function bind() {
    $("#btn-start").addEventListener("click", () => {
      tone(660, 0.15, "sine", 0.08);
      $("#intro").classList.remove("active");
      $("#game").classList.add("active");
      window.scrollTo(0, 0);
    });

    $("#btn-reveal").addEventListener("click", reveal);
    $("#btn-right").addEventListener("click", () => {
      current.correct = true;
      celebrate(false);
      setupGacha();
    });
    $("#btn-wrong").addEventListener("click", answeredWrong);
    $("#btn-end").addEventListener("click", endTurn);
    $("#btn-mercy").addEventListener("click", setupGacha);
    $("#btn-go").addEventListener("click", setupGacha);
    $("#btn-spin").addEventListener("click", runGacha);
    $("#btn-preview").addEventListener("click", openPreview);
    $("#btn-rescue").addEventListener("click", () => openRescue());
    $(".brand-flower").addEventListener("dblclick", () => openRescue(true)); // nút ẩn để test
    $("#btn-photo").addEventListener("click", openPhoto);
    $("#ph-copy").addEventListener("click", copyPhoto);
    $("#rs-start").addEventListener("click", startQuiz);
    $("#rs-accept").addEventListener("click", showPushups);
    $("#rs-show").addEventListener("click", () => revealPuzzle(false));
    $("#rs-passed").addEventListener("click", () => judgePuzzle(true));
    $("#rs-failed").addEventListener("click", () => judgePuzzle(false));

    modal.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeModal));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

    document.querySelectorAll("[data-lang]").forEach((b) =>
      b.addEventListener("click", () => setLang(b.dataset.lang)));

    const soundBtn = $("#btn-sound");
    const syncSound = () => { soundBtn.textContent = state.sound ? "🔊" : "🔇"; };
    syncSound();
    soundBtn.addEventListener("click", () => { state.sound = !state.sound; save(); syncSound(); });

    $("#btn-home").addEventListener("click", () => openConfirm({
      icon: "🏠",
      title: t("c.homeTitle"),
      text: t("c.homeText"),
      buttons: [
        { label: t("c.cancel"), cls: "btn-ghost", onClick: closeModal },
        { label: t("c.keep"), cls: "btn-primary", onClick: () => { closeModal(); goHome(); } },
        { label: t("c.clearHome"), cls: "btn-danger", onClick: () => { clearHistory(); closeModal(); goHome(); } }
      ]
    }));

    $("#btn-reset").addEventListener("click", () => openConfirm({
      icon: "🧹",
      title: t("c.resetTitle"),
      text: t("c.resetText"),
      buttons: [
        { label: t("c.cancel"), cls: "btn-ghost", onClick: closeModal },
        { label: t("c.reset"), cls: "btn-danger", onClick: () => { clearHistory(); closeModal(); } }
      ]
    }));
  }

  /* ---------------- Init ---------------- */
  // Cảnh báo khi `for` trong data.js không khớp tên bạn nữ nào (VD sau khi đổi tên)
  [...D.questions, ...D.punishments].forEach((x) => {
    if (x.for && !D.women.includes(x.for)) console.warn(`[data.js] for: "${x.for}" không khớp tên bạn nữ nào trong women`, x);
  });
  save(); // lưu thứ tự người chơi vừa tạo (nếu lịch sử cũ chưa có)
  applyStaticI18n();
  spawnPetals();
  bind();
  renderAll();
})();
