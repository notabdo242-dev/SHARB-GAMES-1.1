/* =====================================================================
   GAME 2: CONNECT FOUR (كونكت فور — 7×6)
   Pure Logic Engine + Minimax Alpha-Beta AI + Online Room + UI
   ===================================================================== */
class C4Engine {
  constructor(){
    this.ROWS = 6;
    this.COLS = 7;
    this.reset();
  }
  reset(){
    this.board = Array.from({length: 6}, () => Array(7).fill(0));
    this.turn = 1; // 1 = Red (starts), 2 = Gold
    this.winner = null; // 1 | 2 | 'draw' | null
    this.winCells = null; // [[r,c], ...]
    this.moveCount = 0;
    this.lastMove = null; // {r, c, player}
  }
  cloneState(){
    return {
      board: this.board.map(row => row.slice()),
      turn: this.turn,
      winner: this.winner,
      winCells: this.winCells ? this.winCells.map(rc => rc.slice()) : null,
      moveCount: this.moveCount,
      lastMove: this.lastMove ? {...this.lastMove} : null
    };
  }
  loadState(st){
    if(!st || !Array.isArray(st.board) || st.board.length !== 6) return false;
    this.board = st.board.map(row => row.map(v => (v === 1 || v === 2) ? v : 0));
    this.turn = st.turn === 2 ? 2 : 1;
    this.winner = st.winner || null;
    this.winCells = Array.isArray(st.winCells) ? st.winCells : null;
    this.moveCount = Number.isInteger(st.moveCount) ? st.moveCount : 0;
    this.lastMove = st.lastMove || null;
    return true;
  }
  getLowestEmptyRow(c){
    if(!Number.isInteger(c) || c < 0 || c >= 7) return -1;
    for(let r = 5; r >= 0; r--){
      if(this.board[r][c] === 0) return r;
    }
    return -1;
  }
  isValidMove(c){
    if(this.winner !== null) return false;
    return this.getLowestEmptyRow(c) !== -1;
  }
  getLegalColumns(){
    if(this.winner !== null) return [];
    const cols = [];
    for(let c = 0; c < 7; c++){
      if(this.board[0][c] === 0) cols.push(c);
    }
    return cols;
  }
  static checkWinAt(board, r, c, player){
    const dirs = [
      [0, 1],  // Horizontal
      [1, 0],  // Vertical
      [1, 1],  // Diagonal \
      [1, -1]  // Diagonal /
    ];
    for(const [dr, dc] of dirs){
      const cells = [[r, c]];
      // Forward
      let nr = r + dr, nc = c + dc;
      while(nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && board[nr][nc] === player){
        cells.push([nr, nc]);
        nr += dr; nc += dc;
      }
      // Backward
      nr = r - dr; nc = c - dc;
      while(nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && board[nr][nc] === player){
        cells.unshift([nr, nc]);
        nr -= dr; nc -= dc;
      }
      if(cells.length >= 4){
        return cells;
      }
    }
    return null;
  }
  dropDisc(c, expectedPlayer=null){
    if(!this.isValidMove(c)) return null;
    if(expectedPlayer && expectedPlayer !== this.turn) return null;
    const r = this.getLowestEmptyRow(c);
    if(r === -1) return null;
    const player = this.turn;
    this.board[r][c] = player;
    this.moveCount++;
    this.lastMove = {r, c, player};

    const winLine = C4Engine.checkWinAt(this.board, r, c, player);
    if(winLine){
      this.winner = player;
      this.winCells = winLine;
    } else if(this.moveCount >= 42 || this.board[0].every(cell => cell !== 0)){
      this.winner = 'draw';
      this.winCells = null;
    } else {
      this.turn = (this.turn === 1) ? 2 : 1;
    }
    return {r, c, player, winner: this.winner, winCells: this.winCells};
  }

  static findImmediateWinningCol(board, player){
    for(let c = 0; c < 7; c++){
      let r = -1;
      for(let rr = 5; rr >= 0; rr--){
        if(board[rr][c] === 0){ r = rr; break; }
      }
      if(r === -1) continue;
      board[r][c] = player;
      const win = C4Engine.checkWinAt(board, r, c, player);
      board[r][c] = 0;
      if(win) return c;
    }
    return -1;
  }

