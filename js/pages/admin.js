/* =========================================================
   Ustadhy Pro — لوحة تحكم الإدارة (Admin)
   Dashboard / الطلاب / المدرسون / طلبات الانضمام / الكورسات /
   الأقسام / الاشتراكات / المعاملات / التقييمات / الإعلانات / الإعدادات
   ========================================================= */
(function () {
  'use strict';
  if (!window.Pages) window.Pages = {};
  const DB = window.DB, Api = window.Api;
  const { esc, money, num, stars, avatar, emptyState, badge, toast, modal, confirm } = window.UI;

  Pages.admin = function (tab) {
    const u = Auth.user();
    if (!u || u.role !== 'admin') return emptyState('⛔', 'غير مصرح لك بالدخول');
    const TABS = {
      overview, students, teachers, applications,
      recharges,
      messages: () => window.Pages.chat(),
      courses: () => coursesPage(),
      categories: () => categoriesPage(),
      subscriptions: () => subscriptionsPage(),
      transactions: () => transactionsPage(),
      reviews: () => reviewsPage(),
      announcements: () => announcementsPage(),
      settings: () => settingsPage()
    };
    return (TABS[tab] || TABS.overview)();
  };

  function statCard(icon, val, label, cls, href) {
    return '<a class="stat-card card" ' + (href ? 'href="' + href + '"' : '') + '>' +
      '<span class="sc-icon ' + cls + '">' + icon + '</span>' +
      '<div><b>' + val + '</b><span>' + label + '</span></div></a>';
  }

  // ================= Dashboard =================
  function overview() {
    const st = Api.adminStats();
    const cats = DB.all('categories');
    const revData = Api.revenueByMonth(6);
    const donutItems = cats.map(c => ({
      label: c.name, color: c.color,
      value: DB.query('enrollments', e => {
        const crs = DB.get('courses', e.courseId);
        return crs && crs.categoryId === c.id;
      }).length
    })).filter(i => i.value > 0);

    // آخر النشاطات (دمج مصادر متعددة)
    const acts = [];
    DB.all('users').forEach(x => { if (x.role !== 'admin') acts.push({ t: new Date(x.createdAt), icon: x.role === 'teacher' ? '👨‍🏫' : '🧑‍🎓', txt: (x.role === 'teacher' ? 'انضم مدرس جديد: ' : 'تسجيل طالب جديد: ') + x.name }); });
    DB.all('enrollments').forEach(e => {
      const s2 = DB.get('users', e.studentId), c = DB.get('courses', e.courseId);
      if (s2 && c) acts.push({ t: new Date(e.createdAt), icon: '🔗', txt: 'اشترك ' + s2.name + ' في «' + c.title.slice(0, 26) + '»' });
    });
    DB.query('reviews', r => r.rating >= 4).forEach(r => {
      const s2 = DB.get('users', r.studentId);
      const tgt = r.targetType === 'course' ? DB.get('courses', r.targetId) : DB.get('users', r.targetId);
      if (s2 && tgt) acts.push({ t: new Date(r.createdAt), icon: '⭐', txt: 'قيّم ' + s2.name + ' (' + r.rating + '/5): ' + (tgt.title || tgt.name) });
    });
    DB.query('users', u2 => u2.status === 'pending').forEach(u2 =>
      acts.push({ t: new Date(u2.createdAt), icon: '📨', txt: 'طلب انضمام معلق من ' + u2.name }));
    acts.sort((a, b) => b.t - a.t);

    return (
      '<div class="welcome-head"><div><h1>لوحة الإدارة 🛡️</h1><p>نظرة شاملة على أداء المنصة</p></div>' +
        '<button class="btn btn-primary" data-action="ann-form-open">＋ إعلان جديد</button></div>' +

      '<div class="stats-row stats-5">' +
        statCard('🧑‍🎓', num(st.students), 'إجمالي الطلاب', 'c-indigo', '#/admin/students') +
        statCard('👨‍🏫', num(st.teachers), 'إجمالي المدرسين', 'c-green', '#/admin/teachers') +
        statCard('🎓', num(st.publishedCourses) + '/' + st.courses, 'الكورسات المنشورة', 'c-purple', '#/admin/courses') +
        statCard('🔗', num(st.subscriptions), 'الاشتراكات', 'c-cyan', '#/admin/subscriptions') +
        statCard('💰', money(st.revenue), 'إجمالي الإيرادات', 'c-amber', '#/admin/transactions') +
      '</div>' +

      (st.pendingTeachers
        ? '<a class="alert-strip" href="#/admin/applications">📨 لديك ' + st.pendingTeachers + ' طلب انضمام مدرس بانتظار المراجعة — اضغط للمراجعة ←</a>'
        : '') +

      '<div class="two-col">' +
        '<div class="panel card"><h2 class="panel-title">📈 الإيرادات الشهرية (مشتريات الكورسات)</h2>' +
          UI.lineChart(revData) + '</div>' +
        '<div class="panel card"><h2 class="panel-title">🍩 توزيع الاشتراكات على الأقسام</h2>' +
          (donutItems.length
            ? '<div class="donut-wrap">' + UI.donut(donutItems) +
                '<div class="donut-legend">' + donutItems.map(i =>
                  '<span><i style="background:' + i.color + '"></i>' + esc(i.label) + ' <b>(' + i.value + ')</b></span>').join('') + '</div></div>'
            : emptyState('🍩', 'لا اشتراكات بعد')) +
        '</div>' +
      '</div>' +

      '<div class="panel card"><h2 class="panel-title">🕒 آخر النشاطات</h2>' +
        '<div class="activity-feed">' +
          acts.slice(0, 9).map(a =>
            '<div class="act-row"><span class="act-icon">' + a.icon + '</span><p>' + esc(a.txt) + '</p><time>' + UI.relTime(a.t.toISOString()) + '</time></div>').join('') +
        '</div>' +
      '</div>'
    );
  }

  // ================= إدارة الطلاب =================
  function students(q) {
    const kw = (q && q.q ? q.q : '').trim();
    let list = DB.query('users', u => u.role === 'student');
    if (kw) list = list.filter(u2 => (u2.name + u2.email + u2.phone).includes(kw));
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return (
      searchBox('#/admin/students', kw, 'ابحث بالاسم أو البريد أو الهاتف…') +
      (list.length
        ? '<div class="table-wrap card"><table class="data-table">' +
            '<thead><tr><th>الطالب</th><th>المرحلة</th><th>الرصيد</th><th>الكورسات</th><th>الحالة</th><th>الانضمام</th><th>إجراءات</th></tr></thead><tbody>' +
            list.map(u2 => {
              const enrs = Api.studentEnrollments(u2.id);
              return '<tr>' +
                '<td><div class="cell-title">' + avatar(u2, 'xs') + '<div><b>' + esc(u2.name) + '</b><small dir="ltr">' + esc(u2.email) + '</small></div></div></td>' +
                '<td>' + esc(u2.stage || '—') + '</td>' +
                '<td><b>' + money(u2.walletBalance) + '</b></td>' +
                '<td>' + enrs.length + '</td>' +
                '<td>' + badge(u2.status) + '</td>' +
                '<td>' + UI.fdate(u2.createdAt) + '</td>' +
                '<td class="actions-cell">' +
                  '<button class="btn btn-outline btn-sm" data-action="balance-open" data-id="' + u2.id + '">💰 رصيد</button>' +
                  (u2.status === 'active'
                    ? '<button class="btn btn-ghost btn-sm" data-action="user-suspend" data-id="' + u2.id + '">تعليق</button>'
                    : '<button class="btn btn-success-ghost btn-sm" data-action="user-activate" data-id="' + u2.id + '">تفعيل</button>') +
                  '<button class="btn btn-danger-ghost btn-sm" data-action="user-delete" data-id="' + u2.id + '">🗑️</button>' +
                '</td></tr>';
            }).join('') + '</tbody></table></div>'
        : emptyState('🔍', 'لا نتائج'))
    );
  }

  function searchBox(actionRoute, value, placeholder) {
    return '<form class="filters-bar card" data-nav-search="' + actionRoute + '">' +
      '<input name="q" value="' + esc(value) + '" placeholder="' + esc(placeholder) + '"/>' +
      '<button class="btn btn-primary" type="submit">بحث 🔍</button></form>';
  }
  document.addEventListener('submit', e => {
    const f = e.target.closest('[data-nav-search]');
    if (!f) return;
    e.preventDefault();
    const qv = f.q.value.trim();
    location.hash = f.dataset.navSearch + (qv ? '?q=' + encodeURIComponent(qv) : '');
  });

  App.action('balance-open', el => {
    const u2 = DB.get('users', el.dataset.id);
    modal({
      title: '💰 تعديل رصيد: ' + u2.name, size: 'sm',
      body:
        '<p class="confirm-text">الرصيد الحالي: <b>' + money(u2.walletBalance) + '</b></p>' +
        '<form data-form="do-adjust-balance" data-id="' + u2.id + '">' +
          '<label class="field"><span>المبلغ (استخدم سالبًا للخصم)</span><input type="number" name="amount" step="10" required placeholder="مثال: 100 أو -50"/></label>' +
          '<label class="field"><span>سبب (يظهر في معاملات الطالب)</span><input name="reason" value="تسوية إدارية"/></label>' +
          '<button class="btn btn-primary btn-block" type="submit">تنفيذ</button>' +
        '</form>'
    });
  });

  App.action('do-adjust-balance', form => {
    const amt = Number(form.amount.value);
    const u2 = DB.get('users', form.dataset.id);
    if (!amt) { toast('أدخل مبلغًا غير صفري', 'error'); return; }
    const newBal = Math.max(0, (u2.walletBalance || 0) + amt);
    DB.update('users', u2.id, { walletBalance: newBal });
    DB.insert('transactions', {
      id: UST.uid('x'), userId: u2.id, type: amt > 0 ? 'deposit' : 'refund',
      amount: Math.abs(amt), description: 'تسوية إدارية: ' + (form.reason.value || 'بدون سبب'),
      method: null, ref: 'ADJ-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      createdAt: new Date().toISOString()
    });
    toast('تم تعديل الرصيد إلى ' + money(newBal));
    document.querySelectorAll('.modal-overlay').forEach(x => x.remove());
    App.render();
  });

  App.action('user-suspend', el => {
    confirm('تعليق هذا الحساب؟ لن يستطيع المستخدم تسجيل الدخول.', 'تعليق').then(ok => {
      if (!ok) return;
      DB.update('users', el.dataset.id, { status: 'suspended' });
      toast('تم تعليق الحساب', 'info');
      App.render();
    });
  });

  App.action('user-activate', el => {
    DB.update('users', el.dataset.id, { status: 'active' });
    toast('تم تفعيل الحساب ✅');
    App.render();
  });

  App.action('user-delete', el => {
    const u2 = DB.get('users', el.dataset.id);
    if (!u2) return;
    if (u2.role === 'admin') { toast('لا يمكن حذف حساب إدارة', 'error'); return; }
    confirm('حذف «' + u2.name + '» نهائيًا مع كل بياناته واشتراكاته؟', 'حذف نهائي').then(ok => {
      if (!ok) return;
      ['enrollments', 'transactions'].forEach(col => DB.query(col, x => x.userId === u2.id || x.studentId === u2.id)
        .forEach(x => DB.remove(col, x.id)));
      DB.query('notifications', n => n.userId === u2.id).forEach(n => DB.remove('notifications', n.id));
      DB.remove('users', u2.id);
      toast('تم حذف الحساب نهائيًا', 'info');
      App.render();
    });
  });

  // ================= إدارة المدرسين =================
  function teachers() {
    const list = DB.query('users', u => u.role === 'teacher')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return (
      (list.length
        ? '<div class="table-wrap card"><table class="data-table">' +
          '<thead><tr><th>المدرس</th><th>المادة</th><th>الكورسات</th><th>الطلاب</th><th>التقييم</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>' +
          list.map(t => {
            const st = Api.teacherStats(t.id);
            return '<tr>' +
              '<td><div class="cell-title">' + avatar(t, 'xs') + '<div><b>' + esc(t.name) + '</b><small dir="ltr">' + esc(t.email) + '</small></div></div></td>' +
              '<td>' + esc(t.subject || '—') + '</td>' +
              '<td>' + st.courses + '</td>' +
              '<td>' + st.students + '</td>' +
              '<td>' + (st.rating.count ? stars(st.rating.avg) : '—') + '</td>' +
              '<td>' + badge(t.status === 'active' ? 'approved' : t.status) + '</td>' +
              '<td class="actions-cell">' +
                '<a class="btn btn-ghost btn-sm" href="#/teacher/' + t.id + '">👁️</a>' +
                (t.status === 'active'
                  ? '<button class="btn btn-ghost btn-sm" data-action="user-suspend" data-id="' + t.id + '">تعليق</button>'
                  : t.status !== 'pending' ? '<button class="btn btn-success-ghost btn-sm" data-action="user-activate" data-id="' + t.id + '">تفعيل</button>' : '') +
                '<button class="btn btn-danger-ghost btn-sm" data-action="user-delete" data-id="' + t.id + '">🗑️</button>' +
              '</td></tr>';
          }).join('') + '</tbody></table></div>'
        : emptyState('👨‍🏫', 'لا مدرسين بعد'))
    );
  }

  // ================= طلبات الانضمام =================
  function applications() {
    const pending = DB.query('users', u => u.role === 'teacher' && u.status === 'pending')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const decided = DB.query('users', u => u.role === 'teacher' && (u.status === 'rejected' || u.status === 'suspended'));

    return (
      (pending.length
        ? pending.map(t =>
            '<div class="app-card card">' +
              '<div class="app-head">' +
                '<div class="th-avatar sm ' + (t.avatar ? t.avatar.g : 'av1') + '">' + (t.avatar ? t.avatar.e : '👨‍🏫') + '</div>' +
                '<div><h3>' + esc(t.name) + '</h3>' +
                  '<small dir="ltr">' + esc(t.email) + ' · ' + esc(t.phone || '') + '</small></div>' +
                badge('pending') +
              '</div>' +
              '<div class="app-details">' +
                '<span>📗 المادة: <b>' + esc(t.subject || '—') + '</b></span>' +
                '<span>🎒 المرحلة: <b>' + esc(t.stage || '—') + '</b></span>' +
                '<span>📅 تاريخ التقديم: <b>' + UI.fdate(t.createdAt) + '</b></span>' +
              '</div>' +
              '<div class="card-flat"><b>نبذة:</b> ' + esc(t.bio || '—') + '</div>' +
              (t.extra ? '<div class="card-flat mt8"><b>بيانات إضافية:</b> ' + esc(t.extra) + '</div>' : '') +
              '<div class="wrap-gap mt16">' +
                '<button class="btn btn-success-solid" data-action="app-decide" data-id="' + t.id + '" data-decision="approve">✅ قبول المدرس</button>' +
                '<button class="btn btn-danger" data-action="app-decide" data-id="' + t.id + '" data-decision="reject">✖ رفض الطلب</button>' +
                '<a class="link-more" href="#/teachers">معاينة صفحة المدرسين</a>' +
              '</div>' +
            '</div>').join('')
        : emptyState('📭', 'لا طلبات معلقة', 'كل طلبات الانضمام تمت مراجعتها 🎉')) +
      (decided.length
        ? '<h2 class="panel-title mt24">طلبات سابقة مرفوضة/معلقة</h2>' +
          '<div class="table-wrap card"><table class="data-table"><thead><tr><th>المدرس</th><th>المادة</th><th>الحالة</th><th></th></tr></thead><tbody>' +
          decided.map(t => '<tr><td><b>' + esc(t.name) + '</b></td><td>' + esc(t.subject || '') + '</td><td>' + badge(t.status) + '</td>' +
            '<td><button class="btn btn-success-ghost btn-sm" data-action="user-activate" data-id="' + t.id + '">قبول الآن</button></td></tr>').join('') +
          '</tbody></table></div>'
        : '')
    );
  }

  App.action('app-decide', el => {
    const t = DB.get('users', el.dataset.id);
    if (!t) return;
    if (el.dataset.decision === 'approve') {
      DB.update('users', t.id, { status: 'active' });
      Api.notify(t.id, '🎉', 'تم قبول طلبك كمدرس!', 'مبروك! أصبحت مدرسًا معتمدًا على أستاذي برو. يمكنك الآن إنشاء كورساتك ونشرها.');
      toast('تم قبول ' + t.name + ' وإرسال إشعار له ✅');
    } else {
      DB.update('users', t.id, { status: 'rejected' });
      Api.notify(t.id, '📋', 'بخصوص طلب الانضمام', 'نعتذر، لم يتم قبول طلبك حاليًا. يمكنك تحسين بياناتك والتقديم مجددًا مستقبلًا.');
      toast('تم رفض الطلب وإشعار صاحبه', 'info');
    }
    App.render();
  });

  // ================= إدارة الكورسات =================
  function coursesPage() {
    const list = DB.all('courses').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return (
      '<div class="table-wrap card"><table class="data-table">' +
        '<thead><tr><th>الكورس</th><th>المدرس</th><th>القسم</th><th>السعر</th><th>الطلاب</th><th>التقييم</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>' +
        list.map(c => {
          const t = DB.get('users', c.teacherId);
          const cat = DB.get('categories', c.categoryId);
          const r = Api.courseRating(c.id);
          return '<tr>' +
            '<td><div class="cell-title"><span class="mini-cover ' + c.cover + '">' + (cat ? cat.icon : '') + '</span>' +
              '<div><b>' + esc(c.title.slice(0, 30)) + '</b><small>' + esc(c.stage || '') + '</small></div></div></td>' +
            '<td>' + esc(t ? t.name : '—') + '</td>' +
            '<td>' + (cat ? esc(cat.name) : '—') + '</td>' +
            '<td><b>' + money(c.price) + '</b></td>' +
            '<td>' + Api.courseStudentsCount(c.id) + '</td>' +
            '<td>' + (r.count ? stars(r.avg) : '—') + '</td>' +
            '<td>' + badge(c.status) + '</td>' +
            '<td class="actions-cell">' +
              '<a class="btn btn-ghost btn-sm" href="#/course/' + c.id + '">👁️</a>' +
              '<button class="btn btn-outline btn-sm" data-action="toggle-publish" data-id="' + c.id + '">' + (c.status === 'published' ? 'إلغاء النشر' : 'نشر') + '</button>' +
              '<button class="btn btn-danger-ghost btn-sm" data-action="delete-course" data-id="' + c.id + '">🗑️</button>' +
            '</td></tr>';
        }).join('') + '</tbody></table></div>'
    );
  }

  // ================= الأقسام =================
  function categoriesPage() {
    const cats = DB.all('categories');
    return (
      '<div class="row-between mb16"><h2 class="panel-title-inline">🏷️ أقسام المنصة (' + cats.length + ')</h2>' +
        '<button class="btn btn-primary" data-action="cat-form-open">＋ قسم جديد</button></div>' +
      '<div class="cats-manage-grid">' +
        cats.map(c => {
          const count = DB.query('courses', x => x.categoryId === c.id).length;
          return '<div class="cat-mcard card">' +
            '<span class="cat-icon" style="--cat:' + c.color + '">' + c.icon + '</span>' +
            '<div class="cat-minfo"><b>' + esc(c.name) + '</b><small>' + esc(c.description || '') + '</small><em>' + count + ' كورس</em></div>' +
            '<div class="actions-cell">' +
              '<button class="icon-btn sm" data-action="cat-form-open" data-id="' + c.id + '">✏️</button>' +
              '<button class="icon-btn sm danger" data-action="cat-delete" data-id="' + c.id + '">🗑️</button>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>'
    );
  }

  App.action('cat-form-open', el => {
    const editing = el.dataset.id ? DB.get('categories', el.dataset.id) : null;
    modal({
      title: editing ? '✏️ تعديل القسم' : '＋ قسم جديد', size: 'sm',
      body:
        '<form data-form="save-cat" data-id="' + (editing ? editing.id : '') + '">' +
          '<label class="field"><span>اسم القسم *</span><input name="name" required value="' + esc(editing ? editing.name : '') + '"/></label>' +
          '<label class="field"><span>الأيقونة (إيموجي)</span><input name="icon" value="' + esc(editing ? editing.icon : '📚') + '" maxlength="4"/></label>' +
          '<label class="field"><span>وصف قصير</span><input name="description" value="' + esc(editing ? editing.description || '' : '') + '"/></label>' +
          '<label class="field"><span>اللون</span><input type="color" name="color" value="' + (editing ? editing.color : '#4f46e5') + '"/></label>' +
          '<button class="btn btn-primary btn-block" type="submit">💾 حفظ</button>' +
        '</form>'
    });
  });

  App.action('save-cat', form => {
    const patch = {
      name: form.name.value.trim(), icon: form.icon.value.trim() || '📚',
      description: form.description.value.trim(), color: form.color.value
    };
    if (form.dataset.id) DB.update('categories', form.dataset.id, patch);
    else DB.insert('categories', Object.assign({ id: UST.uid('cat') }, patch));
    toast('تم حفظ القسم ✅');
    document.querySelectorAll('.modal-overlay').forEach(x => x.remove());
    App.render();
  });

  App.action('cat-delete', el => {
    const used = DB.query('courses', c => c.categoryId === el.dataset.id).length;
    confirm(used ? 'يوجد ' + used + ' كورس في هذا القسم. سيتم تركها بدون قسم. متابعة؟' : 'حذف هذا القسم؟', 'حذف').then(ok => {
      if (!ok) return;
      DB.remove('categories', el.dataset.id);
      toast('تم حذف القسم', 'info');
      App.render();
    });
  });

  // ================= الاشتراكات =================
  function subscriptionsPage() {
    const rows = DB.all('enrollments').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const totalRev = rows.reduce((s, e) => s + e.pricePaid, 0);
    return (
      '<div class="stats-row">' +
        statCard('🔗', num(rows.length), 'إجمالي الاشتراكات', 'c-indigo') +
        statCard('💰', money(totalRev), 'قيمة الاشتراكات', 'c-amber') +
      '</div>' +
      (rows.length
        ? '<div class="table-wrap card"><table class="data-table">' +
          '<thead><tr><th>الطالب</th><th>الكورس</th><th>المدرس</th><th>المبلغ المدفوع</th><th>التقدم</th><th>التاريخ</th></tr></thead><tbody>' +
          rows.map(e => {
            const s2 = DB.get('users', e.studentId), c = DB.get('courses', e.courseId);
            const t = c ? DB.get('users', c.teacherId) : null;
            return '<tr>' +
              '<td>' + esc(s2 ? s2.name : 'محذوف') + '</td>' +
              '<td>' + esc(c ? c.title.slice(0, 28) : 'محذوف') + '</td>' +
              '<td>' + esc(t ? t.name : '—') + '</td>' +
              '<td><b>' + money(e.pricePaid) + '</b></td>' +
              '<td style="min-width:120px"><span class="tiny-label">' + (c ? Api.enrollmentProgress(e) : 0) + '%</span>' + UI.progress(c ? Api.enrollmentProgress(e) : 0) + '</td>' +
              '<td>' + UI.fdate(e.createdAt) + '</td>' +
            '</tr>';
          }).join('') + '</tbody></table></div>'
        : emptyState('🔗', 'لا اشتراكات بعد'))
    );
  }

  // ================= طلبات شحن الرصيد =================
  function recharges() {
    const pend = Api.pendingDeposits();
    const done = DB.query('transactions', t => t.type === 'deposit' && t.status && t.status !== 'pending')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 30);

    return (
      (pend.length
        ? '<div class="panel card"><h2 class="panel-title">⏳ طلبات بانتظار التأكيد (' + pend.length + ')</h2>' +
          '<div class="table-wrap"><table class="data-table">' +
            '<thead><tr><th>الطالب</th><th>المبلغ</th><th>الوسيلة</th><th>مرجع التحويل</th><th>الفاتورة</th><th>التاريخ</th><th>القرار</th></tr></thead><tbody>' +
            pend.map(t => {
              const s = DB.get('users', t.userId);
              return '<tr>' +
                '<td>' + esc(s ? s.name : t.userId) + '</td>' +
                '<td class="amt-in">+' + money(t.amount) + '</td>' +
                '<td>' + esc(t.method || '—') + '</td>' +
                '<td dir="ltr"><small>' + esc(t.ref || '—') + '</small></td>' +
                '<td>' + (t.receipt
                  ? '<button class="btn btn-outline btn-sm" data-action="view-receipt" data-id="' + t.id + '">🖼️ عرض الفاتورة</button>'
                  : '<small>—</small>') + '</td>' +
                '<td>' + UI.fdate(t.createdAt, true) + '</td>' +
                '<td class="row-actions">' +
                  '<button class="btn btn-primary btn-sm" data-action="recharge-resolve" data-id="' + t.id + '" data-ok="1">✅ تأكيد وإضافة</button> ' +
                  '<button class="btn btn-danger btn-sm" data-action="recharge-resolve" data-id="' + t.id + '" data-ok="0">❌ رفض</button>' +
                '</td></tr>';
            }).join('') +
          '</tbody></table></div></div>'
        : emptyState('🧾', 'لا طلبات شحن معلقة', 'ستظهر هنا طلبات الطلاب بعد إرسالهم تحويلاتهم الحقيقية.')) +
      '<div class="panel card mt16"><h2 class="panel-title">📜 آخر القرارات (' + done.length + ')</h2>' +
        (done.length
          ? '<div class="table-wrap"><table class="data-table">' +
              '<thead><tr><th>الطالب</th><th>المبلغ</th><th>الوسيلة</th><th>المرجع</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>' +
              done.map(t => {
                const s = DB.get('users', t.userId);
                return '<tr><td>' + esc(s ? s.name : t.userId) + '</td>' +
                  '<td>+' + money(t.amount) + '</td><td>' + esc(t.method || '—') + '</td>' +
                  '<td dir="ltr"><small>' + esc(t.ref || '—') + '</small></td>' +
                  '<td><span class="tx-st st-' + t.status + '">' + (t.status === 'approved' ? '✅ مؤكد' : '❌ مرفوض') + '</span></td>' +
                  '<td>' + UI.fdate(t.createdAt, true) + '</td></tr>';
              }).join('') +
            '</tbody></table></div>'
          : '<p class="hint">لا قرارات سابقة بعد.</p>') +
      '</div>'
    );
  }

  App.action('view-receipt', el => {
    const t = DB.get('transactions', el.dataset.id);
    if (!t || !t.receipt) { toast('لا توجد فاتورة مرفقة', 'warn'); return; }
    const s = DB.get('users', t.userId);
    modal({
      title: '🧾 فاتورة تحويل — ' + (s ? s.name : ''),
      size: 'lg',
      body: '<img src="' + t.receipt + '" alt="فاتورة التحويل" style="width:100%;border-radius:14px;border:1px solid #e5e7eb"/>' +
        '<div class="mt8"><b>' + money(t.amount) + '</b> عبر ' + esc(t.method || '—') +
        ' · مرجع: <span dir="ltr">' + esc(t.ref || '—') + '</span></div>'
    });
  });

  App.action('recharge-resolve', el => {
    try {
      const ok = el.dataset.ok === '1';
      Api.resolveDeposit(el.dataset.id, ok);
      toast(ok ? '✅ تمت إضافة الرصيد لمحفظة الطالب' : 'تم رفض الطلب وإشعار الطالب');
      App.render();
    } catch (err) { toast(err.message, 'error'); }
  });

  // ================= المعاملات =================
  function transactionsPage() {
    const txs = Api.transactions().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const st = Api.adminStats();
    return (
      '<div class="stats-row stats-5">' +
        statCard('💰', money(st.revenue), 'إيرادات المشتريات', 'c-amber') +
        statCard('📥', money(st.deposits), 'إجمالي الإيداعات', 'c-green') +
        statCard('💳', num(txs.length), 'عدد العمليات', 'c-indigo') +
      '</div>' +
      (txs.length
        ? '<div class="table-wrap card"><table class="data-table">' +
          '<thead><tr><th>العملية</th><th>المستخدم</th><th>النوع</th><th>المبلغ</th><th>المرجع</th><th>التاريخ</th><th></th></tr></thead><tbody>' +
          txs.map(t => {
            const u2 = DB.get('users', t.userId);
            const refunded = DB.query('transactions', x => x.refundOf === t.id).length > 0;
            return '<tr>' +
              '<td>' + esc(t.description) + '</td>' +
              '<td>' + esc(u2 ? u2.name : '—') + '</td>' +
              '<td>' + badge(t.type) + '</td>' +
              '<td class="' + (t.type === 'purchase' ? 'amt-in' : 'amt-out') + '">' + money(t.amount) + '</td>' +
              '<td dir="ltr"><small>' + esc(t.ref || '—') + '</small></td>' +
              '<td>' + UI.fdate(t.createdAt, true) + '</td>' +
              '<td>' + (t.type === 'purchase' && !refunded ? '<button class="btn btn-ghost btn-sm" data-action="tx-refund" data-id="' + t.id + '">↩️ استرداد</button>' : (refunded ? '<small class="badge b-warn">مسترد</small>' : '')) + '</td>' +
            '</tr>';
          }).join('') + '</tbody></table></div>'
        : emptyState('💳', 'لا معاملات بعد'))
    );
  }

  App.action('tx-refund', el => {
    confirm('استرداد مبلغ هذه العملية إلى محفظة الطالب؟', 'استرداد').then(ok => {
      if (!ok) return;
      try {
        Api.refund(el.dataset.id);
        toast('تم الاسترداد بنجاح ✅');
        App.render();
      } catch (err) { toast(err.message, 'error'); }
    });
  });

  // ================= التقييمات =================
  function reviewsPage() {
    const revs = DB.all('reviews').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (!revs.length) return emptyState('⭐', 'لا تقييمات بعد');
    return (
      '<div class="table-wrap card"><table class="data-table">' +
        '<thead><tr><th>الطالب</th><th>النوع</th><th>العنصر</th><th>التقييم</th><th>التعليق</th><th>التاريخ</th><th></th></tr></thead><tbody>' +
        revs.map(rv => {
          const s2 = DB.get('users', rv.studentId);
          const tgt = rv.targetType === 'course' ? DB.get('courses', rv.targetId) : DB.get('users', rv.targetId);
          return '<tr>' +
            '<td>' + esc(s2 ? s2.name : '—') + '</td>' +
            '<td>' + (rv.targetType === 'course' ? '🎓 كورس' : '👨‍🏫 مدرس') + '</td>' +
            '<td>' + esc(tgt ? (tgt.title || tgt.name).slice(0, 24) : '—') + '</td>' +
            '<td>' + stars(rv.rating) + '</td>' +
            '<td><span class="sol-preview">' + esc((rv.comment || '').slice(0, 50)) + ((rv.comment || '').length > 50 ? '…' : '') + '</span></td>' +
            '<td>' + UI.fdate(rv.createdAt) + '</td>' +
            '<td><button class="btn btn-danger-ghost btn-sm" data-action="review-delete" data-id="' + rv.id + '">🗑️</button></td>' +
          '</tr>';
        }).join('') + '</tbody></table></div>'
    );
  }

  App.action('review-delete', el => {
    confirm('حذف هذا التقييم؟', 'حذف').then(ok => {
      if (!ok) return;
      DB.remove('reviews', el.dataset.id);
      toast('تم حذف التقييم', 'info');
      App.render();
    });
  });

  // ================= الإعلانات =================
  function announcementsPage() {
    const list = DB.all('announcements').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return (
      '<div class="row-between mb16"><h2 class="panel-title-inline">📢 الإعلانات (' + list.length + ')</h2>' +
        '<button class="btn btn-primary" data-action="ann-form-open">＋ إعلان جديد</button></div>' +
      (list.length
        ? '<div class="ann-list">' + list.map(a =>
            '<div class="ann-card card' + (a.active ? '' : ' dimmed') + '">' +
              '<div class="ann-head"><span class="ann-icon">' + (a.active ? '📢' : '💤') + '</span>' +
                '<div><h3>' + esc(a.title) + '</h3><time>' + UI.fdate(a.createdAt, true) + '</time></div>' +
                '<div class="actions-cell">' +
                  '<span class="badge ' + (a.active ? 'b-success' : 'b-muted') + '">' + (a.active ? 'منشور' : 'متوقف') + '</span>' +
                  '<em class="src-chip">' + (a.audience === 'all' ? 'للجميع' : a.audience === 'students' ? '🎓 للطلاب' : '👨‍🏫 للمدرسين') + '</em>' +
                '</div>' +
              '</div>' +
              '<p>' + esc(a.body) + '</p>' +
              '<div class="wrap-gap">' +
                '<button class="btn btn-ghost btn-sm" data-action="ann-toggle" data-id="' + a.id + '">' + (a.active ? 'إيقاف' : 'تنشيط') + '</button>' +
                '<button class="btn btn-outline btn-sm" data-action="ann-form-open" data-id="' + a.id + '">✏️ تعديل</button>' +
                '<button class="btn btn-danger-ghost btn-sm" data-action="ann-delete" data-id="' + a.id + '">🗑️</button>' +
              '</div>' +
            '</div>').join('') + '</div>'
        : emptyState('📢', 'لا إعلانات بعد', 'أنشئ أول إعلان ليظهر للطلاب والمدرسين',
            '<button class="btn btn-primary" data-action="ann-form-open">＋ إعلان جديد</button>'))
    );
  }

  App.action('ann-form-open', el => {
    const editing = el.dataset.id ? DB.get('announcements', el.dataset.id) : null;
    modal({
      title: editing ? '✏️ تعديل الإعلان' : '＋ إعلان جديد',
      body:
        '<form data-form="save-ann" data-id="' + (editing ? editing.id : '') + '">' +
          '<label class="field"><span>عنوان الإعلان *</span><input name="title" required value="' + esc(editing ? editing.title : '') + '"/></label>' +
          '<label class="field"><span>نص الإعلان *</span><textarea name="body" rows="4" required>' + esc(editing ? editing.body : '') + '</textarea></label>' +
          '<div class="form-grid">' +
            '<label class="field"><span>الجمهور المستهدف</span><select name="audience">' +
              '<option value="all"' + (editing && editing.audience === 'all' ? ' selected' : '') + '>الجميع</option>' +
              '<option value="students"' + (editing && editing.audience === 'students' ? ' selected' : '') + '>الطلاب فقط</option>' +
              '<option value="teachers"' + (editing && editing.audience === 'teachers' ? ' selected' : '') + '>المدرسون فقط</option>' +
            '</select></label>' +
            '<label class="field"><span>الحالة</span><select name="active">' +
              '<option value="1"' + (!editing || editing.active ? ' selected' : '') + '>منشور</option>' +
              '<option value="0"' + (editing && !editing.active ? ' selected' : '') + '>متوقف</option>' +
            '</select></label>' +
          '</div>' +
          '<button class="btn btn-primary btn-block" type="submit">💾 حفظ ونشر الإشعار</button>' +
        '</form>'
    });
  });

  App.action('save-ann', form => {
    const isNew = !form.dataset.id;
    const data = {
      title: form.title.value.trim(), body: form.body.value.trim(),
      audience: form.audience.value, active: form.active.value === '1'
    };
    let saved;
    if (isNew) saved = DB.insert('announcements', Object.assign({ id: UST.uid('an'), createdAt: new Date().toISOString() }, data));
    else saved = DB.update('announcements', form.dataset.id, data);

    if (saved.active) {
      const targets = DB.query('users', u =>
        data.audience === 'all' ? true :
        data.audience === 'students' ? u.role === 'student' :
        u.role === 'teacher' && u.status === 'active');
      targets.forEach(u2 => Api.notify(u2.id, '📢', 'إعلان جديد: ' + data.title, data.body.slice(0, 90)));
      toast('تم نشر الإعلان وإشعار ' + targets.length + ' مستخدم 📢');
    } else toast('تم حفظ الإعلان (متوقف)', 'info');
    document.querySelectorAll('.modal-overlay').forEach(x => x.remove());
    App.render();
  });

  App.action('ann-toggle', el => {
    const a = DB.get('announcements', el.dataset.id);
    DB.update('announcements', a.id, { active: !a.active });
    App.render();
  });

  App.action('ann-delete', el => {
    confirm('حذف هذا الإعلان؟', 'حذف').then(ok => {
      if (!ok) return;
      DB.remove('announcements', el.dataset.id);
      toast('تم حذف الإعلان', 'info');
      App.render();
    });
  });

  // ================= الإعدادات =================
  function settingsPage() {
    const s = DB.settings();
    return (
      '<div class="two-col">' +
        '<div class="panel card"><h2 class="panel-title">⚙️ إعدادات المنصة</h2>' +
          '<form data-form="save-settings">' +
            '<label class="field"><span>اسم المنصة (إنجليزي)</span><input name="platformName" value="' + esc(s.platformName) + '" dir="ltr"/></label>' +
            '<label class="field"><span>اسم المنصة (عربي)</span><input name="platformNameAr" value="' + esc(s.platformNameAr) + '"/></label>' +
            '<div class="form-grid">' +
              '<label class="field"><span>رمز العملة</span><input name="currency" value="' + esc(s.currency) + '"/></label>' +
              '<label class="field"><span>عمولة المنصة %</span><input type="number" name="commission" min="0" max="90" value="' + s.commission + '"/></label>' +
            '</div>' +
            '<label class="switch-row"><input type="checkbox" name="maintenance"' + (s.maintenance ? ' checked' : '') + '/>' +
              '<span>وضع الصيانة (شريط تنبيه يظهر لغير الإدارة)</span></label>' +
            '<button class="btn btn-primary mt8" type="submit">💾 حفظ الإعدادات</button>' +
          '</form>' +
        '</div>' +
        '<div>' +
          '<div class="panel card"><h2 class="panel-title">🔐 الأمان والبيانات</h2>' +
            '<p class="hint">في Demo Mode تُخزَّن البيانات محليًا في متصفحك. عند الانتقال للإنتاج يتم ربط المنصة بـ Supabase (Auth + PostgreSQL + Storage) عبر نفس طبقة API الموجودة في <code dir="ltr">js/core/api.js</code>.</p>' +
            '<hr/>' +
            '<b>⚠️ منطقة الخطر</b>' +
            '<p class="hint">إعادة تعيين كل البيانات إلى حالة الإقلاع النظيفة (الإدارة + الأقسام فقط — سيُحذف كل المحتوى الفعلي).</p>' +
            '<button class="btn btn-danger" data-action="reset-demo">🔄 إعادة تعيين بيانات المنصة بالكامل</button>' +
          '</div>' +
          '<div class="panel card"><h2 class="panel-title">👑 مدير المنصة الوحيد</h2>' +
            '<div class="card-flat">الاسم: <b>محمد وليد محمد عزت</b><br/><small dir="ltr">manger@gmail.com</small><br/><small>لأمان المنصة لا يمكن إنشاء مدير ثانٍ.</small></div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  App.action('save-settings', form => {
    DB.setSettings({
      platformName: form.platformName.value.trim() || 'Fahimni',
      platformNameAr: form.platformNameAr.value.trim() || 'فهمني',
      currency: form.currency.value.trim() || 'ج.م',
      commission: Number(form.commission.value) || 0,
      maintenance: form.maintenance.checked
    });
    toast('تم حفظ الإعدادات ✅');
    App.render();
  });

  App.action('reset-demo', () => {
    confirm('سيتم مسح جميع البيانات الحالية واستعادة البيانات التجريبية. هل أنت متأكد؟', 'نعم، أعد التعيين').then(ok => {
      if (!ok) return;
      window.DB.reset();
      window.Auth.logout();
      toast('تمت إعادة تعيين البيانات التجريبية 🔄', 'success');
      location.hash = '#/';
      setTimeout(() => location.reload(), 300);
    });
  });
})();
