/* =========================================================
   Ustadhy Pro — الهيكل العام + الروتر + الأحداث العامة
   ========================================================= */
(function () {
  'use strict';

  const esc = window.UI ? window.UI.esc : s => s;

  const LOGO =
    '<a class="logo" href="#/">' +
      '<span class="logo-mark"><img src="assets/logo.svg" alt="شعار فهمني" style="width:100%;height:100%;object-fit:contain;padding:3px"/></span>' +
       '<span class="logo-text">فهـ<b>مني</b><small>أكاديمية</small></span>' +
     '</a>';

  // ================= سجل الإجراءات العامة =================
  const Actions = {};
  function action(name, fn) { Actions[name] = fn; }
  window.Actions = Actions; // وصول الصفحات لسجل الإجراءات

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const fn = Actions[el.dataset.action];
    if (fn) { e.preventDefault(); fn(el, e); }
  });

  /* ===== حماية قصوى ضد إرسال النماذج الأصلي (سبب الـrefresh) ===== */
  // أي زر داخل نموذج بدون type صريح يُعتبر زرًا عاديًا وليس إرسالًا
  document.addEventListener('click', e => {
    const btn = e.target.closest('button:not([type])');
    if (btn && btn.closest('[data-form]')) btn.type = 'button';
  }, true);
  // حتى لو فشل أي كود آخر: لا تسمح أبدًا بإرسال أصلي لنموذج data-form
  document.addEventListener('submit', e => {
    if (e.target.closest('[data-form]')) e.preventDefault();
  }, true);

  document.addEventListener('submit', e => {
    const form = e.target.closest('[data-form]');
    if (!form) return;
    e.preventDefault(); // دائمًا — لا refresh مهما حدث
    const fn = Actions[form.dataset.form];
    if (!fn) { console.error('[App] إجراء غير مسجل:', form.dataset.form); return; }
    try { fn(form, e); }
    catch (err) {
      console.error(err);
      window.UI.toast('حدث خطأ غير متوقع، حاول مرة أخرى', 'error');
    }
  });

  // ================= التنقل =================
  function parseHash() {
    let h = location.hash.slice(1) || '/';
    let query = {};
    const qi = h.indexOf('?');
    if (qi > -1) {
      query = Object.fromEntries(new URLSearchParams(h.slice(qi + 1)));
      h = h.slice(0, qi);
    }
    const parts = h.split('/').filter(Boolean);
    return { path: h || '/', parts, query };
  }
  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  // ================= Navbar عام =================
  function navbar() {
    const u = window.Auth.user();
    return (
      '<header class="navbar">' +
        '<div class="container nav-inner">' +
          LOGO +
          '<nav class="nav-links">' +
            '<a href="#/" data-nav="home">الرئيسية</a>' +
            '<a href="#/courses" data-nav="courses">الكورسات</a>' +
            '<a href="#/teachers" data-nav="teachers">المدرسون</a>' +
            '<a href="#/" data-action="scroll-features">لماذا نحن</a>' +
          '</nav>' +
          '<div class="nav-actions">' +
            (u
              ? (u.role === 'student'
                  ? '<a class="wallet-chip" data-action="go-wallet" title="محفظتي">💰 <b>' + esc(window.UI.money(u.walletBalance)) + '</b></a>'
                  : '') +
                '<button class="icon-btn notif-btn" data-action="toggle-notifs" aria-label="الإشعارات">🔔<span class="notif-dot' + (window.Api.unreadCount(u.id) ? '' : ' hide') + '">' + esc(window.UI.num(window.Api.unreadCount(u.id))) + '</span></button>' +
                '<div class="user-menu-wrap">' +
                  '<button class="user-menu-btn" data-action="toggle-usermenu">' + window.UI.avatar(u, 'sm') + '<span class="uname">' + esc(u.name.split(' ')[0]) + '</span> ▾</button>' +
                  '<div class="user-menu" id="userMenu">' +
                    menuLinksFor(u) +
                    '<hr/><button data-action="logout">🚪 تسجيل الخروج</button>' +
                  '</div>' +
                '</div>'
              : '<a class="btn btn-ghost btn-sm" href="#/login">تسجيل الدخول</a>' +
                '<a class="btn btn-primary btn-sm" href="#/register">إنشاء حساب</a>') +
            '<button class="icon-btn burger" data-action="toggle-mobile-nav" aria-label="القائمة">☰</button>' +
          '</div>' +
        '</div>' +
        '<div id="notifPanel"></div>' +
      '</header>'
    );
  }

  function menuLinksFor(u) {
    if (u.role === 'student')
      return '<a href="#/student">📊 لوحة التحكم</a><a href="#/student/my-courses">📚 كورساتي</a><a href="#/student/wallet">💰 المحفظة</a><a href="#/student/profile">👤 الملف الشخصي</a>';
    if (u.role === 'teacher')
      return '<a href="#/teacher">📊 لوحة التحكم</a><a href="#/teacher/courses">🎓 كورساتي</a><a href="#/teacher/profile">👤 الملف الشخصي</a>';
    return '<a href="#/admin">🛡️ لوحة الإدارة</a>';
  }

  function footer() {
    const cats = window.DB.all('categories').slice(0, 6);
    return (
      '<footer class="footer">' +
        '<div class="container footer-grid">' +
          '<div>' + LOGO +
            '<p>منصة عربية متكاملة تربط الطلاب بأفضل المدرسين — كورسات، اختبارات، واجبات ومتابعة ذكية لتقدمك.</p>' +
          '</div>' +
          '<div><h4>روابط سريعة</h4><a href="#/courses">تصفح الكورسات</a><a href="#/teachers">المدرسون المميزون</a><a href="#/register">انضم كمدرس</a></div>' +
          '<div><h4>الأقسام</h4>' + cats.map(c => '<a href="#/courses?cat=' + c.id + '">' + c.icon + ' ' + esc(c.name) + '</a>').join('') + '</div>' +
          '<div><h4>تواصل معنا</h4><a href="#">📧 support@ustadhypro.test</a><a href="#">☎️ 01000000000</a><div class="socials"><span>📘</span><span>▶️</span><span>📷</span></div></div>' +
        '</div>' +
        '<div class="footer-bottom container">© ' + new Date().getFullYear() + ' أستاذي برو — Ustadhy Pro. جميع الحقوق محفوظة.</div>' +
      '</footer>'
    );
  }

  // ================= لوحة التحكم (Sidebar) =================
  const SIDEBARS = {
    student: [
      ['overview', '📊', 'نظرة عامة'], ['my-courses', '📚', 'كورساتي'],
      ['quizzes', '📝', 'الاختبارات'], ['homework', '🗂️', 'الواجبات'],
      ['wallet', '💰', 'المحفظة'], ['announcements', '📢', 'الإعلانات'],
      ['messages', '💬', 'رسائل الإدارة'], ['notifications', '🔔', 'الإشعارات'],
      ['profile', '👤', 'الملف الشخصي']
    ],
    teacher: [
      ['overview', '📊', 'نظرة عامة'], ['courses', '🎓', 'إدارة الكورسات'],
      ['students', '👥', 'الطلاب المشتركون'], ['quizzes', '📝', 'الاختبارات'],
      ['grading', '✍️', 'تصحيح الواجبات'], ['reviews', '⭐', 'التقييمات'],
      ['announcements', '📢', 'الإعلانات'], ['messages', '💬', 'رسائل الإدارة'],
      ['profile', '👤', 'ملفي الشخصي']
    ],
    admin: [
      ['overview', '📈', 'Dashboard'], ['students', '🧑‍🎓', 'الطلاب'],
      ['teachers', '👨‍🏫', 'المدرسون'], ['applications', '📨', 'طلبات الانضمام'],
      ['recharges', '🧾', 'طلبات الشحن'], ['messages', '💬', 'الرسائل'],
      ['courses', '🎓', 'الكورسات'], ['categories', '🏷️', 'الأقسام'],
      ['subscriptions', '🔗', 'الاشتراكات'], ['transactions', '💳', 'المعاملات'],
      ['reviews', '⭐', 'التقييمات'], ['announcements', '📢', 'الإعلانات'],
      ['settings', '⚙️', 'الإعدادات']
    ]
  };

  function dashboardShell(role, tab, contentHtml) {
    const u = window.Auth.user();
    const items = SIDEBARS[role];
    const titles = Object.fromEntries(items);
    return (
      '<div class="dash">' +
        '<aside class="sidebar" id="sidebar">' +
          LOGO +
          '<nav class="side-nav">' +
            items.map(([key, icon, label]) =>
              '<a href="#/' + role + '/' + key + '" class="' + (tab === key ? 'active' : '') + '"><span>' + icon + '</span>' + label +
              (role === 'admin' && key === 'applications' && window.Api.adminStats().pendingTeachers ? '<em class="pill-count">' + window.Api.adminStats().pendingTeachers + '</em>' : '') +
              '</a>').join('') +
          '</nav>' +
          '<button class="btn btn-outline btn-sm side-back" data-action="go-home">🏠 العودة للمنصة</button>' +
        '</aside>' +
        '<div class="dash-main">' +
          '<header class="topbar">' +
            '<button class="icon-btn burger" data-action="toggle-sidebar">☰</button>' +
            '<h2 class="topbar-title">' + esc(titles[tab] || '') + '</h2>' +
            '<div class="topbar-actions">' +
              (role === 'student' ? '<a class="wallet-chip" href="#/student/wallet">💰 <b>' + esc(window.UI.money(u.walletBalance)) + '</b></a>' : '') +
              '<button class="icon-btn notif-btn" data-action="toggle-notifs" aria-label="الإشعارات">🔔<span class="notif-dot' + (window.Api.unreadCount(u.id) ? '' : ' hide') + '">' + esc(window.UI.num(window.Api.unreadCount(u.id))) + '</span></button>' +
              '<div class="user-menu-wrap">' +
                '<button class="user-menu-btn" data-action="toggle-usermenu">' + window.UI.avatar(u, 'sm') + '<span class="uname">' + esc(u.name) + '</span> ▾</button>' +
                '<div class="user-menu" id="userMenu">' + menuLinksFor(u) + '<hr/><button data-action="logout">🚪 تسجيل الخروج</button></div>' +
              '</div>' +
            '</div>' +
          '</header>' +
          '<main class="dash-content" id="view">' + contentHtml + '</main>' +
        '</div>' +
      '</div>'
    );
  }

  // ================= جدول المسارات =================
  const routes = [
    [/^$/, () => ({ layout: 'public', view: () => window.Pages.home() })],
    [/^courses$/, q => ({ layout: 'public', view: () => window.Pages.courses(q) })],
    [/^course\/(.+)$/, m => ({ layout: 'public', view: () => window.Pages.courseDetails(m[1]) })],
    [/^learn\/([^/]+)(?:\/(.+))?$/, m => ({ layout: 'bare', guard: ['student'], view: () => window.Pages.learn(m[1], m[2] || null) })],
    [/^teachers$/, () => ({ layout: 'public', view: () => window.Pages.teachers() })],
    // مهم: مسارات لوحة المدرس الأكثر تحديدًا أولًا، ثم الملف العام كحالة أخيرة
    [/^teacher\/course-editor\/(.+)$/, m => ({ layout: 'dash', role: 'teacher', tab: 'course-editor', param: m[1], guard: ['teacher'] })],
    [/^teacher\/?([a-z-]*)$/, m => ({ layout: 'dash', role: 'teacher', tab: m[1] || 'overview', guard: ['teacher'] })],
    [/^teacher\/(.+)$/, m => ({ layout: 'public', view: () => window.Pages.teacherProfile(m[1]) })],
    [/^login$/, () => ({ layout: 'auth', view: () => window.PagesAuth.login() })],
    [/^register$/, q => ({ layout: 'auth', view: () => window.PagesAuth.register(q) })],
    [/^application-sent$/, () => ({ layout: 'auth', view: () => window.PagesAuth.applied() })],
    [/^student\/?([a-z-]*)$/, m => ({ layout: 'dash', role: 'student', tab: m[1] || 'overview', guard: ['student'] })],
    [/^admin\/?([a-z]*)$/, m => ({ layout: 'dash', role: 'admin', tab: m[1] || 'overview', guard: ['admin'] })]
  ];

  let lastRenderedHash = '';

  function render() {
    const { parts, query } = parseHash();
    const routeKey = location.hash;
    const app = document.getElementById('app');
    window.scrollTo(0, 0);

    // مطابقة المسار
    let matched = null;
    for (const [re, handler] of routes) {
      const m = parts.join('/').match(re);
      if (m) { matched = handler(m, query); break; }
    }
    if (!matched) {
      app.innerHTML = publicWrap(window.UI.emptyState('🧭', 'الصفحة غير موجودة', 'تحقق من الرابط أو عد للرئيسية', '<a class="btn btn-primary" href="#/">العودة للرئيسية</a>'), 'footer');
      return;
    }

    // الحماية حسب الدور
    if (matched.guard) {
      const u = window.Auth.user();
      if (!u) {
        window.UI.toast('سجّل الدخول للمتابعة', 'info');
        sessionStorage.setItem('ustadhy_return', location.hash);
        location.hash = '#/login';
        return;
      }
      if (!matched.guard.includes(u.role)) {
        app.innerHTML = publicWrap(window.UI.emptyState('⛔', 'غير مصرح لك بالدخول', 'هذه الصفحة مخصصة لدور: ' + matched.guard.join('/'), '<a class="btn btn-primary" href="' + dashHomeFor(u) + '">لوحة تحكمك</a>'), 'footer');
        return;
      }
      if (u.role === 'teacher' && u.status === 'pending' && !String(routeKey).includes('profile')) {
        app.innerHTML = dashWrap('teacher', '', window.Pages.teacherPendingScreen());
        bindShell();
        return;
      }
    }

    // بناء الصفحة
    if (matched.layout === 'dash') {
      let html = '';
      try { html = window.Pages[matched.role](matched.tab, matched.param, query); }
      catch (err) { console.error(err); html = window.UI.emptyState('💥', 'حدث خطأ غير متوقع', String(err.message || err), ''); }
      app.innerHTML = dashWrap(matched.role, matched.tab, html);
    } else {
      let html = '';
      try { html = matched.view(); }
      catch (err) { console.error(err); html = window.UI.emptyState('💥', 'حدث خطأ غير متوقع', String(err.message || err), ''); }
      app.innerHTML = publicWrap(html, matched.layout === 'auth' ? null : 'footer');
    }
    bindShell();
    lastRenderedHash = routeKey;
  }

  function dashHomeFor(u) {
    return u.role === 'student' ? '#/student' : u.role === 'teacher' ? '#/teacher' : '#/admin';
  }

  function publicWrap(inner, withFooter) {
    return navbar() + '<main id="view">' + inner + '</main>' + (withFooter ? footer() : '');
  }
  function dashWrap(role, tab, html) { return dashboardShell(role, tab, html); }

  // ربط أحداث القوالب (إغلاق القوائم عند النقر خارجها) — يُسجَّل مرة واحدة فقط
  let shellBound = false;
  function bindShell() {
    if (shellBound) return;
    shellBound = true;
    document.addEventListener('click', e => {
      const menu = document.getElementById('userMenu');
      if (menu && !e.target.closest('.user-menu-wrap')) menu.classList.remove('open');
      const nav = document.querySelector('.nav-links.open');
      if (nav && !e.target.closest('.burger') && !e.target.closest('.nav-links')) nav.classList.remove('open');
      const sb = document.getElementById('sidebar');
      if (sb && sb.classList.contains('open') && !e.target.closest('#sidebar') && !e.target.closest('[data-action="toggle-sidebar"]')) sb.classList.remove('open');
      const panel = document.querySelector('.notif-panel');
      if (panel && !e.target.closest('.notif-panel') && !e.target.closest('[data-action="toggle-notifs"]')) panel.remove();
    });
  }

  // ================= إجراءات عامة =================
  action('logout', () => { window.Auth.logout(); window.UI.toast('تم تسجيل الخروج، نراك قريبًا 👋', 'info'); });
  action('go-home', () => go('#/'));

  action('scroll-features', () => {
    const doScroll = () => { const t = document.getElementById('why-us'); if (t) t.scrollIntoView({ behavior: 'smooth' }); };
    if (location.hash && location.hash !== '#/') { go('#/'); setTimeout(doScroll, 120); }
    else doScroll();
  });
  action('go-wallet', () => go('#/student/wallet'));

  action('toggle-usermenu', el => {
    const menu = document.getElementById('userMenu');
    if (menu) menu.classList.toggle('open');
  });

  action('toggle-mobile-nav', () => {
    const nav = document.querySelector('.nav-links');
    if (nav) nav.classList.toggle('open');
  });

  action('toggle-sidebar', () => {
    const sb = document.getElementById('sidebar');
    if (sb) sb.classList.toggle('open');
  });

  action('toggle-notifs', el => {
    const u = window.Auth.user();
    if (!u) return;
    let panel = document.getElementById('notifPanel');
    const existing = document.querySelector('.notif-panel');
    if (existing) { existing.remove(); return; }
    if (!panel) { panel = document.createElement('div'); panel.id = 'notifPanel'; el.closest('.navbar,.topbar,.dash-main,.topbar-actions').appendChild(panel); }
    const list = window.Api.notifications(u.id).slice(0, 8);
    panel.innerHTML =
      '<div class="notif-panel">' +
        '<div class="notif-head"><b>الإشعارات</b>' +
          (list.length ? '<button class="linklike" data-action="mark-read">تعليم الكل كمقروء</button>' : '') +
        '</div>' +
        (list.length
          ? list.map(n =>
              '<div class="notif-item ' + (n.read ? '' : 'unread') + '">' +
                '<span class="notif-icon">' + n.icon + '</span>' +
                '<div><b>' + esc(n.title) + '</b><p>' + esc(n.body) + '</p><time>' + window.UI.relTime(n.createdAt) + '</time></div>' +
              '</div>').join('')
          : '<div class="notif-empty">لا توجد إشعارات بعد 🔕</div>') +
        '<a class="notif-all" href="#/' + u.role + '/notifications">عرض كل الإشعارات</a>' +
      '</div>';
    setTimeout(() => document.addEventListener('click', function once(ev) {
      if (!ev.target.closest('.notif-panel') && !ev.target.closest('.notif-btn')) {
        const p = document.querySelector('.notif-panel'); if (p) p.remove();
        document.removeEventListener('click', once);
      }
    }), 50);
  });

  action('mark-read', el => {
    const u = window.Auth.user();
    window.Api.markAllRead(u.id);
    const dot = document.querySelector('.notif-dot');
    if (dot) dot.classList.add('hide');
    el.closest('.notif-panel').querySelectorAll('.notif-item.unread').forEach(i => i.classList.remove('unread'));
    window.UI.toast('تم تعليم جميع الإشعارات كمقروءة', 'success');
  });

  // ================= تشغيل التطبيق =================
  // ================= الشات الداخلي (إدارة ↔ مدرسين) =================
  window.Pages = window.Pages || {};
  window.Pages.chat = function () {
    const me = Auth.user();
    if (!me) return emptyState('⛔', 'غير مصرح');
    const convs = Api.conversations(me.id);
    let withId = null;
    if (me.role === 'teacher') {
      const adm = Api.chatPartners(me.id)[0];
      withId = adm ? adm.id : null;
    } else {
      const saved = sessionStorage.getItem('chat_with_' + me.id);
      withId = (saved && DB.get('users', saved)) ? saved : (convs[0] ? convs[0].user : null);
    }
    if (!withId && me.role === 'teacher')
      return emptyState('💬', 'لا توجد إدارة للمراسلة بعد', 'سيتم فتح قناة التواصل تلقائيًا عند توفر الإدارة.');

    const partnerList = Api.chatPartners(me.id);
    const thread = withId ? Api.thread(me.id, withId) : [];
    Api.markThreadRead(me.id, withId);

    const bubble = m => {
      const mine = m.from === me.id;
      return '<div class="msg-row ' + (mine ? 'me' : 'them') + '">' +
        '<div class="bubble">' + esc(m.body) +
        '<time>' + UI.fdate(m.createdAt, true) + (mine ? (m.read ? ' · ✓✓' : ' · ✓') : '') + '</time></div></div>';
    };

    return (
      '<div class="two-col chat-layout">' +
        '<aside class="panel card chat-side">' +
          '<h2 class="panel-title">💬 المحادثات</h2>' +
          '<div class="conv-list">' +
            (convs.length
              ? convs.map(c =>
                  '<button class="conv-item' + (c.user === withId ? ' active' : '') + '" data-action="chat-open" data-user="' + c.user + '">' +
                    avatar(c.userInfo, 'sm') +
                    '<span class="ci-txt"><b>' + esc(c.userInfo ? c.userInfo.name : 'مستخدم') + '</b>' +
                    '<small>' + esc(c.last.body.slice(0, 34)) + '</small></span>' +
                    (c.unread ? '<em class="pill-count">' + c.unread + '</em>' : '') +
                  '</button>').join('')
              : '<p class="hint">لا محادثات سابقة بعد.</p>') +
          '</div>' +
          (me.role === 'admin'
            ? (() => {
                const teachers = partnerList.filter(p => p.role === 'teacher');
                const students = partnerList.filter(p => p.role === 'student');
                let html = '';
                if (teachers.length) {
                  html += '<label class="field"><span>👨‍🏫 مدرس</span><select id="chat-new-teacher">' +
                    '<option value="">— اختر مدرسًا —</option>' +
                    teachers.map(t2 => '<option value="' + t2.id + '"' + (t2.id === withId ? ' selected' : '') + '>' + esc(t2.name) + (t2.subject ? ' — ' + esc(t2.subject) : '') + '</option>').join('') +
                  '</select></label>';
                }
                if (students.length) {
                  html += '<label class="field"><span>🧑‍🎓 طالب</span><select id="chat-new-student">' +
                    '<option value="">— اختر طالبًا —</option>' +
                    students.map(s2 => '<option value="' + s2.id + '"' + (s2.id === withId ? ' selected' : '') + '>' + esc(s2.name) + '</option>').join('') +
                  '</select></label>';
                }
                html += '<button class="btn btn-outline btn-sm btn-block" data-action="chat-start">فتح المحادثة</button>';
                return html;
              })()
            : '') +
        '</aside>' +
        '<section class="panel card chat-main">' +
          (withId
            ? (() => { const p = DB.get('users', withId);
                const roleLabel = p.role === 'teacher' ? '👨‍🏫 المدرس' : p.role === 'student' ? '🧑‍🎓 الطالب' : '👤';
                return '<h2 class="panel-title">' + avatar(p, 'xs') + ' محادثة مع ' + roleLabel + ': ' + esc(p.name) + '</h2>'; })() +
              '<div class="chat-scroll" id="chatScroll">' +
                (thread.length ? thread.map(bubble).join('') :
                  '<p class="hint center">ابدأ المحادثة بإرسال أول رسالة 👇</p>') +
              '</div>' +
              '<form data-form="chat-send" data-to="' + withId + '" class="chat-form">' +
                '<input name="body" placeholder="اكتب رسالتك…" autocomplete="off" required maxlength="2000"/>' +
                '<button class="btn btn-primary" type="submit">إرسال ➤</button>' +
              '</form>'
            : '<p class="hint center">اختر محادثة من القائمة لبدء التواصل.</p>') +
        '</section>' +
      '</div>'
    );
  };

  action('chat-open', el => {
    sessionStorage.setItem('chat_with_' + Auth.user().id, el.dataset.user);
    App.render();
  });
  action('chat-start', () => {
    const selT = document.getElementById('chat-new-teacher');
    const selS = document.getElementById('chat-new-student');
    const val = (selT && selT.value) || (selS && selS.value);
    if (val) {
      sessionStorage.setItem('chat_with_' + Auth.user().id, val);
      App.render();
    }
  });
  action('chat-send', form => {
    try {
      Api.sendMessage(Auth.user().id, form.dataset.to, form.body.value);
      form.body.value = '';
      App.render();
      const sc = document.getElementById('chatScroll');
      if (sc) sc.scrollTop = sc.scrollHeight;
    } catch (err) { toast(err.message, 'error'); }
  });

  window.App = { render, go, action, parseHash };

  async function boot() {
    if (!window.Seed || !window.DB || !window.Auth || !window.Api) {
      var splash = document.getElementById('splash');
      if (splash) splash.innerHTML =
        '<div style="text-align:center;padding:40px;font-family:sans-serif;direction:rtl">' +
        '<h2 style="color:#dc2626">⚠️ فشل تحميل التطبيق</h2>' +
        '<p style="color:#555;margin:16px 0">الملفات الثانوية (CSS/JS) لم تُحمّل.</p>' +
        '<p style="color:#555"><b>الحل:</b></p>' +
        '<ol style="text-align:right;color:#555;line-height:2">' +
        '<li>تأكد أنك فتحت الملف من <b>المتصفح</b> (Chrome) مش من مدير الملفات</li>' +
        '<li>غيّر اسم المجلد من <b>4فهمني</b> إلى <b>fahimni</b></li>' +
        '<li>أو شغّل سيرفر: <code>npx serve .</code></li>' +
        '</ol></div>';
      return;
    }
    try {
      window.DB.init();
      window.Auth.restore();
      render();
    } catch (err) {
      console.error('Boot error:', err);
      var splash = document.getElementById('splash');
      if (splash) splash.innerHTML =
        '<div style="text-align:center;padding:40px;font-family:sans-serif;direction:rtl">' +
        '<h2 style="color:#dc2626">⚠️ خطأ في بدء التطبيق</h2>' +
        '<p style="color:#555;margin:16px 0;word-break:break-all;font-size:14px">' + esc(String(err.message || err)) + '</p>' +
        '<p style="color:#888;font-size:12px">' + esc(String(err.stack || '').split('\n').slice(0, 3).join(' | ')) + '</p>' +
        '</div>';
      return;
    }
    var splash2 = document.getElementById('splash');
    if (splash2) { splash2.classList.add('hide'); setTimeout(() => splash2.remove(), 450); }
  }

  window.addEventListener('hashchange', render);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
