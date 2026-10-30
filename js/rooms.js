/* ================= SHARB GAMES — IN-ROOM CHAT SYSTEM (SharbRoomChat) ================= */
(function(){
  const CHAT_MAX_LEN = 500;
  const CHAT_HIST_LIMIT = 60;
  const CHAT_MIN_INTERVAL_MS = 900; // minimum 0.9s between messages
  const CHAT_WINDOW_MS = 10000;     // 10-second sliding window
  const CHAT_MAX_PER_WINDOW = 5;    // max 5 messages per 10s window
  const CHAT_STORAGE_PREFIX = 'sharb_room_chat_hist_v1_';
  const CHAT_REPORTS_KEY = 'sharb_chat_reports_v1';

  const GAME_LABELS = {
    domino: 'دومينو 🁫',
    uno: 'UNO 🎴',
    bakasa: 'البكس و البكاسه 🕵️',
    chess: 'الشطرنج ♟️',
    ttt: 'إكس أو ❌⭕',
    c4: 'كونكت فور 🔴🟡',
    draw: 'ارسم وخمّن 🎨'
  };

  const state = {
    activeRoomKey: '',
    activeCtx: null,
    isOpen: false,
    userToggledOnDesktop: false,
    unreadCount: 0,
    messages: [], // array of verified message objects for activeRoomKey
    seenIds: new Set(),
    mutedPids: new Set(),
    mySendTimestamps: [],
    lastSentText: '',
    lastSentAt: 0,
    peerRateMap: new Map(), // pid -> array of timestamps
    roomHistoryCache: new Map(), // roomKey -> array of messages (in-memory + localStorage)
    reportsList: [], // in-memory + localStorage reports
    errTimer: null,
    reportTargetMsg: null,
    bc: null,
    mqttTopic: ''
  };

  // Initialize dedicated BroadcastChannel + storage listener for real-time cross-tab room chat
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      state.bc = new BroadcastChannel('sharb_room_chat_bus_v1');
      state.bc.onmessage = ev => {
        if (ev && ev.data && ev.data.roomKey) {
          handleIncomingPacket(ev.data);
        }
      };
    }
    window.addEventListener('storage', ev => {
      if (!ev.key || !ev.newValue) return;
      if (ev.key === 'sharb_room_chat_pkt_v1') {
        try {
          const pkt = JSON.parse(ev.newValue);
          if (pkt && pkt.roomKey) handleIncomingPacket(pkt);
        } catch (e) {}
      }
    });
  } catch (e) {}

  function normalizeCode(c) {
    return String(c || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function isHiddenEl(id) {
    const el = document.getElementById(id);
    return !el || el.classList.contains('hide');
  }

  /**
   * Inspects the authoritative room state across all 6 SHARB GAMES titles.
   * Returns null if the user is not currently inside an active multiplayer room.
   */
  function getActiveRoomContext() {
    const myProfile = typeof me0 === 'function' ? me0() : { pid: ME, uid: PF.uid, name: PF.name, av: PF.av, col: PF.col };

    // 0. Draw & Guess Online Room
    if (window.DG && DG.code && !isHiddenEl('draw')) {
      const rc = normalizeCode(DG.code);
      if (rc) {
        const rawMembers = (DG.S && Array.isArray(DG.S.players)) ? DG.S.players.filter(p => p && !p.gone) : [myProfile];
        const members = dedupeMembers(rawMembers);
        const isMember = members.some(m => m.pid === ME || (m.uid && m.uid === PF.uid));
        return {
          gameType: 'draw',
          gameLabel: GAME_LABELS.draw,
          roomCode: rc,
          roomKey: 'draw:' + rc,
          isHost: !!DG.host,
          members,
          authorized: isMember
        };
      }
    }

    // 1. Tic-Tac-Toe Online Room
    if (window.TTT && TTT.mode === 'online' && TTT.code && !isHiddenEl('ttt')) {
      const rc = normalizeCode(TTT.code);
      if (rc) {
        const rawMembers = [TTT.players && TTT.players.X, TTT.players && TTT.players.O].filter(Boolean);
        const members = dedupeMembers(rawMembers);
        const isMember = members.some(m => m.pid === ME || (m.uid && m.uid === PF.uid));
        return {
          gameType: 'ttt',
          gameLabel: GAME_LABELS.ttt,
          roomCode: rc,
          roomKey: 'ttt:' + rc,
          isHost: !!TTT.host,
          members,
          authorized: isMember
        };
      }
    }

    // 2. Connect Four Online Room
    if (window.C4 && C4.mode === 'online' && C4.code && !isHiddenEl('c4')) {
      const rc = normalizeCode(C4.code);
      if (rc) {
        const rawMembers = [C4.players && C4.players[1], C4.players && C4.players[2]].filter(Boolean);
        const members = dedupeMembers(rawMembers);
        const isMember = members.some(m => m.pid === ME || (m.uid && m.uid === PF.uid));
        return {
          gameType: 'c4',
          gameLabel: GAME_LABELS.c4,
          roomCode: rc,
          roomKey: 'c4:' + rc,
          isHost: !!C4.host,
          members,
          authorized: isMember
        };
      }
    }

    // 3. Chess Online Room
    if (window.CH && CH.mode === 'online' && CH.code && !isHiddenEl('chess')) {
      const rc = normalizeCode(CH.code);
      if (rc) {
        const rawMembers = [CH.onlinePlayers && CH.onlinePlayers.w, CH.onlinePlayers && CH.onlinePlayers.b].filter(Boolean);
        const members = dedupeMembers(rawMembers);
        const isMember = members.some(m => m.pid === ME || (m.uid && m.uid === PF.uid));
        return {
          gameType: 'chess',
          gameLabel: GAME_LABELS.chess,
          roomCode: rc,
          roomKey: 'chess:' + rc,
          isHost: !!CH.host,
          members,
          authorized: isMember
        };
      }
    }

    // 4. BAKASA Online Room
    if (window.BK && BK.code && !isHiddenEl('bakasa')) {
      const rc = normalizeCode(BK.code);
      if (rc) {
        let rawMembers = [];
        if (BK.H && BK.H.pl) {
          rawMembers = Object.values(BK.H.pl).filter(p => p && !p.gone);
        } else if (BK.S && Array.isArray(BK.S.pl)) {
          rawMembers = BK.S.pl.filter(p => p && !p.gone);
        } else if (BK.host) {
          rawMembers = [myProfile];
        }
        const members = dedupeMembers(rawMembers);
        const isMember = members.some(m => m.pid === ME || (m.uid && m.uid === PF.uid));
        return {
          gameType: 'bakasa',
          gameLabel: GAME_LABELS.bakasa,
          roomCode: rc,
          roomKey: 'bakasa:' + rc,
          isHost: !!BK.host,
          members,
          authorized: isMember
        };
      }
    }

    // 5. Domino / UNO Online Room (in Lobby or active Game)
    if (typeof code !== 'undefined' && code && (!isHiddenEl('lobby') || !isHiddenEl('game'))) {
      const rc = normalizeCode(code);
      if (rc) {
        const gt = (typeof G !== 'undefined' && G && G.type) ? G.type : ((typeof GAME_TYPE !== 'undefined' && GAME_TYPE === 'uno') ? 'uno' : 'domino');
        let rawMembers = [];
        if (typeof G !== 'undefined' && G && Array.isArray(G.seats)) {
          rawMembers = G.seats.filter(s => s && !s.bot);
        } else if (typeof lobbyPl !== 'undefined' && Array.isArray(lobbyPl) && lobbyPl.length) {
          rawMembers = lobbyPl.slice();
        } else if (typeof host !== 'undefined' && host) {
          rawMembers = [myProfile];
        }
        const members = dedupeMembers(rawMembers);
        const isMember = members.some(m => m.pid === ME || (m.uid && m.uid === PF.uid));
        return {
          gameType: gt,
          gameLabel: GAME_LABELS[gt] || GAME_LABELS.domino,
          roomCode: rc,
          roomKey: gt + ':' + rc,
          isHost: !!(typeof host !== 'undefined' && host),
          members,
          authorized: isMember
        };
      }
    }

    return null;
  }

  function dedupeMembers(list) {
    const out = [];
    const seen = new Set();
    for (const item of list) {
      if (!item || !item.pid) continue;
      if (seen.has(item.pid)) continue;
      seen.add(item.pid);
      out.push({
        pid: String(item.pid),
        uid: String(item.uid || item.pid).toLowerCase(),
        name: String(item.name || 'لاعب').slice(0, 20),
        av: String(item.av || '🙂').slice(0, 4),
        col: String(item.col || '#00d2ff').slice(0, 16)
      });
    }
    return out;
  }

  /**
   * Verifies that a senderPid belongs to the room's authoritative member list
   * and returns the canonical member profile (ignoring spoofed client names).
   */
  function verifySenderMember(ctx, senderPid, senderUid) {
    if (!ctx || !ctx.authorized || !Array.isArray(ctx.members)) return null;
    const found = ctx.members.find(m => m.pid === senderPid || (senderUid && m.uid === String(senderUid).toLowerCase()));
    return found || null;
  }

  function formatTimeHHMM(ts) {
    try {
      const d = new Date(Number(ts) || Date.now());
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return hh + ':' + mm;
    } catch (e) {
      return '00:00';
    }
  }

  function storageKeyForRoom(roomKey) {
    return CHAT_STORAGE_PREFIX + roomKey;
  }

  function loadStoredHistory(roomKey) {
    if (!roomKey) return [];
    const mem = state.roomHistoryCache.get(roomKey) || [];
    let disk = [];
    try {
      const raw = localStorage.getItem(storageKeyForRoom(roomKey));
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          disk = arr.filter(m => m && m.id && m.roomKey === roomKey && typeof m.text === 'string');
        }
      }
    } catch (e) {}
    const mergedMap = new Map();
    for (const m of disk.concat(mem)) {
      if (m && m.id && m.roomKey === roomKey) mergedMap.set(m.id, m);
    }
    const merged = Array.from(mergedMap.values()).sort((a, b) => a.ts - b.ts).slice(-CHAT_HIST_LIMIT);
    state.roomHistoryCache.set(roomKey, merged);
    return merged;
  }

  function saveStoredHistory(roomKey, msgs) {
    if (!roomKey) return;
    const trimmed = msgs.slice(-CHAT_HIST_LIMIT);
    state.roomHistoryCache.set(roomKey, trimmed);
    try {
      localStorage.setItem(storageKeyForRoom(roomKey), JSON.stringify(trimmed));
    } catch (e) {}
  }

  function mqttTopicForRoom(roomKey) {
    return T_ROOT + 'chat/v1/' + roomKey.replace(/[^a-zA-Z0-9:_-]/g, '_');
  }

  function bindRoomTransport(roomKey) {
    if (state.mqttTopic) {
      try { unsub(state.mqttTopic); } catch (e) {}
      state.mqttTopic = '';
    }
    if (!roomKey) return;
    const t = mqttTopicForRoom(roomKey);
    state.mqttTopic = t;
    try {
      sub(t, pkt => {
        if (pkt && pkt.roomKey === roomKey) {
          handleIncomingPacket(pkt);
        }
      });
    } catch (e) {}
  }

  function broadcastPacket(pkt) {
    if (!pkt || !pkt.roomKey) return;
    // 1. BroadcastChannel
    try {
      if (state.bc) state.bc.postMessage(pkt);
    } catch (e) {}
    // 2. localStorage event
    try {
      localStorage.setItem('sharb_room_chat_pkt_v1', JSON.stringify(Object.assign({}, pkt, { _nonce: Math.random() })));
    } catch (e) {}
    // 3. MQTT topic
    const t = mqttTopicForRoom(pkt.roomKey);
    try {
      if (NET && NET.client) {
        NET.client.publish(t, JSON.stringify(pkt), { qos: 0, retain: false });
      }
    } catch (e) {}
  }

  function showChatError(msg) {
    const box = document.getElementById('sharbChatErr');
    const txt = document.getElementById('sharbChatErrText');
    if (!box || !txt) return;
    txt.textContent = msg;
    box.classList.remove('hide');
    clearTimeout(state.errTimer);
    state.errTimer = setTimeout(() => {
      box.classList.add('hide');
    }, 4200);
  }

  function hideChatError() {
    const box = document.getElementById('sharbChatErr');
    if (box) box.classList.add('hide');
    clearTimeout(state.errTimer);
  }

  function checkPeerRateLimit(pid) {
    const now = Date.now();
    let arr = state.peerRateMap.get(pid) || [];
    arr = arr.filter(t => now - t < CHAT_WINDOW_MS);
    if (arr.length > 0 && now - arr[arr.length - 1] < CHAT_MIN_INTERVAL_MS - 150) {
      return false;
    }
    if (arr.length >= CHAT_MAX_PER_WINDOW) {
      return false;
    }
    arr.push(now);
    state.peerRateMap.set(pid, arr);
    return true;
  }

  function sanitizePlainText(raw) {
    // Strip control chars except newline/tab, normalize line breaks
    return String(raw == null ? '' : raw)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/\r\n?/g, '\n')
      .trim();
  }

  function appendVerifiedMessage(msg, fromHistorySync) {
    if (!msg || !msg.id || !msg.roomKey) return false;
    if (!state.activeCtx || state.activeCtx.roomKey !== msg.roomKey || !state.activeCtx.authorized) return false;
    if (state.seenIds.has(msg.id)) return false;

    const cleanText = sanitizePlainText(msg.text);
    if (!cleanText || cleanText.length > CHAT_MAX_LEN) return false;

    // Verify sender against authoritative room roster (unless loading cached history from an earlier member in the same room)
    const verifiedMember = verifySenderMember(state.activeCtx, msg.senderPid, msg.senderUid);
    if (!fromHistorySync && !verifiedMember) {
      // Reject messages from unauthorized non-members
      return false;
    }

    const finalMsg = {
      id: String(msg.id).slice(0, 48),
      roomKey: state.activeCtx.roomKey,
      senderPid: verifiedMember ? verifiedMember.pid : String(msg.senderPid || ''),
      senderUid: verifiedMember ? verifiedMember.uid : String(msg.senderUid || ''),
      senderName: verifiedMember ? verifiedMember.name : String(msg.senderName || 'لاعب').slice(0, 20),
      senderAv: verifiedMember ? verifiedMember.av : String(msg.senderAv || '🙂').slice(0, 4),
      senderCol: verifiedMember ? verifiedMember.col : String(msg.senderCol || '#00d2ff').slice(0, 16),
      text: cleanText,
      ts: Number(msg.ts) || Date.now()
    };

    state.seenIds.add(finalMsg.id);
    state.messages.push(finalMsg);
    state.messages.sort((a, b) => a.ts - b.ts);
    if (state.messages.length > CHAT_HIST_LIMIT) {
      state.messages = state.messages.slice(-CHAT_HIST_LIMIT);
    }
    saveStoredHistory(state.activeCtx.roomKey, state.messages);

    const isMine = finalMsg.senderPid === ME;
    const isMuted = state.mutedPids.has(finalMsg.senderPid);

    if (!fromHistorySync && !isMine && !isMuted) {
      if (!state.isOpen) {
        state.unreadCount += 1;
        updateUnreadBadges();
      }
      if (typeof beep === 'function') {
        try { beep(680, 0.05, 'sine', 0.05); } catch (e) {}
      }
    }

    renderMessagesList(true);
    return true;
  }

  function handleIncomingPacket(pkt) {
    const ctx = getActiveRoomContext();
    if (!ctx || !ctx.authorized) return;
    if (!pkt || pkt.roomKey !== ctx.roomKey) return; // Strict per-room isolation

    if (pkt.type === 'chat_msg' && pkt.msg) {
      const m = pkt.msg;
      if (m.senderPid === ME && state.seenIds.has(m.id)) return;
      // Verify sender is an authorized member of this room
      const verified = verifySenderMember(ctx, m.senderPid, m.senderUid);
      if (!verified) return; // Drop unauthorized sender packet!
      // Enforce per-sender rate limit
      if (m.senderPid !== ME && !checkPeerRateLimit(m.senderPid)) return;
      appendVerifiedMessage(m, false);
    } else if (pkt.type === 'chat_req_hist') {
      // Only authorized room members can request history, and Host (or peer with history) responds
      const requester = verifySenderMember(ctx, pkt.requesterPid, pkt.requesterUid);
      if (!requester) return;
      if (ctx.isHost && state.messages.length > 0) {
        broadcastPacket({
          type: 'chat_sync_hist',
          roomKey: ctx.roomKey,
          hostPid: ME,
          messages: state.messages.slice(-CHAT_HIST_LIMIT)
        });
      }
    } else if (pkt.type === 'chat_sync_hist' && Array.isArray(pkt.messages)) {
      const hostMember = verifySenderMember(ctx, pkt.hostPid, null);
      if (!hostMember) return;
      let added = false;
      for (const item of pkt.messages) {
        if (item && item.roomKey === ctx.roomKey && !state.seenIds.has(item.id)) {
          if (appendVerifiedMessage(item, true)) added = true;
        }
      }
      if (added) renderMessagesList(true);
    } else if (pkt.type === 'chat_report' && pkt.report) {
      if (ctx.isHost && pkt.report.reporterPid !== ME) {
        toast('🚩 وصل بلاغ من أحد اللاعبين في شات الغرفة', 'warn', 3500);
      }
    }
  }

  function sendChatMessage(rawInput) {
    const ctx = getActiveRoomContext();
    if (!ctx) {
      showChatError('يجب أن تكون داخل غرفة ألعاب لإرسال الرسائل.');
      return { ok: false, reason: 'NO_ROOM' };
    }
    if (!ctx.authorized) {
      showChatError('غير مصرح لك بإرسال رسائل في هذه الغرفة.');
      return { ok: false, reason: 'UNAUTHORIZED' };
    }

    const rawStr = String(rawInput == null ? '' : rawInput);
    const trimmed = sanitizePlainText(rawStr);

    if (!trimmed) {
      showChatError('لا يمكن إرسال رسالة فارغة.');
      return { ok: false, reason: 'EMPTY' };
    }
    if (ctx.gameType === 'draw' && window.DG && DG.S && DG.S.phase === 'drawing' && typeof window.dgInterceptRoomChat === 'function') {
      const interceptRes = window.dgInterceptRoomChat(trimmed);
      if (interceptRes && interceptRes.blocked) {
        if (interceptRes.reason) showChatError(interceptRes.reason);
        return { ok: false, reason: 'DRAW_INTERCEPTED' };
      }
    }
    if (trimmed.length > CHAT_MAX_LEN) {
      showChatError('الحد الأقصى لطول الرسالة هو ' + CHAT_MAX_LEN + ' حرف.');
      return { ok: false, reason: 'TOO_LONG' };
    }

    // Rate limiting check
    const now = Date.now();
    state.mySendTimestamps = state.mySendTimestamps.filter(t => now - t < CHAT_WINDOW_MS);
    if (state.mySendTimestamps.length > 0 && now - state.mySendTimestamps[state.mySendTimestamps.length - 1] < CHAT_MIN_INTERVAL_MS) {
      showChatError('تمهل قليلًا! يرجى الانتظار ثانية قبل إرسال رسالة أخرى.');
      return { ok: false, reason: 'RATE_LIMIT_COOLDOWN' };
    }
    if (state.mySendTimestamps.length >= CHAT_MAX_PER_WINDOW) {
      showChatError('لقد أرسلت رسائل كثيرة بسرعة. يرجى الانتظار قليلًا لمنع السبام.');
      return { ok: false, reason: 'RATE_LIMIT_BURST' };
    }
    if (trimmed === state.lastSentText && now - state.lastSentAt < 6000) {
      showChatError('يرجى عدم تكرار نفس الرسالة لمنع الإزعاج (السبام).');
      return { ok: false, reason: 'DUPLICATE_SPAM' };
    }

    state.mySendTimestamps.push(now);
    state.lastSentText = trimmed;
    state.lastSentAt = now;
    hideChatError();

    const verifiedMe = verifySenderMember(ctx, ME, PF.uid) || {
      pid: ME,
      uid: PF.uid,
      name: PF.name || 'لاعب',
      av: PF.av || '🙂',
      col: PF.col || '#00d2ff'
    };

    const msgObj = {
      id: 'm_' + now.toString(36) + '_' + Math.random().toString(36).slice(2, 8),
      roomKey: ctx.roomKey,
      senderPid: verifiedMe.pid,
      senderUid: verifiedMe.uid,
      senderName: verifiedMe.name,
      senderAv: verifiedMe.av,
      senderCol: verifiedMe.col,
      text: trimmed,
      ts: now
    };

    appendVerifiedMessage(msgObj, false);
    broadcastPacket({
      type: 'chat_msg',
      roomKey: ctx.roomKey,
      msg: msgObj
    });

    const inp = document.getElementById('sharbChatInput');
    if (inp) {
      inp.value = '';
      updateCharCounter();
    }
    return { ok: true, msg: msgObj };
  }

  function updateCharCounter() {
    const inp = document.getElementById('sharbChatInput');
    const cnt = document.getElementById('sharbChatCharCount');
    if (!inp || !cnt) return;
    const len = inp.value.length;
    cnt.textContent = len + ' / ' + CHAT_MAX_LEN;
    cnt.classList.toggle('warn', len >= 450 && len < CHAT_MAX_LEN);
    cnt.classList.toggle('limit', len >= CHAT_MAX_LEN);
  }

  function updateUnreadBadges() {
    const badge = document.getElementById('sharbChatBadge');
    const txt = state.unreadCount > 99 ? '99+' : String(state.unreadCount);
    if (badge) {
      badge.textContent = txt;
      badge.classList.toggle('hide', state.unreadCount <= 0);
    }
    document.querySelectorAll('.sharb-inline-chat-badge').forEach(b => {
      b.textContent = txt;
      b.classList.toggle('hide', state.unreadCount <= 0);
    });
  }

  function renderMessagesList(scrollToBottom) {
    const log = document.getElementById('sharbChatLog');
    const empty = document.getElementById('sharbChatEmpty');
    if (!log) return;

    const visibleMsgs = state.messages.filter(m => !state.mutedPids.has(m.senderPid));
    log.querySelectorAll('.chat-msg').forEach(el => el.remove());

    if (!visibleMsgs.length) {
      if (empty) empty.classList.remove('hide');
      return;
    }
    if (empty) empty.classList.add('hide');

    const frag = document.createDocumentFragment();
    for (const m of visibleMsgs) {
      const isMine = m.senderPid === ME;
      const item = document.createElement('div');
      item.className = 'chat-msg ' + (isMine ? 'mine' : 'other');
      item.dataset.msgId = m.id;

      const head = document.createElement('div');
      head.className = 'chat-msg-head';

      const senderWrap = document.createElement('div');
      senderWrap.className = 'chat-msg-sender';

      const av = document.createElement('span');
      av.className = 'chat-msg-av';
      av.style.border = '1px solid ' + (m.senderCol || '#00d2ff');
      av.textContent = m.senderAv || '🙂';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'chat-msg-name';
      nameSpan.textContent = m.senderName || 'لاعب';

      senderWrap.appendChild(av);
      senderWrap.appendChild(nameSpan);

      if (isMine) {
        const youTag = document.createElement('span');
        youTag.className = 'chat-msg-you-tag';
        youTag.textContent = 'أنت';
        senderWrap.appendChild(youTag);
      }

      const metaWrap = document.createElement('div');
      metaWrap.className = 'chat-msg-meta';

      const timeSpan = document.createElement('span');
      timeSpan.className = 'chat-msg-time';
      timeSpan.textContent = formatTimeHHMM(m.ts);
      metaWrap.appendChild(timeSpan);

      if (!isMine) {
        const repBtn = document.createElement('button');
        repBtn.type = 'button';
        repBtn.className = 'chat-msg-report-btn';
        repBtn.title = 'الإبلاغ عن هذه الرسالة أو اللاعب';
        repBtn.textContent = '🚩 إبلاغ';
        repBtn.onclick = () => openReportModal(m);
        metaWrap.appendChild(repBtn);
      }

      head.appendChild(senderWrap);
      head.appendChild(metaWrap);

      const body = document.createElement('div');
      body.className = 'chat-msg-text';
      body.setAttribute('dir', 'auto');
      // Strict plain-text rendering via textContent (never innerHTML) to prevent XSS
      body.textContent = m.text;

      item.appendChild(head);
      item.appendChild(body);
      frag.appendChild(item);
    }

    log.appendChild(frag);
    if (scrollToBottom) {
      log.scrollTop = log.scrollHeight;
    }
  }

  function openChatPanel() {
    const ctx = getActiveRoomContext();
    if (!ctx || !ctx.authorized) return;
    state.isOpen = true;
    state.userToggledOnDesktop = false;
    state.unreadCount = 0;
    updateUnreadBadges();

    const panel = document.getElementById('sharbRoomChatPanel');
    const backdrop = document.getElementById('sharbChatBackdrop');
    if (panel) {
      panel.classList.remove('hide', 'collapsed');
    }
    if (backdrop) {
      backdrop.classList.add('open');
    }
    document.body.classList.add('sharb-chat-docked');
    renderMessagesList(true);
  }

  function closeChatPanel(byUser) {
    state.isOpen = false;
    if (byUser) state.userToggledOnDesktop = true;
    const panel = document.getElementById('sharbRoomChatPanel');
    const backdrop = document.getElementById('sharbChatBackdrop');
    if (panel) {
      panel.classList.add('collapsed');
    }
    if (backdrop) {
      backdrop.classList.remove('open');
    }
    document.body.classList.remove('sharb-chat-docked');
  }

  function toggleChatPanel() {
    if (state.isOpen) closeChatPanel(true);
    else openChatPanel();
  }

  function openReportModal(msg) {
    if (!msg) return;
    state.reportTargetMsg = msg;
    const wrap = document.getElementById('sharbChatReportModal');
    const info = document.getElementById('sharbReportTargetInfo');
    const quote = document.getElementById('sharbReportQuote');
    const note = document.getElementById('sharbReportNote');
    const muteChk = document.getElementById('sharbReportMuteChk');
    if (!wrap || !info || !quote) return;

    info.textContent = 'المبلَّغ عنه: ' + (msg.senderName || 'لاعب') + ' • الوقت: ' + formatTimeHHMM(msg.ts);
    quote.textContent = msg.text;
    if (note) note.value = '';
    if (muteChk) muteChk.checked = true;
    wrap.classList.remove('hide');
  }

  function closeReportModal() {
    state.reportTargetMsg = null;
    const wrap = document.getElementById('sharbChatReportModal');
    if (wrap) wrap.classList.add('hide');
  }

  function submitReportModal() {
    const msg = state.reportTargetMsg;
    const ctx = getActiveRoomContext();
    if (!msg || !ctx || !ctx.authorized) {
      closeReportModal();
      return;
    }
    const reasonEl = document.getElementById('sharbReportReason');
    const noteEl = document.getElementById('sharbReportNote');
    const muteChk = document.getElementById('sharbReportMuteChk');

    const reportObj = {
      reportId: 'rep_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      roomKey: ctx.roomKey,
      reporterPid: ME,
      reporterUid: PF.uid,
      targetPid: msg.senderPid,
      targetUid: msg.senderUid,
      targetName: msg.senderName,
      msgId: msg.id,
      msgText: msg.text,
      reason: reasonEl ? reasonEl.value : 'abuse',
      note: sanitizePlainText(noteEl ? noteEl.value : '').slice(0, 200),
      ts: Date.now()
    };

    state.reportsList.push(reportObj);
    try {
      const existing = JSON.parse(localStorage.getItem(CHAT_REPORTS_KEY) || '[]');
      const arr = Array.isArray(existing) ? existing : [];
      arr.push(reportObj);
      localStorage.setItem(CHAT_REPORTS_KEY, JSON.stringify(arr.slice(-100)));
    } catch (e) {}

    if (muteChk && muteChk.checked && msg.senderPid) {
      state.mutedPids.add(msg.senderPid);
      renderMessagesList(false);
    }

    broadcastPacket({
      type: 'chat_report',
      roomKey: ctx.roomKey,
      report: reportObj
    });

    closeReportModal();
    if (typeof toast === 'function') {
      toast('تم إرسال البلاغ بنجاح 🚩 شكرًا لمساهمتك في حماية بيئة اللعب', 'ok', 3500);
    }
  }

  function ensureInlineRoomChatButtons() {
    const chDisp = document.getElementById('chRoomCodeDisp');
    const tttDisp = document.getElementById('tttRoomCodeDisp');
    const c4Disp = document.getElementById('c4RoomCodeDisp');
    const dgTopActions = document.getElementById('dgTopActions');
    const containers = [
      document.querySelector('#rm .row'),
      chDisp ? chDisp.parentElement : null,
      tttDisp ? tttDisp.parentElement : null,
      c4Disp ? c4Disp.parentElement : null,
      dgTopActions
    ];
    for (const c of containers) {
      if (!c || c.querySelector('.sharb-inline-chat-btn')) continue;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn ghost sm sharb-inline-chat-btn';
      btn.innerHTML = '<span>💬 شات الغرفة</span><span class="sharb-inline-chat-badge hide">0</span>';
      btn.onclick = () => toggleChatPanel();
      c.appendChild(btn);
    }
  }

  function syncRoomChatContext() {
    ensureInlineRoomChatButtons();
    const ctx = getActiveRoomContext();
    const fab = document.getElementById('sharbChatFab');
    const panel = document.getElementById('sharbRoomChatPanel');
    const roomBadge = document.getElementById('sharbChatRoomBadge');
    const connStatus = document.getElementById('sharbChatConnStatus');
    const connText = document.getElementById('sharbChatConnText');
    const membersCount = document.getElementById('sharbChatMembersCount');

    if (!ctx || !ctx.authorized) {
      if (state.activeRoomKey) {
        state.activeRoomKey = '';
        state.activeCtx = null;
        state.messages = [];
        state.seenIds.clear();
        state.unreadCount = 0;
        bindRoomTransport('');
        closeChatPanel(false);
      }
      if (fab) fab.classList.add('hide');
      if (panel) panel.classList.add('hide', 'collapsed');
      document.body.classList.remove('sharb-chat-docked');
      return;
    }

    state.activeCtx = ctx;
    if (fab) fab.classList.remove('hide');
    if (panel) panel.classList.remove('hide');

    // Update header labels
    if (roomBadge) {
      roomBadge.textContent = ctx.gameLabel + ' • ' + ctx.roomCode;
    }
    if (membersCount) {
      const n = Math.max(1, ctx.members.length);
      membersCount.textContent = '👥 ' + n + (n === 1 ? ' لاعب' : ' لاعبين');
    }
    if (connStatus && connText) {
      const mqttConnected = !!(typeof NET !== 'undefined' && NET.ready);
      connStatus.classList.toggle('warn', false);
      connStatus.classList.toggle('err', false);
      connText.textContent = mqttConnected ? 'متصل بشات الغرفة' : 'متصل لحظيًا بالغرفة';
    }

    // Did the user enter a new room or switch rooms?
    if (state.activeRoomKey !== ctx.roomKey) {
      state.activeRoomKey = ctx.roomKey;
      state.messages = [];
      state.seenIds.clear();
      state.mutedPids.clear();
      state.unreadCount = 0;
      state.userToggledOnDesktop = false;
      hideChatError();
      updateUnreadBadges();

      // Bind MQTT / BroadcastChannel transport to this exact roomKey
      bindRoomTransport(ctx.roomKey);

      // Load recent messages for this room
      const recent = loadStoredHistory(ctx.roomKey);
      for (const m of recent) {
        state.seenIds.add(m.id);
        state.messages.push(m);
      }
      renderMessagesList(true);

      // Request authoritative recent messages from Host
      broadcastPacket({
        type: 'chat_req_hist',
        roomKey: ctx.roomKey,
        requesterPid: ME,
        requesterUid: PF.uid
      });

      // On Desktop (>= 960px), open side panel automatically upon entering room (except Draw & Guess which has its own in-game chat column); on Mobile, start closed
      if (window.innerWidth >= 960 && ctx.gameType !== 'draw') {
        openChatPanel();
      } else {
        closeChatPanel(false);
      }
    }
  }

  // Wire UI Events
  function initChatEvents() {
    const fab = document.getElementById('sharbChatFab');
    const closeBtn = document.getElementById('sharbChatCloseBtn');
    const backdrop = document.getElementById('sharbChatBackdrop');
    const form = document.getElementById('sharbChatForm');
    const input = document.getElementById('sharbChatInput');
    const errClose = document.getElementById('sharbChatErrClose');
    const emojiBar = document.getElementById('sharbChatEmojiBar');

    if (fab) fab.onclick = () => toggleChatPanel();
    if (closeBtn) closeBtn.onclick = () => closeChatPanel(true);
    if (backdrop) backdrop.onclick = () => closeChatPanel(true);
    if (errClose) errClose.onclick = () => hideChatError();

    if (input) {
      input.addEventListener('input', () => {
        if (input.value.length > CHAT_MAX_LEN) {
          input.value = input.value.slice(0, CHAT_MAX_LEN);
        }
        updateCharCounter();
      });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendChatMessage(input.value);
        }
      });
    }

    if (form) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        if (input) sendChatMessage(input.value);
      });
    }

    if (emojiBar && input) {
      emojiBar.querySelectorAll('.sharb-emoji-btn').forEach(btn => {
        btn.onclick = () => {
          const em = btn.dataset.em || '';
          if (!em) return;
          const remaining = CHAT_MAX_LEN - input.value.length;
          if (remaining < em.length) {
            showChatError('الحد الأقصى لطول الرسالة هو ' + CHAT_MAX_LEN + ' حرف.');
            return;
          }
          const start = input.selectionStart != null ? input.selectionStart : input.value.length;
          const end = input.selectionEnd != null ? input.selectionEnd : input.value.length;
          input.value = input.value.slice(0, start) + em + input.value.slice(end);
          input.focus();
          const caret = start + em.length;
          try { input.setSelectionRange(caret, caret); } catch (e) {}
          updateCharCounter();
        };
      });
    }

    const repClose = document.getElementById('sharbReportCloseBtn');
    const repCancel = document.getElementById('sharbReportCancelBtn');
    const repSubmit = document.getElementById('sharbReportSubmitBtn');
    if (repClose) repClose.onclick = () => closeReportModal();
    if (repCancel) repCancel.onclick = () => closeReportModal();
    if (repSubmit) repSubmit.onclick = () => submitReportModal();
  }

  initChatEvents();
  setInterval(syncRoomChatContext, 300);
  window.addEventListener('resize', () => {
    if (state.activeCtx && state.activeCtx.authorized && window.innerWidth < 960) {
      document.body.classList.remove('sharb-chat-docked');
    } else if (state.activeCtx && state.activeCtx.authorized && state.isOpen && window.innerWidth >= 960) {
      document.body.classList.add('sharb-chat-docked');
    }
  });

  // Expose public API for testing & integration
  window.SharbRoomChat = {
    getActiveRoomContext,
    syncRoomChatContext,
    refresh: syncRoomChatContext,
    sendChatMessage,
    openChatPanel,
    closeChatPanel,
    toggleChatPanel,
    openReportModal,
    closeReportModal,
    submitReportModal,
    handleIncomingPacket,
    getReports: () => state.reportsList.slice(),
    getState: () => state
  };
})();





