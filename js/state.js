/* ==========================================================================
   SHARB GAMES — SHARED STATE, PLAYER IDENTITY & NETWORKING CORE (js/state.js)
   Persists player identity, session state, current room, and MQTT/BroadcastChannel
   across real multi-page HTML documents.
   ========================================================================== */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const confirm = msg => {
  try { return typeof window.confirm === 'function' ? window.confirm(msg) : true; }
  catch (e) { return true; }
};
const esc = s => String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));

const store = {
  get(k, d) {
    try {
      const v = JSON.parse(localStorage.getItem(k));
      return v == null ? d : v;
    } catch (e) { return d; }
  },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }
};

const uid = () => Math.random().toString(36).slice(2, 10);
const rnd = n => Math.floor(Math.random() * n);
const AVS = ['🦁','🐯','🦅','🐺','🦊','🐉','👑','🔥','⚡','🎯','🧠','😎','🐼','🦈','🌟','🎩'];
const COLS = ['#0ea5e9','#8b5cf6','#10b981','#f59e0b','#f43f5e','#38bdf8','#a855f7','#6366f1'];
const BOT = ['🤖','👾','🎩','🦾','🧠','⚡','🛸','🦊','🐉'];
const MODE_NAMES = { draw: 'عادي (سحب)', block: 'تسكير', fives: 'أمريكي (٥)' };

var SHARB_GAME_META = {
  domino: { id: 'domino', page: 'domino.html', name: 'دومينو', nameEn: 'Domino', icon: '🁫', thumb: 'domino-thumb.svg', minPlayers: 2, maxAllowed: 4, cat: 'table', desc: 'دومينو كلاسيكي أونلاين أو ضد البوتات — عادي (سحب)، تسكير، وأمريكي (٥) فردي أو فرق ٢×٢.' },
  uno:    { id: 'uno',    page: 'uno.html',    name: 'UNO',    nameEn: 'UNO',    icon: '🎴', thumb: 'uno-thumb.svg',    minPlayers: 2, maxAllowed: 10, cat: 'table', desc: 'أونو كلاسيكي كامل حتى ١٠ لاعبين بكروت الأكشن، Wild، +4، ونظام الفردي أو الفرق.' },
  bakasa: { id: 'bakasa', page: 'bakasa.html', name: 'البكاسة', nameEn: 'Bakasa', icon: '🕵️', thumb: 'bakasa-thumb.svg', minPlayers: 3, maxAllowed: 12, cat: 'party', desc: 'لعبة الخداع المصرية الشهيرة: اكتشف البكس بين أصحابك من خلال الأسئلة والشك والتصويت السري!' },
  chess:  { id: 'chess',  page: 'chess.html',  name: 'شطرنج',  nameEn: 'Chess',  icon: '♟️', thumb: 'chess-thumb.svg',  minPlayers: 2, maxAllowed: 2, cat: 'strategy', desc: 'شطرنج احترافي بقوانين FIDE الكاملة: التبييت، الترقية، واللعب ضد الذكاء الاصطناعي أو أونلاين.' },
  ttt:    { id: 'ttt',    page: 'tic-tac-toe.html', name: 'إكس أو', nameEn: 'Tic-Tac-Toe', icon: '❌⭕', thumb: 'tic-tac-toe-thumb.svg', minPlayers: 2, maxAllowed: 2, cat: 'strategy', desc: 'مباريات (3×3) السريعة ضد ذكاء اصطناعي Minimax بثلاثة مستويات أو أونلاين مباشر مع الأصدقاء.' },
  c4:     { id: 'c4',     page: 'connect-four.html', name: 'كونكت فور', nameEn: 'Connect Four', icon: '🔴🟡', thumb: 'connect-four-thumb.svg', minPlayers: 2, maxAllowed: 2, cat: 'strategy', desc: 'أسقط الأقراص في الشبكة (7×6) ووصّل ٤ أقراص متتالية أفقيًا أو رأسيًا أو قطريًا للفوز.' },
  draw:   { id: 'draw',   page: 'draw-guess.html', name: 'ارسم وخمّن', nameEn: 'Draw & Guess', icon: '🎨', thumb: 'draw-guess-thumb.svg', minPlayers: 2, maxAllowed: 10, cat: 'party', desc: 'ارسم الكلمة السرية مباشرة على اللوحة التفاعلية وتنافس مع أصدقائك على تخمينها في الشات!' }
};
window.SHARB_GAME_META = SHARB_GAME_META;

