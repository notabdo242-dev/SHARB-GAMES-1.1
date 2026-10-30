/* ==========================================================================
   SHARB GAMES — FRIENDS, REAL-TIME PRESENCE, INVITES & FRIENDS PAGE (js/friends.js)
   ========================================================================== */

let homeQuickGame = 'domino';
const P_TTL = 50000;

function friends() {
  const me = myUid();
  const raw = store.get('fr_' + me, []);
  return (Array.isArray(raw) ? raw : []).filter(f => f && f.uid && String(f.uid).toLowerCase() !== me);
}
window.friends = friends;

function saveFriends(a) {
  const me = myUid();
  const clean = (Array.isArray(a) ? a : []).filter(f => f && f.uid && String(f.uid).toLowerCase() !== me);
  store.set('fr_' + me, clean);
}
window.saveFriends = saveFriends;

function sentRequests() {
  const me = myUid();
  const fset = new Set(friends().map(f => String(f.uid).toLowerCase()));
  const raw = store.get('fr_out_' + me, []);
  return (Array.isArray(raw) ? raw : []).filter(r => r && r.uid && String(r.uid).toLowerCase() !== me && !fset.has(String(r.uid).toLowerCase()));
}
window.sentRequests = sentRequests;

function saveSentRequests(a) {
  const me = myUid();
  const clean = (Array.isArray(a) ? a : []).filter(r => r && r.uid && String(r.uid).toLowerCase() !== me);
  store.set('fr_out_' + me, clean);
}
window.saveSentRequests = saveSentRequests;

function incomingRequests() {
  const me = myUid();
  const fset = new Set(friends().map(f => String(f.uid).toLowerCase()));
  const raw = store.get('fr_in_' + me, []);
  return (Array.isArray(raw) ? raw : []).filter(r => r && r.uid && String(r.uid).toLowerCase() !== me && !fset.has(String(r.uid).toLowerCase()));
}
window.incomingRequests = incomingRequests;

function saveIncomingRequests(a) {
  const me = myUid();
  const clean = (Array.isArray(a) ? a : []).filter(r => r && r.uid && String(r.uid).toLowerCase() !== me);
  store.set('fr_in_' + me, clean);
}
window.saveIncomingRequests = saveIncomingRequests;

function savedInvites() {
  const me = myUid();
  const raw = store.get('fr_inv_' + me, []);
  return (Array.isArray(raw) ? raw : []).filter(x => x && x.code && (!x.from || String(x.from.uid || '').toLowerCase() !== me));
}
window.savedInvites = savedInvites;

function saveInvites(a) {
  const me = myUid();
  store.set('fr_inv_' + me, (Array.isArray(a) ? a : []).slice(0, 15));
}
window.saveInvites = saveInvites;

function isFriend(u) {
  if (!u) return false;
  const clean = String(u).toLowerCase();
  return friends().some(f => String(f.uid).toLowerCase() === clean);
}
window.isFriend = isFriend;

function hasSentRequest(u) {
  if (!u) return false;
  const clean = String(u).toLowerCase();
  return sentRequests().some(r => String(r.uid).toLowerCase() === clean);
}
window.hasSentRequest = hasSentRequest;

let frBC = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    frBC = new BroadcastChannel('sharb_friends_bus_v2');
    frBC.onmessage = ev => {
      const m = ev && ev.data;
      if (m && m.topic && m.payload) {
        const fn = NET.topics.get(m.topic);
        if (fn) { try { fn(m.payload, m.topic); } catch (e) {} }
      }
    };
  }
  window.addEventListener('storage', ev => {
    if (!ev.key || !ev.newValue) return;
    const me = myUid();
    if (ev.key === 'fr_' + me || ev.key === 'fr_out_' + me || ev.key === 'fr_in_' + me) {
      renderFriends();
      return;
    }
    if (ev.key === 'fr_inv_' + me) {
      renderHomeInvites();
      if (typeof renderFriendsPage === 'function') renderFriendsPage();
      return;
    }
    if (ev.key.startsWith('fr2_bus_')) {
      try {
        const m = JSON.parse(ev.newValue);
        if (m && m.topic && m.payload) {
          const fn = NET.topics.get(m.topic);
          if (fn) fn(m.payload, m.topic);
        }
      } catch (e) {}
    }
  });
} catch (e) {}

function pubPresenceMsg(topic, obj, opt) {
  pub(topic, obj, Object.assign({}, opt || {}, { _skipLocalBus: true }));
  try {
    if (opt && opt.retain) localStorage.setItem('fr2_ret_' + topic, JSON.stringify({ ts: Date.now(), payload: obj }));
    if (frBC) frBC.postMessage({ topic, payload: obj, ts: Date.now() });
    localStorage.setItem('fr2_bus_' + topic, JSON.stringify({ topic, payload: obj, ts: Date.now(), r: Math.random() }));
  } catch (e) {}
}

function subPresenceTopic(topic, fn) {
  sub(topic, fn);
  try {
    const ret = localStorage.getItem('fr2_ret_' + topic);
    if (ret) {
      const parsed = JSON.parse(ret);
      if (parsed && parsed.payload) setTimeout(() => { try { fn(parsed.payload, topic); } catch (e) {} }, 15);
    }
  } catch (e) {}
}

function isOnline(u) {
  if (!u) return false;
  const clean = String(u).toLowerCase();
  if (clean === myUid()) return false;
  const p = NET.presence[clean];
  if (!p || p.online === false) return false;
  return Date.now() - (p.ts || p.seen || 0) < P_TTL;
}
window.isOnline = isOnline;