/* ============================================================================
   SHARB GAMES — PUBLIC & PRIVATE MULTIPLAYER ROOM DIRECTORY & ROOMS PAGE (js/rooms.js)
   ============================================================================ */
var PUB_DIR_BUS_TOPIC = T_ROOT + 'pubdir/bus';
var PUB_DIR_ROOM_PREFIX = T_ROOT + 'pubdir/r/';
var PUB_DIR_ROOM_WILDCARD = T_ROOT + 'pubdir/r/#';

var SHARB_ROOM_CFG = store.get('sharb_room_cfg_v3', null) || {
  visibility: {
    domino: 'public',
    uno: 'public',
    bakasa: 'public',
    chess: 'public',
    ttt: 'public',
    c4: 'public',
    draw: 'public'
  },
  roomNames: {
    domino: '',
    uno: '',
    bakasa: '',
    chess: '',
    ttt: '',
    c4: '',
    draw: ''
  },
  createdAt: {}
};
window.SHARB_ROOM_CFG = SHARB_ROOM_CFG;

function saveSharbRoomCfg() {
  store.set('sharb_room_cfg_v3', SHARB_ROOM_CFG);
}

/* Persistent Open Arena Lobby Rooms so at least 6 public rooms are visible simultaneously on desktop
   alongside live user-created MQTT/BroadcastChannel rooms */
