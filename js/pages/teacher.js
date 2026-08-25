/* =========================================================
   Ustadhy Pro — لوحة تحكم المدرس
   نظرة عامة / الكورسات / محرر الكورس / الطلاب / الاختبارات /
   التصحيح / التقييمات / الإعلانات / الملف الشخصي
   ========================================================= */
(function () {
  'use strict';
  if (!window.Pages) window.Pages = {};
  const DB = window.DB, Api = window.Api;
  const { esc, money, num, stars, progress, avatar, emptyState, badge, mins, toast, modal, confirm } = window.UI;

  // ================= شاشة الانتظار/التعليق =================
  function pendingScreen(status) {
    const isPending = status === 'pending';
    return '<div class="pending-screen card">' +
      '<div class="big-icon">' + (isPending ? '⏳' : '🚫') + '</div>' +
      '<h1>' + (isPending ? 'طلبك قيد المراجعة' : 'تم تعليق حسابك') + '</h1>' +
      '<p>' + (isPending
        ? 'شكرًا لانضمامك إلى فهمني! يراجع فريق الإدارة بياناتك حاليًا، وسيصلك إشعار فور الموافقة لتتمكن من إنشاء كورساتك ونشرها.'
        : 'تواصل مع إدارة المنصة لمعرفة التفاصيل وإعادة تفعيل حسابك.') + '</p>' +
      (isPending ? '<div class="steps-row">' +
          ['📨 تقديم الطلب', '🔍 مراجعة الإدارة', '✅ التفعيل', '🎓 إنشاء الكورسات']
            .map((s, i) => '<span class="step-chip' + (i < 2 ? ' done' : '') + '">' + s + '</span>').join('') + '</div>'
        : '') +
      '<a class="btn btn-outline" href="#/">العودة للمنصة</a>' +
    '</div>';
  }
  Pages.teacherPendingScreen = () => pendingScreen(Auth.user() ? Auth.user().status : 'pending');

  // ================= نقطة الدخول =================
  const TABS = {
    overview: () => overview(),
    courses: () => coursesPage(),
    students: () => studentsPage(),
    quizzes: () => quizzesPage(),
    grading: () => gradingPage(),
    reviews: () => reviewsPage(),
    announcements: () => announcementsPage(),
    messages: () => window.Pages.chat(),
    profile: () => profilePage()
  };

  Pages.teacher = function (tab, param) {
    const u = Auth.user();
    if (!u || u.role !== 'teacher') return emptyState('⛔', 'غير مصرح');
    if ((u.status === 'pending' || u.status === 'suspended') && tab !== 'profile')
      return pendingScreen(u.status);
    if (tab === 'course-editor' && param) return courseEditor(param);
    return (TABS[tab] || TABS.overview)();
  };

  function statCard(icon, val, label, cls) {
    return '<div class="stat-card card"><span class="sc-icon ' + (cls || '') + '">' + icon + '</span>' +
      '<div><b>' + val + '</b><span>' + label + '</span></div></div>';
  }

  // ================= نظرة عامة =================
  function overview() {
    const u = Auth.user();
    const st = Api.teacherStats(u.id);
    const revChart = Api.revenueByMonth(6).map(m => ({ ...m }));
    // إعادة حساب الإيراد الشهري خاص بالمدرس فقط
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(); dt.setDate(1); dt.setMonth(dt.getMonth() - i);
      const key = dt.getFullYear() + '-' + dt.getMonth();
      let sum = 0;
      Api.teacherCourses(u.id).forEach(c => Api.courseEnrollments(c.id).forEach(e => {
        const d2 = new Date(e.createdAt);
        if (d2.getFullYear() + '-' + d2.getMonth() === key) sum += e.pricePaid;
      }));
      months.push({ label: new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'short' }).format(dt), value: sum });
    }

    const recentEnrs = [];
    Api.teacherCourses(u.id).forEach(c => Api.courseEnrollments(c.id)
      .forEach(e => recentEnrs.push({ e, c })));
    recentEnrs.sort((a, b) => new Date(b.e.createdAt) - new Date(a.e.createdAt));
    const recentReviews = Api.targetReviews('teacher', u.id).slice(0, 4);

    return (
      '<div class="welcome-head"><div><h1>لوحة الأستاذ 🎓</h1><p>تابع أداء كورساتك وطلابك لحظة بلحظة</p></div>' +
        '<button class="btn btn-primary" data-action="course-form-open">＋ كورس جديد</button></div>' +

      '<div class="stats-row stats-5">' +
        statCard('👥', num(st.students), 'إجمالي طلابي', 'c-indigo') +
        statCard('🎓', num(st.published) + '/' + num(st.courses), 'كورسات منشورة', 'c-green') +
        statCard('💰', money(st.revenue), 'إجمالي الإيرادات', 'c-amber') +
        statCard('⭐', num(st.rating.avg) || '—', 'متوسط تقييمي', 'c-purple') +
        statCard('👁️', num(st.views), 'مشاهدات الكورسات', 'c-cyan') +
      '</div>' +

      '<div class="two-col">' +
        '<div class="panel card"><h2 class="panel-title">📈 إيرادات آخر 6 أشهر</h2>' +
          UI.lineChart(months) + '</div>' +
        '<div class="panel card"><h2 class="panel-title">🆕 أحدث الاشتراكات</h2>' +
          (recentEnrs.length
            ? recentEnrs.slice(0, 6).map(({ e, c }) => {
                const s = DB.get('users', e.studentId);
                return '<div class="quiz-row card-flat">' + avatar(s, 'sm') +
                  '<div style="flex:1"><b>' + esc(s ? s.name : '—') + '</b><small>' + esc(c.title.slice(0, 30)) + '</small></div>' +
                  '<span class="amt-in">+' + money(e.pricePaid) + '</span>' +
                '</div>';
              }).join('')
            : emptyState('👥', 'لا مشتركين بعد')) +
        '</div>' +
      '</div>' +

      '<div class="panel card"><h2 class="panel-title">⭐ أحدث التقييمات</h2>' +
        (recentReviews.length
          ? recentReviews.map(rv => {
              const s = DB.get('users', rv.studentId);
              return '<div class="review-item">' + avatar(s, 'sm') +
                '<div class="rv-body"><div class="rv-head"><b>' + esc(s ? s.name : '') + '</b>' + stars(rv.rating) +
                '<time>' + UI.relTime(rv.createdAt) + '</time></div><p>' + esc(rv.comment || 'بدون تعليق') + '</p></div></div>';
            }).join('')
          : emptyState('💭', 'لا تقييمات بعد')) +
      '</div>'
    );
  }

  // ================= إدارة الكورسات =================
  function coursesPage() {
    const u = Auth.user();
    const list = Api.teacherCourses(u.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (!list.length)
      return emptyState('🎓', 'لم تنشئ أي كورس بعد', 'ابدأ بكورسك الأول وانشره لآلاف الطلاب',
        '<button class="btn btn-primary" data-action="course-form-open">＋ إنشاء كورس</button>');

    return (
      '<div class="row-between mb16"><h2 class="panel-title-inline">🎓 كورساتي (' + list.length + ')</h2>' +
        '<button class="btn btn-primary" data-action="course-form-open">＋ كورس جديد</button></div>' +
      '<div class="table-wrap card"><table class="data-table">' +
        '<thead><tr><th>الكورس</th><th>الحالة</th><th>الطلاب</th><th>التقييم</th><th>السعر</th><th>المحتوى</th><th>إجراءات</th></tr></thead><tbody>' +
        list.map(c => {
          const r = Api.courseRating(c.id);
          const cat = DB.get('categories', c.categoryId);
          return '<tr>' +
            '<td><div class="cell-title"><span class="mini-cover ' + c.cover + '">' + (cat ? cat.icon : '') + '</span><div><b>' + esc(c.title.slice(0, 34)) + '</b><small>' + esc(cat ? cat.name : '') + ' · ' + esc(c.stage || '') + '</small></div></div></td>' +
            '<td>' + badge(c.status) + '</td>' +
            '<td>' + num(Api.courseStudentsCount(c.id)) + '</td>' +
            '<td>' + (r.count ? stars(r.avg, r.count) : '—') + '</td>' +
            '<td><b>' + money(c.price) + '</b></td>' +
            '<td><small>🎬 ' + Api.courseLessons(c.id).length + ' · 📝 ' + DB.query('quizzes', q => q.courseId === c.id).length + ' · 📂 ' + Api.courseHomework(c.id).length + '</small></td>' +
            '<td class="actions-cell">' +
              '<a class="btn btn-outline btn-sm" href="#/teacher/course-editor/' + c.id + '">⚙️ إدارة</a>' +
              '<button class="btn btn-ghost btn-sm" data-action="toggle-publish" data-id="' + c.id + '">' + (c.status === 'published' ? '📥 إلغاء النشر' : '📤 نشر') + '</button>' +
              '<button class="btn btn-danger-ghost btn-sm" data-action="delete-course" data-id="' + c.id + '">🗑️</button>' +
            '</td>' +
          '</tr>';
        }).join('') +
        '</tbody></table></div>'
    );
  }

  // نموذج إنشاء/تعديل كورس
  App.action('course-form-open', el => {
    const editing = el.dataset.id ? DB.get('courses', el.dataset.id) : null;
    const cats = DB.all('categories');
    const covers = Seed.meta.COVERS;
    modal({
      title: editing ? '✏️ تعديل الكورس' : '＋ إنشاء كورس جديد',
      size: 'lg',
      body:
        '<form data-form="' + (editing ? 'edit-course' : 'create-course') + '" data-id="' + (editing ? editing.id : '') + '">' +
          '<label class="field"><span>اسم الكورس *</span><input name="title" value="' + esc(editing ? editing.title : '') + '" required placeholder="مثال: شرح الفيزياء للصف الثالث الثانوي"/></label>' +
          '<label class="field"><span>وصف الكورس *</span><textarea name="description" rows="3" required placeholder="ماذا سيتعلم الطالب في هذا الكورس؟">' + esc(editing ? editing.description : '') + '</textarea></label>' +
          '<div class="form-grid">' +
            '<label class="field"><span>القسم *</span><select name="categoryId">' +
              cats.map(c => '<option value="' + c.id + '"' + (editing && editing.categoryId === c.id ? ' selected' : '') + '>' + c.icon + ' ' + esc(c.name) + '</option>').join('') + '</select></label>' +
            '<label class="field"><span>المرحلة *</span><select name="stage">' +
              Seed.meta.STAGES.map(s => '<option' + (editing && editing.stage === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></label>' +
            '<label class="field"><span>السعر (ج.م) — اكتب 0 للمجاني *</span><input type="number" name="price" min="0" step="10" value="' + (editing ? editing.price : 250) + '" required/></label>' +
          '</div>' +
          '<div class="field"><span>غلاف الكورس</span><div class="cover-picker">' +
            covers.map(gv => '<button type="button" class="cover-opt ' + gv + (editing ? (editing.cover === gv ? ' selected' : '') : (gv === 'g1' ? ' selected' : '')) + '" data-g="' + gv + '"></button>').join('') +
            '<input type="hidden" name="cover" value="' + (editing ? editing.cover : 'g1') + '"/>' +
          '</div></div>' +
          '<button class="btn btn-primary btn-block" type="submit">' + (editing ? '💾 حفظ التعديلات' : '🚀 إنشاء الكورس') + '</button>' +
        '</form>'
    });
    const root = document.querySelector('.modal-overlay:last-child');
    root.addEventListener('click', e => {
      const b = e.target.closest('.cover-opt');
      if (!b) return;
      root.querySelectorAll('.cover-opt').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      root.querySelector('input[name="cover"]').value = b.dataset.g;
    });
  });

  App.action('create-course', form => {
    const c = DB.insert('courses', {
      id: UST.uid('c'), title: form.title.value.trim(), description: form.description.value.trim(),
      teacherId: Auth.user().id, categoryId: form.categoryId.value, stage: form.stage.value,
      price: Number(form.price.value) || 0, cover: form.cover.value, views: 0,
      durationMins: 0, status: 'draft', createdAt: new Date().toISOString()
    });
    toast('تم إنشاء الكورس كمسودة ✅ أضف الدروس ثم انشره');
    document.querySelectorAll('.modal-overlay').forEach(x => x.remove());
    App.go('#/teacher/course-editor/' + c.id);
  });

  App.action('edit-course', form => {
    DB.update('courses', form.dataset.id, {
      title: form.title.value.trim(), description: form.description.value.trim(),
      categoryId: form.categoryId.value, stage: form.stage.value,
      price: Number(form.price.value) || 0, cover: form.cover.value
    });
    toast('تم حفظ التعديلات ✅');
    document.querySelectorAll('.modal-overlay').forEach(x => x.remove());
    App.render();
  });

  App.action('toggle-publish', el => {
    const c = DB.get('courses', el.dataset.id);
    if (!c) return;
    if (c.status !== 'published') {
      const lessonsCount = Api.courseLessons(c.id).length;
      if (!lessonsCount) { toast('أضف درسًا واحدًا على الأقل قبل النشر', 'warn'); App.go('#/teacher/course-editor/' + c.id); return; }
    }
    DB.update('courses', c.id, { status: c.status === 'published' ? 'draft' : 'published' });
    toast(c.status === 'published' ? 'تم إلغاء نشر الكورس' : '🎉 تم نشر الكورس للطلاب!');
    App.render();
  });

  App.action('delete-course', el => {
    const c = DB.get('courses', el.dataset.id);
    if (!c) return;
    confirm('حذف «' + c.title + '» نهائيًا؟ سيُحذف معه كل الدروس والاختبارات والواجبات واشتراكات الطلاب.', 'حذف نهائي').then(ok => {
      if (!ok) return;
      ['sections', 'lessons', 'quizzes', 'homework'].forEach(col =>
        DB.query(col, x => x.courseId === c.id).forEach(x => DB.remove(col, x.id)));
      DB.query('enrollments', x => x.courseId === c.id).forEach(x => DB.remove('enrollments', x.id));
      DB.query('reviews', x => x.targetType === 'course' && x.targetId === c.id).forEach(x => DB.remove('reviews', x.id));
      DB.remove('courses', c.id);
      toast('تم حذف الكورس', 'info');
      App.render();
    });
  });

  // ================= محرر الكورس =================
  function courseEditor(courseId) {
    const c = DB.get('courses', courseId);
    if (!c || c.teacherId !== Auth.user().id) return emptyState('⛔', 'غير مصرح لك بإدارة هذا الكورس');
    const sections = Api.courseSections(courseId);
    const quizzes = DB.query('quizzes', qz => qz.courseId === courseId);
    const hws = Api.courseHomework(courseId);
    const enrs = Api.courseEnrollments(courseId);

    return (
      '<div class="editor-head card">' +
        '<div class="row-between wrap-gap">' +
          '<div><a class="back-link" href="#/teacher/courses">→ عودة لكورساتي</a>' +
            '<h1>' + esc(c.title) + '</h1>' +
            '<div class="chips-row">' + badge(c.status) +
              '<span class="chip chip-stage">👁️ ' + num(c.views) + ' مشاهدة</span>' +
              '<span class="chip chip-stage">👥 ' + enrs.length + ' طالب</span>' +
              '<span class="chip chip-stage">💰 ' + money(c.price) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="wrap-gap">' +
            '<button class="btn btn-ghost" data-action="course-form-open" data-id="' + c.id + '">✏️ تعديل البيانات</button>' +
            '<button class="btn ' + (c.status === 'published' ? 'btn-outline' : 'btn-success-solid') + '" data-action="toggle-publish" data-id="' + c.id + '">' +
              (c.status === 'published' ? '📥 إلغاء النشر' : '📤 نشر الكورس') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* الأقسام والدروس */
      '<div class="panel card">' +
        '<div class="row-between mb16"><h2 class="panel-title-inline">🎬 الأقسام والدروس</h2>' +
          '<button class="btn btn-primary btn-sm" data-action="section-form-open" data-course="' + courseId + '">＋ قسم جديد</button></div>' +
        (sections.length
          ? sections.map((s, si) => {
              const les = Api.sectionLessons(s.id);
              return '<div class="cur-section">' +
                '<div class="cur-head static-head">' +
                  '<span class="cur-num">' + (si + 1) + '</span><b>' + esc(s.title) + '</b>' +
                  '<small>' + les.length + ' دروس</small>' +
                  '<span class="spacer"></span>' +
                  '<button class="icon-btn sm" title="إضافة درس" data-action="lesson-form-open" data-course="' + courseId + '" data-section="' + s.id + '">＋</button>' +
                  '<button class="icon-btn sm danger" title="حذف القسم" data-action="delete-section" data-id="' + s.id + '" data-course="' + courseId + '">🗑️</button>' +
                '</div>' +
                (les.length
                  ? les.map((l, li) =>
                      '<div class="lesson-row manage">' +
                        '<span class="lr-num">' + (li + 1) + '</span>' +
                        '<span class="lr-title"><b>' + esc(l.title) + '</b><small>' + mins(l.durationMins) + (l.attachments.length ? ' · 📄 مرفق' : '') + '</small></span>' +
                        '<span class="spacer"></span>' +
                        '<button class="icon-btn sm" title="تحريك لأعلى"' + (li === 0 ? ' disabled' : '') + ' data-action="move-lesson" data-id="' + l.id + '" data-dir="-1">↑</button>' +
                        '<button class="icon-btn sm" title="تحريك لأسفل"' + (li === les.length - 1 ? ' disabled' : '') + ' data-action="move-lesson" data-id="' + l.id + '" data-dir="1">↓</button>' +
                        '<button class="icon-btn sm" title="تعديل" data-action="lesson-form-open" data-course="' + courseId + '" data-section="' + s.id + '" data-id="' + l.id + '">✏️</button>' +
                        '<button class="icon-btn sm danger" title="حذف" data-action="delete-lesson" data-id="' + l.id + '" data-course="' + courseId + '">🗑️</button>' +
                      '</div>').join('')
                  : '<div class="empty-mini">لا دروس في هذا القسم بعد</div>') +
              '</div>';
            }).join('')
          : emptyState('🗂️', 'ابدأ بإضافة قسم', 'الأقسام تنظّم دروسك في وحدات تعليمية')) +
      '</div>' +

      '<div class="two-col">' +
        /* الاختبارات */
        '<div class="panel card">' +
          '<div class="row-between mb16"><h2 class="panel-title-inline">📝 الاختبارات</h2>' +
            '<button class="btn btn-primary btn-sm" data-action="quiz-builder-open" data-course="' + courseId + '">＋ اختبار جديد</button></div>' +
          (quizzes.length
            ? quizzes.map(qz => {
                const atts = Api.quizAttempts(qz.id);
                const avgScore = atts.length ? Math.round(atts.reduce((s2, a) => s2 + a.score / a.total, 0) / atts.length * 100) : null;
                return '<div class="quiz-row card-flat">' +
                  '<div><b>' + esc(qz.title) + '</b><small>' + qz.questions.length + ' أسئلة · ' + atts.length + ' محاولة' +
                  (avgScore != null ? ' · متوسط النجاح ' + avgScore + '%' : '') + '</small></div>' +
                  '<button class="icon-btn sm danger" data-action="delete-quiz" data-id="' + qz.id + '" data-course="' + courseId + '">🗑️</button>' +
                '</div>';
              }).join('')
            : '<div class="empty-mini">لا اختبارات بعد</div>') +
        '</div>' +
        /* الواجبات */
        '<div class="panel card">' +
          '<div class="row-between mb16"><h2 class="panel-title-inline">📂 الواجبات</h2>' +
            '<button class="btn btn-primary btn-sm" data-action="hw-form-open" data-course="' + courseId + '">＋ واجب جديد</button></div>' +
          (hws.length
            ? hws.map(hw => {
                const subs = Api.homeworkSubmissions(hw.id);
                const gradedN = subs.filter(s2 => s2.grade != null).length;
                return '<div class="quiz-row card-flat">' +
                  '<div><b>' + esc(hw.title) + '</b>' +
                  '<small>📅 ' + UI.fdate(hw.dueDate) + ' · تسليمات: ' + subs.length + ' (مصحح: ' + gradedN + ')</small></div>' +
                  '<div class="wrap-gap">' +
                    '<a class="btn btn-outline btn-sm" href="#/teacher/grading">التصحيح</a>' +
                    '<button class="icon-btn sm danger" data-action="delete-homework" data-id="' + hw.id + '" data-course="' + courseId + '">🗑️</button>' +
                  '</div>' +
                '</div>';
              }).join('')
            : '<div class="empty-mini">لا واجبات بعد</div>') +
        '</div>' +
      '</div>' +

      /* الطلاب المشتركون */
      '<div class="panel card"><h2 class="panel-title">👥 الطلاب المشتركون (' + enrs.length + ')</h2>' +
        (enrs.length
          ? '<div class="table-wrap"><table class="data-table">' +
              '<thead><tr><th>الطالب</th><th>تاريخ الاشتراك</th><th>المبلغ</th><th>التقدم</th></tr></thead><tbody>' +
              enrs.map(e => {
                const s = DB.get('users', e.studentId);
                const pctv = Api.enrollmentProgress(e);
                return '<tr>' +
                  '<td><div class="cell-title">' + avatar(s, 'xs') + '<b>' + esc(s ? s.name : '—') + '</b></div></td>' +
                  '<td>' + UI.fdate(e.createdAt) + '</td>' +
                  '<td><b>' + money(e.pricePaid) + '</b></td>' +
                  '<td style="min-width:140px"><span class="tiny-label">' + pctv + '%</span>' + progress(pctv) + '</td>' +
                '</tr>';
              }).join('') + '</tbody></table></div>'
          : emptyState('👥', 'لا مشتركين بعد', 'انشر كورسك ليصل للطلاب')) +
      '</div>'
    );
  }

  // ===== الأقسام =====
  App.action('section-form-open', el => {
    const m = modal({
      title: '＋ قسم جديد', size: 'sm',
      body: '<form data-form="add-section" data-course="' + el.dataset.course + '">' +
        '<label class="field"><span>اسم القسم</span><input name="title" required placeholder="مثال: الوحدة الثانية — التفاضل"/></label>' +
        '<button class="btn btn-primary btn-block" type="submit">إضافة</button></form>'
    });
    setTimeout(() => m.root.querySelector('input[name="title"]').focus(), 60);
  });

  App.action('add-section', form => {
    const secs = Api.courseSections(form.dataset.course);
    DB.insert('sections', {
      id: UST.uid('sec'), courseId: form.dataset.course,
      title: form.title.value.trim(), order: secs.length
    });
    toast('تمت إضافة القسم ✅');
    document.querySelectorAll('.modal-overlay').forEach(x => x.remove());
    App.render();
  });

  App.action('delete-section', el => {
    const les = Api.sectionLessons(el.dataset.id);
    confirm(les.length ? 'القسم يحتوي ' + les.length + ' دروس وسيتم حذفها جميعًا. متابعة؟' : 'حذف هذا القسم؟', 'حذف').then(ok => {
      if (!ok) return;
      les.forEach(l => DB.remove('lessons', l.id));
      DB.remove('sections', el.dataset.id);
      recalcCourseDuration(el.dataset.course);
      toast('تم حذف القسم', 'info');
      App.render();
    });
  });

  // ===== الدروس =====
  App.action('lesson-form-open', el => {
    const editing = el.dataset.id ? DB.get('lessons', el.dataset.id) : null;
    modal({
      title: editing ? '✏️ تعديل الدرس' : '＋ درس جديد', size: 'lg',
      body:
        '<form data-form="' + (editing ? 'edit-lesson' : 'add-lesson') + '" data-course="' + el.dataset.course + '" data-section="' + el.dataset.section + '" data-id="' + (editing ? editing.id : '') + '">' +
          '<label class="field"><span>عنوان الدرس *</span><input name="title" required value="' + esc(editing ? editing.title : '') + '"/></label>' +
          '<div class="form-grid">' +
            '<label class="field"><span>مدة الدرس (دقيقة) *</span><input type="number" name="duration" min="1" max="300" required value="' + (editing ? editing.durationMins : 30) + '"/></label>' +
            '<label class="field"><span>رابط الفيديو (MP4) *</span><input name="videoUrl" dir="ltr" required placeholder="https://…/video.mp4" value="' + esc(editing ? editing.videoUrl : '') + '"/></label>' +
          '</div>' +
          '<label class="field"><span>وصف الدرس</span><textarea name="description" rows="3">' + esc(editing ? editing.description : '') + '</textarea></label>' +
          '<label class="field"><span>ملف مرفق PDF — الاسم (اختياري)</span><input name="attName" dir="auto" placeholder="ملخص الدرس.pdf" value="' + esc(editing && editing.attachments[0] ? editing.attachments[0].name : '') + '"/></label>' +
          '<p class="hint">💡 في Demo Mode يتم ربط الفيديو عبر رابط مباشر؛ عند الربط بـ Supabase Storage سيتم رفع الملفات فعليًا.</p>' +
          '<button class="btn btn-primary btn-block" type="submit">' + (editing ? '💾 حفظ' : '＋ إضافة الدرس') + '</button>' +
        '</form>'
    });
  });

  App.action('add-lesson', form => {
    const secLes = Api.sectionLessons(form.dataset.section);
    const attName = form.attName.value.trim();
    DB.insert('lessons', {
      id: UST.uid('les'), sectionId: form.dataset.section, courseId: form.dataset.course,
      title: form.title.value.trim(), durationMins: Number(form.duration.value) || 20,
      description: form.description.value.trim(),
      videoUrl: form.videoUrl.value.trim(),
      attachments: attName ? [{ name: attName, type: 'pdf', url: '#' }] : [],
      order: secLes.length, createdAt: new Date().toISOString()
    });
    recalcCourseDuration(form.dataset.course);
    toast('تمت إضافة الدرس ✅');
    document.querySelectorAll('.modal-overlay').forEach(x => x.remove());
    App.render();
  });

  App.action('edit-lesson', form => {
    const attName = form.attName.value.trim();
    DB.update('lessons', form.dataset.id, {
      title: form.title.value.trim(), durationMins: Number(form.duration.value) || 20,
      description: form.description.value.trim(), videoUrl: form.videoUrl.value.trim(),
      attachments: attName ? [{ name: attName, type: 'pdf', url: '#' }] : []
    });
    recalcCourseDuration(form.dataset.course);
    toast('تم حفظ الدرس ✅');
    document.querySelectorAll('.modal-overlay').forEach(x => x.remove());
    App.render();
  });

  App.action('delete-lesson', el => {
    confirm('حذف هذا الدرس؟', 'حذف').then(ok => {
      if (!ok) return;
      DB.remove('lessons', el.dataset.id);
      recalcCourseDuration(el.dataset.course);
      toast('تم حذف الدرس', 'info');
      App.render();
    });
  });

  App.action('move-lesson', el => {
    const l = DB.get('lessons', el.dataset.id);
    if (!l) return;
    const siblings = Api.sectionLessons(l.sectionId);
    const i = siblings.findIndex(x => x.id === l.id);
    const j = i + Number(el.dataset.dir);
    if (j < 0 || j >= siblings.length) return;
    DB.update('lessons', siblings[i].id, { order: j });
    DB.update('lessons', siblings[j].id, { order: i });
    App.render();
  });

  function recalcCourseDuration(courseId) {
    const total = Api.courseLessons(courseId).reduce((s, l) => s + (l.durationMins || 0), 0);
    DB.update('courses', courseId, { durationMins: total });
  }

  // ===== بناء الاختبار =====
  App.action('quiz-builder-open', el => {
    modal({
      title: '📝 بناء اختبار جديد', size: 'lg',
      body:
        '<form data-form="save-quiz" data-course="' + el.dataset.course + '">' +
          '<label class="field"><span>عنوان الاختبار *</span><input name="qTitle" required placeholder="مثال: اختبار الوحدة الثالثة"/></label>' +
          '<div id="qbList"></div>' +
          '<div class="row-between wrap-gap mt8">' +
            '<button type="button" class="btn btn-outline btn-sm" data-action="quiz-add-q">＋ إضافة سؤال</button>' +
            '<small class="hint-inline">حدد الخيار الصحيح بالنقر على دائرة الاختيار</small>' +
          '</div>' +
          '<button class="btn btn-primary btn-block mt8" type="submit">💾 حفظ الاختبار</button>' +
        '</form>'
    });
    const listEl = document.getElementById('qbList');
    listEl.innerHTML = questionBlockHTML(listEl.children.length);
  });

  function questionBlockHTML(idx) {
    return (
      '<div class="q-builder card-flat">' +
        '<div class="qb-head"><b>سؤال <span class="qn">' + (idx + 1) + '</span></b>' +
          '<button type="button" class="icon-btn sm danger" data-action="quiz-remove-q">✕</button></div>' +
        '<input class="q-text" placeholder="نص السؤال (اتركه فارغًا إذا اعتمدت على الصورة)"/>' +
        '<div class="q-media">' +
          '<input type="hidden" class="q-image" value=""/>' +
          '<label class="btn btn-outline btn-sm q-img-btn">🖼️ إرفاق صورة السؤال (مثل صورة الكتاب)<input type="file" accept="image/*" class="q-img-file" hidden/></label>' +
          '<button type="button" class="icon-btn sm danger q-img-clear hide">🗑️ إزالة الصورة</button>' +
          '<img class="q-img-prev hide" alt="معاينة صورة السؤال"/>' +
        '</div>' +
        '<div class="qb-opts">' +
          [0, 1, 2, 3].map(oi =>
            '<label class="opt-row"><input type="radio" name="ans_' + idx + '" value="' + oi + '"' + (oi === 0 ? ' checked' : '') + '/>' +
            '<input class="opt-text" placeholder="الخيار ' + (oi + 1) + ' *"/></label>').join('') +
        '</div>' +
        '<small class="hint-inline">الخيارات تظهر للطالب أسفل نص السؤال أو صورته مباشرة، واختر الإجابة الصحيحة من الدائرة.</small>' +
      '</div>'
    );
  }

  // اختيار/إزالة صورة السؤال (ضغط تلقائي قبل الحفظ)
  document.addEventListener('change', e => {
    const f = e.target.closest('.q-img-file');
    if (!f || !f.files || !f.files[0]) return;
    const block = f.closest('.q-builder');
    window.UI.compressImage(f.files[0], 1100, 0.72).then(url => {
      block.querySelector('.q-image').value = url;
      const prev = block.querySelector('.q-img-prev');
      prev.src = url; prev.classList.remove('hide');
      block.querySelector('.q-img-clear').classList.remove('hide');
    }).catch(err => toast(err.message, 'error'));
    f.value = '';
  });
  document.addEventListener('click', e => {
    const cl = e.target.closest('.q-img-clear');
    if (!cl) return;
    const block = cl.closest('.q-builder');
    block.querySelector('.q-image').value = '';
    const prev = block.querySelector('.q-img-prev');
    prev.src = ''; prev.classList.add('hide');
    cl.classList.add('hide');
  });

  App.action('quiz-add-q', () => {
    const listEl = document.getElementById('qbList');
    if (!listEl) return;
    if (listEl.children.length >= 15) { toast('الحد الأقصى 15 سؤالًا', 'warn'); return; }
    listEl.insertAdjacentHTML('beforeend', questionBlockHTML(listEl.children.length));
    renumberQuestions();
  });

  App.action('quiz-remove-q', el => {
    const block = el.closest('.q-builder');
    const listEl = document.getElementById('qbList');
    if (listEl.children.length <= 1) { toast('يجب سؤال واحد على الأقل', 'warn'); return; }
    block.remove();
    renumberQuestions();
  });

  function renumberQuestions() {
    document.querySelectorAll('#qbList .qn').forEach((n, i) => n.textContent = i + 1);
    document.querySelectorAll('#qbList .q-builder').forEach((b, i) => {
      b.querySelectorAll('input[type="radio"]').forEach(r => r.name = 'ans_' + i);
    });
  }

  App.action('save-quiz', form => {
    const blocks = Array.from(document.querySelectorAll('#qbList .q-builder'));
    const questions = [];
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const qt = b.querySelector('.q-text').value.trim();
      const img = b.querySelector('.q-image').value;
      const opts = Array.from(b.querySelectorAll('.opt-text')).map(o => o.value.trim());
      const ansEl = b.querySelector('input[type="radio"]:checked');
      if ((!qt && !img) || opts.some(o => !o)) { toast('السؤال ' + (i + 1) + ': أدخل النص أو الصورة + أكمل جميع الخيارات', 'error'); return; }
      questions.push({ q: qt, image: img || null, options: opts, answer: ansEl ? Number(ansEl.value) : 0 });
    }
    if (!questions.length) { toast('أضف سؤالًا واحدًا على الأقل', 'error'); return; }
    DB.insert('quizzes', {
      id: UST.uid('qz'), courseId: form.dataset.course,
      title: form.qTitle.value.trim(), questions, createdAt: new Date().toISOString()
    });
    toast('تم حفظ الاختبار بنجاح 🎉');
    document.querySelectorAll('.modal-overlay').forEach(x => x.remove());
    App.render();
  });

  App.action('delete-quiz', el => {
    confirm('حذف هذا الاختبار مع كل محاولات الطلاب؟', 'حذف').then(ok => {
      if (!ok) return;
      DB.query('attempts', a => a.quizId === el.dataset.id).forEach(a => DB.remove('attempts', a.id));
      DB.remove('quizzes', el.dataset.id);
      toast('تم حذف الاختبار', 'info');
      App.render();
    });
  });

  // ===== الواجبات =====
  App.action('hw-form-open', el => {
    modal({
      title: '＋ واجب جديد', size: 'lg',
      body:
        '<form data-form="add-homework" data-course="' + el.dataset.course + '">' +
          '<label class="field"><span>عنوان الواجب *</span><input name="title" required placeholder="مثال: حل مسائل الصفحة 45"/></label>' +
          '<label class="field"><span>وصف الواجب والمطلوب *</span><textarea name="description" rows="3" required></textarea></label>' +
          '<div class="form-grid">' +
            '<label class="field"><span>آخر موعد للتسليم *</span><input type="date" name="dueDate" required value="' + new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10) + '"/></label>' +
            '<label class="field"><span>الدرجة العظمى *</span><input type="number" name="maxGrade" min="1" max="100" value="10" required/></label>' +
          '</div>' +
          '<button class="btn btn-primary btn-block" type="submit">＋ إضافة الواجب</button>' +
        '</form>'
    });
  });

  App.action('add-homework', form => {
    DB.insert('homework', {
      id: UST.uid('hw'), courseId: form.dataset.course,
      title: form.title.value.trim(), description: form.description.value.trim(),
      dueDate: new Date(form.dueDate.value + 'T23:59:00').toISOString(),
      maxGrade: Number(form.maxGrade.value) || 10, createdAt: new Date().toISOString()
    });
    // إشعار الطلاب المشتركين
    Api.courseEnrollments(form.dataset.course).forEach(e =>
      Api.notify(e.studentId, '📝', 'لديك واجب جديد', 'أضاف المعلم واجبًا جديدًا: «' + form.title.value.trim() + '». راجع صفحة الواجبات.'));
    toast('تمت إضافة الواجب وإشعار الطلاب ✅');
    document.querySelectorAll('.modal-overlay').forEach(x => x.remove());
    App.render();
  });

  App.action('delete-homework', el => {
    confirm('حذف هذا الواجب وتسليماته؟', 'حذف').then(ok => {
      if (!ok) return;
      DB.query('submissions', s => s.homeworkId === el.dataset.id).forEach(s => DB.remove('submissions', s.id));
      DB.remove('homework', el.dataset.id);
      toast('تم حذف الواجب', 'info');
      App.render();
    });
  });

  // ================= الطلاب =================
  function studentsPage() {
    const u = Auth.user();
    const rows = [];
    Api.teacherCourses(u.id).forEach(c => Api.courseEnrollments(c.id).forEach(e => rows.push({ e, c })));
    rows.sort((a, b) => new Date(b.e.createdAt) - new Date(a.e.createdAt));
    if (!rows.length) return emptyState('👥', 'لا طلاب بعد', 'انشر كورساتك ليجدك الطلاب');
    return (
      '<div class="table-wrap card"><table class="data-table">' +
        '<thead><tr><th>الطالب</th><th>الكورس</th><th>الهاتف</th><th>الاشتراك</th><th>التقدم</th></tr></thead><tbody>' +
        rows.map(({ e, c }) => {
          const s = DB.get('users', e.studentId);
          const pctv = Api.enrollmentProgress(e);
          return '<tr>' +
            '<td><div class="cell-title">' + avatar(s, 'xs') + '<div><b>' + esc(s ? s.name : '—') + '</b><small dir="ltr">' + esc(s ? s.email : '') + '</small></div></div></td>' +
            '<td>' + esc(c.title.slice(0, 30)) + '</td>' +
            '<td dir="ltr">' + esc(s ? s.phone || '—' : '') + '</td>' +
            '<td>' + UI.fdate(e.createdAt) + '</td>' +
            '<td style="min-width:130px"><span class="tiny-label">' + pctv + '%</span>' + progress(pctv) + '</td>' +
          '</tr>';
        }).join('') + '</tbody></table></div>'
    );
  }

  // ================= الاختبارات (عرض شامل) =================
  function quizzesPage() {
    const u = Auth.user();
    const quizzes = Api.teacherCourses(u.id).flatMap(c => DB.query('quizzes', qz => qz.courseId === c.id).map(qz => ({ qz, c })));
    if (!quizzes.length) return emptyState('📝', 'لا اختبارات بعد', 'أنشئ اختبارًا من داخل صفحة إدارة الكورس');
    return (
      '<div class="table-wrap card"><table class="data-table">' +
        '<thead><tr><th>الاختبار</th><th>الكورس</th><th>الأسئلة</th><th>المحاولات</th><th>متوسط النجاح</th></tr></thead><tbody>' +
        quizzes.map(({ qz, c }) => {
          const atts = Api.quizAttempts(qz.id);
          const avgS = atts.length ? Math.round(atts.reduce((s, a) => s + a.score / a.total, 0) / atts.length * 100) : null;
          return '<tr>' +
            '<td><b>' + esc(qz.title) + '</b></td>' +
            '<td>' + esc(c.title.slice(0, 28)) + '</td>' +
            '<td>' + qz.questions.length + '</td>' +
            '<td>' + atts.length + '</td>' +
            '<td>' + (avgS != null ? '<span class="score-pill ' + (avgS >= 50 ? 'pass' : 'fail') + '">' + avgS + '%</span>' : '—') + '</td>' +
          '</tr>';
        }).join('') + '</tbody></table></div>'
    );
  }

  // ================= تصحيح الواجبات =================
  function gradingPage() {
    const u = Auth.user();
    const myCourseIds = Api.teacherCourses(u.id).map(c => c.id);
    const subs = DB.query('submissions', s => {
      const hw = DB.get('homework', s.homeworkId);
      return hw && myCourseIds.includes(hw.courseId);
    }).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    if (!subs.length) return emptyState('✍️', 'لا تسليمات بعد', 'ستظهر هنا حلول الطلاب فور تقديمها');

    const pendingFirst = [...subs.filter(s => s.grade == null), ...subs.filter(s => s.grade != null)];
    return (
      '<div class="table-wrap card"><table class="data-table">' +
        '<thead><tr><th>الطالب</th><th>الواجب</th><th>الحل</th><th>التاريخ</th><th>الحالة</th><th></th></tr></thead><tbody>' +
        pendingFirst.map(s => {
          const st = DB.get('users', s.studentId);
          const hw = DB.get('homework', s.homeworkId);
          return '<tr>' +
            '<td><div class="cell-title">' + avatar(st, 'xs') + '<b>' + esc(st ? st.name : '—') + '</b></div></td>' +
            '<td>' + esc(hw ? hw.title : '') + '</td>' +
            '<td><span class="sol-preview" title="' + esc(s.content) + '">' + esc(s.content.slice(0, 60)) + '…</span></td>' +
            '<td>' + UI.fdate(s.submittedAt, true) + '</td>' +
            '<td>' + badge(s.grade != null ? 'graded' : 'submitted') +
              (s.grade != null ? '<br/><small><b>' + s.grade + '/' + (hw ? hw.maxGrade : '?') + '</b> ' + esc(s.feedback || '') + '</small>' : '') + '</td>' +
            '<td><button class="btn btn-outline btn-sm" data-action="grade-open" data-sub="' + s.id + '">' + (s.grade != null ? 'تعديل التقييم' : 'تصحيح ✍️') + '</button></td>' +
          '</tr>';
        }).join('') + '</tbody></table></div>'
    );
  }

  App.action('grade-open', el => {
    const sub = DB.get('submissions', el.dataset.sub);
    if (!sub) return;
    const hw = DB.get('homework', sub.homeworkId);
    const st = DB.get('users', sub.studentId);
    modal({
      title: '✍️ تصحيح: ' + (hw ? hw.title : ''),
      body:
        '<div class="card-flat sol-full"><b>حل الطالب ' + esc(st ? st.name : '') + ':</b><br/><p>' + esc(sub.content) + '</p></div>' +
        '<form data-form="do-grade" data-sub="' + sub.id + '" class="mt8">' +
          '<div class="form-grid">' +
            '<label class="field"><span>الدرجة (من ' + (hw ? hw.maxGrade : 10) + ') *</span>' +
              '<input type="number" name="grade" min="0" max="' + (hw ? hw.maxGrade : 10) + '" value="' + (sub.grade != null ? sub.grade : '') + '" required/></label>' +
            '<label class="field"><span>تغذية راجعة للطالب</span><input name="feedback" value="' + esc(sub.feedback || '') + '" placeholder="مثال: عمل ممتاز، راجع مسألة 3"/></label>' +
          '</div>' +
          '<button class="btn btn-primary btn-block" type="submit">💾 حفظ التقييم وإشعار الطالب</button>' +
        '</form>'
    });
  });

  App.action('do-grade', form => {
    try {
      Api.gradeSubmission(form.dataset.sub, Number(form.grade.value), form.feedback.value);
      toast('تم حفظ التقييم وإشعار الطالب ✅');
      document.querySelectorAll('.modal-overlay').forEach(x => x.remove());
      App.render();
    } catch (err) { toast(err.message, 'error'); }
  });

  // ================= التقييمات =================
  function reviewsPage() {
    const u = Auth.user();
    const mine = Api.targetReviews('teacher', u.id).map(rv => ({ rv, src: 'تقييم عام للأستاذ' }));
    const courseRevs = Api.teacherCourses(u.id).flatMap(c =>
      Api.targetReviews('course', c.id).map(rv => ({ rv, src: 'كورس: ' + c.title.slice(0, 26) })));
    const all = [...mine, ...courseRevs].sort((a, b) => new Date(b.rv.createdAt) - new Date(a.rv.createdAt));
    if (!all.length) return emptyState('⭐', 'لا تقييمات بعد', 'قيّم طلابك تجربتهم معك بعد أول اشتراك');
    return (
      '<div class="panel card">' +
        all.map(({ rv, src }) => {
          const s = DB.get('users', rv.studentId);
          return '<div class="review-item">' + avatar(s, 'sm') +
            '<div class="rv-body">' +
              '<div class="rv-head"><b>' + esc(s ? s.name : '') + '</b>' + stars(rv.rating) +
                '<em class="src-chip">' + esc(src) + '</em><time>' + UI.relTime(rv.rv.createdAt) + '</time></div>' +
              '<p>' + esc(rv.comment || 'بدون تعليق') + '</p>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>'
    );
  }

  // ================= الإعلانات =================
  function announcementsPage() {
    const list = Api.announcementsFor(Auth.user());
    if (!list.length) return emptyState('📢', 'لا إعلانات حاليًا');
    return '<div class="ann-list">' + list.map(a =>
      '<div class="ann-card card">' +
        '<div class="ann-head"><span class="ann-icon">📢</span>' +
          '<div><h3>' + esc(a.title) + '</h3><time>' + UI.fdate(a.createdAt, true) + '</time></div>' +
        '</div><p>' + esc(a.body) + '</p></div>').join('') + '</div>';
  }

  // ================= الملف الشخصي =================
  function profilePage() {
    const t = Auth.user();
    return (
      '<div class="two-col">' +
        '<div class="panel card"><h2 class="panel-title">👤 بياناتي كمدرس</h2>' +
          '<form data-form="save-teacher-profile">' +
            '<div class="avatar-picker">' +
              Seed.meta.AVATARS.map((a, i) =>
                '<button type="button" class="av-opt ' + a.g + (JSON.stringify(t.avatar) === JSON.stringify(a) ? ' selected' : '') + '" data-i="' + i + '">' + a.e + '</button>').join('') +
              '<input type="hidden" name="avatarIdx" value="' + Seed.meta.AVATARS.findIndex(a => JSON.stringify(a) === JSON.stringify(t.avatar)) + '"/>' +
            '</div>' +
            '<label class="field"><span>الاسم</span><input name="name" value="' + esc(t.name) + '" required/></label>' +
            '<label class="field"><span>البريد (غير قابل للتعديل)</span><input value="' + esc(t.email) + '" disabled dir="ltr"/></label>' +
            '<div class="form-grid">' +
              '<label class="field"><span>الهاتف</span><input name="phone" value="' + esc(t.phone || '') + '" dir="ltr"/></label>' +
              '<label class="field"><span>المادة</span><input name="subject" value="' + esc(t.subject || '') + '"/></label>' +
            '</div>' +
            '<label class="field"><span>المرحلة المستهدفة</span><select name="stage">' +
              Seed.meta.STAGES.map(s => '<option' + (t.stage === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></label>' +
            '<label class="field"><span>نبذة تعريفية (تظهر في صفحتك العامة)</span><textarea name="bio" rows="3">' + esc(t.bio || '') + '</textarea></label>' +
            '<button class="btn btn-primary" type="submit">💾 حفظ</button>' +
          '</form>' +
        '</div>' +
        '<div>' +
          '<div class="panel card"><h2 class="panel-title">🔐 تغيير كلمة المرور</h2>' +
            '<form data-form="change-password-t">' +
              '<label class="field"><span>كلمة المرور الحالية</span><input type="password" name="oldPw" required/></label>' +
              '<label class="field"><span>الجديدة (8+ أحرف)</span><input type="password" name="newPw" minlength="8" required/></label>' +
              '<button class="btn btn-outline" type="submit">تحديث</button>' +
            '</form>' +
          '</div>' +
          '<div class="panel card"><h2 class="panel-title">📊 ملخص حسابي</h2>' +
            (() => { const st = Api.teacherStats(t.id); return (
              '<div class="mini-stats">' +
                '<div><b>' + money(st.revenue) + '</b><span>إيرادات</span></div>' +
                '<div><b>' + st.subscriptions + '</b><span>اشتراكات</span></div>' +
                '<div><b>' + num(st.rating.avg) + '</b><span>تقييم</span></div>' +
              '</div>'); })() +
            '<hr/><a class="link-more" href="#/teacher/' + t.id + '">👁️ معاينة ملفي العام ←</a>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  App.action('save-teacher-profile', form => {
    const t = Auth.user();
    const idx = Number(form.avatarIdx.value);
    const patch = {
      name: form.name.value.trim() || t.name, phone: form.phone.value,
      subject: form.subject.value.trim(), stage: form.stage.value,
      bio: form.bio.value.trim(), avatar: Seed.meta.AVATARS[idx >= 0 ? idx : 0]
    };
    DB.update('users', t.id, patch);
    Object.assign(t, patch);
    toast('تم حفظ بياناتك ✅');
    App.render();
  });

  App.action('change-password-t', form => {
    try {
      Auth.changePassword(Auth.user().id, form.oldPw.value, form.newPw.value);
      toast('تم تغيير كلمة المرور 🔐');
      form.reset();
    } catch (err) { toast(err.message, 'error'); }
  });
})();