function addConfirmedFriend(p, silent) {
  if (!p || !p.uid) return false;
  const cleanUid = String(p.uid).trim().toLowerCase();
  if (!cleanUid || cleanUid === myUid()) return false;
  registerKnownProfile(p);
  const known = getKnownProfile(cleanUid) || {};
  const rec = {
    uid: cleanUid,
    name: String(p.name || known.name || 'صديق').slice(0, 14),
    av: p.av || known.av || '🙂',
    col: p.col || known.col || COLS[0],
    addedAt: Date.now()
  };
  saveSentRequests(sentRequests().filter(r => String(r.uid).toLowerCase() !== cleanUid));
  saveIncomingRequests(incomingRequests().filter(r => String(r.uid).toLowerCase() !== cleanUid));

  const a = friends();
  const i = a.findIndex(f => String(f.uid).toLowerCase() === cleanUid);
  let isNew = false;
  if (i >= 0) {
    a[i] = Object.assign({}, a[i], rec);
  } else {
    a.unshift(rec);
    isNew = true;
  }
  saveFriends(a);
  renderFriends();
  if (typeof renderRoomPlayers === 'function') renderRoomPlayers();
  if (window.BK && $('#bakasa') && !$('#bakasa').classList.contains('hide')) bkRender();
  if (!silent) toast('تمت إضافة ' + rec.name + ' للأصدقاء ✅', 'ok');
  startPresence();
  return isNew;
}
window.addConfirmedFriend = addConfirmedFriend;

function addFriend(p, silent) {
  if (!p || !p.uid) return false;
  const cleanUid = String(p.uid).trim().toLowerCase();
  if (!cleanUid || cleanUid === myUid()) {
    if (!silent) toast('ده كود الصداقة بتاعك انت 😄 مينفعش تضيف نفسك!', 'warn');
    return false;
  }
  if (isFriend(cleanUid)) {
    if (!silent) toast((p.name || 'صاحبك') + ' موجود في أصدقائك بالفعل ✅', 'ok');
    return false;
  }
  const inc = incomingRequests().find(r => String(r.uid).toLowerCase() === cleanUid);
  if (inc) {
    acceptFriendRequest(cleanUid);
    return true;
  }
  const known = getKnownProfile(cleanUid);
  const resolvedName = (known && known.name) || (p.name && !String(p.name).startsWith('صديق ') ? p.name : null) || ('كود: ' + cleanUid.toUpperCase());
  const rec = {
    uid: cleanUid,
    name: String(resolvedName).slice(0, 14),
    av: (known && known.av) || p.av || '🙂',
    col: (known && known.col) || p.col || COLS[0],
    ts: Date.now()
  };
  const out = sentRequests();
  const idx = out.findIndex(r => String(r.uid).toLowerCase() === cleanUid);
  if (idx >= 0) out[idx] = Object.assign({}, out[idx], rec);
  else out.unshift(rec);
  saveSentRequests(out);
  renderFriends();
  startPresence();
  pubPresenceMsg(inboxTopic(cleanUid), {
    t: 'friend_req',
    id: uid(),
    to: cleanUid,
    from: me0(),
    ts: Date.now()
  }, { retain: true });
  if (!silent) toast('تم إرسال طلب الصداقة — في انتظار القبول ⏳', 'ok');
  return true;
}
window.addFriend = addFriend;

function acceptFriendRequest(fuid) {
  const clean = String(fuid || '').trim().toLowerCase();
  if (!clean || clean === myUid()) return;
  const ft = $('#toasts [data-freq-toast="' + clean + '"]');
  if (ft) ft.remove();
  const req = incomingRequests().find(r => String(r.uid).toLowerCase() === clean) || getKnownProfile(clean) || { uid: clean, name: clean.toUpperCase() };
  saveIncomingRequests(incomingRequests().filter(r => String(r.uid).toLowerCase() !== clean));
  addConfirmedFriend(req, true);
  pubPresenceMsg(inboxTopic(clean), {
    t: 'friend_accept',
    to: clean,
    from: me0(),
    ts: Date.now()
  }, { retain: true });
  toast(`تم قبول طلب الصداقة من ${req.name || 'صديقك'} ✅`, 'ok');
  beep(620, 0.09, 'sine', 0.09);
}
window.acceptFriendRequest = acceptFriendRequest;

function rejectFriendRequest(fuid) {
  const clean = String(fuid || '').trim().toLowerCase();
  if (!clean) return;
  const ft = $('#toasts [data-freq-toast="' + clean + '"]');
  if (ft) ft.remove();
  const req = incomingRequests().find(r => String(r.uid).toLowerCase() === clean);
  saveIncomingRequests(incomingRequests().filter(r => String(r.uid).toLowerCase() !== clean));
  renderFriends();
  pubPresenceMsg(inboxTopic(clean), {
    t: 'friend_reject',
    to: clean,
    from: me0(),
    ts: Date.now()
  });
  if (req) toast(`تم رفض طلب الصداقة من ${req.name}`, '');
}
window.rejectFriendRequest = rejectFriendRequest;

function cancelSentRequest(fuid) {
  const clean = String(fuid || '').trim().toLowerCase();
  if (!clean) return;
  saveSentRequests(sentRequests().filter(r => String(r.uid).toLowerCase() !== clean));
  renderFriends();
  pubPresenceMsg(inboxTopic(clean), {
    t: 'friend_cancel',
    to: clean,
    from: me0(),
    ts: Date.now()
  });
  toast('تم إلغاء طلب الصداقة', '');
}
window.cancelSentRequest = cancelSentRequest;

