/* =========================================================
   Fahimni — فهمني | نظام المصادقة والأدوار (RBAC)
   الأدوار: student / teacher / admin
   ملاحظات:
   - الطالب ملزم بإدخال رقم ولي الأمر بصيغة مصرية صحيحة.
   - مدير المنصة فريد: لا يمكن تسجيل أكثر من مدير واحد.
   - الحسابات المعلقة أو الموقوفة لا تدخل.
   ========================================================= */
(function () {
  'use strict';

  let currentUser = null;
  const PHONE_RE = /^01[0125][0-9]{8}$/;

  const Auth = {
    user() { return currentUser; },

    hasAdmin() {
      return window.DB.query('users', u => u.role === 'admin').length > 0;
    },

    restore() {
      const s = window.DB.readSession();
      if (!s) return null;
      const u = window.DB.get('users', s.userId);
      if (!u || u.status === 'suspended') { window.DB.clearSession(); return null; }
      currentUser = u;
      return u;
    },

    login(email, password) {
      const em = String(email || '').trim().toLowerCase();
      const user = window.DB.query('users', u => u.email.toLowerCase() === em)[0];
      if (!user) throw new Error('لا يوجد حساب بهذا البريد الإلكتروني');
      if (user.password !== window.UST.hash(password)) throw new Error('كلمة المرور غير صحيحة');
      if (user.status === 'pending') throw new Error('حسابك قيد المراجعة من الإدارة. سيصلك إشعار فور القبول.');
      if (user.status === 'suspended') throw new Error('تم إيقاف حسابك من الإدارة. تواصل مع الدعم.');
      currentUser = user;
      window.DB.saveSession(user.id);
      return user;
    },

    registerStudent({ name, email, guardianPhone, phone, password, stage }) {
      this._assertFreeEmail(email);
      const g = String(guardianPhone || '').trim();
      if (!PHONE_RE.test(g))
        throw new Error('رقم ولي الأمر مطلوب بصيغة صحيحة (11 رقمًا تبدأ بـ 010/011/012/015)');
      if (phone && !PHONE_RE.test(String(phone).trim()))
        throw new Error('رقم هاتفك غير صحيح — 11 رقمًا تبدأ بـ 010/011/012/015');
      const user = window.DB.insert('users', {
        id: window.UST.uid('s'), role: 'student',
        name: name.trim(), email: email.trim().toLowerCase(),
        guardianPhone: g, phone: String(phone || '').trim(),
        password: window.UST.hash(password), stage: stage || '',
        avatar: window.Seed.meta.AVATARS[Math.floor(Math.random() * window.Seed.meta.AVATARS.length)],
        status: 'active', walletBalance: 0, createdAt: new Date().toISOString()
      });
      window.Api.notify(user.id, '🎉', 'مرحبًا بك في فهمني!', 'أهلًا ' + user.name + '! استكشف الكورسات وابدأ رحلة تعلمك اليوم.');
      return user;
    },

    // تسجيل مدرس جديد → ينتقل لحالة "قيد المراجعة"
    registerTeacher({ name, email, phone, subject, stage, bio, extra, password }) {
      this._assertFreeEmail(email);
      const user = window.DB.insert('users', {
        id: window.UST.uid('t'), role: 'teacher',
        name: name.trim(), email: email.trim().toLowerCase(), phone: phone || '',
        password: window.UST.hash(password), subject: subject || '', stage: stage || '',
        bio: bio || '', extra: extra || '',
        avatar: window.Seed.meta.AVATARS[Math.floor(Math.random() * window.Seed.meta.AVATARS.length)],
        status: 'pending', walletBalance: 0, createdAt: new Date().toISOString()
      });
      window.Api.notifyAdmins('📨', 'طلب انضمام جديد كمدرس', 'تقدم ' + user.name + ' (' + (subject || '-') + ') بطلب انضمام. راجع الطلب من قسم طلبات المدرسين.');
      return user;
    },

    // تسجيل مدير المنصة — مسموح فقط إذا لم يوجد مدير بعد
    registerAdmin({ name, email, phone, password }) {
      if (this.hasAdmin()) throw new Error('تم تعيين مدير للمنصة بالفعل — لا يمكن إنشاء مدير آخر');
      this._assertFreeEmail(email);
      const user = window.DB.insert('users', {
        id: window.UST.uid('a'), role: 'admin',
        name: name.trim(), email: email.trim().toLowerCase(), phone: phone || '',
        password: window.UST.hash(password),
        avatar: { e: '🛡️', g: 'av1' },
        status: 'active', walletBalance: 0, createdAt: new Date().toISOString()
      });
      return user;
    },

    _assertFreeEmail(email) {
      const em = String(email || '').trim().toLowerCase();
      if (!em) throw new Error('البريد الإلكتروني مطلوب');
      if (window.DB.query('users', u => u.email.toLowerCase() === em).length)
        throw new Error('هذا البريد مسجل بالفعل، جرّب تسجيل الدخول');
    },

    logout() {
      currentUser = null;
      window.DB.clearSession();
      location.hash = '#/';
    },

    changePassword(userId, oldPw, newPw) {
      const u = window.DB.get('users', userId);
      if (!u) throw new Error('المستخدم غير موجود');
      if (u.password !== window.UST.hash(oldPw)) throw new Error('كلمة المرور الحالية غير صحيحة');
      if (String(newPw).length < 8) throw new Error('كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف');
      window.DB.update('users', userId, { password: window.UST.hash(newPw) });
    },

    require(roles) {
      const u = currentUser;
      if (!u) return null;
      const list = Array.isArray(roles) ? roles : [roles];
      return list.includes(u.role) ? u : null;
    }
  };

  window.Auth = Auth;
})();
