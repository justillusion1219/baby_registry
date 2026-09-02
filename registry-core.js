/* ==========================================================
   Rae 的育兒清單 — 共用核心
   index.html（前台）和 admin.html（後台）都會載入這一支。
   ========================================================== */

/* ----------------------------------------------------------
   1. 連線設定 ← 只要改這一行
   ----------------------------------------------------------
   留空 = 本機預覽模式（資料只存在自己這台裝置）。
   照「設定說明.md」部署 Google Apps Script 後，把網址貼進來，
   前台和後台就會一起連上，所有親友共用同一份紀錄。
   ---------------------------------------------------------- */
const API_URL = "https://script.google.com/macros/s/AKfycbwImPbEFb1FunzFWSVliqo0BCglYbG_EKlMrWPpVeH7vupls18AGdfuAZ6laxDeUnBi/exec";

/* ----------------------------------------------------------
   2. 第一次打開時的預設內容
   建立之後就改用 admin.html 後台編輯，不必再回來動這裡。
   ---------------------------------------------------------- */
const CATEGORIES = ["餵食", "尿布與清潔", "洗澡與日常照護", "睡眠", "衣物", "外出", "健康照護", "給爸媽的", "大件・可合資", "安全防護", "大家加碼的"];

const DEFAULT_META = {
  title: "Rae 的育兒清單",
  tail: "挑一項你想準備的，寫下名字，就不會跟別人送到重複的了。",
  lede: "謝謝你想著我們。這裡列的東西沒有先後順序、也沒有價位期待，二手傳承我們更開心；真的不用勉強，能來看看寶寶就是最好的禮物。",
  baby: "Rae",
  due: "2026 年 11 月 2 日",
  ship: "請私訊我們地址",
  howtoTitle: "怎麼用這份清單？",
  openCap: 3,          // 數量填 0（不限份數）的項目，幾個人認領後就算完成
  steps: [
    "看看「還可以準備」裡有沒有你想送的東西，每一項都有參考連結可以點進去看。",
    "按「我來準備」，留下名字（想低調寫暱稱也可以），這項就會移到「已經有人準備」，別人就不會再送重複的。",
    "東西不用急著寄，見面時帶來或私訊我們約時間都可以。清單以外想送的，歡迎自己新增。"
  ],
  categories: CATEGORIES.slice()
};

const SEED = [
  { c: "餵食", n: "圍兜 / 口水巾", want: 0 },
  { c: "餵食", n: "兒童餐椅 / 餐搖椅", want: 1 },
  { c: "餵食", n: "Yep2 自動泡奶機", want: 1, note: "半夜泡奶救星" },
  { c: "餵食", n: "奶瓶 + 奶瓶刷", want: 0 },
  { c: "餵食", n: "蒸氣消毒鍋 / 烘乾機", want: 1 },

  { c: "尿布與清潔", n: "紙尿布", want: 0, note: "新生兒 NB 號" },
  { c: "尿布與清潔", n: "純水濕紙巾", want: 0 },
  { c: "尿布與清潔", n: "尿布桶", want: 1 },
  { c: "尿布與清潔", n: "尿布台", want: 1 },
  { c: "尿布與清潔", n: "乳液 / 護臀膏", want: 0 },

  { c: "洗澡與日常照護", n: "嬰兒澡盆", want: 1 },
  { c: "洗澡與日常照護", n: "沐浴用品", want: 0, note: "無香料、低敏配方為佳" },
  { c: "洗澡與日常照護", n: "浴巾 / 包巾", want: 0 },

  { c: "睡眠", n: "防水保潔墊", want: 2 },
  { c: "睡眠", n: "白噪音機", want: 1 },
  { c: "睡眠", n: "防驚跳睡袋 / 包巾", want: 0 },
  { c: "睡眠", n: "嬰兒床床墊", want: 1 },

  { c: "衣物", n: "帽子 / 襪子 / 手套", want: 0, note: "其他二手品也很歡迎" },
  { c: "衣物", n: "寶寶內衣（厚）/ 紗布衣", want: 0 },
  { c: "衣物", n: "紗布巾", want: 0 },

  { c: "外出", n: "揹巾 / 背帶", want: 1 },
  { c: "外出", n: "媽媽包", want: 1 },
  { c: "外出", n: "推車雨罩 / 蚊帳", want: 1 },

  { c: "健康照護", n: "耳溫槍", want: 1 },
  { c: "健康照護", n: "嬰兒指甲剪組", want: 1 },
  { c: "健康照護", n: "吸鼻器", want: 1 },

  { c: "給爸媽的", n: "哺乳枕", want: 1 },
  { c: "給爸媽的", n: "擠乳器", want: 1 },
  { c: "給爸媽的", n: "溢乳墊", want: 0 },

  { c: "大件・可合資", n: "汽車安全座椅（提籃）", want: 1, note: "歡迎幾位朋友一起合資" },
  { c: "大件・可合資", n: "嬰兒推車", want: 1, note: "歡迎幾位朋友一起合資" },

  { c: "安全防護", n: "嬰兒監視器", want: 1 },
  { c: "安全防護", n: "嬰兒地墊 / 圍欄", want: 1 }
];

