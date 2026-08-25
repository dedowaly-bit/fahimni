/* =========================================================
   Fahimni — فهمني | طبقة قاعدة البيانات (localStorage)
   =========================================================
   تصميم قابل للتوسع:
   - تخزين منفصل لكل مجموعة (Collection) بمفتاح خاص ⇒ الكتابة الجزئية
     بدل إعادة كتابة قاعدة كاملة، وتحميل أسرع مع نمو البيانات.
   - كتابة مؤجلة مجمّعة (Debounced flush) لتقليل عمليات الإدخال/الإخراج
     على الجهاز — أساس سلس للانتقال إلى Supabase لاحقًا دون تغيير الواجهة.
   - نظام ترحيل (Migration): أي تحديث جديد للنسخة يقرأ البيانات القديمة
     ويضيف ما هو ناقص فقط — لا يُحذف مستخدم أو كورس أو عملية مطلقًا.
   - DB.page() ترقيم صفحات جاهز للقوائم الضخمة (ملايين السجلات عبر الخادم).
   ========================================================= */
(function () {
  'use strict';

  const SCHEMA = 5;
  const PREFIX = 'fahimni:v' + SCHEMA + ':';
  // مفاتيح النسخ القديمة — تُقرأ مرة واحدة للترحيل ثم تُحافظ بياناتها
  const LEGACY_KEYS = ['ustadhy_db_v4', 'ustadhy_db_v3', 'ustadhy_db_v2', 'ustadhy_db_v1'];
  const COLS = ['users', 'categories', 'courses', 'sections', 'lessons',
    'quizzes', 'homework', 'submissions', 'attempts', 'enrollments',
    'transactions', 'reviews', 'messages', 'announcements', 'notifications',
    'mistakeBank'];
  const SESSION_KEY = 'fahimni_session_v1';

  /* ===== أدوات التجزئة والمعرفات =====
     hash: خوارزمية متوافقة مع النسخ السابقة — دbj2 ببذرة 9 + Math.imul.
     تبدأ النتيجة بـ h وتستكمل بـ base36 لضمان توافق كلمات المرور المحفوظة. */
  function hash(s) {
    let h = 9;
    const str = String(s);
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 387420489);
    }
    return 'h' + (h >>> 0).toString(36);
  }
  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  window.UST = window.UST || {};
  window.UST.hash = hash;
  window.UST.uid = uid;

  const UST = window.UST;
  let cache = {};
  const dirty = new Set();
  let flushTimer = null;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* file:// أو بيئة محظورة */ } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function flushNow() {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    if (!dirty.size) return;
    try {
      dirty.forEach(col => lsSet(PREFIX + col, JSON.stringify(cache[col] || [])));
      lsSet(PREFIX + 'meta', JSON.stringify({ schema: SCHEMA, savedAt: new Date().toISOString() }));
      dirty.clear();
    } catch (e) {
      console.error('[DB] تعذر الحفظ — مساحة التخزين ممتلئة؟', e);
      if (window.UI && window.UI.toast) window.UI.toast('مساحة التخزين المحلية ممتلئة — احذف بيانات قديمة أو صدّر لخادم', 'error');
    }
  }
  function persist(col) {
    if (col) dirty.add(col);
    if (flushTimer) return;
    flushTimer = setTimeout(flushNow, 250); // كتابة مجمّعة واحدة بدل عشرات
  }

  function defaultWorld() {
    const w = window.Seed.build();
    const out = {};
    COLS.forEach(c => { out[c] = Array.isArray(w[c]) ? w[c] : []; });
    out.__settings = w.settings || {};
    return out;
  }

  function mergeMissingCols(world) {
    // يضيف المجموعات الجديدة الناقصة فقط — لا يمسح الموجود أبدًا
    COLS.forEach(c => {
      if (!Array.isArray(world[c])) world[c] = [];
    });
    if (!world.__settings || typeof world.__settings !== 'object') world.__settings = {};
    return world;
  }

  function migrateLegacy() {
    for (const k of LEGACY_KEYS) {
      const raw = lsGet(k);
      if (!raw) continue;
      try {
        const old = JSON.parse(raw);
        const world = {};
        COLS.forEach(c => { world[c] = Array.isArray(old[c]) ? old[c] : []; });
        world.__settings = old.settings || {};
        mergeMissingCols(world);
        // تحديث بيانات المدير القديمة للتوافق مع النسخة الجديدة
        const adminUser = (world.users || []).find(u => u.role === 'admin');
        if (adminUser && typeof window.UST.hash === 'function') {
          adminUser.email = 'fahimni.admin@gmail.com';
          adminUser.password = window.UST.hash('Admin@2024');
        }
        return world;
      } catch (e) { /* مفتاح تالف — تجاوزه */ }
    }
    return null;
  }

  function loadPerCol() {
    const rawMeta = lsGet(PREFIX + 'meta');
    if (!rawMeta) return null;
    const world = {};
    COLS.forEach(c => {
      const r = lsGet(PREFIX + c);
      let arr = [];
      try { arr = r ? JSON.parse(r) : []; } catch (e) { arr = []; }
      world[c] = Array.isArray(arr) ? arr : [];
    });
    let st = {};
    try { st = JSON.parse(lsGet(PREFIX + 'settings') || '{}'); } catch (e) {}
    world.__settings = st && typeof st === 'object' ? st : {};
    return mergeMissingCols(world);
  }

  const DB = {
    init() {
      const loaded = loadPerCol() || migrateLegacy();
      cache = loaded || defaultWorld();
      if (!loaded) this._flushAll();
      else Object.keys(cache).forEach(c => persist(c));
      // ضمان تحديث بيانات المدير مهما كانت الحالة
      this._ensureAdmin();
      return this;
    },

    _ensureAdmin() {
      const admins = (this.all('users') || []).filter(u => u.role === 'admin');
      if (!admins.length) return;
      const a = admins[0];
      const hash = window.UST && window.UST.hash;
      if (typeof hash !== 'function') return;
      const newHash = hash('Admin@2024');
      let changed = false;
      if (a.email !== 'fahimni.admin@gmail.com') { a.email = 'fahimni.admin@gmail.com'; changed = true; }
      if (a.password !== newHash) { a.password = newHash; changed = true; }
      if (changed) { dirty.add('users'); flushNow(); }
    },

    _flushAll() { COLS.forEach(c => dirty.add(c)); dirty.add('__settings'); flushNow(); },

    reset() {
      COLS.forEach(c => lsDel(PREFIX + c));
      lsDel(PREFIX + 'meta'); lsDel(PREFIX + 'settings');
      LEGACY_KEYS.forEach(lsDel);
      cache = defaultWorld();
      this._flushAll();
    },

    /* ===== ترقيم صفحات للقوائم الضخمة (جاهز للانتقال للخادم) ===== */
    page(col, opts) {
      const o = opts || {};
      const size = Math.max(1, o.size || 25);
      const pageNum = Math.max(1, o.page || 1);
      let arr = o.filter ? this.query(col, o.filter) : this.all(col).slice();
      if (o.sort) arr.sort(o.sort);
      const total = arr.length;
      const items = arr.slice((pageNum - 1) * size, pageNum * size);
      return { items, total, page: pageNum, size, pages: Math.max(1, Math.ceil(total / size)) };
    },

    all(col) { return cache[col] || []; },
    get(col, id) { return this.all(col).find(x => x.id === id) || null; },
    insert(col, obj) {
      cache[col].push(obj); persist(col); return obj;
    },
    update(col, id, patch) {
      const item = this.get(col, id);
      if (!item) return null;
      Object.assign(item, patch); persist(col); return item;
    },
    remove(col, id) {
      const arr = cache[col];
      const idx = arr.findIndex(x => x.id === id);
      if (idx === -1) return false;
      arr.splice(idx, 1); persist(col); return true;
    },
    query(col, fn) { return this.all(col).filter(fn); },

    updateWhere(col, fn, patch) {
      let n = 0;
      this.all(col).forEach(x => { if (fn(x)) { Object.assign(x, patch); n++; } });
      if (n) persist(col);
      return n;
    },

    settings() { return cache.__settings || {}; },
    setSettings(patch) {
      cache.__settings = Object.assign({}, cache.__settings, patch);
      persist('__settings');
      return cache.__settings;
    },

    saveSession(userId) { lsSet(SESSION_KEY, JSON.stringify({ userId, t: Date.now() })); },
    readSession() {
      try { const s = JSON.parse(lsGet(SESSION_KEY) || 'null'); return s && s.userId ? s : null; }
      catch (e) { return null; }
    },
    clearSession() { lsDel(SESSION_KEY); }
  };

  window.UST.DB_KEY = PREFIX; // توثيق المفتاح الحالي
  window.UST.DB_SCHEMA = SCHEMA;
  window.DB = DB;
})();