function handleAddFriendInput(rawVal) {
  let v = String(rawVal || '').trim();
  if (!v) return false;
  if (v.includes('addfriend=')) {
    try {
      const u = new URL(v);
      const fuid = u.searchParams.get('addfriend');
      const fname = u.searchParams.get('fname') || '';
      const fav = u.searchParams.get('fav') || '🙂';
      const fcol = u.searchParams.get('fcol') || COLS[rnd(COLS.length)];
      if (fuid) return addFriend({ uid: fuid.toLowerCase(), name: fname, av: fav, col: fcol });
    } catch (e) {}
  }
  const clean = v.toLowerCase();
  if (clean === myUid()) {
    toast('ده كود الصداقة بتاعك انت 😄 مينفعش تضيف نفسك!', 'warn');
    return false;
  }
  if (/^[a-z0-9]{4,16}$/i.test(v)) {
    const known = getKnownProfile(clean);
    addFriend({
      uid: clean,
      name: (known && known.name) || ('كود: ' + clean.toUpperCase()),
      av: (known && known.av) || '🙂',
      col: (known && known.col) || COLS[rnd(COLS.length)]
    });
    return true;
  }
  toast('اكتب كود الصداقة الصحيح الخاص بصديقك (مثال: ' + myUid() + ')', 'warn');
  return false;
}
window.handleAddFriendInput = handleAddFriendInput;

function getFriendPresenceState(f) {
  if (!f || !f.uid) return { online: false, state: 'offline', label: '⚪ غير متصل', pubRoomKey: '' };
  const clean = String(f.uid).toLowerCase();
  const on = isOnline(clean);
  if (!on) return { online: false, state: 'offline', label: '⚪ غير متصل • ' + String(f.uid).toUpperCase(), pubRoomKey: '' };
  const p = NET.presence[clean] || {};
  const age = Date.now() - (p.ts || p.seen || 0);
  let pubRoomKey = '';
  let gameLabel = '';
  if (p.pubRoom && p.pubRoom.roomKey && p.pubRoom.allowJoin) {
    pubRoomKey = p.pubRoom.roomKey;
    const gm = SHARB_GAME_META[p.pubRoom.game] ? SHARB_GAME_META[p.pubRoom.game].name : '';
    gameLabel = gm;
  } else if (typeof PUB_DIR !== 'undefined' && PUB_DIR.rooms) {
    PUB_DIR.rooms.forEach(rm => {
      if (!rm.closed && rm.visibility === 'public' && rm.allowJoin && String(rm.hostPid || '').toLowerCase().startsWith(clean)) {
        pubRoomKey = rm.roomKey;
        const gm = SHARB_GAME_META[rm.game] ? SHARB_GAME_META[rm.game].name : '';
        gameLabel = gm;
      }
    });
  }
  if (p.activity === 'ingame' || pubRoomKey) {
    return {
      online: true,
      state: 'ingame',
      label: gameLabel ? `🎮 في غرفة ${gameLabel}` : '🎮 داخل لعبة الآن',
      pubRoomKey
    };
  }
  if (p.activity === 'away' || age > 28000) {
    return { online: true, state: 'away', label: '🌙 بالخارج (Away)', pubRoomKey: '' };
  }
  return { online: true, state: 'online', label: '🟢 متصل الآن', pubRoomKey: '' };
}
window.getFriendPresenceState = getFriendPresenceState;

function friendItemHTML(f, i, prefix = '') {
  const st = getFriendPresenceState(f);
  const on = st.online;
  const initials = String(f.name || 'ص').trim().slice(0, 2);
  const avDisplay = f.av || initials;
  return `<div class="friend" data-friend-online="${on ? '1' : '0'}">
    <span class="pc" data-${prefix}vf="${i}">
      <span class="av sm" style="--c:${esc(f.col || COLS[0])}">${esc(avDisplay)}${on ? '<i class="dot"></i>' : ''}</span>
      <span style="min-width:0">
        <b>${esc(f.name)}</b>
        <small>${esc(st.label)}</small>
      </span>
    </span>
    <span style="display:flex;gap:5px;align-items:center;flex-shrink:0">
      ${st.pubRoomKey ? `<button class="mini ok" data-joinfriendroom="${esc(st.pubRoomKey)}">🚀 انضمام</button>` : ''}
      <button class="mini ${st.pubRoomKey ? '' : 'ok'}" data-${prefix}inv="${i}">🎮 دعوة</button>
      <button class="mini del" data-${prefix}del="${i}" title="حذف">✕</button>
    </span>
  </div>`;
}

function incomingReqItemHTML(r, prefix = '') {
  return `<div class="inv-item" style="margin-bottom:6px">
    <span class="pc">
      <span class="av sm" style="--c:${esc(r.col || '#0ea5e9')}">${esc(r.av || '👋')}</span>
      <span>
        <b>👋 طلب صداقة: ${esc(r.name)}</b>
        <small>كود: <b style="direction:ltr">${esc(String(r.uid).toUpperCase())}</b></small>
      </span>
    </span>
    <span style="display:flex;gap:5px">
      <button class="mini ok" data-${prefix}accf="${esc(r.uid)}">✅ قبول</button>
      <button class="mini del" data-${prefix}rejf="${esc(r.uid)}">✕ رفض</button>
    </span>
  </div>`;
}

function sentReqItemHTML(r, prefix = '') {
  const known = getKnownProfile(r.uid);
  const dispName = (known && known.name) || r.name || ('كود: ' + String(r.uid).toUpperCase());
  const dispAv = (known && known.av) || r.av || '⏳';
  const dispCol = (known && known.col) || r.col || COLS[0];
  return `<div class="friend" style="border-style:dashed;border-color:rgba(245,158,11,.38)">
    <span class="pc">
      <span class="av sm" style="--c:${esc(dispCol)}">${esc(dispAv)}</span>
      <span>
        <b>${esc(dispName)}</b>
        <small style="color:var(--status-warning)">⏳ بانتظار القبول…</small>
      </span>
    </span>
    <button class="mini del" data-${prefix}cancelf="${esc(r.uid)}">إلغاء ✕</button>
  </div>`;
}