/* ========================================================== */

const LOCAL_KEY = "rae-registry-state-v1";

/* localStorage 在無痕模式、封鎖 cookie 的瀏覽器會直接丟例外，一律包起來 */
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const searchUrl = n => "https://www.google.com/search?tbm=shop&q=" + encodeURIComponent(n + " 嬰兒");
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
/** 這一項是不是已經滿了。want 就是上限；want 為 0 表示沒設，
    改用後台的「未設上限時的份數」(meta.openCap) 當上限。 */
function capOf(i, state) {
  if (i.want > 0) return i.want;
  const c = state && state.meta ? Number(state.meta.openCap) : 0;
  return c > 0 ? c : 3;
}
function isFull(i, state) {
  return (i.claims || []).length >= capOf(i, state);
}
const safeUrl = u => /^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "";

function seedState() {
  return {
    meta: JSON.parse(JSON.stringify(DEFAULT_META)),
    items: SEED.map((x, i) => ({
      id: "s" + i,
      c: x.c, n: x.n, note: x.note || "", url: x.url || "",
      want: x.want === 0 ? 0 : (x.want || 1),
      by: "", claims: [], hidden: false
    })),
    updated: new Date().toISOString()
  };
}

/** 補齊舊資料缺少的欄位，讓新舊版本都能讀 */
function normalize(s) {
  if (!s || typeof s !== "object") return seedState();
  if (!Array.isArray(s.items)) s.items = [];
  s.meta = Object.assign({}, DEFAULT_META, s.meta || {});
  if (!Array.isArray(s.meta.steps)) s.meta.steps = DEFAULT_META.steps.slice();
  const cap = Number(s.meta.openCap);
  s.meta.openCap = cap > 0 ? Math.min(50, Math.floor(cap)) : DEFAULT_META.openCap;
  if (!Array.isArray(s.meta.categories) || !s.meta.categories.length) {
    const seen = [];
    s.items.forEach(i => { if (i.c && seen.indexOf(i.c) < 0) seen.push(i.c); });
    s.meta.categories = seen.length ? seen : DEFAULT_META.categories.slice();
  }
  return s;
}

/** 分類顯示順序：先照設定的順序，沒列到的排最後 */
function orderedCategories(state) {
  const listed = (state.meta.categories || []).slice();
  state.items.forEach(i => { if (i.c && listed.indexOf(i.c) < 0) listed.push(i.c); });
  return listed;
}

/* ----------------------------------------------------------
   操作邏輯。本機模式在瀏覽器跑這一份，
   連線模式由 apps-script.gs 跑同樣邏輯的伺服器版。
   ---------------------------------------------------------- */
