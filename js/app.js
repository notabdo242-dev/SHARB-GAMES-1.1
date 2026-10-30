/* ==========================================================================
   SHARB GAMES — PLATFORM SHELL & HOMEPAGE DASHBOARD CONTROLLER (js/app.js)
   ========================================================================== */

var SHARB_HUB = {
  searchQuery: '',
  gameCategory: 'all',
  recentGames: store.get('sharb_recent_games', ['domino', 'uno', 'chess'])
};
window.SHARB_HUB = SHARB_HUB;

function recordRecentGame(gameId) {
  if (!gameId || !SHARB_GAME_META[gameId]) return;
  const list = Array.isArray(SHARB_HUB.recentGames) ? SHARB_HUB.recentGames.filter(x => x !== gameId) : [];
  list.unshift(gameId);
  SHARB_HUB.recentGames = list.slice(0, 4);
  store.set('sharb_recent_games', SHARB_HUB.recentGames);
}
window.recordRecentGame = recordRecentGame;

function getGreetingPrefix() {
  const hr = new Date().getHours();
  if (hr >= 5 && hr < 12) return 'صباح الخير،';
  if (hr >= 12 && hr < 17) return 'طاب يومك،';
  return 'مساء الخير،';
}

function enhanceAllSelects() {
  $$('select:not(.csel-native)').forEach(sel => {
    if (sel.dataset.noCsel === '1' || sel.closest('.csel-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'csel-wrap';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add('csel-native');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'csel-btn' + (sel.disabled ? ' disabled' : '');
    const menu = document.createElement('div');
    menu.className = 'csel-menu';
    wrap.appendChild(btn);
    wrap.appendChild(menu);

    const syncUI = () => {
      const opts = [...sel.options];
      const cur = opts[sel.selectedIndex] || opts[0] || { text: '', value: '' };
      btn.disabled = sel.disabled;
      btn.classList.toggle('disabled', sel.disabled);
      btn.innerHTML = `<span class="csel-lbl">${esc(cur.text)}</span><span class="csel-arr">▾</span>`;
      menu.innerHTML = opts.map(o => {
        const on = o.value === sel.value;
        return `<div class="csel-opt ${on ? 'on' : ''}" data-csel-val="${esc(o.value)}">
          <span>${esc(o.text)}</span>
          <span class="chk">✓</span>
        </div>`;
      }).join('');
    };
    syncUI();
    sel.addEventListener('change', syncUI);
  });
}
window.enhanceAllSelects = enhanceAllSelects;

function syncHubWidgets() {
  const greetPrefix = document.getElementById('hubGreetPrefix');
  const greetName = document.getElementById('hubGreetName');
  if (greetPrefix) greetPrefix.textContent = getGreetingPrefix();
  if (greetName) greetName.textContent = PF.name || 'لاعب';

  const dockAv = document.getElementById('hubMyDockAv');
  const dockName = document.getElementById('hubMyDockName');
  if (dockAv) {
    dockAv.textContent = PF.av || '😎';
    dockAv.style.setProperty('--c', PF.col || '#0ea5e9');
  }
  if (dockName) dockName.textContent = PF.name || 'لاعب';

  // Notification dot
  const invList = (typeof savedInvites === 'function') ? savedInvites().filter(x => Date.now() - (x.ts || 0) < 3600000) : [];
  const fReqs = (typeof incomingRequests === 'function') ? incomingRequests() : [];
  const notifDot = document.getElementById('hubNotifDot');
  if (notifDot) notifDot.classList.toggle('hide', (invList.length + fReqs.length) === 0);

  // Global Active Room Banner (when player has an active room and is viewing Dashboard/Rooms/Friends/Profile)
  const activeBannerSlot = document.getElementById('globalActiveRoomSlot');
  if (activeBannerSlot) {
    const activeRm = SharbSession.getActiveRoom();
    const curPage = getCurrentPageKey();
    if (activeRm && activeRm.code && curPage !== activeRm.game) {
      const gm = SHARB_GAME_META[activeRm.game] || SHARB_GAME_META.domino;
      activeBannerSlot.innerHTML = `
        <div class="global-active-room-bar">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:20px">${gm.icon}</span>
            <div>
              <b style="font-size:13.5px">لديك غرفة نشطة حاليًا في ${esc(gm.name)} (كود: #${esc(activeRm.code)})</b>
              <div class="mut tiny">يمكنك العودة إلى غرفتك ومتابعة اللعب دون فقدان الاتصال</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <a class="btn ok sm" href="${esc(getPageUrl(activeRm.game, { room: activeRm.code }))}">🚀 العودة للغرفة</a>
            <button type="button" class="mini del" id="dismissActiveRoomBannerBtn">إغلاق الغرفة ✕</button>
          </div>
        </div>
      `;
      const disBtn = document.getElementById('dismissActiveRoomBannerBtn');
      if (disBtn) {
        disBtn.onclick = () => {
          pubDirNotifyRoomClosed(activeRm.game, activeRm.code, 'explicit_close');
          SharbSession.clearActiveRoom();
          SharbSession.clearGameSession(activeRm.game);
          syncHubWidgets();
        };
      }
    } else {
      activeBannerSlot.innerHTML = '';
    }
  }

  // Recently Played Games Bar on Homepage
  const recWrap = document.getElementById('hubRecentWrap');
  if (recWrap) {
    const recList = (Array.isArray(SHARB_HUB.recentGames) ? SHARB_HUB.recentGames : []).filter(g => SHARB_GAME_META[g]);
    if (recList.length > 0) {
      recWrap.classList.remove('hide');
      recWrap.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <span style="font-size:12.5px;font-weight:800;color:var(--text-secondary)">⏱️ لُعبت مؤخرًا:</span>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          ${recList.map(gid => {
            const gm = SHARB_GAME_META[gid];
            return `<a class="pub-f-pill" href="${esc(getPageUrl(gid))}">${gm.icon} <span>${esc(gm.name)}</span> <span style="color:var(--accent-primary-hover);font-size:11px">▶</span></a>`;
          }).join('')}
        </div>
      </div>`;
    } else {
      recWrap.classList.add('hide');
    }
  }
}
window.syncHubWidgets = syncHubWidgets;

function applyHubSearchAndCategoryFilter() {
  const q = String(SHARB_HUB.searchQuery || '').trim().toLowerCase();
  const cat = SHARB_HUB.gameCategory || 'all';
  const gridEl = document.getElementById('hubGamesGrid');
  if (gridEl) gridEl.classList.toggle('is-filtered', Boolean(q || cat !== 'all'));
  $$('#hubGamesGrid .hub-game-card').forEach(card => {
    const itemCat = card.getAttribute('data-gcat-item') || 'all';
    const titleText = (card.getAttribute('data-gtitle') || '') + ' ' + (card.textContent || '');
    const catMatch = (cat === 'all' || itemCat === cat);
    const searchMatch = (!q || titleText.toLowerCase().includes(q));
    card.classList.toggle('hide', !(catMatch && searchMatch));
  });
}

function initPlatformShell() {
  highlightActiveNavigation();
  renderProfileBtn();
  renderSound();
  if (typeof renderFriends === 'function') renderFriends();
  if (typeof initPublicRoomsSystem === 'function') initPublicRoomsSystem();
  if (typeof renderProfilePage === 'function' && $('#profilePageRoot')) renderProfilePage();
  if (typeof renderFriendsPage === 'function' && $('#friendsPageRoot')) renderFriendsPage();
  enhanceAllSelects();
  syncHubWidgets();

  // Header buttons
  const sndBtn = $('#snd');
  if (sndBtn) {
    sndBtn.onclick = () => {
      soundOn = !soundOn;
      store.set('snd', soundOn);
      renderSound();
      if (soundOn) beep(520, 0.08, 'sine', 0.08);
    };
  }

  const thBtn = $('#themesBtn');
  if (thBtn) thBtn.onclick = openThemes;

  const pbBtn = $('#pb');
  if (pbBtn && pbBtn.tagName === 'BUTTON') {
    pbBtn.onclick = () => openProfile(me0(), true);
  }

  const aboutBtn = $('#aboutCopyrightBtn');
  if (aboutBtn) aboutBtn.onclick = openAboutCopyrightModal;

  const notifBtn = $('#hubNotifBtn');
  if (notifBtn) {
    notifBtn.onclick = () => {
      navigateToPage('friends');
    };
  }

  // Homepage search & category filters
  const searchInp = document.getElementById('hubSearchInput');
  const clearBtn = document.getElementById('hubSearchClearBtn');
  if (searchInp) {
    searchInp.addEventListener('input', () => {
      SHARB_HUB.searchQuery = searchInp.value;
      if (clearBtn) clearBtn.classList.toggle('hide', !searchInp.value);
      applyHubSearchAndCategoryFilter();
    });
  }
  if (clearBtn && searchInp) {
    clearBtn.onclick = () => {
      searchInp.value = '';
      SHARB_HUB.searchQuery = '';
      clearBtn.classList.add('hide');
      applyHubSearchAndCategoryFilter();
    };
  }

  // Left sidebar friend controls on Homepage / Rooms page
  const homeFa = $('#homeFa');
  const homeFn = $('#homeFn');
  if (homeFa && homeFn) {
    homeFa.onclick = () => { if (handleAddFriendInput(homeFn.value)) homeFn.value = ''; };
    homeFn.addEventListener('keydown', e => { if (e.key === 'Enter') homeFa.click(); });
  }
  const homeCopyMe = $('#homeCopyMe');
  if (homeCopyMe) homeCopyMe.onclick = () => copyText(PF.uid);

  const homeFl = $('#homeFl');
  if (homeFl) homeFl.addEventListener('click', e => handleFriendListClick(e, 'h'));

  // Quick code join on Homepage / Rooms page
  let quickJoinGame = 'domino';
  const qPills = $('#homeQuickGamePills');
  if (qPills) {
    qPills.addEventListener('click', e => {
      const p = e.target.closest('[data-qgame]');
      if (!p) return;
      quickJoinGame = p.dataset.qgame;
      $$('#homeQuickGamePills .quick-g-pill').forEach(el => el.classList.toggle('on', el === p));
      beep(420, 0.05, 'sine', 0.05);
    });
  }
  const qJoinBtn = $('#homeQuickJoinBtn');
  const qCodeInp = $('#homeQuickCode');
  if (qJoinBtn && qCodeInp) {
    qJoinBtn.onclick = () => {
      const c = (qCodeInp.value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (c.length < 4) return toast('اكتب كود الغرفة الصحيح (٤-٦ أحرف/أرقام)', 'warn');
      acceptGameInvite(c, quickJoinGame, 'code');
    };
    qCodeInp.addEventListener('keydown', e => { if (e.key === 'Enter') qJoinBtn.click(); });
  }

  // Custom dropdown global click handler
  document.addEventListener('click', e => {
    const opt = e.target.closest('.csel-opt');
    if (opt) {
      const wrap = opt.closest('.csel-wrap');
      if (!wrap) return;
      const sel = wrap.querySelector('select');
      if (sel && !sel.disabled) {
        sel.value = opt.getAttribute('data-csel-val');
        wrap.classList.remove('open');
        $$('.csel-opt', wrap).forEach(el => el.classList.toggle('on', el === opt));
        const lbl = $('.csel-lbl', wrap);
        if (lbl) lbl.innerHTML = opt.querySelector('span').innerHTML;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        beep(460, 0.05, 'sine', 0.05);
      }
      return;
    }
    const btn = e.target.closest('.csel-btn');
    if (btn) {
      if (btn.disabled || btn.classList.contains('disabled')) return;
      const wrap = btn.closest('.csel-wrap');
      const wasOpen = wrap && wrap.classList.contains('open');
      $$('.csel-wrap.open').forEach(w => w.classList.remove('open'));
      if (wrap && !wasOpen) wrap.classList.add('open');
      return;
    }
    $$('.csel-wrap.open').forEach(w => w.classList.remove('open'));

    const catBtn = e.target.closest('[data-gcat]');
    if (catBtn) {
      SHARB_HUB.gameCategory = catBtn.getAttribute('data-gcat') || 'all';
      $$('#hubGameCategoryPills [data-gcat]').forEach(b => b.classList.toggle('on', b === catBtn));
      applyHubSearchAndCategoryFilter();
      return;
    }

    const qcModalBtn = e.target.closest('[data-open-create-modal]');
    if (qcModalBtn) {
      openQuickCreateRoomModal(qcModalBtn.getAttribute('data-open-create-modal') || undefined);
      return;
    }

    const joinFriendRm = e.target.closest('[data-joinfriendroom]');
    if (joinFriendRm) {
      const rKey = joinFriendRm.getAttribute('data-joinfriendroom');
      if (rKey && typeof joinPublicRoom === 'function') joinPublicRoom(rKey);
      return;
    }
  });

  // Unlock Web Audio on first pointerdown
  const unlock = () => {
    try { if (ac && ac.state === 'suspended') ac.resume(); } catch (e) {}
    window.removeEventListener('pointerdown', unlock);
  };
  window.addEventListener('pointerdown', unlock);

  setTimeout(startPresence, 600);
}

document.addEventListener('DOMContentLoaded', initPlatformShell);
