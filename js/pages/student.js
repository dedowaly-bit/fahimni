/* =========================================================
   Ustadhy Pro — لوحة تحكم الطالب
   نظرة عامة / كورساتي / الاختبارات / الواجبات / المحفظة /
   الإعلانات / الإشعارات / الملف الشخصي
   ========================================================= */
(function () {
  'use strict';
  if (!window.Pages) window.Pages = {};
  const DB = window.DB, Api = window.Api;
  const { esc, money, num, stars, progress, avatar, emptyState, badge, mins, toast } = window.UI;

  const TABS = {
    overview: () => overview(),
    'my-courses': () => myCourses(),
    quizzes: () => quizzesPage(),
    homework: () => homeworkPage(),
    wallet: () => walletPage(),
    announcements: () => announcementsPage(),
    messages: () => window.Pages.chat(),
    notifications: () => notificationsPage(),
    profile: () => profilePage()
  };

  // نقطة الدخول التي يستدعيها الروتر
  Pages.student = function (tab) {
    const fn = TABS[tab] || TABS.overview;
    return fn();
  };

  function welcomeHead(sub) {
    const u = Auth.user();
    return '<div class="welcome-head">' +
      '<div>' + avatar(u, 'lg') +
        '<div><h1>أهلًا، ' + esc(u.name.split(' ')[0]) + ' 👋</h1><p>' + sub + '</p></div>' +
      '</div>' +
      '<a class="btn btn-primary" href="#/courses">🔍 استكشف كورسًا جديدًا</a>' +
    '</div>';
  }

  function statCard(icon, val, label, cls) {
    return '<div class="stat-card card"><span class="sc-icon ' + (cls || '') + '">' + icon + '</span>' +
      '<div><b>' + val + '</b><span>' + label + '</span></div></div>';
  }

  // ================= نظرة عامة =================
  function overview() {
    const u = Auth.user();
    const enrs = Api.studentEnrollments(u.id);
    const cont = Api.continueLearning(u.id);
    const upcoming = Api.upcomingHomework(u.id).slice(0, 4);
    const attempts = DB.query('attempts', a => a.studentId === u.id);
    const notifs = Api.notifications(u.id).slice(0, 5);
    const avgProgress = enrs.length ? Math.round(enrs.reduce((s, e) => s + Api.enrollmentProgress(e), 0) / enrs.length) : 0;
    const quizAvg = attempts.length ? Math.round(attempts.reduce((s, a) => s + (a.score / a.total) * 100, 0) / attempts.length) : 0;

    return (
      welcomeHead('هذه نظرة سريعة على رحلتك التعليمية اليوم') +

      '<div class="stats-row">' +
        statCard('📚', num(enrs.length), 'كورساتي', 'c-indigo') +
        statCard('📈', avgProgress + '%', 'متوسط إنجازي', 'c-green') +
        statCard('💰', money(u.walletBalance), 'رصيد المحفظة', 'c-amber') +
        statCard('📝', quizAvg + '%', 'متوسط اختباراتي', 'c-purple') +
      '</div>' +

      /* متابعة التعلم */
      (cont
        ? (() => {
            const cat = DB.get('categories', cont.course.categoryId);
            return '<div class="panel card continue-card">' +
              '<div class="cont-cover ' + cont.course.cover + '">' + (cat ? cat.icon : '📘') + '</div>' +
              '<div class="cont-info">' +
                '<small>▶ أكمل من حيث توقفت</small>' +
                '<h3>' + esc(cont.course.title) + '</h3>' +
                '<p>الدرس القادم: <b>' + esc(cont.lesson.title) + '</b></p>' +
                progress(cont.progress) +
              '</div>' +
              '<a class="btn btn-primary btn-lg" href="#/learn/' + cont.course.id + '/' + cont.lesson.id + '">متابعة ▶</a>' +
            '</div>';
          })()
        : (enrs.length ? '' : emptyState('🚀', 'ابدأ رحلتك الآن', 'اشترك في أول كورس لك وستظهر متابعات تقدمك هنا',
            '<a class="btn btn-primary" href="#/courses">تصفح الكورسات</a>'))) +

      '<div class="two-col">' +
        /* واجبات قادمة */
        '<div class="panel card"><h2 class="panel-title">⏰ واجبات قادمة</h2>' +
          (upcoming.length
            ? upcoming.map(hw => {
                const crs = DB.get('courses', hw.courseId);
                const days = Math.ceil((new Date(hw.dueDate) - Date.now()) / 86400000);
                return '<div class="quiz-row card-flat">' +
                  '<div><b>' + esc(hw.title) + '</b><small>📖 ' + esc(crs ? crs.title : '') + '</small>' +
                  '<small class="' + (days <= 2 ? 'urgent' : '') + '">📅 التسليم خلال ' + days + ' يوم</small></div>' +
                  '<button class="btn btn-outline btn-sm" data-action="hw-open" data-hw="' + hw.id + '">سلّم الآن</button>' +
                '</div>';
              }).join('')
            : emptyState('✅', 'لا واجبات مستحقة حاليًا', 'أنت على المسار الصحيح!')) +
        '</div>' +

        /* آخر نتائج الاختبارات */
        '<div class="panel card"><h2 class="panel-title">📝 آخر نتائج الاختبارات</h2>' +
          (attempts.length
            ? attempts.slice(-4).reverse().map(a => {
                const qz = DB.get('quizzes', a.quizId);
                const crs = qz ? DB.get('courses', qz.courseId) : null;
                const pctv = Math.round((a.score / a.total) * 100);
                return '<div class="quiz-row card-flat">' +
                  '<div><b>' + esc(qz ? qz.title : 'اختبار') + '</b><small>' + esc(crs ? crs.title : '') + ' · ' + UI.relTime(a.createdAt) + '</small></div>' +
                  '<span class="score-pill ' + (pctv >= 50 ? 'pass' : 'fail') + '">' + a.score + '/' + a.total + '</span>' +
                '</div>';
              }).join('')
            : emptyState('🧪', 'لم تخض أي اختبار بعد', 'اختبارات كورساتك ستظهر هنا')) +
        '</div>' +
      '</div>' +

      /* آخر الإشعارات */
      '<div class="panel card"><h2 class="panel-title">🔔 آخر الإشعارات</h2>' +
        (notifs.length
          ? notifs.map(n =>
              '<div class="notif-item ' + (n.read ? '' : 'unread') + ' static">' +
                '<span class="notif-icon">' + n.icon + '</span>' +
                '<div><b>' + esc(n.title) + '</b><p>' + esc(n.body) + '</p><time>' + UI.relTime(n.createdAt) + '</time></div>' +
              '</div>').join('')
          : emptyState('🔕', 'لا إشعارات بعد')) +
        '<a class="link-more" href="#/student/notifications">كل الإشعارات ←</a>' +
      '</div>'
    );
  }

  // ================= كورساتي =================
  function myCourses() {
    const u = Auth.user();
    const enrs = Api.studentEnrollments(u.id);
    if (!enrs.length)
      return emptyState('📚', 'لم تشترك في أي كورس بعد', 'اكتشف آلاف الدروس وابدأ اليوم',
        '<a class="btn btn-primary" href="#/courses">تصفح الكورسات</a>');

    return (
      '<div class="grid-courses">' +
        enrs.map(e => {
          const c = DB.get('courses', e.courseId);
          if (!c) return '';
          const pctv = Api.enrollmentProgress(e);
          const cat = DB.get('categories', c.categoryId);
          return (
            '<div class="course-card card enrolled">' +
              '<div class="cc-cover ' + c.cover + '">' +
                '<span class="cc-emoji">' + (cat ? cat.icon : '📘') + '</span>' +
              '</div>' +
              '<div class="cc-body">' +
                '<h3 class="cc-title">' + esc(c.title) + '</h3>' +
                '<p class="cc-meta">' + esc(c.stage || '') + '</p>' +
                '<div class="enr-progress"><span><b>' + pctv + '%</b> مكتمل</span>' + progress(pctv) + '</div>' +
                '<div class="cc-foot">' +
                  '<a class="btn btn-primary btn-sm" href="#/learn/' + c.id + (e.lastLessonId ? '/' + e.lastLessonId : '') + '">' + (pctv > 0 ? '▶ متابعة' : 'ابدأ الآن') + '</a>' +
                  '<a class="btn btn-ghost btn-sm" href="#/course/' + c.id + '">تفاصيل</a>' +
                '</div>' +
              '</div>' +
            '</div>'
          );
        }).join('') +
      '</div>'
    );
  }

  // ================= الاختبارات =================
  function quizzesPage() {
    const u = Auth.user();
    const enrs = Api.studentEnrollments(u.id);
    const quizzes = enrs.flatMap(e => DB.query('quizzes', qz => qz.courseId === e.courseId));
    const attempts = DB.query('attempts', a => a.studentId === u.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const mistakeCard = (function () {
      const mc = Api.mistakeCount(u.id);
      if (!mc) return '<div class="mistake-banner card-flat ok"><div><b>🌟 لا أخطاء معلقة</b><small>أجبت عن كل أسئلة اختباراتك السابقة إجابة صحيحة — استمر!</small></div></div>';
      return '<div class="mistake-banner card-flat">' +
          '<div><b>🎯 امتحان من أخطائك (' + mc + ' سؤال)</b>' +
          '<small>امتحان مولّد خصيصًا من كل الأسئلة التي أخطأت فيها سابقًا — يحل الصحيح فيختفي من البنك نهائيًا.</small></div>' +
          '<button class="btn btn-primary btn-sm" data-action="start-mistake-exam">ابدأ الآن</button></div>';
    })();

    return (
      mistakeCard +
      '<div class="two-col">' +
        '<div class="panel card"><h2 class="panel-title">🧪 الاختبارات المتاحة لك</h2>' +
          (quizzes.length
            ? quizzes.map(qz => {
                const crs = DB.get('courses', qz.courseId);
                const myAtts = Api.quizAttempts(qz.id, u.id);
                return '<div class="quiz-row card-flat">' +
                  '<div><b>' + esc(qz.title) + '</b>' +
                  '<small>📖 ' + esc(crs ? crs.title : '') + ' · ' + qz.questions.length + ' أسئلة' +
                  (myAtts.length ? ' · أفضل نتيجة: ' + Math.max.apply(null, myAtts.map(a => a.score)) + '/' + qz.questions.length : '') + '</small></div>' +
                  '<button class="btn btn-outline btn-sm" data-action="open-quiz" data-quiz="' + qz.id + '">' + (myAtts.length ? 'إعادة' : 'ابدأ') + '</button>' +
                '</div>';
              }).join('')
            : emptyState('🧪', 'لا اختبارات متاحة', 'اشترك في كورسات تحتوي اختبارات')) +
        '</div>' +
        '<div class="panel card"><h2 class="panel-title">📊 سجل محاولاتي (' + attempts.length + ')</h2>' +
          (attempts.length
            ? attempts.map(a => {
                const qz = DB.get('quizzes', a.quizId);
                const pctv = Math.round((a.score / a.total) * 100);
                return '<div class="quiz-row card-flat">' +
                  '<div><b>' + esc(qz ? qz.title : '—') + '</b><small>' + UI.fdate(a.createdAt, true) + '</small></div>' +
                  '<span class="score-pill ' + (pctv >= 50 ? 'pass' : 'fail') + '">' + a.score + '/' + a.total + ' · ' + pctv + '%</span>' +
                '</div>';
              }).join('')
            : emptyState('📭', 'لا محاولات بعد')) +
        '</div>' +
      '</div>'
    );
  }

  App.action('start-mistake-exam', () => {
    const exam = Api.refreshMistakeExam(Auth.user().id);
    if (!exam) { toast('لا توجد أخطاء متاحة الآن — برافو عليك! 🌟'); return; }
    if (window.Actions && window.Actions['open-quiz']) {
      window.Actions['open-quiz']({ dataset: { quiz: exam.id } });
    } else {
      toast('تعذر فتح الامتحان، أعد المحاولة', 'error');
    }
  });

  // ================= الواجبات =================
  function homeworkPage() {
    const u = Auth.user();
    const enrs = Api.studentEnrollments(u.id);
    const hws = enrs.flatMap(e => Api.courseHomework(e.courseId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!hws.length) return emptyState('🗂️', 'لا واجبات في كورساتك الحالية');

    return (
      '<div class="table-wrap card"><table class="data-table">' +
        '<thead><tr><th>الواجب</th><th>الكورس</th><th>آخر موعد</th><th>الحالة</th><th>التقييم</th><th></th></tr></thead><tbody>' +
        hws.map(hw => {
          const crs = DB.get('courses', hw.courseId);
          const sub = Api.submission(hw.id, u.id);
          const late = new Date(hw.dueDate) < new Date();
          let status = sub ? badge(sub.grade != null ? 'graded' : 'submitted')
            : late ? '<span class="badge b-danger">انتهى الموعد</span>'
            : '<span class="badge b-warn">قيد الانتظار</span>';
          return '<tr>' +
            '<td><b>' + esc(hw.title) + '</b></td>' +
            '<td>' + esc(crs ? crs.title.slice(0, 28) : '') + '</td>' +
            '<td>' + UI.fdate(hw.dueDate) + '</td>' +
            '<td>' + status + '</td>' +
            '<td>' + (sub && sub.grade != null ? '<b class="grade-ok">' + sub.grade + '/' + hw.maxGrade + '</b>' + (sub.feedback ? '<br/><small>' + esc(sub.feedback) + '</small>' : '') : '—') + '</td>' +
            '<td>' + (!sub && !late ? '<button class="btn btn-outline btn-sm" data-action="hw-open" data-hw="' + hw.id + '">سلّم</button>' : '') + '</td>' +
          '</tr>';
        }).join('') +
        '</tbody></table></div>'
    );
  }

  // ================= المحفظة =================
  function walletPage() {
    const u = Auth.user();
    const txs = Api.transactions(u.id);

    return (
      '<div class="wallet-hero card">' +
        '<div class="wh-blob b1"></div><div class="wh-blob b2"></div>' +
        '<small>رصيد المحفظة الحالي</small>' +
        '<h1>' + money(u.walletBalance) + '</h1>' +
        '<button class="btn btn-white" data-action="deposit-open">＋ شحن المحفظة</button>' +
      '</div>' +
      '<div class="panel card"><h2 class="panel-title">💳 سجل المعاملات (' + txs.length + ')</h2>' +
        (txs.length
          ? '<div class="table-wrap"><table class="data-table">' +
              '<thead><tr><th>العملية</th><th>النوع</th><th>المبلغ</th><th>المرجع</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>' +
              txs.map(t => {
                const st = t.status || 'approved';
                const stLabel = { approved: '✅ منفذة', pending: '⏳ بانتظار التأكيد', rejected: '❌ مرفوضة' }[st] || st;
                return '<tr>' +
                  '<td>' + esc(t.description) + (t.method ? '<br/><small>الوسيلة: ' + esc(t.method) + '</small>' : '') + '</td>' +
                  '<td>' + badge(t.type) + '</td>' +
                  '<td class="' + (t.type === 'deposit' || t.type === 'refund' ? 'amt-in' : 'amt-out') + '">' +
                    (t.type === 'deposit' || t.type === 'refund' ? '+' : '−') + ' ' + money(t.amount) + '</td>' +
                  '<td dir="ltr"><small>' + esc(t.ref || '—') + '</small></td>' +
                  '<td><span class="tx-st st-' + st + '">' + stLabel + '</span></td>' +
                  '<td>' + UI.fdate(t.createdAt, true) + '</td>' +
                '</tr>';
              }).join('') +
              '</tbody></table></div>'
          : emptyState('💳', 'لا معاملات بعد', 'اشحن محفظتك لتبدأ الاشتراك في الكورسات')) +
      '</div>'
    );
  }

  App.action('deposit-open', () => {
    const methods = Seed.meta.PAY_METHODS;
    const m = UI.modal({
      title: '💰 شحن المحفظة — تحويل حقيقي + تأكيد الإدارة',
      body:
        '<form data-form="do-deposit">' +
          '<div class="amount-presets">' +
            [100, 300, 500, 1000].map(v => '<button type="button" class="preset-btn" data-v="' + v + '">' + v + '</button>').join('') +
          '</div>' +
          '<label class="field"><span>المبلغ (بالجنيه) — أقل شحن 50</span><input type="number" name="amount" min="50" step="10" value="300" required/></label>' +
          '<label class="field"><span>طريقة التحويل</span><select name="method">' + methods.map(x => '<option>' + x + '</option>').join('') + '</select></label>' +
          '<label class="field"><span>رقم عملية التحويل / رقم المرسل (إجباري)</span><input name="ref" placeholder="مثال: آخر 4 أرقام من رقم العملية أو رقم موبايل المرسل" required dir="ltr"/></label>' +
          '<div class="receipt-upload">' +
            '<label class="field"><span>📷 صورة فاتورة التحويل (إجبارية — إنستاباي أو إيصال حقيقي)</span><input type="file" accept="image/*" capture="environment" class="receipt-file" required/></label>' +
            '<img class="receipt-prev hide" alt="معاينة صورة الفاتورة"/>' +
          '</div>' +
          '<input type="hidden" name="receiptData" value=""/>' +
          '<p class="hint">🧾 حوّل المبلغ فعليًا على الرقم <b dir="ltr">01226132179</b> (فودافون كاش / إنستاباي / فوري)، صوّر الإيصال وارفعه هنا مع مرجع التحويل. تؤكد الإدارة الطلب ويُضاف الرصيد فورًا بعد المراجعة.</p>' +
          '<p class="hint">📞 للدعم والاستفسار: <b dir="ltr">01226132179</b></p>' +
          '<button class="btn btn-primary btn-block" type="submit">📨 إرسال طلب الشحن</button>' +
        '</form>'
    });
    m.root.addEventListener('click', e => {
      const b = e.target.closest('.preset-btn');
      if (b) m.root.querySelector('input[name="amount"]').value = b.dataset.v;
    });
    m.root.querySelector('.receipt-file').addEventListener('change', function () {
      const prev = m.root.querySelector('.receipt-prev');
      if (!this.files || !this.files[0]) { prev.classList.add('hide'); return; }
      UI.compressImage(this.files[0], 900, 0.7).then(url => {
        m.root.querySelector('input[name="receiptData"]').value = url;
        prev.src = url; prev.classList.remove('hide');
      }).catch(err => { toast(err.message, 'error'); this.value = ''; });
    });
  });

  App.action('do-deposit', form => {
    try {
      const receipt = form.receiptData.value;
      Api.requestDeposit(Auth.user().id, Number(form.amount.value), form.method.value, form.ref.value, receipt);
      document.querySelectorAll('.modal-overlay').forEach(x => x.remove());
      toast('📨 أُرسل الطلب بصورة الفاتورة — بانتظار تأكيد الإدارة');
      App.render();
    } catch (err) { toast(err.message, 'error'); }
  });

  // ================= الإعلانات =================
  function announcementsPage() {
    const list = Api.announcementsFor(Auth.user());
    if (!list.length) return emptyState('📢', 'لا إعلانات حاليًا');
    return '<div class="ann-list">' + list.map(a =>
      '<div class="ann-card card">' +
        '<div class="ann-head"><span class="ann-icon">📢</span>' +
          '<div><h3>' + esc(a.title) + '</h3><time>' + UI.fdate(a.createdAt, true) + '</time></div>' +
          badge(a.audience === 'all' ? 'active' : 'pending').replace(/نشط|قيد المراجعة/, a.audience === 'all' ? 'للجميع' : a.audience === 'students' ? 'للطلاب' : 'للمدرسين') +
        '</div>' +
        '<p>' + esc(a.body) + '</p>' +
      '</div>').join('') + '</div>';
  }

  // ================= الإشعارات =================
  function notificationsPage() {
    const u = Auth.user();
    const list = Api.notifications(u.id);
    return (
      '<div class="row-between mb16"><h2 class="panel-title-inline">🔔 كل الإشعارات (' + list.length + ')</h2>' +
        (list.some(n => !n.read) ? '<button class="btn btn-outline btn-sm" data-action="mark-read-page">تعليم الكل كمقروء</button>' : '') +
      '</div>' +
      (list.length
        ? '<div class="panel card">' + list.map(n =>
            '<div class="notif-item ' + (n.read ? '' : 'unread') + ' static">' +
              '<span class="notif-icon">' + n.icon + '</span>' +
              '<div><b>' + esc(n.title) + '</b><p>' + esc(n.body) + '</p><time>' + UI.fdate(n.createdAt, true) + '</time></div>' +
            '</div>').join('') + '</div>'
        : emptyState('🔕', 'لا إشعارات حتى الآن'))
    );
  }

  App.action('mark-read-page', () => {
    Api.markAllRead(Auth.user().id);
    toast('تم تعليم الجميع كمقروء ✅');
    App.render();
  });

  // ================= الملف الشخصي =================
  function profilePage() {
    const u = Auth.user();
    return (
      '<div class="two-col">' +
        '<div class="panel card"><h2 class="panel-title">👤 البيانات الشخصية</h2>' +
          '<form data-form="save-profile">' +
            '<div class="avatar-picker">' +
              Seed.meta.AVATARS.map((a, i) =>
                '<button type="button" class="av-opt ' + a.g + (JSON.stringify(u.avatar) === JSON.stringify(a) ? ' selected' : '') + '" data-i="' + i + '">' + a.e + '</button>').join('') +
              '<input type="hidden" name="avatarIdx" value="' + Seed.meta.AVATARS.findIndex(a => JSON.stringify(a) === JSON.stringify(u.avatar)) + '"/>' +
            '</div>' +
            '<label class="field"><span>الاسم الكامل</span><input name="name" value="' + esc(u.name) + '" required/></label>' +
            '<label class="field"><span>البريد الإلكتروني (غير قابل للتعديل)</span><input value="' + esc(u.email) + '" disabled dir="ltr"/></label>' +
            '<label class="field"><span>رقم هاتفك (اختياري)</span><input name="phone" value="' + esc(u.phone || '') + '" dir="ltr"/></label>' +
            '<label class="field"><span>📱 رقم ولي الأمر (إجباري)</span><input name="guardianPhone" pattern="01[0125][0-9]{8}" title="11 رقمًا تبدأ بـ 010 أو 011 أو 012 أو 015" value="' + esc(u.guardianPhone || '') + '" required dir="ltr"/></label>' +
            '<label class="field"><span>المرحلة الدراسية</span><select name="stage">' +
              Seed.meta.STAGES.map(s => '<option' + (u.stage === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></label>' +
            '<button class="btn btn-primary" type="submit">💾 حفظ التعديلات</button>' +
          '</form>' +
        '</div>' +
        '<div class="panel card"><h2 class="panel-title">🔐 تغيير كلمة المرور</h2>' +
          '<form data-form="change-password">' +
            '<label class="field"><span>كلمة المرور الحالية</span><input type="password" name="oldPw" required/></label>' +
            '<label class="field"><span>كلمة المرور الجديدة (8+ أحرف)</span><input type="password" name="newPw" minlength="8" required/></label>' +
            '<button class="btn btn-outline" type="submit">تحديث كلمة المرور</button>' +
          '</form>' +
          '<hr/>' +
          '<div class="card-flat"><b>💡 نصيحة أمان</b><p>في النسخة المتصلة بالخادم تتم إدارة كلمات المرور عبر Supabase Auth بتشفير كامل.</p></div>' +
        '</div>' +
      '</div>'
    );
  }

  App.action('save-profile', form => {
    const u = Auth.user();
    const g = String(form.guardianPhone.value).trim();
    if (!/^01[0125][0-9]{8}$/.test(g)) { toast('رقم ولي الأمر غير صحيح — 11 رقمًا تبدأ بـ 010/011/012/015', 'error'); return; }
    const idx = Number(form.avatarIdx.value);
    const patch = {
      name: form.name.value.trim() || u.name,
      phone: form.phone.value,
      guardianPhone: g,
      stage: form.stage.value,
      avatar: Seed.meta.AVATARS[idx >= 0 ? idx : 0]
    };
    DB.update('users', u.id, patch);
    Object.assign(u, patch); // تحديث المستخدم الحالي مباشرة
    toast('تم حفظ ملفك الشخصي ✅');
    App.render();
  });

  // اختيار الأفاتار
  document.addEventListener('click', e => {
    const opt = e.target.closest('.av-opt');
    if (!opt) return;
    const wrap = opt.closest('.avatar-picker');
    wrap.querySelectorAll('.av-opt').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    wrap.querySelector('input[name="avatarIdx"]').value = opt.dataset.i;
  });

  App.action('change-password', form => {
    try {
      Auth.changePassword(Auth.user().id, form.oldPw.value, form.newPw.value);
      toast('تم تغيير كلمة المرور بنجاح 🔐');
      form.reset();
    } catch (err) { toast(err.message, 'error'); }
  });
})();