var GAME_TYPE = window.DEFAULT_GAME_TYPE || 'domino';

var LOBBY_DRAFT = store.get('sharb_lobby_draft', null) || {
  domino: { n: 4, tm: true, allowUneven: false, fillBots: true, target: 100 },
  uno:    { n: 4, tm: false, allowUneven: false, fillBots: true, target: 500 }
};
window.LOBBY_DRAFT = LOBBY_DRAFT;

function saveLobbyDraft() {
  store.set('sharb_lobby_draft', LOBBY_DRAFT);
}
window.saveLobbyDraft = saveLobbyDraft;

function setHTMLIfChanged(el, nextHTML) {
  if (!el) return false;
  if (el._sharbLastHTML === nextHTML) return false;
  el._sharbLastHTML = nextHTML;
  el.innerHTML = nextHTML;
  return true;
}
window.setHTMLIfChanged = setHTMLIfChanged;

/* ================= PLAYER IDENTITY & CROSS-PAGE SESSION ================= */
let TAB = uid().slice(0, 4);
try {
  TAB = sessionStorage.getItem('domino_tab') || TAB;
  sessionStorage.setItem('domino_tab', TAB);
} catch (e) {}

function registerKnownProfile(p) {
  if (!p || !p.uid) return;
  const u = String(p.uid).toLowerCase();
  store.set('sharb_prof_' + u, {
    uid: u,
    name: String(p.name || 'لاعب').slice(0, 14),
    av: p.av || '🦁',
    col: p.col || '#0ea5e9',
    ts: Date.now()
  });
}

function getKnownProfile(u) {
  if (!u) return null;
  const clean = String(u).toLowerCase();
  if (typeof NET !== 'undefined' && NET && NET.presence && NET.presence[clean] && NET.presence[clean].name) {
    return NET.presence[clean];
  }
  return store.get('sharb_prof_' + clean, null);
}

let isSecondaryTab = false;
let PF = (function initTabProfile() {
  try {
    const tabSaved = JSON.parse(sessionStorage.getItem('sharb_tab_pf') || 'null');
    const tabSec = sessionStorage.getItem('sharb_tab_secondary') === '1';
    if (tabSaved && tabSaved.uid) {
      isSecondaryTab = tabSec;
      tabSaved.uid = String(tabSaved.uid).toLowerCase();
      tabSaved.st = Object.assign({ g: 0, w: 0, r: 0, p: 0 }, tabSaved.st || {});
      return tabSaved;
    }
    const mainPf = store.get('pf', null);
    const claims = store.get('sharb_tab_claims', {});
    const now = Date.now();
    let mainClaimedByOther = false;
    if (mainPf && mainPf.uid) {
      for (const [tId, info] of Object.entries(claims)) {
        if (tId !== TAB && info && info.uid === String(mainPf.uid).toLowerCase() && (now - (info.ts || 0) < 12000)) {
          mainClaimedByOther = true;
          break;
        }
      }
    }
    if (mainPf && mainPf.uid && !mainClaimedByOther) {
      const p = Object.assign({ uid: uid(), name: 'لاعب', av: '🦁', col: '#0ea5e9', st: { g: 0, w: 0, r: 0, p: 0 } }, mainPf);
      p.uid = String(p.uid).toLowerCase();
      p.st = Object.assign({ g: 0, w: 0, r: 0, p: 0 }, p.st || {});
      sessionStorage.setItem('sharb_tab_pf', JSON.stringify(p));
      sessionStorage.setItem('sharb_tab_secondary', '0');
      return p;
    }
    if (mainPf && mainPf.uid && mainClaimedByOther) {
      isSecondaryTab = true;
      const p = { uid: uid().toLowerCase(), name: 'لاعب ٢', av: AVS[rnd(AVS.length)], col: COLS[rnd(COLS.length)], st: { g: 0, w: 0, r: 0, p: 0 } };
      sessionStorage.setItem('sharb_tab_pf', JSON.stringify(p));
      sessionStorage.setItem('sharb_tab_secondary', '1');
      return p;
    }
  } catch (e) {}
  const p = Object.assign({ uid: uid().toLowerCase(), name: 'لاعب', av: '🦁', col: '#0ea5e9', st: { g: 0, w: 0, r: 0, p: 0 } }, store.get('pf', {}));
  p.uid = String(p.uid || uid()).toLowerCase();
  p.st = Object.assign({ g: 0, w: 0, r: 0, p: 0 }, p.st || {});
  try { sessionStorage.setItem('sharb_tab_pf', JSON.stringify(p)); } catch (e) {}
  return p;
})();