  static evaluatePosition(board, aiPlayer){
    const opp = aiPlayer === 1 ? 2 : 1;
    let score = 0;
    // Prefer center column control
    for(let r = 0; r < 6; r++){
      if(board[r][3] === aiPlayer) score += 4;
      else if(board[r][3] === opp) score -= 4;
    }
    const scoreWindow = (w) => {
      let aiCnt = 0, oppCnt = 0, empCnt = 0;
      for(const v of w){
        if(v === aiPlayer) aiCnt++;
        else if(v === opp) oppCnt++;
        else empCnt++;
      }
      if(aiCnt === 4) return 10000;
      if(oppCnt === 4) return -10000;
      let s = 0;
      if(aiCnt === 3 && empCnt === 1) s += 18;
      else if(aiCnt === 2 && empCnt === 2) s += 4;
      if(oppCnt === 3 && empCnt === 1) s -= 22;
      else if(oppCnt === 2 && empCnt === 2) s -= 4;
      return s;
    };
    // Horizontal windows
    for(let r = 0; r < 6; r++){
      for(let c = 0; c < 4; c++){
        score += scoreWindow([board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]]);
      }
    }
    // Vertical windows
    for(let c = 0; c < 7; c++){
      for(let r = 0; r < 3; r++){
        score += scoreWindow([board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]]);
      }
    }
    // Diagonal \
    for(let r = 0; r < 3; r++){
      for(let c = 0; c < 4; c++){
        score += scoreWindow([board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]]);
      }
    }
    // Diagonal /
    for(let r = 3; r < 6; r++){
      for(let c = 0; c < 4; c++){
        score += scoreWindow([board[r][c], board[r-1][c+1], board[r-2][c+2], board[r-3][c+3]]);
      }
    }
    return score;
  }

  static chooseAIMove(engine, aiPlayer=2, level='hard'){
    const board = engine.board.map(row => row.slice());
    const legal = engine.getLegalColumns();
    if(!legal.length) return -1;
    const opp = aiPlayer === 1 ? 2 : 1;

    if(level === 'easy'){
      // Easy: legal moves with intentional mistakes (70% random, 30% win/block)
      if(Math.random() < 0.30){
        const wCol = C4Engine.findImmediateWinningCol(board, aiPlayer);
        if(wCol !== -1) return wCol;
        const bCol = C4Engine.findImmediateWinningCol(board, opp);
        if(bCol !== -1) return bCol;
      }
      return legal[Math.floor(Math.random() * legal.length)];
    }

    // Immediate win or block check for both Medium & Hard
    const winNow = C4Engine.findImmediateWinningCol(board, aiPlayer);
    if(winNow !== -1) return winNow;
    const blockNow = C4Engine.findImmediateWinningCol(board, opp);
    if(blockNow !== -1) return blockNow;

    if(level === 'medium'){
      // Filter out moves that immediately let opponent win on the square above if possible
      const safe = legal.filter(c => {
        let r = -1;
        for(let rr=5; rr>=0; rr--) if(board[rr][c] === 0){ r = rr; break; }
        board[r][c] = aiPlayer;
        const oppWin = C4Engine.findImmediateWinningCol(board, opp);
        board[r][c] = 0;
        return oppWin === -1;
      });
      const pool = safe.length ? safe : legal;
      if(pool.includes(3) && Math.random() < 0.65) return 3;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    // Hard: Depth-limited Minimax with Alpha-Beta Pruning (depth 5)
    const colOrder = [3, 2, 4, 1, 5, 0, 6].filter(c => board[0][c] === 0);
    const MAX_DEPTH = 5;

    function dropRow(b, c){
      for(let r=5; r>=0; r--) if(b[r][c] === 0) return r;
      return -1;
    }

    function alphabeta(b, depth, alpha, beta, isMax){
      const avail = [3, 2, 4, 1, 5, 0, 6].filter(c => b[0][c] === 0);
      if(!avail.length) return 0;
      if(depth === 0) return C4Engine.evaluatePosition(b, aiPlayer);

      if(isMax){
        let maxEval = -Infinity;
        for(const c of avail){
          const r = dropRow(b, c);
          b[r][c] = aiPlayer;
          let ev;
          if(C4Engine.checkWinAt(b, r, c, aiPlayer)){
            ev = 50000 + depth * 100;
          } else {
            ev = alphabeta(b, depth - 1, alpha, beta, false);
          }
          b[r][c] = 0;
          if(ev > maxEval) maxEval = ev;
          if(ev > alpha) alpha = ev;
          if(beta <= alpha) break;
        }
        return maxEval;
      } else {
        let minEval = Infinity;
        for(const c of avail){
          const r = dropRow(b, c);
          b[r][c] = opp;
          let ev;
          if(C4Engine.checkWinAt(b, r, c, opp)){
            ev = -50000 - depth * 100;
          } else {
            ev = alphabeta(b, depth - 1, alpha, beta, true);
          }
          b[r][c] = 0;
          if(ev < minEval) minEval = ev;
          if(ev < beta) beta = ev;
          if(beta <= alpha) break;
        }
        return minEval;
      }
    }

    let bestCol = colOrder[0];
    let bestVal = -Infinity;
    for(const c of colOrder){
      const r = dropRow(board, c);
      board[r][c] = aiPlayer;
      const val = alphabeta(board, MAX_DEPTH - 1, -Infinity, Infinity, false);
      board[r][c] = 0;
      if(val > bestVal){
        bestVal = val;
        bestCol = c;
      }
    }
    return bestCol;
  }
}
window.C4Engine = C4Engine;

const C4 = {
  engine: new C4Engine(),
  mode: 'ai', // 'ai' | 'local' | 'online'
  aiLevel: 'hard', // 'easy' | 'medium' | 'hard'
  playerRolePref: 1, // 1 | 2
  myRole: 1,
  hoverCol: -1,
  statsRecorded: false,
  aiTimer: null,
  moveLock: false,
  // Online state
  code: '',
  host: false,
  roomStatus: 'idle', // 'idle' | 'waiting' | 'playing' | 'finished' | 'disconnected' | 'expired'
  roomMsg: '',
  players: {1: null, 2: null},
  lastSeen: {},
  hbTimer: null,
  subs: []
};
window.C4 = C4;


/* =====================================================================
   CONNECT FOUR CONTROLLER, ONLINE ROOM & RENDERING
   ===================================================================== */
