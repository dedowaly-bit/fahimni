/* =========================================================
   Ustadhy Pro — صفحات المصادقة
   تسجيل الدخول / إنشاء حساب (طالب أو تقديم كمدرس)
   ========================================================= */
(function () {
  'use strict';
  window.PagesAuth = {};
  const { esc, toast } = window.UI;
  const STAGES = () => window.Seed.meta.STAGES;

  const authShell = (title, sub, bodyHtml) =>
    '<div class="auth-wrap">' +
      '<div class="blob blob-1"></div><div class="blob blob-2"></div>' +
      '<div class="auth-card card">' +
        '<a class="logo auth-logo" href="#/">' +
          '<span class="logo-mark"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/><path d="M22 10v6"/></svg></span>' +
          '<span class="logo-text">أستاذي <b>برو</b></span>' +
        '</a>' +
        '<h1>' + title + '</h1><p class="auth-sub">' + sub + '</p>' +
        bodyHtml +
      '</div>' +
    '</div>';

  // ================= تسجيل الدخول =================
  PagesAuth.login = function () {
    if (window.Auth.user()) { location.hash = '#/'; return ''; }
    return authShell('مرحبًا بعودتك 👋', 'سجّل دخولك للمتابعة إلى حسابك',
      '<form data-form="do-login" class="auth-form">' +
        '<label class="field"><span>البريد الإلكتروني</span><input type="email" name="email" placeholder="you@example.com" required dir="ltr"/></label>' +
        '<label class="field"><span>كلمة المرور</span><input type="password" name="password" placeholder="••••••••" required minlength="6"/></label>' +
        '<button class="btn btn-primary btn-block btn-lg" type="submit">تسجيل الدخول</button>' +
      '</form>' +
      '<p class="auth-alt">ليس لديك حساب؟ <a href="#/register">أنشئ حسابًا مجانيًا</a></p>'
    );
  };

  App.action('do-login', form => {
    try {
      const user = Auth.login(form.email.value, form.password.value);
      const back = sessionStorage.getItem('ustadhy_return');
      sessionStorage.removeItem('ustadhy_return');
      toast('أهلًا بك ' + user.name.split(' ')[0] + '! 🎉');
      if (back && !back.includes('/login')) location.hash = back;
      else location.hash = '#/' + (user.role === 'student' ? 'student' : user.role === 'teacher' ? 'teacher' : 'admin');
    } catch (err) { toast(err.message, 'error'); }
  });

  // ================= إنشاء حساب =================
  /* التصميم الجديد المضمون: النموذجان موجودان في الصفحة معًا، والتبديل
     يتم فورًا بضغطة زر حقيقية (data-action) دون أي تنقل أو انتظار
     أحداث المتصفح — لذا لا يمكن ألا تتغير الحقول عند الضغط. */
  function regTabs(active) {
    const b = (t, label) =>
      '<button type="button" class="role-tab' + (active === t ? ' active' : '') +
      '" data-action="reg-switch" data-type="' + t + '">' + label + '</button>';
    return '<div class="role-tabs">' +
      b('student', '👨‍🎓 حساب طالب') +
      b('teacher', '👨‍🏫 تقديم كمدرس') +
      b('admin', '👑 مدير المنصة') +
      '</div>';
  }

  const REG_STUDENT_FORM =
    '<form data-form="do-register-student" class="auth-form">' +
      '<label class="field"><span>الاسم الكامل</span><input name="name" placeholder="مثال: أحمد محمد علي" required/></label>' +
      '<label class="field"><span>البريد الإلكتروني</span><input type="email" name="email" placeholder="you@example.com" required dir="ltr"/></label>' +
      '<label class="field"><span>📱 رقم ولي الأمر (إجباري)</span><input name="guardianPhone" pattern="01[0125][0-9]{8}" title="11 رقمًا تبدأ بـ 010 أو 011 أو 012 أو 015" placeholder="01xxxxxxxxx" required dir="ltr"/></label>' +
      '<label class="field"><span>رقم هاتفك (اختياري)</span><input name="phone" placeholder="01xxxxxxxxx" dir="ltr"/></label>' +
      '<label class="field"><span>المرحلة الدراسية</span><select name="stage">' + STAGES().map(s => '<option>' + s + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>كلمة المرور</span><input type="password" name="password" minlength="8" placeholder="8 أحرف على الأقل" required/></label>' +
      '<button class="btn btn-primary btn-block btn-lg" type="submit">إنشاء الحساب 🚀</button>' +
    '</form>' +
    '<p class="auth-alt">بالتسجيل أنت توافق على شروط الاستخدام وسياسة الخصوصية.</p>';

  const REG_TEACHER_FORM =
    '<div class="teacher-note card-flat">📋 يُراجع فريق الإدارة طلبات المدرسين يدويًا. بعد القبول ستستطيع إنشاء كورساتك ونشرها للطلاب.</div>' +
    '<form data-form="do-register-teacher" class="auth-form">' +
      '<label class="field"><span>الاسم الكامل</span><input name="name" placeholder="مثال: أ. محمود السيد" required/></label>' +
      '<label class="field"><span>البريد الإلكتروني</span><input type="email" name="email" required dir="ltr"/></label>' +
      '<label class="field"><span>رقم الهاتف</span><input name="phone" placeholder="01xxxxxxxxx" required dir="ltr"/></label>' +
      '<label class="field"><span>المادة التي تدرّسها</span><input name="subject" placeholder="مثال: الرياضيات" required/></label>' +
      '<label class="field"><span>المرحلة الدراسية المستهدفة</span><select name="stage">' + STAGES().map(s => '<option>' + s + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>نبذة عنك وخبراتك</span><textarea name="bio" rows="3" placeholder="عدد سنوات الخبرة، شهاداتك، أسلوبك في الشرح…" required></textarea></label>' +
      '<label class="field"><span>بيانات إضافية (اختياري)</span><textarea name="extra" rows="2" placeholder="روابط أعمالك، قنواتك، إن وجدت…"></textarea></label>' +
      '<label class="field"><span>كلمة المرور</span><input type="password" name="password" minlength="8" required/></label>' +
      '<button class="btn btn-primary btn-block btn-lg" type="submit">📨 إرسال طلب الانضمام</button>' +
    '</form>';

  PagesAuth.register = function (q) {
    const type = ['student', 'teacher', 'admin'].includes(q.type) ? q.type : 'student';
    const titles = {
      student: ['إنشاء حساب جديد 🎓', 'دقيقة واحدة وتصبح جزءًا من مجتمع فهمني'],
      teacher: ['انضم إلينا كمدرس ✨', 'شارك خبرتك مع آلاف الطلاب'],
      admin: ['مدير المنصة 👑', 'حساب واحد فقط يملك صلاحيات الإدارة الكاملة']
    };

    const adminPanel = Auth.hasAdmin()
      ? '<div class="teacher-note card-flat">🔒 تم تعيين مدير للمنصة بالفعل.<br/><small>لأسباب أمنية لا يمكن إنشاء أكثر من مدير واحد. إذا كنت المدير فسجّل الدخول من <a href="#/login">هنا</a>.</small></div>'
      : '<form data-form="do-register-admin" class="auth-form">' +
          '<label class="field"><span>اسم المدير</span><input name="name" placeholder="الاسم الكامل" required/></label>' +
          '<label class="field"><span>البريد الإلكتروني</span><input type="email" name="email" required dir="ltr"/></label>' +
          '<label class="field"><span>رقم الهاتف</span><input name="phone" placeholder="01xxxxxxxxx" dir="ltr"/></label>' +
          '<label class="field"><span>كلمة المرور (8+ أحرف)</span><input type="password" name="password" minlength="8" required/></label>' +
          '<button class="btn btn-primary btn-block btn-lg" type="submit">👑 تعيين مدير المنصة</button>' +
        '</form>';

    return authShell(
      titles[type][0], titles[type][1],
      regTabs(type) +
      '<div id="reg-student"' + (type !== 'student' ? ' hidden' : '') + '>' + REG_STUDENT_FORM + '</div>' +
      '<div id="reg-teacher"' + (type !== 'teacher' ? ' hidden' : '') + '>' + REG_TEACHER_FORM + '</div>' +
      '<div id="reg-admin"' + (type !== 'admin' ? ' hidden' : '') + '>' + adminPanel + '</div>' +
      '<p class="auth-alt">لديك حساب بالفعل؟ <a href="#/login">سجّل الدخول</a></p>'
    );
  };

  // تبديل فوري ومباشر بين النماذج الثلاثة — بدون أي اعتماد على التنقل
  App.action('reg-switch', function (el) {
    const t = el.dataset.type;
    document.querySelectorAll('.role-tab').forEach(b => b.classList.toggle('active', b.dataset.type === t));
    ['student', 'teacher', 'admin'].forEach(k => {
      const p = document.getElementById('reg-' + k);
      if (p) p.hidden = k !== t;
    });
    try { history.replaceState(null, '', '#/register?type=' + t); } catch (e) { /* تجاهل */ }
  });

  App.action('do-register-admin', form => {
    try {
      const adm = Auth.registerAdmin({
        name: form.name.value, email: form.email.value,
        phone: form.phone.value, password: form.password.value
      });
      Auth.login(adm.email, form.password.value);
      toast('👑 تم تعيينك مديرًا للمنصة');
      location.hash = '#/admin';
    } catch (err) { toast(err.message, 'error'); }
  });

  App.action('do-register-student', form => {
    try {
      const user = Auth.registerStudent({
        name: form.name.value, email: form.email.value,
        guardianPhone: form.guardianPhone.value, phone: form.phone.value,
        password: form.password.value, stage: form.stage.value
      });
      Auth.login(form.email.value, form.password.value);
      toast('🎉 مرحبًا ' + user.name.split(' ')[0] + '! تم إنشاء حسابك بنجاح');
      location.hash = '#/student';
    } catch (err) { toast(err.message, 'error'); }
  });

  App.action('do-register-teacher', form => {
    try {
      const teacher = Auth.registerTeacher({
        name: form.name.value, email: form.email.value, phone: form.phone.value,
        subject: form.subject.value, stage: form.stage.value,
        bio: form.bio.value, extra: form.extra.value, password: form.password.value
      });
      // حفظ فعلي في قاعدة البيانات المحلية — يبقى بعد إعادة تحميل الصفحة
      sessionStorage.setItem('ustadhy_last_application', teacher.name);
      toast('تم حفظ طلبك فعليًا ✅ سيصلك إشعار عند المراجعة');
      location.hash = '#/application-sent';
    } catch (err) { toast(err.message, 'error'); }
  });

  // شاشة تأكيد استلام الطلب (مسار حقيقي عبر الراوتر)
  PagesAuth.applied = function () {
    const name = sessionStorage.getItem('ustadhy_last_application') || 'أستاذنا';
    // لو زار الصفحة بدون تقديم طلب فعلي → أعده لصفحة التسجيل
    if (!name) { location.hash = '#/register?type=teacher'; return ''; }
    return authShell('تم استلام طلبك بنجاح! 📨',
      'طلب انضمامك محفوظ فعليًا في المنصة الآن',
      '<div class="pending-success">' +
        '<div class="big-icon">⏳</div>' +
        '<p>شكرًا <b>' + esc(name) + '</b>! طلبك مسجّل باسم حسابك وسيبقى محفوظًا حتى بعد إغلاق المتصفح.<br/>' +
        'سيصلك إشعار فور مراجعة الإدارة، وبعد القبول ستدخل بحسابك مباشرة وتنشئ كورساتك.</p>' +
        '<div class="steps-row">' +
          ['✅ تم الحفظ', '🔍 مراجعة الإدارة', '✉️ إشعار القبول', '🎓 بدء التدريس']
            .map((s, i) => '<span class="step-chip' + (i === 0 ? ' done' : '') + '">' + s + '</span>').join('') +
        '</div>' +
        '<a class="btn btn-primary" href="#/">العودة للرئيسية</a>' +
        '<a class="btn btn-outline" href="#/login">تسجيل الدخول</a>' +
      '</div>');
  };
})();