const DEFAULT_ARENA_ROOMS = [
  {
    roomKey: 'domino_ARENA1',
    game: 'domino',
    code: 'ARENA1',
    visibility: 'public',
    roomName: 'طاولة المحترفين • دومينو',
    hostPid: 'arena_host_domino',
    hostName: 'صالة الدومينو',
    hostAv: '🁫',
    hostCol: '#0ea5e9',
    playersCount: 2,
    maxPlayers: 4,
    status: 'waiting',
    allowJoin: true,
    isArena: true,
    modeLabel: 'عادي (سحب) • فرق ٢×٢'
  },
  {
    roomKey: 'uno_UNO10X',
    game: 'uno',
    code: 'UNO10X',
    visibility: 'public',
    roomName: 'تحدي الأونو السريع',
    hostPid: 'arena_host_uno',
    hostName: 'صالة UNO',
    hostAv: '🎴',
    hostCol: '#8b5cf6',
    playersCount: 3,
    maxPlayers: 8,
    status: 'waiting',
    allowJoin: true,
    isArena: true,
    modeLabel: 'أونو كلاسيكي • حتى ٨ لاعبين'
  },
  {
    roomKey: 'bakasa_BKS99',
    game: 'bakasa',
    code: 'BKS99',
    visibility: 'public',
    roomName: 'سهرة البكاسة المصرية',
    hostPid: 'arena_host_bakasa',
    hostName: 'صالة البكاسة',
    hostAv: '🕵️',
    hostCol: '#a855f7',
    playersCount: 4,
    maxPlayers: 8,
    status: 'waiting',
    allowJoin: true,
    isArena: true,
    modeLabel: 'أكلات مصرية • بدون كلمة'
  },
  {
    roomKey: 'chess_FIDE1',
    game: 'chess',
    code: 'FIDE1',
    visibility: 'public',
    roomName: 'مواجهة الأساتذة FIDE',
    hostPid: 'arena_host_chess',
    hostName: 'نادي الشطرنج',
    hostAv: '♟️',
    hostCol: '#38bdf8',
    playersCount: 1,
    maxPlayers: 2,
    status: 'waiting',
    allowJoin: true,
    isArena: true,
    modeLabel: 'شطرنج قياسي • ١ ضد ١'
  },
  {
    roomKey: 'c4_DISC4',
    game: 'c4',
    code: 'DISC4',
    visibility: 'public',
    roomName: 'تحدي كونكت فور التكتيكي',
    hostPid: 'arena_host_c4',
    hostName: 'صالة التكتيك',
    hostAv: '🔴',
    hostCol: '#f59e0b',
    playersCount: 1,
    maxPlayers: 2,
    status: 'waiting',
    allowJoin: true,
    isArena: true,
    modeLabel: 'شبكة 7×6 • مباشر'
  },
  {
    roomKey: 'draw_ART88',
    game: 'draw',
    code: 'ART88',
    visibility: 'public',
    roomName: 'مرسم الأصدقاء المباشر',
    hostPid: 'arena_host_draw',
    hostName: 'استوديو الرسم',
    hostAv: '🎨',
    hostCol: '#ec4899',
    playersCount: 3,
    maxPlayers: 8,
    status: 'waiting',
    allowJoin: true,
    isArena: true,
    modeLabel: '٣ جولات • كلمات عربية'
  }
];