function c4Open(initialMode){
  if(initialMode) C4.mode = initialMode;
  ['#home','#dominoPage','#unoPage','#lobbyDomino','#lobbyUno','#lobby','#game','#bakasa','#chess','#ttt','#draw'].forEach(s=>{
    const el = $(s); if(el) el.classList.add('hide');
  });
  $('#c4').classList.remove('hide');
  $('#backHome').classList.remove('hide');
  setSharbHeaderBrand('SHARB GAMES • كونكت فور CONNECT FOUR','Your Ultimate Online Gaming Hub • 7×6','🔴');
  if(C4.mode === 'ai' && C4.engine.moveCount === 0 && C4.engine.turn !== C4.myRole){
    c4ScheduleAIMove();
  }
  c4Render();
  window.scrollTo(0, 0);
}
window.c4Open = c4Open;

function c4StartNewMatch(keepOnline=false){
  if(C4.aiTimer){ clearTimeout(C4.aiTimer); C4.aiTimer = null; }
  C4.engine.reset();
  C4.statsRecorded = false;
  C4.moveLock = false;
  if(C4.mode === 'ai'){
    C4.myRole = C4.playerRolePref === 2 ? 2 : 1;
  } else if(C4.mode === 'local'){
    C4.myRole = 1;
  } else if(C4.mode === 'online' && keepOnline){
    C4.roomStatus = (C4.players[1] && C4.players[2]) ? 'playing' : 'waiting';
  }
  c4Render();
  if(C4.mode === 'ai' && C4.engine.turn !== C4.myRole){
    c4ScheduleAIMove();
  }
}

function c4ScheduleAIMove(){
  if(C4.aiTimer) clearTimeout(C4.aiTimer);
  if(C4.mode !== 'ai' || C4.engine.winner || C4.engine.turn === C4.myRole) return;
  const aiPlayer = C4.myRole === 1 ? 2 : 1;
  C4.aiTimer = setTimeout(()=>{
    C4.aiTimer = null;
    if(C4.mode !== 'ai' || C4.engine.winner || C4.engine.turn !== aiPlayer) return;
    const col = C4Engine.chooseAIMove(C4.engine, aiPlayer, C4.aiLevel);
    if(col !== -1){
      c4ExecuteLocalOrAIMove(col);
    }
  }, 260);
}

function c4CheckAndRecordStats(){
  const w = C4.engine.winner;
  if(!w || C4.statsRecorded) return;
  C4.statsRecorded = true;
  if(C4.mode === 'local'){
    recordArcadeMatchResult('c4', 'local', w === 'draw' ? 'draw' : 'win', 'لاعب محلي');
    if(w !== 'draw'){ beep(660,.14,'triangle',.12); confetti(26); }
    return;
  }
  const oppName = C4.mode === 'ai'
    ? `الكمبيوتر (${C4.aiLevel==='easy'?'سهل':(C4.aiLevel==='hard'?'صعب':'متوسط')})`
    : ((C4.players[C4.myRole === 1 ? 2 : 1] || {}).name || 'صديق أونلاين');
  if(w === 'draw'){
    recordArcadeMatchResult('c4', C4.mode, 'draw', oppName);
    beep(420,.1,'sine',.08);
  } else if(w === C4.myRole){
    recordArcadeMatchResult('c4', C4.mode, 'win', oppName);
    beep(660,.14,'triangle',.12); confetti(30);
  } else {
    recordArcadeMatchResult('c4', C4.mode, 'loss', oppName);
    beep(220,.15,'sawtooth',.1);
  }
}

function c4ExecuteLocalOrAIMove(col){
  if(!C4.engine.isValidMove(col)) return false;
  const res = C4.engine.dropDisc(col);
  if(!res) return false;
  beep(res.player === 1 ? 460 : 540, .07, 'sine', .08);
  if(C4.engine.winner){
    c4CheckAndRecordStats();
  }
  c4Render();
  if(!C4.engine.winner && C4.mode === 'ai' && C4.engine.turn !== C4.myRole){
    c4ScheduleAIMove();
  }
  return true;
}

function c4OnColumnClick(col){
  if(C4.engine.winner !== null) return;
  if(!C4.engine.isValidMove(col)){
    toast('هذا العمود ممتلئ بالكامل — اختر عمودًا آخر!', 'warn', 1800);
    return;
  }
  if(C4.mode === 'local'){
    c4ExecuteLocalOrAIMove(col);
    return;
  }
  if(C4.mode === 'ai'){
    if(C4.engine.turn !== C4.myRole) return;
    c4ExecuteLocalOrAIMove(col);
    return;
  }
  if(C4.mode === 'online'){
    if(C4.roomStatus !== 'playing' || !C4.players[1] || !C4.players[2]){
      toast('بانتظار انضمام اللاعب الثاني لبدء المباراة', 'warn');
      return;
    }
    if(C4.engine.turn !== C4.myRole){
      toast('ليس دورك الآن — انتظر حركة خصمك', 'warn', 1800);
      return;
    }
    if(C4.moveLock) return;
    C4.moveLock = true;
    setTimeout(()=>{ C4.moveLock = false; }, 350);

    if(C4.host){
      c4HostProcessMoveRequest({
        senderPid: ME,
        role: C4.myRole,
        col,
        seq: C4.engine.moveCount
      });
    } else {
      arcPub('c4', C4.code, 'req_move', {
        senderPid: ME,
        role: C4.myRole,
        col,
        seq: C4.engine.moveCount
      });
    }
  }
}

