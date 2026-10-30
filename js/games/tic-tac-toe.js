/* =====================================================================
   GAME 1: TIC-TAC-TOE (إكس أو — 3×3)
   Pure Logic Engine + Minimax Alpha-Beta AI + Online Room + UI
   ===================================================================== */
const TTT_WIN_LINES = [
  [0,1,2], [3,4,5], [6,7,8], // Rows
  [0,3,6], [1,4,7], [2,5,8], // Columns
  [0,4,8], [2,4,6]           // Diagonals
];

class TTTEngine {
  constructor(){
    this.reset();
  }
  reset(){
    this.board = Array(9).fill(null);
    this.turn = 'X'; // X always starts first
    this.winner = null; // 'X' | 'O' | 'draw' | null
    this.winLine = null; // [a,b,c] or null
    this.moveCount = 0;
    this.lastMove = null;
  }
  cloneState(){
    return {
      board: this.board.slice(),
      turn: this.turn,
      winner: this.winner,
      winLine: this.winLine ? this.winLine.slice() : null,
      moveCount: this.moveCount,
      lastMove: this.lastMove
    };
  }
  loadState(st){
    if(!st || !Array.isArray(st.board) || st.board.length !== 9) return false;
    this.board = st.board.map(v => (v === 'X' || v === 'O') ? v : null);
    this.turn = st.turn === 'O' ? 'O' : 'X';
    this.winner = st.winner || null;
    this.winLine = Array.isArray(st.winLine) ? st.winLine.slice() : null;
    this.moveCount = Number.isInteger(st.moveCount) ? st.moveCount : this.board.filter(Boolean).length;
    this.lastMove = (st.lastMove !== undefined && st.lastMove !== null) ? st.lastMove : null;
    return true;
  }
  getLegalMoves(){
    if(this.winner) return [];
    const out = [];
    for(let i=0; i<9; i++){
      if(this.board[i] === null) out.push(i);
    }
    return out;
  }
  isValidMove(idx){
    if(this.winner !== null) return false;
    if(!Number.isInteger(idx) || idx < 0 || idx >= 9) return false;
    return this.board[idx] === null;
  }
  static evaluateWinner(board){
    for(const line of TTT_WIN_LINES){
      const [a, b, c] = line;
      if(board[a] && board[a] === board[b] && board[a] === board[c]){
        return {winner: board[a], winLine: line};
      }
    }
    if(board.every(cell => cell !== null)){
      return {winner: 'draw', winLine: null};
    }
    return {winner: null, winLine: null};
  }
  makeMove(idx, expectedRole=null){
    if(!this.isValidMove(idx)) return false;
    if(expectedRole && expectedRole !== this.turn) return false;
    const role = this.turn;
    this.board[idx] = role;
    this.moveCount++;
    this.lastMove = idx;
    const check = TTTEngine.evaluateWinner(this.board);
    if(check.winner){
      this.winner = check.winner;
      this.winLine = check.winLine;
    } else {
      this.turn = (this.turn === 'X') ? 'O' : 'X';
    }
    return true;
  }
  static findImmediateWinningMove(board, role){
    for(let i=0; i<9; i++){
      if(board[i] !== null) continue;
      board[i] = role;
      const res = TTTEngine.evaluateWinner(board);
      board[i] = null;
      if(res.winner === role) return i;
    }
    return -1;
  }
  static chooseAIMove(boardInput, aiRole='O', level='hard'){
    const board = boardInput.slice();
    const legal = [];
    for(let i=0; i<9; i++) if(board[i] === null) legal.push(i);
    if(!legal.length) return -1;
    const humanRole = aiRole === 'X' ? 'O' : 'X';

    if(level === 'easy'){
      // Easy: makes legal moves with intentional mistakes (70% random, 30% win/block)
      if(Math.random() < 0.30){
        const winMv = TTTEngine.findImmediateWinningMove(board, aiRole);
        if(winMv !== -1) return winMv;
        const blkMv = TTTEngine.findImmediateWinningMove(board, humanRole);
        if(blkMv !== -1) return blkMv;
      }
      return legal[Math.floor(Math.random() * legal.length)];
    }

    if(level === 'medium'){
      // Medium: always takes 1-step win or blocks opponent's 1-step win, otherwise mixes center/corners/random
      const winMv = TTTEngine.findImmediateWinningMove(board, aiRole);
      if(winMv !== -1) return winMv;
      const blkMv = TTTEngine.findImmediateWinningMove(board, humanRole);
      if(blkMv !== -1) return blkMv;
      if(board[4] === null && Math.random() < 0.75) return 4;
      const corners = [0,2,6,8].filter(i => board[i] === null);
      if(corners.length && Math.random() < 0.65){
        return corners[Math.floor(Math.random() * corners.length)];
      }
      return legal[Math.floor(Math.random() * legal.length)];
    }

    // Hard: Optimal Minimax with Alpha-Beta Pruning
    function alphabeta(b, depth, alpha, beta, isMax){
      const ev = TTTEngine.evaluateWinner(b);
      if(ev.winner === aiRole) return 10 - depth;
      if(ev.winner === humanRole) return depth - 10;
      if(ev.winner === 'draw') return 0;

      if(isMax){
        let best = -Infinity;
        for(let i=0; i<9; i++){
          if(b[i] !== null) continue;
          b[i] = aiRole;
          const score = alphabeta(b, depth + 1, alpha, beta, false);
          b[i] = null;
          if(score > best) best = score;
          if(score > alpha) alpha = score;
          if(beta <= alpha) break;
        }
        return best;
      } else {
        let best = Infinity;
        for(let i=0; i<9; i++){
          if(b[i] !== null) continue;
          b[i] = humanRole;
          const score = alphabeta(b, depth + 1, alpha, beta, true);
          b[i] = null;
          if(score < best) best = score;
          if(score < beta) beta = score;
          if(beta <= alpha) break;
        }
        return best;
      }
    }

    // Order center & corners first for faster pruning
    const ordered = [4,0,2,6,8,1,3,5,7].filter(i => board[i] === null);
    let bestMove = ordered[0];
    let bestScore = -Infinity;
    for(const mv of ordered){
      board[mv] = aiRole;
      const sc = alphabeta(board, 0, -Infinity, Infinity, false);
      board[mv] = null;
      if(sc > bestScore){
        bestScore = sc;
        bestMove = mv;
      }
    }
    return bestMove;
  }
}
window.TTTEngine = TTTEngine;