function beatTabClaim() {
  try {
    const claims = store.get('sharb_tab_claims', {});
    const now = Date.now();
    Object.keys(claims).forEach(k => { if (now - (claims[k]?.ts || 0) > 20000) delete claims[k]; });
    claims[TAB] = { uid: PF.uid, ts: now };
    store.set('sharb_tab_claims', claims);
  } catch (e) {}
}
beatTabClaim();
setInterval(beatTabClaim, 4000);

const ME = PF.uid + '.' + TAB;
const myUid = () => String(PF.uid || '').trim().toLowerCase();

const savePF = () => {
  PF.uid = String(PF.uid).toLowerCase();
  try { sessionStorage.setItem('sharb_tab_pf', JSON.stringify(PF)); } catch (e) {}
  if (!isSecondaryTab) store.set('pf', PF);
  registerKnownProfile(PF);
  beatTabClaim();
};
savePF();

const me0 = () => ({ pid: ME, uid: PF.uid, name: PF.name, av: PF.av, col: PF.col, st: PF.st });
const lvl = p => {
  const g = +p.g || 0, w = +p.w || 0, r = +p.r || 0;
  const x = g * 10 + w * 40 + r * 5;
  return { l: 1 + Math.floor(x / 100), pc: Math.min(100, x % 100) };
};

/* ================= REAL STATS & HISTORY HELPER ================= */
function getArcadeStats() {
  const key = 'sharb_arcade_stats_' + myUid();
  const def = {
    domino: { g: 0, w: 0, l: 0, d: 0 },
    uno: { g: 0, w: 0, l: 0, d: 0 },
    bakasa: { g: 0, w: 0, l: 0, d: 0 },
    chess: { g: 0, w: 0, l: 0, d: 0 },
    ttt: { g: 0, w: 0, l: 0, d: 0 },
    c4: { g: 0, w: 0, l: 0, d: 0 },
    draw: { g: 0, w: 0, l: 0, d: 0 },
    recent: []
  };
  const saved = store.get(key, null);
  if (!saved || typeof saved !== 'object') return def;
  return {
    domino: Object.assign({ g: 0, w: 0, l: 0, d: 0 }, saved.domino || {}),
    uno: Object.assign({ g: 0, w: 0, l: 0, d: 0 }, saved.uno || {}),
    bakasa: Object.assign({ g: 0, w: 0, l: 0, d: 0 }, saved.bakasa || {}),
    chess: Object.assign({ g: 0, w: 0, l: 0, d: 0 }, saved.chess || {}),
    ttt: Object.assign({ g: 0, w: 0, l: 0, d: 0 }, saved.ttt || {}),
    c4: Object.assign({ g: 0, w: 0, l: 0, d: 0 }, saved.c4 || {}),
    draw: Object.assign({ g: 0, w: 0, l: 0, d: 0 }, saved.draw || {}),
    recent: Array.isArray(saved.recent) ? saved.recent.slice(0, 12) : []
  };
}
window.getArcadeStats = getArcadeStats;

