/* =========================================================
   Ustadhy Pro — تهيئة المنصة (حالة حقيقية فارغة)
   لا توجد كورسات أو مدرسون أو طلاب وهميون إطلاقًا.
   كل رقم يظهر في المنصة ينتج من استخدام فعلي فقط.
   الإدارة فقط هي الحساب الأول، والأقسام إعدادات جاهزة للتنظيم.
   ========================================================= */
(function () {
  'use strict';

  const STAGES = [
    'الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي',
    'الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي', 'جميع المراحل'
  ];

  const AVATARS = [
    { e: '🦉', g: 'av1' }, { e: '🚀', g: 'av2' }, { e: '🧠', g: 'av3' }, { e: '🌟', g: 'av4' },
    { e: '🐯', g: 'av5' }, { e: '🦁', g: 'av6' }, { e: '📚', g: 'av1' }, { e: '🎯', g: 'av2' },
    { e: '🧑‍🎓', g: 'av3' }, { e: '👨‍🎓', g: 'av4' }, { e: '👩‍🎓', g: 'av5' }, { e: '🧑‍🏫', g: 'av6' }
  ];

  const COVERS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8'];
  const PAY_METHODS = ['بطاقة بنكية', 'فودافون كاش', 'إنستاباي'];

  window.Seed = {
    meta: { STAGES, AVATARS, COVERS, PAY_METHODS },

    build: function () {
      const H = window.UST.hash;
      return {
        version: 4,
        settings: {
          platformName: 'Fahimni', platformNameAr: 'فهمني',
          currency: 'ج.م', commission: 15, maintenance: false
        },

        // مدير المنصة الوحيد
        users: [{
          id: 'admin', role: 'admin', name: 'محمد وليد محمد عزت',
          email: 'fahimni.admin@gmail.com', phone: '',
          password: H('Admin@2024'), avatar: { e: '🛡️', g: 'av1' },
          status: 'active', walletBalance: 0,
          createdAt: new Date().toISOString()
        }],

        // أقسام تنظيمية (إعدادات منصة وليست محتوى وهميًا) — بهوية رصاصية
        categories: [
          { id: 'cat_math', name: 'الرياضيات', icon: '📐', color: '#1f2937', description: 'جبر، حساب مثلثات، تفاضل وتكامل' },
          { id: 'cat_phy', name: 'الفيزياء', icon: '⚛️', color: '#374151', description: 'ميكانيكا، كهرباء، فيزياء حديثة' },
          { id: 'cat_che', name: 'الكيمياء', icon: '🧪', color: '#4b5563', description: 'عضوية، غير عضوية، تحليلية' },
          { id: 'cat_bio', name: 'الأحياء', icon: '🧬', color: '#6b7280', description: 'وراثة، نبات، حيوان، إنسان' },
          { id: 'cat_ar', name: 'لغة عربية', icon: '📖', color: '#52525b', description: 'نحو، بلاغة، أدب ونصوص' },
          { id: 'cat_en', name: 'لغة إنجليزية', icon: '🌐', color: '#71717a', description: 'قواعد، محادثة، مهارات' },
          { id: 'cat_cs', name: 'الحاسوب', icon: '💻', color: '#9ca3af', description: 'برمجة، أساسيات، تطبيقات' }
        ],

        // الرسائل الداخلية (إدارة ↔ مدرسين) تبدأ فارغة
        // كل المحتوى والحركات يبدأ فارغًا — يتولد من الاستخدام الفعلي فقط
        courses: [], sections: [], lessons: [],
        quizzes: [], homework: [], submissions: [], attempts: [],
        enrollments: [], transactions: [], reviews: [],
        messages: [],
        announcements: [], notifications: []
      };
    }
  };
})();