const TTT = {
  engine: new TTTEngine(),
  mode: 'ai', // 'ai' | 'local' | 'online'
  aiLevel: 'hard', // 'easy' | 'medium' | 'hard'
  playerRolePref: 'X', // 'X' | 'O'
  myRole: 'X',
  statsRecorded: false,
  aiTimer: null,
  moveLock: false,
  // Online state
  code: '',
  host: false,
  roomStatus: 'idle', // 'idle' | 'waiting' | 'playing' | 'finished' | 'disconnected' | 'expired'
  roomMsg: '',
  players: {X: null, O: null},
  lastSeen: {},
  hbTimer: null,
  subs: []
};
window.TTT = TTT;


/* =====================================================================
   TIC-TAC-TOE CONTROLLER, ONLINE ROOM & RENDERING
   ===================================================================== */
const TTT_X_SVG = `<svg viewBox="0 0 64 64"><path d="M14 14L50 50M50 14L14 50" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/></svg>`;
const TTT_O_SVG = `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="19" fill="none" stroke="#fb7185" stroke-width="8"/></svg>`;

function tttOpen(initialMode){
  if(initialMode) TTT.mode = initialMode;
  ['#home','#dominoPage','#unoPage','#lobbyDomino','#lobbyUno','#lobby','#game','#bakasa','#chess','#c4','#draw'].forEach(s=>{
    const el = $(s); if(el) el.classList.add('hide');
  });
  $('#ttt').classList.remove('hide');
  $('#backHome').classList.remove('hide');
  setSharbHeaderBrand('SHARB GAMES • إكس أو TIC-TAC-TOE','Your Ultimate Online Gaming Hub • 3×3','❌');
  if(TTT.mode === 'ai' && TTT.engine.moveCount === 0 && TTT.engine.turn !== TTT.myRole){
    tttScheduleAIMove();
  }
  tttRender();
  window.scrollTo(0, 0);
}
window.tttOpen = tttOpen;

function tttStartNewMatch(keepOnline=false){
  if(TTT.aiTimer){ clearTimeout(TTT.aiTimer); TTT.aiTimer = null; }
  TTT.engine.reset();
  TTT.statsRecorded = false;
  TTT.moveLock = false;
  if(TTT.mode === 'ai'){
    TTT.myRole = TTT.playerRolePref === 'O' ? 'O' : 'X';
  } else if(TTT.mode === 'local'){
    TTT.myRole = 'X';
  } else if(TTT.mode === 'online' && keepOnline){
    TTT.roomStatus = (TTT.players.X && TTT.players.O) ? 'playing' : 'waiting';
  }
  tttRender();
  if(TTT.mode === 'ai' && TTT.engine.turn !== TTT.myRole){
    tttScheduleAIMove();
  }
}

function tttScheduleAIMove(){
  if(TTT.aiTimer) clearTimeout(TTT.aiTimer);
  if(TTT.mode !== 'ai' || TTT.engine.winner || TTT.engine.turn === TTT.myRole) return;
  const aiRole = TTT.myRole === 'X' ? 'O' : 'X';
  TTT.aiTimer = setTimeout(()=>{
    TTT.aiTimer = null;
    if(TTT.mode !== 'ai' || TTT.engine.winner || TTT.engine.turn !== aiRole) return;
    const mv = TTTEngine.chooseAIMove(TTT.engine.board, aiRole, TTT.aiLevel);
    if(mv !== -1){
      tttExecuteLocalOrAIMove(mv);
    }
  }, 240);
}