/* ---------- Connect Four Online Room (Host-Validated) ---------- */
async function c4CreateOnlineRoom(){
  c4LeaveRoom(false);
  C4.mode = 'online';
  C4.host = true;
  C4.code = genCode();
  C4.myRole = C4.playerRolePref === 2 ? 2 : 1;
  C4.players = {
    1: C4.myRole === 1 ? me0() : null,
    2: C4.myRole === 2 ? me0() : null
  };
  C4.engine.reset();
  C4.statsRecorded = false;
  C4.roomStatus = 'waiting';
  C4.roomMsg = 'في انتظار انضمام لاعب ثانٍ عبر الكود…';

  ensureMQTT().then(()=>{
    for(const s of C4.subs){
      NET.topics.set(s.topic, s.fn);
      if(NET.client && NET.ready){ try{ NET.client.subscribe(s.topic, {qos:0}); }catch(e){} }
    }
  }).catch(()=>{});

  arcSub(C4, 'c4', C4.code, 'join', pkt => {
    if(!C4.host || !pkt || !pkt.player) return;
    const g = pkt.player;
    if(g.pid === ME) return;
    if(pkt.via === 'public' && typeof getRoomVisibility === 'function' && getRoomVisibility('c4') === 'private'){
      arcPub('c4', C4.code, 'reject', {targetPid: g.pid, reason: 'هذه الغرفة خاصة ولا يمكن الانضمام إليها من القائمة العامة'});
      return;
    }
    const openRole = C4.myRole === 1 ? 2 : 1;
    const curGuest = C4.players[openRole];
    if(curGuest && curGuest.pid !== g.pid && curGuest.uid !== g.uid){
      arcPub('c4', C4.code, 'reject', {targetPid: g.pid, reason: 'الغرفة مكتملة العدد (٢ لاعبين فقط)'});
      if(typeof pubDirSyncHostRoom === 'function') pubDirSyncHostRoom(true);
      return;
    }
    if(typeof pubDirClearReservation === 'function') pubDirClearReservation(g.pid);
    C4.players[openRole] = g;
    C4.roomStatus = C4.engine.winner ? 'finished' : 'playing';
    C4.roomMsg = `انضم ${g.name} — المباراة جارية الآن!`;
    toast(`🎉 انضم ${g.name} إلى غرفة كونكت فور!`, 'ok');
    c4BroadcastHostState();
    c4Render();
  });

  arcSub(C4, 'c4', C4.code, 'req_move', pkt => {
    if(!C4.host || !pkt) return;
    c4HostProcessMoveRequest(pkt);
  });

  arcSub(C4, 'c4', C4.code, 'action', pkt => {
    if(!C4.host || !pkt) return;
    if(pkt.type === 'restart'){
      C4.engine.reset();
      C4.statsRecorded = false;
      C4.roomStatus = (C4.players[1] && C4.players[2]) ? 'playing' : 'waiting';
      C4.roomMsg = 'بدأت مباراة جديدة!';
      c4BroadcastHostState();
      c4Render();
    } else if(pkt.type === 'bye'){
      const openRole = C4.myRole === 1 ? 2 : 1;
      if(C4.players[openRole] && C4.players[openRole].pid === pkt.senderPid){
        C4.players[openRole] = null;
        C4.roomStatus = 'disconnected';
        C4.roomMsg = 'غادر اللاعب الآخر الغرفة — في انتظار لاعب جديد';
        c4BroadcastHostState();
        c4Render();
      }
    }
  });

  c4BroadcastHostState();
  c4Render();
  toast(`تم إنشاء غرفة كونكت فور بكود ${C4.code}`, 'ok');
}

function c4HostProcessMoveRequest(pkt){
  if(!C4.host || C4.roomStatus !== 'playing') return false;
  if(!C4.players[1] || !C4.players[2]) return false;
  const expectedTurn = C4.engine.turn;
  const expectedPlayer = C4.players[expectedTurn];
  if(!expectedPlayer || pkt.senderPid !== expectedPlayer.pid || Number(pkt.role) !== expectedTurn){
    return false;
  }
  if(Number(pkt.seq) !== C4.engine.moveCount) return false;
  const col = Number(pkt.col);
  if(!C4.engine.isValidMove(col)) return false;

  C4.engine.dropDisc(col, expectedTurn);
  C4.moveLock = false;
  beep(520, .07, 'sine', .08);
  if(C4.engine.winner){
    C4.roomStatus = 'finished';
    C4.roomMsg = C4.engine.winner === 'draw' ? 'انتهت المباراة بالتعادل!' : `فاز اللاعب ${C4.engine.winner === 1 ? 'الأحمر 🔴' : 'الذهبي 🟡'}!`;
    c4CheckAndRecordStats();
  }
  c4BroadcastHostState();
  c4Render();
  return true;
}

function c4BroadcastHostState(){
  if(!C4.host || !C4.code) return;
  arcPub('c4', C4.code, 'state', {
    code: C4.code,
    players: C4.players,
    roomStatus: C4.roomStatus,
    roomMsg: C4.roomMsg,
    game: C4.engine.cloneState(),
    ts: Date.now()
  }, true);
  if(typeof pubDirSyncHostRoom === 'function') pubDirSyncHostRoom(true);
}

