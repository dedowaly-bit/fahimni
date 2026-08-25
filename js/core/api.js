/* =========================================================
   Ustadhy Pro — واجهة منطق الأعمال (API Layer)
   كل عمليات الكورسات/الاشتراكات/المحفظة/الاختبارات/الواجبات
   مركزية هنا لضمان عدم تكرار المنطق وسهولة الربط بـ Supabase.
   ========================================================= */
(function () {
  'use strict';
  const DB = window.DB;

  const Api = {
    // ================= عام =================
    settings() { return DB.settings(); },

    notify(userId, icon, title, body) {
      DB.insert('notifications', {
        id: UST.uid('n'), userId, icon, title, body, read: false,
        createdAt: new Date().toISOString()
      });
    },
    notifyAdmins(icon, title, body) {
      DB.query('users', u => u.role === 'admin').forEach(a => this.notify(a.id, icon, title, body));
    },

    userPublic(id) {
      const u = DB.get('users', id);
      return u ? { id: u.id, name: u.name, avatar: u.avatar, role: u.role, subject: u.subject, stage: u.stage, bio: u.bio } : null;
    },

    // ================= كورسات =================
    courseTeacher(courseId) { const c = DB.get('courses', courseId); return c ? DB.get('users', c.teacherId) : null; },

    courseSections(courseId) {
      return DB.query('sections', s => s.courseId === courseId).sort((a, b) => a.order - b.order);
    },

    sectionLessons(sectionId) {
      return DB.query('lessons', l => l.sectionId === sectionId).sort((a, b) => a.order - b.order);
    },

    courseLessons(courseId) {
      return DB.query('lessons', l => l.courseId === courseId);
    },

    courseRating(courseId) {
      const rs = DB.query('reviews', r => r.targetType === 'course' && r.targetId === courseId);
      if (!rs.length) return { avg: 0, count: 0 };
      return { avg: rs.reduce((s, r) => s + r.rating, 0) / rs.length, count: rs.length };
    },

    teacherRating(teacherId) {
      const rs = DB.query('reviews', r => r.targetType === 'teacher' && r.targetId === teacherId);
      if (!rs.length) return { avg: 0, count: 0 };
      return { avg: rs.reduce((s, r) => s + r.rating, 0) / rs.length, count: rs.length };
    },

    courseStudentsCount(courseId) {
      return DB.query('enrollments', e => e.courseId === courseId).length;
    },

    teacherCourses(teacherId) { return DB.query('courses', c => c.teacherId === teacherId); },

    searchCourses({ q = '', categoryId = '', stage = '', price = '', minRating = 0, sort = 'popular' } = {}) {
      let list = DB.query('courses', c => c.status === 'published');
      if (q) {
        const k = q.trim();
        list = list.filter(c => {
          const t = DB.get('users', c.teacherId);
          const cat = DB.get('categories', c.categoryId);
          return (c.title + ' ' + c.description + ' ' + (t ? t.name : '') + ' ' + (cat ? cat.name : '')).includes(k);
        });
      }
      if (categoryId) list = list.filter(c => c.categoryId === categoryId);
      if (stage) list = list.filter(c => c.stage === stage);
      if (price === 'free') list = list.filter(c => c.price === 0);
      if (price === 'paid') list = list.filter(c => c.price > 0);
      const withMeta = list.map(c => ({
        ...c,
        rating: this.courseRating(c.id),
        students: this.courseStudentsCount(c.id)
      }));
      let out = withMeta.filter(c => !minRating || c.rating.avg >= minRating);
      switch (sort) {
        case 'newest': out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
        case 'rating': out.sort((a, b) => b.rating.avg - a.rating.avg); break;
        case 'priceAsc': out.sort((a, b) => a.price - b.price); break;
        case 'priceDesc': out.sort((a, b) => b.price - a.price); break;
        default: out.sort((a, b) => b.students - a.students);
      }
      return out;
    },

    popularCourses(n) { return this.searchCourses({ sort: 'popular' }).slice(0, n); },
    featuredTeachers(n) {
      return DB.query('users', u => u.role === 'teacher' && u.status === 'active')
        .map(t => ({ ...t, rating: this.teacherRating(t.id), coursesCount: this.teacherCourses(t.id).length }))
        .sort((a, b) => b.rating.avg - a.rating.avg || b.coursesCount - a.coursesCount)
        .slice(0, n || 4);
    },

    // ================= الاشتراكات والمحفظة =================
    enrollment(studentId, courseId) {
      return DB.query('enrollments', e => e.studentId === studentId && e.courseId === courseId)[0] || null;
    },

    studentEnrollments(studentId) {
      return DB.query('enrollments', e => e.studentId === studentId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    courseEnrollments(courseId) {
      return DB.query('enrollments', e => e.courseId === courseId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    enrollmentProgress(enrollment) {
      const total = this.courseLessons(enrollment.courseId).length || 1;
      return Math.min(100, Math.round(((enrollment.done || []).length / total) * 100));
    },

    // اشتراك الطالب في كورس عبر المحفظة
    subscribe(studentId, courseId) {
      const student = DB.get('users', studentId);
      const course = DB.get('courses', courseId);
      if (!student || student.role !== 'student') return { ok: false, error: 'يجب تسجيل الدخول بحساب طالب للاشتراك' };
      if (!course) return { ok: false, error: 'الكورس غير متاح' };
      if (this.enrollment(studentId, courseId)) return { ok: false, error: 'أنت مشترك بالفعل في هذا الكورس' };

      if ((student.walletBalance || 0) < course.price)
        return { ok: false, error: 'رصيدك غير كافٍ (' + this.money(student.walletBalance) + '). اشحن محفظتك أولاً — سعر الكورس ' + this.money(course.price), needWallet: true };

      DB.update('users', studentId, { walletBalance: student.walletBalance - course.price });
      const enr = DB.insert('enrollments', {
        id: UST.uid('e'), courseId, studentId, pricePaid: course.price,
        createdAt: new Date().toISOString(), lastLessonId: null, done: []
      });
      DB.insert('transactions', {
        id: UST.uid('x'), userId: studentId, type: 'purchase', amount: course.price,
        description: 'اشتراك في كورس: ' + course.title, method: null,
        ref: 'TXN-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        createdAt: new Date().toISOString()
      });
      const firstLesson = this.courseLessons(courseId)[0];
      if (firstLesson) DB.update('enrollments', enr.id, { lastLessonId: firstLesson.id });

      this.notify(studentId, '✅', 'تم الاشتراك بنجاح', 'تم اشتراكك في كورس «' + course.title + '» بنجاح. ابدأ المشاهدة الآن!');
      this.notify(course.teacherId, '👥', 'مشترك جديد في كورسك', 'انضم الطالب ' + student.name + ' إلى كورس «' + course.title + '».');
      return { ok: true, enrollment: enr };
    },

    deposit(studentId, amount, method) {
      amount = Number(amount);
      if (!amount || amount < 50) throw new Error('أقل قيمة إيداع هي 50 ج.م');
      const u = DB.get('users', studentId);
      DB.update('users', studentId, { walletBalance: (u.walletBalance || 0) + amount });
      DB.insert('transactions', {
        id: UST.uid('x'), userId: studentId, type: 'deposit', amount,
        description: 'إيداع رصيد في المحفظة', method,
        ref: 'TXN-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        createdAt: new Date().toISOString()
      });
      this.notify(studentId, '💰', 'تم شحن المحفظة', 'تمت إضافة ' + this.money(amount) + ' إلى رصيدك بنجاح.');
    },

    refund(transactionId) {
      const t = DB.get('transactions', transactionId);
      if (!t || t.type !== 'purchase') throw new Error('يمكن استرداد مشتريات فقط');
      if (DB.query('transactions', x => x.refundOf === transactionId).length) throw new Error('تم استرداد هذه العملية مسبقًا');
      const u = DB.get('users', t.userId);
      DB.update('users', t.userId, { walletBalance: (u.walletBalance || 0) + t.amount });
      DB.insert('transactions', {
        id: UST.uid('x'), userId: t.userId, type: 'refund', amount: t.amount,
        description: 'استرداد: ' + t.description, method: null, refundOf: transactionId,
        ref: 'RF-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        createdAt: new Date().toISOString()
      });
      this.notify(t.userId, '↩️', 'تم استرداد المبلغ', 'تمت إضافة ' + this.money(t.amount) + ' إلى محفظتك كاسترداد.');
    },

    transactions(userId) {
      return DB.query('transactions', t => !userId ? true : t.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    money(n) {
      n = Number(n) || 0;
      return n.toLocaleString('ar-EG-u-nu-latn', { maximumFractionDigits: 2 }) + ' ' + this.settings().currency;
    },

    // ================= الدروس والتقدم =================
    lesson(lessonId) { return DB.get('lessons', lessonId); },

    completeLesson(studentId, courseId, lessonId) {
      const e = this.enrollment(studentId, courseId);
      if (!e) return null;
      const done = new Set(e.done || []);
      done.add(lessonId);
      const next = this.nextLesson(courseId, lessonId);
      DB.update('enrollments', e.id, { done: Array.from(done), lastLessonId: (next && next.id) || lessonId });
      return this.enrollmentProgress(DB.get('enrollments', e.id));
    },

    nextLesson(courseId, afterId) {
      const flat = [];
      this.courseSections(courseId).forEach(s => this.sectionLessons(s.id).forEach(l => flat.push(l)));
      const i = flat.findIndex(l => l.id === afterId);
      return i >= 0 && i < flat.length - 1 ? flat[i + 1] : null;
    },
    prevLesson(courseId, beforeId) {
      const flat = [];
      this.courseSections(courseId).forEach(s => this.sectionLessons(s.id).forEach(l => flat.push(l)));
      const i = flat.findIndex(l => l.id === beforeId);
      return i > 0 ? flat[i - 1] : null;
    },

    continueLearning(studentId) {
      const enrs = this.studentEnrollments(studentId);
      for (const e of enrs) {
        if (e.lastLessonId && this.enrollmentProgress(e) < 100) {
          const course = DB.get('courses', e.courseId);
          const lesson = DB.get('lessons', e.lastLessonId);
          if (course && lesson) return { course, lesson, progress: this.enrollmentProgress(e) };
        }
      }
      return null;
    },

    // ================= الاختبارات =================
    quizAttempts(quizId, studentId) {
      return DB.query('attempts', a => a.quizId === quizId && (!studentId || a.studentId === studentId));
    },

    submitQuiz(studentId, quizId, answers) {
      const quiz = DB.get('quizzes', quizId);
      if (!quiz) throw new Error('الاختبار غير موجود');
      let score = 0;
      const wrongRefs = [];
      quiz.questions.forEach((q, i) => {
        if (answers[i] === q.answer) { score++; this._resolveMistake(studentId, quiz, i); }
        else wrongRefs.push(i);
      });
      wrongRefs.forEach(i => this._recordMistake(studentId, quiz, i));
      const att = DB.insert('attempts', {
        id: UST.uid('att'), quizId, studentId, score, total: quiz.questions.length,
        createdAt: new Date().toISOString()
      });
      const pct = Math.round((score / quiz.questions.length) * 100);
      this.notify(studentId, pct >= 50 ? '🎉' : '📝', 'نتيجة اختبارك جاهزة', 'حصلت على ' + score + '/' + quiz.questions.length + ' في «' + quiz.title + '». ' + (pct >= 50 ? 'أحسنت!' : 'راجع أسئلة الأخطاء وحاول مجددًا.'));
      return att;
    },

    /* ===== بنك الأخطاء + امتحان «من أخطائك» ===== */
    _mistakeKey(quizId, idx) { return quizId + ':' + idx; },
    _refOf(quiz, i) {
      // للامتحانات المولّدة من أخطاء: نرجع للسؤال الأصلي في اختباره المصدر
      const r = (quiz.srcRefs && quiz.srcRefs[i]) || null;
      return r ? { quizId: r.quizId, idx: r.qIndex } : { quizId: quiz.id, idx: i };
    },
    _upsertMistake(studentId, refQuizId, refIdx, courseId, snap) {
      const exist = DB.query('mistakeBank', m =>
        m.studentId === studentId && m.quizId === refQuizId && m.idx === refIdx)[0];
      if (exist) {
        DB.update('mistakeBank', exist.id, { text: snap.text, options: snap.options, answer: snap.answer, courseId, updatedAt: new Date().toISOString(), resolvedAt: null });
        return;
      }
      DB.insert('mistakeBank', {
        id: UST.uid('mk'), studentId, quizId: refQuizId, idx: refIdx, courseId,
        text: snap.text, options: snap.options, answer: snap.answer,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), resolvedAt: null
      });
    },
    _recordMistake(studentId, quiz, i) {
      const ref = this._refOf(quiz, i);
      const src = DB.get('quizzes', ref.quizId);
      if (!src) return;
      const q = src.questions[ref.idx];
      if (!q) return;
      this._upsertMistake(studentId, ref.quizId, ref.idx, src.courseId || '', { text: q.q, options: q.options, answer: q.answer });
    },
    _resolveMistake(studentId, quiz, i) {
      const ref = this._refOf(quiz, i);
      DB.updateWhere('mistakeBank', m =>
        m.studentId === studentId && m.quizId === ref.quizId && m.idx === ref.idx && !m.resolvedAt,
        { resolvedAt: new Date().toISOString() });
    },
    mistakeCount(studentId) {
      return DB.query('mistakeBank', m => m.studentId === studentId && !m.resolvedAt).length;
    },
    refreshMistakeExam(studentId) {
      const bank = DB.query('mistakeBank', m => m.studentId === studentId && !m.resolvedAt)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      if (!bank.length) {
        DB.remove('quizzes', 'mx_' + studentId);
        return null;
      }
      const questions = [], srcRefs = [];
      bank.slice(0, 25).forEach(m => {
        const src = DB.get('quizzes', m.quizId);
        const q = src && src.questions[m.idx];
        if (!q) return;
        questions.push({ q: q.q || '', image: q.image || null, options: q.options, answer: q.answer });
        srcRefs.push({ quizId: m.quizId, qIndex: m.idx });
      });
      if (!questions.length) return null;
      const old = DB.get('quizzes', 'mx_' + studentId);
      if (old) DB.remove('quizzes', 'mx_' + studentId);
      return DB.insert('quizzes', {
        id: 'mx_' + studentId, synthetic: true, studentId, courseId: '',
        title: '🎯 امتحان من أخطائك', questions, srcRefs,
        createdAt: new Date().toISOString()
      });
    },

    // ================= الواجبات =================
    courseHomework(courseId) {
      return DB.query('homework', h => h.courseId === courseId);
    },
    submission(homeworkId, studentId) {
      return DB.query('submissions', s => s.homeworkId === homeworkId && s.studentId === studentId)[0] || null;
    },
    homeworkSubmissions(homeworkId) {
      return DB.query('submissions', s => s.homeworkId === homeworkId);
    },
    submitHomework(studentId, homeworkId, content) {
      if (!content || !String(content).trim()) throw new Error('اكتب حلّك أو ملخصًا له قبل الإرسال');
      const exist = this.submission(homeworkId, studentId);
      if (exist) throw new Error('لقد سلمت هذا الواجب بالفعل');
      const sub = DB.insert('submissions', {
        id: UST.uid('sub'), homeworkId, studentId, content: String(content).trim(),
        submittedAt: new Date().toISOString(), grade: null, feedback: '', gradedAt: null
      });
      const hw = DB.get('homework', homeworkId);
      if (hw) {
        const course = DB.get('courses', hw.courseId);
        if (course) this.notify(course.teacherId, '📥', 'تسليم واجب جديد', 'سلّم الطالب ' + DB.get('users', studentId).name + ' واجب «' + hw.title + '».');
      }
      return sub;
    },
    gradeSubmission(submissionId, grade, feedback) {
      const sub = DB.get('submissions', submissionId);
      if (!sub) throw new Error('التسليم غير موجود');
      const hw = DB.get('homework', sub.homeworkId);
      DB.update('submissions', submissionId, {
        grade: Number(grade), feedback: feedback || '',
        gradedAt: new Date().toISOString()
      });
      if (hw) this.notify(sub.studentId, '📊', 'تم تصحيح واجبك', 'حصلت على ' + grade + '/' + hw.maxGrade + ' في «' + hw.title + '». اقرأ ملاحظات المعلم.');
    },

    upcomingHomework(studentId) {
      const now = Date.now();
      return this.studentEnrollments(studentId)
        .map(e => this.courseHomework(e.courseId))
        .flat()
        .filter(hw => new Date(hw.dueDate).getTime() >= now)
        .filter(hw => !this.submission(hw.id, studentId))
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    },

    // ================= التقييمات =================
    addReview(studentId, targetType, targetId, rating, comment) {
      rating = Number(rating);
      if (!(rating >= 1 && rating <= 5)) throw new Error('اختر تقييمًا من 1 إلى 5 نجوم');
      const existing = DB.query('reviews', r =>
        r.targetType === targetType && r.targetId === targetId &&
        r.studentId === studentId)[0];
      if (existing) throw new Error('لقد قيّمت هذا من قبل، يمكنك حذف تقييمك وإعادة التقييم');
      DB.insert('reviews', {
        id: UST.uid('r'), targetType, targetId, studentId,
        rating, comment: String(comment || '').trim(), createdAt: new Date().toISOString()
      });
    },

    targetReviews(targetType, targetId) {
      return DB.query('reviews', r => r.targetType === targetType && r.targetId === targetId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    myReview(targetType, targetId, studentId) {
      return DB.query('reviews', r => r.targetType === targetType && r.targetId === targetId && r.studentId === studentId)[0] || null;
    },

    // ================= الإعلانات =================
    announcementsFor(user) {
      const aud = user ? (user.role === 'student' ? 'students' : user.role === 'teacher' ? 'teachers' : null) : null;
      return DB.query('announcements', a => a.active && (!aud || a.audience === 'all' || a.audience === aud))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    // ================= إشعارات المستخدم =================
    notifications(userId) {
      return DB.query('notifications', n => n.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    unreadCount(userId) {
      return DB.query('notifications', n => n.userId === userId && !n.read).length;
    },
    markAllRead(userId) {
      DB.updateWhere('notifications', n => n.userId === userId && !n.read, { read: true });
    },

    // ================= طلبات شحن الرصيد (تأكيد يدوي من الإدارة) =================
    requestDeposit(studentId, amount, method, reference, receiptDataUrl) {
      amount = Math.floor(Number(amount));
      if (!(amount >= 50)) throw new Error('أقل مبلغ للشحن هو 50 ج.م');
      const ref = String(reference || '').trim();
      if (ref.length < 4) throw new Error('اكتب رقم عملية التحويل / رقم المرسل لتتمكن الإدارة من التحقق');
      const receipt = String(receiptDataUrl || '');
      if (!/^data:image\//.test(receipt) || receipt.length < 100)
        throw new Error('صورة فاتورة التحويل إجبارية — ارفع صورة واضحة للإيصال (إنستاباي أو فاتورة حقيقية)');
      const stu = DB.get('users', studentId);
      if (!stu) throw new Error('الحساب غير موجود');
      const tx = DB.insert('transactions', {
        id: UST.uid('x'), userId: studentId, type: 'deposit', status: 'pending',
        amount, method: String(method || ''), ref, receipt,
        description: 'طلب شحن رصيد عبر ' + method,
        createdAt: new Date().toISOString()
      });
      this.notifyAdmins('🧾', 'طلب شحن رصيد جديد',
        stu.name + ' يطلب شحن ' + this.money(amount) + ' عبر ' + method + ' (مرجع: ' + ref + ') مع إرفاق صورة الفاتورة. راجع قسم طلبات الشحن.');
      return tx;
    },

    resolveDeposit(txId, approve) {
      const tx = DB.get('transactions', txId);
      if (!tx || tx.type !== 'deposit') throw new Error('العملية غير موجودة');
      if (tx.status !== 'pending') throw new Error('تم البت في هذا الطلب من قبل');
      const stu = DB.get('users', tx.userId);
      if (approve) {
        DB.update('transactions', txId, { status: 'approved' });
        DB.update('users', tx.userId, { walletBalance: (stu.walletBalance || 0) + tx.amount });
        if (stu) this.notify(tx.userId, '✅', 'تم تأكيد شحن رصيدك',
          'تمت إضافة ' + this.money(tx.amount) + ' إلى محفظتك بنجاح.');
      } else {
        DB.update('transactions', txId, { status: 'rejected' });
        if (stu) this.notify(tx.userId, '❌', 'تم رفض طلب الشحن',
          'لم يتم تأكيد طلب شحن ' + this.money(tx.amount) + '. تأكد من بيانات التحويل وحاول مجددًا أو راسل الإدارة.');
      }
      return DB.get('transactions', txId);
    },

    pendingDeposits() {
      return DB.query('transactions', t => t.type === 'deposit' && t.status === 'pending')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    // ================= الرسائل الداخلية (إدارة ↔ مدرسين) =================
    sendMessage(fromId, toId, body) {
      const text = String(body || '').trim();
      if (!text) throw new Error('اكتب رسالتك أولًا');
      if (fromId === toId) throw new Error('لا يمكنك مراسلة نفسك');
      const to = DB.get('users', toId);
      if (!to) throw new Error('المستخدم غير موجود');
      const from = DB.get('users', fromId);
      DB.insert('messages', {
        id: UST.uid('m'), from: fromId, to: toId, body: text.slice(0, 2000),
        createdAt: new Date().toISOString(), read: false
      });
      this.notify(toId, '💬', 'رسالة جديدة من ' + (from ? from.name : 'الإدارة'),
        text.slice(0, 80) + (text.length > 80 ? '…' : ''));
    },

    thread(a, b) {
      return DB.query('messages', m =>
        (m.from === a && m.to === b) || (m.from === b && m.to === a))
        .sort((x, y) => new Date(x.createdAt) - new Date(y.createdAt));
    },

    conversations(userId) {
      const map = {};
      DB.all('messages').forEach(m => {
        const other = m.from === userId ? m.to : m.to === userId ? m.from : null;
        if (!other) return;
        if (!map[other]) map[other] = { user: other, last: m, unread: 0 };
        map[other].last = new Date(m.createdAt) > new Date(map[other].last.createdAt) ? m : map[other].last;
        if (m.to === userId && !m.read) map[other].unread++;
      });
      return Object.values(map)
        .map(c => ({ ...c, userInfo: DB.get('users', c.user) }))
        .sort((a, b) => new Date(b.last.createdAt) - new Date(a.last.createdAt));
    },

    markThreadRead(userId, otherId) {
      DB.updateWhere('messages', m => m.to === userId && m.from === otherId && !m.read, { read: true });
    },

    unreadMessages(userId) {
      return DB.query('messages', m => m.to === userId && !m.read).length;
    },

    chatPartners(userId) {
      // للإدارة: كل المدرسين والطلاب النشطين. للمدرس/الطالب: الإدارة فقط.
      const me = DB.get('users', userId);
      if (me && me.role === 'admin')
        return DB.query('users', u => (u.role === 'teacher' || u.role === 'student') && u.status !== 'suspended');
      return DB.query('users', u => u.role === 'admin');
    },

    // ================= إحصائيات الأدوار =================
    adminStats() {
      const users = DB.all('users');
      const txs = this.transactions();
      const revenue = txs.filter(t => t.type === 'purchase').reduce((s, t) => s + t.amount, 0);
      return {
        students: users.filter(u => u.role === 'student').length,
        teachers: users.filter(u => u.role === 'teacher').length,
        pendingTeachers: users.filter(u => u.role === 'teacher' && u.status === 'pending').length,
        courses: DB.all('courses').length,
        publishedCourses: DB.query('courses', c => c.status === 'published').length,
        subscriptions: DB.all('enrollments').length,
        revenue,
        deposits: txs.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0)
      };
    },

    revenueByMonth(months) {
      const out = [];
      const fmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'short' });
      for (let i = months - 1; i >= 0; i--) {
        const dt = new Date(); dt.setDate(1); dt.setMonth(dt.getMonth() - i);
        const key = dt.getFullYear() + '-' + dt.getMonth();
        const sum = this.transactions().filter(t => t.type === 'purchase') // eslint-disable-line
          .reduce((s, t) => {
            const td = new Date(t.createdAt);
            return td.getFullYear() + '-' + td.getMonth() === key ? s + t.amount : s;
          }, 0);
        out.push({ label: fmt.format(dt), value: sum });
      }
      return out;
    },

    teacherStats(teacherId) {
      const courses = this.teacherCourses(teacherId);
      const ids = courses.map(c => c.id);
      const enrs = DB.query('enrollments', e => ids.includes(e.courseId));
      const revenue = enrs.reduce((s, e) => s + e.pricePaid, 0);
      const rating = this.teacherRating(teacherId);
      const views = courses.reduce((s, c) => s + (c.views || 0), 0);
      return {
        courses: courses.length,
        published: courses.filter(c => c.status === 'published').length,
        students: new Set(enrs.map(e => e.studentId)).size,
        subscriptions: enrs.length,
        revenue, views, rating
      };
    }
  };

  window.Api = Api;
})();
