/**
 * Rae 的育兒清單 — 後端（Google Apps Script）
 *
 * 這支程式讓所有親友共用同一份認領紀錄，資料存在你自己的 Google 試算表裡。
 * 部署步驟請看「設定說明.md」。
 *
 * 試算表會自動產生兩個分頁：
 *   _data   ← 程式用的原始資料，請不要手動改
 *   認領紀錄 ← 給你看的：誰認領了什麼、留了什麼話（可直接拿來寫感謝卡）
 */

/* ============================================================
   後台密碼 ← 改成你自己的，然後在 admin.html 的「設定」分頁輸入同一組
   只有知道這組密碼的人可以改清單內容、刪項目。
   親友認領、新增項目不需要密碼。
   ============================================================ */
var ADMIN_KEY = 'rae2026';

var DATA_SHEET = '_data';
var LOG_SHEET = '認領紀錄';

/** 需要密碼的操作 */
var ADMIN_OPS = ['update', 'order', 'meta', 'remove', 'restore', 'purge', 'renameCategory', 'reset', 'import'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json({ error: '同時太多人在操作，請稍後再試' });
  }
  try {
    var op = JSON.parse(e.postData.contents);

    if (ADMIN_OPS.indexOf(op.op) >= 0 && String(op.key || '') !== ADMIN_KEY) {
      return json({ error: '後台密碼不正確，請到後台「設定」分頁重新輸入' });
    }

    var state = readState();

    if (op.op === 'get') {
      // 直接回傳

    } else if (op.op === 'seed') {
      if (!state.items.length) {
        state = op.state || state;
        writeState(state);
      }

    } else if (op.op === 'reset') {
      state = op.state || { meta: {}, items: [] };
      commit(state);

    } else if (op.op === 'import') {
      if (!op.state || !op.state.items) return json({ error: '備份檔沒有清單資料' });
      state = op.state;
      commit(state);

    } else if (op.op === 'claim') {
      var it = findItem(state, op.id);
      if (!it) return json({ error: '找不到這個項目' });
      it.claims = it.claims || [];
      if (it.want > 0 && it.claims.length >= it.want) {
        return json({ error: '這一項剛剛被別人認領了' });
      }
      it.claims.push({
        cid: op.cid,
        name: str(op.name, 20),
        msg: str(op.msg, 60),
        kind: str(op.kind, 10),
        at: new Date().toISOString()
      });
      commit(state);

    } else if (op.op === 'unclaim') {
      var it2 = findItem(state, op.id);
      if (it2 && it2.claims) {
        it2.claims = it2.claims.filter(function (c) { return c.cid !== op.cid; });
      }
      commit(state);

    } else if (op.op === 'add') {
      var item = op.item || {};
      if (!item.id || !item.n) return json({ error: '資料不完整' });
      if (state.items.length > 300) return json({ error: '清單已達上限' });
      if (findItem(state, item.id)) return json({ error: '重複的項目' });
      state.items.push({
        id: str(item.id, 24),
        c: str(item.c || '大家加碼的', 20),
        n: str(item.n, 40),
        note: str(item.note, 60),
        url: url(item.url),
        want: clampWant(item.want),
        by: str(item.by, 20),
        claims: [],
        hidden: false
      });
      commit(state);

    } else if (op.op === 'update') {
      var it3 = findItem(state, op.id);
      if (!it3) return json({ error: '找不到這個項目' });
      var p = op.patch || {};
      if (typeof p.n === 'string') it3.n = str(p.n, 40);
      if (typeof p.c === 'string') it3.c = str(p.c, 20);
      if (typeof p.note === 'string') it3.note = str(p.note, 60);
      if (typeof p.url === 'string') it3.url = url(p.url);
      if (p.want !== null && p.want !== undefined) it3.want = clampWant(p.want);
      commit(state);

    } else if (op.op === 'remove') {
      var it4 = findItem(state, op.id);
      if (it4) it4.hidden = true;
      commit(state);

    } else if (op.op === 'restore') {
      var it5 = findItem(state, op.id);
      if (it5) it5.hidden = false;
      commit(state);

    } else if (op.op === 'purge') {
      state.items = state.items.filter(function (i) { return i.id !== op.id; });
      commit(state);

    } else if (op.op === 'order') {
      var rank = {};
      (op.ids || []).forEach(function (id, i) { rank[id] = i; });
      state.items.sort(function (a, b) {
        var ra = rank[a.id] === undefined ? 9999 : rank[a.id];
        var rb = rank[b.id] === undefined ? 9999 : rank[b.id];
        return ra - rb;
      });
      commit(state);

    } else if (op.op === 'meta') {
      state.meta = state.meta || {};
      var m = op.meta || {};
      for (var k in m) { if (m.hasOwnProperty(k)) state.meta[k] = m[k]; }
      commit(state);

    } else if (op.op === 'renameCategory') {
      state.items.forEach(function (i) { if (i.c === op.from) i.c = op.to; });
      if (state.meta && state.meta.categories) {
        state.meta.categories = state.meta.categories.map(function (c) {
          return c === op.from ? op.to : c;
        });
      }
      commit(state);

    } else {
      return json({ error: '不支援的操作' });
    }

    return json(state);
  } catch (err) {
    return json({ error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

/** 直接用瀏覽器打開網址時，回傳目前狀態，方便確認部署成功 */
function doGet() {
  return json(readState());
}

function str(v, max) {
  return String(v === null || v === undefined ? '' : v).slice(0, max);
}

function url(v) {
  var u = String(v === null || v === undefined ? '' : v).trim();
  return /^https?:\/\//i.test(u) ? u.slice(0, 300) : '';
}

function clampWant(v) {
  var n = Number(v);
  if (isNaN(n) || n < 0) n = 0;
  return Math.min(20, Math.floor(n));
}

function commit(state) {
  state.updated = new Date().toISOString();
  writeState(state);
  writeLog(state);
}

function findItem(state, id) {
  for (var i = 0; i < state.items.length; i++) {
    if (state.items[i].id === id) return state.items[i];
  }
  return null;
}

function sheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function readState() {
  var raw = sheet(DATA_SHEET).getRange('A1').getValue();
  if (!raw) return { meta: {}, items: [], updated: '' };
  try {
    var s = JSON.parse(raw);
    if (!s.items) s.items = [];
    if (!s.meta) s.meta = {};
    return s;
  } catch (err) {
    return { meta: {}, items: [], updated: '' };
  }
}

function writeState(state) {
  sheet(DATA_SHEET).getRange('A1').setValue(JSON.stringify(state));
}

/** 把認領紀錄整理成好讀的表格 */
function writeLog(state) {
  var sh = sheet(LOG_SHEET);
  var rows = [['品項', '分類', '認領者', '狀態', '想說的話', '登記時間']];
  state.items.forEach(function (it) {
    if (it.hidden) return;
    (it.claims || []).forEach(function (c) {
      rows.push([
        it.n, it.c, c.name, c.kind || '', c.msg || '',
        c.at ? Utilities.formatDate(new Date(c.at), 'Asia/Taipei', 'yyyy/MM/dd HH:mm') : ''
      ]);
    });
  });
  sh.clear();
  sh.getRange(1, 1, rows.length, 6).setValues(rows);
  sh.getRange(1, 1, 1, 6).setFontWeight('bold');
  sh.setFrozenRows(1);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