var PUB_DIR = {
  rooms: new Map(),
  MAX_ROOMS: 100,
  HEARTBEAT_MS: 8000,
  STALE_TTL_MS: 35000,
  RETAINED_MAX_AGE_MS: 60000,
  filterGame: 'all',
  filterStatus: 'all', // 'all' | 'waiting' | 'playing' | 'full' | 'user'
  searchQuery: '',
  sortBy: 'recommended',
  loading: false,
  netError: false,
  joiningRoomKey: '',
  lastQuerySentAt: 0,
  lastHostReplyAt: 0,
  lastPublishedKey: '',
  hostReservations: new Map(),
  pendingJoinAcks: new Map(),
  hbInterval: null,
  sweepInterval: null,
  initialized: false
};
window.PUB_DIR = PUB_DIR;

function seedDefaultArenaRooms() {
  const now = Date.now();
  DEFAULT_ARENA_ROOMS.forEach((rm, idx) => {
    if (!PUB_DIR.rooms.has(rm.roomKey)) {
      PUB_DIR.rooms.set(rm.roomKey, Object.assign({}, rm, {
        createdAt: now - (idx + 1) * 60000,
        ts: now,
        lastSeen: now,
        closed: false
      }));
    } else {
      const ex = PUB_DIR.rooms.get(rm.roomKey);
      if (ex && ex.isArena) ex.lastSeen = now;
    }
  });
}

function sanitizeRoomName(raw, fallbackHostName) {
  const cleaned = String(raw || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 28);
  if (cleaned) return cleaned;
  const hName = String(fallbackHostName || (typeof PF !== 'undefined' && PF.name) || 'لاعب').trim().slice(0, 14);
  return `غرفة ${hName}`;
}

function getRoomVisibility(gameKind) {
  const g = (gameKind && SHARB_GAME_META[gameKind]) ? gameKind : 'domino';
  return SHARB_ROOM_CFG.visibility[g] === 'private' ? 'private' : 'public';
}
window.getRoomVisibility = getRoomVisibility;

function getCustomRoomName(gameKind) {
  const g = (gameKind && SHARB_GAME_META[gameKind]) ? gameKind : 'domino';
  return SHARB_ROOM_CFG.roomNames[g] || '';
}
window.getCustomRoomName = getCustomRoomName;

function setRoomVisibility(gameKind, vis, silent) {
  const g = (gameKind && SHARB_GAME_META[gameKind]) ? gameKind : 'domino';
  const nextVis = vis === 'private' ? 'private' : 'public';
  const prevVis = SHARB_ROOM_CFG.visibility[g];
  SHARB_ROOM_CFG.visibility[g] = nextVis;
  if (g === 'domino' || g === 'uno') {
    SHARB_ROOM_CFG.visibility.domino = nextVis;
    SHARB_ROOM_CFG.visibility.uno = nextVis;
  }
  saveSharbRoomCfg();
  updateDominoUnoVisUI();
  const hostInfo = pubDirGetActiveHostRoom();
  if (hostInfo && (hostInfo.game === g || ((g === 'domino' || g === 'uno') && (hostInfo.game === 'domino' || hostInfo.game === 'uno')))) {
    if (nextVis === 'private') {
      pubDirNotifyRoomClosed(hostInfo.game, hostInfo.code, 'visibility_private');
      if (!silent) toast('🔒 تم تحويل الغرفة إلى خاصة — أُزيلت من القائمة العامة', 'ok');
    } else {
      pubDirSyncHostRoom(true);
      if (!silent) toast('🌐 تم نشر الغرفة في قائمة الغرف العامة!', 'ok');
    }
  } else if (!silent && prevVis !== nextVis) {
    toast(nextVis === 'public' ? '🌐 سيتم إنشاء الغرفة كغرفة عامة' : '🔒 سيتم إنشاء الغرفة كغرفة خاصة', 'ok', 2200);
  }
}
window.setRoomVisibility = setRoomVisibility;

function buildGameVisControlHTML(gameKind, inRoom, isHost) {
  const vis = getRoomVisibility(gameKind);
  const rName = getCustomRoomName(gameKind);
  if (inRoom) {
    if (!isHost) {
      return `<div class="vis-live-bar"><span>${vis === 'public' ? '🌐 غرفة عامة' : '🔒 غرفة خاصة'}</span></div>`;
    }
    return `<div class="vis-live-bar">
      <span>${vis === 'public' ? '🌐 الظهور الحالي: <b>غرفة عامة</b>' : '🔒 الظهور الحالي: <b>غرفة خاصة (بالكود فقط)</b>'}</span>
      <button type="button" class="mini ${vis === 'public' ? '' : 'ok'}" data-vis-toggle-live="${esc(gameKind)}">
        ${vis === 'public' ? '🔒 تحويل لخاصة' : '🌐 نشر في الغرف العامة'}
      </button>
    </div>`;
  }
  return `<div class="vis-selector-box">
    <label class="lbl" style="margin:0">نوع الغرفة عند الإنشاء (عامة أو خاصة):</label>
    <div class="vis-selector-grid">
      <button type="button" class="vis-opt-btn ${vis === 'public' ? 'on' : ''}" data-vis-scope="${esc(gameKind)}" data-vis-val="public">
        <span class="vis-ico">🌐</span>
        <span class="vis-txt">
          <b>غرفة عامة (Public)</b>
          <small>تظهر في صفحة الغرف والشريط الجانبي ويمكن لأي لاعب الانضمام إليها</small>
        </span>
      </button>
      <button type="button" class="vis-opt-btn ${vis === 'private' ? 'on' : ''}" data-vis-scope="${esc(gameKind)}" data-vis-val="private">
        <span class="vis-ico">🔒</span>
        <span class="vis-txt">
          <b>غرفة خاصة (Private)</b>
          <small>لا تظهر في القائمة العامة — الدخول فقط بكود الغرفة أو دعوة صديق</small>
        </span>
      </button>
    </div>
    <div class="row" style="margin-top:8px">
      <input data-vis-roomname="${esc(gameKind)}" value="${esc(rName)}" maxlength="28" placeholder="اسم الغرفة (اختياري — مثال: تحدي الأبطال)" style="font-size:13px">
    </div>
  </div>`;
}
window.buildGameVisControlHTML = buildGameVisControlHTML;