function tttCheckAndRecordStats(){
  const w = TTT.engine.winner;
  if(!w || TTT.statsRecorded) return;
  TTT.statsRecorded = true;
  if(TTT.mode === 'local'){
    recordArcadeMatchResult('ttt', 'local', w === 'draw' ? 'draw' : 'win', 'لاعب محلي');
    if(w !== 'draw'){ beep(660,.14,'triangle',.12); confetti(22); }
    return;
  }
  const oppName = TTT.mode === 'ai'
    ? `الكمبيوتر (${TTT.aiLevel==='easy'?'سهل':(TTT.aiLevel==='hard'?'صعب':'متوسط')})`
    : ((TTT.players[TTT.myRole === 'X' ? 'O' : 'X'] || {}).name || 'صديق أونلاين');
  if(w === 'draw'){
    recordArcadeMatchResult('ttt', TTT.mode, 'draw', oppName);
    beep(420,.1,'sine',.08);
  } else if(w === TTT.myRole){
    recordArcadeMatchResult('ttt', TTT.mode, 'win', oppName);
    beep(660,.14,'triangle',.12); confetti(26);
  } else {
    recordArcadeMatchResult('ttt', TTT.mode, 'loss', oppName);
    beep(220,.15,'sawtooth',.1);
  }
}

function tttExecuteLocalOrAIMove(idx){
  if(!TTT.engine.isValidMove(idx)) return false;
  const ok = TTT.engine.makeMove(idx);
  if(!ok) return false;
  beep(TTT.engine.turn === 'O' ? 520 : 440, .06, 'sine', .07);
  if(TTT.engine.winner){
    tttCheckAndRecordStats();
  }
  tttRender();
  if(!TTT.engine.winner && TTT.mode === 'ai' && TTT.engine.turn !== TTT.myRole){
    tttScheduleAIMove();
  }
  return true;
}

function tttOnCellClick(idx){
  if(TTT.engine.winner !== null) return;
  if(!TTT.engine.isValidMove(idx)){
    toast('هذه الخانة مشغولة بالفعل — اختر خانة فارغة!', 'warn', 1800);
    return;
  }
  if(TTT.mode === 'local'){
    tttExecuteLocalOrAIMove(idx);
    return;
  }
  if(TTT.mode === 'ai'){
    if(TTT.engine.turn !== TTT.myRole) return;
    tttExecuteLocalOrAIMove(idx);
    return;
  }
  if(TTT.mode === 'online'){
    if(TTT.roomStatus !== 'playing' || !TTT.players.X || !TTT.players.O){
      toast('بانتظار اكتمال دخول اللاعب الثاني لبدء المباراة', 'warn');
      return;
    }
    if(TTT.engine.turn !== TTT.myRole){
      toast('ليس دورك الآن — انتظر حركة خصمك', 'warn', 1800);
      return;
    }
    if(TTT.moveLock) return; // Prevent rapid double-click duplicate requests
    TTT.moveLock = true;
    setTimeout(()=>{ TTT.moveLock = false; }, 350);

    if(TTT.host){
      tttHostProcessMoveRequest({
        senderPid: ME,
        role: TTT.myRole,
        idx,
        seq: TTT.engine.moveCount
      });
    } else {
      arcPub('ttt', TTT.code, 'req_move', {
        senderPid: ME,
        role: TTT.myRole,
        idx,
        seq: TTT.engine.moveCount
      });
    }
  }
}

