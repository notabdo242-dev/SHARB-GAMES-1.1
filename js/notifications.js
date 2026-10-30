/* ==========================================================================
   SHARB GAMES — NOTIFICATIONS, TOASTS & MODAL SYSTEM (js/notifications.js)
   ========================================================================== */

function toast(msg, kind = '', ms = 3200) {
  const box = $('#toasts');
  if (!box) return;
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.innerHTML = `<span>${esc(msg)}</span>`;
  box.appendChild(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 600);
}
window.toast = toast;

function closeOverlay() {
  const o = $('#ovl');
  if (!o) return;
  o.innerHTML = '';
  delete o.dataset.kind;
}
window.closeOverlay = closeOverlay;

function openOverlay(html, kind = '') {
  const o = $('#ovl');
  if (!o) return;
  o.dataset.kind = kind;
  o.innerHTML = `<div class="ov">${html}</div>`;
}
window.openOverlay = openOverlay;

async function copyText(t) {
  try {
    await navigator.clipboard.writeText(t);
    toast('اتنسخ ✅', 'ok');
    return true;
  } catch (e) {
    try {
      const ta = document.createElement('textarea');
      ta.value = t;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      toast('اتنسخ ✅', 'ok');
      return true;
    } catch (ex) {
      toast('انسخ الكود يدويًا: ' + t, 'warn');
      return false;
    }
  }
}
window.copyText = copyText;

function showFriendRequestToast(from) {
  if (!from || !from.uid) return;
  const fuid = String(from.uid).toLowerCase();
  if (fuid === myUid()) return;
  const box = $('#toasts');
  if (!box) return;
  const existing = box.querySelector('[data-freq-toast="' + fuid + '"]');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast invite';
  t.setAttribute('data-freq-toast', fuid);
  t.innerHTML = `<span>👋 <b>${esc(from.name || 'لاعب')}</b> بعتلك طلب صداقة!<br><span class="mut tiny">كود: ${esc(fuid.toUpperCase())}</span></span><span class="ta"><button class="mini ok" data-faccept>✅ قبول</button><button class="mini del" data-freject>✕ رفض</button></span>`;
  box.appendChild(t);
  const kill = () => { t.classList.add('out'); setTimeout(() => t.remove(), 500); };
  t.querySelector('[data-faccept]').onclick = () => { kill(); acceptFriendRequest(fuid); };
  t.querySelector('[data-freject]').onclick = () => { kill(); rejectFriendRequest(fuid); };
  beep(580, 0.09, 'sine', 0.09);
  setTimeout(() => { if (t.parentNode) t.classList.add('out'); }, 25000);
}
window.showFriendRequestToast = showFriendRequestToast;

function showInvite(from, roomCode, gameKind) {
  const gNames = {
    domino: '🁫 دومينو',
    uno: '🎴 UNO',
    bakasa: '🕵️ البكاسة',
    chess: '♟️ شطرنج',
    ttt: '❌⭕ إكس أو',
    c4: '🔴🟡 كونكت فور',
    draw: '🎨 ارسم وخمّن'
  };
  const gLabel = gNames[gameKind] || '🁫 دومينو';
  const box = $('#toasts');
  if (!box) return;
  const t = document.createElement('div');
  t.className = 'toast invite';
  t.innerHTML = `<span>🎮 <b>${esc(from.name || 'صاحبك')}</b> يدعوك للعب <b>${gLabel}</b><br><span class="mut tiny">كود الغرفة: ${esc(roomCode)}</span></span><span class="ta"><button class="mini ok" data-accept>قبول ودخول</button><button class="mini" data-close>لاحقًا</button></span>`;
  box.appendChild(t);
  const kill = () => { t.classList.add('out'); setTimeout(() => t.remove(), 500); };
  t.querySelector('[data-accept]').onclick = () => { kill(); acceptGameInvite(roomCode, gameKind || 'domino', 'code'); };
  t.querySelector('[data-close]').onclick = kill;
  beep(720, 0.12, 'sine', 0.1);
  setTimeout(() => { if (t.parentNode) t.classList.add('out'); }, 25000);
}
window.showInvite = showInvite;

const SHARB_THEMES_LIST = [
  { id: 'blue',     name: 'Electric Blue (الافتراضي)', cls: 'blue',     prev: 'linear-gradient(135deg,#060b16 0%,#0ea5e9 65%,#8b5cf6 100%)' },
  { id: 'midnight', name: 'Midnight Indigo',           cls: 'midnight', prev: 'linear-gradient(135deg,#05070d 0%,#6366f1 100%)' },
  { id: 'purple',   name: 'Purple Galaxy',             cls: 'purple',   prev: 'linear-gradient(135deg,#080614 0%,#8b5cf6 100%)' },
  { id: 'emerald',  name: 'Cyber Emerald',             cls: 'emerald',  prev: 'linear-gradient(135deg,#051014 0%,#10b981 100%)' },
  { id: 'crimson',  name: 'Crimson Arena',             cls: 'crimson',  prev: 'linear-gradient(135deg,#0c0710 0%,#f43f5e 100%)' },
  { id: 'light',    name: 'Daylight Clean',            cls: 'light',    prev: 'linear-gradient(135deg,#f1f5f9 0%,#0284c7 100%)' }
];
window.SHARB_THEMES_LIST = SHARB_THEMES_LIST;