function buildFriendsPanelListHTML(prefix = '') {
  const inc = incomingRequests();
  const out = sentRequests();
  const list = friends();
  if (!inc.length && !out.length && !list.length) {
    return '<div class="empty">لا يوجد أصدقاء مضافون حاليًا.<br>انسخ كود الصداقة وشاركه مع أصدقائك أو أضف كود صديقك بالأعلى!</div>';
  }
  let html = '';
  if (inc.length) {
    html += `<div class="lbl" style="color:var(--status-online);margin:4px 0">👋 طلبات صداقة واردة (${inc.length}):</div>`;
    html += inc.map(r => incomingReqItemHTML(r, prefix)).join('');
  }
  if (out.length) {
    html += `<div class="lbl" style="color:var(--status-warning);margin:6px 0 4px">⏳ طلبات مرسلة (${out.length}):</div>`;
    html += out.map(r => sentReqItemHTML(r, prefix)).join('');
  }
  if (list.length) {
    const indexed = list.map((f, idx) => ({ f, idx, on: isOnline(f.uid) }));
    const onlineFriends = indexed.filter(x => x.on);
    const offlineFriends = indexed.filter(x => !x.on);

    html += `<div class="fr-section-label"><span>🟢 متصلون الآن (${onlineFriends.length})</span></div>`;
    if (onlineFriends.length) {
      html += onlineFriends.map(x => friendItemHTML(x.f, x.idx, prefix)).join('');
    } else {
      html += `<div class="mut tiny" style="padding:7px 10px;border-radius:9px;background:var(--bg-primary);text-align:center">لا يوجد أصدقاء متصلون الآن</div>`;
    }
    if (offlineFriends.length) {
      html += `<details class="fr-offline-details" ${onlineFriends.length === 0 ? 'open' : ''}>
        <summary><span>⚪ غير متصلين (${offlineFriends.length})</span></summary>
        <div class="plist" style="margin-top:6px">
          ${offlineFriends.map(x => friendItemHTML(x.f, x.idx, prefix)).join('')}
        </div>
      </details>`;
    }
  }
  return html;
}
window.buildFriendsPanelListHTML = buildFriendsPanelListHTML;

function renderHomeInvites() {
  const box = $('#homeInvitesList');
  if (!box) return;
  const list = savedInvites().filter(x => Date.now() - (x.ts || 0) < 3600000);
  if (!list.length) {
    box.innerHTML = `<div class="empty" style="padding:10px">لا توجد دعوات لعب واردة حاليًا.</div>`;
    return;
  }
  const gameTitle = { domino: '🁫 دومينو', uno: '🎴 UNO', bakasa: '🕵️ البكاسة', chess: '♟️ شطرنج', ttt: '❌⭕ إكس أو', c4: '🔴🟡 كونكت فور', draw: '🎨 ارسم وخمّن' };
  box.innerHTML = list.map((inv, idx) => `<div class="inv-item">
    <span class="pc">
      <span class="av sm" style="--c:${esc((inv.from && inv.from.col) || '#0ea5e9')}">${esc((inv.from && inv.from.av) || '🎮')}</span>
      <span>
        <b>${esc((inv.from && inv.from.name) || 'صديق')} يدعوك للعب ${gameTitle[inv.game] || '🁫 دومينو'}</b>
        <small>كود الغرفة: <b style="direction:ltr;color:var(--accent-primary-hover)">${esc(inv.code)}</b></small>
      </span>
    </span>
    <span style="display:flex;gap:5px;flex-shrink:0">
      <button class="btn ok sm" data-joininv="${idx}">قبول ودخول</button>
      <button class="mini del" data-delinv="${idx}">✕</button>
    </span>
  </div>`).join('');
}
window.renderHomeInvites = renderHomeInvites;

function renderFriends() {
  const list = friends();
  const inc = incomingRequests();
  const out = sentRequests();
  const onlineCount = list.filter(f => isOnline(f.uid)).length;
  if ($('#fl')) setHTMLIfChanged($('#fl'), buildFriendsPanelListHTML(''));
  if ($('#homeFl')) setHTMLIfChanged($('#homeFl'), buildFriendsPanelListHTML('h'));
  if ($('#bkFriendsList')) setHTMLIfChanged($('#bkFriendsList'), buildFriendsPanelListHTML('bk'));
  if ($('#dgFriendsList')) setHTMLIfChanged($('#dgFriendsList'), buildFriendsPanelListHTML('dg'));
  if ($('#homeMyCode')) $('#homeMyCode').textContent = PF.uid;
  if ($('#myCode')) $('#myCode').textContent = PF.uid;
  if ($('#hubFriendsOnlineCountBadge')) {
    $('#hubFriendsOnlineCountBadge').textContent = `${onlineCount} متصل • ${list.length} الكل`;
  }
  renderHomeInvites();
  if (typeof renderFriendsPage === 'function' && $('#friendsPageRoot')) renderFriendsPage();
  if (typeof syncHubWidgets === 'function') syncHubWidgets();
}
window.renderFriends = renderFriends;

function handleFriendListClick(e, prefix = '') {
  const accBtn = e.target.closest(`[data-${prefix}accf]`);
  if (accBtn) { acceptFriendRequest(accBtn.getAttribute(`data-${prefix}accf`)); return true; }
  const rejBtn = e.target.closest(`[data-${prefix}rejf]`);
  if (rejBtn) { rejectFriendRequest(rejBtn.getAttribute(`data-${prefix}rejf`)); return true; }
  const canBtn = e.target.closest(`[data-${prefix}cancelf]`);
  if (canBtn) { cancelSentRequest(canBtn.getAttribute(`data-${prefix}cancelf`)); return true; }
  const del = e.target.closest(`[data-${prefix}del]`);
  const inv = e.target.closest(`[data-${prefix}inv]`);
  const vf = e.target.closest(`[data-${prefix}vf]`);
  if (del) {
    const idx = +del.getAttribute(`data-${prefix}del`);
    const a = friends();
    a.splice(idx, 1);
    saveFriends(a);
    renderFriends();
    if (typeof renderRoomPlayers === 'function') renderRoomPlayers();
    return true;
  }
  if (inv) {
    const idx = +inv.getAttribute(`data-${prefix}inv`);
    const f = friends()[idx];
    if (f) smartInviteFriend(f);
    return true;
  }
  if (vf) {
    const idx = +vf.getAttribute(`data-${prefix}vf`);
    const f = friends()[idx];
    if (f) {
      if ($('#friendsPagePreviewSlot')) {
        window._selectedFriendUid = f.uid;
        renderFriendsPage();
      } else {
        openProfile({ name: f.name, av: f.av, col: f.col, st: { g: 0, w: 0, r: 0, p: 0 } }, false);
      }
    }
    return true;
  }
  return false;
}
window.handleFriendListClick = handleFriendListClick;

