/* =========================================================
   Ustadhy Pro — الصفحات العامة
   الرئيسية / الكورسات / تفاصيل الكورس / مشغل الدروس /
   المدرسون / ملف المدرس
   ========================================================= */
(function () {
  'use strict';
  if (!window.Pages) window.Pages = {};
  const DB = window.DB, Api = window.Api;
  const { esc, money, num, stars, progress, avatar, emptyState, mins, toast, modal, confirm } = window.UI;

  // ================= مكونات مشتركة =================
  function courseCard(c) {
    const t = DB.get('users', c.teacherId);
    const cat = DB.get('categories', c.categoryId);
    const r = Api.courseRating(c.id);
    const students = Api.courseStudentsCount(c.id);
    return (
      '<a class="course-card card" href="#/course/' + c.id + '">' +
        '<div class="cc-cover ' + (c.cover || 'g1') + '">' +
          '<span class="cc-emoji">' + (cat ? cat.icon : '📘') + '</span>' +
          '<span class="chip chip-glass">' + mins(c.durationMins) + '</span>' +
          (c.price === 0 ? '<span class="chip chip-free">مجاني</span>' : '') +
        '</div>' +
        '<div class="cc-body">' +
          '<h3 class="cc-title">' + esc(c.title) + '</h3>' +
          '<p class="cc-meta">' + (cat ? cat.icon + ' ' + esc(cat.name) + ' · ' : '') + esc(c.stage || '') + '</p>' +
          '<div class="cc-teacher">' + avatar(t, 'xs') + '<span>' + esc(t ? t.name : '—') + '</span></div>' +
          '<div class="cc-foot">' +
            '<div class="cc-rating">' + stars(r.avg, r.count) + '</div>' +
            '<div class="cc-price">' + (c.price === 0 ? '<b class="free">مجاني</b>' : '<b>' + money(c.price) + '</b>') + '</div>' +
          '</div>' +
          '<div class="cc-students">👥 ' + num(students) + ' طالب مشترك</div>' +
        '</div>' +
      '</a>'
    );
  }

  function teacherCard(t) {
    const r = Api.teacherRating(t.id);
    return (
      '<a class="teacher-card card" href="#/teacher/' + t.id + '">' +
        '<div class="tc-top ' + (t.avatar && t.avatar.g) + '">' + (t.avatar ? t.avatar.e : '👨‍🏫') + '</div>' +
        '<h3>' + esc(t.name) + '</h3>' +
        '<p class="tc-subject">📗 ' + esc(t.subject || 'مدرس') + '</p>' +
        '<p class="tc-bio">' + esc((t.bio || '').slice(0, 90)) + ((t.bio || '').length > 90 ? '…' : '') + '</p>' +
        '<div class="tc-stats">' +
          '<div><b>' + num(Api.teacherCourses(t.id).filter(c => c.status === 'published').length) + '</b><span>كورس</span></div>' +
          '<div><b>' + num(r.avg || 0) + '</b><span>التقييم</span></div>' +
        '</div>' +
      '</a>'
    );
  }

  // ================= الرئيسية =================
  function home() {
    const stats = Api.adminStats();
    const lessonsCount = DB.all('lessons').length;
    const popular = Api.popularCourses(4);
    const cats = DB.all('categories');
    const teachers = Api.featuredTeachers(3);
    const testimonials = DB.query('reviews', r => r.targetType === 'course' && r.rating >= 4 && r.comment)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
    // أرقام حقيقية 100% من قاعدة البيانات — بدون أي تضخيم
    const topTeacher = teachers[0];
    const topCourse = popular[0];

    setTimeout(animateCounters, 80);

    return (
      /* ===== Hero ===== */
      '<section class="hero">' +
        '<div class="blob blob-1"></div><div class="blob blob-2"></div><div class="blob blob-3"></div>' +
        '<div class="container hero-inner">' +
          '<div class="hero-text">' +
            '<span class="hero-badge">🎓 منصة التعليم العربية</span>' +
            '<h1>تعلّم مع <span class="grad-text">أفضل المدرسين</span><br/>في مكان واحد</h1>' +
            '<p>كورسات تفاعلية، اختبارات ذكية، واجبات مصححة، ومتابعة دقيقة لتقدمك — كل ما تحتاجه للتفوق في مرحلتك الدراسية.</p>' +
            '<form class="hero-search" data-form="search-courses">' +
              '<input name="q" placeholder="ابحث عن كورس أو مدرس أو مادة…" aria-label="بحث"/>' +
              '<button class="btn btn-primary" type="submit">🔍 ابحث</button>' +
            '</form>' +
            '<div class="hero-actions">' +
              '<a class="btn btn-primary btn-lg" href="#/courses">استكشف الكورسات ←</a>' +
              '<a class="btn btn-outline btn-lg" href="#/register?type=teacher">انضم كمدرس</a>' +
            '</div>' +
            '<div class="hero-mini-stats">' +
              '<div><b data-count="' + num(stats.students) + '">0</b><span>طالب مسجل فعليًا</span></div>' +
              '<div><b data-count="' + num(stats.teachers) + '">0</b><span>مدرس على المنصة</span></div>' +
              '<div><b data-count="' + num(stats.subscriptions) + '">0</b><span>اشتراك في الكورسات</span></div>' +
            '</div>' +
          '</div>' +
          '<div class="hero-art" aria-hidden="true">' +
            (topCourse
              ? '<div class="float-card fc-1">🔥 ' + esc(topCourse.title.slice(0, 26)) + '<small>' + num(topCourse.students) + ' مشترك فعلي</small></div>'
              : '') +
            (topTeacher && topTeacher.rating.avg
              ? '<div class="float-card fc-3">' + (topTeacher.avatar ? topTeacher.avatar.e : '👨‍🏫') + ' ' + esc(topTeacher.name.split(' ').slice(-2).join(' ')) + '<small>' + esc(topTeacher.subject || '') + ' · ⭐ ' + num(topTeacher.rating.avg) + '</small></div>'
              : '<div class="float-card fc-3">👨‍🏫 مدرسون معتمدون<small>بمراجعة الإدارة</small></div>') +
            '<div class="float-card fc-2">🎬 <b>' + num(lessonsCount) + '</b> درس مرئي<small>منشور الآن</small></div>' +
            '<div class="hero-ring"></div>' +
          '</div>' +
        '</div>' +
      '</section>' +

      /* ===== الأقسام ===== */
      '<section class="section container">' +
        '<div class="sec-head"><h2>تصفح حسب القسم</h2><p>اختر مادتك وابدأ رحلة التفوق</p></div>' +
        '<div class="cats-grid">' +
          cats.map(cat =>
            '<a class="cat-card" href="#/courses?cat=' + cat.id + '" style="--cat:' + cat.color + '">' +
              '<span class="cat-icon">' + cat.icon + '</span>' +
              '<b>' + esc(cat.name) + '</b>' +
              '<small>' + num(Api.searchCourses({ categoryId: cat.id }).length) + ' كورس</small>' +
            '</a>').join('') +
        '</div>' +
      '</section>' +

      /* ===== الكورسات الأكثر شعبية (تظهر فقط عند وجود كورسات فعلية) ===== */
      (popular.length
        ? '<section class="section container">' +
            '<div class="sec-head row-between"><div><h2>🔥 الأكثر شعبية</h2><p>الكورسات التي يختارها الطلاب أولاً</p></div><a class="link-more" href="#/courses">عرض الكل ←</a></div>' +
            '<div class="grid-courses">' + popular.map(courseCard).join('') + '</div>' +
          '</section>'
        : '<section class="section container">' +
            '<div class="empty-invite card">' +
              '<span class="f-icon">🚀</span>' +
              '<h3>المنصة انطلقت للتو — وكل ما يظهر هنا حقيقي 100%</h3>' +
              '<p>لا نضيف كورسات وهمية أو أرقامًا مصطنعة أبدًا. المحتوى ينمو من المدرسين والطلاب الفعليين فقط.</p>' +
              '<div class="hero-actions" style="justify-content:center;margin-top:14px">' +
                '<a class="btn btn-primary" href="#/register?type=teacher">انشر أول كورس ←</a>' +
                '<a class="btn btn-outline" href="#/register">إنشاء حساب طالب</a>' +
              '</div>' +
            '</div>' +
          '</section>') +

      /* ===== المدرسون المميزون (فقط عند وجود مدرسين معتمدين) ===== */
      (teachers.length
        ? '<section class="section section-alt">' +
            '<div class="container">' +
              '<div class="sec-head row-between"><div><h2>⭐ مدرسون مميزون</h2><p>نخبة المعتمدين على المنصة</p></div><a class="link-more" href="#/teachers">كل المدرسين ←</a></div>' +
              '<div class="grid-teachers">' + teachers.map(teacherCard).join('') + '</div>' +
            '</div>' +
          '</section>'
        : '') +

      /* ===== لماذا نحن ===== */
      '<section class="section container" id="why-us">' +
        '<div class="sec-head"><h2>لماذا فهمني؟</h2><p>تجربة تعليمية متكاملة صُممت بعناية للطالب العربي</p></div>' +
        '<div class="features-grid">' + [
          ['🎯', 'محتوى منظم باحتراف', 'كل كورس مقسم لأقسام ودروس متدرجة مع ملخصات PDF قابلة للتحميل.'],
          ['📝', 'اختبارات فورية', 'اختبر نفسك بعد كل وحدة واحصل على نتيجتك لحظيًا مع حفظ سجل المحاولات.'],
          ['🗂️', 'واجبات مصححة', 'سلّم واجباتك واستلم تصحيحًا وتغذية راجعة مباشرة من معلمك.'],
          ['📊', 'متابعة تقدمك', 'نسبة إنجاز محدثة لكل كورس، ونقاط استئناف تلقائية من حيث توقفت.'],
          ['💰', 'محفظة مرنة', 'اشحن رصيدك واشترك في أي كورس بضغطة واحدة، وسجل كامل لعملياتك.'],
          ['🔔', 'إشعارات ذكية', 'درس جديد؟ واجب؟ نتيجة؟ كل شيء يصلك لحظة حدوثه.']
        ].map(f => '<div class="feature-card card"><span class="f-icon">' + f[0] + '</span><h3>' + f[1] + '</h3><p>' + f[2] + '</p></div>').join('') + '</div>' +
      '</section>' +

      /* ===== إحصائيات المنصة (أرقام فعلية من قاعدة البيانات) ===== */
      '<section class="stats-band">' +
        '<div class="container stats-grid">' + [
          [num(stats.students), 'طالب مسجل'], [num(stats.teachers), 'مدرس'],
          [num(stats.publishedCourses), 'كورس منشور'], [num(lessonsCount), 'درس مرئي']
        ].map(s => '<div class="stat-big"><b><i data-count="' + s[0] + '">0</i></b><span>' + s[1] + '</span></div>').join('') + '</div>' +
      '</section>' +

      /* ===== آراء الطلاب ===== */
      (testimonials.length
        ? '<section class="section container">' +
            '<div class="sec-head"><h2>💬 آراء الطلاب</h2><p>قصص نجاح حقيقية من مجتمعنا</p></div>' +
            '<div class="testimonials-grid">' +
              testimonials.map(rv => {
                const st = DB.get('users', rv.studentId);
                const cr = rv.targetType === 'course' ? DB.get('courses', rv.targetId) : null;
                return '<div class="testimonial card">' +
                  '<div class="t-quote">”</div>' +
                  '<p>' + esc(rv.comment) + '</p>' +
                  '<div class="t-foot">' + avatar(st, 'md') +
                    '<div><b>' + esc(st ? st.name : 'طالب') + '</b>' +
                    '<small>' + (cr ? 'مشترك في: ' + esc(cr.title.slice(0, 34)) : '') + '</small></div>' +
                    '<div class="t-stars">' + stars(rv.rating) + '</div>' +
                  '</div>' +
                '</div>';
              }).join('') +
            '</div>' +
          '</section>'
        : '') +

      /* ===== CTA ===== */
      '<section class="section container">' +
        '<div class="cta-banner">' +
          '<div class="cta-blob b1"></div><div class="cta-blob b2"></div>' +
          '<h2>ابدأ رحلتك التعليمية اليوم 🚀</h2>' +
          '<p>أنشئ حسابك المجاني، اشحن محفظتك، واشترك في أول كورس خلال دقيقتين.</p>' +
          '<div class="cta-actions">' +
            '<a class="btn btn-white btn-lg" href="#/register">إنشاء حساب مجاني</a>' +
            '<a class="btn btn-glassy btn-lg" href="#/courses">تصفح الكورسات</a>' +
          '</div>' +
        '</div>' +
      '</section>'
    );
  }

  function animateCounters() {
    document.querySelectorAll('[data-count]').forEach(el => {
      const raw = el.dataset.count.replace(/[^\d.]/g, '');
      const target = Number(raw) || 0;
      const dur = 1100, t0 = performance.now();
      function tick(t) {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = num(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  // ================= صفحة الكورسات + الفلاتر =================
  function courses(q) {
    const cats = DB.all('categories');
    const stages = Seed.meta.STAGES;
    const filters = Api.searchCourses({
      q: q.q || '', categoryId: q.cat || '', stage: q.stage || '',
      price: q.price || '', minRating: Number(q.rating || 0), sort: q.sort || 'popular'
    });

    const sel = (name, label, options, current) =>
      '<label class="field"><span>' + label + '</span>' +
        '<select name="' + name + '" data-autosubmit>' +
          options.map(o => '<option value="' + o[0] + '"' + (String(current) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') +
        '</select></label>';

    return (
      '<section class="section container page-pad">' +
        '<div class="page-title"><h1>📚 استكشف الكورسات</h1><p>' + num(filters.length) + ' كورس متاح حاليًا على المنصة</p></div>' +
        '<form class="filters-bar card" data-form="search-courses">' +
          '<label class="field grow"><span>البحث</span><input name="q" value="' + esc(q.q || '') + '" placeholder="اسم الكورس، المدرس، المادة…"/></label>' +
          sel('cat', 'القسم', [['', 'كل الأقسام']].concat(cats.map(c => [c.id, c.icon + ' ' + c.name])), q.cat || '') +
          sel('stage', 'المرحلة', [['', 'كل المراحل']].concat(stages.map(s => [s, s])), q.stage || '') +
          sel('price', 'السعر', [['', 'الكل'], ['free', 'مجاني'], ['paid', 'مدفوع']], q.price || '') +
          sel('rating', 'التقييم', [['0', 'الكل'], ['4', '+4 نجوم'], ['4.5', '+4.5']], q.rating || '0') +
          sel('sort', 'ترتيب حسب', [['popular', 'الأكثر رواجًا'], ['newest', 'الأحدث'], ['rating', 'الأعلى تقييمًا'], ['priceAsc', 'السعر ↑'], ['priceDesc', 'السعر ↓']], q.sort || 'popular') +
          '<button class="btn btn-primary" type="submit">تطبيق</button>' +
          '<a class="btn btn-ghost" href="#/courses">مسح ✕</a>' +
        '</form>' +
        (filters.length
          ? '<div class="grid-courses grid-top">' + filters.map(courseCard).join('') + '</div>'
          : emptyState('🔎', 'لا توجد نتائج مطابقة', 'جرّب تعديل الفلاتر أو البحث بكلمة مختلفة',
              '<a class="btn btn-primary" href="#/courses">مسح الفلاتر</a>')) +
      '</section>'
    );
  }

  // ================= تفاصيل الكورس =================
  function courseDetails(id) {
    const c = DB.get('courses', id);
    if (!c) return emptyState('🫥', 'الكورس غير موجود', 'ربما تم حذفه', '<a class="btn btn-primary" href="#/courses">كل الكورسات</a>');
    // عدّاد مشاهدات حقيقي: جلسة واحدة = مشاهدة واحدة لكل كورس
    const viewKey = 'viewed_' + id;
    if (!sessionStorage.getItem(viewKey)) {
      DB.update('courses', id, { views: (c.views || 0) + 1 });
      try { sessionStorage.setItem(viewKey, '1'); } catch (e) {}
    }

    const u = Auth.user();
    const teacher = DB.get('users', c.teacherId);
    const cat = DB.get('categories', c.categoryId);
    const rating = Api.courseRating(id);
    const sections = Api.courseSections(id);
    const enrolled = u ? Api.enrollment(u.id, id) : null;
    const quizzes = DB.query('quizzes', qz => qz.courseId === id);
    const homeworks = Api.courseHomework(id);
    const reviewsList = Api.targetReviews('course', id);
    const myReview = u ? Api.myReview('course', id, u.id) : null;
    const firstLessonId = sections.length && Api.sectionLessons(sections[0].id)[0] ? Api.sectionLessons(sections[0].id)[0].id : null;

    // بطاقة الاشتراك
    let purchaseHtml;
    if (!u) {
      purchaseHtml =
        '<div class="price-row"><b class="price-big">' + (c.price === 0 ? 'مجاني' : money(c.price)) + '</b></div>' +
        '<a class="btn btn-primary btn-block btn-lg" href="#/login">سجّل الدخول للاشتراك</a>' +
        '<p class="hint">لا تملك حساب؟ <a href="#/register">أنشئ حسابًا مجانيًا</a></p>';
    } else if (enrolled) {
      const pctv = Api.enrollmentProgress(enrolled);
      purchaseHtml =
        '<div class="price-row"><b class="price-ok">✓ أنت مشترك في هذا الكورس</b></div>' +
        '<div class="enr-progress"><span>إنجازك: <b>' + pctv + '%</b></span>' + progress(pctv) + '</div>' +
        '<a class="btn btn-primary btn-block btn-lg" href="#/learn/' + id + (enrolled.lastLessonId ? '/' + enrolled.lastLessonId : '') + '">▶ متابعة التعلم</a>';
    } else if (u.role !== 'student') {
      purchaseHtml = '<p class="hint">الاشتراك متاح لحسابات الطلاب فقط.</p>';
    } else {
      const enough = (u.walletBalance || 0) >= c.price;
      purchaseHtml =
        '<div class="price-row"><b class="price-big">' + money(c.price) + '</b></div>' +
        '<button class="btn btn-primary btn-block btn-lg" data-action="subscribe-course" data-course="' + id + '">🛒 اشترك الآن</button>' +
        '<p class="hint">رصيدك الحالي: <b>' + money(u.walletBalance) + '</b>' +
          (enough ? '' : ' — <a href="#/student/wallet">اشحن محفظتك 💰</a>') + '</p>';
    }

    return (
      '<div class="container page-pad">' +
        '<nav class="breadcrumb"><a href="#/">الرئيسية</a> › <a href="#/courses">الكورسات</a> › <span>' + esc(c.title.slice(0, 30)) + '</span></nav>' +

        '<div class="course-hero card ' + (c.cover || 'g1') + '-soft">' +
          '<div class="ch-cover ' + (c.cover || 'g1') + '"><span>' + (cat ? cat.icon : '📘') + '</span></div>' +
          '<div class="ch-info">' +
            '<div class="chips-row">' +
              '<a class="chip chip-cat" href="#/courses?cat=' + (cat ? cat.id : '') + '">' + (cat ? cat.icon + ' ' + esc(cat.name) : '') + '</a>' +
              '<span class="chip chip-stage">🎒 ' + esc(c.stage || '') + '</span>' +
              (c.status !== 'published' ? badge('draft') : '') +
            '</div>' +
            '<h1>' + esc(c.title) + '</h1>' +
            '<p class="ch-desc">' + esc(c.description) + '</p>' +
            '<div class="ch-meta">' +
              '<span class="mm">' + stars(rating.avg, rating.count) + '</span>' +
              '<span class="mm">👥 ' + num(Api.courseStudentsCount(id)) + ' طالب</span>' +
              '<span class="mm">⏱ ' + mins(c.durationMins) + '</span>' +
              '<span class="mm">🎬 ' + num(Api.courseLessons(id).length) + ' درس</span>' +
              '<span class="mm">📝 ' + num(quizzes.length) + ' اختبار</span>' +
              '<span class="mm">📂 ' + num(homeworks.length) + ' واجب</span>' +
            '</div>' +
            '<a class="ch-teacher" href="#/teacher/' + c.teacherId + '">' + avatar(teacher, 'sm') +
              '<div><b>' + esc(teacher ? teacher.name : '') + '</b><small>' + esc(teacher ? (teacher.subject || '') + ' · تقييم ' + num(Api.teacherRating(c.teacherId).avg) : '') + '</small></div>' +
              '<span class="link-more">الملف الشخصي ←</span>' +
            '</a>' +
          '</div>' +
        '</div>' +

        '<div class="course-layout">' +
          '<div class="course-main">' +

            /* المنهج */
            '<div class="panel card">' +
              '<h2 class="panel-title">🗂️ منهج الكورس</h2>' +
              (sections.length
                ? sections.map((s, si) => {
                    const les = Api.sectionLessons(s.id);
                    return '<div class="cur-section">' +
                      '<button class="cur-head" data-action="toggle-curriculum">' +
                        '<span class="cur-num">' + (si + 1) + '</span>' +
                        '<b>' + esc(s.title) + '</b>' +
                        '<small>' + les.length + ' دروس · ' + mins(les.reduce((x, l) => x + l.durationMins, 0)) + '</small>' +
                        '<span class="cur-arrow">▾</span>' +
                      '</button>' +
                      '<div class="cur-body open">' +
                        les.map((l, li) => {
                          const canWatch = !!enrolled || l.id === firstLessonId;
                          const doneMark = enrolled && (enrolled.done || []).includes(l.id);
                          return canWatch
                            ? '<a class="lesson-row watchable" href="#/learn/' + id + '/' + l.id + '">' +
                                '<span class="lr-num">' + (doneMark ? '✅' : '▶') + '</span><span class="lr-title">' + esc(l.title) + '</span>' +
                                (l.id === firstLessonId && !enrolled ? '<em class="chip chip-free">معاينة مجانية</em>' : '') +
                                '<small>' + mins(l.durationMins) + '</small></a>'
                            : '<div class="lesson-row locked"><span class="lr-num">🔒</span><span class="lr-title">' + esc(l.title) + '</span><small>' + mins(l.durationMins) + '</small></div>';
                        }).join('') +
                      '</div>' +
                    '</div>';
                  }).join('')
                : emptyState('📭', 'لم يُضف منهج بعد', 'يعمل المعلم على تجهيز المحتوى')) +
            '</div>' +

            /* الاختبارات والواجبات للمشتركين */
            (enrolled
              ? '<div class="panel card"><h2 class="panel-title">📝 الاختبارات</h2>' +
                (quizzes.length
                  ? quizzes.map(qz => {
                      const atts = Api.quizAttempts(qz.id, u.id);
                      const best = atts.length ? Math.max.apply(null, atts.map(a => a.score)) : null;
                      return '<div class="quiz-row card-flat">' +
                        '<div><b>' + esc(qz.title) + '</b>' +
                        '<small>' + qz.questions.length + ' أسئلة' + (atts.length ? ' · محاولاتك: ' + atts.length + (best != null ? ' · أفضل نتيجة ' + best + '/' + qz.questions.length : '') : '') + '</small></div>' +
                        '<button class="btn btn-outline btn-sm" data-action="open-quiz" data-quiz="' + qz.id + '">' + (atts.length ? 'أعد المحاولة' : 'ابدأ الاختبار') + '</button>' +
                      '</div>';
                    }).join('')
                  : emptyState('🧪', 'لا اختبارات بعد')) +
                '</div>' +

                '<div class="panel card"><h2 class="panel-title">📂 الواجبات</h2>' +
                (homeworks.length
                  ? homeworks.map(hw => {
                      const sub = Api.submission(hw.id, u.id);
                      return '<div class="quiz-row card-flat">' +
                        '<div><b>' + esc(hw.title) + '</b>' +
                        '<small>آخر موعد: ' + UI.fdate(hw.dueDate) + ' · الدرجة العظمى: ' + hw.maxGrade + '</small>' +
                        (sub ? '<small class="ok-line">' + badge(sub.grade != null ? 'graded' : 'submitted') + (sub.grade != null ? ' درجتك: ' + sub.grade + '/' + hw.maxGrade + ' — ' + esc(sub.feedback || '') : '') + '</small>' : '') +
                        '</div>' +
                        (sub ? '' : '<button class="btn btn-outline btn-sm" data-action="hw-open" data-hw="' + hw.id + '">سلّم الواجب</button>') +
                      '</div>';
                    }).join('')
                  : emptyState('🗒️', 'لا واجبات بعد')) +
                '</div>'
              : '') +

            /* التقييمات */
            '<div class="panel card">' +
              '<h2 class="panel-title">⭐ تقييمات الطلاب (' + num(reviewsList.length) + ')</h2>' +
              '<div class="reviews-summary">' + stars(rating.avg, rating.count) + '<span>متوسط تقييم هذا الكورس</span></div>' +
              (myReview
                ? '<div class="card-flat my-review"><b>تقييمك</b> ' + stars(myReview.rating) + '<p>' + esc(myReview.comment || 'بدون تعليق') + '</p>' +
                    '<button class="btn btn-ghost btn-sm" data-action="delete-my-review" data-type="course" data-id="' + id + '">🗑️ حذف تقييمي</button></div>'
                : (enrolled
                    ? '<button class="btn btn-outline" data-action="review-open" data-type="course" data-id="' + id + '">✍️ أضف تقييمك</button>'
                    : '')) +
              (reviewsList.length
                ? reviewsList.map(rv => reviewItem(rv)).join('')
                : (reviewsList.length || myReview ? '' : emptyState('💭', 'لا توجد تقييمات بعد', 'كن أول من يقيم هذا الكورس'))) +
            '</div>' +
          '</div>' +

          /* العمود الجانبي */
          '<aside class="course-side">' +
            '<div class="buy-card card">' + purchaseHtml +
              '<ul class="includes-list">' +
                '<li>🎬 ' + num(Api.courseLessons(id).length) + ' درس مرئي</li>' +
                '<li>📄 ملخصات PDF قابلة للتحميل</li>' +
                '<li>📝 ' + num(quizzes.length) + ' اختبارات تفاعلية</li>' +
                '<li>📂 ' + num(homeworks.length) + ' واجبات مصححة</li>' +
                '<li>♾️ وصول مدى الحياة للكورس</li>' +
                '<li>📱 يعمل على الجوال والحاسوب</li>' +
              '</ul>' +
            '</div>' +
          '</aside>' +
        '</div>' +
      '</div>'
    );
  }

  function reviewItem(rv) {
    const st = DB.get('users', rv.studentId);
    return (
      '<div class="review-item">' +
        avatar(st, 'sm') +
        '<div class="rv-body">' +
          '<div class="rv-head"><b>' + esc(st ? st.name : 'طالب') + '</b>' + stars(rv.rating) + '<time>' + UI.relTime(rv.createdAt) + '</time></div>' +
          '<p>' + esc(rv.comment || 'بدون تعليق') + '</p>' +
        '</div>' +
      '</div>'
    );
  }

  // ================= مشغل الدروس =================
  function learn(courseId, lessonId) {
    const u = Auth.user();
    const c = DB.get('courses', courseId);
    if (!c) return emptyState('🫥', 'الكورس غير موجود', '', '<a class="btn btn-primary" href="#/courses">عودة</a>');
    let enr = Api.enrollment(u.id, courseId);
    const sections = Api.courseSections(courseId);

    // السماح بمعاينة الدرس الأول فقط لغير المشتركين
    const firstLessonId = sections.length && Api.sectionLessons(sections[0].id)[0] && Api.sectionLessons(sections[0].id)[0].id;
    if (!enr && lessonId !== firstLessonId) {
      toast('يجب الاشتراك في الكورس أولاً لمشاهدة الدروس', 'warn');
      location.hash = '#/course/' + courseId;
      return '';
    }
    if (!enr && lessonId === firstLessonId) {
      // جلسة معاينة مؤقتة بدون تسجيل تقدم
      return learnLayout(c, enr, sections, lessonId, true);
    }
    return learnLayout(c, enr, sections, lessonId, false);
  }

  function learnLayout(c, enr, sections, lessonId, preview) {
    const flat = [];
    sections.forEach(s => Api.sectionLessons(s.id).forEach(l => flat.push(l)));
    const lesson = lessonId ? DB.get('lessons', lessonId) : flat.find(l => !enr || !(enr.done || []).includes(l.id)) || flat[0];
    if (!lesson) return emptyState('📭', 'لا توجد دروس بعد في هذا الكورس');

    const pctv = enr ? Api.enrollmentProgress(enr) : 0;
    const doneSet = new Set(enr ? enr.done || [] : []);
    const idx = flat.findIndex(l => l.id === lesson.id);
    const prevL = idx > 0 ? flat[idx - 1] : null;
    const nextL = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;
    const quizzes = DB.query('quizzes', qz => qz.courseId === c.id);
    const homeworks = Api.courseHomework(c.id);
    const isDone = doneSet.has(lesson.id);

    return (
      '<div class="learn-wrap">' +
        '<aside class="learn-side">' +
          '<div class="learn-side-head">' +
            '<a class="back-link" href="#/course/' + c.id + '">→ عودة للكورس</a>' +
            '<b>' + esc(c.title) + '</b>' +
            (preview ? '<span class="chip chip-free">وضع المعاينة المجانية</span>' :
              '<div class="enr-progress"><span><b>' + pctv + '%</b> مكتمل</span>' + progress(pctv) + '</div>') +
          '</div>' +
          '<div class="learn-side-body">' +
            sections.map((s, si) =>
              '<div class="lsec">' +
                '<div class="lsec-title">' + (si + 1) + '. ' + esc(s.title) + '</div>' +
                Api.sectionLessons(s.id).map(l =>
                  '<a class="lrow ' + (l.id === lesson.id ? 'current' : '') + (doneSet.has(l.id) ? ' done' : '') + '" href="#/learn/' + c.id + '/' + l.id + '">' +
                    '<span class="lr-check">' + (doneSet.has(l.id) ? '✅' : '▶') + '</span>' +
                    '<span class="lr-name">' + esc(l.title) + '</span>' +
                    '<small>' + l.durationMins + 'د</small>' +
                  '</a>').join('') +
              '</div>').join('') +
            (!preview && (quizzes.length || homeworks.length)
              ? '<div class="lsec"><div class="lsec-title">📌 أنشطة الكورس</div>' +
                  quizzes.map(qz => '<button class="lrow as-btn" data-action="open-quiz" data-quiz="' + qz.id + '"><span>📝</span><span class="lr-name">' + esc(qz.title) + '</span></button>').join('') +
                  homeworks.map(hw => {
                    const sub = Api.submission(hw.id, Auth.user().id);
                    return '<button class="lrow as-btn" data-action="hw-open" data-hw="' + hw.id + '"><span>' + (sub ? '📤' : '📂') + '</span><span class="lr-name">' + esc(hw.title) + '</span>' + (sub ? '<small>' + (sub.grade != null ? sub.grade + '/' + hw.maxGrade : 'بانتظار التصحيح') + '</small>' : '') + '</button>';
                  }).join('') +
                '</div>'
              : '') +
          '</div>' +
        '</aside>' +

        '<main class="learn-main">' +
          '<div class="player-card card">' +
            '<video controls preload="metadata" playsinline src="' + esc(lesson.videoUrl || '') + '"></video>' +
            '<div class="player-info">' +
              '<div class="pi-head">' +
                '<div>' +
                  '<h1>' + esc(lesson.title) + '</h1>' +
                  '<small>⏱ مدة الدرس: ' + mins(lesson.durationMins) + ' · الدرس ' + num(idx + 1) + ' من ' + num(flat.length) + '</small>' +
                '</div>' +
                (!preview
                  ? '<button class="btn ' + (isDone ? 'btn-success-solid' : 'btn-outline') + '" data-action="complete-lesson" data-course="' + c.id + '" data-lesson="' + lesson.id + '">' + (isDone ? '✅ تم الانتهاء' : 'وضع علامة «تم الانتهاء»') + '</button>'
                  : '<span class="chip chip-free">معاينة</span>') +
              '</div>' +
              '<p class="pi-desc">' + esc(lesson.description || '') + '</p>' +
              (lesson.attachments && lesson.attachments.length
                ? '<div class="attachments">' +
                    lesson.attachments.map(att =>
                      '<button class="attach-chip" data-action="attachment-click" data-name="' + esc(att.name) + '" data-url="' + esc(att.dataUrl || att.url || '') + '">📄 ' + esc(att.name) + ' <small>تحميل</small></button>').join('') +
                  '</div>'
                : '') +
              '<div class="player-nav">' +
                (prevL ? '<a class="btn btn-ghost" href="#/learn/' + c.id + '/' + prevL.id + '">→ الدرس السابق</a>' : '<span></span>') +
                (nextL ? '<a class="btn btn-primary" href="#/learn/' + c.id + '/' + nextL.id + '">الدرس التالي ←</a>'
                  : (!preview ? '<button class="btn btn-success-solid" data-action="complete-lesson" data-course="' + c.id + '" data-lesson="' + lesson.id + '">🏁 إنهاء الكورس</button>' : '')) +
              '</div>' +
            '</div>' +
          '</div>' +
        '</main>' +
      '</div>'
    );
  }

  // ================= المدرسون =================
  function teachers() {
    const list = DB.query('users', x => x.role === 'teacher')
      .filter(x => x.status === 'active')
      .map(t => ({ t, r: Api.teacherRating(t.id) }))
      .sort((a, b) => b.r.avg - a.r.avg);
    return (
      '<section class="section container page-pad">' +
        '<div class="page-title"><h1>👨‍🏫 نخبة المدرسين</h1><p>تعرف على معلميك قبل أن تبدأ</p></div>' +
        (list.length
          ? '<div class="grid-teachers">' + list.map(x => teacherCard(Object.assign({}, x.t))).join('') + '</div>'
          : emptyState('👨‍🏫', 'لا يوجد مدرسون بعد')) +
      '</section>'
    );
  }

  function teacherProfile(id) {
    const t = DB.get('users', id);
    if (!t || t.role !== 'teacher') return emptyState('🫥', 'المدرس غير موجود');
    const r = Api.teacherRating(id);
    const coursesList = Api.teacherCourses(id).filter(c => c.status === 'published');
    const reviewsList = Api.targetReviews('teacher', id);
    const studentsTotal = new Set(
      coursesList.flatMap(c => Api.courseEnrollments(c.id).map(e => e.studentId))).size;

    return (
      '<div class="container page-pad">' +
        '<nav class="breadcrumb"><a href="#/">الرئيسية</a> › <a href="#/teachers">المدرسون</a> › <span>' + esc(t.name) + '</span></nav>' +
        '<div class="teacher-hero card">' +
          '<div class="th-avatar ' + (t.avatar ? t.avatar.g : 'av1') + '">' + (t.avatar ? t.avatar.e : '👨‍🏫') + '</div>' +
          '<div class="th-info">' +
            '<h1>' + esc(t.name) + '</h1>' +
            '<p class="th-subject">📗 ' + esc(t.subject || '') + ' · 🎒 ' + esc(t.stage || '') + '</p>' +
            '<p class="th-bio">' + esc(t.bio || 'مدرس على منصة فهمني.') + '</p>' +
            '<div class="ch-meta">' +
              '<span class="mm">' + stars(r.avg, r.count) + '</span>' +
              '<span class="mm">🎓 ' + num(coursesList.length) + ' كورس</span>' +
              '<span class="mm">👥 ' + num(studentsTotal) + ' طالب</span>' +
              '<span class="mm">📅 عضو منذ ' + UI.fdate(t.createdAt) + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="sec-head"><h2>كورسات الأستاذ</h2></div>' +
        (coursesList.length
          ? '<div class="grid-courses">' + coursesList.map(courseCard).join('') + '</div>'
          : emptyState('🎓', 'لا توجد كورسات منشورة بعد')) +
        '<div class="sec-head"><h2>ماذا يقول الطلاب عنه؟</h2></div>' +
        (reviewsList.length
          ? '<div class="reviews-panel card">' + reviewsList.map(rv => reviewItem(rv)).join('') + '</div>'
          : emptyState('💭', 'لا توجد تقييمات بعد')) +
      '</div>'
    );
  }

  // ================= الإجراءات =================
  App.action('search-courses', form => {
    const fd = Object.fromEntries(new FormData(form));
    const params = new URLSearchParams();
    Object.entries(fd).forEach(([k, v]) => { if (v && !(k === 'rating' && v === '0')) params.set(k, v); });
    App.go('#/courses' + (params.toString() ? '?' + params.toString() : ''));
  });

  // تطبيق الفلاتر فور تغيير select
  document.addEventListener('change', e => {
    if (e.target.matches('[data-autosubmit]')) {
      const form = e.target.closest('form[data-form]');
      if (form) Actions['search-courses'](form);
    }
  });

  App.action('toggle-curriculum', el => {
    const body = el.parentElement.querySelector('.cur-body');
    if (body) body.classList.toggle('open');
    el.querySelector('.cur-arrow').textContent = body && body.classList.contains('open') ? '▾' : '▸';
  });

  App.action('subscribe-course', el => {
    const u = Auth.user();
    const courseId = el.dataset.course;
    if (!u) {
      sessionStorage.setItem('ustadhy_return', '#/course/' + courseId);
      toast('سجّل دخولك أولاً لإتمام الاشتراك', 'info');
      location.hash = '#/login';
      return;
    }
    const res = Api.subscribe(u.id, courseId);
    if (res.ok) {
      toast('🎉 تم الاشتراك بنجاح! بالتوفيق في رحلتك التعليمية');
      App.go('#/learn/' + courseId);
    } else if (res.needWallet) {
      const m = modal({
        title: 'رصيد غير كافٍ 💰', size: 'sm',
        body: '<p class="confirm-text">' + esc(res.error) + '</p>',
        footer: '<button class="btn btn-ghost" data-x="later">لاحقًا</button><button class="btn btn-primary" data-x="wallet">💰 اشحن المحفظة الآن</button>'
      });
      m.root.querySelector('[data-x="later"]').onclick = m.close;
      m.root.querySelector('[data-x="wallet"]').onclick = () => { m.close(); App.go('#/student/wallet'); };
    } else toast(res.error, 'error');
  });

  // ===== الاختبار =====
  App.action('open-quiz', el => {
    const quiz = DB.get('quizzes', el.dataset.quiz);
    if (!quiz) return;
    const u = Auth.user();
    const isMyMistakeExam = quiz.synthetic && quiz.studentId === u.id;
    if (!isMyMistakeExam && !Api.enrollment(u.id, quiz.courseId)) { toast('يجب أن تكون مشتركًا في الكورس', 'warn'); return; }
    const m = modal({
      title: '📝 ' + quiz.title,
      size: 'lg',
      body:
        '<form data-form="take-quiz" data-quiz="' + quiz.id + '">' +
        quiz.questions.map((q, qi) =>
          '<div class="q-item">' +
            (q.q ? '<h4>' + (qi + 1) + '. ' + esc(q.q) + '</h4>' : '<h4>' + (qi + 1) + '.</h4>') +
            (q.image ? '<img class="q-img" src="' + q.image + '" alt="صورة السؤال ' + (qi + 1) + '" loading="lazy"/>' : '') +
            '<div class="options">' +
              q.options.map((op, oi) =>
                '<label class="option"><input type="radio" name="q' + qi + '" value="' + oi + '" required/><span>' + esc(op) + '</span></label>').join('') +
            '</div>' +
          '</div>').join('') +
        '<button class="btn btn-primary btn-block" type="submit">إرسال الإجابات ✔</button>' +
        '</form>',
      onClose: () => App.render()
    });
  });

  App.action('take-quiz', form => {
    const quiz = DB.get('quizzes', form.dataset.quiz);
    const answers = [];
    for (let i = 0; i < quiz.questions.length; i++) {
      const checked = form.querySelector('input[name="q' + i + '"]:checked');
      answers.push(checked ? Number(checked.value) : null);
    }
    const att = Api.submitQuiz(Auth.user().id, quiz.id, answers);
    const pctv = Math.round((att.score / att.total) * 100);
    document.querySelectorAll('.modal-overlay').forEach(x => x.remove());
    const m2 = modal({
      title: 'نتيجة الاختبار', size: 'sm',
      body:
        '<div class="score-circle ' + (pctv >= 50 ? 'pass' : 'fail') + '"><b>' + att.score + '/' + att.total + '</b><span>' + pctv + '%</span></div>' +
        '<p class="confirm-text" style="text-align:center">' + (pctv >= 50 ? 'أحسنت! استمر في التقدم 🎉' : 'راجع الدروس وأعد المحاولة، أنت تستطيع! 💪') + '</p>',
      footer: '<button class="btn btn-ghost" data-x="retake">إعادة المحاولة</button><button class="btn btn-primary" data-x="done">تم</button>',
      onClose: () => App.render()
    });
    m2.root.addEventListener('click', e => {
      const b = e.target.closest('[data-x]');
      if (!b) return;
      m2.close();
      if (b.dataset.x === 'retake') setTimeout(() => Actions['open-quiz']({ dataset: { quiz: quiz.id } }), 240);
    });
  });

  // ===== الواجب =====
  App.action('hw-open', el => {
    const hw = DB.get('homework', el.dataset.hw);
    if (!hw) return;
    const u = Auth.user();
    if (!Api.enrollment(u.id, hw.courseId)) { toast('اشترك في الكورس أولاً', 'warn'); return; }
    if (Api.submission(hw.id, u.id)) { toast('لقد سلّمت هذا الواجب بالفعل ✓', 'info'); return; }
    modal({
      title: '📂 ' + hw.title,
      body:
        '<div class="hw-meta card-flat"><b>الوصف:</b> ' + esc(hw.description) + '<br/><small>📅 آخر موعد: ' + UI.fdate(hw.dueDate, true) + ' · 🏅 الدرجة العظمى: ' + hw.maxGrade + '</small></div>' +
        '<form data-form="submit-homework" data-hw="' + hw.id + '">' +
          '<label class="field"><span>اكتب حلّك هنا (أو ملخص خطوات الحل وما أنجزته):</span>' +
          '<textarea name="content" rows="6" placeholder="اكتب حلولك بالتفصيل…" required></textarea></label>' +
          '<button class="btn btn-primary btn-block" type="submit">📤 إرسال الحل</button>' +
        '</form>'
    });
  });

  App.action('submit-homework', form => {
    try {
      Api.submitHomework(Auth.user().id, form.dataset.hw, form.content.value);
      toast('تم إرسال حلّك بنجاح، سيصلك إشعار عند التصحيح ✅');
      document.querySelectorAll('.modal-overlay').forEach(x => x.remove());
      App.render();
    } catch (err) { toast(err.message, 'error'); }
  });

  App.action('complete-lesson', el => {
    const pctv = Api.completeLesson(Auth.user().id, el.dataset.course, el.dataset.lesson);
    if (pctv == null) return;
    if (pctv >= 100) toast('🎉 مبروك! أكملت جميع دروس هذا الكورس');
    else toast('أحسنت! تقدمك الآن ' + pctv + '% ✅');
    App.render();
  });

  App.action('attachment-click', el => {
    const name = el.dataset.name;
    const dataUrl = el.dataset.url;
    if (dataUrl && dataUrl.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast('جاري تحميل ' + name, 'info');
    } else {
      toast('المرفقات متاحة للتحميل في النسخة المتصلة بالخادم', 'info');
    }
  });

  // ===== التقييم =====
  App.action('review-open', el => {
    const type = el.dataset.type, tid = el.dataset.id;
    modal({
      title: type === 'course' ? '⭐ قيّم هذا الكورس' : '⭐ قيّم المدرس',
      size: 'sm',
      body:
        '<form data-form="send-review" data-type="' + type + '" data-id="' + tid + '">' +
          '<input type="hidden" name="rating" value="5"/>' +
          '<div class="star-picker">' +
            [1, 2, 3, 4, 5].map(v => '<button type="button" class="star-btn active" data-v="' + v + '">★</button>').join('') +
          '</div>' +
          '<label class="field"><span>تعليقك (اختياري)</span>' +
            '<textarea name="comment" rows="3" placeholder="شاركنا تجربتك…"></textarea></label>' +
          '<button class="btn btn-primary btn-block" type="submit">إرسال التقييم</button>' +
        '</form>'
    });
    const formEl = m.root.querySelector('form');
    formEl.addEventListener('click', e => {
      const b = e.target.closest('.star-btn');
      if (!b) return;
      const v = Number(b.dataset.v);
      formEl.querySelector('input[name="rating"]').value = v;
      formEl.querySelectorAll('.star-btn').forEach(sb => sb.classList.toggle('active', Number(sb.dataset.v) <= v));
    });
  });

  App.action('send-review', form => {
    try {
      Api.addReview(Auth.user().id, form.dataset.type, form.dataset.id, Number(form.rating.value), form.comment.value);
      toast('شكرًا لك! تم نشر تقييمك ⭐');
      document.querySelectorAll('.modal-overlay').forEach(x => x.remove());
      App.render();
    } catch (err) { toast(err.message, 'error'); }
  });

  App.action('delete-my-review', el => {
    confirm('هل تريد حذف تقييمك؟ يمكنك التقييم مرة أخرى لاحقًا.', 'حذف').then(ok => {
      if (!ok) return;
      const u = Auth.user();
      const rv = Api.myReview(el.dataset.type, el.dataset.id, u.id);
      if (rv) DB.remove('reviews', rv.id);
      toast('تم حذف تقييمك', 'info');
      App.render();
    });
  });

  // تصدير
  Object.assign(window.Pages, { home, courses, courseDetails, learn, teachers, teacherProfile, courseCard, teacherCard });
})();