/* ---------- Tic-Tac-Toe Online Room (Host-Validated) ---------- */
async function tttCreateOnlineRoom(){
  tttLeaveRoom(false);
  TTT.mode = 'online';
  TTT.host = true;
  TTT.code = genCode();
  TTT.myRole = TTT.playerRolePref === 'O' ? 'O' : 'X';
  TTT.players = {
    X: TTT.myRole === 'X' ? me0() : null,
    O: TTT.myRole === 'O' ? me0() : null
  };
  TTT.engine.reset();
  TTT.statsRecorded = false;
  TTT.roomStatus = 'waiting';
  TTT.roomMsg = 'في انتظار انضمام لاعب ثانٍ عبر الكود…';
  TTT.lastSeen = {};

  ensureMQTT().then(()=>{
    for(const s of TTT.subs){
      NET.topics.set(s.topic, s.fn);
      if(NET.client && NET.ready){ try{ NET.client.subscribe(s.topic, {qos:0}); }catch(e){} }
    }
  }).catch(()=>{});

  arcSub(TTT, 'ttt', TTT.code, 'join', pkt => {
    if(!TTT.host || !pkt || !pkt.player) return;
    const g = pkt.player;
    if(g.pid === ME) return;
    if(pkt.via === 'public' && typeof getRoomVisibility === 'function' && getRoomVisibility('ttt') === 'private'){
      arcPub('ttt', TTT.code, 'reject', {targetPid: g.pid, reason: 'هذه الغرفة خاصة ولا يمكن الانضمام إليها من القائمة العامة'});
      return;
    }
    TTT.lastSeen[g.pid] = Date.now();

    // Check if returning player or new guest
    const openRole = TTT.myRole === 'X' ? 'O' : 'X';
    const curGuest = TTT.players[openRole];
    if(curGuest && curGuest.pid !== g.pid && curGuest.uid !== g.uid){
      // Room is already full with 2 players! Reject 3rd player
      arcPub('ttt', TTT.code, 'reject', {targetPid: g.pid, reason: 'الغرفة مكتملة العدد (٢ لاعبين فقط)'});
      if(typeof pubDirSyncHostRoom === 'function') pubDirSyncHostRoom(true);
      return;
    }
    if(typeof pubDirClearReservation === 'function') pubDirClearReservation(g.pid);
    TTT.players[openRole] = g;
    TTT.roomStatus = TTT.engine.winner ? 'finished' : 'playing';
    TTT.roomMsg = `انضم ${g.name} — المباراة جارية الآن!`;
    toast(`🎉 انضم ${g.name} إلى غرفة إكس أو!`, 'ok');
    tttBroadcastHostState();
    tttRender();
  });

  arcSub(TTT, 'ttt', TTT.code, 'req_move', pkt => {
    if(!TTT.host || !pkt) return;
    tttHostProcessMoveRequest(pkt);
  });

  arcSub(TTT, 'ttt', TTT.code, 'action', pkt => {
    if(!TTT.host || !pkt) return;
    if(pkt.type === 'restart'){
      TTT.engine.reset();
      TTT.statsRecorded = false;
      TTT.roomStatus = (TTT.players.X && TTT.players.O) ? 'playing' : 'waiting';
      TTT.roomMsg = 'بدأت مباراة جديدة!';
      tttBroadcastHostState();
      tttRender();
    } else if(pkt.type === 'bye'){
      const openRole = TTT.myRole === 'X' ? 'O' : 'X';
      if(TTT.players[openRole] && TTT.players[openRole].pid === pkt.senderPid){
        TTT.players[openRole] = null;
        TTT.roomStatus = 'disconnected';
        TTT.roomMsg = 'غادر اللاعب الآخر الغرفة — في انتظار لاعب جديد';
        tttBroadcastHostState();
        tttRender();
      }
    } else if(pkt.type === 'hb' && pkt.senderPid){
      TTT.lastSeen[pkt.senderPid] = Date.now();
    }
  });

  TTT.hbTimer = setInterval(()=>{
    if(!TTT.code || !TTT.host) return;
    arcPub('ttt', TTT.code, 'hb', {senderPid: ME, host: true, ts: Date.now()});
  }, 4500);

  tttBroadcastHostState();
  tttRender();
  toast(`تم إنشاء غرفة إكس أو بكود ${TTT.code}`, 'ok');
}

function tttHostProcessMoveRequest(pkt){
  if(!TTT.host || TTT.roomStatus !== 'playing') return false;
  if(!TTT.players.X || !TTT.players.O) return false;
  const expectedTurn = TTT.engine.turn;
  const expectedPlayer = TTT.players[expectedTurn];
  // Strict anti-spoofing: verify senderPid owns the active turn role & seq matches moveCount
  if(!expectedPlayer || pkt.senderPid !== expectedPlayer.pid || pkt.role !== expectedTurn){
    return false;
  }
  if(Number(pkt.seq) !== TTT.engine.moveCount) return false;
  const idx = Number(pkt.idx);
  if(!TTT.engine.isValidMove(idx)) return false;

  TTT.engine.makeMove(idx, expectedTurn);
  TTT.moveLock = false;
  beep(500, .06, 'sine', .07);
  if(TTT.engine.winner){
    TTT.roomStatus = 'finished';
    TTT.roomMsg = TTT.engine.winner === 'draw' ? 'انتهت المباراة بالتعادل!' : `فاز اللاعب ${TTT.engine.winner}!`;
    tttCheckAndRecordStats();
  }
  tttBroadcastHostState();
  tttRender();
  return true;
}

function tttBroadcastHostState(){
  if(!TTT.host || !TTT.code) return;
  arcPub('ttt', TTT.code, 'state', {
    code: TTT.code,
    players: TTT.players,
    roomStatus: TTT.roomStatus,
    roomMsg: TTT.roomMsg,
    game: TTT.engine.cloneState(),
    ts: Date.now()
  }, true);
  if(typeof pubDirSyncHostRoom === 'function') pubDirSyncHostRoom(true);
}