function myPresence() {
  const hostRm = (typeof pubDirGetActiveHostRoom === 'function') ? pubDirGetActiveHostRoom() : null;
  const activeSess = SharbSession.getActiveRoom();
  const inAnyGame = !!(hostRm || activeSess || (typeof G !== 'undefined' && G) || (window.BK && BK.code) || (window.CH && CH.mode === 'online' && CH.code) || (window.TTT && TTT.mode === 'online' && TTT.code) || (window.C4 && C4.mode === 'online' && C4.code) || (window.DG && DG.code));
  const pubRoomMeta = (hostRm && hostRm.visibility === 'public')
    ? { roomKey: hostRm.roomKey, game: hostRm.game, code: hostRm.code, allowJoin: hostRm.allowJoin, status: hostRm.status, playersCount: hostRm.playersCount, maxPlayers: hostRm.maxPlayers }
    : null;
  return {
    t: 'presence',
    uid: myUid(),
    name: PF.name,
    av: PF.av,
    col: PF.col,
    online: true,
    activity: document.hidden ? 'away' : (inAnyGame ? 'ingame' : 'online'),
    pubRoom: pubRoomMeta,
    ts: Date.now()
  };
}

function startPresence() {
  const me = myUid();
  if (!me) return;
  if (!NET.presenceSubs.has('in_' + me)) {
    NET.presenceSubs.add('in_' + me);
    subPresenceTopic(inboxTopic(me), inboxIncoming);
  }
  if (!NET.presenceSubs.has('p_' + me)) {
    NET.presenceSubs.add('p_' + me);
    subPresenceTopic(presenceTopic(me), onPresencePacket);
  }
  const watchUids = new Set([
    ...friends().map(f => String(f.uid).toLowerCase()),
    ...sentRequests().map(r => String(r.uid).toLowerCase()),
    ...incomingRequests().map(r => String(r.uid).toLowerCase())
  ]);
  watchUids.forEach(fuid => {
    if (!fuid || fuid === me || NET.presenceSubs.has('p_' + fuid)) return;
    NET.presenceSubs.add('p_' + fuid);
    subPresenceTopic(presenceTopic(fuid), onPresencePacket);
  });
  announce();
  clearInterval(NET.presenceTimer);
  NET.presenceTimer = setInterval(announce, 15000);
  ensureMQTT().then(ok => { if (ok) announce(); }).catch(() => {});
}
window.startPresence = startPresence;

function announce() {
  registerKnownProfile(PF);
  pubPresenceMsg(presenceTopic(myUid()), myPresence(), { retain: true });
}
window.announce = announce;

function onPresencePacket(d) {
  if (!d || typeof d !== 'object' || !d.uid) return;
  const fuid = String(d.uid).toLowerCase();
  if (fuid === myUid()) return;
  const was = isOnline(fuid);
  NET.presence[fuid] = Object.assign({}, d, { uid: fuid, seen: Date.now() });
  NET.presence[fuid].online = d.online !== false;
  if (d.name) registerKnownProfile({ uid: fuid, name: d.name, av: d.av, col: d.col });

  let changed = false;
  const list = friends();
  const f = list.find(x => String(x.uid).toLowerCase() === fuid);
  if (f && d.online !== false && d.name && (f.name !== d.name || f.av !== d.av || f.col !== d.col)) {
    f.name = String(d.name).slice(0, 14);
    f.av = d.av || f.av;
    f.col = d.col || f.col;
    saveFriends(list);
    changed = true;
  }
  const out = sentRequests();
  const sr = out.find(x => String(x.uid).toLowerCase() === fuid);
  if (sr && d.name && (sr.name !== d.name || sr.av !== d.av || sr.col !== d.col)) {
    sr.name = String(d.name).slice(0, 14);
    sr.av = d.av || sr.av;
    sr.col = d.col || sr.col;
    saveSentRequests(out);
    changed = true;
  }
  if (isOnline(fuid) !== was || changed) renderFriends();
}

