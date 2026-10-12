(() => {
  "use strict";

  const D = window.GAME_DATA;
  const STORE_KEY = "gacha-2010-state-v1";
  const SPIN_MS = 6000; // thời gian mỗi vòng quay gacha
  const RARITY = {
    common:    { label: "Thường",      color: "var(--r-common)" },
    rare:      { label: "Hiếm",        color: "var(--r-rare)" },
    epic:      { label: "Sử thi",      color: "var(--r-epic)" },
    legendary: { label: "Huyền thoại", color: "var(--r-legendary)" }
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

  /* ---------------- State ---------------- */
  // results[womanIndex] = { q, correct, p?, m? }
  const freshState = () => ({ used: { q: [], p: [], m: [] }, results: {}, sound: true });
  let state = load();

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && s.used && s.results) return s;
    } catch (e) { /* ignore */ }
    return freshState();
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
      <span class="stat">🌷 Đã chơi <b>${played}/${D.women.length}</b></span>
      <span class="stat">❓ Câu hỏi còn <b>${left("q")}</b></span>
      <span class="stat">🎁 Thử thách còn <b>${left("p")}</b></span>
      <span class="stat">🙋‍♂️ Nam chưa bị gọi <b>${left("m")}</b></span>`;
  }

  function renderWomen() {
    const grid = $("#women-grid");
    grid.innerHTML = "";
    D.women.forEach((name, i) => {
      const r = state.results[i];
      const [c1, c2] = AVATAR_COLORS[i % AVATAR_COLORS.length];
      const btn = document.createElement("button");
      btn.className = "woman" + (r ? (r.p != null ? " done" : " missed") : "");
      btn.style.animationDelay = i * 0.05 + "s";
      btn.innerHTML = `
        <span class="woman-avatar" style="--c1:${c1};--c2:${c2}">${esc(name.charAt(0).toUpperCase())}</span>
        <span class="woman-name">${esc(name)}</span>
        <span class="woman-tag">${r ? (r.p != null ? "Đã nhận quà 🎁" : "Lỡ mất rồi 😢") : "Chưa chơi"}</span>`;
      btn.addEventListener("click", () => openWoman(i));
      grid.appendChild(btn);
    });
  }

  const JOKES = [
    "Ví tiền đang run rẩy 💸",
    "Chạy đâu cho thoát 🏃‍♂️",
    "Đã ký giấy nợ, cấm chối ✍️",
    "Cười trước, khóc sau 🥲",
    "Mẹ ơi cứu con 😭",
    "Số nhọ không ai bằng 🍀❌",
    "Anh em ghi nhận sự hy sinh 🫡",
    "Tưởng thoát, ai ngờ… 🙃",
    "Hôm nay anh là người phục vụ 🤵",
    "Định mệnh đã an bài 🔮"
  ];
  const POINTS = { common: 1, rare: 2, epic: 3, legendary: 5 };
  const DAMAGE_LABELS = [
    [0,   "Các anh vẫn còn cười được 😎"],
    [1,   "Bắt đầu thấy lạnh gáy 😅"],
    [25,  "Ví tiền bắt đầu run 😰"],
    [50,  "Các anh đang hoảng loạn 😱"],
    [75,  "Sắp phá sản tập thể 😭"],
    [100, "PHÁ SẢN TOÀN TẬP 💀💸"]
  ];
  let freshW = null; // bạn nữ vừa nhận quà → highlight trên bảng vàng

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
    $("#dmg-label").textContent = DAMAGE_LABELS.filter(([min]) => pct >= min).pop()[1];
    $("#damage").classList.toggle("panic", pct >= 75);

    if (!entries.length) {
      list.innerHTML = `<li class="board-empty">
        <span class="smug">😏</span>
        <p>Các anh đang cười hơi sớm…</p>
        <small>Chưa có “nạn nhân” nào cả</small>
      </li>`;
      return;
    }
    list.innerHTML = entries
      .map(([w, r], k) => {
        const p = D.punishments[r.p];
        const rar = RARITY[p.rarity];
        const fresh = String(w) === String(freshW) ? " fresh" : "";
        return `<li class="loot ${p.rarity}${fresh}" style="--rc:${rar.color}">
          <div class="loot-rank">Nạn nhân<b>#${k + 1}</b></div>
          <div>
            <div class="loot-line">
              <span class="loot-man"><span class="sob">😭</span> ${esc(D.men[r.m])}</span>
              <span class="loot-arrow">phục vụ</span>
              <span class="loot-woman">${esc(D.women[w])} 👑</span>
            </div>
            <p class="loot-task">${esc(p.text)}</p>
            <div class="loot-foot">
              <span class="rarity-tag" style="--rc:${rar.color}">${rar.label}</span>
              <span class="loot-joke">${JOKES[k % JOKES.length]}</span>
            </div>
          </div>
        </li>`;
      })
      .reverse() // mới nhất lên đầu
      .join("");
    freshW = null;
  }

  function renderAll() { renderStats(); renderWomen(); renderBoard(); }

  /* ---------------- Modal ---------------- */
  const modal = $("#modal");
  let current = null;  // { w, q, correct }
  let spinning = false;

  function showPanel(id) {
    ["#panel-question", "#panel-gacha", "#panel-result", "#panel-preview", "#panel-confirm"]
      .forEach((p) => { $(p).hidden = p !== id; });
    // Gacha, kết quả, kho thử thách: mở rộng 80% màn hình cho máy chiếu
    $(".modal-box").classList.toggle("wide", ["#panel-gacha", "#panel-result", "#panel-preview"].includes(id));
    $(".modal-box").scrollTop = 0;
  }
  function openModal() { modal.classList.add("open"); modal.setAttribute("aria-hidden", "false"); }
  function closeModal() {
    if (spinning) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    current = null;
  }

  function openWoman(w) {
    const r = state.results[w];
    if (r && r.p != null) { showResult(w, r, false); openModal(); return; }
    if (r) return; // đã trả lời sai và kết thúc lượt

    current = { w, q: pick("q"), correct: null };
    const q = D.questions[current.q];
    $("#q-woman").textContent = D.women[w];
    $("#q-number").textContent = `Câu hỏi #${current.q + 1}`;
    $("#q-text").textContent = q.q;
    $("#a-text").textContent = q.a;
    $("#answer").classList.remove("show");
    $("#act-reveal").hidden = false;
    $("#act-judge").hidden = true;
    $("#wrong-box").hidden = true;
    showPanel("#panel-question");
    openModal();
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
    current.p = pick("p");
    current.m = pick("m");
    $("#g-woman").textContent = D.women[current.w];
    $("#btn-spin").disabled = false;
    $("#btn-spin").hidden = false;
    showPanel("#panel-gacha"); // phải hiện panel trước để đo được kích thước cuộn
    resetMachine("p");
    resetMachine("m");
  }

  function itemHTML(kind, i) {
    if (kind === "p") {
      const p = D.punishments[i];
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

  function resetMachine(kind) {
    const strip = $("#reel-" + kind);
    const machine = $("#machine-" + kind);
    machine.classList.add("idle");
    machine.classList.remove("landed");
    machine.style.removeProperty("--glow");
    $("#foot-" + kind).textContent = "Đang chờ…";
    // Hiển thị vài item ngẫu nhiên trong lúc chờ, item giữa nằm trong khung
    const pool = POOLS[kind].map((_, i) => i);
    strip.innerHTML = Array.from({ length: 9 }, () => itemHTML(kind, pool[rand(pool.length)])).join("");
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
  function spinReel(kind, target, duration) {
    const strip = $("#reel-" + kind);
    const pool = POOLS[kind].map((_, i) => i);
    const FILL = 70;
    const seq = [];
    for (let i = 0; i < FILL; i++) seq.push(pool[rand(pool.length)]);
    seq.push(target);
    for (let i = 0; i < 4; i++) seq.push(pool[rand(pool.length)]);

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
    $("#foot-p").textContent = "Đang quay…";
    await spinReel("p", current.p, SPIN_MS);
    const pun = D.punishments[current.p];
    const rar = RARITY[pun.rarity];
    mp.style.setProperty("--glow", rar.color);
    mp.classList.add("landed");
    $("#foot-p").innerHTML = `<span class="rarity-tag" style="--rc:${rar.color}">${rar.label}</span>`;
    ding();
    celebrate(false);
    await sleep(1100);

    // Vòng 2: người được chọn
    const mm = $("#machine-m");
    mm.classList.remove("idle");
    $("#foot-m").textContent = "Ai sẽ là người may mắn…?";
    await spinReel("m", current.m, SPIN_MS);
    mm.style.setProperty("--glow", "var(--gold)");
    mm.classList.add("landed");
    $("#foot-m").textContent = "🎯 Chính là bạn!";
    ding();
    await sleep(1200);

    // Lưu kết quả
    markUsed("q", current.q);
    markUsed("p", current.p);
    markUsed("m", current.m);
    const result = { q: current.q, correct: current.correct, p: current.p, m: current.m, t: Date.now() };
    state.results[current.w] = result;
    save();
    freshW = current.w;
    renderAll();

    spinning = false;
    modal.classList.remove("locked");
    showResult(current.w, result, true);
  }

  function showResult(w, r, fresh) {
    const pun = D.punishments[r.p];
    const rar = RARITY[pun.rarity];
    const sentence = esc(D.resultTemplate)
      .replace("{man}", `<span class="hl-man">${esc(D.men[r.m])}</span>`)
      .replace("{punishment}", `<span class="hl-task">${esc(pun.text)}</span>`)
      .replace("{woman}", `<span class="hl-woman">${esc(D.women[w])}</span>`);
    const tag = $("#r-rarity");
    tag.textContent = rar.label;
    tag.style.setProperty("--rc", rar.color);
    $("#r-sentence").innerHTML = sentence + " 💝";
    $("#r-note").textContent = r.correct === false
      ? "(Trả lời chưa đúng nhưng vẫn được châm chước 😉)"
      : "Chúc mừng 20/10! Nhớ thực hiện nhé các anh 😎";
    $("#r-crier").textContent = `Anh ${D.men[r.m]} khóc ròng… 😭`;
    showPanel("#panel-result");
    if (fresh) { fanfare(); celebrate(true); setTimeout(cryRain, 600); }
  }

  /** Mưa mặt khóc rơi khắp màn hình. */
  function cryRain() {
    const box = document.createElement("div");
    box.className = "cry-rain";
    const faces = ["😭", "😭", "😢", "🥲", "💧", "😿"];
    const n = window.innerWidth < 640 ? 22 : 45;
    for (let i = 0; i < n; i++) {
      const e = document.createElement("span");
      e.textContent = faces[rand(faces.length)];
      e.style.left = Math.random() * 100 + "vw";
      e.style.setProperty("--s", 1.6 + Math.random() * 2.2 + "rem");
      e.style.setProperty("--t", 2.4 + Math.random() * 1.8 + "s");
      e.style.setProperty("--d", Math.random() * 2 + "s");
      e.style.setProperty("--r", (Math.random() * 120 - 60) + "deg");
      box.appendChild(e);
    }
    document.body.appendChild(box);
    [0, 180, 360].forEach((ms, i) => setTimeout(() => tone(520 - i * 90, 0.35, "sawtooth", 0.04), ms));
    setTimeout(() => box.remove(), 6500);
  }

  /* ---------------- Kho thử thách (preview) ---------------- */
  const RARITY_ORDER = ["legendary", "epic", "rare", "common"];
  const STARS = { common: 1, rare: 2, epic: 3, legendary: 4 };

  function openPreview() {
    current = null;
    const owners = {};
    Object.entries(state.results).forEach(([w, r]) => { if (r.p != null) owners[r.p] = { w, m: r.m }; });
    const items = D.punishments
      .map((p, i) => ({ ...p, i }))
      .sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));

    $("#pv-grid").innerHTML = items.map((p, k) => {
      const rar = RARITY[p.rarity];
      const own = owners[p.i];
      return `<div class="pv-card ${p.rarity}${own ? " used" : ""}" style="--rc:${rar.color};--d:${k * 0.08}s">
        ${own ? `<span class="pv-stamp">ĐÃ CÓ CHỦ</span>` : ""}
        <div class="pv-top">
          <span class="rarity-tag" style="--rc:${rar.color}">${rar.label}</span>
          <span class="pv-stars">${"★".repeat(STARS[p.rarity])}</span>
        </div>
        <p class="pv-text">${esc(p.text)}</p>
        ${own ? `<p class="pv-owner"><b>${esc(D.men[own.m])}</b> → ${esc(D.women[own.w])}</p>` : ""}
      </div>`;
    }).join("");

    const used = Object.keys(owners).length;
    $("#pv-sub").textContent =
      `${D.punishments.length} thử thách · ${used} đã có chủ · ${D.punishments.length - used} đang chờ người “may mắn” 😏`;
    showPanel("#panel-preview");
    openModal();
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
    $("#btn-spin").addEventListener("click", runGacha);
    $("#btn-preview").addEventListener("click", openPreview);

    modal.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeModal));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

    const soundBtn = $("#btn-sound");
    const syncSound = () => { soundBtn.textContent = state.sound ? "🔊" : "🔇"; };
    syncSound();
    soundBtn.addEventListener("click", () => { state.sound = !state.sound; save(); syncSound(); });

    $("#btn-home").addEventListener("click", () => openConfirm({
      icon: "🏠",
      title: "Về trang chủ?",
      text: "Muốn giữ lại kết quả đã chơi, hay xoá sạch lịch sử để chơi lại từ đầu?",
      buttons: [
        { label: "Huỷ", cls: "btn-ghost", onClick: closeModal },
        { label: "Giữ kết quả 🌷", cls: "btn-primary", onClick: () => { closeModal(); goHome(); } },
        { label: "Xoá lịch sử & về trang chủ 🧹", cls: "btn-danger", onClick: () => { clearHistory(); closeModal(); goHome(); } }
      ]
    }));

    $("#btn-reset").addEventListener("click", () => openConfirm({
      icon: "🧹",
      title: "Xoá toàn bộ lịch sử?",
      text: "Mọi câu hỏi, thử thách và “nạn nhân” sẽ được làm mới. Các anh sẽ… mừng hụt 😏",
      buttons: [
        { label: "Huỷ", cls: "btn-ghost", onClick: closeModal },
        { label: "Xoá sạch 🧹", cls: "btn-danger", onClick: () => { clearHistory(); closeModal(); } }
      ]
    }));
  }

  /* ---------------- Init ---------------- */
  $("#company-name").textContent = D.companyName || "";
  spawnPetals();
  bind();
  renderAll();
})();