function recordArcadeMatchResult(gameKey, mode, resultKind, oppName) {
  const st = getArcadeStats();
  const bucket = st[gameKey] || { g: 0, w: 0, l: 0, d: 0 };
  bucket.g++;
  if (resultKind === 'win') bucket.w++;
  else if (resultKind === 'loss') bucket.l++;
  else bucket.d++;
  st[gameKey] = bucket;

  st.recent.unshift({
    game: gameKey,
    mode,
    result: resultKind,
    opp: oppName || 'خصم',
    ts: Date.now()
  });
  st.recent = st.recent.slice(0, 12);
  store.set('sharb_arcade_stats_' + myUid(), st);

  PF.st.g = (PF.st.g || 0) + 1;
  if (resultKind === 'win') {
    PF.st.w = (PF.st.w || 0) + 1;
    PF.st.p = (PF.st.p || 0) + 20;
  } else if (resultKind === 'draw') {
    PF.st.p = (PF.st.p || 0) + 8;
  }
  savePF();
  if (typeof renderProfileBtn === 'function') renderProfileBtn();
}
window.recordArcadeMatchResult = recordArcadeMatchResult;

/* ================= SOUND & THEME ENGINE ================= */
let soundOn = store.get('snd', true);
let ac = null;

function beep(f = 240, d = 0.09, type = 'triangle', vol = 0.1) {
  if (!soundOn) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = ac || new AC();
    if (ac.state === 'suspended') ac.resume();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d);
    o.connect(g);
    g.connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + d);
  } catch (e) {}
}

function confetti(n = 34) {
  const chars = ['🎉','✨','🁫','🏆','🎊'];
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = 'cf';
    d.textContent = chars[i % chars.length];
    d.style.left = (Math.random() * 100) + 'vw';
    d.style.animationDelay = (Math.random() * 1.1) + 's';
    d.style.fontSize = (18 + Math.random() * 16) + 'px';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 5200);
  }
}
window.confettiBurst = confetti;

function syncThemeAttrs(sharbVal, themeVal) {
  const r = document.documentElement;
  r.setAttribute('data-sharb', sharbVal);
  r.dataset.theme = themeVal;
  if (document.body) {
    document.body.setAttribute('data-sharb', sharbVal);
    document.body.dataset.theme = themeVal;
  }
}

(function initDefaultTheme() {
  // Default to 'blue' (Deep Navy + Electric Blue + Subtle Purple) per new visual identity
  const savedSharb = store.get('sharb_theme_v3', null) || 'blue';
  const savedTheme = savedSharb === 'light' ? 'light' : 'dark';
  syncThemeAttrs(savedSharb, savedTheme);
})();