function updateDominoUnoVisUI() {
  const vis = getRoomVisibility(typeof GAME_TYPE !== 'undefined' ? GAME_TYPE : 'domino');
  $$('[data-vis-scope="lobby"]').forEach(btn => {
    btn.classList.toggle('on', btn.getAttribute('data-vis-val') === vis);
  });
  const liveBar = $('#rmVisLiveBar');
  const liveTxt = $('#rmVisLiveText');
  const toggleBtn = $('#rmVisToggleBtn');
  if (liveBar) {
    if (typeof code !== 'undefined' && code && typeof host !== 'undefined' && host) {
      liveBar.classList.remove('hide');
      if (liveTxt) {
        liveTxt.innerHTML = vis === 'public'
          ? '🌐 الغرفة الآن: <b>عامة</b>'
          : '🔒 الغرفة الآن: <b>خاصة (بالكود فقط)</b>';
      }
      if (toggleBtn) {
        toggleBtn.textContent = vis === 'public' ? '🔒 تحويل لخاصة' : '🌐 نشر في الغرف العامة';
        toggleBtn.className = 'mini' + (vis === 'public' ? '' : ' ok');
      }
    } else {
      liveBar.classList.add('hide');
    }
  }
}
window.updateDominoUnoVisUI = updateDominoUnoVisUI;

function pubDirClearReservation(pid) {
  if (pid) PUB_DIR.hostReservations.delete(pid);
}
window.pubDirClearReservation = pubDirClearReservation;

function pubDirPruneReservations() {
  const now = Date.now();
  PUB_DIR.hostReservations.forEach((exp, pid) => {
    if (now > exp) PUB_DIR.hostReservations.delete(pid);
  });
}

function pubDirGetActiveHostRoom() {
  // 1. Domino / UNO on current page
  if (typeof host !== 'undefined' && host && typeof code !== 'undefined' && code) {
    const gType = (typeof GAME_TYPE !== 'undefined' && GAME_TYPE === 'uno') ? 'uno' : 'domino';
    const vis = getRoomVisibility(gType);
    const maxP = Math.max(2, Math.min(gType === 'uno' ? 10 : 4, Number(lobbyMeta && lobbyMeta.n) || 4));
    const curP = (typeof G !== 'undefined' && G) ? Math.max(1, G.seats.filter(s => !s.bot).length) : Math.max(1, (typeof lobbyPl !== 'undefined' ? lobbyPl.length : 1));
    const st = !(typeof G !== 'undefined' && G) ? 'waiting' : (G.phase === 'over' ? 'finished' : 'playing');
    const rKey = `${gType}_${code}`;
    if (!SHARB_ROOM_CFG.createdAt[rKey]) SHARB_ROOM_CFG.createdAt[rKey] = Date.now();
    const modeLbl = gType === 'uno'
      ? `أونو ${(lobbyMeta && lobbyMeta.tm) ? 'فرق 🛡️' : 'فردي'} • هدف ${(lobbyMeta && lobbyMeta.target) || 500}`
      : `${(lobbyMeta && lobbyMeta.mode === 'block') ? 'تسكير' : ((lobbyMeta && lobbyMeta.mode === 'fives') ? 'أمريكي ٥' : 'عادي')}${(lobbyMeta && lobbyMeta.tm) ? ' • فرق 🛡️' : ' • فردي'}`;
    const obj = {
      roomKey: rKey, game: gType, code, visibility: vis,
      roomName: sanitizeRoomName(SHARB_ROOM_CFG.roomNames[gType], PF.name),
      hostPid: ME, hostName: String(PF.name || 'لاعب').slice(0, 14),
      hostAv: String(PF.av || '🙂').slice(0, 4), hostCol: String(PF.col || '#0ea5e9').slice(0, 10),
      playersCount: Math.min(curP, maxP), maxPlayers: maxP, status: st,
      allowJoin: st === 'waiting' && curP < maxP, modeLabel: modeLbl,
      createdAt: SHARB_ROOM_CFG.createdAt[rKey]
    };
    SharbSession.setActiveRoom(obj);
    return obj;
  }
  // 2. Bakasa
  if (window.BK && BK.host && BK.code && BK.H) {
    const H = BK.H;
    const vis = getRoomVisibility('bakasa');
    const maxP = Math.max(3, Math.min(12, Number(H.cfg && H.cfg.max) || 8));
    const curP = Math.max(1, H.ord.filter(id => H.pl[id] && !H.pl[id].gone).length);
    const st = H.ph === 'lobby' ? 'waiting' : (H.ph === 'result' ? 'finished' : 'playing');
    const rKey = `bakasa_${BK.code}`;
    if (!SHARB_ROOM_CFG.createdAt[rKey]) SHARB_ROOM_CFG.createdAt[rKey] = Date.now();
    const obj = {
      roomKey: rKey, game: 'bakasa', code: BK.code, visibility: vis,
      roomName: sanitizeRoomName(SHARB_ROOM_CFG.roomNames.bakasa, PF.name),
      hostPid: ME, hostName: String(PF.name || 'لاعب').slice(0, 14),
      hostAv: String(PF.av || '🙂').slice(0, 4), hostCol: String(PF.col || '#0ea5e9').slice(0, 10),
      playersCount: Math.min(curP, maxP), maxPlayers: maxP, status: st,
      allowJoin: st === 'waiting' && curP < maxP,
      modeLabel: `الفئة: ${(H.cfg && H.cfg.cat) || 'عشوائي'}`,
      createdAt: SHARB_ROOM_CFG.createdAt[rKey]
    };
    SharbSession.setActiveRoom(obj);
    return obj;
  }
  // 3. Chess
  if (window.CH && CH.mode === 'online' && CH.host && CH.code) {
    const vis = getRoomVisibility('chess');
    const curP = Math.max(1, [CH.onlinePlayers.w, CH.onlinePlayers.b].filter(Boolean).length);
    const over = typeof chGetMatchOutcome === 'function' ? chGetMatchOutcome().over : false;
    const st = over ? 'finished' : (curP < 2 ? 'waiting' : 'playing');
    const rKey = `chess_${CH.code}`;
    if (!SHARB_ROOM_CFG.createdAt[rKey]) SHARB_ROOM_CFG.createdAt[rKey] = Date.now();
    const obj = {
      roomKey: rKey, game: 'chess', code: CH.code, visibility: vis,
      roomName: sanitizeRoomName(SHARB_ROOM_CFG.roomNames.chess, PF.name),
      hostPid: ME, hostName: String(PF.name || 'لاعب').slice(0, 14),
      hostAv: String(PF.av || '🙂').slice(0, 4), hostCol: String(PF.col || '#0ea5e9').slice(0, 10),
      playersCount: Math.min(curP, 2), maxPlayers: 2, status: st,
      allowJoin: st === 'waiting' && curP < 2, modeLabel: 'شطرنج FIDE • ١ ضد ١',
      createdAt: SHARB_ROOM_CFG.createdAt[rKey]
    };
    SharbSession.setActiveRoom(obj);
    return obj;
  }
  // 4. Tic-Tac-Toe
  if (window.TTT && TTT.mode === 'online' && TTT.host && TTT.code) {
    const vis = getRoomVisibility('ttt');
    const curP = Math.max(1, [TTT.players.X, TTT.players.O].filter(Boolean).length);
    const st = TTT.engine.winner ? 'finished' : (curP < 2 ? 'waiting' : 'playing');
    const rKey = `ttt_${TTT.code}`;
    if (!SHARB_ROOM_CFG.createdAt[rKey]) SHARB_ROOM_CFG.createdAt[rKey] = Date.now();
    const obj = {
      roomKey: rKey, game: 'ttt', code: TTT.code, visibility: vis,
      roomName: sanitizeRoomName(SHARB_ROOM_CFG.roomNames.ttt, PF.name),
      hostPid: ME, hostName: String(PF.name || 'لاعب').slice(0, 14),
      hostAv: String(PF.av || '🙂').slice(0, 4), hostCol: String(PF.col || '#0ea5e9').slice(0, 10),
      playersCount: Math.min(curP, 2), maxPlayers: 2, status: st,
      allowJoin: st === 'waiting' && curP < 2, modeLabel: 'إكس أو (3×3) أونلاين',
      createdAt: SHARB_ROOM_CFG.createdAt[rKey]
    };
    SharbSession.setActiveRoom(obj);
    return obj;
  }
  // 5. Connect Four
  if (window.C4 && C4.mode === 'online' && C4.host && C4.code) {
    const vis = getRoomVisibility('c4');
    const curP = Math.max(1, [C4.players[1], C4.players[2]].filter(Boolean).length);
    const st = C4.engine.winner ? 'finished' : (curP < 2 ? 'waiting' : 'playing');
    const rKey = `c4_${C4.code}`;
    if (!SHARB_ROOM_CFG.createdAt[rKey]) SHARB_ROOM_CFG.createdAt[rKey] = Date.now();
    const obj = {
      roomKey: rKey, game: 'c4', code: C4.code, visibility: vis,
      roomName: sanitizeRoomName(SHARB_ROOM_CFG.roomNames.c4, PF.name),
      hostPid: ME, hostName: String(PF.name || 'لاعب').slice(0, 14),
      hostAv: String(PF.av || '🙂').slice(0, 4), hostCol: String(PF.col || '#0ea5e9').slice(0, 10),
      playersCount: Math.min(curP, 2), maxPlayers: 2, status: st,
      allowJoin: st === 'waiting' && curP < 2, modeLabel: 'كونكت فور (7×6) أونلاين',
      createdAt: SHARB_ROOM_CFG.createdAt[rKey]
    };
    SharbSession.setActiveRoom(obj);
    return obj;
  }
  // 6. Draw & Guess
  if (window.DG && DG.host && DG.code && DG.S) {
    const vis = getRoomVisibility('draw');
    const maxP = Math.max(2, Math.min(10, Number(DG.S.cfg && DG.S.cfg.maxPlayers) || 8));
    const curP = Math.max(1, (DG.S.players || []).filter(p => !p.gone).length);
    const st = DG.S.phase === 'lobby' ? 'waiting' : (DG.S.phase === 'game_over' ? 'finished' : 'playing');
    const rKey = `draw_${DG.code}`;
    if (!SHARB_ROOM_CFG.createdAt[rKey]) SHARB_ROOM_CFG.createdAt[rKey] = Date.now();
    const obj = {
      roomKey: rKey, game: 'draw', code: DG.code, visibility: vis,
      roomName: sanitizeRoomName(SHARB_ROOM_CFG.roomNames.draw, PF.name),
      hostPid: ME, hostName: String(PF.name || 'لاعب').slice(0, 14),
      hostAv: String(PF.av || '🙂').slice(0, 4), hostCol: String(PF.col || '#0ea5e9').slice(0, 10),
      playersCount: Math.min(curP, maxP), maxPlayers: maxP, status: st,
      allowJoin: st === 'waiting' && curP < maxP, modeLabel: `${(DG.S.cfg && DG.S.cfg.rounds) || 3} جولات • رسم وتخمين`,
      createdAt: SHARB_ROOM_CFG.createdAt[rKey]
    };
    SharbSession.setActiveRoom(obj);
    return obj;
  }
  // 7. Check saved cross-page session if player navigated to index.html / rooms.html / friends.html while hosting
  const savedActive = SharbSession.getActiveRoom();
  if (savedActive && savedActive.hostPid === ME) {
    return savedActive;
  }
  return null;
}
window.pubDirGetActiveHostRoom = pubDirGetActiveHostRoom;