function reduce(s, op) {
  if (op.op === "reset") return seedState();
  if (op.op === "import") return normalize(JSON.parse(JSON.stringify(op.state)));

  const items = s.items;
  const find = id => items.find(i => i.id === id);

  if (op.op === "claim") {
    const it = find(op.id);
    if (!it) throw new Error("找不到這個項目");
    it.claims = it.claims || [];
    if (it.claims.length >= capOf(it, s)) throw new Error("這一項剛剛被別人認領了");
    it.claims.push({ cid: op.cid, name: op.name, msg: op.msg || "", kind: op.kind || "", at: new Date().toISOString() });

  } else if (op.op === "unclaim") {
    const it = find(op.id);
    if (it) it.claims = (it.claims || []).filter(c => c.cid !== op.cid);

  } else if (op.op === "add") {
    if (items.some(i => i.id === op.item.id)) throw new Error("重複的項目");
    items.push(op.item);

  } else if (op.op === "remove") {
    const it = find(op.id);
    if (it) it.hidden = true;

  } else if (op.op === "restore") {
    const it = find(op.id);
    if (it) it.hidden = false;

  } else if (op.op === "purge") {
    const idx = items.findIndex(i => i.id === op.id);
    if (idx >= 0) items.splice(idx, 1);

  } else if (op.op === "update") {
    const it = find(op.id);
    if (!it) throw new Error("找不到這個項目");
    const p = op.patch || {};
    if (typeof p.n === "string") it.n = p.n.slice(0, 40);
    if (typeof p.c === "string") it.c = p.c.slice(0, 20);
    if (typeof p.note === "string") it.note = p.note.slice(0, 60);
    if (typeof p.url === "string") it.url = safeUrl(p.url);
    if (p.want != null) it.want = Math.max(0, Math.min(20, Number(p.want) || 0));

  } else if (op.op === "order") {
    const rank = {};
    (op.ids || []).forEach((id, i) => { rank[id] = i; });
    items.sort((a, b) => {
      const ra = rank[a.id] == null ? 9999 : rank[a.id];
      const rb = rank[b.id] == null ? 9999 : rank[b.id];
      return ra - rb;
    });

  } else if (op.op === "meta") {
    s.meta = Object.assign({}, s.meta, op.meta || {});

  } else if (op.op === "renameCategory") {
    items.forEach(i => { if (i.c === op.from) i.c = op.to; });
    s.meta.categories = (s.meta.categories || []).map(c => (c === op.from ? op.to : c));

  } else {
    throw new Error("不支援的操作：" + op.op);
  }

  s.updated = new Date().toISOString();
  return s;
}

const localStore = {
  read() {
    const raw = lsGet(LOCAL_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  },
  write(s) {
    lsSet(LOCAL_KEY, JSON.stringify(s));
    return s;
  }
};

/** 後台密碼：存在這台裝置，不會出現在前台頁面裡 */
function adminKey() { return lsGet("rae-admin-key") || ""; }
function setAdminKey(k) { lsSet("rae-admin-key", k || ""); }

/* 需要後台密碼的操作。unclaim 不在其中：知道那筆 cid 本身就是憑證，
   認領者才能在自己的裝置上取消自己那一筆。 */
const ADMIN_OPS = ["update", "order", "meta", "remove", "restore", "purge", "renameCategory", "reset", "import"];

async function api(op) {
  if (ADMIN_OPS.indexOf(op.op) >= 0 && !op.key) op = Object.assign({}, op, { key: adminKey() });

  if (!API_URL) {
    let s = normalize(localStore.read());
    if (!s.items.length) s = seedState();
    if (op.op !== "get" && op.op !== "seed") s = reduce(s, op);
    return localStore.write(JSON.parse(JSON.stringify(s)));
  }

  /* 一定要有逾時。沒有的話，只要 Google 那邊沒回應，
     頁面就會無止盡地等下去，使用者只看到轉圈圈。 */
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  let res;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(op),  // 純字串 body：避免觸發 CORS preflight
      signal: ctrl.signal
    });
  } catch (e) {
    throw new Error(e && e.name === "AbortError"
      ? "連線逾時，Google 那邊沒有回應"
      : "連不上伺服器，請檢查網路");
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error("連線失敗（HTTP " + res.status + "）");
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return normalize(data);
}

/* ----------------------------------------------------------
   內容快取：把最近一次讀到的資料留在這台裝置上。
   下次開頁先用它畫出正確畫面，等伺服器回來再默默更新，
   親友就不會看到「先閃一下舊內容」。
   ---------------------------------------------------------- */
const CACHE_KEY = "rae-registry-cache-v1";

function cachedState() {
  if (!API_URL) return null;          // 本機模式本來就直接讀 localStorage
  const raw = lsGet(CACHE_KEY);
  if (!raw) return null;
  try {
    const s = normalize(JSON.parse(raw));
    return s.items.length ? s : null;
  } catch (e) { return null; }
}

function cacheState(s) {
  if (!API_URL || !s) return;
  try { lsSet(CACHE_KEY, JSON.stringify(s)); } catch (e) {}
}

/** 讀取狀態；第一次使用會自動寫入預設內容 */
async function loadState() {
  const s = normalize(await api({ op: "get" }));
  if (!s.items.length) return normalize(await api({ op: "seed", state: seedState() }));
  return s;
}