async function tttJoinOnlineRoom(rawCode){
  const c = String(rawCode||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(c.length < 4){ toast('اكتب كود الغرفة الصحيح (٤-٦ حروف/أرقام)', 'warn'); return; }
  tttLeaveRoom(false);
  TTT.mode = 'online';
  TTT.host = false;
  TTT.code = c;
  TTT.players = {X: null, O: null};
  TTT.engine.reset();
  TTT.statsRecorded = false;
  TTT.roomStatus = 'waiting';
  TTT.roomMsg = `جاري الاتصال بالغرفة ${c}…`;

  ensureMQTT().then(()=>{
    for(const s of TTT.subs){
      NET.topics.set(s.topic, s.fn);
      if(NET.client && NET.ready){ try{ NET.client.subscribe(s.topic, {qos:0}); }catch(e){} }
    }
    arcPub('ttt', TTT.code, 'join', {player: me0(), ts: Date.now()});
  }).catch(()=>{});

  arcSub(TTT, 'ttt', TTT.code, 'reject', pkt => {
    if(pkt && pkt.targetPid === ME){
      toast(pkt.reason || 'الغرفة ممتلئة', 'warn');
      tttLeaveRoom(true);
    }
  });

  arcSub(TTT, 'ttt', TTT.code, 'state', pkt => {
    if(!pkt || pkt.code !== TTT.code) return;
    if(pkt.closed){
      TTT.roomStatus = 'expired';
      TTT.roomMsg = 'انتهت صلاحية الغرفة لأن المضيف أغلقها';
      toast('أغلق المضيف غرفة إكس أو', 'warn');
      tttRender();
      return;
    }
    TTT.players = pkt.players || {X: null, O: null};
    if(TTT.players.X && (TTT.players.X.pid === ME || TTT.players.X.uid === PF.uid)) TTT.myRole = 'X';
    else if(TTT.players.O && (TTT.players.O.pid === ME || TTT.players.O.uid === PF.uid)) TTT.myRole = 'O';

    const prevMoveCount = TTT.engine.moveCount;
    TTT.engine.loadState(pkt.game);
    if(TTT.engine.moveCount === 0) TTT.statsRecorded = false;
    TTT.roomStatus = pkt.roomStatus || 'playing';
    TTT.roomMsg = pkt.roomMsg || '';
    TTT.moveLock = false;
    if(TTT.engine.moveCount > prevMoveCount) beep(500, .06, 'sine', .07);
    if(TTT.engine.winner){
      tttCheckAndRecordStats();
    }
    tttRender();
  });

  TTT.hbTimer = setInterval(()=>{
    if(!TTT.code || TTT.host) return;
    arcPub('ttt', TTT.code, 'action', {type: 'hb', senderPid: ME, ts: Date.now()});
  }, 4500);

  arcPub('ttt', TTT.code, 'join', {player: me0(), via: window._sharbJoinVia || 'code', ts: Date.now()});
  tttRender();
}

function tttLeaveRoom(rerender=true){
  if(TTT.aiTimer){ clearTimeout(TTT.aiTimer); TTT.aiTimer = null; }
  if(TTT.hbTimer){ clearInterval(TTT.hbTimer); TTT.hbTimer = null; }
  TTT.moveLock = false;
  if(TTT.code){
    if(TTT.host){
      if(typeof pubDirNotifyRoomClosed === 'function') pubDirNotifyRoomClosed('ttt', TTT.code);
      arcPub('ttt', TTT.code, 'state', {code: TTT.code, closed: true, ts: Date.now()}, true);
    } else {
      arcPub('ttt', TTT.code, 'action', {type: 'bye', senderPid: ME, ts: Date.now()});
    }
  }
  arcClearSubs(TTT);
  TTT.code = '';
  TTT.host = false;
  TTT.roomStatus = 'idle';
  TTT.roomMsg = '';
  TTT.players = {X: null, O: null};
  if(rerender) tttRender();
}
window.tttLeaveRoom = tttLeaveRoom;

function tttRender(){
  const root = $('#tttRoot');
  if(!root) return;
  const eng = TTT.engine;
  const winSet = new Set(eng.winLine || []);
  const st = getArcadeStats().ttt;

  const getPlayerInfo = role => {
    if(TTT.mode === 'local'){
      return role === 'X'
        ? {name: 'اللاعب الأول (X)', sub: 'يلعب بعلامة X'}
        : {name: 'اللاعب الثاني (O)', sub: 'يلعب بعلامة O'};
    }
    if(TTT.mode === 'ai'){
      if(role === TTT.myRole) return {name: PF.name || 'أنت', sub: `علامتك (${role})`};
      const lvlAr = TTT.aiLevel === 'easy' ? 'سهل 🌱' : (TTT.aiLevel === 'hard' ? 'صعب مثالي 🔥' : 'متوسط ⚡');
      return {name: `الكمبيوتر (${lvlAr})`, sub: `علامة (${role})`};
    }
    const p = TTT.players[role];
    if(p) return {name: p.name, sub: p.pid === ME ? `أنت (${role})` : `خصمك (${role})`};
    return {name: 'بانتظار لاعب…', sub: `الدور (${role})`};
  };

  const pX = getPlayerInfo('X');
  const pO = getPlayerInfo('O');
  const isTurnX = !eng.winner && eng.turn === 'X';
  const isTurnO = !eng.winner && eng.turn === 'O';

  let statusTitle = '';
  let statusSub = '';
  if(eng.winner === 'X' || eng.winner === 'O'){
    const wInfo = getPlayerInfo(eng.winner);
    statusTitle = `🏆 فاز ${wInfo.name} (${eng.winner})!`;
    statusSub = 'تحققت ٣ علامات متتالية — يمكنك إعادة المباراة الآن';
  } else if(eng.winner === 'draw'){
    statusTitle = '🤝 انتهت المباراة بالتعادل!';
    statusSub = 'امتلأت الرقعة بالكامل دون فائز';
  } else if(TTT.mode === 'online' && TTT.roomStatus !== 'playing'){
    statusTitle = TTT.roomStatus === 'waiting' ? '⏳ في انتظار انضمام لاعب ثانٍ…' : (TTT.roomStatus === 'disconnected' ? '⚠️ غادر الخصم الغرفة' : '🌐 غرفة إكس أو الأونلاين');
    statusSub = TTT.roomMsg || 'شارك كود الغرفة مع صديقك لبدء اللعب';
  } else {
    const curInfo = getPlayerInfo(eng.turn);
    statusTitle = `🎯 الدور الحالي: ${curInfo.name} (${eng.turn})`;
    statusSub = (TTT.mode === 'ai' && eng.turn !== TTT.myRole)
      ? 'الكمبيوتر يفكر في النقلة…'
      : 'اضغط على أي خانة فارغة لوضع علامتك';
  }

  let cellsHTML = '';
  for(let i = 0; i < 9; i++){
    const val = eng.board[i];
    const isWin = winSet.has(i);
    const isLast = eng.lastMove === i;
    const locked = eng.winner !== null || (TTT.mode === 'online' && TTT.roomStatus !== 'playing');
    const cls = [
      'ttt-cell',
      val ? 'occupied' : '',
      locked ? 'locked' : '',
      isWin ? 'win-cell' : '',
      isLast ? 'last-move' : ''
    ].filter(Boolean).join(' ');
    const markHTML = val === 'X'
      ? `<div class="ttt-mark" data-mark="X">${TTT_X_SVG}</div>`
      : (val === 'O' ? `<div class="ttt-mark" data-mark="O">${TTT_O_SVG}</div>` : '');
    cellsHTML += `<div class="${cls}" data-tttcell="${i}">${markHTML}</div>`;
  }

  const roomStateLabel = {
    idle: 'غير متصل بغرفة',
    waiting: '⏳ انتظار لاعب',
    playing: '🔥 المباراة جارية',
    finished: '🏁 انتهت المباراة',
    disconnected: '⚠️ انقطع اتصال الخصم',
    expired: '⛔ انتهت صلاحية الغرفة'
  }[TTT.roomStatus] || 'غير متصل';

  root.innerHTML = `<div class="arc-wrap">
    <section class="hero glass" style="padding:18px 20px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div>
          <h2 style="margin:0;font-size:21px">❌⭕ إكس أو — SHARB GAMES Tic-Tac-Toe</h2>
          <p class="mut" style="margin:4px 0 0;font-size:13px">كوّن ٣ علامات متتالية أفقيًا أو رأسيًا أو قطريًا — مع ذكاء اصطناعي Minimax أو غرف أونلاين فورية</p>
        </div>
        <div class="ch-ModeTabs">
          <button class="ch-tab ${TTT.mode==='ai'?'on':''}" data-tttmode="ai">🤖 ضد الكمبيوتر</button>
          <button class="ch-tab ${TTT.mode==='local'?'on':''}" data-tttmode="local">👥 لاعب ضد لاعب (نفس الجهاز)</button>
          <button class="ch-tab ${TTT.mode==='online'?'on':''}" data-tttmode="online">🌐 أونلاين مع صديق</button>
        </div>
      </div>
    </section>

    <div class="arc-layout">
      <div class="arc-board-col">
        <div class="arc-players-bar">
          <div class="arc-pcard ${isTurnX?'active-turn':''} ${eng.winner==='X'?'winner-card':''}">
            <div style="display:flex;align-items:center;gap:10px;min-width:0">
              <div class="arc-sym-badge x">X</div>
              <div style="min-width:0">
                <div style="font-weight:900;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(pX.name)}</div>
                <div class="mut tiny">${esc(pX.sub)}</div>
              </div>
            </div>
            ${isTurnX ? `<span class="bk-chip ok" style="font-size:11px">دوره</span>` : ''}
          </div>
          <div class="arc-pcard ${isTurnO?'active-turn':''} ${eng.winner==='O'?'winner-card':''}">
            <div style="display:flex;align-items:center;gap:10px;min-width:0">
              <div class="arc-sym-badge o">O</div>
              <div style="min-width:0">
                <div style="font-weight:900;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(pO.name)}</div>
                <div class="mut tiny">${esc(pO.sub)}</div>
              </div>
            </div>
            ${isTurnO ? `<span class="bk-chip ok" style="font-size:11px">دوره</span>` : ''}
          </div>
        </div>

        <div class="ttt-frame">
          <div class="ttt-grid" id="tttBoard">${cellsHTML}</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px">
        <section class="panel glass">
          <div class="ch-status-banner ${eng.winner?'over':''}" id="tttStatusBanner">
            <div>
              <div style="font-weight:900;font-size:16px" id="tttStatusTitle">${esc(statusTitle)}</div>
              <div class="mut" style="font-size:12px;margin-top:3px" id="tttStatusSub">${esc(statusSub)}</div>
            </div>
            <span class="bk-chip ac">النقلة ${eng.moveCount}/9</span>
          </div>

          <div class="row" style="margin-top:12px;flex-wrap:wrap">
            <button class="btn ok" data-tttact="restart" id="tttRestartBtn">🔄 إعادة المباراة</button>
            <button class="btn g" data-tttact="backHome" id="tttBackBtn">🏠 العودة إلى قائمة الألعاب</button>
          </div>
        </section>

        ${TTT.mode === 'ai' ? `
          <section class="panel glass">
            <h2>🤖 إعدادات الذكاء الاصطناعي</h2>
            <div style="margin-bottom:10px">
              <label class="lbl">مستوى صعوبة الكمبيوتر:</label>
              <div class="quick-g-pills">
                <div class="quick-g-pill ${TTT.aiLevel==='easy'?'on':''}" data-tttlvl="easy">🌱 سهل</div>
                <div class="quick-g-pill ${TTT.aiLevel==='medium'?'on':''}" data-tttlvl="medium">⚡ متوسط</div>
                <div class="quick-g-pill ${TTT.aiLevel==='hard'?'on':''}" data-tttlvl="hard">🔥 صعب (مثالي Minimax)</div>
              </div>
            </div>
            <div>
              <label class="lbl">اختر رمزك:</label>
              <div class="quick-g-pills" style="grid-template-columns:1fr 1fr">
                <div class="quick-g-pill ${TTT.playerRolePref==='X'?'on':''}" data-tttrole="X">❌ ألعب بـ X (أبدأ أولًا)</div>
                <div class="quick-g-pill ${TTT.playerRolePref==='O'?'on':''}" data-tttrole="O">⭕ ألعب بـ O (ثانيًا)</div>
              </div>
            </div>
          </section>
        ` : ''}

        ${TTT.mode === 'online' ? `
          <section class="panel glass">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px">
              <h2 style="margin:0">🌐 غرفة إكس أو الأونلاين</h2>
              <span class="bk-chip ${TTT.roomStatus==='playing'?'ok':(TTT.roomStatus==='waiting'?'warn':'ac')}" id="tttRoomStateBadge">${roomStateLabel}</span>
            </div>
            ${!TTT.code ? `
              <div style="margin-bottom:10px">
                <label class="lbl">رمزك عند إنشاء الغرفة:</label>
                <div class="quick-g-pills" style="grid-template-columns:1fr 1fr">
                  <div class="quick-g-pill ${TTT.playerRolePref==='X'?'on':''}" data-tttrole="X">❌ رمز X (يبدأ)</div>
                  <div class="quick-g-pill ${TTT.playerRolePref==='O'?'on':''}" data-tttrole="O">⭕ رمز O (ثانيًا)</div>
                </div>
              </div>
              ${typeof buildGameVisControlHTML==='function' ? buildGameVisControlHTML('ttt', false, false) : ''}
              <div class="row" style="margin-bottom:10px">
                <button class="btn ok big" data-tttact="createOnline" id="tttCreateRoomBtn" style="width:100%">➕ إنشاء غرفة إكس أو الآن</button>
              </div>
              <div class="row">
                <input id="tttJoinCodeInp" placeholder="اكتب كود الغرفة" maxlength="6" style="text-transform:uppercase;direction:ltr;text-align:center;letter-spacing:3px;font-weight:800">
                <button class="btn" data-tttact="joinOnline" id="tttJoinRoomBtn">🚀 انضمام</button>
              </div>
            ` : `
              <div class="mycode" style="margin-bottom:10px">
                <span>كود الغرفة: <b id="tttRoomCodeDisp">${esc(TTT.code)}</b></span>
                <div style="display:flex;gap:6px">
                  <button class="mini" data-tttact="copyRoom">📋 نسخ الكود</button>
                  <button class="mini del" data-tttact="leaveOnline">🚪 مغادرة الغرفة</button>
                </div>
              </div>
              ${typeof buildGameVisControlHTML==='function' ? buildGameVisControlHTML('ttt', true, TTT.host) : ''}
              <div class="mut tiny" style="margin-bottom:8px">${esc(TTT.roomMsg || 'شارك الكود مع صديقك أو ادعه مباشرة:')}</div>
              <div class="plist" style="max-height:140px">
                ${friends().length ? friends().map((f,i)=>`
                  <div class="pitem">
                    <span class="pc">
                      <span class="av sm" style="--c:${esc(f.col||'#0a84ff')}">${esc(f.av||'🙂')}</span>
                      <span><b>${esc(f.name)}</b></span>
                    </span>
                    <button class="mini ok" data-tttinvf="${i}">📨 دعوة</button>
                  </div>
                `).join('') : `<div class="empty">انسخ كود الغرفة وشاركه مع صديقك للانضمام الفوري!</div>`}
              </div>
            `}
          </section>
        ` : ''}

        <section class="panel glass">
          <h2 style="margin:0 0 8px">📊 إحصائياتك في إكس أو</h2>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <span class="bk-chip ac">المباريات: <b>${st.g}</b></span>
            <span class="bk-chip ok">فوز: <b>${st.w}</b></span>
            <span class="bk-chip warn">تعادل: <b>${st.d}</b></span>
            <span class="bk-chip">خسارة: <b>${st.l}</b></span>
          </div>
        </section>
      </div>
    </div>
  </div>`;
}

$('#ttt').addEventListener('click', e => {
  const cell = e.target.closest('[data-tttcell]');
  if(cell){
    tttOnCellClick( parseInt(cell.dataset.tttcell, 10) );
    return;
  }
  const modeBtn = e.target.closest('[data-tttmode]');
  if(modeBtn){
    const m = modeBtn.dataset.tttmode;
    if(TTT.mode !== m){
      if(TTT.mode === 'online' && TTT.code) tttLeaveRoom(false);
      TTT.mode = m;
      tttStartNewMatch(false);
    }
    return;
  }
  const lvlBtn = e.target.closest('[data-tttlvl]');
  if(lvlBtn){
    TTT.aiLevel = lvlBtn.dataset.tttlvl;
    tttStartNewMatch(false);
    return;
  }
  const roleBtn = e.target.closest('[data-tttrole]');
  if(roleBtn){
    TTT.playerRolePref = roleBtn.dataset.tttrole;
    if(TTT.mode === 'ai') tttStartNewMatch(false);
    else tttRender();
    return;
  }
  const invBtn = e.target.closest('[data-tttinvf]');
  if(invBtn){
    const f = friends()[+invBtn.dataset.tttinvf];
    if(f && TTT.code) dispatchInviteToFriend(f, TTT.code, 'ttt');
    return;
  }
  const actBtn = e.target.closest('[data-tttact]');
  if(!actBtn) return;
  const act = actBtn.dataset.tttact;
  if(act === 'restart'){
    if(TTT.mode === 'online' && TTT.code){
      if(TTT.host){
        TTT.engine.reset();
        TTT.statsRecorded = false;
        TTT.roomStatus = (TTT.players.X && TTT.players.O) ? 'playing' : 'waiting';
        TTT.roomMsg = 'تمت إعادة المباراة!';
        tttBroadcastHostState();
        tttRender();
      } else {
        arcPub('ttt', TTT.code, 'action', {type: 'restart', senderPid: ME});
      }
    } else {
      tttStartNewMatch(false);
    }
    toast('🔄 تمت إعادة المباراة من البداية', 'ok');
  } else if(act === 'backHome'){
    goHome();
  } else if(act === 'createOnline'){
    tttCreateOnlineRoom();
  } else if(act === 'joinOnline'){
    const inp = $('#tttJoinCodeInp');
    if(inp) tttJoinOnlineRoom(inp.value);
  } else if(act === 'copyRoom'){
    if(TTT.code) copyText(TTT.code);
  } else if(act === 'leaveOnline'){
    tttLeaveRoom(true);
  }
});



/* ================= MULTI-PAGE INITIALIZATION & SESSION PERSISTENCE FOR TIC-TAC-TOE ================= */
function tttSaveSession() {
  SharbSession.saveGameSession('ttt', {
    mode: TTT.mode,
    aiLevel: TTT.aiLevel,
    playerRolePref: TTT.playerRolePref,
    myRole: TTT.myRole,
    game: TTT.engine.cloneState(),
    code: TTT.code,
    host: TTT.host,
    roomStatus: TTT.roomStatus
  });
}

const _origTttRender = tttRender;
tttRender = function() {
  _origTttRender();
  tttSaveSession();
};

function tttRestoreSession() {
  const saved = SharbSession.loadGameSession('ttt');
  if (!saved) return false;
  TTT.mode = saved.mode || 'ai';
  TTT.aiLevel = saved.aiLevel || 'hard';
  TTT.playerRolePref = saved.playerRolePref || 'X';
  TTT.myRole = saved.myRole || 'X';
  if (saved.game) TTT.engine.loadState(saved.game);
  if (saved.mode === 'online' && saved.code) {
    if (saved.host) tttCreateOnlineRoom();
    else tttJoinOnlineRoom(saved.code);
    return true;
  }
  return true;
}

function initTTTPage() {
  const qs = new URLSearchParams(window.location.search);
  const qRoom = (qs.get('room') || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const qAction = qs.get('action') || '';
  const qVis = qs.get('vis') || '';
  const intent = SharbSession.consumeRoomIntent('ttt');

  if (qVis === 'private' || qVis === 'public') setRoomVisibility('ttt', qVis, true);
  if (intent && intent.visibility) setRoomVisibility('ttt', intent.visibility, true);
  if (intent && intent.roomName) SHARB_ROOM_CFG.roomNames.ttt = intent.roomName;

  if (qAction === 'create' || qAction === 'arena' || (intent && intent.action === 'create')) {
    tttCreateOnlineRoom();
    return;
  }
  if (qRoom || (intent && intent.action === 'join' && intent.code)) {
    const targetCode = qRoom || intent.code;
    window._sharbJoinVia = (qs.get('via') === 'public' || (intent && intent.via === 'public')) ? 'public' : 'code';
    tttJoinOnlineRoom(targetCode);
    return;
  }

  tttRestoreSession();
  tttRender();
  if (TTT.mode === 'ai' && !TTT.engine.winner && TTT.engine.turn !== TTT.myRole) {
    tttScheduleAIMove();
  }
}

document.addEventListener('DOMContentLoaded', initTTTPage);
window.addEventListener('beforeunload', tttSaveSession);