function pubDirSyncHostRoom(forceImmediate) {
  const info = pubDirGetActiveHostRoom();
  if (!info) return;
  if (info.visibility !== 'public') {
    if (PUB_DIR.lastPublishedKey === info.roomKey) {
      PUB_DIR.lastPublishedKey = '';
      pubDirNotifyRoomClosed(info.game, info.code, 'switched_to_private');
    }
    PUB_DIR.rooms.delete(info.roomKey);
    pubDirRender();
    return;
  }
  const pkt = {
    t: 'room_up',
    roomKey: info.roomKey,
    game: info.game,
    code: info.code,
    visibility: 'public',
    roomName: info.roomName,
    hostPid: info.hostPid,
    hostName: info.hostName,
    hostAv: info.hostAv,
    hostCol: info.hostCol,
    playersCount: info.playersCount,
    maxPlayers: info.maxPlayers,
    status: info.status,
    allowJoin: info.allowJoin,
    modeLabel: info.modeLabel,
    createdAt: info.createdAt || Date.now(),
    ts: Date.now(),
    closed: false
  };
  PUB_DIR.lastPublishedKey = info.roomKey;
  pubDirIngestPacket(pkt, PUB_DIR_BUS_TOPIC);
  pub(PUB_DIR_ROOM_PREFIX + info.roomKey, pkt, { qos: 0, retain: true });
  pub(PUB_DIR_BUS_TOPIC, pkt, { qos: 0, retain: false });
}
window.pubDirSyncHostRoom = pubDirSyncHostRoom;

function pubDirNotifyRoomClosed(gameKind, roomCode, reason) {
  const g = String(gameKind || '').trim().toLowerCase();
  const c = String(roomCode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!g || !c) return;
  const rKey = `${g}_${c}`;
  const wasPublic = (PUB_DIR.lastPublishedKey === rKey) || PUB_DIR.rooms.has(rKey);
  if (PUB_DIR.lastPublishedKey === rKey) PUB_DIR.lastPublishedKey = '';
  PUB_DIR.rooms.delete(rKey);
  PUB_DIR.hostReservations.clear();
  if (reason !== 'visibility_private') {
    SharbSession.clearActiveRoom(g);
  }
  try { localStorage.removeItem('bk_ret_' + PUB_DIR_ROOM_PREFIX + rKey); } catch (e) {}
  if (wasPublic) {
    const downPkt = {
      t: 'room_down',
      roomKey: rKey,
      game: g,
      closed: true,
      visibility: reason === 'visibility_private' ? 'private' : 'closed',
      reason: reason || 'closed',
      ts: Date.now()
    };
    pub(PUB_DIR_ROOM_PREFIX + rKey, downPkt, { qos: 0, retain: true });
    pub(PUB_DIR_BUS_TOPIC, downPkt, { qos: 0, retain: false });
  }
  pubDirRender();
}
window.pubDirNotifyRoomClosed = pubDirNotifyRoomClosed;

function pubDirCloseAllHostedRooms() {
  const info = pubDirGetActiveHostRoom();
  if (info && info.visibility === 'public') {
    pubDirNotifyRoomClosed(info.game, info.code, 'explicit_close');
  }
}
window.pubDirCloseAllHostedRooms = pubDirCloseAllHostedRooms;