/* ================= CROSS-PAGE SHARED SESSION & ROOM MANAGER ================= */
const SharbSession = {
  setRoomIntent(intent) {
    try {
      sessionStorage.setItem('sharb_room_intent', JSON.stringify(Object.assign({ ts: Date.now() }, intent)));
    } catch (e) {}
  },
  getRoomIntent() {
    try {
      const raw = sessionStorage.getItem('sharb_room_intent');
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || Date.now() - (d.ts || 0) > 60000) {
        sessionStorage.removeItem('sharb_room_intent');
        return null;
      }
      return d;
    } catch (e) { return null; }
  },
  consumeRoomIntent(expectedGame) {
    const d = this.getRoomIntent();
    if (!d) return null;
    if (expectedGame && d.game && d.game !== expectedGame) return null;
    try { sessionStorage.removeItem('sharb_room_intent'); } catch (e) {}
    return d;
  },
  setActiveRoom(roomObj) {
    try {
      if (!roomObj || !roomObj.code) {
        sessionStorage.removeItem('sharb_active_room');
        return;
      }
      sessionStorage.setItem('sharb_active_room', JSON.stringify(Object.assign({ updatedAt: Date.now() }, roomObj)));
    } catch (e) {}
  },
  getActiveRoom() {
    try {
      const raw = sessionStorage.getItem('sharb_active_room');
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || !d.code) return null;
      return d;
    } catch (e) { return null; }
  },
  clearActiveRoom(expectedGame) {
    try {
      if (expectedGame) {
        const cur = this.getActiveRoom();
        if (cur && cur.game && cur.game !== expectedGame) return;
      }
      sessionStorage.removeItem('sharb_active_room');
    } catch (e) {}
  },
  saveGameSession(gameKey, stateObj) {
    try {
      if (!stateObj) {
        sessionStorage.removeItem('sharb_gsess_' + gameKey);
        return;
      }
      sessionStorage.setItem('sharb_gsess_' + gameKey, JSON.stringify(Object.assign({ savedAt: Date.now() }, stateObj)));
    } catch (e) {}
  },
  loadGameSession(gameKey) {
    try {
      const raw = sessionStorage.getItem('sharb_gsess_' + gameKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  },
  clearGameSession(gameKey) {
    try { sessionStorage.removeItem('sharb_gsess_' + gameKey); } catch (e) {}
  }
};
window.SharbSession = SharbSession;

/* ================= NETWORKING: MQTT OVER WEBSOCKET + BROADCASTCHANNEL ================= */
const MQTT_URLS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081/mqtt'
];
const T_ROOT = 'domino-pro/v2/';
const NET = {
  client: null,
  ready: false,
  loading: null,
  url: '',
  want: false,
  topics: new Map(),
  guests: new Map(),
  hostTimer: null,
  guestTimer: null,
  joinTimer: null,
  lastBeat: 0,
  notFound: false,
  presence: {},
  invites: {},
  presenceSubs: new Set(),
  presenceTimer: null
};
window.NET = NET;

const genCode = () => {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 5; i++) s += A[rnd(A.length)];
  return s;
};
const roomTopic = (c, k) => T_ROOT + 'r/' + c + '/' + k;
const presenceTopic = u => T_ROOT + 'p/' + String(u || '').toLowerCase();
const inboxTopic = u => T_ROOT + 'in/' + String(u || '').toLowerCase();

function setNetStatus(msg, kind) {
  const el = $('#netstatus');
  if (el) {
    el.textContent = msg;
    el.className = 'netstatus' + (kind ? ' ' + kind : '');
  }
}

function loadScript(src, check) {
  return new Promise(res => {
    if (check()) return res(true);
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    let done = false;
    const fin = v => { if (done) return; done = true; res(v); };
    s.onload = () => fin(!!check());
    s.onerror = () => fin(false);
    document.head.appendChild(s);
    setTimeout(() => fin(!!check()), 6500);
  });
}

function mqttConnect(url) {
  return new Promise(res => {
    let done = false;
    const fin = v => { if (!done) { done = true; res(v); } };
    let c = null;
    try {
      c = mqtt.connect(url, {
        clientId: 'dp_' + Math.random().toString(16).slice(2, 12),
        clean: true,
        connectTimeout: 6000,
        reconnectPeriod: 2500,
        keepalive: 30
      });
    } catch (e) { return fin(null); }
    const settle = () => fin(c);
    c.on('connect', () => { NET.ready = true; settle(); });
    c.on('close', () => { NET.ready = false; });
    c.on('offline', () => { NET.ready = false; });
    c.on('error', () => {});
    setTimeout(() => { if (!done) { try { c.end(true); } catch (e) {} fin(null); } }, 6500);
  });
}

function ensureMQTT() {
  if (NET.client && NET.client.connected) return Promise.resolve(true);
  if (NET.loading) return NET.loading;
  NET.loading = (async () => {
    let ok = await loadScript('https://unpkg.com/mqtt@5.10.1/dist/mqtt.min.js', () => window.mqtt);
    if (!ok || !window.mqtt) ok = await loadScript('https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.min.js', () => window.mqtt);
    if (!ok || !window.mqtt) { NET.loading = null; return false; }
    if (NET.client) { try { NET.client.end(true); } catch (e) {} NET.client = null; }
    for (const u of MQTT_URLS) {
      const c = await mqttConnect(u);
      if (c) {
        NET.client = c;
        NET.ready = true;
        NET.url = u;
        wireClient();
        NET.topics.forEach((fn, t) => { try { c.subscribe(t, { qos: 0 }); } catch (e) {} });
        return true;
      }
    }
    NET.loading = null;
    return false;
  })();
  return NET.loading;
}

