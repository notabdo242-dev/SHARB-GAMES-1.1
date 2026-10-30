/* ==========================================================================
   SHARB GAMES — REAL MULTI-PAGE NAVIGATION & GITHUB PAGES ROUTER (js/navigation.js)
   Handles relative URL resolution, active link states, and cross-page handoffs.
   ========================================================================== */

const SHARB_PAGE_ROUTES = {
  home:    'index.html',
  rooms:   'pages/rooms.html',
  friends: 'pages/friends.html',
  profile: 'pages/profile.html',
  domino:  'pages/domino.html',
  uno:     'pages/uno.html',
  bakasa:  'pages/bakasa.html',
  chess:   'pages/chess.html',
  ttt:     'pages/tic-tac-toe.html',
  'tic-tac-toe': 'pages/tic-tac-toe.html',
  c4:      'pages/connect-four.html',
  'connect-four': 'pages/connect-four.html',
  draw:    'pages/draw-guess.html',
  'draw-guess': 'pages/draw-guess.html'
};

function isInsidePagesDir() {
  const path = window.location.pathname.replace(/\\/g, '/');
  return path.includes('/pages/');
}
window.isInsidePagesDir = isInsidePagesDir;

function getAssetUrl(relAssetPath) {
  const clean = String(relAssetPath || '').replace(/^\/+/, '');
  return isInsidePagesDir() ? ('../' + clean) : clean;
}
window.getAssetUrl = getAssetUrl;

function getPageUrl(targetKey, params) {
  const relTarget = SHARB_PAGE_ROUTES[targetKey] || targetKey || 'index.html';
  let url = '';
  if (isInsidePagesDir()) {
    if (relTarget === 'index.html') url = '../index.html';
    else if (relTarget.startsWith('pages/')) url = relTarget.slice('pages/'.length);
    else url = '../' + relTarget;
  } else {
    url = relTarget;
  }
  if (params && typeof params === 'object') {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    });
    const qStr = qs.toString();
    if (qStr) url += (url.includes('?') ? '&' : '?') + qStr;
  }
  return url;
}
window.getPageUrl = getPageUrl;

function getCurrentPageKey() {
  const bodyKey = document.body && document.body.dataset ? document.body.dataset.page : '';
  if (bodyKey) return bodyKey;
  const path = window.location.pathname.replace(/\\/g, '/').toLowerCase();
  if (path.endsWith('/rooms.html')) return 'rooms';
  if (path.endsWith('/friends.html')) return 'friends';
  if (path.endsWith('/profile.html')) return 'profile';
  if (path.endsWith('/domino.html')) return 'domino';
  if (path.endsWith('/uno.html')) return 'uno';
  if (path.endsWith('/bakasa.html')) return 'bakasa';
  if (path.endsWith('/chess.html')) return 'chess';
  if (path.endsWith('/tic-tac-toe.html')) return 'ttt';
  if (path.endsWith('/connect-four.html')) return 'c4';
  if (path.endsWith('/draw-guess.html')) return 'draw';
  return 'home';
}
window.getCurrentPageKey = getCurrentPageKey;

function navigateToPage(targetKey, params) {
  if (SHARB_GAME_META[targetKey] && typeof recordRecentGame === 'function') {
    recordRecentGame(targetKey);
  }
  window.location.href = getPageUrl(targetKey, params);
}
window.navigateToPage = navigateToPage;

function goHome() {
  window.location.href = getPageUrl('home');
}
window.goHome = goHome;

function acceptGameInvite(roomCode, gameKind, viaMode) {
  const c = String(roomCode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!c) return;
  const g = (gameKind && SHARB_GAME_META[gameKind]) ? gameKind : 'domino';
  const curPage = getCurrentPageKey();

  SharbSession.setRoomIntent({
    game: g,
    action: 'join',
    code: c,
    via: viaMode === 'public' ? 'public' : 'code'
  });

  // If already on the exact game page, execute join directly without reload if handler is available
  if (curPage === g) {
    window._sharbJoinVia = viaMode === 'public' ? 'public' : 'code';
    if (g === 'domino' || g === 'uno') {
      if (typeof joinRoom === 'function') {
        const cdInp = $('#cd');
        if (cdInp) cdInp.value = c;
        SharbSession.consumeRoomIntent(g);
        joinRoom(c);
        return;
      }
    } else if (g === 'bakasa' && typeof bkJoin === 'function') {
      SharbSession.consumeRoomIntent(g);
      bkJoin(c);
      return;
    } else if (g === 'chess' && typeof chJoinOnlineRoom === 'function') {
      SharbSession.consumeRoomIntent(g);
      chJoinOnlineRoom(c);
      return;
    } else if (g === 'ttt' && typeof tttJoinOnlineRoom === 'function') {
      SharbSession.consumeRoomIntent(g);
      tttJoinOnlineRoom(c);
      return;
    } else if (g === 'c4' && typeof c4JoinOnlineRoom === 'function') {
      SharbSession.consumeRoomIntent(g);
      c4JoinOnlineRoom(c);
      return;
    } else if (g === 'draw' && typeof dgJoinRoom === 'function') {
      SharbSession.consumeRoomIntent(g);
      dgJoinRoom(c);
      return;
    }
  }

  navigateToPage(g, { room: c, via: viaMode === 'public' ? 'public' : 'code' });
}
window.acceptGameInvite = acceptGameInvite;

function highlightActiveNavigation() {
  const cur = getCurrentPageKey();
  const aliasMap = {
    ttt: 'tic-tac-toe', 'tic-tac-toe': 'ttt',
    c4: 'connect-four', 'connect-four': 'c4',
    draw: 'draw-guess', 'draw-guess': 'draw'
  };
  $$('[data-nav-page]').forEach(el => {
    const target = el.getAttribute('data-nav-page');
    const isMatch = (target === cur) || (aliasMap[cur] && target === aliasMap[cur]) ||
      (target === 'games' && ['domino','uno','bakasa','chess','ttt','tic-tac-toe','c4','connect-four','draw','draw-guess'].includes(cur));
    el.classList.toggle('active', isMatch);
    el.classList.toggle('on', isMatch);
    if (isMatch) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
}
window.highlightActiveNavigation = highlightActiveNavigation;