function applySharbThemeChoice(themeId) {
  const v = themeId || 'blue';
  const th = (v === 'light') ? 'light' : 'dark';
  syncThemeAttrs(v, th);
  store.set('theme', th);
  store.set('sharb', v);
  store.set('sharb_theme_v3', v);
  beep(420, 0.08, 'sine', 0.08);
}
window.applySharbThemeChoice = applySharbThemeChoice;

function openThemes() {
  const cur = store.get('sharb_theme_v3', 'blue');
  const html = `<div class="card" style="max-width:420px">
    <h2>🎨 ثيمات المنصة</h2>
    <p class="mut">اختر المظهر المفضل لديك — يطبق على جميع صفحات المنصة</p>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
      ${SHARB_THEMES_LIST.map(t => {
        const active = cur === t.cls;
        return `<div class="mode ${active ? 'on' : ''}" data-stheme="${t.cls}" style="display:flex;align-items:center;gap:12px;padding:10px 12px">
          <div style="width:40px;height:40px;border-radius:10px;background:${t.prev};border:1px solid var(--border-subtle);flex-shrink:0"></div>
          <div style="flex:1;text-align:right"><div class="mt">${esc(t.name)}</div></div>
          <div style="font-size:16px;color:${active ? 'var(--accent-primary-hover)' : 'transparent'}">✓</div>
        </div>`;
      }).join('')}
    </div>
    <div class="row" style="justify-content:center;margin-top:14px">
      <button class="btn g" id="tclose">إغلاق</button>
    </div>
  </div>`;
  openOverlay(html, 'themes');
  $$('[data-stheme]').forEach(el => {
    el.onclick = () => {
      applySharbThemeChoice(el.getAttribute('data-stheme') || 'blue');
      closeOverlay();
      toast('تم تطبيق الثيم بنجاح ✅', 'ok');
      if (typeof renderProfilePage === 'function') renderProfilePage();
    };
  });
  const tc = $('#tclose');
  if (tc) tc.onclick = closeOverlay;
}
window.openThemes = openThemes;

function openAboutCopyrightModal() {
  const logoSrc = getAssetUrl('assets/images/logo.png');
  const html = `<div class="card" style="max-width:520px;text-align:right">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border-subtle)">
      <span class="logo" style="width:56px;height:56px">
        <img class="sharb-logo-img" src="${esc(logoSrc)}" alt="SHARB GAMES Logo">
      </span>
      <div>
        <h2 style="margin:0;font-size:21px;direction:ltr;text-align:right">SHARB GAMES</h2>
        <div class="badge" style="margin-top:4px;direction:ltr">Your Ultimate Online Gaming Hub</div>
      </div>
    </div>
    <div style="font-size:13px;line-height:1.8;color:var(--text-primary);display:flex;flex-direction:column;gap:10px">
      <div style="padding:12px;border-radius:12px;background:var(--surface-2);border:1px solid var(--border-subtle);direction:ltr;text-align:left">
        <div style="font-weight:900;font-size:13.5px;color:var(--accent-primary-hover)">© 2026 SHARB GAMES. All Rights Reserved.</div>
        <div style="font-weight:700;margin-top:4px">SHARB GAMES is an independent gaming platform owned and operated by SHARB.</div>
      </div>
      <p><b>حول المنصة:</b> منصة <b>SHARB GAMES</b> هي منصة ألعاب جماعية وفردية أونلاين تضم ٧ ألعاب متكاملة (الدومينو، UNO، البكاسة، الشطرنج، إكس أو، كونكت فور، وارسم وخمّن) مع نظام غرف عامة وخاصة وقائمة أصدقاء وشات فوري.</p>
      <p class="mut tiny">جميع حقوق الهوية البصرية، واسم <b>SHARB GAMES</b>، والتصميمات والبرمجة مملوكة لصالح <b>SHARB</b>.</p>
    </div>
    <div class="row" style="justify-content:center;margin-top:16px">
      <button class="btn ok" id="aboutModalClose" style="min-width:140px">حسناً</button>
    </div>
  </div>`;
  openOverlay(html, 'about_copyright');
  const btn = $('#aboutModalClose');
  if (btn) btn.onclick = closeOverlay;
}
window.openAboutCopyrightModal = openAboutCopyrightModal;