function dispatchNetTopic(topic, d) {
  if (!topic) return;
  const exact = NET.topics.get(topic);
  if (exact) { try { exact(d, topic); } catch (e) {} }
  NET.topics.forEach((fn, pat) => {
    if (pat !== topic && pat.endsWith('/#')) {
      const prefix = pat.slice(0, -1);
      if (topic.startsWith(prefix)) {
        try { fn(d, topic); } catch (e) {}
      }
    }
  });
}

function wireClient() {
  const c = NET.client;
  c.on('message', (topic, payload) => {
    let d = null;
    const s = payload && payload.toString ? payload.toString() : '';
    if (s) { try { d = JSON.parse(s); } catch (e) { return; } }
    dispatchNetTopic(topic, d);
  });
  c.on('connect', () => {
    NET.ready = true;
    NET.topics.forEach((fn, t) => { try { c.subscribe(t, { qos: 0 }); } catch (e) {} });
    if (typeof pubDirOnNetReconnect === 'function') pubDirOnNetReconnect(true);
  });
  c.on('close', () => {
    NET.ready = false;
    if (typeof pubDirOnNetReconnect === 'function') pubDirOnNetReconnect(false);
  });
}

function sub(topic, fn) {
  const already = NET.topics.has(topic);
  NET.topics.set(topic, fn);
  if (!already && NET.client) {
    try { NET.client.subscribe(topic, { qos: 0 }); } catch (e) {}
  }
}

function unsub(topic) {
  NET.topics.delete(topic);
  if (NET.client) {
    try { NET.client.unsubscribe(topic); } catch (e) {}
  }
}

/* Cross-tab BroadcastChannel + localStorage Bus alongside MQTT */
let bkBC = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    bkBC = new BroadcastChannel('sharb_bakasa_sync_v1');
    bkBC.onmessage = ev => {
      const m = ev && ev.data;
      if (!m || !m.topic) return;
      dispatchNetTopic(m.topic, m.payload);
    };
  }
  window.addEventListener('storage', ev => {
    if (!ev.key || !ev.newValue) return;
    if (ev.key.startsWith('bk_bus_msg_')) {
      try {
        const m = JSON.parse(ev.newValue);
        if (m && m.topic) dispatchNetTopic(m.topic, m.payload);
      } catch (e) {}
    }
  });
} catch (e) {}

function pub(topic, obj, opt) {
  try {
    if (!opt || !opt._skipLocalBus) {
      if (opt && opt.retain) {
        localStorage.setItem('bk_ret_' + topic, JSON.stringify({ ts: Date.now(), payload: obj }));
      }
      if (bkBC) bkBC.postMessage({ topic, payload: obj, ts: Date.now() });
      localStorage.setItem('bk_bus_msg_' + topic, JSON.stringify({ topic, payload: obj, ts: Date.now(), r: Math.random() }));
    }
  } catch (e) {}
  if (!NET.client) return true;
  try {
    const mqttOpt = Object.assign({ qos: 0, retain: false }, opt || {});
    delete mqttOpt._skipLocalBus;
    NET.client.publish(topic, JSON.stringify(obj), mqttOpt);
    return true;
  } catch (e) { return true; }
}

/* Shared Arcade Real-Time Bus for TTT, Connect Four, and Draw & Guess */
let arcBC = null;
let arcPktSeq = 0;
const arcSeenPkts = new Set();

function arcMarkSeenPkt(pktId) {
  if (!pktId) return false;
  if (arcSeenPkts.has(pktId)) return true;
  arcSeenPkts.add(pktId);
  if (arcSeenPkts.size > 3000) {
    const first = arcSeenPkts.values().next().value;
    if (first) arcSeenPkts.delete(first);
  }
  return false;
}

