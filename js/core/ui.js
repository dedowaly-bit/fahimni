/* =========================================================
   Ustadhy Pro — مكونات واجهة قابلة لإعادة الاستخدام
   Toasts / Modals / Stars / Progress / Avatars / Charts ...
   ========================================================= */
(function () {
  'use strict';

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const num = n => (Number(n) || 0).toLocaleString('ar-EG-u-nu-latn', { maximumFractionDigits: 1 });
  const money = n => window.Api ? Api.money(n) : num(n) + ' ج.م';
  const fdate = (iso, withTime) => {
    if (!iso) return '—';
    const dte = new Date(iso);
    const opts = { day: 'numeric', month: 'long', year: 'numeric' };
    if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
    try { return dte.toLocaleDateString('ar-EG-u-nu-latn', opts); }
    catch (e) { return dte.toLocaleDateString(); }
  };
  const relTime = iso => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.round(diff / 60000);
    if (m < 1) return 'الآن';
    if (m < 60) return 'منذ ' + num(m) + ' دقيقة';
    const h = Math.round(m / 60);
    if (h < 24) return 'منذ ' + num(h) + ' ساعة';
    const dd = Math.round(h / 24);
    if (dd < 30) return 'منذ ' + num(dd) + ' يوم';
    return fdate(iso);
  };
  const mins = m => {
    m = Number(m) || 0;
    const h = Math.floor(m / 60), r = m % 60;
    return h ? h + ' س ' + r + ' د' : r + ' دقيقة';
  };

  // ===== Toast =====
  function toast(msg, type) {
    type = type || 'success';
    let root = document.getElementById('toasts');
    if (!root) { root = document.createElement('div'); root.id = 'toasts'; document.body.appendChild(root); }
    const icons = { success: '✅', error: '⚠️', info: '💡', warn: '🔔' };
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.innerHTML = '<span class="toast-icon">' + (icons[type] || '') + '</span><div class="toast-msg">' + esc(msg) + '</div>';
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 350); }, 3800);
  }

  // ===== Modal =====
  let openModals = [];
  function modal(opts) {
    const root = document.getElementById('modal-root') || document.body;
    const wrap = document.createElement('div');
    wrap.className = 'modal-overlay';
    wrap.innerHTML =
      '<div class="modal ' + (opts.size === 'lg' ? 'modal-lg' : opts.size === 'sm' ? 'modal-sm' : '') + '" role="dialog" aria-modal="true">' +
        '<div class="modal-head">' +
          '<h3>' + esc(opts.title || '') + '</h3>' +
          '<button class="modal-close" aria-label="إغلاق">&times;</button>' +
        '</div>' +
        '<div class="modal-body">' + (opts.body || '') + '</div>' +
        (opts.footer ? '<div class="modal-foot">' + opts.footer + '</div>' : '') +
      '</div>';
    root.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('show'));
    const onCloseCb = opts.onClose || null;
    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      wrap.classList.remove('show');
      setTimeout(() => { wrap.remove(); openModals = openModals.filter(m => m !== close); }, 220);
      document.removeEventListener('keydown', onKey);
      if (onCloseCb) { try { onCloseCb(); } catch (e) { console.error(e); } }
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
    wrap.querySelector('.modal-close').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    openModals.push(close);
    return { root: wrap, close };
  }

  function confirmDlg(message, okText) {
    return new Promise(resolve => {
      const m = modal({
        title: 'تأكيد العملية', size: 'sm',
        body: '<p class="confirm-text">' + esc(message) + '</p>',
        footer:
          '<button class="btn btn-ghost" data-x="no">إلغاء</button>' +
          '<button class="btn btn-danger" data-x="yes">' + esc(okText || 'تأكيد') + '</button>'
      });
      m.root.querySelector('[data-x="no"]').onclick = () => { m.close(); resolve(false); };
      m.root.querySelector('[data-x="yes"]').onclick = () => { m.close(); resolve(true); };
    });
  }

  // ===== مكونات صغيرة =====
  const stars = (avg, count) => {
    avg = Number(avg) || 0;
    const full = Math.floor(avg);
    const half = avg - full >= 0.5;
    let s = '<span class="stars" title="' + num(avg) + ' من 5">';
    for (let i = 1; i <= 5; i++) {
      s += '<svg viewBox="0 0 20 20" class="star' + (i <= full ? ' filled' : (i === full + 1 && half ? ' half' : '')) + '"><path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9z"/></svg>';
    }
    s += '</span><b class="stars-num">' + (avg ? num(avg) : 'جديد') + '</b>';
    if (count != null) s += '<span class="stars-count">(' + num(count) + ')</span>';
    return s;
  };

  const progress = pct =>
    '<div class="progress"><div class="progress-bar" style="width:' + Math.min(100, Math.max(0, pct || 0)) + '%"></div></div>';

  const avatar = (user, sizeCls) => {
    const a = (user && user.avatar) || { e: '👤', g: 'av3' };
    return '<span class="avatar ' + (sizeCls || '') + ' ' + a.g + '" title="' + esc(user && user.name || '') + '">' + a.e + '</span>';
  };

  const emptyState = (icon, title, sub, actionHtml) =>
    '<div class="empty-state">' +
      '<div class="empty-icon">' + icon + '</div>' +
      '<h3>' + esc(title) + '</h3>' +
      (sub ? '<p>' + esc(sub) + '</p>' : '') +
      (actionHtml || '') +
    '</div>';

  const badge = status => {
    const map = {
      active: ['نشط', 'b-success'], published: ['منشور', 'b-success'], approved: ['مقبول', 'b-success'],
      pending: ['قيد المراجعة', 'b-warn'], draft: ['مسودة', 'b-muted'],
      suspended: ['معلق', 'b-danger'], rejected: ['مرفوض', 'b-danger'],
      deposit: ['إيداع', 'b-info'], purchase: ['شراء', 'b-purple'], refund: ['استرداد', 'b-warn'],
      graded: ['مصحح', 'b-success'], submitted: ['بانتظار التصحيح', 'b-warn']
    };
    const [txt, cls] = map[status] || [status, 'b-muted'];
    return '<span class="badge ' + cls + '">' + txt + '</span>';
  };

  // ===== رسوم بيانية SVG بسيطة بدون مكتبات =====
  function barChart(data, opts) {
    opts = opts || {};
    const W = opts.width || 560, H = opts.height || 200, pad = 28;
    const max = Math.max.apply(null, data.map(d => d.value).concat([1]));
    const bw = (W - pad * 2) / data.length;
    let bars = '', labels = '';
    data.forEach((dItem, i) => {
      const h = Math.max(2, ((dItem.value || 0) / max) * (H - pad * 2));
      const x = pad + i * bw + bw * 0.18, y = H - pad - h;
      bars += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (bw * 0.64).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="7" class="chart-bar"><title>' + esc(dItem.label + ': ' + num(dItem.value)) + '</title></rect>';
      labels += '<text x="' + (pad + i * bw + bw / 2).toFixed(1) + '" y="' + (H - 9) + '" text-anchor="middle" class="chart-label">' + esc(dItem.label) + '</text>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart">' + bars + labels + '</svg>';
  }

  function lineChart(data, opts) {
    opts = opts || {};
    const W = opts.width || 560, H = opts.height || 200, pad = 30;
    const vals = data.map(d => d.value);
    const max = Math.max.apply(null, vals.concat([1]));
    const step = (W - pad * 2) / Math.max(1, data.length - 1);
    const pts = data.map((dItem, i) => [pad + i * step, H - pad - ((dItem.value || 0) / max) * (H - pad * 2)]);
    const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const area = path + ' L' + (pad + (data.length - 1) * step).toFixed(1) + ',' + (H - pad) + ' L' + pad + ',' + (H - pad) + ' Z';
    let dots = '', labels = '';
    pts.forEach((p, i) => {
      dots += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4" class="chart-dot"><title>' + esc(data[i].label + ': ' + num(data[i].value)) + '</title></circle>';
      labels += '<text x="' + p[0].toFixed(1) + '" y="' + (H - 9) + '" text-anchor="middle" class="chart-label">' + esc(data[i].label) + '</text>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart">' +
      '<path d="' + area + '" class="chart-area"/>' +
      '<path d="' + path + '" class="chart-line"/>' + dots + labels + '</svg>';
  }

  function donut(items) {
    const total = items.reduce((s, i) => s + i.value, 0) || 1;
    const R = 15.915;
    let off = 25, segs = '';
    items.forEach(i => {
      const pctv = (i.value / total) * 100;
      segs += '<circle cx="21" cy="21" r="' + R + '" fill="transparent" stroke="' + i.color + '" stroke-width="5.5" stroke-dasharray="' + pctv.toFixed(2) + ' ' + (100 - pctv).toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '"><title>' + esc(i.label + ': ' + num(i.value)) + '</title></circle>';
      off -= pctv;
    });
    return '<svg viewBox="0 0 42 42" class="donut">' + segs + '</svg>';
  }

  // ===== Skeleton loading =====
  const skeletonCards = n =>
    Array.from({ length: n }, () => '<div class="card-skeleton"><div class="sk sk-cover"></div><div class="sk sk-line w70"></div><div class="sk sk-line w45"></div></div>').join('');

  window.UI = { esc, num, money, fdate, relTime, mins, toast, modal, confirm: confirmDlg, stars, progress, avatar, emptyState, badge, barChart, lineChart, donut, skeletonCards };
})();

/* ===== ضغط صور الجهاز (فواتير / أسئلة مصورة) قبل التخزين ===== */
window.UI.compressImage = function (file, maxW, quality) {
  return new Promise(function (resolve, reject) {
    if (!file) return reject(new Error('لم تختر صورة'));
    if (!/^image\//.test(file.type || '')) return reject(new Error('الملف المختار ليس صورة'));
    var fr = new FileReader();
    fr.onerror = function () { reject(new Error('تعذر فتح الملف')); };
    fr.onload = function () {
      var img = new Image();
      img.onerror = function () { reject(new Error('تعذر قراءة الصورة')); };
      img.onload = function () {
        try {
          var scale = Math.min(1, (maxW || 1100) / img.width);
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * scale));
          c.height = Math.max(1, Math.round(img.height * scale));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', quality || 0.72));
        } catch (e) { reject(e); }
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
};