function inboxIncoming(d) {
  if (!d || typeof d !== 'object') return;
  const me = myUid();
  if (d.to && String(d.to).toLowerCase() !== me) return;
  const from = d.from;
  if (!from || !from.uid) return;
  const fuid = String(from.uid).toLowerCase();
  if (fuid === me) return;

  if (from.name) registerKnownProfile({ uid: fuid, name: from.name, av: from.av, col: from.col });
  if (d.t === 'profile_info') {
    onPresencePacket({ uid: fuid, name: from.name, av: from.av, col: from.col, online: true, ts: Date.now() });
    return;
  }
  if (d.t === 'friend_req') {
    pubPresenceMsg(inboxTopic(fuid), { t: 'profile_info', to: fuid, from: me0(), ts: Date.now() }, { retain: true });
    if (isFriend(fuid)) {
      pubPresenceMsg(inboxTopic(fuid), { t: 'friend_accept', to: fuid, from: me0(), ts: Date.now() }, { retain: true });
      return;
    }
    if (hasSentRequest(fuid)) {
      addConfirmedFriend(from, true);
      pubPresenceMsg(inboxTopic(fuid), { t: 'friend_accept', to: fuid, from: me0(), ts: Date.now() }, { retain: true });
      toast(`🎉 أصبحت أنت و ${from.name || 'صديقك'} أصدقاء الآن!`, 'ok');
      return;
    }
    const inc = incomingRequests();
    const idx = inc.findIndex(r => String(r.uid).toLowerCase() === fuid);
    const rec = { uid: fuid, name: String(from.name || 'لاعب').slice(0, 14), av: from.av || '🙂', col: from.col || COLS[0], ts: d.ts || Date.now() };
    const isNew = idx < 0;
    if (idx >= 0) inc[idx] = Object.assign({}, inc[idx], rec);
    else inc.unshift(rec);
    saveIncomingRequests(inc);
    renderFriends();
    if (isNew) showFriendRequestToast(rec);
    return;
  }
  if (d.t === 'friend_accept') {
    if (!hasSentRequest(fuid) && !isFriend(fuid)) return;
    const wasNew = addConfirmedFriend(from, true);
    if (wasNew) {
      toast(`🎉 وافق ${from.name || 'صديقك'} على طلب الصداقة!`, 'ok', 4200);
      beep(660, 0.1, 'sine', 0.1);
    }
    return;
  }
  if (d.t === 'friend_reject') {
    if (hasSentRequest(fuid)) {
      saveSentRequests(sentRequests().filter(r => String(r.uid).toLowerCase() !== fuid));
      renderFriends();
      toast(`رفض ${from.name || 'اللاعب'} طلب الصداقة`, 'warn');
    }
    return;
  }
  if (d.t === 'friend_cancel') {
    saveIncomingRequests(incomingRequests().filter(r => String(r.uid).toLowerCase() !== fuid));
    renderFriends();
    return;
  }
  if (d.t === 'invite' && d.code) {
    pubPresenceMsg(inboxTopic(fuid), { t: 'ack', to: fuid, id: d.id, from: me0(), ts: Date.now() });
    const gKind = d.game || 'domino';
    const invs = savedInvites().filter(x => x.code !== d.code);
    invs.unshift({ id: d.id || uid(), from: from || {}, code: d.code, game: gKind, ts: Date.now() });
    saveInvites(invs);
    renderHomeInvites();
    showInvite(from || {}, d.code, gKind);
    return;
  }
  if (d.t === 'ack' && d.id) {
    if (NET.invites[d.id]) {
      delete NET.invites[d.id];
      toast('الدعوة وصلت لـ ' + (from.name || 'صاحبك') + ' فورًا ✅', 'ok');
      beep(660, 0.09, 'sine', 0.09);
    }
  }
}

function buildInviteUrl(roomCode, gameKind) {
  const g = gameKind || 'domino';
  const rel = getPageUrl(g, { room: roomCode });
  try {
    return new URL(rel, window.location.href).href;
  } catch (e) {
    return rel;
  }
}
window.buildInviteUrl = buildInviteUrl;

function dispatchInviteToFriend(f, roomCode, gameKind) {
  if (!f || !f.uid || !roomCode) return;
  const fuid = String(f.uid).toLowerCase();
  if (fuid === myUid()) return;
  startPresence();
  const id = uid();
  NET.invites[id] = fuid;
  pubPresenceMsg(inboxTopic(fuid), { t: 'invite', id, to: fuid, code: roomCode, game: gameKind || 'domino', from: me0(), ts: Date.now() });
  toast(`تم إرسال دعوة فورية لـ ${f.name} للانضمام لغرفة ${roomCode} 🚀`, 'ok', 3600);
}
window.dispatchInviteToFriend = dispatchInviteToFriend;

async function createRoomAndInviteFriend(f, gameKind) {
  closeOverlay();
  const g = (gameKind && SHARB_GAME_META[gameKind]) ? gameKind : 'domino';
  const newCode = genCode();
  SharbSession.setRoomIntent({
    game: g,
    action: 'create',
    code: newCode,
    visibility: 'private',
    inviteFriend: { uid: f.uid, name: f.name, av: f.av, col: f.col }
  });
  dispatchInviteToFriend(f, newCode, g);
  navigateToPage(g, { action: 'create', room: newCode, vis: 'private' });
}
window.createRoomAndInviteFriend = createRoomAndInviteFriend;

function openInviteGameModal(f) {
  const html = `<div class="card" style="max-width:420px">
    <span class="av lg" style="--c:${esc(f.col || COLS[0])};margin:0 auto 8px">${esc(f.av || '🙂')}</span>
    <h2>🎮 دعوة ${esc(f.name)} للعب</h2>
    <p class="mut">اختر اللعبة لإنشاء غرفة وإرسال الدعوة لصديقك والانتقال لصفحة اللعبة فورًا:</p>
    <div style="display:flex;flex-direction:column;gap:8px;margin:14px 0">
      <button class="btn ok" data-invgame="domino" style="width:100%">🁫 إنشاء غرفة دومينو ودعوته</button>
      <button class="btn" data-invgame="uno" style="width:100%">🎴 إنشاء غرفة UNO ودعوته</button>
      <button class="btn purple" data-invgame="bakasa" style="width:100%">🕵️ إنشاء غرفة البكاسة ودعوته</button>
      <button class="btn" data-invgame="chess" style="width:100%">♟️ إنشاء غرفة شطرنج ودعوته</button>
      <button class="btn g" data-invgame="ttt" style="width:100%">❌⭕ إنشاء غرفة إكس أو ودعوته</button>
      <button class="btn g" data-invgame="c4" style="width:100%">🔴🟡 إنشاء غرفة كونكت فور ودعوته</button>
      <button class="btn g" data-invgame="draw" style="width:100%">🎨 إنشاء غرفة ارسم وخمّن ودعوته</button>
    </div>
    <div class="row" style="justify-content:center;margin-top:8px">
      <button class="btn g" id="invModalClose">إلغاء</button>
    </div>
  </div>`;
  openOverlay(html, 'invite_game');
  $('#invModalClose').onclick = closeOverlay;
  $$('[data-invgame]').forEach(btn => {
    btn.onclick = () => createRoomAndInviteFriend(f, btn.dataset.invgame);
  });
}
window.openInviteGameModal = openInviteGameModal;