async function c4JoinOnlineRoom(rawCode){
  const c = String(rawCode||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(c.length < 4){ toast('اكتب كود الغرفة الصحيح (٤-٦ حروف/أرقام)', 'warn'); return; }
  c4LeaveRoom(false);
  C4.mode = 'online';
  C4.host = false;
  C4.code = c;
  C4.players = {1: null, 2: null};
  C4.engine.reset();
  C4.statsRecorded = false;
  C4.roomStatus = 'waiting';
  C4.roomMsg = `جاري الاتصال بالغرفة ${c}…`;

  ensureMQTT().then(()=>{
    for(const s of C4.subs){
      NET.topics.set(s.topic, s.fn);
      if(NET.client && NET.ready){ try{ NET.client.subscribe(s.topic, {qos:0}); }catch(e){} }
    }
    arcPub('c4', C4.code, 'join', {player: me0(), ts: Date.now()});
  }).catch(()=>{});

  arcSub(C4, 'c4', C4.code, 'reject', pkt => {
    if(pkt && pkt.targetPid === ME){
      toast(pkt.reason || 'الغرفة ممتلئة', 'warn');
      c4LeaveRoom(true);
    }
  });

  arcSub(C4, 'c4', C4.code, 'state', pkt => {
    if(!pkt || pkt.code !== C4.code) return;
    if(pkt.closed){
      C4.roomStatus = 'expired';
      C4.roomMsg = 'انتهت صلاحية الغرفة لأن المضيف أغلقها';
      toast('أغلق المضيف غرفة كونكت فور', 'warn');
      c4Render();
      return;
    }
    C4.players = pkt.players || {1: null, 2: null};
    if(C4.players[1] && (C4.players[1].pid === ME || C4.players[1].uid === PF.uid)) C4.myRole = 1;
    else if(C4.players[2] && (C4.players[2].pid === ME || C4.players[2].uid === PF.uid)) C4.myRole = 2;

    const prevMoves = C4.engine.moveCount;
    C4.engine.loadState(pkt.game);
    if(C4.engine.moveCount === 0) C4.statsRecorded = false;
    C4.roomStatus = pkt.roomStatus || 'playing';
    C4.roomMsg = pkt.roomMsg || '';
    C4.moveLock = false;
    if(C4.engine.moveCount > prevMoves) beep(520, .07, 'sine', .08);
    if(C4.engine.winner){
      c4CheckAndRecordStats();
    }
    c4Render();
  });

  arcPub('c4', C4.code, 'join', {player: me0(), via: window._sharbJoinVia || 'code', ts: Date.now()});
  c4Render();
}

function c4LeaveRoom(rerender=true){
  if(C4.aiTimer){ clearTimeout(C4.aiTimer); C4.aiTimer = null; }
  C4.moveLock = false;
  if(C4.code){
    if(C4.host){
      if(typeof pubDirNotifyRoomClosed === 'function') pubDirNotifyRoomClosed('c4', C4.code);
      arcPub('c4', C4.code, 'state', {code: C4.code, closed: true, ts: Date.now()}, true);
    } else {
      arcPub('c4', C4.code, 'action', {type: 'bye', senderPid: ME, ts: Date.now()});
    }
  }
  arcClearSubs(C4);
  C4.code = '';
  C4.host = false;
  C4.roomStatus = 'idle';
  C4.roomMsg = '';
  C4.players = {1: null, 2: null};
  if(rerender) c4Render();
}
window.c4LeaveRoom = c4LeaveRoom;

function c4Render(){
  const root = $('#c4Root');
  if(!root) return;
  const eng = C4.engine;
  const winKeySet = new Set((eng.winCells || []).map(([r,c]) => `${r},${c}`));
  const st = getArcadeStats().c4;

  const getPlayerInfo = role => {
    const colorLbl = role === 1 ? 'الأحمر 🔴' : 'الذهبي 🟡';
    if(C4.mode === 'local'){
      return role === 1
        ? {name: 'اللاعب الأول 🔴', sub: 'أقراص حمراء'}
        : {name: 'اللاعب الثاني 🟡', sub: 'أقراص ذهبية'};
    }
    if(C4.mode === 'ai'){
      if(role === C4.myRole) return {name: PF.name || 'أنت', sub: colorLbl};
      const lvlAr = C4.aiLevel === 'easy' ? 'سهل 🌱' : (C4.aiLevel === 'hard' ? 'صعب 🔥' : 'متوسط ⚡');
      return {name: `الكمبيوتر (${lvlAr})`, sub: colorLbl};
    }
    const p = C4.players[role];
    if(p) return {name: p.name, sub: `${p.pid === ME ? 'أنت' : 'خصمك'} (${colorLbl})`};
    return {name: 'بانتظار لاعب…', sub: colorLbl};
  };

  const p1 = getPlayerInfo(1);
  const p2 = getPlayerInfo(2);
  const isTurn1 = !eng.winner && eng.turn === 1;
  const isTurn2 = !eng.winner && eng.turn === 2;

  let statusTitle = '';
  let statusSub = '';
  if(eng.winner === 1 || eng.winner === 2){
    const wInfo = getPlayerInfo(eng.winner);
    statusTitle = `🏆 فاز ${wInfo.name}!`;
    statusSub = 'تم توصيل ٤ أقراص متتالية بنجاح!';
  } else if(eng.winner === 'draw'){
    statusTitle = '🤝 انتهت المباراة بالتعادل!';
    statusSub = 'امتلأت الرقعة بالكامل (٤٢ قرصًا) دون فائز';
  } else if(C4.mode === 'online' && C4.roomStatus !== 'playing'){
    statusTitle = C4.roomStatus === 'waiting' ? '⏳ في انتظار انضمام لاعب ثانٍ…' : (C4.roomStatus === 'disconnected' ? '⚠️ غادر الخصم الغرفة' : '🌐 غرفة كونكت فور الأونلاين');
    statusSub = C4.roomMsg || 'شارك كود الغرفة مع صديقك للبدء';
  } else {
    const curInfo = getPlayerInfo(eng.turn);
    statusTitle = `🎯 الدور الحالي: ${curInfo.name}`;
    statusSub = (C4.mode === 'ai' && eng.turn !== C4.myRole)
      ? 'الكمبيوتر يحسب النقلة القادمة…'
      : 'اضغط على أي عمود متاح لإسقاط القرص في أدنى خانة فارغة';
  }

  const canDrop = !eng.winner && (C4.mode !== 'online' || C4.roomStatus === 'playing');
  let dropBtnsHTML = '';
  for(let c = 0; c < 7; c++){
    const colFull = eng.board[0][c] !== 0;
    const disabled = !canDrop || colFull;
    dropBtnsHTML += `<button class="c4-col-btn ${C4.hoverCol===c?'hover-col':''}" data-c4col="${c}" ${disabled?'disabled':''} title="إسقاط في العمود ${c+1}">
      <span class="c4-preview-dot p${eng.turn}"></span>
      <span>▼</span>
    </button>`;
  }

  let gridHTML = '';
  for(let r = 0; r < 6; r++){
    for(let c = 0; c < 7; c++){
      const v = eng.board[r][c];
      const isWin = winKeySet.has(`${r},${c}`);
      const isLast = eng.lastMove && eng.lastMove.r === r && eng.lastMove.c === c;
      let discHTML = '';
      if(v === 1 || v === 2){
        const cls = [
          'c4-disc',
          `p${v}`,
          isLast ? 'drop-anim last-disc' : '',
          isWin ? 'win-disc' : ''
        ].filter(Boolean).join(' ');
        discHTML = `<div class="${cls}" style="--drop-rows:${r + 1}" data-disc="${v}"></div>`;
      }
      gridHTML += `<div class="c4-cell ${v?'has-disc':''} ${C4.hoverCol===c?'col-hover':''}" data-c4col="${c}" data-r="${r}" data-c="${c}">${discHTML}</div>`;
    }
  }

  const roomStateLabel = {
    idle: 'غير متصل بغرفة',
    waiting: '⏳ انتظار لاعب',
    playing: '🔥 المباراة جارية',
    finished: '🏁 انتهت المباراة',
    disconnected: '⚠️ انقطع اتصال الخصم',
    expired: '⛔ انتهت صلاحية الغرفة'
  }[C4.roomStatus] || 'غير متصل';

  root.innerHTML = `<div class="arc-wrap">
    <section class="hero glass" style="padding:18px 20px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div>
          <h2 style="margin:0;font-size:21px">🔴🟡 كونكت فور — SHARB GAMES Connect Four</h2>
          <p class="mut" style="margin:4px 0 0;font-size:13px">أسقط الأقراص في الأعمدة السبعة ووصّل ٤ أقراص متتالية أفقيًا أو رأسيًا أو قطريًا</p>
        </div>
        <div class="ch-ModeTabs">
          <button class="ch-tab ${C4.mode==='ai'?'on':''}" data-c4mode="ai">🤖 ضد الكمبيوتر</button>
          <button class="ch-tab ${C4.mode==='local'?'on':''}" data-c4mode="local">👥 لاعب ضد لاعب (نفس الجهاز)</button>
          <button class="ch-tab ${C4.mode==='online'?'on':''}" data-c4mode="online">🌐 أونلاين مع صديق</button>
        </div>
      </div>
    </section>

    <div class="arc-layout">
      <div class="arc-board-col">
        <div class="arc-players-bar">
          <div class="arc-pcard ${isTurn1?'active-turn':''} ${eng.winner===1?'winner-card':''}">
            <div style="display:flex;align-items:center;gap:10px;min-width:0">
              <div class="arc-sym-badge p1">🔴</div>
              <div style="min-width:0">
                <div style="font-weight:900;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p1.name)}</div>
                <div class="mut tiny">${esc(p1.sub)}</div>
              </div>
            </div>
            ${isTurn1 ? `<span class="bk-chip ok" style="font-size:11px">دوره</span>` : ''}
          </div>
          <div class="arc-pcard ${isTurn2?'active-turn':''} ${eng.winner===2?'winner-card':''}">
            <div style="display:flex;align-items:center;gap:10px;min-width:0">
              <div class="arc-sym-badge p2">🟡</div>
              <div style="min-width:0">
                <div style="font-weight:900;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p2.name)}</div>
                <div class="mut tiny">${esc(p2.sub)}</div>
              </div>
            </div>
            ${isTurn2 ? `<span class="bk-chip ok" style="font-size:11px">دوره</span>` : ''}
          </div>
        </div>

        <div class="c4-frame" id="c4BoardWrap">
          <div class="c4-DropRow" id="c4ColIndicators">${dropBtnsHTML}</div>
          <div class="c4-grid" id="c4Grid">${gridHTML}</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px">
        <section class="panel glass">
          <div class="ch-status-banner ${eng.winner?'over':''}" id="c4StatusBanner">
            <div>
              <div style="font-weight:900;font-size:16px" id="c4StatusTitle">${esc(statusTitle)}</div>
              <div class="mut" style="font-size:12px;margin-top:3px" id="c4StatusSub">${esc(statusSub)}</div>
            </div>
            <span class="bk-chip ac">الأقراص ${eng.moveCount}/42</span>
          </div>

          <div class="row" style="margin-top:12px;flex-wrap:wrap">
            <button class="btn ok" data-c4act="restart" id="c4RestartBtn">🔄 إعادة المباراة</button>
            <button class="btn g" data-c4act="backHome" id="c4BackBtn">🏠 العودة إلى قائمة الألعاب</button>
          </div>
        </section>

        ${C4.mode === 'ai' ? `
          <section class="panel glass">
            <h2>🤖 إعدادات الذكاء الاصطناعي</h2>
            <div style="margin-bottom:10px">
              <label class="lbl">مستوى صعوبة الكمبيوتر (بحث محدود العمق بالـ Minimax في المستوى الصعب):</label>
              <div class="quick-g-pills">
                <div class="quick-g-pill ${C4.aiLevel==='easy'?'on':''}" data-c4lvl="easy">🌱 سهل</div>
                <div class="quick-g-pill ${C4.aiLevel==='medium'?'on':''}" data-c4lvl="medium">⚡ متوسط</div>
                <div class="quick-g-pill ${C4.aiLevel==='hard'?'on':''}" data-c4lvl="hard">🔥 صعب (Minimax)</div>
              </div>
            </div>
            <div>
              <label class="lbl">اختر لون أقراصك:</label>
              <div class="quick-g-pills" style="grid-template-columns:1fr 1fr">
                <div class="quick-g-pill ${C4.playerRolePref===1?'on':''}" data-c4role="1">🔴 الأحمر (أبدأ أولًا)</div>
                <div class="quick-g-pill ${C4.playerRolePref===2?'on':''}" data-c4role="2">🟡 الذهبي (ألعب ثانيًا)</div>
              </div>
            </div>
          </section>
        ` : ''}

        ${C4.mode === 'online' ? `
          <section class="panel glass">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px">
              <h2 style="margin:0">🌐 غرفة كونكت فور الأونلاين</h2>
              <span class="bk-chip ${C4.roomStatus==='playing'?'ok':(C4.roomStatus==='waiting'?'warn':'ac')}" id="c4RoomStateBadge">${roomStateLabel}</span>
            </div>
            ${!C4.code ? `
              <div style="margin-bottom:10px">
                <label class="lbl">لونك عند إنشاء الغرفة:</label>
                <div class="quick-g-pills" style="grid-template-columns:1fr 1fr">
                  <div class="quick-g-pill ${C4.playerRolePref===1?'on':''}" data-c4role="1">🔴 الأحمر (يبدأ)</div>
                  <div class="quick-g-pill ${C4.playerRolePref===2?'on':''}" data-c4role="2">🟡 الذهبي (ثانيًا)</div>
                </div>
              </div>
              ${typeof buildGameVisControlHTML==='function' ? buildGameVisControlHTML('c4', false, false) : ''}
              <div class="row" style="margin-bottom:10px">
                <button class="btn ok big" data-c4act="createOnline" id="c4CreateRoomBtn" style="width:100%">➕ إنشاء غرفة كونكت فور الآن</button>
              </div>
              <div class="row">
                <input id="c4JoinCodeInp" placeholder="اكتب كود الغرفة" maxlength="6" style="text-transform:uppercase;direction:ltr;text-align:center;letter-spacing:3px;font-weight:800">
                <button class="btn" data-c4act="joinOnline" id="c4JoinRoomBtn">🚀 انضمام</button>
              </div>
            ` : `
              <div class="mycode" style="margin-bottom:10px">
                <span>كود الغرفة: <b id="c4RoomCodeDisp">${esc(C4.code)}</b></span>
                <div style="display:flex;gap:6px">
                  <button class="mini" data-c4act="copyRoom">📋 نسخ الكود</button>
                  <button class="mini del" data-c4act="leaveOnline">🚪 مغادرة الغرفة</button>
                </div>
              </div>
              ${typeof buildGameVisControlHTML==='function' ? buildGameVisControlHTML('c4', true, C4.host) : ''}
              <div class="mut tiny" style="margin-bottom:8px">${esc(C4.roomMsg || 'شارك الكود مع صديقك أو ادعه مباشرة:')}</div>
              <div class="plist" style="max-height:140px">
                ${friends().length ? friends().map((f,i)=>`
                  <div class="pitem">
                    <span class="pc">
                      <span class="av sm" style="--c:${esc(f.col||'#0a84ff')}">${esc(f.av||'🙂')}</span>
                      <span><b>${esc(f.name)}</b></span>
                    </span>
                    <button class="mini ok" data-c4invf="${i}">📨 دعوة</button>
                  </div>
                `).join('') : `<div class="empty">انسخ كود الغرفة وشاركه مع صديقك للانضمام الفوري!</div>`}
              </div>
            `}
          </section>
        ` : ''}

        <section class="panel glass">
          <h2 style="margin:0 0 8px">📊 إحصائياتك في كونكت فور</h2>
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

$('#c4').addEventListener('click', e => {
  const colEl = e.target.closest('[data-c4col]');
  if(colEl){
    c4OnColumnClick( parseInt(colEl.dataset.c4col, 10) );
    return;
  }
  const modeBtn = e.target.closest('[data-c4mode]');
  if(modeBtn){
    const m = modeBtn.dataset.c4mode;
    if(C4.mode !== m){
      if(C4.mode === 'online' && C4.code) c4LeaveRoom(false);
      C4.mode = m;
      c4StartNewMatch(false);
    }
    return;
  }
  const lvlBtn = e.target.closest('[data-c4lvl]');
  if(lvlBtn){
    C4.aiLevel = lvlBtn.dataset.c4lvl;
    c4StartNewMatch(false);
    return;
  }
  const roleBtn = e.target.closest('[data-c4role]');
  if(roleBtn){
    C4.playerRolePref = parseInt(roleBtn.dataset.c4role, 10) === 2 ? 2 : 1;
    if(C4.mode === 'ai') c4StartNewMatch(false);
    else c4Render();
    return;
  }
  const invBtn = e.target.closest('[data-c4invf]');
  if(invBtn){
    const f = friends()[+invBtn.dataset.c4invf];
    if(f && C4.code) dispatchInviteToFriend(f, C4.code, 'c4');
    return;
  }
  const actBtn = e.target.closest('[data-c4act]');
  if(!actBtn) return;
  const act = actBtn.dataset.c4act;
  if(act === 'restart'){
    if(C4.mode === 'online' && C4.code){
      if(C4.host){
        C4.engine.reset();
        C4.statsRecorded = false;
        C4.roomStatus = (C4.players[1] && C4.players[2]) ? 'playing' : 'waiting';
        C4.roomMsg = 'تمت إعادة المباراة!';
        c4BroadcastHostState();
        c4Render();
      } else {
        arcPub('c4', C4.code, 'action', {type: 'restart', senderPid: ME});
      }
    } else {
      c4StartNewMatch(false);
    }
    toast('🔄 تمت إعادة المباراة من البداية', 'ok');
  } else if(act === 'backHome'){
    goHome();
  } else if(act === 'createOnline'){
    c4CreateOnlineRoom();
  } else if(act === 'joinOnline'){
    const inp = $('#c4JoinCodeInp');
    if(inp) c4JoinOnlineRoom(inp.value);
  } else if(act === 'copyRoom'){
    if(C4.code) copyText(C4.code);
  } else if(act === 'leaveOnline'){
    c4LeaveRoom(true);
  }
});




/* ================= MULTI-PAGE INITIALIZATION & SESSION PERSISTENCE FOR CONNECT FOUR ================= */
function c4SaveSession() {
  SharbSession.saveGameSession('c4', {
    mode: C4.mode,
    aiLevel: C4.aiLevel,
    playerRolePref: C4.playerRolePref,
    myRole: C4.myRole,
    game: C4.engine.cloneState(),
    code: C4.code,
    host: C4.host,
    roomStatus: C4.roomStatus
  });
}

const _origC4Render = c4Render;
c4Render = function() {
  _origC4Render();
  c4SaveSession();
};

function c4RestoreSession() {
  const saved = SharbSession.loadGameSession('c4');
  if (!saved) return false;
  C4.mode = saved.mode || 'ai';
  C4.aiLevel = saved.aiLevel || 'hard';
  C4.playerRolePref = saved.playerRolePref || 1;
  C4.myRole = saved.myRole || 1;
  if (saved.game) C4.engine.loadState(saved.game);
  if (saved.mode === 'online' && saved.code) {
    if (saved.host) c4CreateOnlineRoom();
    else c4JoinOnlineRoom(saved.code);
    return true;
  }
  return true;
}

function initC4Page() {
  const qs = new URLSearchParams(window.location.search);
  const qRoom = (qs.get('room') || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const qAction = qs.get('action') || '';
  const qVis = qs.get('vis') || '';
  const intent = SharbSession.consumeRoomIntent('c4');

  if (qVis === 'private' || qVis === 'public') setRoomVisibility('c4', qVis, true);
  if (intent && intent.visibility) setRoomVisibility('c4', intent.visibility, true);
  if (intent && intent.roomName) SHARB_ROOM_CFG.roomNames.c4 = intent.roomName;

  if (qAction === 'create' || qAction === 'arena' || (intent && intent.action === 'create')) {
    c4CreateOnlineRoom();
    return;
  }
  if (qRoom || (intent && intent.action === 'join' && intent.code)) {
    const targetCode = qRoom || intent.code;
    window._sharbJoinVia = (qs.get('via') === 'public' || (intent && intent.via === 'public')) ? 'public' : 'code';
    c4JoinOnlineRoom(targetCode);
    return;
  }

  c4RestoreSession();
  c4Render();
  if (C4.mode === 'ai' && !C4.engine.winner && C4.engine.turn !== C4.myRole) {
    c4ScheduleAIMove();
  }
}

document.addEventListener('DOMContentLoaded', initC4Page);
window.addEventListener('beforeunload', c4SaveSession);