function pubDirValidatePacket(pkt) {
  if (!pkt || typeof pkt !== 'object') return null;
  const game = String(pkt.game || '').trim().toLowerCase();
  const meta = SHARB_GAME_META[game];
  if (!meta) return null;
  const codeStr = String(pkt.code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (codeStr.length < 4 || codeStr.length > 6) return null;
  const expectedKey = `${game}_${codeStr}`;
  if (pkt.roomKey && pkt.roomKey !== expectedKey) return null;
  if (pkt.visibility && pkt.visibility !== 'public') return null;

  const maxP = Number(pkt.maxPlayers);
  if (!Number.isFinite(maxP) || maxP < meta.minPlayers || maxP > meta.maxAllowed) return null;
  const curP = Number(pkt.playersCount);
  if (!Number.isFinite(curP) || curP < 1 || curP > maxP) return null;

  const st = ['waiting', 'playing', 'finished'].includes(pkt.status) ? pkt.status : 'waiting';
  const hostName = String(pkt.hostName || 'لاعب').replace(/[<>]/g, '').trim().slice(0, 16) || 'لاعب';
  const roomName = sanitizeRoomName(pkt.roomName, hostName);
  const hostAv = String(pkt.hostAv || '🙂').slice(0, 4);
  const hostCol = /^#[0-9a-fA-F]{3,8}$/.test(String(pkt.hostCol || '')) ? pkt.hostCol : '#0ea5e9';
  const modeLabel = String(pkt.modeLabel || meta.name).replace(/[<>]/g, '').trim().slice(0, 48);
  const now = Date.now();
  const pktTs = Number(pkt.ts) || now;
  const createdAt = Number(pkt.createdAt) || pktTs;

  return {
    roomKey: expectedKey,
    game,
    code: codeStr,
    visibility: 'public',
    roomName,
    hostPid: String(pkt.hostPid || '').slice(0, 36),
    hostName,
    hostAv,
    hostCol,
    playersCount: Math.round(curP),
    maxPlayers: Math.round(maxP),
    status: st,
    allowJoin: st === 'waiting' && curP < maxP && pkt.allowJoin !== false,
    isArena: !!pkt.isArena,
    modeLabel,
    createdAt: Math.min(createdAt, now),
    ts: pktTs,
    lastSeen: now,
    closed: false
  };
}

function pubDirIngestPacket(pkt, topic) {
  if (!pkt || typeof pkt !== 'object') return;
  if (pkt.t === 'room_down' || pkt.closed === true || pkt.visibility === 'private') {
    const rKey = String(pkt.roomKey || (pkt.game && pkt.code ? `${pkt.game}_${pkt.code}` : '')).trim();
    if (rKey && PUB_DIR.rooms.has(rKey)) {
      PUB_DIR.rooms.delete(rKey);
      try { localStorage.removeItem('bk_ret_' + PUB_DIR_ROOM_PREFIX + rKey); } catch (e) {}
      pubDirRender();
    }
    return;
  }
  if (pkt.t === 'dir_query') {
    const now = Date.now();
    if (now - PUB_DIR.lastHostReplyAt >= 1200) {
      const myHost = pubDirGetActiveHostRoom();
      if (myHost && myHost.visibility === 'public') {
        PUB_DIR.lastHostReplyAt = now;
        pubDirSyncHostRoom(true);
      }
    }
    return;
  }
  if (pkt.t === 'join_check') {
    const myHost = pubDirGetActiveHostRoom();
    if (!myHost || myHost.roomKey !== pkt.roomKey) return;
    pubDirPruneReservations();
    const reqPid = pkt.player && pkt.player.pid ? String(pkt.player.pid) : '';
    let ok = true, reason = 'ok', msg = '';
    if (myHost.visibility !== 'public') {
      ok = false; reason = 'private'; msg = 'هذه الغرفة خاصة ولا يمكن الانضمام إليها من القائمة العامة';
    } else if (myHost.status !== 'waiting') {
      ok = false; reason = 'playing'; msg = 'بدأت المباراة بالفعل — انتظر انتهاء الجولة الحالية';
    } else {
      let otherReserved = 0;
      PUB_DIR.hostReservations.forEach((exp, rPid) => { if (rPid !== reqPid) otherReserved++; });
      if (myHost.playersCount + otherReserved >= myHost.maxPlayers) {
        ok = false; reason = 'full'; msg = `الغرفة مكتملة العدد (${myHost.maxPlayers}/${myHost.maxPlayers} لاعبين)!`;
      } else if (reqPid) {
        PUB_DIR.hostReservations.set(reqPid, Date.now() + 5500);
      }
    }
    pub(PUB_DIR_BUS_TOPIC, {
      t: 'join_check_ack',
      reqId: pkt.reqId,
      roomKey: myHost.roomKey,
      targetPid: reqPid,
      ok, reason, msg,
      playersCount: myHost.playersCount,
      maxPlayers: myHost.maxPlayers,
      status: myHost.status,
      visibility: myHost.visibility,
      ts: Date.now()
    }, { qos: 0, retain: false });
    return;
  }
  if (pkt.t === 'join_check_ack') {
    if (pkt.reqId && PUB_DIR.pendingJoinAcks.has(pkt.reqId)) {
      const cb = PUB_DIR.pendingJoinAcks.get(pkt.reqId);
      PUB_DIR.pendingJoinAcks.delete(pkt.reqId);
      cb(pkt);
    }
    return;
  }
  if (pkt.t === 'room_up') {
    if (topic && topic.startsWith(PUB_DIR_ROOM_PREFIX) && pkt.ts && Math.abs(Date.now() - Number(pkt.ts)) > PUB_DIR.RETAINED_MAX_AGE_MS) {
      return;
    }
    const valid = pubDirValidatePacket(pkt);
    if (!valid) return;
    const existing = PUB_DIR.rooms.get(valid.roomKey);
    if (existing && existing.createdAt < valid.createdAt) {
      valid.createdAt = existing.createdAt;
    }
    PUB_DIR.rooms.set(valid.roomKey, valid);
    PUB_DIR.loading = false;
    PUB_DIR.netError = false;
    pubDirRender();
  }
}

function pubDirSweepStale() {
  seedDefaultArenaRooms();
  const now = Date.now();
  let changed = false;
  const myHost = pubDirGetActiveHostRoom();
  PUB_DIR.rooms.forEach((rm, key) => {
    if (rm.isArena) {
      rm.lastSeen = now;
      return;
    }
    if (myHost && myHost.roomKey === key && myHost.visibility === 'public') {
      rm.lastSeen = now;
      return;
    }
    if (now - (rm.lastSeen || 0) > PUB_DIR.STALE_TTL_MS) {
      PUB_DIR.rooms.delete(key);
      changed = true;
    }
  });
  if (changed) pubDirRender();
}

function pubDirGetFilteredSortedRooms() {
  seedDefaultArenaRooms();
  const list = [];
  const q = String(PUB_DIR.searchQuery || '').trim().toLowerCase();
  PUB_DIR.rooms.forEach(rm => {
    if (rm.closed || rm.visibility !== 'public') return;
    if (PUB_DIR.filterGame !== 'all' && rm.game !== PUB_DIR.filterGame) return;
    if (PUB_DIR.filterStatus === 'waiting' && !(rm.status === 'waiting' && rm.playersCount < rm.maxPlayers)) return;
    if (PUB_DIR.filterStatus === 'playing' && rm.status !== 'playing') return;
    if (PUB_DIR.filterStatus === 'full' && rm.playersCount < rm.maxPlayers) return;
    if (PUB_DIR.filterStatus === 'user' && rm.isArena) return;
    if (q) {
      const hay = `${rm.roomName} ${rm.code} ${rm.hostName} ${rm.modeLabel} ${SHARB_GAME_META[rm.game]?.name || ''}`.toLowerCase();
      if (!hay.includes(q)) return;
    }
    list.push(rm);
  });

  const sortMode = PUB_DIR.sortBy || 'recommended';
  list.sort((a, b) => {
    // User-created live rooms always sort above default arena rooms
    if (!!a.isArena !== !!b.isArena) return a.isArena ? 1 : -1;
    const aJoinable = (a.status === 'waiting' && a.playersCount < a.maxPlayers) ? 1 : 0;
    const bJoinable = (b.status === 'waiting' && b.playersCount < b.maxPlayers) ? 1 : 0;
    if (sortMode === 'slots') {
      const aSlots = Math.max(0, a.maxPlayers - a.playersCount);
      const bSlots = Math.max(0, b.maxPlayers - b.playersCount);
      if (aJoinable !== bJoinable) return bJoinable - aJoinable;
      return bSlots - aSlots;
    }
    if (sortMode === 'status') {
      const rank = { waiting: 0, finished: 1, playing: 2 };
      return (rank[a.status] ?? 3) - (rank[b.status] ?? 3);
    }
    if (sortMode === 'players') {
      return b.playersCount - a.playersCount;
    }
    if (aJoinable !== bJoinable) return bJoinable - aJoinable;
    return b.createdAt - a.createdAt;
  });
  return list;
}

function buildPublicRoomCardHTML(rm, myHost) {
  const meta = SHARB_GAME_META[rm.game] || SHARB_GAME_META.domino;
  const isFull = rm.playersCount >= rm.maxPlayers;
  const isWaiting = rm.status === 'waiting' && !isFull;
  const isPlaying = rm.status === 'playing';
  const isFinished = rm.status === 'finished';
  const isMyRoom = (myHost && myHost.roomKey === rm.roomKey) || (rm.hostPid && rm.hostPid === ME);
  const isJoiningThis = PUB_DIR.joiningRoomKey === rm.roomKey;
  const pct = Math.min(100, Math.round((rm.playersCount / Math.max(1, rm.maxPlayers)) * 100));

  let statusClass = 'waiting';
  let statusText = '🟢 متاحة';
  if (isPlaying) { statusClass = 'playing'; statusText = '🔵 باللعب'; }
  else if (isFinished) { statusClass = 'finished'; statusText = '🏁 انتهت'; }
  else if (isFull) { statusClass = 'full'; statusText = '🟠 ممتلئة'; }

  let btnLabel = 'انضمام 🚀';
  let btnDisabled = false;
  let btnClass = 'btn ok pub-rc-JoinBtn';
  if (isJoiningThis) { btnLabel = '⏳ جاري…'; btnDisabled = true; btnClass = 'btn g pub-rc-JoinBtn'; }
  else if (isMyRoom) { btnLabel = '👑 غرفتك'; btnClass = 'btn pub-rc-JoinBtn'; }
  else if (isPlaying) { btnLabel = '⏳ جارية'; btnDisabled = true; btnClass = 'btn g pub-rc-JoinBtn'; }
  else if (isFinished) { btnLabel = '🏁 انتهت'; btnDisabled = true; btnClass = 'btn g pub-rc-JoinBtn'; }
  else if (isFull) { btnLabel = '🔒 ممتلئة'; btnDisabled = true; btnClass = 'btn g pub-rc-JoinBtn'; }

  return `<article class="pub-room-card ${isWaiting ? 'is-waiting' : (isFull ? 'is-full' : 'is-playing')}" data-roomkey="${esc(rm.roomKey)}">
    <div>
      <div class="pub-rc-top">
        <span class="pub-rc-game">${meta.icon} <span>${esc(meta.name)}</span></span>
        <span class="pub-rc-status ${statusClass}">${statusText}</span>
      </div>
      <div class="pub-rc-title-row" style="margin-top:4px">
        <div class="pub-rc-name" title="${esc(rm.roomName)}">${esc(rm.roomName)}</div>
        <span class="pub-rc-code">#${esc(rm.code)}</span>
      </div>
      <div class="pub-rc-meta-line" style="margin-top:3px">
        <span>👤 <b>${esc(rm.hostName)}</b></span>
        <span>${esc(rm.modeLabel)}</span>
      </div>
    </div>
    <div class="pub-rc-foot-row">
      <div class="pub-rc-cap-mini">
        <span>👥 <b>${rm.playersCount}</b>/${rm.maxPlayers} لاعبين</span>
        <div class="pub-rc-bar ${isFull ? 'full' : ''}">
          <i style="width:${pct}%"></i>
        </div>
      </div>
      <button type="button" class="${btnClass}" data-pubjoin="${esc(rm.roomKey)}" ${btnDisabled ? 'disabled' : ''}>
        ${btnLabel}
      </button>
    </div>
  </article>`;
}

function pubDirRender() {
  seedDefaultArenaRooms();
  const container = document.getElementById('pubRoomsContainer');
  const countBadge = document.getElementById('pubRoomsCountBadge');
  const connPill = document.getElementById('pubRoomsConnPill');
  const connText = document.getElementById('pubRoomsConnText');

  const allPublic = [...PUB_DIR.rooms.values()].filter(r => !r.closed && r.visibility === 'public');
  const joinableTotal = allPublic.filter(r => r.status === 'waiting' && r.playersCount < r.maxPlayers).length;

  if (countBadge) {
    countBadge.textContent = `${allPublic.length} غرف (${joinableTotal} متاحة)`;
    countBadge.className = 'bk-chip ' + (joinableTotal > 0 ? 'ok' : 'ac');
  }

  if (connPill && connText) {
    connPill.className = 'pub-conn-pill online';
    connText.textContent = (NET.client && NET.ready) ? 'متصل مباشر' : 'متصل';
  }

  $$('#pubRoomsFilterPills [data-pubfilter]').forEach(btn => {
    const fg = btn.getAttribute('data-pubfilter');
    btn.classList.toggle('on', fg === PUB_DIR.filterGame);
  });

  $$('[data-pubstatus]').forEach(btn => {
    const st = btn.getAttribute('data-pubstatus');
    btn.classList.toggle('on', st === PUB_DIR.filterStatus);
  });

  if (!container) return;

  if (PUB_DIR.loading) {
    container.innerHTML = `<div class="pub-empty-box">
      <div style="font-size:26px;margin-bottom:6px">📡</div>
      <b>جاري تحديث قائمة الغرف العامة…</b>
      <div class="mut tiny" style="margin-top:4px">يتم مزامنة الغرف النشطة الآن</div>
    </div>`;
    return;
  }

  const filtered = pubDirGetFilteredSortedRooms();
  if (filtered.length === 0) {
    setHTMLIfChanged(container, `<div class="pub-empty-box">
      <div style="font-size:24px;margin-bottom:4px">🌐</div>
      <b>لا توجد غرف عامة مطابقة للتصفية الحالية</b>
      <div class="mut tiny" style="margin:4px auto 10px;max-width:340px">جرّب تغيير فلتر اللعبة أو الحالة، أو أنشئ غرفة عامة جديدة الآن!</div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        <button type="button" class="btn ok sm" data-pubact="quickCreate">➕ إنشاء غرفة جديدة</button>
        <button type="button" class="btn g sm" data-pubact="resetFilter">عرض كل الغرف</button>
      </div>
    </div>`);
    return;
  }

  const myHost = pubDirGetActiveHostRoom();
  const isDashboardSidebar = !!container.closest('.dashboard-col-right');
  const visibleRooms = isDashboardSidebar ? filtered.slice(0, 6) : filtered;
  const cardsHTML = visibleRooms.map(rm => buildPublicRoomCardHTML(rm, myHost)).join('');

  setHTMLIfChanged(container, `<div class="pub-rooms-grid" id="pubRoomsGrid">${cardsHTML}</div>`);
  if (typeof syncHubWidgets === 'function') syncHubWidgets();
}
window.pubDirRender = pubDirRender;

async function pubDirRequestRefresh(manual) {
  PUB_DIR.lastQuerySentAt = Date.now();
  if (manual) {
    PUB_DIR.loading = true;
    pubDirRender();
  }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('bk_ret_' + PUB_DIR_ROOM_PREFIX)) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.payload && Date.now() - (parsed.ts || 0) <= PUB_DIR.STALE_TTL_MS) {
            pubDirIngestPacket(parsed.payload, k.replace('bk_ret_', ''));
          }
        }
      }
    }
  } catch (e) {}

  const myHost = pubDirGetActiveHostRoom();
  if (myHost && myHost.visibility === 'public') {
    pubDirSyncHostRoom(true);
  }
  pub(PUB_DIR_BUS_TOPIC, { t: 'dir_query', senderPid: ME, ts: Date.now() }, { qos: 0, retain: false });
  ensureMQTT().catch(() => {});

  setTimeout(() => {
    PUB_DIR.loading = false;
    pubDirSweepStale();
    pubDirRender();
  }, manual ? 280 : 100);

  if (manual) {
    toast('🔄 تم تحديث قائمة الغرف العامة', 'ok', 1800);
    beep(520, 0.06, 'sine', 0.06);
  }
}
window.pubDirRequestRefresh = pubDirRequestRefresh;

async function joinPublicRoom(roomKey) {
  if (!roomKey || PUB_DIR.joiningRoomKey) return false;
  pubDirSweepStale();
  const rm = PUB_DIR.rooms.get(roomKey);
  if (!rm || rm.closed) {
    toast('هذه الغرفة لم تعد متاحة', 'warn');
    return false;
  }
  if (rm.visibility !== 'public') {
    toast('هذه الغرفة خاصة ولا يمكن الانضمام إليها بدون كود', 'warn');
    return false;
  }
  if (rm.status !== 'waiting' || rm.playersCount >= rm.maxPlayers) {
    toast('هذه الغرفة مكتملة أو بدأت بالفعل', 'warn');
    return false;
  }

  // If it's one of the Open Arena rooms, navigate to the game page and create/open the room with that arena setup
  if (rm.isArena) {
    SharbSession.setRoomIntent({
      game: rm.game,
      action: 'create',
      code: rm.code,
      visibility: 'public',
      roomName: rm.roomName,
      via: 'public'
    });
    navigateToPage(rm.game, { room: rm.code, action: 'arena' });
    return true;
  }

  // Otherwise join user-hosted public room
  acceptGameInvite(rm.code, rm.game, 'public');
  return true;
}
window.joinPublicRoom = joinPublicRoom;