function smartInviteFriend(f) {
  if (!f || !f.uid) return;
  const activeHost = (typeof pubDirGetActiveHostRoom === 'function') ? pubDirGetActiveHostRoom() : null;
  if (activeHost && activeHost.code) {
    dispatchInviteToFriend(f, activeHost.code, activeHost.game);
    return;
  }
  const activeRoom = SharbSession.getActiveRoom();
  if (activeRoom && activeRoom.code) {
    dispatchInviteToFriend(f, activeRoom.code, activeRoom.game);
    return;
  }
  openInviteGameModal(f);
}
window.smartInviteFriend = smartInviteFriend;
window.inviteFriend = smartInviteFriend;

/* ================= DEDICATED FRIENDS PAGE CONTROLLER (pages/friends.html) ================= */
let friendsPageState = {
  search: '',
  filter: 'all' // 'all' | 'online' | 'offline' | 'requests' | 'invites'
};

function renderFriendsPage() {
  const root = $('#friendsPageRoot');
  if (!root) return;

  const list = friends();
  const inc = incomingRequests();
  const out = sentRequests();
  const invs = savedInvites().filter(x => Date.now() - (x.ts || 0) < 3600000);
  const onlineCount = list.filter(f => isOnline(f.uid)).length;
  const offlineCount = list.length - onlineCount;

  const q = friendsPageState.search.trim().toLowerCase();
  const filteredFriends = list.map((f, idx) => ({ f, idx, st: getFriendPresenceState(f) })).filter(item => {
    if (friendsPageState.filter === 'online' && !item.st.online) return false;
    if (friendsPageState.filter === 'offline' && item.st.online) return false;
    if (q) {
      const matchName = String(item.f.name || '').toLowerCase().includes(q);
      const matchUid = String(item.f.uid || '').toLowerCase().includes(q);
      if (!matchName && !matchUid) return false;
    }
    return true;
  });

  const selectedFriend = list.find(f => f.uid === window._selectedFriendUid) || (filteredFriends[0] && filteredFriends[0].f) || null;
  const selState = selectedFriend ? getFriendPresenceState(selectedFriend) : null;

  const previewHTML = selectedFriend ? `
    <div class="friend-preview-card" id="friendsPagePreviewSlot">
      <span class="av lg" style="--c:${esc(selectedFriend.col || '#0ea5e9')}">${esc(selectedFriend.av || '🙂')}</span>
      <div>
        <h3 style="font-size:18px;font-weight:900">${esc(selectedFriend.name)}</h3>
        <div class="mut tiny" style="margin-top:2px">${esc(selState.label)}</div>
      </div>
      <div class="fcode" style="width:100%;justify-content:center">
        <span>كود الصديق: <b>${esc(selectedFriend.uid.toUpperCase())}</b></span>
        <button type="button" class="mini" data-fpage-copy="${esc(selectedFriend.uid)}">📋 نسخ</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;width:100%;justify-content:center">
        ${selState.pubRoomKey ? `<button type="button" class="btn ok sm" data-joinfriendroom="${esc(selState.pubRoomKey)}">🚀 انضمام لغرفته النشطة</button>` : ''}
        <button type="button" class="btn sm" data-fpage-invite="${esc(selectedFriend.uid)}">🎮 دعوة للعب أونلاين</button>
        <button type="button" class="btn danger sm" data-fpage-remove="${esc(selectedFriend.uid)}">🗑 إزالة الصديق</button>
      </div>
    </div>
  ` : `
    <div class="empty" id="friendsPagePreviewSlot" style="padding:28px 16px">
      <div style="font-size:32px;margin-bottom:8px">👥</div>
      <b>معاينة ملف الصديق</b>
      <div class="mut tiny" style="margin-top:4px">اختر أي صديق من القائمة لعرض حالته وإرسال دعوة لعب مباشرة أو أضف صديقًا جديدًا بكود الصداقة.</div>
    </div>
  `;

  let mainListHTML = '';
  if (friendsPageState.filter === 'requests') {
    if (!inc.length && !out.length) {
      mainListHTML = `<div class="empty" style="padding:28px 16px">لا توجد طلبات صداقة واردة أو مرسلة في الوقت الحالي.</div>`;
    } else {
      mainListHTML = `
        ${inc.length ? `<div class="lbl" style="color:var(--status-online)">👋 طلبات صداقة واردة (${inc.length}):</div>` + inc.map(r => incomingReqItemHTML(r, 'fp')).join('') : ''}
        ${out.length ? `<div class="lbl" style="color:var(--status-warning);margin-top:10px">⏳ طلبات صداقة مرسلة (${out.length}):</div>` + out.map(r => sentReqItemHTML(r, 'fp')).join('') : ''}
      `;
    }
  } else if (friendsPageState.filter === 'invites') {
    if (!invs.length) {
      mainListHTML = `<div class="empty" style="padding:28px 16px">لا توجد دعوات غرف واردة حاليًا.</div>`;
    } else {
      mainListHTML = `<div id="homeInvitesList"></div>`;
    }
  } else {
    if (!filteredFriends.length) {
      mainListHTML = `<div class="empty" style="padding:32px 16px">
        <div style="font-size:30px;margin-bottom:6px">🔍</div>
        <b>${list.length === 0 ? 'قائمة الأصدقاء فارغة حاليًا' : 'لا يوجد أصدقاء مطابقون للبحث أو التصفية'}</b>
        <div class="mut tiny" style="margin-top:4px">انسخ كود الصداقة الخاص بك (${esc(PF.uid)}) وشاركه مع أصدقائك أو أضف كود صديقك من الصندوق الجانبي.</div>
      </div>`;
    } else {
      mainListHTML = `<div class="plist">${filteredFriends.map(item => friendItemHTML(item.f, item.idx, 'fp')).join('')}</div>`;
    }
  }

  root.innerHTML = `
    <div class="friends-page-grid">
      <!-- Left Column: My Friend Code, Add Friend & Friend Profile Preview -->
      <div style="display:flex;flex-direction:column;gap:16px">
        <section class="panel glass">
          <h2>🔑 هويتك وإضافة صديق</h2>
          <div class="fcode">
            <span>كود الصداقة الخاص بك: <b id="fpMyUid">${esc(PF.uid)}</b></span>
            <button type="button" class="mini ok" id="fpCopyMyUid">📋 نسخ الكود</button>
          </div>
          <label class="lbl" for="fpAddInput">أضف صديقًا باستخدام كود الصداقة:</label>
          <div class="row">
            <input id="fpAddInput" placeholder="اكتب كود صديقك هنا…" autocomplete="off">
            <button type="button" class="btn ok" id="fpAddBtn">＋ إرسال طلب</button>
          </div>
          <div class="mut tiny">بمجرد قبول صديقك للطلب، يظهر في قائمتك مع حالة اتصاله الحقيقية.</div>
        </section>

        <section class="panel glass">
          <h2>👤 معاينة الصديق والإجراءات</h2>
          ${previewHTML}
        </section>
      </div>

      <!-- Right Column: Search, Status Filters & Friends Directory -->
      <div style="display:flex;flex-direction:column;gap:16px">
        <section class="panel glass">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px">
            <h2 style="margin:0">👥 قائمة الأصدقاء (${list.length})</h2>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <span class="bk-chip ok">🟢 ${onlineCount} متصل</span>
              <span class="bk-chip">⚪ ${offlineCount} غير متصل</span>
              ${inc.length ? `<span class="bk-chip warn">👋 ${inc.length} طلبات</span>` : ''}
            </div>
          </div>

          <div class="pub-rooms-toolbar" style="margin-bottom:14px">
            <div style="flex:1 1 220px">
              <input id="fpSearchInput" type="search" value="${esc(friendsPageState.search)}" placeholder="🔍 ابحث عن صديق بالاسم أو الكود…">
            </div>
            <div class="pub-filter-pills">
              <button type="button" class="pub-f-pill ${friendsPageState.filter === 'all' ? 'on' : ''}" data-fp-filter="all">الكل (${list.length})</button>
              <button type="button" class="pub-f-pill ${friendsPageState.filter === 'online' ? 'on' : ''}" data-fp-filter="online">🟢 متصلون (${onlineCount})</button>
              <button type="button" class="pub-f-pill ${friendsPageState.filter === 'offline' ? 'on' : ''}" data-fp-filter="offline">⚪ غير متصلين (${offlineCount})</button>
              <button type="button" class="pub-f-pill ${friendsPageState.filter === 'requests' ? 'on' : ''}" data-fp-filter="requests">👋 الطلبات (${inc.length + out.length})</button>
              <button type="button" class="pub-f-pill ${friendsPageState.filter === 'invites' ? 'on' : ''}" data-fp-filter="invites">📨 دعوات اللعب (${invs.length})</button>
            </div>
          </div>

          <div id="fpListContainer">${mainListHTML}</div>
        </section>
      </div>
    </div>
  `;

  if (friendsPageState.filter === 'invites') renderHomeInvites();

  $('#fpCopyMyUid').onclick = () => copyText(PF.uid);
  $('#fpAddBtn').onclick = () => {
    const inp = $('#fpAddInput');
    if (inp && handleAddFriendInput(inp.value)) {
      inp.value = '';
      renderFriendsPage();
    }
  };
  $('#fpAddInput').onkeydown = e => { if (e.key === 'Enter') $('#fpAddBtn').click(); };

  const sInp = $('#fpSearchInput');
  if (sInp) {
    sInp.oninput = () => {
      friendsPageState.search = sInp.value;
      renderFriendsPage();
      const nf = $('#fpSearchInput');
      if (nf) { nf.focus(); nf.setSelectionRange(nf.value.length, nf.value.length); }
    };
  }

  $$('[data-fp-filter]', root).forEach(btn => {
    btn.onclick = () => {
      friendsPageState.filter = btn.getAttribute('data-fp-filter') || 'all';
      renderFriendsPage();
    };
  });

  $('#fpListContainer').onclick = e => {
    const joinBtn = e.target.closest('[data-joininv]');
    const delBtn = e.target.closest('[data-delinv]');
    if (joinBtn) {
      const inv = savedInvites()[+joinBtn.dataset.joininv];
      if (inv) {
        const arr = savedInvites(); arr.splice(+joinBtn.dataset.joininv, 1); saveInvites(arr);
        acceptGameInvite(inv.code, inv.game || 'domino', 'code');
      }
      return;
    }
    if (delBtn) {
      const arr = savedInvites(); arr.splice(+delBtn.dataset.delinv, 1); saveInvites(arr);
      renderFriendsPage();
      return;
    }
    handleFriendListClick(e, 'fp');
  };

  const copyFBtn = $('[data-fpage-copy]', root);
  if (copyFBtn) copyFBtn.onclick = () => copyText(copyFBtn.getAttribute('data-fpage-copy'));

  const invFBtn = $('[data-fpage-invite]', root);
  if (invFBtn) {
    invFBtn.onclick = () => {
      const f = friends().find(x => x.uid === invFBtn.getAttribute('data-fpage-invite'));
      if (f) smartInviteFriend(f);
    };
  }

  const remFBtn = $('[data-fpage-remove]', root);
  if (remFBtn) {
    remFBtn.onclick = () => {
      const fuid = remFBtn.getAttribute('data-fpage-remove');
      saveFriends(friends().filter(x => x.uid !== fuid));
      window._selectedFriendUid = '';
      renderFriends();
      toast('تم حذف الصديق من القائمة', '');
    };
  }
}
window.renderFriendsPage = renderFriendsPage;

window.SharbFriends = { friends, addFriend, addConfirmedFriend, renderFriends, renderFriendsPage };
