/* ================= SHARB CHESS PRO — FULL FIDE RULES ENGINE, AI & ONLINE ================= */
class SharbChess {
  constructor(fen){
    this.reset();
    if(fen) this.load(fen);
  }
  reset(){
    this.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  }
  load(fen){
    const parts = String(fen||'').trim().split(/\s+/);
    if(parts.length < 4) return false;
    const rows = parts[0].split('/');
    if(rows.length !== 8) return false;
    const b = Array.from({length:8}, ()=>Array(8).fill(null));
    for(let r=0; r<8; r++){
      let c = 0;
      for(const ch of rows[r]){
        if(ch >= '1' && ch <= '8'){
          c += parseInt(ch, 10);
        } else {
          const color = (ch === ch.toUpperCase()) ? 'w' : 'b';
          const type = ch.toLowerCase();
          if(!'pnbrqk'.includes(type) || c > 7) return false;
          b[r][c++] = {type, color};
        }
      }
      if(c !== 8) return false;
    }
    this._board = b;
    this._turn = parts[1] === 'b' ? 'b' : 'w';
    this._castling = {K:false, Q:false, k:false, q:false};
    if(parts[2] && parts[2] !== '-'){
      for(const ch of parts[2]){
        if(ch in this._castling) this._castling[ch] = true;
      }
    }
    this._ep = (parts[3] && parts[3] !== '-') ? parts[3] : null;
    this._halfMoves = Math.max(0, parseInt(parts[4]||'0', 10) || 0);
    this._fullMoves = Math.max(1, parseInt(parts[5]||'1', 10) || 1);
    this._history = [];
    this._posCounts = new Map();
    this._recordPos(1);
    return true;
  }
  _posKey(){
    const rows = [];
    for(let r=0; r<8; r++){
      let s = '', empty = 0;
      for(let c=0; c<8; c++){
        const p = this._board[r][c];
        if(!p){ empty++; }
        else {
          if(empty){ s += empty; empty = 0; }
          s += p.color === 'w' ? p.type.toUpperCase() : p.type;
        }
      }
      if(empty) s += empty;
      rows.push(s);
    }
    let cr = '';
    if(this._castling.K) cr += 'K';
    if(this._castling.Q) cr += 'Q';
    if(this._castling.k) cr += 'k';
    if(this._castling.q) cr += 'q';
    if(!cr) cr = '-';
    // Include ep square if an enemy pawn can actually capture on it
    const ep = this._ep || '-';
    return `${rows.join('/')} ${this._turn} ${cr} ${ep}`;
  }
  _recordPos(delta){
    const k = this._posKey();
    const prev = this._posCounts.get(k) || 0;
    const next = Math.max(0, prev + delta);
    if(next === 0) this._posCounts.delete(k);
    else this._posCounts.set(k, next);
  }
  fen(){
    return `${this._posKey()} ${this._halfMoves} ${this._fullMoves}`;
  }
  turn(){ return this._turn; }
  board(){
    return this._board.map((row,r)=>row.map((p,c)=>p ? {type:p.type, color:p.color, square:this._rcToSq(r,c)} : null));
  }
  _sqToRC(sq){
    if(!sq || sq.length !== 2) return null;
    const c = sq.charCodeAt(0) - 97;
    const r = 8 - parseInt(sq[1], 10);
    if(r < 0 || r > 7 || c < 0 || c > 7 || isNaN(r)) return null;
    return [r, c];
  }
  _rcToSq(r, c){
    return String.fromCharCode(97 + c) + String(8 - r);
  }
  get(sq){
    const rc = this._sqToRC(sq);
    if(!rc) return null;
    const p = this._board[rc[0]][rc[1]];
    return p ? {type:p.type, color:p.color} : null;
  }
  _findKing(color){
    for(let r=0; r<8; r++){
      for(let c=0; c<8; c++){
        const p = this._board[r][c];
        if(p && p.type === 'k' && p.color === color) return [r, c];
      }
    }
    return null;
  }
  isSquareAttacked(r, c, byColor){
    const b = this._board;
    // 1. Pawn attacks
    const pawnRow = byColor === 'w' ? r + 1 : r - 1;
    if(pawnRow >= 0 && pawnRow < 8){
      for(const dc of [-1, 1]){
        const pc = c + dc;
        if(pc >= 0 && pc < 8){
          const p = b[pawnRow][pc];
          if(p && p.color === byColor && p.type === 'p') return true;
        }
      }
    }
    // 2. Knight attacks
    const kJumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for(const [dr, dc] of kJumps){
      const nr = r + dr, nc = c + dc;
      if(nr >= 0 && nr < 8 && nc >= 0 && nc < 8){
        const p = b[nr][nc];
        if(p && p.color === byColor && p.type === 'n') return true;
      }
    }
    // 3. King attacks
    for(let dr=-1; dr<=1; dr++){
      for(let dc=-1; dc<=1; dc++){
        if(!dr && !dc) continue;
        const nr = r + dr, nc = c + dc;
        if(nr >= 0 && nr < 8 && nc >= 0 && nc < 8){
          const p = b[nr][nc];
          if(p && p.color === byColor && p.type === 'k') return true;
        }
      }
    }
    // 4. Orthogonal rays (Rook / Queen)
    const ortho = [[-1,0],[1,0],[0,-1],[0,1]];
    for(const [dr, dc] of ortho){
      let nr = r + dr, nc = c + dc;
      while(nr >= 0 && nr < 8 && nc >= 0 && nc < 8){
        const p = b[nr][nc];
        if(p){
          if(p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
          break;
        }
        nr += dr; nc += dc;
      }
    }
    // 5. Diagonal rays (Bishop / Queen)
    const diag = [[-1,-1],[-1,1],[1,-1],[1,1]];
    for(const [dr, dc] of diag){
      let nr = r + dr, nc = c + dc;
      while(nr >= 0 && nr < 8 && nc >= 0 && nc < 8){
        const p = b[nr][nc];
        if(p){
          if(p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
          break;
        }
        nr += dr; nc += dc;
      }
    }
    return false;
  }
  _isKingInCheck(color){
    const krc = this._findKing(color);
    if(!krc) return false;
    const enemy = color === 'w' ? 'b' : 'w';
    return this.isSquareAttacked(krc[0], krc[1], enemy);
  }
  in_check(){ return this._isKingInCheck(this._turn); }
  inCheck(){ return this.in_check(); }

  _pseudoMovesForSquare(r, c){
    const b = this._board;
    const p = b[r][c];
    if(!p || p.color !== this._turn) return [];
    const color = p.color;
    const enemy = color === 'w' ? 'b' : 'w';
    const from = this._rcToSq(r, c);
    const list = [];
    const addMove = (tr, tc, flags='n', captured=null, promo=null) => {
      const to = this._rcToSq(tr, tc);
      if(promo){
        for(const pr of ['q','r','b','n']){
          list.push({color, from, to, fromR:r, fromC:c, toR:tr, toC:tc, piece:p.type, captured, promotion:pr, flags:flags+'p'});
        }
      } else {
        list.push({color, from, to, fromR:r, fromC:c, toR:tr, toC:tc, piece:p.type, captured, promotion:null, flags});
      }
    };

    if(p.type === 'p'){
      const dir = color === 'w' ? -1 : 1;
      const startRank = color === 'w' ? 6 : 1;
      const promoRank = color === 'w' ? 0 : 7;
      const nr = r + dir;
      if(nr >= 0 && nr < 8){
        // 1 step forward
        if(!b[nr][c]){
          addMove(nr, c, 'n', null, nr === promoRank);
          // 2 steps forward from starting rank
          const nr2 = r + dir * 2;
          if(r === startRank && !b[nr2][c]){
            addMove(nr2, c, 'b', null, false);
          }
        }
        // Captures (normal + en passant)
        for(const dc of [-1, 1]){
          const nc = c + dc;
          if(nc < 0 || nc > 7) continue;
          const target = b[nr][nc];
          const toSq = this._rcToSq(nr, nc);
          if(target && target.color === enemy){
            addMove(nr, nc, 'c', target.type, nr === promoRank);
          } else if(!target && this._ep && toSq === this._ep){
            // Verify enemy pawn is next to us
            const epPawn = b[r][nc];
            if(epPawn && epPawn.color === enemy && epPawn.type === 'p'){
              addMove(nr, nc, 'e', 'p', false);
            }
          }
        }
      }
    } else if(p.type === 'n'){
      const jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for(const [dr, dc] of jumps){
        const nr = r + dr, nc = c + dc;
        if(nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
        const t = b[nr][nc];
        if(!t) addMove(nr, nc, 'n');
        else if(t.color === enemy) addMove(nr, nc, 'c', t.type);
      }
    } else if(p.type === 'b' || p.type === 'r' || p.type === 'q'){
      const dirs = [];
      if(p.type !== 'b') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
      if(p.type !== 'r') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
      for(const [dr, dc] of dirs){
        let nr = r + dr, nc = c + dc;
        while(nr >= 0 && nr < 8 && nc >= 0 && nc < 8){
          const t = b[nr][nc];
          if(!t){
            addMove(nr, nc, 'n');
          } else {
            if(t.color === enemy) addMove(nr, nc, 'c', t.type);
            break;
          }
          nr += dr; nc += dc;
        }
      }
    } else if(p.type === 'k'){
      for(let dr=-1; dr<=1; dr++){
        for(let dc=-1; dc<=1; dc++){
          if(!dr && !dc) continue;
          const nr = r + dr, nc = c + dc;
          if(nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
          const t = b[nr][nc];
          if(!t) addMove(nr, nc, 'n');
          else if(t.color === enemy) addMove(nr, nc, 'c', t.type);
        }
      }
      // Castling
      const homeR = color === 'w' ? 7 : 0;
      if(r === homeR && c === 4 && !this.isSquareAttacked(homeR, 4, enemy)){
        const kRight = color === 'w' ? this._castling.K : this._castling.k;
        const qRight = color === 'w' ? this._castling.Q : this._castling.q;
        // Kingside O-O
        const rkK = b[homeR][7];
        if(kRight && rkK && rkK.color === color && rkK.type === 'r' && !b[homeR][5] && !b[homeR][6]){
          if(!this.isSquareAttacked(homeR, 5, enemy) && !this.isSquareAttacked(homeR, 6, enemy)){
            addMove(homeR, 6, 'k');
          }
        }
        // Queenside O-O-O
        const rkQ = b[homeR][0];
        if(qRight && rkQ && rkQ.color === color && rkQ.type === 'r' && !b[homeR][1] && !b[homeR][2] && !b[homeR][3]){
          if(!this.isSquareAttacked(homeR, 3, enemy) && !this.isSquareAttacked(homeR, 2, enemy)){
            addMove(homeR, 2, 'q');
          }
        }
      }
    }
    return list;
  }

  _isMoveLegal(m){
    const b = this._board;
    const fromPiece = b[m.fromR][m.fromC];
    const targetPiece = b[m.toR][m.toC];
    let epCaptured = null;

    b[m.toR][m.toC] = m.promotion ? {type:m.promotion, color:m.color} : fromPiece;
    b[m.fromR][m.fromC] = null;

    if(m.flags === 'e'){
      epCaptured = b[m.fromR][m.toC];
      b[m.fromR][m.toC] = null;
    } else if(m.flags === 'k'){
      b[m.fromR][5] = b[m.fromR][7];
      b[m.fromR][7] = null;
    } else if(m.flags === 'q'){
      b[m.fromR][3] = b[m.fromR][0];
      b[m.fromR][0] = null;
    }

    const inChk = this._isKingInCheck(m.color);

    // Revert board state
    if(m.flags === 'k'){
      b[m.fromR][7] = b[m.fromR][5];
      b[m.fromR][5] = null;
    } else if(m.flags === 'q'){
      b[m.fromR][0] = b[m.fromR][3];
      b[m.fromR][3] = null;
    } else if(m.flags === 'e'){
      b[m.fromR][m.toC] = epCaptured;
    }
    b[m.fromR][m.fromC] = fromPiece;
    b[m.toR][m.toC] = targetPiece;

    return !inChk;
  }

  _rawLegalMoves(squareFilter=null){
    const raw = [];
    if(squareFilter){
      const rc = this._sqToRC(squareFilter);
      if(!rc) return [];
      const pseudo = this._pseudoMovesForSquare(rc[0], rc[1]);
      for(const m of pseudo){
        if(this._isMoveLegal(m)) raw.push(m);
      }
      return raw;
    }
    for(let r=0; r<8; r++){
      for(let c=0; c<8; c++){
        const p = this._board[r][c];
        if(p && p.color === this._turn){
          const pseudo = this._pseudoMovesForSquare(r, c);
          for(const m of pseudo){
            if(this._isMoveLegal(m)) raw.push(m);
          }
        }
      }
    }
    return raw;
  }

  _computeSAN(m, allLegal){
    if(m.flags === 'k') return 'O-O';
    if(m.flags === 'q') return 'O-O-O';
    let san = '';
    if(m.piece !== 'p'){
      san += m.piece.toUpperCase();
      // Disambiguation
      const amb = allLegal.filter(o =>
        o !== m &&
        o.piece === m.piece &&
        o.to === m.to &&
        (o.from !== m.from)
      );
      if(amb.length > 0){
        const sameFile = amb.some(o => o.fromC === m.fromC);
        const sameRank = amb.some(o => o.fromR === m.fromR);
        if(!sameFile) san += m.from[0];
        else if(!sameRank) san += m.from[1];
        else san += m.from;
      }
    } else if(m.captured){
      san += m.from[0];
    }
    if(m.captured) san += 'x';
    san += m.to;
    if(m.promotion) san += '=' + m.promotion.toUpperCase();
    return san;
  }

  moves(opts={}){
    const all = this._rawLegalMoves();
    const subset = opts.square ? all.filter(m => m.from === opts.square) : all;
    // Annotate SAN including check/checkmate suffix
    const result = subset.map(m => {
      let baseSan = this._computeSAN(m, all);
      // Temporarily apply to test check / checkmate on opponent
      const snap = this._applyMoveInternal(m, false);
      const oppInCheck = this._isKingInCheck(this._turn);
      let suffix = '';
      if(oppInCheck){
        const oppReplies = this._rawLegalMoves();
        suffix = (oppReplies.length === 0) ? '#' : '+';
      }
      this._revertMoveInternal(snap, false);
      const san = baseSan + suffix;
      return {...m, san};
    });
    if(opts.verbose) return result;
    return result.map(m => m.san);
  }

  _applyMoveInternal(m, recordPos=true){
    const b = this._board;
    const prevCastling = {...this._castling};
    const prevEp = this._ep;
    const prevHalf = this._halfMoves;
    const prevFull = this._fullMoves;
    const prevTurn = this._turn;
    const fromPiece = b[m.fromR][m.fromC];
    const targetPiece = b[m.toR][m.toC];
    let epCaptured = null;

    b[m.toR][m.toC] = m.promotion ? {type:m.promotion, color:m.color} : fromPiece;
    b[m.fromR][m.fromC] = null;

    if(m.flags === 'e'){
      epCaptured = b[m.fromR][m.toC];
      b[m.fromR][m.toC] = null;
    } else if(m.flags === 'k'){
      b[m.fromR][5] = b[m.fromR][7];
      b[m.fromR][7] = null;
    } else if(m.flags === 'q'){
      b[m.fromR][3] = b[m.fromR][0];
      b[m.fromR][0] = null;
    }

    // Update castling rights
    if(m.piece === 'k'){
      if(m.color === 'w'){ this._castling.K = false; this._castling.Q = false; }
      else { this._castling.k = false; this._castling.q = false; }
    }
    if(m.from === 'h1' || m.to === 'h1') this._castling.K = false;
    if(m.from === 'a1' || m.to === 'a1') this._castling.Q = false;
    if(m.from === 'h8' || m.to === 'h8') this._castling.k = false;
    if(m.from === 'a8' || m.to === 'a8') this._castling.q = false;

    // Update en passant square
    if(m.flags === 'b'){
      const epR = (m.fromR + m.toR) >> 1;
      this._ep = this._rcToSq(epR, m.fromC);
    } else {
      this._ep = null;
    }

    // Update halfmove & fullmove clocks
    if(m.piece === 'p' || m.captured){
      this._halfMoves = 0;
    } else {
      this._halfMoves++;
    }
    if(this._turn === 'b') this._fullMoves++;
    this._turn = this._turn === 'w' ? 'b' : 'w';

    if(recordPos) this._recordPos(1);

    return {m, fromPiece, targetPiece, epCaptured, prevCastling, prevEp, prevHalf, prevFull, prevTurn};
  }

  _revertMoveInternal(snap, recordPos=true){
    if(recordPos) this._recordPos(-1);
    const {m, fromPiece, targetPiece, epCaptured, prevCastling, prevEp, prevHalf, prevFull, prevTurn} = snap;
    const b = this._board;
    if(m.flags === 'k'){
      b[m.fromR][7] = b[m.fromR][5];
      b[m.fromR][5] = null;
    } else if(m.flags === 'q'){
      b[m.fromR][0] = b[m.fromR][3];
      b[m.fromR][3] = null;
    } else if(m.flags === 'e'){
      b[m.fromR][m.toC] = epCaptured;
    }
    b[m.fromR][m.fromC] = fromPiece;
    b[m.toR][m.toC] = targetPiece;
    this._castling = prevCastling;
    this._ep = prevEp;
    this._halfMoves = prevHalf;
    this._fullMoves = prevFull;
    this._turn = prevTurn;
  }

  move(moveObjOrSan){
    const legal = this.moves({verbose:true});
    let chosen = null;
    if(typeof moveObjOrSan === 'string'){
      const clean = moveObjOrSan.trim().replace(/[+#?!]+$/,'');
      chosen = legal.find(m => m.san === moveObjOrSan.trim() || m.san.replace(/[+#]+$/,'') === clean);
    } else if(moveObjOrSan && typeof moveObjOrSan === 'object'){
      const {from, to, promotion} = moveObjOrSan;
      chosen = legal.find(m =>
        m.from === from &&
        m.to === to &&
        (!m.promotion || m.promotion === (promotion || 'q').toLowerCase())
      );
    }
    if(!chosen) return null;
    const snap = this._applyMoveInternal(chosen, true);
    snap.move = chosen;
    this._history.push(snap);
    return chosen;
  }

  undo(){
    if(!this._history.length) return null;
    const snap = this._history.pop();
    this._revertMoveInternal(snap, true);
    return snap.move;
  }

  history(opts={}){
    if(opts.verbose) return this._history.map(s => s.move);
    return this._history.map(s => s.move.san);
  }

  in_checkmate(){
    return this.in_check() && this._rawLegalMoves().length === 0;
  }
  in_stalemate(){
    return !this.in_check() && this._rawLegalMoves().length === 0;
  }
  insufficient_material(){
    const pieces = [];
    for(let r=0; r<8; r++){
      for(let c=0; c<8; c++){
        const p = this._board[r][c];
        if(p && p.type !== 'k') pieces.push({...p, sqColor:(r+c)%2});
      }
    }
    if(pieces.length === 0) return true; // K vs K
    if(pieces.length === 1 && (pieces[0].type === 'b' || pieces[0].type === 'n')) return true; // K+B vs K or K+N vs K
    // K+B vs K+B on same color squares
    if(pieces.every(p => p.type === 'b')){
      const firstCol = pieces[0].sqColor;
      if(pieces.every(p => p.sqColor === firstCol)) return true;
    }
    return false;
  }
  in_threefold_repetition(){
    const cnt = this._posCounts.get(this._posKey()) || 0;
    return cnt >= 3;
  }
  in_fivefold_repetition(){
    const cnt = this._posCounts.get(this._posKey()) || 0;
    return cnt >= 5;
  }
  in_fifty_move_rule(){
    return this._halfMoves >= 100;
  }
  in_seventyfive_move_rule(){
    return this._halfMoves >= 150;
  }
  can_claim_draw(){
    return this.in_threefold_repetition() || this.in_fifty_move_rule();
  }
  in_draw(){
    return this.in_stalemate() ||
           this.insufficient_material() ||
           this.in_fivefold_repetition() ||
           this.in_seventyfive_move_rule() ||
           this.in_threefold_repetition() ||
           this.in_fifty_move_rule();
  }
  is_auto_draw(){
    return this.in_stalemate() ||
           this.insufficient_material() ||
           this.in_fivefold_repetition() ||
           this.in_seventyfive_move_rule();
  }
  game_over(){
    return this.in_checkmate() || this.is_auto_draw();
  }
}
window.SharbChess = SharbChess;
if(!window.Chess) window.Chess = SharbChess;

/* ---------- Crisp SVG Chess Pieces ---------- */
const CH_SVG = {
  wp: `<svg viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  wr: `<svg viewBox="0 0 45 45"><g fill="#fff" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5"/><path d="M34 14l-3 3H14l-3-3"/><path d="M31 17v12.5H14V17"/><path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/></g></svg>`,
  wn: `<svg viewBox="0 0 45 45"><g fill="#fff" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/><circle cx="15.5" cy="14.5" r="1.2" fill="#1e293b"/></g></svg>`,
  wb: `<svg viewBox="0 0 45 45"><g fill="#fff" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><circle cx="22.5" cy="8" r="2.2"/><path d="M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5"/></g></svg>`,
  wq: `<svg viewBox="0 0 45 45"><g fill="#fff" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/><path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14l2 12z"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/></g></svg>`,
  wk: `<svg viewBox="0 0 45 45"><g fill="#fff" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z"/><path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0"/></g></svg>`,
  bp: `<svg viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#1e293b" stroke="#f8fafc" stroke-width="2" stroke-linecap="round"/></svg>`,
  br: `<svg viewBox="0 0 45 45"><g fill="#1e293b" stroke="#f8fafc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zM12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z"/><path d="M14 29.5v-13h17v13H14z"/><path d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z"/></g></svg>`,
  bn: `<svg viewBox="0 0 45 45"><g fill="#1e293b" stroke="#f8fafc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/><circle cx="15.5" cy="14.5" r="1.2" fill="#f8fafc"/></g></svg>`,
  bb: `<svg viewBox="0 0 45 45"><g fill="#1e293b" stroke="#f8fafc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><circle cx="22.5" cy="8" r="2.2"/><path d="M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5"/></g></svg>`,
  bq: `<svg viewBox="0 0 45 45"><g fill="#1e293b" stroke="#f8fafc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2"/><circle cx="14" cy="9" r="2"/><circle cx="22.5" cy="8" r="2"/><circle cx="31" cy="9" r="2"/><circle cx="39" cy="12" r="2"/><path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/></g></svg>`,
  bk: `<svg viewBox="0 0 45 45"><g fill="#1e293b" stroke="#f8fafc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z"/><path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0"/></g></svg>`
};

const CH_VAL = {p:100, n:320, b:330, r:500, q:900, k:20000};
const CH_PST = {
  p: [
    [0,0,0,0,0,0,0,0],
    [50,50,50,50,50,50,50,50],
    [10,10,20,30,30,20,10,10],
    [5,5,10,25,25,10,5,5],
    [0,0,0,20,20,0,0,0],
    [5,-5,-10,0,0,-10,-5,5],
    [5,10,10,-20,-20,10,10,5],
    [0,0,0,0,0,0,0,0]
  ],
  n: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,0,0,0,0,-20,-40],
    [-30,0,10,15,15,10,0,-30],
    [-30,5,15,20,20,15,5,-30],
    [-30,0,15,20,20,15,0,-30],
    [-30,5,10,15,15,10,5,-30],
    [-40,-20,0,5,5,0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  b: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,0,0,0,0,0,0,-10],
    [-10,0,5,10,10,5,0,-10],
    [-10,5,5,10,10,5,5,-10],
    [-10,0,10,10,10,10,0,-10],
    [-10,10,10,10,10,10,10,-10],
    [-10,5,0,0,0,0,5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  r: [
    [0,0,0,0,0,0,0,0],
    [5,10,10,10,10,10,10,5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [0,0,0,5,5,0,0,0]
  ],
  q: [
    [-20,-10,-10,-5,-5,-10,-10,-20],
    [-10,0,0,0,0,0,0,-10],
    [-10,0,5,5,5,5,0,-10],
    [-5,0,5,5,5,5,0,-5],
    [0,0,5,5,5,5,0,-5],
    [-10,5,5,5,5,5,0,-10],
    [-10,0,5,0,0,0,0,-10],
    [-20,-10,-10,-5,-5,-10,-10,-20]
  ],
  k: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20,20,0,0,0,0,20,20],
    [20,30,10,0,0,10,30,20]
  ]
};

const CH = {
  game: new SharbChess(),
  mode: 'ai', // 'local' | 'ai' | 'online'
  aiLevel: 'medium', // 'easy' | 'medium' | 'hard'
  playerColorPref: 'w', // 'w' | 'b' | 'random'
  myColor: 'w',
  flipped: false,
  autoFlipLocal: false,
  selected: null,
  legalForSelected: [],
  pendingPromotion: null, // {from, to}
  lastMove: null, // {from, to}
  hintMove: null,
  claimedDrawReason: null,
  resignedColor: null,
  statsRecorded: false,
  aiTimer: null,
  // Online state
  code: '',
  host: false,
  onlinePlayers: {w: null, b: null},
  subs: [],
  bc: null
};
window.CH = CH;

try {
  if(typeof BroadcastChannel !== 'undefined'){
    CH.bc = new BroadcastChannel('sharb_chess_v1');
    CH.bc.onmessage = e => {
      if(e && e.data && e.data.topic) chHandleNetMsg(e.data.topic, e.data.payload);
    };
  }
  window.addEventListener('storage', e => {
    if(e.key === 'sharb_chess_pkt' && e.newValue){
      try{
        const d = JSON.parse(e.newValue);
        if(d && d.topic) chHandleNetMsg(d.topic, d.payload);
      }catch(err){}
    }
  });
}catch(e){}

function chTopic(code, sub){ return `sharb-chess/v1/${code}/${sub}`; }
function chPub(code, sub, payload){
  const topic = chTopic(code, sub);
  if(NET.client && NET.ready){
    try{ NET.client.publish(topic, JSON.stringify(payload), {qos:0}); }catch(e){}
  }
  if(CH.bc){
    try{ CH.bc.postMessage({topic, payload}); }catch(e){}
  }
  try{
    localStorage.setItem('sharb_chess_pkt', JSON.stringify({topic, payload, _r:Math.random()}));
  }catch(e){}
}

function chSub(code, sub, fn){
  const topic = chTopic(code, sub);
  CH.subs.push({topic, fn});
  if(NET.client && NET.ready){
    NET.topics.set(topic, fn);
    try{ NET.client.subscribe(topic, {qos:0}); }catch(e){}
  }
}

function chClearSubs(){
  for(const s of CH.subs){
    NET.topics.delete(s.topic);
    if(NET.client && NET.ready){
      try{ NET.client.unsubscribe(s.topic); }catch(e){}
    }
  }
  CH.subs = [];
}

function chHandleNetMsg(topic, payload){
  for(const s of CH.subs){
    if(s.topic === topic){
      try{ s.fn(payload); }catch(e){}
    }
  }
}

function chEvaluateBoard(game){
  if(game.in_checkmate()){
    return game.turn() === 'w' ? -99999 : 99999;
  }
  if(game.in_draw() || game.is_auto_draw()) return 0;
  let score = 0;
  const b = game._board;
  for(let r=0; r<8; r++){
    for(let c=0; c<8; c++){
      const p = b[r][c];
      if(!p) continue;
      const base = CH_VAL[p.type] || 0;
      const pstRow = p.color === 'w' ? r : (7 - r);
      const pst = (CH_PST[p.type] && CH_PST[p.type][pstRow]) ? CH_PST[p.type][pstRow][c] : 0;
      if(p.color === 'w') score += (base + pst);
      else score -= (base + pst);
    }
  }
  return score;
}

function chBestMoveAI(game, level='medium'){
  const legal = game.moves({verbose:true});
  if(!legal.length) return null;
  if(level === 'easy'){
    // Easy: mixes random moves with occasional captures
    const caps = legal.filter(m => m.captured);
    if(caps.length && Math.random() < 0.45){
      return caps[Math.floor(Math.random() * caps.length)];
    }
    return legal[Math.floor(Math.random() * legal.length)];
  }
  const depth = level === 'hard' ? 3 : 2;
  const maximizing = game.turn() === 'w';

  // Move ordering: captures, promotions, checks first
  const orderMoves = moves => moves.slice().sort((a,b)=>{
    const sa = (a.captured ? (CH_VAL[a.captured]||100)*10 - (CH_VAL[a.piece]||100) : 0) + (a.promotion ? 800 : 0);
    const sb = (b.captured ? (CH_VAL[b.captured]||100)*10 - (CH_VAL[b.piece]||100) : 0) + (b.promotion ? 800 : 0);
    return sb - sa;
  });

  function alphabeta(d, alpha, beta, isMax){
    if(d === 0 || game.game_over()){
      return chEvaluateBoard(game);
    }
    const raw = orderMoves(game._rawLegalMoves());
    if(!raw.length){
      if(game.in_check()) return isMax ? (-99000 - d*100) : (99000 + d*100);
      return 0;
    }
    if(isMax){
      let maxEval = -Infinity;
      for(const m of raw){
        const snap = game._applyMoveInternal(m, true);
        const ev = alphabeta(d - 1, alpha, beta, false);
        game._revertMoveInternal(snap, true);
        if(ev > maxEval) maxEval = ev;
        if(ev > alpha) alpha = ev;
        if(beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for(const m of raw){
        const snap = game._applyMoveInternal(m, true);
        const ev = alphabeta(d - 1, alpha, beta, true);
        game._revertMoveInternal(snap, true);
        if(ev < minEval) minEval = ev;
        if(ev < beta) beta = ev;
        if(beta <= alpha) break;
      }
      return minEval;
    }
  }

  const ordered = orderMoves(legal);
  let best = ordered[0];
  let bestVal = maximizing ? -Infinity : Infinity;
  for(const m of ordered){
    const snap = game._applyMoveInternal(m, true);
    const val = alphabeta(depth - 1, -Infinity, Infinity, !maximizing);
    game._revertMoveInternal(snap, true);
    const jitter = level === 'medium' ? (Math.random()*12 - 6) : 0;
    const total = val + jitter;
    if(maximizing ? (total > bestVal) : (total < bestVal)){
      bestVal = total;
      best = m;
    }
  }
  return best;
}

function chComputeMaterialAndCaptured(){
  const startCounts = {w:{p:8,n:2,b:2,r:2,q:1}, b:{p:8,n:2,b:2,r:2,q:1}};
  const currCounts = {w:{p:0,n:0,b:0,r:0,q:0}, b:{p:0,n:0,b:0,r:0,q:0}};
  const b = CH.game._board;
  for(let r=0; r<8; r++){
    for(let c=0; c<8; c++){
      const p = b[r][c];
      if(p && p.type !== 'k') currCounts[p.color][p.type]++;
    }
  }
  // Pieces captured BY White = missing Black pieces; captured BY Black = missing White pieces
  const capByW = [], capByB = [];
  const order = ['q','r','b','n','p'];
  const symW = {q:'♕',r:'♖',b:'♗',n:'♘',p:'♙'};
  const symB = {q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
  for(const t of order){
    const missB = Math.max(0, startCounts.b[t] - currCounts.b[t]);
    for(let i=0; i<missB; i++) capByW.push(symB[t]);
    const missW = Math.max(0, startCounts.w[t] - currCounts.w[t]);
    for(let i=0; i<missW; i++) capByB.push(symW[t]);
  }
  let matW = 0, matB = 0;
  for(const t of order){
    matW += currCounts.w[t] * (CH_VAL[t]/100);
    matB += currCounts.b[t] * (CH_VAL[t]/100);
  }
  return {capByW, capByB, diffW: Math.round(matW - matB), diffB: Math.round(matB - matW)};
}

function chGetMatchOutcome(){
  const g = CH.game;
  if(CH.resignedColor){
    const winCol = CH.resignedColor === 'w' ? 'b' : 'w';
    return {
      over: true,
      winner: winCol,
      title: winCol === 'w' ? '🏆 فاز الأبيض بالاستسلام!' : '🏆 فاز الأسود بالاستسلام!',
      reason: `استسلم اللاعب ${CH.resignedColor === 'w' ? 'الأبيض' : 'الأسود'}`
    };
  }
  if(CH.claimedDrawReason){
    return {
      over: true,
      winner: 'draw',
      title: '🤝 انتهت المباراة بالتعادل!',
      reason: CH.claimedDrawReason
    };
  }
  if(g.in_checkmate()){
    const winCol = g.turn() === 'w' ? 'b' : 'w';
    return {
      over: true,
      winner: winCol,
      title: winCol === 'w' ? '🏆 كش مات! فاز الأبيض ♔' : '🏆 كش مات! فاز الأسود ♚',
      reason: 'كش مات رسمي (Checkmate)'
    };
  }
  if(g.in_stalemate()){
    return {
      over: true,
      winner: 'draw',
      title: '🤝 تعادل بالـ Stalemate!',
      reason: 'خنق الملك — لا توجد أي نقلة قانونية والملك ليس في حالة كش'
    };
  }
  if(g.insufficient_material()){
    return {
      over: true,
      winner: 'draw',
      title: '🤝 تعادل لاستحالة الكش مات!',
      reason: 'القطع المتبقية على الرقعة لا تكفي لإماتة الملك قانونيًا (Insufficient Material)'
    };
  }
  if(g.in_fivefold_repetition()){
    return {
      over: true,
      winner: 'draw',
      title: '🤝 تعادل تلقائي (التكرار الخماسي)!',
      reason: 'تكررت نفس الوضعية ٥ مرات (Fivefold Repetition)'
    };
  }
  if(g.in_seventyfive_move_rule()){
    return {
      over: true,
      winner: 'draw',
      title: '🤝 تعادل تلقائي (قاعدة الـ 75 نقلة)!',
      reason: 'مرّت 75 نقلة كاملة بدون تحريك بيدق أو أسر قطعة'
    };
  }
  return {over: false, winner: null, title: '', reason: ''};
}

function chCheckAndRecordStats(outcome){
  if(!outcome.over || CH.statsRecorded) return;
  CH.statsRecorded = true;
  PF.st.g = (PF.st.g || 0) + 1;
  if(CH.mode === 'local'){
    if(outcome.winner === 'w' || outcome.winner === 'b') PF.st.w = (PF.st.w || 0) + 1;
    PF.st.p = (PF.st.p || 0) + 15;
  } else {
    if(outcome.winner === CH.myColor){
      PF.st.w = (PF.st.w || 0) + 1;
      PF.st.p = (PF.st.p || 0) + 25;
      beep(660,.14,'triangle',.12);confetti(28);
    } else if(outcome.winner === 'draw'){
      PF.st.p = (PF.st.p || 0) + 10;
    } else {
      beep(220,.16,'sawtooth',.1);
    }
  }
  savePF();
}

function chStartNewMatch(keepOnline=false){
  if(CH.aiTimer){ clearTimeout(CH.aiTimer); CH.aiTimer = null; }
  CH.game.reset();
  CH.selected = null;
  CH.legalForSelected = [];
  CH.pendingPromotion = null;
  CH.lastMove = null;
  CH.hintMove = null;
  CH.claimedDrawReason = null;
  CH.resignedColor = null;
  CH.statsRecorded = false;

  if(CH.mode === 'ai'){
    if(CH.playerColorPref === 'random') CH.myColor = Math.random() < 0.5 ? 'w' : 'b';
    else CH.myColor = CH.playerColorPref;
    CH.flipped = (CH.myColor === 'b');
  } else if(CH.mode === 'local'){
    CH.myColor = 'w';
    CH.flipped = false;
  } else if(CH.mode === 'online' && keepOnline){
    CH.flipped = (CH.myColor === 'b');
  }
  chRender();
  if(CH.mode === 'ai' && CH.game.turn() !== CH.myColor){
    chScheduleAIMove();
  }
}

function chScheduleAIMove(){
  if(CH.aiTimer) clearTimeout(CH.aiTimer);
  const outcome = chGetMatchOutcome();
  if(outcome.over || CH.mode !== 'ai' || CH.game.turn() === CH.myColor) return;
  CH.aiTimer = setTimeout(()=>{
    CH.aiTimer = null;
    if(CH.mode !== 'ai' || CH.game.turn() === CH.myColor) return;
    const mv = chBestMoveAI(CH.game, CH.aiLevel);
    if(mv){
      chExecuteMove(mv, false);
    }
  }, 260);
}

function chCanInteractWithBoard(){
  const outcome = chGetMatchOutcome();
  if(outcome.over) return false;
  const turn = CH.game.turn();
  if(CH.mode === 'local') return true;
  if(CH.mode === 'ai') return turn === CH.myColor;
  if(CH.mode === 'online'){
    if(!CH.code || !CH.onlinePlayers.w || !CH.onlinePlayers.b) return false;
    return turn === CH.myColor;
  }
  return false;
}

function chExecuteMove(moveSpec, broadcastOnline=true){
  const res = CH.game.move(moveSpec);
  if(!res) return false;
  CH.selected = null;
  CH.legalForSelected = [];
  CH.pendingPromotion = null;
  CH.hintMove = null;
  CH.lastMove = {from: res.from, to: res.to};

  if(CH.game.in_checkmate()){
    beep(660,.14,'triangle',.12);confetti(28);
    toast(`🏆 كش مات! (${res.san})`, 'ok');
  } else if(CH.game.in_check()){
    beep(620, .12, 'triangle', .12);
    toast(`⚠️ كش للملك ${CH.game.turn()==='w'?'الأبيض':'الأسود'}!`, 'warn');
  } else if(res.captured){
    beep(440, .07, 'sine', .08);
  } else {
    beep(520, .05, 'sine', .05);
  }

  if(CH.mode === 'local' && CH.autoFlipLocal){
    CH.flipped = (CH.game.turn() === 'b');
  }

  if(CH.mode === 'online' && broadcastOnline && CH.code){
    chPub(CH.code, 'move', {
      sender: ME,
      move: {from: res.from, to: res.to, promotion: res.promotion || null},
      fen: CH.game.fen(),
      sanHistory: CH.game.history()
    });
  }

  const outcome = chGetMatchOutcome();
  chCheckAndRecordStats(outcome);
  chRender();

  if(!outcome.over && CH.mode === 'ai' && CH.game.turn() !== CH.myColor){
    chScheduleAIMove();
  }
  return true;
}

function chOnSquareClick(sq){
  if(!chCanInteractWithBoard()) return;
  if(CH.pendingPromotion) return;

  // 1. Check if clicked square is a legal destination for the currently selected piece
  if(CH.selected){
    const matching = CH.legalForSelected.filter(m => m.to === sq);
    if(matching.length > 0){
      // Check if this move is a pawn promotion
      if(matching[0].promotion){
        CH.pendingPromotion = {from: CH.selected, to: sq, color: CH.game.turn()};
        chRender();
        return;
      }
      chExecuteMove({from: CH.selected, to: sq}, true);
      return;
    }
  }

  // 2. Otherwise, check if the clicked square contains a friendly piece to select
  const p = CH.game.get(sq);
  if(p && p.color === CH.game.turn()){
    if(CH.selected === sq){
      CH.selected = null;
      CH.legalForSelected = [];
    } else {
      CH.selected = sq;
      CH.legalForSelected = CH.game.moves({verbose:true, square:sq});
      beep(380, .04, 'sine', .04);
    }
    chRender();
  } else if(CH.selected){
    // Clicked an illegal square while a piece was selected
    CH.selected = null;
    CH.legalForSelected = [];
    chRender();
  }
}

/* ---------- Online Multiplayer Room Management ---------- */
async function chCreateOnlineRoom(){
  chLeaveRoom(false);
  CH.mode = 'online';
  CH.host = true;
  CH.code = genCode();
  const hostCol = CH.playerColorPref === 'random' ? (Math.random()<0.5?'w':'b') : CH.playerColorPref;
  CH.myColor = hostCol;
  CH.flipped = (hostCol === 'b');
  CH.onlinePlayers = {
    w: hostCol === 'w' ? me0() : null,
    b: hostCol === 'b' ? me0() : null
  };
  CH.game.reset();
  CH.lastMove = null;
  CH.claimedDrawReason = null;
  CH.resignedColor = null;

  ensureMQTT().then(()=>{
    // Re-bind subscriptions when MQTT is ready
    for(const s of CH.subs){
      NET.topics.set(s.topic, s.fn);
      if(NET.client && NET.ready){
        try{ NET.client.subscribe(s.topic, {qos:0}); }catch(e){}
      }
    }
  }).catch(()=>{});

  chSub(CH.code, 'join', pkt => {
    if(!CH.host || !pkt || !pkt.player) return;
    const guest = pkt.player;
    if(guest.pid === ME) return;
    if(pkt.via === 'public' && typeof getRoomVisibility === 'function' && getRoomVisibility('chess') === 'private'){
      chPub(CH.code, 'reject', { targetPid: guest.pid, reason: 'هذه الغرفة خاصة ولا يمكن الانضمام إليها من القائمة العامة' });
      return;
    }
    const isExistingW = CH.onlinePlayers.w && (CH.onlinePlayers.w.pid === guest.pid || (CH.onlinePlayers.w.uid && guest.uid && CH.onlinePlayers.w.uid === guest.uid && CH.onlinePlayers.w.pid !== ME));
    const isExistingB = CH.onlinePlayers.b && (CH.onlinePlayers.b.pid === guest.pid || (CH.onlinePlayers.b.uid && guest.uid && CH.onlinePlayers.b.uid === guest.uid && CH.onlinePlayers.b.pid !== ME));
    if(isExistingW){
      CH.onlinePlayers.w = guest;
    } else if(isExistingB){
      CH.onlinePlayers.b = guest;
    } else if(!CH.onlinePlayers.w && CH.onlinePlayers.b && CH.onlinePlayers.b.pid === ME){
      CH.onlinePlayers.w = guest;
    } else if(!CH.onlinePlayers.b && CH.onlinePlayers.w && CH.onlinePlayers.w.pid === ME){
      CH.onlinePlayers.b = guest;
    } else {
      chPub(CH.code, 'reject', { targetPid: guest.pid, reason: 'الغرفة مكتملة العدد (٢ لاعبين فقط)' });
      if(typeof pubDirSyncHostRoom === 'function') pubDirSyncHostRoom(true);
      return;
    }
    if(typeof pubDirClearReservation === 'function') pubDirClearReservation(guest.pid);
    toast(`🎉 انضم ${guest.name} إلى غرفة الشطرنج!`, 'ok');
    chBroadcastRoomState();
    chRender();
  });

  chSub(CH.code, 'move', pkt => {
    if(!pkt || pkt.sender === ME || !pkt.move) return;
    chExecuteMove(pkt.move, false);
  });

  chSub(CH.code, 'action', pkt => {
    if(!pkt || pkt.sender === ME) return;
    if(pkt.type === 'restart'){
      chStartNewMatch(true);
      toast('🔄 بدأ الخصم جولة جديدة!', 'ok');
    } else if(pkt.type === 'claimDraw'){
      CH.claimedDrawReason = pkt.reason || 'تعادل بالاتفاق / القواعد الرسمية';
      chRender();
    } else if(pkt.type === 'resign'){
      CH.resignedColor = pkt.color;
      if(typeof pubDirSyncHostRoom === 'function') pubDirSyncHostRoom(true);
      chRender();
    } else if(pkt.type === 'bye' && pkt.sender){
      if(CH.onlinePlayers.w && CH.onlinePlayers.w.pid === pkt.sender && pkt.sender !== ME) CH.onlinePlayers.w = null;
      if(CH.onlinePlayers.b && CH.onlinePlayers.b.pid === pkt.sender && pkt.sender !== ME) CH.onlinePlayers.b = null;
      toast('غادر اللاعب الآخر غرفة الشطرنج', 'warn');
      chBroadcastRoomState();
      chRender();
    }
  });

  if(CH.hbTimer) clearInterval(CH.hbTimer);
  CH.hbTimer = setInterval(() => {
    if(CH.code && CH.host && typeof pubDirSyncHostRoom === 'function') pubDirSyncHostRoom(false);
  }, 6000);

  chBroadcastRoomState();
  chRender();
  toast(`تم إنشاء غرفة شطرنج بكود ${CH.code}`, 'ok');
}

function chBroadcastRoomState(){
  if(!CH.code || !CH.host) return;
  chPub(CH.code, 'state', {
    code: CH.code,
    players: CH.onlinePlayers,
    fen: CH.game.fen(),
    history: CH.game.history({verbose:true}).map(m => ({from:m.from, to:m.to, promotion:m.promotion||null})),
    claimedDrawReason: CH.claimedDrawReason,
    resignedColor: CH.resignedColor
  });
  if(typeof pubDirSyncHostRoom === 'function') pubDirSyncHostRoom(true);
}

async function chJoinOnlineRoom(rawCode){
  const c = String(rawCode||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(c.length < 4){ toast('اكتب كود الغرفة الصحيح (٤-٦ حروف/أرقام)', 'warn'); return; }
  chLeaveRoom(false);
  CH.mode = 'online';
  CH.host = false;
  CH.code = c;
  CH.onlinePlayers = {w: null, b: null};
  CH.game.reset();
  CH.lastMove = null;
  CH.claimedDrawReason = null;
  CH.resignedColor = null;

  ensureMQTT().then(()=>{
    for(const s of CH.subs){
      NET.topics.set(s.topic, s.fn);
      if(NET.client && NET.ready){
        try{ NET.client.subscribe(s.topic, {qos:0}); }catch(e){}
      }
    }
    chPub(CH.code, 'join', {player: me0(), ts: Date.now()});
  }).catch(()=>{});

  chSub(CH.code, 'state', pkt => {
    if(!pkt || pkt.code !== CH.code) return;
    CH.onlinePlayers = pkt.players || {w:null, b:null};
    if(CH.onlinePlayers.w && CH.onlinePlayers.w.pid === ME) CH.myColor = 'w';
    else if(CH.onlinePlayers.b && CH.onlinePlayers.b.pid === ME) CH.myColor = 'b';
    CH.flipped = (CH.myColor === 'b');
    if(Array.isArray(pkt.history)){
      CH.game.reset();
      CH.lastMove = null;
      for(const mv of pkt.history){
        const r = CH.game.move(mv);
        if(r) CH.lastMove = {from:r.from, to:r.to};
      }
    }
    CH.claimedDrawReason = pkt.claimedDrawReason || null;
    CH.resignedColor = pkt.resignedColor || null;
    chRender();
  });

  chSub(CH.code, 'move', pkt => {
    if(!pkt || pkt.sender === ME || !pkt.move) return;
    chExecuteMove(pkt.move, false);
  });

  chSub(CH.code, 'action', pkt => {
    if(!pkt || pkt.sender === ME) return;
    if(pkt.type === 'restart'){
      chStartNewMatch(true);
      toast('🔄 تمت إعادة المباراة!', 'ok');
    } else if(pkt.type === 'claimDraw'){
      CH.claimedDrawReason = pkt.reason || 'تعادل بالقواعد الرسمية';
      chRender();
    } else if(pkt.type === 'resign'){
      CH.resignedColor = pkt.color;
      chRender();
    }
  });

  chSub(CH.code, 'reject', pkt => {
    if(pkt && pkt.targetPid === ME){
      toast(pkt.reason || 'تعذر الانضمام لغرفة الشطرنج', 'warn');
      chLeaveRoom(true);
    }
  });

  const joinVia = window._sharbJoinVia || 'code';
  chPub(CH.code, 'join', {player: me0(), via: joinVia, ts: Date.now()});
  chRender();
  toast(`جاري الاتصال بغرفة الشطرنج ${CH.code}…`, 'ok');
}

function chLeaveRoom(rerender=true){
  if(CH.aiTimer){clearTimeout(CH.aiTimer);CH.aiTimer=null;}
  if(CH.hbTimer){clearInterval(CH.hbTimer);CH.hbTimer=null;}
  if(CH.code){
    if(CH.host){
      if(typeof pubDirNotifyRoomClosed === 'function') pubDirNotifyRoomClosed('chess', CH.code);
    } else {
      chPub(CH.code, 'action', {sender: ME, type: 'bye'});
    }
  }
  chClearSubs();
  CH.code = '';
  CH.host = false;
  CH.onlinePlayers = {w: null, b: null};
  if(rerender) chRender();
}
window.chLeaveRoom = chLeaveRoom;

function chOpen(initialMode){
  if(initialMode) CH.mode = initialMode;
  ['#home','#dominoPage','#unoPage','#lobbyDomino','#lobbyUno','#lobby','#game','#bakasa','#ttt','#c4','#draw'].forEach(s=>{
    const el = $(s); if(el) el.classList.add('hide');
  });
  $('#chess').classList.remove('hide');
  $('#backHome').classList.remove('hide');
  setSharbHeaderBrand('SHARB GAMES • شطرنج CHESS','Your Ultimate Online Gaming Hub • قوانين FIDE الرسمية','♟️');
  if(CH.mode === 'ai' && CH.game.history().length === 0 && CH.game.turn() !== CH.myColor){
    chScheduleAIMove();
  }
  chRender();
  window.scrollTo(0, 0);
}
window.chOpen = chOpen;

function chRender(){
  const root = $('#ch');
  if(!root) return;
  const g = CH.game;
  const turn = g.turn();
  const inCheck = g.in_check();
  const outcome = chGetMatchOutcome();
  const {capByW, capByB, diffW, diffB} = chComputeMaterialAndCaptured();
  const hist = g.history();
  const canClaim3Fold = !outcome.over && g.in_threefold_repetition();
  const canClaim50 = !outcome.over && g.in_fifty_move_rule();

  // Player info for top & bottom bars
  const topCol = CH.flipped ? 'w' : 'b';
  const botCol = CH.flipped ? 'b' : 'w';

  const getPlayerMeta = col => {
    if(CH.mode === 'local'){
      return col === 'w'
        ? {name:'اللاعب الأبيض', av:'♔', col:'#38bdf8', tag:'الأبيض (White)'}
        : {name:'اللاعب الأسود', av:'♚', col:'#a78bfa', tag:'الأسود (Black)'};
    }
    if(CH.mode === 'ai'){
      if(col === CH.myColor){
        return {name:PF.name||'أنت', av:PF.av||'😎', col:PF.col||'#0a84ff', tag:col==='w'?'الأبيض ♔':'الأسود ♚'};
      }
      const lvlName = CH.aiLevel==='easy'?'سهل 🌱':(CH.aiLevel==='hard'?'محترف 🔥':'متوسط ⚡');
      return {name:`الكمبيوتر (${lvlName})`, av:'🤖', col:'#bf5af2', tag:col==='w'?'الأبيض ♔':'الأسود ♚'};
    }
    // Online
    const p = CH.onlinePlayers[col];
    if(p) return {name:p.name, av:p.av||'♟️', col:p.col||'#0a84ff', tag:col==='w'?'الأبيض ♔':'الأسود ♚'};
    return {name:'بانتظار صديق…', av:'⏳', col:'#64748b', tag:col==='w'?'الأبيض ♔':'الأسود ♚'};
  };

  const pTop = getPlayerMeta(topCol);
  const pBot = getPlayerMeta(botCol);

  const playerBarHTML = (meta, col) => {
    const isTurn = !outcome.over && turn === col;
    const isChk = isTurn && inCheck;
    const caps = col === 'w' ? capByW : capByB;
    const adv = col === 'w' ? diffW : diffB;
    return `<div class="ch-pbar ${isTurn?'active-turn':''} ${isChk?'in-check':''}">
      <div class="ch-pinfo">
        <span class="av sm" style="--c:${esc(meta.col)}">${esc(meta.av)}</span>
        <div>
          <div class="ch-pname">
            <span>${esc(meta.name)}</span>
            <span class="bk-chip ${col==='w'?'ac':''}" style="padding:2px 8px;font-size:11px">${meta.tag}</span>
            ${isChk ? `<span class="bk-chip bad" style="padding:2px 8px;font-size:11px">⚠️ كش!</span>` : ''}
          </div>
          <div class="ch-caps">
            ${caps.length ? caps.map(c=>`<span>${c}</span>`).join('') : `<span class="mut tiny">لا توجد قطع مأسورة بعد</span>`}
            ${adv > 0 ? `<span class="ch-adv">+${adv}</span>` : ''}
          </div>
        </div>
      </div>
      <div>
        ${isTurn
          ? `<span class="bk-chip ok" style="font-size:11px">🎯 الدور الآن</span>`
          : `<span class="bk-chip" style="font-size:11px;opacity:.65">انتظار</span>`}
      </div>
    </div>`;
  };

  // Build 8x8 squares
  const legalTargets = new Map();
  for(const m of CH.legalForSelected){
    legalTargets.set(m.to, m);
  }
  const kingInCheckSq = inCheck ? (() => {
    const krc = g._findKing(turn);
    return krc ? g._rcToSq(krc[0], krc[1]) : null;
  })() : null;

  let squaresHTML = '';
  for(let vr=0; vr<8; vr++){
    for(let vc=0; vc<8; vc++){
      const r = CH.flipped ? (7 - vr) : vr;
      const c = CH.flipped ? (7 - vc) : vc;
      const sq = g._rcToSq(r, c);
      const isLight = (r + c) % 2 === 0;
      const piece = g._board[r][c];
      const isSelected = CH.selected === sq;
      const isLastFrom = CH.lastMove && CH.lastMove.from === sq;
      const isLastTo = CH.lastMove && CH.lastMove.to === sq;
      const isHintFrom = CH.hintMove && CH.hintMove.from === sq;
      const isHintTo = CH.hintMove && CH.hintMove.to === sq;
      const isKingChk = kingInCheckSq === sq;
      const leg = legalTargets.get(sq);

      const cls = [
        'ch-sq',
        isLight ? 'light' : 'dark',
        isSelected ? 'selected' : '',
        isLastFrom ? 'last-from' : '',
        isLastTo ? 'last-to' : '',
        isHintFrom ? 'hint-from' : '',
        isHintTo ? 'hint-to' : '',
        isKingChk ? 'king-check' : ''
      ].filter(Boolean).join(' ');

      const showRank = (vc === 0) ? `<span class="ch-coord-rank">${8 - r}</span>` : '';
      const showFile = (vr === 7) ? `<span class="ch-coord-file">${String.fromCharCode(97 + c)}</span>` : '';
      const pieceSVG = piece ? `<div class="ch-piece ${isLastTo?'just-moved':''}" data-piece="${piece.color}${piece.type}">${CH_SVG[piece.color + piece.type] || ''}</div>` : '';
      const indicator = leg
        ? ((leg.captured || leg.flags === 'e') ? `<span class="ch-ring"></span>` : `<span class="ch-dot"></span>`)
        : '';

      squaresHTML += `<div class="${cls}" data-sq="${sq}">${showRank}${showFile}${pieceSVG}${indicator}</div>`;
    }
  }

  // Promotion modal overlay if pending
  let promoHTML = '';
  if(CH.pendingPromotion){
    const pCol = CH.pendingPromotion.color || turn;
    const opts = [
      {p:'q', label:'وزير (Queen)'},
      {p:'r', label:'قلعة (Rook)'},
      {p:'b', label:'فيل (Bishop)'},
      {p:'n', label:'حصان (Knight)'}
    ];
    promoHTML = `<div class="ch-promo-modal" id="chPromoModal">
      <h3 style="margin:0;font-size:18px;font-weight:900">👑 ترقية البيدق (Pawn Promotion)</h3>
      <p class="mut" style="margin:0;font-size:13px">اختر القطعة التي تريد ترقية البيدق إليها:</p>
      <div class="ch-promo-grid">
        ${opts.map(o => `<button class="ch-promo-btn" data-promo="${o.p}">
          <span class="ch-p-ico">${CH_SVG[pCol + o.p]}</span>
          <span>${o.label}</span>
        </button>`).join('')}
      </div>
      <button class="btn g" data-chact="cancelPromo" style="padding:7px 16px;font-size:12px">إلغاء النقلة</button>
    </div>`;
  }

  // SAN Move History Table
  let sanRowsHTML = '';
  if(!hist.length){
    sanRowsHTML = `<div class="empty" style="padding:14px;direction:rtl">لم تبدأ النقلات بعد — اضغط على أي قطعة للبدء!</div>`;
  } else {
    for(let i=0; i<hist.length; i+=2){
      const moveNum = (i >> 1) + 1;
      const wSan = hist[i] || '';
      const bSan = hist[i+1] || '';
      const wLatest = (i === hist.length - 1) ? 'latest' : '';
      const bLatest = (i + 1 === hist.length - 1) ? 'latest' : '';
      sanRowsHTML += `<div class="ch-san-row">
        <span class="ch-san-num">${moveNum}.</span>
        <span class="ch-san-mv ${wLatest}">${esc(wSan)}</span>
        <span class="ch-san-mv ${bLatest}">${esc(bSan)}</span>
      </div>`;
    }
  }

  // Status Banner text
  let statusTitle = '';
  let statusSub = '';
  if(outcome.over){
    statusTitle = outcome.title;
    statusSub = outcome.reason;
  } else if(inCheck){
    statusTitle = turn === 'w' ? '⚠️ كش للملك الأبيض! (Check)' : '⚠️ كش للملك الأسود! (Check)';
    statusSub = 'يجب حماية الملك أو تحريكه لمربع آمن';
  } else {
    statusTitle = turn === 'w' ? '♔ دور اللاعب الأبيض (White to move)' : '♚ دور اللاعب الأسود (Black to move)';
    statusSub = CH.mode === 'ai'
      ? (turn === CH.myColor ? 'دورك الآن — اختر قطعة لتحريكها' : 'الكمبيوتر يفكر في النقلة…')
      : (CH.mode === 'online'
          ? ((!CH.onlinePlayers.w || !CH.onlinePlayers.b) ? 'في انتظار انضمام الصديق للغرفة…' : (turn === CH.myColor ? 'دورك الآن لتحريك القطعة' : 'دور خصمك الآن…'))
          : 'اضغط على القطعة لإظهار المربعات القانونية المتاحة');
  }

  root.innerHTML = `<div class="ch-wrap">
    <section class="hero glass" style="padding:18px 20px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div>
          <h2 style="margin:0;font-size:21px">♟️ شطرنج SHARB GAMES الاحترافي</h2>
          <p class="mut" style="margin:4px 0 0;font-size:13px">قوانين الشطرنج الرسمية كاملة: التبييت، الأخذ بالتجاوز، ترقية البيدق، كش مات، وكشف حالات التعادل</p>
        </div>
        <div class="ch-ModeTabs">
          <button class="ch-tab ${CH.mode==='ai'?'on':''}" data-chmode="ai">🤖 ضد الكمبيوتر</button>
          <button class="ch-tab ${CH.mode==='local'?'on':''}" data-chmode="local">👥 لاعب ضد لاعب (نفس الجهاز)</button>
          <button class="ch-tab ${CH.mode==='online'?'on':''}" data-chmode="online">🌐 أونلاين مع صديق</button>
        </div>
      </div>
    </section>

    <div class="ch-layout">
      <div class="ch-board-col">
        ${playerBarHTML(pTop, topCol)}
        <div class="ch-board-frame">
          <div class="ch-board" id="chBoardGrid">${squaresHTML}</div>
          ${promoHTML}
        </div>
        ${playerBarHTML(pBot, botCol)}
      </div>

      <div style="display:flex;flex-direction:column;gap:14px">
        <section class="panel glass">
          <div class="ch-status-banner ${outcome.over?'over':(inCheck?'check':'')}" id="chStatusBanner">
            <div>
              <div style="font-weight:900;font-size:16px" id="chStatusTitle">${esc(statusTitle)}</div>
              <div class="mut" style="font-size:12px;margin-top:3px" id="chStatusSub">${esc(statusSub)}</div>
            </div>
            <span class="bk-chip ac">النقلة #${g._fullMoves}</span>
          </div>

          ${(canClaim3Fold || canClaim50) ? `
            <div style="margin-top:10px;padding:10px 12px;border-radius:12px;background:rgba(255,214,10,.14);border:1px solid rgba(255,214,10,.4);display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
              <span style="font-size:12px;font-weight:800;color:var(--warn)">
                ⚖️ يحق لك إعلان التعادل رسميًا (${canClaim3Fold ? 'تكرار الوضعية ٣ مرات' : 'قاعدة الـ 50 نقلة بدون بيدق أو أسر'})
              </span>
              <button class="btn warn" data-chact="claimDraw" style="padding:6px 14px;font-size:12px">🤝 إعلان التعادل الآن</button>
            </div>
          ` : ''}

          <div class="row" style="margin-top:12px;flex-wrap:wrap">
            ${CH.mode !== 'online' ? `<button class="btn g" data-chact="undo" ${hist.length===0?'disabled':''}>↩️ تراجع عن النقلة</button>` : ''}
            <button class="btn ok" data-chact="restart">🔄 إعادة المباراة</button>
            <button class="btn g" data-chact="flip">🔃 قلب الرقعة</button>
            ${CH.mode !== 'online' && !outcome.over ? `<button class="btn g" data-chact="hint">💡 اقتراح نقلة</button>` : ''}
            ${!outcome.over && hist.length >= 2 ? `<button class="btn bad" data-chact="resign" style="padding:9px 14px;font-size:12px">🏳️ استسلام</button>` : ''}
          </div>
        </section>

        ${CH.mode === 'ai' ? `
          <section class="panel glass">
            <h2>🤖 إعدادات اللعب ضد الكمبيوتر</h2>
            <div class="row" style="gap:10px;flex-wrap:wrap">
              <div style="flex:1;min-width:140px">
                <label class="lbl">مستوى الصعوبة:</label>
                <div class="quick-g-pills">
                  <div class="quick-g-pill ${CH.aiLevel==='easy'?'on':''}" data-chlvl="easy">🌱 سهل</div>
                  <div class="quick-g-pill ${CH.aiLevel==='medium'?'on':''}" data-chlvl="medium">⚡ متوسط</div>
                  <div class="quick-g-pill ${CH.aiLevel==='hard'?'on':''}" data-chlvl="hard">🔥 صعب</div>
                </div>
              </div>
              <div style="flex:1;min-width:140px">
                <label class="lbl">لون قطعك:</label>
                <div class="quick-g-pills">
                  <div class="quick-g-pill ${CH.playerColorPref==='w'?'on':''}" data-chcol="w">♔ أبيض</div>
                  <div class="quick-g-pill ${CH.playerColorPref==='b'?'on':''}" data-chcol="b">♚ أسود</div>
                  <div class="quick-g-pill ${CH.playerColorPref==='random'?'on':''}" data-chcol="random">🎲 عشوائي</div>
                </div>
              </div>
            </div>
          </section>
        ` : ''}

        ${CH.mode === 'local' ? `
          <section class="panel glass">
            <h2>👥 إعدادات اللعب المحلي (نفس الجهاز)</h2>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
              <span class="mut" style="font-size:13px">قلب الرقعة تلقائيًا بعد كل نقلة:</span>
              <button class="btn ${CH.autoFlipLocal?'ok':'g'}" data-chact="toggleAutoFlip" style="padding:7px 14px;font-size:12px">
                ${CH.autoFlipLocal ? '✅ مفعّل' : 'متوقف'}
              </button>
            </div>
          </section>
        ` : ''}

        ${CH.mode === 'online' ? `
          <section class="panel glass">
            <h2>🌐 غرفة الشطرنج الأونلاين</h2>
            ${!CH.code ? `
              <div style="margin-bottom:10px">
                <label class="lbl">اختر لونك عند إنشاء الغرفة:</label>
                <div class="quick-g-pills">
                  <div class="quick-g-pill ${CH.playerColorPref==='w'?'on':''}" data-chcol="w">♔ أبيض</div>
                  <div class="quick-g-pill ${CH.playerColorPref==='b'?'on':''}" data-chcol="b">♚ أسود</div>
                  <div class="quick-g-pill ${CH.playerColorPref==='random'?'on':''}" data-chcol="random">🎲 عشوائي</div>
                </div>
              </div>
              ${typeof buildGameVisControlHTML==='function' ? buildGameVisControlHTML('chess', false, false) : ''}
              <div class="row" style="margin-bottom:12px">
                <button class="btn ok big" data-chact="createOnline" style="width:100%">➕ إنشاء غرفة شطرنج جديدة</button>
              </div>
              <div class="row">
                <input id="chJoinCodeInp" placeholder="اكتب كود الغرفة" maxlength="6" style="text-transform:uppercase;direction:ltr;text-align:center;letter-spacing:3px;font-weight:800">
                <button class="btn" data-chact="joinOnline">🚀 انضمام</button>
              </div>
            ` : `
              <div class="mycode" style="margin-bottom:10px">
                <span>كود غرفة الشطرنج: <b id="chRoomCodeDisp">${esc(CH.code)}</b></span>
                <div style="display:flex;gap:6px">
                  <button class="mini" data-chact="copyRoom">📋 نسخ الكود</button>
                  <button class="mini del" data-chact="leaveOnline">🚪 خروج</button>
                </div>
              </div>
              ${typeof buildGameVisControlHTML==='function' ? buildGameVisControlHTML('chess', true, CH.host) : ''}
              <div class="mut tiny" style="margin-bottom:8px">ادعُ صديقًا من قائمتك للانضمام مباشرة للغرفة:</div>
              <div class="plist" id="chFriendsInviteList" style="max-height:150px">
                ${friends().length ? friends().map((f,i)=>`
                  <div class="pitem">
                    <span class="pc">
                      <span class="av sm" style="--c:${esc(f.col||'#0a84ff')}">${esc(f.av||'🙂')}</span>
                      <span><b>${esc(f.name)}</b></span>
                    </span>
                    <button class="mini ok" data-chinvf="${i}">📨 دعوة للشطرنج</button>
                  </div>
                `).join('') : `<div class="empty">أضف أصدقاء من الصفحة الرئيسية لدعوتهم بضغطة زر، أو انسخ كود الغرفة أعلاه!</div>`}
              </div>
            `}
          </section>
        ` : ''}

        <section class="panel glass">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <h2 style="margin:0">📜 سجل النقلات القياسي (SAN)</h2>
            <span class="mut tiny">قاعدة الـ50 نقلة: ${Math.floor(g._halfMoves/2)}/50</span>
          </div>
          <div class="ch-san-box" id="chSanBox">${sanRowsHTML}</div>
        </section>
      </div>
    </div>
  </div>`;

  const sanBox = $('#chSanBox');
  if(sanBox) sanBox.scrollTop = sanBox.scrollHeight;
}

// Event delegation for Chess view
$('#chess').addEventListener('click', e => {
  const sqEl = e.target.closest('[data-sq]');
  if(sqEl){
    chOnSquareClick(sqEl.dataset.sq);
    return;
  }
  const promoBtn = e.target.closest('[data-promo]');
  if(promoBtn && CH.pendingPromotion){
    const pr = promoBtn.dataset.promo;
    chExecuteMove({from: CH.pendingPromotion.from, to: CH.pendingPromotion.to, promotion: pr}, true);
    return;
  }
  const modeBtn = e.target.closest('[data-chmode]');
  if(modeBtn){
    const m = modeBtn.dataset.chmode;
    if(CH.mode !== m){
      if(CH.mode === 'online' && CH.code) chLeaveRoom(false);
      CH.mode = m;
      chStartNewMatch(false);
    }
    return;
  }
  const lvlBtn = e.target.closest('[data-chlvl]');
  if(lvlBtn){
    CH.aiLevel = lvlBtn.dataset.chlvl;
    toast(`تم ضبط مستوى الكمبيوتر إلى: ${lvlBtn.textContent.trim()}`, 'ok');
    chRender();
    return;
  }
  const colBtn = e.target.closest('[data-chcol]');
  if(colBtn){
    CH.playerColorPref = colBtn.dataset.chcol;
    if(CH.mode === 'ai'){
      chStartNewMatch(false);
    } else {
      chRender();
    }
    return;
  }
  const invBtn = e.target.closest('[data-chinvf]');
  if(invBtn){
    const f = friends()[+invBtn.dataset.chinvf];
    if(f && CH.code) dispatchInviteToFriend(f, CH.code, 'chess');
    return;
  }
  const actBtn = e.target.closest('[data-chact]');
  if(!actBtn) return;
  const act = actBtn.dataset.chact;
  if(act === 'cancelPromo'){
    CH.pendingPromotion = null;
    chRender();
  } else if(act === 'undo'){
    if(CH.aiTimer){ clearTimeout(CH.aiTimer); CH.aiTimer = null; }
    if(CH.mode === 'ai'){
      // Undo both AI move and Player move so it returns to player's turn
      CH.game.undo();
      if(CH.game.turn() !== CH.myColor) CH.game.undo();
    } else {
      CH.game.undo();
    }
    const hist = CH.game.history({verbose:true});
    CH.lastMove = hist.length ? {from:hist[hist.length-1].from, to:hist[hist.length-1].to} : null;
    CH.selected = null;
    CH.legalForSelected = [];
    CH.hintMove = null;
    CH.claimedDrawReason = null;
    CH.resignedColor = null;
    if(CH.mode === 'local' && CH.autoFlipLocal) CH.flipped = (CH.game.turn() === 'b');
    chRender();
  } else if(act === 'restart'){
    chStartNewMatch(true);
    if(CH.mode === 'online' && CH.code){
      chPub(CH.code, 'action', {sender: ME, type: 'restart'});
    }
    toast('🔄 تمت إعادة المباراة من البداية', 'ok');
  } else if(act === 'flip'){
    CH.flipped = !CH.flipped;
    chRender();
  } else if(act === 'hint'){
    const best = chBestMoveAI(CH.game, 'medium');
    if(best){
      CH.hintMove = {from: best.from, to: best.to};
      CH.selected = best.from;
      CH.legalForSelected = CH.game.moves({verbose:true, square:best.from});
      toast(`💡 اقتراح نقلة: ${best.san} (${best.from} → ${best.to})`, 'ok');
      chRender();
    }
  } else if(act === 'claimDraw'){
    const reason = CH.game.in_threefold_repetition()
      ? 'المطالبة بالتعادل لتكرار الوضعية ٣ مرات (Threefold Repetition)'
      : 'المطالبة بالتعادل لقاعدة الـ 50 نقلة (50-Move Rule)';
    CH.claimedDrawReason = reason;
    if(CH.mode === 'online' && CH.code){
      chPub(CH.code, 'action', {sender: ME, type: 'claimDraw', reason});
    }
    chCheckAndRecordStats(chGetMatchOutcome());
    chRender();
    toast('🤝 تم إعلان التعادل رسميًا!', 'ok');
  } else if(act === 'resign'){
    if(!confirm('هل أنت متأكد من الاستسلام في هذه المباراة؟')) return;
    CH.resignedColor = CH.mode === 'local' ? CH.game.turn() : CH.myColor;
    if(CH.mode === 'online' && CH.code){
      chPub(CH.code, 'action', {sender: ME, type: 'resign', color: CH.resignedColor});
    }
    chCheckAndRecordStats(chGetMatchOutcome());
    chRender();
  } else if(act === 'toggleAutoFlip'){
    CH.autoFlipLocal = !CH.autoFlipLocal;
    if(CH.autoFlipLocal) CH.flipped = (CH.game.turn() === 'b');
    chRender();
  } else if(act === 'createOnline'){
    chCreateOnlineRoom();
  } else if(act === 'joinOnline'){
    const inp = $('#chJoinCodeInp');
    if(inp) chJoinOnlineRoom(inp.value);
  } else if(act === 'copyRoom'){
    if(CH.code) copyText(CH.code);
  } else if(act === 'leaveOnline'){
    chLeaveRoom(true);
  }
});

if($('#goChess')) $('#goChess').onclick = () => chOpen();


/* ================= MULTI-PAGE INITIALIZATION & SESSION PERSISTENCE FOR CHESS ================= */
function chSaveSession() {
  SharbSession.saveGameSession('chess', {
    mode: CH.mode,
    aiLevel: CH.aiLevel,
    playerColorPref: CH.playerColorPref,
    myColor: CH.myColor,
    flipped: CH.flipped,
    autoFlipLocal: CH.autoFlipLocal,
    fen: CH.game.fen(),
    history: CH.game.history({ verbose: true }).map(m => ({ from: m.from, to: m.to, promotion: m.promotion || null })),
    code: CH.code,
    host: CH.host,
    onlinePlayers: CH.onlinePlayers,
    claimedDrawReason: CH.claimedDrawReason,
    resignedColor: CH.resignedColor
  });
}

const _origChRender = chRender;
chRender = function() {
  _origChRender();
  chSaveSession();
};

function chRestoreSession() {
  const saved = SharbSession.loadGameSession('chess');
  if (!saved) return false;
  CH.mode = saved.mode || 'ai';
  CH.aiLevel = saved.aiLevel || 'medium';
  CH.playerColorPref = saved.playerColorPref || 'w';
  CH.myColor = saved.myColor || 'w';
  CH.flipped = !!saved.flipped;
  CH.autoFlipLocal = !!saved.autoFlipLocal;
  CH.claimedDrawReason = saved.claimedDrawReason || null;
  CH.resignedColor = saved.resignedColor || null;
  if (Array.isArray(saved.history) && saved.history.length > 0) {
    CH.game.reset();
    for (const mv of saved.history) {
      const r = CH.game.move(mv);
      if (r) CH.lastMove = { from: r.from, to: r.to };
    }
  } else if (saved.fen) {
    CH.game.load(saved.fen);
  }
  if (saved.mode === 'online' && saved.code) {
    if (saved.host) {
      chCreateOnlineRoom();
    } else {
      chJoinOnlineRoom(saved.code);
    }
    return true;
  }
  return true;
}

function initChessPage() {
  const qs = new URLSearchParams(window.location.search);
  const qRoom = (qs.get('room') || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const qAction = qs.get('action') || '';
  const qVis = qs.get('vis') || '';
  const intent = SharbSession.consumeRoomIntent('chess');

  if (qVis === 'private' || qVis === 'public') setRoomVisibility('chess', qVis, true);
  if (intent && intent.visibility) setRoomVisibility('chess', intent.visibility, true);
  if (intent && intent.roomName) SHARB_ROOM_CFG.roomNames.chess = intent.roomName;

  if (qAction === 'create' || qAction === 'arena' || (intent && intent.action === 'create')) {
    chCreateOnlineRoom();
    return;
  }
  if (qRoom || (intent && intent.action === 'join' && intent.code)) {
    const targetCode = qRoom || intent.code;
    window._sharbJoinVia = (qs.get('via') === 'public' || (intent && intent.via === 'public')) ? 'public' : 'code';
    chJoinOnlineRoom(targetCode);
    return;
  }

  chRestoreSession();
  chRender();
  if (CH.mode === 'ai' && CH.game.turn() !== CH.myColor && !chGetMatchOutcome().over) {
    chScheduleAIMove();
  }
}

document.addEventListener('DOMContentLoaded', initChessPage);
window.addEventListener('beforeunload', chSaveSession);