try {
  if (typeof BroadcastChannel !== 'undefined') {
    arcBC = new BroadcastChannel('sharb_arcade_net_v1');
    arcBC.onmessage = e => {
      if (e && e.data && e.data.topic) {
        arcDispatchMsg(e.data.topic, e.data.payload, e.data.pktId);
      }
    };
  }
  window.addEventListener('storage', e => {
    if (e.key && e.key.startsWith('sharb_arcade_pkt') && e.newValue) {
      try {
        const d = JSON.parse(e.newValue);
        if (d && d.topic) arcDispatchMsg(d.topic, d.payload, d.pktId);
      } catch (err) {}
    }
  });
} catch (e) {}

function arcTopic(gameKey, code, sub) {
  return `sharb-${gameKey}/v1/${code}/${sub}`;
}

function arcPub(gameKey, code, sub, payload, retain = false) {
  const topic = arcTopic(gameKey, code, sub);
  const pktId = TAB + '_' + (++arcPktSeq) + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  let clonedPayload = payload;
  try {
    clonedPayload = JSON.parse(JSON.stringify(payload || {}));
    if (clonedPayload && typeof clonedPayload === 'object') {
      clonedPayload._pktId = pktId;
      clonedPayload._fromTab = TAB;
    }
  } catch (e) {}

  if (NET.client && NET.ready) {
    try { NET.client.publish(topic, JSON.stringify(clonedPayload), { qos: 0, retain: !!retain }); } catch (e) {}
  }
  if (arcBC) {
    try { arcBC.postMessage({ topic, payload: clonedPayload, pktId }); } catch (e) {}
  }
  try {
    if (retain) localStorage.setItem('arc_ret_' + topic, JSON.stringify({ ts: Date.now(), payload: clonedPayload, pktId }));
    const slotKey = 'sharb_arcade_pkt_' + sub + '_' + (arcPktSeq % 8);
    localStorage.setItem(slotKey, JSON.stringify({ topic, payload: clonedPayload, pktId, _r: Math.random() }));
  } catch (e) {}
  setTimeout(() => arcDispatchMsg(topic, clonedPayload, pktId), 0);
}

function arcSub(ctrl, gameKey, code, subName, fn) {
  const topic = arcTopic(gameKey, code, subName);
  const wrappedFn = d => {
    const id = d && d._pktId;
    if (id && arcMarkSeenPkt(id)) return;
    try { fn(d); } catch (e) {}
  };
  ctrl.subs = (ctrl.subs || []).filter(s => s.topic !== topic);
  ctrl.subs.push({ topic, fn, wrappedFn });
  NET.topics.set(topic, wrappedFn);
  if (NET.client && NET.ready) {
    try { NET.client.subscribe(topic, { qos: 0 }); } catch (e) {}
  }
  try {
    const ret = localStorage.getItem('arc_ret_' + topic);
    if (ret) {
      const parsed = JSON.parse(ret);
      if (parsed && parsed.payload && Date.now() - (parsed.ts || 0) < 3600000) {
        setTimeout(() => { try { fn(parsed.payload); } catch (e) {} }, 10);
      }
    }
  } catch (e) {}
}

function arcClearSubs(ctrl) {
  if (!ctrl || !ctrl.subs) return;
  for (const s of ctrl.subs) {
    NET.topics.delete(s.topic);
    if (NET.client && NET.ready) {
      try { NET.client.unsubscribe(s.topic); } catch (e) {}
    }
  }
  ctrl.subs = [];
}

function arcDispatchMsg(topic, payload, pktId) {
  const id = pktId || (payload && payload._pktId);
  if (id && arcMarkSeenPkt(id)) return;
  for (const ctrl of [window.TTT, window.C4, window.DG].filter(Boolean)) {
    for (const s of (ctrl.subs || [])) {
      if (s.topic === topic) {
        try { s.fn(payload); } catch (e) {}
      }
    }
  }
}