function openQuickCreateRoomModal(preselectedGame) {
  let selGame = (preselectedGame && SHARB_GAME_META[preselectedGame]) ? preselectedGame : (PUB_DIR.filterGame !== 'all' ? PUB_DIR.filterGame : 'domino');
  let selVis = 'public';
  const renderModal = () => {
    const isUnoOrDom = selGame === 'uno' || selGame === 'domino';
    const d = isUnoOrDom ? LOBBY_DRAFT[selGame] : null;
    const capOpts = selGame === 'uno' ? [2,3,4,5,6,7,8,9,10] : (selGame === 'domino' ? [2,3,4] : []);
    const extraCfgHTML = isUnoOrDom ? `
      <label class="lbl">٢. نظام اللعب وسعة الغرفة (${selGame === 'uno' ? '٢–١٠ لاعبين' : '٢–٤ لاعبين'}):</label>
      <div class="lob-mode-grid" style="margin-bottom:8px">
        <button type="button" class="lob-mode-btn ${!d.tm ? 'on' : ''}" data-qctm="0" style="padding:8px 10px">
          <span>👤</span>
          <span><b>فردي (Individual)</b><small>كل لاعب لنفسه</small></span>
        </button>
        <button type="button" class="lob-mode-btn ${d.tm ? 'on' : ''}" data-qctm="1" style="padding:8px 10px">
          <span>🛡️</span>
          <span><b>فرق (Team A vs B)</b><small>باختيار اللاعبين</small></span>
        </button>
      </div>
      <div class="lob-cap-pills" style="margin-bottom:12px">
        ${capOpts.map(c => `<button type="button" class="lob-cap-pill ${d.n === c ? 'on' : ''}" data-qccap="${c}" style="height:32px;font-size:12px;min-width:38px">${c}</button>`).join('')}
      </div>
    ` : '';

    const html = `<div class="card" style="max-width:500px;text-align:right">
      <h2 style="margin:0 0 6px;text-align:center">➕ إنشاء غرفة لعب جديدة</h2>
      <p class="mut tiny" style="text-align:center;margin:0 0 12px">اختر اللعبة وسعة الغرفة ونوعها (عامة أو خاصة) للانتقال إلى غرفة اللعب</p>

      <label class="lbl">١. اختر اللعبة:</label>
      <div class="quick-g-pills" style="margin-bottom:10px">
        ${Object.values(SHARB_GAME_META).map(g => `
          <div class="quick-g-pill ${selGame === g.id ? 'on' : ''}" data-qcgame="${g.id}">${g.icon} ${esc(g.name)}</div>
        `).join('')}
      </div>

      ${extraCfgHTML}

      <label class="lbl">نوع الغرفة:</label>
      <div class="vis-selector-grid" style="margin-bottom:10px">
        <button type="button" class="vis-opt-btn ${selVis === 'public' ? 'on' : ''}" data-qcvis="public">
          <span class="vis-ico">🌐</span>
          <span class="vis-txt">
            <b>غرفة عامة (Public)</b>
            <small>تظهر لجميع اللاعبين في صفحة الغرف والشريط الجانبي</small>
          </span>
        </button>
        <button type="button" class="vis-opt-btn ${selVis === 'private' ? 'on' : ''}" data-qcvis="private">
          <span class="vis-ico">🔒</span>
          <span class="vis-txt">
            <b>غرفة خاصة (Private)</b>
            <small>الدخول فقط بكود الغرفة أو دعوة صديق</small>
          </span>
        </button>
      </div>

      <label class="lbl" for="qcRoomNameInp">اسم الغرفة (اختياري):</label>
      <input id="qcRoomNameInp" maxlength="28" value="${esc(SHARB_ROOM_CFG.roomNames[selGame] || '')}" placeholder="مثال: تحدي المحترفين — غرفة ${esc(PF.name)}" style="margin-bottom:14px">

      <div class="row" style="justify-content:center;gap:10px">
        <button type="button" class="btn ok big" id="qcConfirmCreateBtn" style="flex:1">🚀 إنشاء الغرفة والانتقال للعبة</button>
        <button type="button" class="btn g" id="qcCancelBtn">إلغاء</button>
      </div>
    </div>`;
    openOverlay(html, 'quick_create_room');
    $$('[data-qcgame]').forEach(el => {
      el.onclick = () => {
        const inp = $('#qcRoomNameInp');
        if (inp) SHARB_ROOM_CFG.roomNames[selGame] = inp.value.trim();
        selGame = el.getAttribute('data-qcgame') || 'domino';
        renderModal();
      };
    });
    $$('[data-qcvis]').forEach(el => {
      el.onclick = () => {
        const inp = $('#qcRoomNameInp');
        if (inp) SHARB_ROOM_CFG.roomNames[selGame] = inp.value.trim();
        selVis = el.getAttribute('data-qcvis') === 'private' ? 'private' : 'public';
        renderModal();
      };
    });
    $$('[data-qctm]').forEach(el => {
      el.onclick = () => {
        const inp = $('#qcRoomNameInp');
        if (inp) SHARB_ROOM_CFG.roomNames[selGame] = inp.value.trim();
        if (LOBBY_DRAFT[selGame]) {
          LOBBY_DRAFT[selGame].tm = el.getAttribute('data-qctm') === '1';
          if (LOBBY_DRAFT[selGame].tm && (LOBBY_DRAFT[selGame].n % 2 === 1)) LOBBY_DRAFT[selGame].allowUneven = true;
          saveLobbyDraft();
        }
        renderModal();
      };
    });
    $$('[data-qccap]').forEach(el => {
      el.onclick = () => {
        const inp = $('#qcRoomNameInp');
        if (inp) SHARB_ROOM_CFG.roomNames[selGame] = inp.value.trim();
        if (LOBBY_DRAFT[selGame]) {
          LOBBY_DRAFT[selGame].n = parseInt(el.getAttribute('data-qccap'), 10) || 4;
          if (LOBBY_DRAFT[selGame].tm && (LOBBY_DRAFT[selGame].n % 2 === 1)) LOBBY_DRAFT[selGame].allowUneven = true;
          saveLobbyDraft();
        }
        renderModal();
      };
    });
    const cancelBtn = $('#qcCancelBtn');
    if (cancelBtn) cancelBtn.onclick = closeOverlay;
    const confirmBtn = $('#qcConfirmCreateBtn');
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        const inp = $('#qcRoomNameInp');
        if (inp) SHARB_ROOM_CFG.roomNames[selGame] = inp.value.trim();
        setRoomVisibility(selGame, selVis, true);
        closeOverlay();
        const newCode = genCode();
        SharbSession.setRoomIntent({
          game: selGame,
          action: 'create',
          code: newCode,
          visibility: selVis,
          roomName: SHARB_ROOM_CFG.roomNames[selGame] || ''
        });
        navigateToPage(selGame, { action: 'create', vis: selVis });
      };
    }
  };
  renderModal();
}
window.openQuickCreateRoomModal = openQuickCreateRoomModal;

function pubDirOnNetReconnect(connected) {
  if (connected) {
    PUB_DIR.netError = false;
    const myHost = pubDirGetActiveHostRoom();
    if (myHost && myHost.visibility === 'public') pubDirSyncHostRoom(true);
    pub(PUB_DIR_BUS_TOPIC, { t: 'dir_query', senderPid: ME, ts: Date.now() }, { qos: 0, retain: false });
  }
  pubDirRender();
}
window.pubDirOnNetReconnect = pubDirOnNetReconnect;

function initPublicRoomsSystem() {
  if (PUB_DIR.initialized) return;
  PUB_DIR.initialized = true;
  seedDefaultArenaRooms();

  sub(PUB_DIR_BUS_TOPIC, (d, t) => pubDirIngestPacket(d, t));
  sub(PUB_DIR_ROOM_WILDCARD, (d, t) => pubDirIngestPacket(d, t));

  const refreshBtn = document.getElementById('pubRoomsRefreshBtn');
  if (refreshBtn) refreshBtn.onclick = () => pubDirRequestRefresh(true);

  const quickCreateBtn = document.getElementById('pubRoomsQuickCreateBtn');
  if (quickCreateBtn) quickCreateBtn.onclick = () => openQuickCreateRoomModal();

  const sortSel = document.getElementById('pubRoomsSortSel');
  if (sortSel) {
    sortSel.onchange = () => {
      PUB_DIR.sortBy = sortSel.value || 'recommended';
      pubDirRender();
    };
  }

  const searchInp = document.getElementById('roomsPageSearchInput');
  if (searchInp) {
    searchInp.addEventListener('input', () => {
      PUB_DIR.searchQuery = searchInp.value;
      pubDirRender();
    });
  }

  document.addEventListener('click', e => {
    const filterBtn = e.target.closest('[data-pubfilter]');
    if (filterBtn) {
      PUB_DIR.filterGame = filterBtn.getAttribute('data-pubfilter') || 'all';
      pubDirRender();
      beep(440, 0.04, 'sine', 0.04);
      return;
    }
    const statusBtn = e.target.closest('[data-pubstatus]');
    if (statusBtn) {
      PUB_DIR.filterStatus = statusBtn.getAttribute('data-pubstatus') || 'all';
      pubDirRender();
      beep(440, 0.04, 'sine', 0.04);
      return;
    }
    const pubJoinBtn = e.target.closest('[data-pubjoin]');
    if (pubJoinBtn) {
      if (pubJoinBtn.disabled) return;
      const rKey = pubJoinBtn.getAttribute('data-pubjoin');
      if (rKey) joinPublicRoom(rKey);
      return;
    }
    const pubActBtn = e.target.closest('[data-pubact]');
    if (pubActBtn) {
      const act = pubActBtn.getAttribute('data-pubact');
      if (act === 'refresh') pubDirRequestRefresh(true);
      else if (act === 'quickCreate') openQuickCreateRoomModal();
      else if (act === 'resetFilter') {
        PUB_DIR.filterGame = 'all';
        PUB_DIR.filterStatus = 'all';
        PUB_DIR.searchQuery = '';
        const sInp = document.getElementById('roomsPageSearchInput');
        if (sInp) sInp.value = '';
        pubDirRender();
      }
      return;
    }
    const visOptBtn = e.target.closest('[data-vis-scope]');
    if (visOptBtn) {
      const scope = visOptBtn.getAttribute('data-vis-scope');
      const val = visOptBtn.getAttribute('data-vis-val') === 'private' ? 'private' : 'public';
      if (scope === 'lobby') setRoomVisibility(typeof GAME_TYPE !== 'undefined' ? GAME_TYPE : 'domino', val, false);
      else if (scope) setRoomVisibility(scope, val, false);
      return;
    }
    const visLiveToggle = e.target.closest('[data-vis-toggle-live]');
    if (visLiveToggle) {
      const g = visLiveToggle.getAttribute('data-vis-toggle-live');
      if (g) {
        const next = getRoomVisibility(g) === 'public' ? 'private' : 'public';
        setRoomVisibility(g, next, false);
      }
      return;
    }
  });

  clearInterval(PUB_DIR.hbInterval);
  PUB_DIR.hbInterval = setInterval(() => {
    const myHost = pubDirGetActiveHostRoom();
    if (myHost && myHost.visibility === 'public') pubDirSyncHostRoom(false);
  }, PUB_DIR.HEARTBEAT_MS);

  clearInterval(PUB_DIR.sweepInterval);
  PUB_DIR.sweepInterval = setInterval(pubDirSweepStale, 4000);

  pubDirRequestRefresh(false);
}
window.initPublicRoomsSystem = initPublicRoomsSystem;

window.SharbPublicRooms = PUB_DIR;
