/* ==========================================================================
   SHARB GAMES — DOMINO STANDALONE GAME MODULE (js/games/domino.js)
   Preserves full game rules, AI bots, team mode, MQTT + BroadcastChannel sync,
   and cross-page session persistence.
   ========================================================================== */
GAME_TYPE = 'domino';
window.DEFAULT_GAME_TYPE = 'domino';
let host = false, code = '', lobbyPl = [], lobbyMeta = { n: 4, tm: true, mode: 'draw', open: false, target: 100 };

function getPlayersConfig(){
  const gt = GAME_TYPE === 'uno' ? 'uno' : 'domino';
  const d = LOBBY_DRAFT[gt] || LOBBY_DRAFT.domino;
  const maxAllowed = gt === 'uno' ? 10 : 4;
  const n = Math.max(2, Math.min(maxAllowed, parseInt(d.n, 10) || 4));
  const tm = !!d.tm;
  const allowUneven = !!d.allowUneven || (tm && (n % 2 === 1));
  const fillBots = d.fillBots !== false;
  return { n, tm, allowUneven, fillBots };
}

function syncLobbyConfigUI(){
  const gt = GAME_TYPE === 'uno' ? 'uno' : 'domino';
  const d = LOBBY_DRAFT[gt];
  const maxCap = gt === 'uno' ? 10 : 4;
  if(d.n > maxCap) d.n = maxCap;
  if(d.n < 2) d.n = 2;
  if(d.tm && (d.n % 2 === 1)) d.allowUneven = true;

  // Update Mode Buttons (Individual vs Teams)
  const soloBtn = $('#lobModeSoloBtn');
  const teamBtn = $('#lobModeTeamBtn');
  if(soloBtn) soloBtn.classList.toggle('on', !d.tm);
  if(teamBtn) teamBtn.classList.toggle('on', !!d.tm);

  if($('#lobModeSoloTitle')){
    $('#lobModeSoloTitle').textContent = gt === 'uno' ? 'أونو فردي كلاسيكي (Individual UNO)' : 'دومينو فردي (Individual Domino)';
    $('#lobModeSoloSub').textContent = gt === 'uno' ? 'كل لاعب ينافس لحسابه الخاص (٢–١٠ لاعبين)' : 'كل لاعب ينافس لحسابه الخاص (٢–٤ لاعبين)';
  }
  if($('#lobModeTeamTitle')){
    $('#lobModeTeamTitle').textContent = gt === 'uno' ? 'أونو فرق (Team UNO — فريق أ ضد ب)' : 'دومينو فرق (Team Domino — فريق أ ضد ب)';
    $('#lobModeTeamSub').textContent = gt === 'uno' ? 'اختر فريقك قبل البدء (1v1، 2v1، 2v2 حتى 5v5)' : 'اختر فريقك قبل البدء (1v1، 2v1، أو 2v2)';
  }

  // Render Capacity Pills (2..10 for UNO, 2..4 for Domino)
  const capWrap = $('#lobbyCapPills');
  if(capWrap){
    const caps = gt === 'uno' ? [2,3,4,5,6,7,8,9,10] : [2,3,4];
    capWrap.innerHTML = caps.map(c => `<button type="button" class="lob-cap-pill ${d.n === c ? 'on' : ''}" data-lob-cap="${c}">${c} لاعبين</button>`).join('');
  }

  // Keep legacy #np select synced
  const npSel = $('#np');
  if(npSel){
    if(d.n === 4) npSel.value = d.tm ? '4-team' : '4-solo';
    else npSel.value = String(d.n);
  }

  // Target input
  const tgInp = $('#tg');
  if(tgInp && document.activeElement !== tgInp){
    tgInp.value = String(d.target || (gt === 'uno' ? 500 : 100));
  }

  // Uneven teams & Fill bots toggles
  const allowWrap = $('#allowUnevenWrap');
  const allowChk = $('#allowUnevenTgl');
  if(allowWrap) allowWrap.classList.toggle('hide', !d.tm);
  if(allowChk) allowChk.checked = !!d.allowUneven;

  const fillChk = $('#fillBotsTgl');
  if(fillChk) fillChk.checked = d.fillBots !== false;

  // If currently hosting an open room in lobby, live-sync lobbyMeta to guests & Public Directory!
  if(typeof host !== 'undefined' && host && typeof code !== 'undefined' && code && !G){
    lobbyMeta.n = d.n;
    lobbyMeta.tm = !!d.tm;
    lobbyMeta.allowUneven = !!d.allowUneven;
    lobbyMeta.fillBots = d.fillBots !== false;
    lobbyMeta.target = parseInt(d.target, 10) || (gt === 'uno' ? 500 : 100);
    renderRoomPlayers();
    broadcastLobby();
  }
}
window.syncLobbyConfigUI = syncLobbyConfigUI;


async function createRoom(){
  if(code&&host)return;
  if(code&&!host)teardownNet(false);
  if(G){G=null;showScreen('lobby');closeOverlay()}
  host=true;NET.want=true;
  let parsedTarget = parseInt($('#tg').value, 10);
  if (isNaN(parsedTarget) || parsedTarget <= 0) parsedTarget = GAME_TYPE === 'uno' ? 500 : 100;
  LOBBY_DRAFT[GAME_TYPE === 'uno' ? 'uno' : 'domino'].target = parsedTarget;
  const cfg = getPlayersConfig();
  if(GAME_TYPE==='uno'){
    lobbyMeta={
      gameType:'uno',
      n:Math.max(2,Math.min(10,cfg.n)),
      tm:!!cfg.tm,
      allowUneven:!!cfg.allowUneven,
      fillBots:cfg.fillBots!==false,
      mode:'uno',
      open:false,
      target:parsedTarget
    };
  }else{
    lobbyMeta={
      gameType:'domino',
      n:Math.max(2,Math.min(4,cfg.n)),
      tm:!!cfg.tm,
      allowUneven:!!cfg.allowUneven,
      fillBots:cfg.fillBots!==false,
      mode:selectedMode(),
      open:$('#openTgl').checked,
      target:parsedTarget
    };
  }
  const hostMe = me0();
  hostMe.team = 0;
  lobbyPl=[hostMe];
  code=genCode();
  $('#rm').classList.remove('hide');$('#joinEmpty').classList.add('hide');
  $('#rc').textContent=code;$('#go').classList.remove('hide');
  renderRoomPlayers();
  openHostRoom();
  ensureMQTT().then(ok=>{
    if(host&&code){
      hostBeat();
      broadcastLobby();
      if(typeof pubDirSyncHostRoom==='function')pubDirSyncHostRoom(true);
    }
  }).catch(()=>{});
}
function openHostRoom(){
  const c=code;
  NET.guests.clear();
  sub(roomTopic(c,'join'),d=>hostRoute('join',d));
  sub(roomTopic(c,'act'),d=>hostRoute('act',d));
  sub(roomTopic(c,'bye'),d=>hostRoute('bye',d));
  sub(roomTopic(c,'hb'),d=>hostRoute('hb',d));
  hostBeat();
  broadcastLobby();
  if(typeof updateDominoUnoVisUI==='function')updateDominoUnoVisUI();
  if(typeof pubDirSyncHostRoom==='function')pubDirSyncHostRoom(true);
  clearInterval(NET.hostTimer);
  NET.hostTimer=setInterval(()=>{
    if(!host||code!==c)return;
    hostBeat();
    const now=Date.now();
    [...NET.guests.keys()].forEach(pid=>{
      const g=NET.guests.get(pid);
      if(!g||now-(g.last||0)>20000)hostGuestGone(pid);
    });
  },4500);
  setNetStatus('الغرفة شغالة ✅ ابعت الكود لصحابك','ok');
  beep(600,.1,'sine',.1);
}
function hostBeat(){
  if(!host||!code)return;
  pub(roomTopic(code,'beat'),{t:'beat',h:ME,code,ts:Date.now(),closed:false},{retain:true});
  if(typeof pubDirSyncHostRoom==='function')pubDirSyncHostRoom(false);
}
function hostRoute(kind,d){
  if(!host||!d||typeof d!=='object')return;
  if(kind==='join'){hostIncoming(d)}
  else if(kind==='act'){
    const pid=d.pid||(d.me&&d.me.pid);
    if(!pid||!d.a)return;
    // Allow lobby team selection before the match starts
    if(!G && d.a.t==='setTeam'){
      const targetPid = (pid===ME && d.a.targetPid) ? d.a.targetPid : pid;
      const p = lobbyPl.find(x => x.pid === targetPid);
      if(p){
        p.team = d.a.team === 1 ? 1 : 0;
        renderRoomPlayers();
        broadcastLobby();
      }
      return;
    }
    applyAct(d.a,pid);
  }else if(kind==='hb'){
    const pid=d.pid||(d.me&&d.me.pid);
    if(!pid)return;
    const g=NET.guests.get(pid);
    if(g){g.last=Date.now();if(G)broadcastState()}
    else if(d.me)hostIncoming({t:'join',me:d.me,via:d.via});
  }else if(kind==='bye'){
    if(d.pid)hostGuestGone(d.pid);
  }
}
function hostIncoming(d){
  const me=d&&d.me;
  if(!me||!me.pid)return;
  me.name=String(me.name||'لاعب').slice(0,14);
  me.av=String(me.av||'🙂').slice(0,4);
  me.col=String(me.col||COLS[0]).slice(0,9);
  me.uid=String(me.uid||me.pid).slice(0,12);
  const pid=me.pid;
  if(d.via==='public' && typeof getRoomVisibility==='function' && getRoomVisibility(GAME_TYPE)==='private'){
    pub(roomTopic(code,'err'),{t:'err',pid,rejected:true,reason:'private',msg:'هذه الغرفة خاصة ولا يمكن الانضمام إليها من القائمة العامة'});
    return;
  }
  const maxAllowed = GAME_TYPE === 'uno' ? Math.max(2, Math.min(10, +lobbyMeta.n || 4)) : Math.max(2, Math.min(4, +lobbyMeta.n || 4));
  lobbyMeta.n = maxAllowed;
  const existingIdx=lobbyPl.findIndex(p=>p.pid===pid||(p.uid&&me.uid&&p.uid===me.uid&&p.pid!==ME));
  if(G){
    const seat=G.seats.find(s=>s.pid===pid||(s.uid&&s.uid===me.uid&&s.bot));
    if(seat){
      NET.guests.set(pid,{last:Date.now(),me});
      seat.pid=pid;seat.bot=false;seat.name=me.name;seat.av=me.av;seat.col=me.col;
      broadcastLobby();broadcastState();render();
      if(typeof pubDirClearReservation==='function')pubDirClearReservation(pid);
      toast(me.name+' رجع للعبة ✅','ok');beep(520,.08,'sine',.08);
    }else{
      pub(roomTopic(code,'err'),{t:'err',pid,rejected:true,reason:'playing',msg:'اللعبة بدأت خلاص — استنى الجولة الجاية'});
    }
    return;
  }
  if(existingIdx<0 && lobbyPl.length>=maxAllowed){
    pub(roomTopic(code,'err'),{t:'err',pid,rejected:true,reason:'full',msg:`الغرفة مكتملة العدد (${maxAllowed}/${maxAllowed} لاعبين)`});
    if(typeof pubDirSyncHostRoom==='function')pubDirSyncHostRoom(true);
    return;
  }
  const known=NET.guests.has(pid)||existingIdx>=0;
  NET.guests.set(pid,{last:Date.now(),me});
  if(typeof pubDirClearReservation==='function')pubDirClearReservation(pid);
  if(existingIdx>=0){
    me.team = typeof lobbyPl[existingIdx].team === 'number' ? lobbyPl[existingIdx].team : (typeof me.team === 'number' ? me.team : (existingIdx % 2));
    lobbyPl[existingIdx]=me;
  }else{
    // Auto-assign new joiner to the smaller team so teams start balanced
    const cntA = lobbyPl.filter(p => (p.team || 0) === 0).length;
    const cntB = lobbyPl.filter(p => p.team === 1).length;
    me.team = cntA <= cntB ? 0 : 1;
    lobbyPl.push(me);
  }
  renderRoomPlayers();broadcastLobby();
  if(!known){
    toast(me.name+' دخل الغرفة 🎉','ok');
    beep(520,.08,'sine',.08);
  }
}
function hostGuestGone(pid){
  if(!pid)return;
  NET.guests.delete(pid);
  const before=lobbyPl.length;
  lobbyPl=lobbyPl.filter(p=>p.pid!==pid);
  if(lobbyPl.length!==before){renderRoomPlayers();broadcastLobby()}
  if(G){
    const i=G.seats.findIndex(s=>s.pid===pid);
    if(i>=0&&!G.seats[i].bot){
      G.seats[i].bot=true;
      G.seats[i].name=(G.seats[i].name+' 🤖').slice(0,16);
      G.msg=G.seats[i].name+' خرج — بيلعب بوت';
      toast(G.seats[i].name+' خرج، كمّلنا ببوت','warn');
      broadcastState();render();scheduleBot();
    }
  }
}
function broadcastLobby(){
  if(!host||!code)return;
  pub(roomTopic(code,'lobby'),{t:'lobby',lp:lobbyPl,meta:lobbyMeta,code,host:ME},{qos:1});
  if(typeof pubDirSyncHostRoom==='function')pubDirSyncHostRoom(true);
}
function broadcastState(){
  syncLog();
  if(!host||!G||!code)return;
  pub(roomTopic(code,'state'),{t:'state',g:G},{qos:1});
  if(typeof pubDirSyncHostRoom==='function')pubDirSyncHostRoom(true);
}

/* ---------- guest ---------- */
async function joinRoom(raw){
  const c=String(raw||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(c.length<4)return toast('اكتب كود غرفة صحيح','warn');
  if(host&&code===c)return toast('انت صاحب الغرفة، ابعت الكود لصحابك 😄');
  if(!host&&code===c&&NET.want)return;
  teardownNet(false);
  if(G){G=null;showScreen('lobby');closeOverlay()}
  host=false;NET.want=true;code=c;
  $('#home').classList.add('hide');
  $('#lobby').classList.remove('hide');
  $('#game').classList.add('hide');
  $('#backHome').classList.remove('hide');
  $('#rm').classList.remove('hide');$('#joinEmpty').classList.add('hide');
  $('#rc').textContent=code;$('#go').classList.add('hide');
  lobbyPl=[];renderRoomPlayers();
  setNetStatus('بندور على الغرفة '+c+'…');
  openGuestRoom();
  ensureMQTT().then(ok=>{
    if(ok&&NET.want&&code===c)guestHello();
  }).catch(()=>{});
}
function openGuestRoom(){
  const c=code;
  NET.guests.clear();NET.lastBeat=0;NET.notFound=false;
  sub(roomTopic(c,'lobby'),d=>guestIncoming('lobby',d));
  sub(roomTopic(c,'state'),d=>guestIncoming('state',d));
  sub(roomTopic(c,'beat'),d=>guestIncoming('beat',d));
  sub(roomTopic(c,'err'),d=>guestIncoming('err',d));
  guestHello();
  clearInterval(NET.guestTimer);
  NET.guestTimer=setInterval(()=>{
    if(!NET.want||code!==c)return;
    guestHb();
    checkHost();
  },5000);
  clearTimeout(NET.joinTimer);
  NET.joinTimer=setTimeout(()=>{
    if(NET.want&&code===c&&!NET.lastBeat)roomNotFound();
  },5200);
}
function guestHello(){
  if(!NET.want)return;
  const via=window._sharbJoinVia||'code';
  pub(roomTopic(code,'join'),{t:'join',me:me0(),via});
  guestHb();
}
function guestHb(){
  if(!NET.want)return;
  const via=window._sharbJoinVia||'code';
  pub(roomTopic(code,'hb'),{t:'hb',pid:ME,me:me0(),via,ts:Date.now()});
  if(!lobbyPl.length)pub(roomTopic(code,'join'),{t:'join',me:me0(),via});
}
function roomNotFound(){
  if(NET.notFound)return;
  NET.notFound=true;
  setNetStatus('مفيش غرفة بالكود '+code+' — اتأكد من الكود','warn');
  toast('مفيش غرفة بالكود '+code+' — اتأكد منه أو ابعت الكود لصاحبك','warn',4500);
}
function checkHost(){
  if(!NET.lastBeat||NET.notFound)return;
  const age=Date.now()-NET.lastBeat;
  if(age>16000){setNetStatus('المضيف مش متصل — بنحاول نرجع…','warn');return}
  if(G&&G.phase==='play'){setNetStatus('في اللعبة ✅','ok');return}
  if(age<12000&&lobbyPl.length)setNetStatus('متصل ✅ '+lobbyPl.length+' لاعبين — مستني المضيف','ok');
}
function guestIncoming(kind,d){
  if(!d||typeof d!=='object')return;
  if(d.pid&&d.pid!==ME&&kind==='err')return;
  if(kind==='beat'){
    if(d.closed){
      NET.want=false;
      setNetStatus('المضيف قفل الغرفة','warn');
      toast('المضيف قفل الغرفة','warn');
      return;
    }
    NET.lastBeat=Math.max(NET.lastBeat||0,d.ts||Date.now());
    return;
  }
  NET.lastBeat=Date.now();
  if(kind==='lobby'){
    lobbyPl=Array.isArray(d.lp)?d.lp:[];
    if(d.meta){
      lobbyMeta=Object.assign(lobbyMeta,d.meta);
      if(d.meta.gameType && (d.meta.gameType==='uno'||d.meta.gameType==='domino') && GAME_TYPE!==d.meta.gameType){
        GAME_TYPE=d.meta.gameType;
      }
    }
    if(d.code){code=d.code;$('#rc').textContent=code}
    $('#rm').classList.remove('hide');$('#joinEmpty').classList.add('hide');
    renderRoomPlayers();
    if(!G)setNetStatus(`متصل ✅ (${lobbyPl.length}/${lobbyMeta.n||4} لاعبين) — بانتظار بدء المضيف`,'ok');
  }else if(kind==='state'){
    const wasLobby=!G;
    G=d.g;
    if(wasLobby&&G&&G.phase!=='lobby'&&G.phase!=='over'){
      showScreen('game');
      if(!host){toast('بدأت اللعبة — بالتوفيق! 🁫','ok');setNetStatus('في اللعبة ✅','ok')}
    }
    if(G&&G.phase==='play')closeResultIfNeeded();
    render();
  }else if(kind==='err'){
    toast(d.msg||'خطأ','warn');
    setNetStatus(d.msg||'مشكلة','warn');
    if(d.rejected && !lobbyPl.some(p=>p.pid===ME)){
      teardownNet(true);
      renderRoom();
      if(window._sharbJoinVia==='public'){
        window._sharbJoinVia='code';
        showScreen('home');
      }
    }
  }
}
function teardownNet(reload){
  NET.want=false;
  clearInterval(NET.hostTimer);clearInterval(NET.guestTimer);clearTimeout(NET.joinTimer);
  NET.hostTimer=null;NET.guestTimer=null;NET.joinTimer=null;
  NET.lastBeat=0;NET.notFound=false;
  if(code&&host&&typeof pubDirNotifyRoomClosed==='function'){
    pubDirNotifyRoomClosed(GAME_TYPE,code);
  }
  if(code){
    const c=code;
    if(host)pub(roomTopic(c,'beat'),{t:'beat',closed:true,ts:Date.now()},{retain:true});
    else pub(roomTopic(c,'bye'),{t:'bye',pid:ME});
    ['join','act','bye','hb','lobby','state','beat','err'].forEach(k=>unsub(roomTopic(c,k)));
  }
  NET.guests.clear();
  if(reload){host=false;code='';lobbyPl=[];if(typeof updateDominoUnoVisUI==='function')updateDominoUnoVisUI();}
}


function roomLink(){return buildInviteUrl(code,GAME_TYPE)}
function shareInvite(f,silent){
  if(!code)return;
  const text=`تعالى نلعب ${GAME_TYPE==='uno'?'UNO 🎴':'دومينو 🁫'}!\nكود الغرفة: ${code}\n${roomLink()}`;
  if(navigator.share&&!silent){navigator.share({title:'SHARB GAMES',text}).catch(()=>{});return}
  copyText(text);
}

/* ================= game state ================= */
let G=null,mode='draw',pending=-1,hintIdx=-1,lastLen=0,lastTurn=-1,rec=false,resultKey='',botTimer=null;
let unoPendingColor=false,unoPendingWild=null; // for wild/wild draw4
let unoLastUnoAt=0; // track for penalty window in UI if needed
const UNO_COLORS=['red','blue','green','yellow'];
const selectedMode=()=>mode;
const seatTeam=i=>{
  if(!G||!G.seats||!G.seats[i]) return i%2;
  return (typeof G.seats[i].team === 'number') ? G.seats[i].team : (i%2);
};
const sc=i=>(G&&G.tm)?seatTeam(i):i;
const unoStep=(from,steps=1)=>{
  if(!G||!G.n) return 0;
  return ((from + G.dir * steps) % G.n + G.n) % G.n;
};
const mySeat=()=>G?G.seats.findIndex(s=>s.pid===ME):-1;
const ends=()=>G.chain.length?[G.chain[0].a,G.chain[G.chain.length-1].b]:null;
const pipSum=h=>h.reduce((s,t)=>s+t[0]+t[1],0);
const cmpTile=(x,y)=>{
  const dx=x[0]===x[1]?1:0,dy=y[0]===y[1]?1:0;
  if(dx!==dy)return dy-dx;
  const sx=x[0]+x[1],sy=y[0]+y[1];
  if(sx!==sy)return sy-sx;
  return Math.max(y[0],y[1])-Math.max(x[0],x[1]);
};
function tileFits(t){
  if(!t||!G)return false;
  const e=ends();
  if(!e)return !G.must||(t[0]===G.must[0]&&t[1]===G.must[1]);
  return t.includes(e[0])||t.includes(e[1]);
}
const canPlaySeat=i=>!!G.hands[i]&&G.hands[i].some(tileFits);
function endCount(chain){
  if(!chain||!chain.length)return 0;
  const L=chain[0],R=chain[chain.length-1];
  if(chain.length===1)return L.a===L.b?L.a*2:L.a+L.b;
  const lv=L.a===L.b?L.a*2:L.a;
  const rv=R.a===R.b?R.a*2:R.b;
  return lv+rv;
}
function chainAfter(idx,side){
  const t=G.hands[G.turn][idx],e=ends();
  if(!e)return [{a:t[0],b:t[1]}];
  if(side==='L')return [{a:t[0]===e[0]?t[1]:t[0],b:e[0]}].concat(G.chain);
  return G.chain.concat([{a:e[1],b:t[0]===e[1]?t[1]:t[0]}]);
}

/* ================= start / deal / team validation ================= */
function buildPlannedSeats(meta, playersList, gt){
  const maxAllowed = gt === 'uno' ? 10 : 4;
  const cap = Math.max(2, Math.min(maxAllowed, +meta.n || 4));
  const fillBots = meta.fillBots !== false;
  const humans = (playersList || []).slice(0, cap).map((p, idx) => ({
    pid: p.pid,
    uid: p.uid || p.pid,
    name: p.name || 'لاعب',
    av: p.av || '🙂',
    col: p.col || COLS[idx % COLS.length],
    st: p.st || null,
    bot: false,
    team: typeof p.team === 'number' ? (p.team === 1 ? 1 : 0) : (idx % 2)
  }));
  const seats = humans.slice();
  const targetCount = (fillBots || seats.length < 2) ? cap : Math.max(2, seats.length);
  let b = 0;
  while(seats.length < targetCount){
    b++;
    const i = seats.length;
    let botTeam = i % 2;
    if(meta.tm){
      const cntA = seats.filter(s => s.team === 0).length;
      const cntB = seats.filter(s => s.team === 1).length;
      botTeam = cntA <= cntB ? 0 : 1;
    }
    seats.push({
      pid: 'bot_' + i + '_' + rnd(9999),
      uid: 'bot_' + i,
      name: 'بوت ' + b,
      av: BOT[(b - 1) % BOT.length],
      col: COLS[(i + 2) % COLS.length],
      bot: true,
      team: botTeam
    });
  }
  // If 4-player 2v2 team mode, interleave Team A and Team B around the table (A, B, A, B) while keeping chosen teams
  if(meta.tm && seats.length === 4){
    const tA = seats.filter(s => s.team === 0);
    const tB = seats.filter(s => s.team === 1);
    if(tA.length === 2 && tB.length === 2){
      return [tA[0], tB[0], tA[1], tB[1]];
    }
  }
  return seats;
}

function validateLobbyTeamConfig(meta, playersList, gt){
  const seats = buildPlannedSeats(meta, playersList, gt);
  if(!meta.tm){
    return { ok: seats.length >= 2, reason: '', seats, cntA: 0, cntB: 0 };
  }
  const cntA = seats.filter(s => s.team === 0).length;
  const cntB = seats.filter(s => s.team === 1).length;
  if(cntA < 1 || cntB < 1){
    return {
      ok: false,
      reason: '⚠️ يجب أن يضم كل فريق (فريق أ 🔵 وفريق ب 🔴) لاعبًا واحدًا على الأقل قبل بدء المباراة!',
      seats, cntA, cntB
    };
  }
  if(!meta.allowUneven && cntA !== cntB){
    return {
      ok: false,
      reason: `⚠️ الفرق غير متساوية العدد (${cntA} في فريق أ ضد ${cntB} في فريق ب) — وازن الفريقين أو فعّل «السماح بفرق غير متساوية»`,
      seats, cntA, cntB
    };
  }
  return {
    ok: true,
    reason: `✅ توزيع الفرق جاهز: 🔵 فريق أ (${cntA}) ضد 🔴 فريق ب (${cntB})`,
    seats, cntA, cntB
  };
}
window.validateLobbyTeamConfig = validateLobbyTeamConfig;

function requestSetPlayerTeam(targetPid, teamVal){
  const t = teamVal === 1 ? 1 : 0;
  if(host || !code){
    const p = lobbyPl.find(x => x.pid === (targetPid || ME));
    if(p){
      p.team = t;
      renderRoomPlayers();
      if(host && code) broadcastLobby();
    }
    return;
  }
  pub(roomTopic(code, 'act'), { t: 'act', pid: ME, a: { t: 'setTeam', team: t, targetPid: targetPid || ME } }, { qos: 1 });
}
window.requestSetPlayerTeam = requestSetPlayerTeam;

function startGame(){
  if(!host)return;
  if(!lobbyPl.length){
    const m = me0();
    m.team = 0;
    lobbyPl = [m];
  }
  const meta=Object.assign({},lobbyMeta);
  const gt=GAME_TYPE;
  if(gt==='uno'){
    if(meta.n>10) meta.n=10;
    if(meta.n<2) meta.n=2;
  }else{
    if(meta.n>4) meta.n=4;
    if(meta.n<2) meta.n=2;
  }
  const check = validateLobbyTeamConfig(meta, lobbyPl, gt);
  if(!check.ok){
    toast(check.reason || 'تأكد من توازن الفرق أولًا', 'warn', 4200);
    return;
  }
  const plannedSeats = check.seats;
  G={
    phase:'play',
    type:gt,
    mode:gt==='uno'?'uno':(meta.mode||'draw'),
    open:!!meta.open&&gt!=='uno',
    n:plannedSeats.length,
    maxPlayers:+meta.n||plannedSeats.length,
    tm:!!meta.tm,
    allowUneven:!!meta.allowUneven,
    teamsLocked:true,
    target:+meta.target||(gt==='uno'?500:100),
    seats:plannedSeats,
    hands:[],chain:[],yard:[],turn:0,passes:0,scores:[],round:0,msg:'',res:null,must:null,last:null,
    dir:1, // 1 forward, -1 reverse
    color:null, // active color for UNO
    uno:null, // {seat, deadline, called}
    drawPile:[], discard:[],
    unoWindow:4000
  };
  G.scores = G.tm ? [0,0] : G.seats.map(()=>0);
  G.round=0;rec=false;resultKey='';pending=-1;hintIdx=-1;lastLen=0;lastTurn=-1;unoPendingColor=false;unoPendingWild=null;
  deal();
  showScreen('game');
  closeOverlay();
  broadcastState();
  render();
  scheduleBot();
  beep(420,.1,'sine',.09);
}
function soloGame(){
  teardownNet(false);
  host=true;code='';
  const m = me0();
  m.team = 0;
  lobbyPl=[m];
  let parsedTarget = parseInt($('#tg').value, 10);
  if (isNaN(parsedTarget) || parsedTarget <= 0) parsedTarget = GAME_TYPE === 'uno' ? 500 : 100;
  const cfg = getPlayersConfig();
  if(GAME_TYPE==='uno'){
    lobbyMeta={
      gameType:'uno',
      n:Math.max(2,Math.min(10,cfg.n)),
      tm:!!cfg.tm,
      allowUneven:!!cfg.allowUneven,
      fillBots:true,
      mode:'uno',
      open:false,
      target:parsedTarget
    };
  }else{
    lobbyMeta={
      gameType:'domino',
      n:Math.max(2,Math.min(4,cfg.n)),
      tm:!!cfg.tm,
      allowUneven:!!cfg.allowUneven,
      fillBots:true,
      mode:selectedMode(),
      open:$('#openTgl').checked,
      target:parsedTarget
    };
  }
  startGame();
}
function shuffleArr(a){for(let i=a.length-1;i>0;i--){const j=rnd(i+1);const tmp=a[i];a[i]=a[j];a[j]=tmp}return a}
function buildUnoDeck(numPlayers){
  const deck=[];
  const colors=['red','blue','green','yellow'];
  const copies = (numPlayers && numPlayers > 6) ? 2 : 1; // 2 decks (216 cards) for 7-10 players so draw pile stays rich
  for(let cp=0; cp<copies; cp++){
    colors.forEach(c=>{
      deck.push({type:'num',color:c,val:0});
      for(let v=1;v<=9;v++){deck.push({type:'num',color:c,val:v}); deck.push({type:'num',color:c,val:v});}
      deck.push({type:'skip',color:c}); deck.push({type:'skip',color:c});
      deck.push({type:'reverse',color:c}); deck.push({type:'reverse',color:c});
      deck.push({type:'draw2',color:c}); deck.push({type:'draw2',color:c});
    });
    for(let i=0;i<4;i++){deck.push({type:'wild'}); deck.push({type:'wild4'});}
  }
  shuffleArr(deck);
  return deck;
}
function deal(){
  if(G.type==='uno'){
    const deck=buildUnoDeck(G.n);
    G.hands=G.seats.map(()=>deck.splice(0,7));
    G.drawPile=deck;
    G.discard=[];
    // flip first card (cannot be wild4)
    let safety=0;
    let first=G.drawPile.pop();
    while(first && first.type==='wild4' && safety<20){
      G.drawPile.unshift(first);
      shuffleArr(G.drawPile);
      first=G.drawPile.pop();
      safety++;
    }
    G.discard.push(first);
    G.color=first.color||UNO_COLORS[rnd(UNO_COLORS.length)];
    G.dir=1;G.passes=0;G.res=null;G.uno=null;G.phase='play';
    G.round=(G.round||0)+1;
    let start=0;
    G.turn=start;
    G.msg=G.seats[start].name+' يبدأ';
    pending=-1;hintIdx=-1;lastLen=0;lastTurn=-1;unoPendingColor=false;unoPendingWild=null;
    if(first.type==='skip'){G.turn=unoStep(G.turn,1);G.msg='بدأت الجولة، تخطي على أول لاعب';}
    else if(first.type==='reverse'){G.dir=-1; if(G.n===2){G.turn=unoStep(G.turn,1);} else {G.msg='بدأت الجولة، عكس الاتجاه';}}
    else if(first.type==='draw2'){ drawCardsTo(G.turn,2); G.turn=unoStep(G.turn,1); G.msg='بدأت الجولة، سحب ٢ للدور الأول ثم يتغير';}
    broadcastState();render();scheduleBot();return;
  }
  const bag=[];
  for(let a=0;a<=6;a++)for(let b=a;b<=6;b++)bag.push([a,b]);
  for(let i=bag.length-1;i>0;i--){const j=rnd(i+1);const tmp=bag[i];bag[i]=bag[j];bag[j]=tmp}
  const per = 7; // 7 tiles per player for 2, 3, or 4 players (28 tiles total)
  G.hands=G.seats.map((_,i)=>bag.slice(i*per,i*per+per));
  G.yard=G.mode==='block'?[]:bag.slice(G.n*per);
  G.chain=[];G.passes=0;G.res=null;G.must=null;G.last=null;G.phase='play';
  G.round=(G.round||0)+1;
  let start=-1,must=null;
  outer:
  for(let v=6;v>=0;v--){
    for(let i=0;i<G.n;i++){
      if(G.hands[i].some(t=>t[0]===v&&t[1]===v)){start=i;must=[v,v];break outer}
    }
  }
  if(start<0){
    let best=-1;
    for(let i=0;i<G.n;i++)for(const t of G.hands[i]){
      const s=t[0]+t[1];
      if(s>best){best=s;start=i}
    }
  }
  if(start<0)start=0;
  G.turn=start;G.must=must;
  G.msg=G.seats[start].name+' يبدأ'+(must?' بالدبل '+must[0]:'');
  pending=-1;hintIdx=-1;lastLen=0;lastTurn=-1;
}

/* ================= moves ================= */
function reshuffleIfNeeded(){
  if(!G||G.type!=='uno')return;
  if(G.drawPile.length>0)return;
  if(G.discard.length<=1){
    // Emergency replenish if all cards are held in hands in a 10-player match
    const extra = buildUnoDeck(2);
    G.drawPile.push(...extra);
    return;
  }
  const top=G.discard.pop();
  G.drawPile=G.discard.slice();
  G.discard=[top];
  shuffleArr(G.drawPile);
}
function drawCardsTo(i,n){
  if(!G||G.type!=='uno')return;
  for(let k=0;k<n;k++){
    reshuffleIfNeeded();
    if(!G.drawPile.length)break;
    G.hands[i].push(G.drawPile.pop());
  }
  if(G.hands[i] && G.hands[i].length!==1 && G.uno && G.uno.seat===i) G.uno=null;
}
function canPlayUno(i,idx){
  if(!G||G.type!=='uno')return false;
  const c=G.hands[i][idx]; if(!c)return false;
  const top=G.discard[G.discard.length-1];
  if(!top)return true;
  if(c.type==='wild'||c.type==='wild4')return true;
  if(c.color && G.color && c.color===G.color)return true;
  if(c.type==='num' && top.type==='num' && c.val===top.val)return true;
  if(c.type && top.type && c.type===top.type && c.type!=='num')return true;
  return false;
}
function applyAct(a,pid){
  if(!G||!a)return;
  const i=G.seats.findIndex(s=>s.pid===pid);
  if(i<0)return;
  if(a.t==='sort'&&G.hands[i]){
    if(G.type==='domino'){G.hands[i].sort(cmpTile);} 
    afterChange();return;
  }
  if(G.type==='uno'){
    if(a.t==='unoCall'){
      if(G.uno && G.uno.seat===i && !G.uno.called){
        if(Date.now() > (G.uno.deadline||0)){
          G.uno=null;
          drawCardsTo(i,2);
          G.msg=G.seats[i].name+' فاتته مهلة إعلان UNO فسحب ٢ كرت';
          beep(200,.12,'sawtooth',.08);
          afterChange();return;
        }
        G.uno.called=true;G.msg=G.seats[i].name+' أعلن UNO!';beep(660,.1,'sine',.1);afterChange();return;
      }
      return;
    }
    if(a.t==='unoCatch'){
      if(G.uno && G.uno.seat!==i && !G.uno.called && Date.now()<= (G.uno.deadline||0)){
        const target=G.uno.seat;
        G.uno=null;
        drawCardsTo(target,2);
        G.msg=G.seats[i].name+' أمسك بـ '+G.seats[target].name+' فسحب ٢ كرت عقابًا';
        beep(200,.12,'sawtooth',.08);
        afterChange();return;
      }
      return;
    }
    if(G.phase!=='play')return;
    if(G.type==='uno' && (a.t==='color' || a.t==='wildColor')){
      if(unoPendingColor && unoPendingWild!==null && i===G.turn){
        const col=a.color && UNO_COLORS.includes(a.color)?a.color:UNO_COLORS[0];
        G.color=col; unoPendingColor=false;
        if(unoPendingWild.type==='wild4'){
          const next=unoStep(G.turn,1);
          drawCardsTo(next,4);
          G.turn=unoStep(next,1);
          G.msg='اختير اللون '+col+'، '+G.seats[next].name+' يسحب ٤ ويتخطى دوره';
        }else{
          G.turn=unoStep(G.turn,1);
          G.msg='تم اختيار اللون '+col+'، دور '+G.seats[G.turn].name;
        }
        const playedBy = i;
        unoPendingWild=null;
        if(G.hands[playedBy] && G.hands[playedBy].length===1){
          G.uno={seat:playedBy,deadline:Date.now()+4000,called:false};
        }else if(G.uno && G.uno.seat===playedBy) G.uno=null;
        if(G.hands[playedBy] && G.hands[playedBy].length===0){finishUnoRound(playedBy);afterChange();return;}
        afterChange();return;
      }
      return;
    }
    if(G.phase!=='play'||i!==G.turn)return;
    if(unoPendingColor){ return; }
    let ok=false;
    if(a.t==='play')ok=doPlayUno(i,+a.i,a.color);
    else if(a.t==='draw')ok=doDrawUno(i);
    if(!ok)return;
    afterChange();return;
  }
  if(G.phase!=='play'||i!==G.turn)return;
  let ok=false;
  if(a.t==='play')ok=doPlay(i,+a.i,a.s);
  else if(a.t==='draw')ok=doDraw(i);
  else if(a.t==='pass')ok=doPass(i);
  if(!ok)return;
  afterChange();
}
function doDrawUno(i){
  if(G.phase!=='play'||G.turn!==i)return false;
  if(unoPendingColor)return false;
  drawCardsTo(i,1);
  G.msg=G.seats[i].name+' سحب كرت';
  beep(190,.06,'triangle',.06);
  if(G.uno && G.uno.seat===i) G.uno=null;
  G.turn=unoStep(G.turn,1);
  return true;
}
function doPlayUno(i,idx,colorChoice){
  if(G.phase!=='play'||G.turn!==i)return false;
  if(unoPendingColor)return false;
  const h=G.hands[i];
  if(!h||idx<0||idx>=h.length)return false;
  const c=h[idx];
  if(!canPlayUno(i,idx))return false;
  h.splice(idx,1);
  G.discard.push(c);
  if(c.type==='wild'||c.type==='wild4'){
    G.color=colorChoice && UNO_COLORS.includes(colorChoice)?colorChoice:null;
  }else{
    G.color=c.color;
  }
  G.passes=0;
  G.msg=G.seats[i].name+' لعب كرت';
  beep(300,.07,'square',.07);
  if(!h.length){
    finishUnoRound(i);
    return true;
  }
  if(h.length===1){
    const isBot = G.seats[i] && G.seats[i].bot;
    G.uno={seat:i,deadline:Date.now()+4000,called: isBot ? (Math.random() >= 0.4) : false};
    G.msg=G.seats[i].name+' بقى له كرت واحد - '+(G.uno.called?'أعلن UNO':'لم يعلن UNO!');
    if(isBot && !G.uno.called && host){
      setTimeout(()=>{
        if(G && G.type==='uno' && G.uno && G.uno.seat===i && !G.uno.called && Date.now() < (G.uno.deadline||0)){
          if(Math.random() < 0.3){ G.uno.called=true; broadcastState(); render(); }
        }
      }, 300 + Math.floor(Math.random()*700));
    }
  }else if(G.uno && G.uno.seat===i){
    G.uno=null;
  }
  if(c.type==='skip'){
    const skipped = unoStep(i,1);
    G.turn=unoStep(i,2);
    G.msg=`${G.seats[i].name} لعب تخطي (Skip) — تم تخطي ${G.seats[skipped].name}`;
    return true;
  }else if(c.type==='reverse'){
    G.dir=-G.dir;
    if(G.n===2){
      G.turn=unoStep(i,2); // in 2p reverse acts like skip
    }else{
      G.turn=unoStep(i,1);
    }
    G.msg=`${G.seats[i].name} عكس اتجاه اللعب (Reverse ⇄)`;
    return true;
  }else if(c.type==='draw2'){
    const next=unoStep(i,1);
    drawCardsTo(next,2);
    G.turn=unoStep(next,1);
    G.msg=G.seats[i].name+' لعب +2، '+G.seats[next].name+' يسحب كرتين';
    return true;
  }else if(c.type==='wild'){
    if(G.color && UNO_COLORS.includes(G.color)){
      G.turn=unoStep(i,1);
      G.msg=`${G.seats[i].name} لعب Wild واختار اللون ${G.color}`;
      return true;
    }
    unoPendingColor=true; unoPendingWild=c;
    G.turn=i;
    return true;
  }else if(c.type==='wild4'){
    if(G.color && UNO_COLORS.includes(G.color)){
      const next=unoStep(i,1);
      drawCardsTo(next,4);
      G.turn=unoStep(next,1);
      G.msg=`${G.seats[i].name} لعب +4 Wild (${G.color}) — ${G.seats[next].name} يسحب ٤ كروت`;
      return true;
    }
    unoPendingColor=true; unoPendingWild=c;
    G.turn=i;
    return true;
  }else{
    G.turn=unoStep(i,1);
    return true;
  }
}
function unoHandPoints(h){
  const values={0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,skip:20,reverse:20,draw2:20,wild:50,wild4:50};
  let s=0;
  for(const c of (h||[])){
    if(c.type==='num') s+=values[c.val]||0;
    else s+=values[c.type]||0;
  }
  return s;
}
function finishUnoRound(winner){
  if(G.type!=='uno')return;
  const handSums = G.hands.map(unoHandPoints);
  let pts=0;
  let winTeam = -1;
  if(G.tm){
    winTeam = seatTeam(winner);
    // Genuine Team UNO scoring: sum card points from opposing team's hands
    for(let i=0;i<G.n;i++){
      if(seatTeam(i) !== winTeam) pts += handSums[i];
    }
    G.scores[winTeam] = (G.scores[winTeam] || 0) + pts;
  }else{
    for(let i=0;i<G.n;i++){
      if(i===winner)continue;
      pts += handSums[i];
    }
    G.scores[winner] = (G.scores[winner] || 0) + pts;
  }
  const max=Math.max.apply(null,G.scores);
  const reached=max>= (G.target||500);
  const champs=G.scores.map((s,idx)=>s===max?idx:-1).filter(idx=>idx>=0);
  G.res={winner,team:winTeam,pts,reason:'empty',sums:handSums,champs};
  G.phase=reached?'over':'round';
  if(G.tm){
    G.msg=`${G.seats[winner].name} أنهى كروته وفاز ${winTeam===0?'الفريق أ 🔵':'الفريق ب 🔴'} بالجولة (+${pts} نقطة) 🎉`;
  }else{
    G.msg=G.seats[winner].name+' أنهى كروته وفاز بالجولة (+'+pts+' نقطة) 🎉';
  }
  if(reached)confetti(46);else beep(520,.12,'sine',.1);
}
function afterChange(){
  if(host){broadcastState();scheduleBot()}
  render();
}
function doPlay(i,idx,side){
  const h=G.hands[i];
  if(!h)return false;
  const t=h[idx];
  if(!t||!tileFits(t))return false;
  const e=ends();
  if(!e){
    G.chain=[{a:t[0],b:t[1]}];
    G.last={side:null};
  }else{
    const canL=t.includes(e[0]),canR=t.includes(e[1]);
    if(!canL&&!canR)return false;
    if(canL&&canR&&e[0]!==e[1]&&side!=='L'&&side!=='R')return false;
    if(side!=='L'&&side!=='R')side=canL?'L':'R';
    if(side==='L'){
      if(!canL)return false;
      G.chain.unshift({a:t[0]===e[0]?t[1]:t[0],b:e[0]});
    }else{
      if(!canR)return false;
      G.chain.push({a:e[1],b:t[0]===e[1]?t[1]:t[0]});
    }
    G.last={side};
  }
  h.splice(idx,1);
  G.passes=0;G.must=null;
  G.msg=G.seats[i].name+' لعب '+t[0]+'–'+t[1];
  beep(300,.07,'square',.07);
  if(G.mode==='fives'){
    const s=endCount(G.chain);
    if(s>0&&s%5===0){
      const team=sc(i);
      G.scores[team]+=s;
      G.msg+=' ✨ +'+s;
      beep(700,.14,'sine',.12);
      if(G.scores[team]>=G.target){finishRound(i,'target');return true}
    }
  }
  if(!h.length){finishRound(i,'empty');return true}
  G.turn=(G.turn+1)%G.n;
  return true;
}
function doDraw(i){
  if(G.mode==='block'||!G.yard.length)return false;
  if(canPlaySeat(i))return false;
  G.hands[i].push(G.yard.pop());
  G.passes=0;
  G.msg=G.seats[i].name+' سحب حجر من الكومة';
  beep(190,.06,'triangle',.06);
  return true;
}
function doPass(i){
  if(canPlaySeat(i))return false;
  if(G.yard.length)return false;
  G.passes++;
  G.msg=G.seats[i].name+' عدّى';
  beep(160,.08,'sine',.05);
  if(G.passes>=G.n){finishRound(-1,'blocked');return true}
  G.turn=(G.turn+1)%G.n;
  return true;
}
function finishRound(winner,reason){
  const n=G.n;
  const sums=G.hands.map(pipSum);
  const total=sums.reduce((a,b)=>a+b,0);
  let pts=0,winSeat=winner,winTeam=-1;
  if(G.tm){
    const ts=[0,0], tCnt=[0,0], tMin=[Infinity,Infinity];
    for(let i=0;i<n;i++){
      const tm = seatTeam(i);
      ts[tm] += sums[i];
      tCnt[tm]++;
      if(sums[i] < tMin[tm]) tMin[tm] = sums[i];
    }
    if(reason==='blocked'){
      if(tCnt[0] === tCnt[1]){
        winTeam = ts[0]<ts[1] ? 0 : (ts[1]<ts[0] ? 1 : -1);
      }else{
        // Flexible uneven teams (e.g. 2 vs 1): compare lowest hand pip total first, then average pips per player
        if(tMin[0] !== tMin[1]) winTeam = tMin[0] < tMin[1] ? 0 : 1;
        else {
          const avg0 = ts[0] / Math.max(1, tCnt[0]);
          const avg1 = ts[1] / Math.max(1, tCnt[1]);
          winTeam = avg0 < avg1 ? 0 : (avg1 < avg0 ? 1 : -1);
        }
      }
    }else{
      winTeam = winner>=0 ? seatTeam(winner) : -1;
    }
    if(winTeam>=0) pts = reason==='target' ? 0 : ts[1-winTeam];
  }else{
    if(reason==='blocked'){
      const m=Math.min.apply(null,sums);
      const cands=sums.map((s,i)=>s===m?i:-1).filter(i=>i>=0);
      winSeat=cands.length===1?cands[0]:-1;
      pts=winSeat>=0?total-m:0;
    }else{
      winSeat=winner;
      pts=reason==='target'?0:Math.max(0,total-(sums[winner]||0));
    }
  }
  if(G.mode==='fives'&&pts>0)pts=Math.round(pts/5)*5;
  if(G.tm){if(winTeam>=0)G.scores[winTeam]+=pts}
  else if(winSeat>=0)G.scores[winSeat]+=pts;
  const max=Math.max.apply(null,G.scores);
  const reached=max>=G.target;
  const champs=G.scores.map((s,i)=>s===max?i:-1).filter(i=>i>=0);
  G.res={winner:winSeat,team:winTeam,pts,reason,sums,total,champs};
  G.phase=reached?'over':'round';
  if(reason==='empty')G.msg=G.seats[winner].name+(G.tm?` قاد ${winTeam===0?'فريق أ 🔵':'فريق ب 🔴'} للفوز 🎉`:' خلّص أحجاره 🎉');
  else if(reason==='blocked')G.msg='اللعب اتقفل — الأقل نقاطًا هو الفايز';
  else G.msg='وصلنا للهدف! 🎯';
  if(reached)confetti(46);else beep(520,.12,'sine',.1);
}
function updateStats(){
  if(!G||G.phase!=='over'||rec)return;
  rec=true;
  const me=mySeat();
  PF.st.g++;
  if(me>=0){
    const my = sc(me);
    if(G.res&&G.res.champs&&G.res.champs.includes(my))PF.st.w++;
    PF.st.p+=(G.scores[my]||0);
    PF.st.r+=G.round;
  }
  savePF();renderProfileBtn();
}
function nextRound(){
  if(!host||!G)return;
  closeOverlay();resultKey='';
  if(G.phase==='over'){
    G.scores = G.tm ? [0,0] : G.seats.map(()=>0);
    G.round=0;rec=false;
  }
  pending=-1;hintIdx=-1;unoPendingColor=false;unoPendingWild=null;
  deal();
  broadcastState();
  render();
  scheduleBot();
}

/* ================= bots ================= */
function scheduleBot(){
  clearTimeout(botTimer);
  if(!host||!G||G.phase!=='play')return;
  if(G.type==='uno' && unoPendingColor){
    const s2=G.seats[G.turn];
    if(s2 && s2.bot){
      botTimer=setTimeout(()=>{ if(!host||!G||G.phase!=='play')return; if(G.seats[G.turn]&&G.seats[G.turn].bot) botChooseColor(G.turn); }, 400);
      return;
    }
    return;
  }
  const s=G.seats[G.turn];
  if(!s||!s.bot)return;
  botTimer=setTimeout(()=>{
    if(!host||!G||G.phase!=='play')return;
    const s2=G.seats[G.turn];
    if(!s2||!s2.bot)return;
    if(!NET.want&&!host)return;
    botMove();
  },680+rnd(520));
}
function botChooseColor(i){
  if(!G||G.type!=='uno')return;
  const cnt={red:0,blue:0,green:0,yellow:0};
  for(const c of G.hands[i]||[]){ if(c.color&&cnt[c.color]!==undefined)cnt[c.color]++; }
  let best='red',bv=-1;
  for(const k of UNO_COLORS){ if(cnt[k]>bv){bv=cnt[k];best=k;}}
  if(unoPendingWild){
    applyAct({t:'color',color:best},G.seats[i].pid);
    return;
  }
  G.color=best; unoPendingColor=false;
  G.turn=unoStep(G.turn,1);
  if(G.hands[i] && G.hands[i].length===1 && (!G.uno||G.uno.seat!==i)){
    G.uno={seat:i,deadline:Date.now()+4000,called: Math.random() >= 0.35};
  }
  if(G.hands[i] && G.hands[i].length===0){finishUnoRound(i);broadcastState();render();scheduleBot();return;}
  broadcastState();render();scheduleBot();
}
function scoreOption(i,o){
  const c=chainAfter(o.k,o.s);
  let v=0;
  if(G.mode==='fives'&&endCount(c)%5===0)v+=220;
  const t=G.hands[i][o.k];
  v+=t[0]+t[1];
  if(t[0]===t[1])v+=6;
  if(G.hands[i].length===1)v+=600;
  v+=Math.random()*4;
  return v;
}
function botMove(){
  if(!G||G.phase!=='play')return;
  if(G.type==='uno'){
    if(unoPendingColor){ botChooseColor(G.turn); return; }
    const i=G.turn,h=G.hands[i];
    const seat=G.seats[i];
    if(!seat||!h)return;
    for(let k=0;k<h.length;k++){
      if(canPlayUno(i,k)){
        const c=h[k];
        if(c.type==='wild'||c.type==='wild4'){
          const cnt={red:0,blue:0,green:0,yellow:0};
          for(const cc of h){ if(cc.color&&cnt[cc.color]!==undefined)cnt[cc.color]++; }
          let best='red',bv=-1; for(const kk of UNO_COLORS){ if(cnt[kk]>bv){bv=cnt[kk];best=kk;}}
          applyAct({t:'play',i:k,color:best},seat.pid);
        }else{
          applyAct({t:'play',i:k},seat.pid);
        }
        if(G.hands[i] && G.hands[i].length===1 && (!G.uno||G.uno.seat!==i)){
          setTimeout(()=>{
            if(G && G.type==='uno' && G.uno && G.uno.seat===i && !G.uno.called){ G.uno.called=true; if(host){broadcastState();render();} }
          }, 150);
        }
        return;
      }
    }
    applyAct({t:'draw'},seat.pid);
    return;
  }
  const i=G.turn,h=G.hands[i];
  const seat=G.seats[i];
  if(!seat||!h)return;
  if(!G.chain.length){
    let idx=0;
    if(G.must){
      const k=h.findIndex(t=>t[0]===G.must[0]&&t[1]===G.must[1]);
      if(k>=0)idx=k;
    }
    applyAct({t:'play',i:idx},seat.pid);
    return;
  }
  const e=ends();
  const opts=[];
  h.forEach((t,k)=>{
    if(t.includes(e[0]))opts.push({k,s:'L'});
    if(t.includes(e[1]))opts.push({k,s:'R'});
  });
  if(opts.length){
    let best=opts[0],bestV=-1e9;
    for(const o of opts){
      const v=scoreOption(i,o);
      if(v>bestV){bestV=v;best=o}
    }
    applyAct({t:'play',i:best.k,s:best.s},seat.pid);
  }else if(G.yard.length){
    applyAct({t:'draw'},seat.pid);
  }else{
    applyAct({t:'pass'},seat.pid);
  }
}
function scheduleClientTick(){/* host drives the game clock */}

/* ================= sending actions ================= */
function send(a){
  a.pid=ME;
  if(host){applyAct(a,ME);return}
  if(NET.ready&&NET.client&&NET.client.connected){
    if(!pub(roomTopic(code,'act'),{t:'act',pid:ME,a},{qos:1}))
      toast('الاتصال وقع — بنحاول نرجع…','warn');
  }else toast('مش متصل بالمضيف… استنى ثانية','warn');
}
/* ================= tiles ================= */
const PIPS={
  1:[[1,1]],
  2:[[0,0],[2,2]],
  3:[[0,0],[1,1],[2,2]],
  4:[[0,0],[2,0],[0,2],[2,2]],
  5:[[0,0],[2,0],[1,1],[0,2],[2,2]],
  6:[[0,0],[0,1],[0,2],[2,0],[2,1],[2,2]]
};
function halfHTML(n){
  const v=Number(n);
  const arr=(Number.isFinite(v)&&PIPS[v])?PIPS[v]:[];
  return '<div class="half">'+arr.map(p=>`<i class="pip" style="left:${25+p[0]*25}%;top:${25+p[1]*25}%"></i>`).join('')+'</div>';
}
function tileHTML(t,cls){
  const a=t&&Array.isArray(t)?t[0]:(t?t.a:0);
  const b=t&&Array.isArray(t)?t[1]:(t?t.b:0);
  return `<div class="tile ${cls||''}">${halfHTML(a)}${halfHTML(b)}</div>`;
}
function backHTML(cls){return `<div class="tile back ${cls||''}"></div>`}
function unoCardHTML(c,cls){
  if(!c)return '';
  if(c.type==='back'){return `<div class="unocard backuno ${cls||''}"><span class="oval"></span></div>`;}
  if(c.type==='wild'){return `<div class="unocard wild ${cls||''}"><span class="oval"></span><span class="corner tl">W</span><span class="val">WILD</span><span class="corner br">W</span></div>`;}
  if(c.type==='wild4'){return `<div class="unocard wild ${cls||''}"><span class="oval"></span><span class="corner tl">+4</span><span class="val">+4</span><span class="corner br">+4</span></div>`;}
  if(c.type==='skip'){return `<div class="unocard ${c.color} ${cls||''}"><span class="oval"></span><span class="corner tl">⦸</span><span class="val">⦸</span><span class="corner br">⦸</span></div>`;}
  if(c.type==='reverse'){return `<div class="unocard ${c.color} ${cls||''}"><span class="oval"></span><span class="corner tl">⇄</span><span class="val">⇄</span><span class="corner br">⇄</span></div>`;}
  if(c.type==='draw2'){return `<div class="unocard ${c.color} ${cls||''}"><span class="oval"></span><span class="corner tl">+2</span><span class="val">+2</span><span class="corner br">+2</span></div>`;}
  if(c.type==='num'){return `<div class="unocard ${c.color} ${cls||''}"><span class="oval"></span><span class="corner tl">${c.val}</span><span class="val">${c.val}</span><span class="corner br">${c.val}</span></div>`;}
  return '';
}

/* ================= screens / lobby ================= */
function showScreen(which){
  if(which==='home'){
    navigateToPage('home');
    $('#dominoPage').classList.add('hide');
    $('#unoPage').classList.add('hide');
    $('#lobby').classList.add('hide');
    $('#game').classList.add('hide');
    $('#backHome').classList.add('hide');
    return;
  }
  
  $('#lobby').classList.toggle('hide',which!=='lobby');
  $('#game').classList.toggle('hide',which!=='game');
  $('#backHome').classList.remove('hide');
  window.scrollTo(0,0);
}
function renderRoom(){
  const show=!!code;
  $('#rm').classList.toggle('hide',!show);
  $('#joinEmpty').classList.toggle('hide',show);
  if(show){$('#rc').textContent=code;renderRoomPlayers()}
}
function renderRoomPlayers(){
  const wrap=$('#pls');
  if(!wrap)return;
  const gt = GAME_TYPE === 'uno' ? 'uno' : 'domino';
  const maxCap = Math.max(2, Math.min(gt === 'uno' ? 10 : 4, +lobbyMeta.n || 4));
  const curCount = lobbyPl.length;

  // Update capacity & mode summary bar inside #rm
  const capBadge = $('#rmCapBadge');
  if(capBadge) capBadge.textContent = `👥 اللاعبون في الغرفة: ${curCount} / ${maxCap}`;
  const modeBadge = $('#rmModeBadge');
  if(modeBadge){
    const gLabel = gt === 'uno' ? '🎴 UNO' : (`🁫 دومينو (${MODE_NAMES[lobbyMeta.mode]||lobbyMeta.mode})`);
    const tLabel = lobbyMeta.tm ? '🛡️ نظام الفرق (فريق أ ضد ب)' : '👤 فردي كلاسيكي';
    modeBadge.textContent = `${gLabel} • ${tLabel}`;
  }

  // Render interactive Team Selection Board when Team Mode is enabled
  const teamsBoard = $('#rmTeamsBoard');
  const check = validateLobbyTeamConfig(lobbyMeta, lobbyPl, gt);
  if(teamsBoard){
    if(lobbyMeta.tm){
      teamsBoard.classList.remove('hide');
      const meObj = lobbyPl.find(p => p.pid === ME);
      const myTeam = meObj && typeof meObj.team === 'number' ? meObj.team : 0;
      const teamAHumans = lobbyPl.filter((p, idx) => (typeof p.team === 'number' ? p.team : (idx % 2)) === 0);
      const teamBHumans = lobbyPl.filter((p, idx) => (typeof p.team === 'number' ? p.team : (idx % 2)) === 1);
      const botsA = Math.max(0, check.cntA - teamAHumans.length);
      const botsB = Math.max(0, check.cntB - teamBHumans.length);

      teamsBoard.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <b style="font-size:12.5px">🛡️ اختيار الفرق قبل بدء المباراة (مفتوح للجميع):</b>
          <span class="mut tiny">${lobbyMeta.allowUneven ? '⚖️ مسموح بفرق غير متساوية' : '⚖️ يتطلب تساوي الفريقين'}</span>
        </div>
        <div class="rm-teams-cols">
          <div class="rm-team-box team-a">
            <div class="rm-team-head">
              <span style="color:#38bdf8">🔵 الفريق أ (Team A)</span>
              <span class="bk-chip ac" style="font-size:10.5px;padding:1px 7px">${check.cntA} لاعب</span>
            </div>
            <div class="rm-team-members">
              ${teamAHumans.map(p => `<div class="rm-team-member-chip"><span>${esc(p.av||'🙂')} ${esc(p.name)}</span>${p.pid===ME?'<span class="tiny mut">(أنت)</span>':''}</div>`).join('')}
              ${botsA > 0 ? `<div class="mut tiny">+ ${botsA} بوت تلقائي عند البدء</div>` : ''}
              ${teamAHumans.length === 0 && botsA === 0 ? `<div class="mut tiny">لا يوجد لاعبون بعد</div>` : ''}
            </div>
            <button type="button" class="btn ${myTeam === 0 ? 'ok' : 'g'}" data-pick-my-team="0" style="padding:6px 10px;font-size:11.5px;min-height:32px;width:100%">
              ${myTeam === 0 ? '✅ أنت في الفريق أ' : '🔵 انضم للفريق أ'}
            </button>
          </div>

          <div class="rm-team-box team-b">
            <div class="rm-team-head">
              <span style="color:#fb7185">🔴 الفريق ب (Team B)</span>
              <span class="bk-chip warn" style="font-size:10.5px;padding:1px 7px">${check.cntB} لاعب</span>
            </div>
            <div class="rm-team-members">
              ${teamBHumans.map(p => `<div class="rm-team-member-chip"><span>${esc(p.av||'🙂')} ${esc(p.name)}</span>${p.pid===ME?'<span class="tiny mut">(أنت)</span>':''}</div>`).join('')}
              ${botsB > 0 ? `<div class="mut tiny">+ ${botsB} بوت تلقائي عند البدء</div>` : ''}
              ${teamBHumans.length === 0 && botsB === 0 ? `<div class="mut tiny">لا يوجد لاعبون بعد</div>` : ''}
            </div>
            <button type="button" class="btn ${myTeam === 1 ? 'ok' : 'g'}" data-pick-my-team="1" style="padding:6px 10px;font-size:11.5px;min-height:32px;width:100%">
              ${myTeam === 1 ? '✅ أنت في الفريق ب' : '🔴 انضم للفريق ب'}
            </button>
          </div>
        </div>
        <div class="rm-team-valid ${check.ok ? 'ok' : 'warn'}" id="rmTeamValidMsg">${esc(check.reason)}</div>
      `;
    }else{
      teamsBoard.classList.add('hide');
      teamsBoard.innerHTML = '';
    }
  }

  if(!lobbyPl.length){
    wrap.innerHTML='<div class="empty">مستنين لاعبين يدخلوا الغرفة…</div>';
  }else{
    wrap.innerHTML=lobbyPl.map((p,i)=>{
      const isMe=p.pid===ME;
      const pTeam = typeof p.team === 'number' ? p.team : (i % 2);
      const tags=[];
      if(i===0)tags.push('<span class="tag host">المضيف</span>');
      if(lobbyMeta.tm){
        tags.push(`<span class="tag team${pTeam}">${pTeam === 0 ? '🔵 فريق أ' : '🔴 فريق ب'}</span>`);
        if(isMe || host){
          tags.push(`<button type="button" class="mini" data-switch-pteam="${i}" title="تبديل الفريق">🔄 لـ ${pTeam === 0 ? 'فريق ب' : 'فريق أ'}</button>`);
        }
      }
      const canAdd=!isMe&&p.uid&&!isFriend(p.uid);
      return `<div class="player">
        <span class="pc" data-lp="${i}">
          <span class="av" style="--c:${esc(p.col||COLS[0])}">${esc(p.av||'🙂')}</span>
          <span><b>${esc(p.name)}</b><small>${isMe?'أنت':'جاهز للعب'}</small></span>
        </span>
        <span style="display:flex;gap:5px;align-items:center;flex-shrink:0;flex-wrap:wrap">
          ${tags.join('')}
          ${canAdd?`<button class="mini ok" data-addf="${i}">＋ صديق</button>`:''}
        </span>
      </div>`;
    }).join('');
  }
  const go=$('#go');
  go.classList.toggle('hide',!host);
  if(lobbyMeta.tm && !check.ok){
    go.textContent = '⚠️ وازن الفرق أولًا لبدء المباراة';
    go.disabled = true;
  }else{
    const willUseBots = lobbyMeta.fillBots !== false && lobbyPl.length < maxCap;
    go.textContent = willUseBots
      ? `🚀 ابدأ اللعب (${lobbyPl.length} لاعب + ${maxCap - lobbyPl.length} بوت)`
      : `🚀 ابدأ اللعب الآن (${lobbyPl.length}/${maxCap})`;
    go.disabled = lobbyPl.length < 1;
  }
}
$('#pls').addEventListener('click',e=>{
  const sw=e.target.closest('[data-switch-pteam]');
  if(sw){
    const idx=+sw.getAttribute('data-switch-pteam');
    const p=lobbyPl[idx];
    if(p){
      const curT = typeof p.team === 'number' ? p.team : (idx % 2);
      requestSetPlayerTeam(p.pid, curT === 0 ? 1 : 0);
    }
    return;
  }
  const add=e.target.closest('[data-addf]');
  if(add){const p=lobbyPl[+add.dataset.addf];if(p)addFriend(p);return}
  const pc=e.target.closest('[data-lp]');
  if(pc){const p=lobbyPl[+pc.dataset.lp];if(p)openProfile(p,p.pid===ME)}
});

/* ================= render game ================= */
function oppHTML(s,i){
  const isTurn=G.phase==='play'&&G.turn===i;
  const hand=G.hands[i]||[];
  const cnt=hand.length;
  const tmTag = G.tm ? `<span class="tag team${seatTeam(i)}" style="font-size:9.5px;padding:1px 6px">${seatTeam(i)===0?'🔵 أ':'🔴 ب'}</span>` : '';
  let tiles='';
  if(G.type==='uno'){
    const maxBacks = G.n >= 6 ? 6 : 10;
    const show=Math.min(cnt,maxBacks);
    for(let k=0;k<show;k++)tiles+=`<div class="unocard backuno sm"></div>`;
    if(cnt>show)tiles+=`<span class="more">+${cnt-show}</span>`;
    return `<div class="opp ${isTurn?'turn':''}">
      <div class="opphead">
        <span class="av sm" style="--c:${esc(s.col||COLS[0])}">${esc(s.av||'🙂')}</span>
        <div class="oppmeta">
          <div style="display:flex;align-items:center;gap:4px"><b>${esc(s.name)}</b>${tmTag}</div>
          <small>${G.tm ? (seatTeam(i)===0?'فريق أ • ':'فريق ب • ') : ''}${G.scores[sc(i)]||0} نقطة • ${cnt} كرت</small>
        </div>
      </div>
      <div class="backs show">${tiles}</div>
    </div>`;
  }
  if(G.open){
    tiles=hand.map(t=>tileHTML(t,'xs')).join('');
  }else{
    const show=Math.min(cnt,10);
    for(let k=0;k<show;k++)tiles+=backHTML('xs');
    if(cnt>show)tiles+=`<span class="more">+${cnt-show}</span>`;
  }
  const team=G.tm?(seatTeam(i)===0?'🔵 فريق أ • ':'🔴 فريق ب • '):'';
  return `<div class="opp ${isTurn?'turn':''}">
    <div class="opphead">
      <span class="av sm" style="--c:${esc(s.col||COLS[0])}">${esc(s.av||'🙂')}</span>
      <div class="oppmeta">
        <div style="display:flex;align-items:center;gap:4px"><b>${esc(s.name)}</b>${tmTag}</div>
        <small>${team}${G.scores[sc(i)]} نقطة • ${cnt} أحجار</small>
      </div>
    </div>
    <div class="backs${G.open?' show':''}">${tiles}</div>
  </div>`;
}
function reasonText(r){
  if(!G)return '';
  if(G.type==='uno'){
    if(r.reason==='empty'&&r.winner>=0){
      return G.tm
        ? `${G.seats[r.winner].name} أنهى أوراقه وقاد ${r.team===0?'الفريق أ 🔵':'الفريق ب 🔴'} للفوز بالجولة!`
        : `${G.seats[r.winner].name} أنهى كروته أولًا!`;
    }
    return '';
  }
  if(r.reason==='blocked'){
    if(G.tm)return r.team>=0?`${r.team===0?'الفريق أ 🔵':'الفريق ب 🔴'} كان الأقل نقاطًا في القفلة`:'تعادل في النقاط';
    return r.winner>=0?`${G.seats[r.winner].name} كان الأقل نقاطًا`:'تعادل في النقاط';
  }
  if(r.reason==='target')return 'النقاط وصلت للهدف أثناء اللعب';
  if(r.reason==='empty'&&r.winner>=0){
    return G.tm
      ? `${G.seats[r.winner].name} خلّص أحجاره وقاد ${r.team===0?'الفريق أ 🔵':'الفريق ب 🔴'} للفوز!`
      : `${G.seats[r.winner].name} خلّص أحجاره`;
  }
  return '';
}
function showResult(){
  if(!G||!G.res)return;
  const r=G.res,over=G.phase==='over';
  const ch=r.champs||[];
  let title,sub;
  const teamAMembers = G.seats.filter((_, idx) => seatTeam(idx) === 0).map(s => s.name).join(' ، ');
  const teamBMembers = G.seats.filter((_, idx) => seatTeam(idx) === 1).map(s => s.name).join(' ، ');

  if(G.type==='uno'){
    if(over){
      if(G.tm){
        title = ch.length===1 ? `🏆 ${ch[0]===0?'الفريق أ 🔵':'الفريق ب 🔴'} فاز بالمباراة!` : '🏆 تعادل بين الفريقين!';
      }else{
        title = ch.length===1 ? `🏆 ${esc(G.seats[ch[0]].name)} فائز باللعبة!` : '🏆 تعادل!';
      }
      sub='وصلنا لهدف '+(G.target||500)+' نقطة';
    }else{
      title=r.reason==='empty'?'🎉 انتهت الجولة':'🎉 الجولة خلصت';
      sub=reasonText(r);
    }
    const scoreHTML = G.tm
      ? `<div class="scores">
           <span class="score ${ch.includes(0)?'win':''}">🔵 الفريق أ (${esc(teamAMembers)}) — ${G.scores[0]} نقطة</span>
           <span class="score ${ch.includes(1)?'win':''}">🔴 الفريق ب (${esc(teamBMembers)}) — ${G.scores[1]} نقطة</span>
         </div>`
      : `<div class="scores">${G.seats.map((s,i)=>`<span class="score ${ch.includes(i)?'win':''}">${esc(s.av)} ${esc(s.name)} — ${G.scores[i]} نقطة</span>`).join('')}</div>`;
    const remain = Array.isArray(r.sums)
      ? `<div class="mut tiny" style="margin-top:8px">نقاط الأوراق المتبقية</div><div class="scores">${G.seats.map((s,i)=>`<span class="score">${esc(s.name)}: ${r.sums[i]||0}</span>`).join('')}</div>`
      : '';
    const ptsLine=r.pts?`<p class="mut">+${r.pts} نقطة مضافة في هذه الجولة</p>`:'';
    const actions=host
      ? `<button class="btn ok" data-res="next" style="width:100%;margin-top:8px">${over?'لعبة جديدة':'الجولة الجاية'}</button>`
      : `<div class="mut tiny" style="margin-top:8px">مستني المضيف يبدأ الجولة الجاية…</div>`;
    openOverlay(`<div class="card">
      <h2>${title}</h2>
      <p class="mut">${esc(sub)}</p>
      ${ptsLine}
      ${scoreHTML}
      ${remain}
      ${actions}
    </div>`,'result');
    const btn=$('[data-res="next"]');
    if(btn)btn.onclick=()=>nextRound();
    return;
  }
  if(over){
    if(G.tm)title=ch.length===1?`🏆 ${ch[0]===0?'الفريق أ 🔵':'الفريق ب 🔴'} كسب المباراة!`:'🏆 تعادل!';
    else title=ch.length===1?`🏆 ${esc(G.seats[ch[0]].name)} كسب!`:'🏆 تعادل!';
    sub='وصلنا لهدف '+G.target+' نقطة';
  }else{
    title=r.reason==='blocked'?'🧱 الجولة اتقفلت':(r.reason==='target'?'🎯 وصلنا للهدف!':'🎉 الجولة خلصت');
    sub=reasonText(r);
  }
  const scoreHTML=G.tm
    ? `<div class="scores">
         <span class="score ${ch.includes(0)?'win':''}">🔵 الفريق أ (${esc(teamAMembers)}) — ${G.scores[0]}</span>
         <span class="score ${ch.includes(1)?'win':''}">🔴 الفريق ب (${esc(teamBMembers)}) — ${G.scores[1]}</span>
       </div>`
    : `<div class="scores">${G.seats.map((s,i)=>`<span class="score ${ch.includes(i)?'win':''}">${esc(s.av)} ${esc(s.name)} — ${G.scores[i]}</span>`).join('')}</div>`;
  const remain=`<div class="scores">${G.seats.map((s,i)=>`<span class="score">${esc(s.name)}: ${r.sums[i]}</span>`).join('')}</div>`;
  const ptsLine=r.pts?`<p class="mut">+${r.pts} نقطة</p>`:'';
  const actions=host
    ? `<button class="btn ok" data-res="next" style="width:100%;margin-top:8px">${over?'لعبة جديدة':'الجولة الجاية'}</button>`
    : `<div class="mut tiny" style="margin-top:8px">مستني المضيف يبدأ الجولة الجاية…</div>`;
  openOverlay(`<div class="card">
    <h2>${title}</h2>
    <p class="mut">${esc(sub)}</p>
    ${ptsLine}
    ${scoreHTML}
    <div class="mut tiny" style="margin-top:8px">نقاط الأحجار المتبقية</div>
    ${remain}
    ${actions}
  </div>`,'result');
  const btn=$('[data-res="next"]');
  if(btn)btn.onclick=()=>nextRound();
}
/* ---- board: one connected chain; when a row is full the chain turns
       with a stone placed lengthwise (corner), doubles always lengthwise ---- */
function renderBoard(){
  const bd=$('#board');
  if(G.type==='uno'){
    const top=G.discard&&G.discard.length?G.discard[G.discard.length-1]:null;
    bd.style.height='170px';
    let html='<div style="display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap">';
    html+=`<div title="كومة السحب">${unoCardHTML({type:'back'},'lg')}</div>`;
    html+=top?`<div title="أعلى المكدس">${unoCardHTML(top,'lg')}</div>`:'<div class="unocard lg" style="border-style:dashed;opacity:.6"></div>';
    if(G.color){ html+=`<div class="pill" style="background:${G.color==='yellow'?'#f77f50':(G.color==='red'?'#d62828':(G.color==='blue'?'#023e8a':'#2a9d8f'))};color:#fff">اللون النشط: ${G.color}</div>`; }
    html+='</div>';
    bd.innerHTML=html;
    return;
  }
  const n=G?G.chain.length:0;
  if(!n){
    bd.style.height='';
    bd.innerHTML='<div class="boardempty">الطاولة فاضية — ابدأ أول حجر</div>';
    return;
  }
  const isDbl=k=>G.chain[k].a===G.chain[k].b;
  const availW=Math.max(140,bd.clientWidth-8);
  const small=window.innerWidth<860;
  const maxH=Math.max(132,Math.min(Math.round(window.innerHeight*(small?0.34:0.42)),320));
  const SP=1;                        // gap between touching stones

  /* snake board, matching the reference photos:
     - a full row turns with a stone laid lengthwise UNDER the last stone;
     - the next row starts centred under that turn stone;
     - doubles stand lengthwise, centred on their row.                     */
  function build(T,R){
    const base=Math.floor(n/R),rem=n%R;
    const counts=[];for(let r=0;r<R;r++)counts.push(base+(r<rem?1:0));
    const items=[];let idx=0,minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;
    const halfD=Math.round(T/2);
    const put=o=>{items.push(o);
      if(o.x<minX)minX=o.x;if(o.x+o.w>maxX)maxX=o.x+o.w;
      if(o.y<minY)minY=o.y;if(o.y+o.h>maxY)maxY=o.y+o.h;};
    let anchor=0, rowY=0;
    for(let r=0;r<R;r++){
      const cnt=counts[r];
      if(cnt<=0)continue;
      const dir=r%2?-1:1;
      const hasCorner=r<R-1;
      const hCnt=hasCorner?cnt-1:cnt;
      let cursor=0,last=null;
      for(let j=0;j<hCnt;j++){
        const k=idx+j,d=isDbl(k),w=d?T:2*T,h=d?2*T:T;
        let left;
        if(j===0)left=anchor-w/2;
        else left=dir>0?cursor:cursor-w;
        /* a double is centred on the row; only the first stone of a row
           is lifted to the row line so it never touches the row above */
        const y=d?(j===0?rowY:rowY-halfD):rowY;
        /* rows snake: in a right-to-left row the stone is turned 180° so the
           touching numbers face each other (chain k.b | chain k+1.a) */
        const o={i:k,w,h,v:d,x:Math.round(left),y,rev:!d&&dir<0};
        put(o);last=o;
        cursor=dir>0?o.x+w+SP:o.x-SP;
      }
      idx+=hCnt;
      if(!hasCorner)continue;
      /* turn stone: lengthwise, centred under the last stone, in the gap */
      const cx=last?last.x+(last.w-T)/2:anchor-T/2;
      const cy=(last?last.y+last.h:rowY+T)+SP;
      put({i:idx,w:T,h:2*T,v:true,turn:true,x:Math.round(cx),y:cy});
      anchor=cx+T/2;
      rowY=cy+2*T+SP;
      idx++;
    }
    if(items.length!==n)return null;
    const W=maxX-minX;
    if(W>availW)return null;
    return {items,h:maxY-minY,w:W,minX,minY,rows:R};
  }

  let best=null,fallback=null;
  const Rmax=Math.max(1,Math.min(8,Math.floor(n/2)));
  outer:
  for(let T=small?32:38;T>=11;T--){
    for(let R=1;R<=Rmax;R++){
      const L=build(T,R);
      if(!L)continue;
      if(L.h<=maxH){best={T,...L};break outer}
      if(!fallback||L.h<fallback.h)fallback={T,...L};
    }
  }
  if(!best)best=fallback||{items:[],h:0,w:0,minX:0,minY:0,T:14};
  const contentH=best.h,padY=8;
  const boardH=Math.max(112,Math.round(contentH+padY*2));
  const offX=Math.round((availW-best.w)/2)-best.minX;
  const offY=Math.round((boardH-contentH)/2)-(best.minY||0);
  bd.style.height=boardH+'px';
  const popIdx=(G.last&&n>lastLen)?(G.last.side==='L'?0:n-1):-1;
  bd.innerHTML=best.items.map(o=>{
    const t=G.chain[o.i];
    if(!t)return '';
    const cls='tile'+(o.v?'':' h')+(o.i===popIdx?' pop':'');
    const A=o.rev?t.b:t.a, B=o.rev?t.a:t.b;
    return `<div class="${cls}" data-a="${t.a}" data-b="${t.b}" data-rev="${o.rev?1:0}" data-turn="${o.turn?1:0}" style="left:${Math.round(o.x+offX)}px;top:${Math.round(o.y+offY)}px;width:${o.w}px;height:${o.h}px">${halfHTML(A)}${halfHTML(B)}</div>`;
  }).join('');
}

/* ================= game log ================= */
let _logN=-1;
function logKey(){
  return [G.msg,G.turn,G.round,G.phase,G.hands.map(h=>h.length).join(','),G.chain?G.chain.length:0,G.yard?G.yard.length:0,G.drawPile?G.drawPile.length:0,G.discard?G.discard.length:0].join('|');
}
function syncLog(){
  if(!host||!G)return;
  if(!G.log)G.log=[];
  const k=logKey();
  if(G._lk===k)return;
  G._lk=k;
  if(G._lr!==G.round){G._lr=G.round;G.log.push({sep:1,m:'جولة '+G.round})}
  if(G.msg)G.log.push({m:G.msg});
  if(G.log.length>400)G.log.splice(0,G.log.length-400);
}

function setLogOpen(v){
  store.set('sharbLogOpen',!!v);
  const a=$('#glog'),b=$('#logBtn');
  if(a)a.classList.toggle('off',!v);
  if(b)b.classList.toggle('on',!!v);
  if(v){_logN=-1;renderLog()}
}
document.addEventListener('click',e=>{
  if(e.target.closest('#logBtn'))setLogOpen($('#glog').classList.contains('off'));
  else if(e.target.closest('#logClose'))setLogOpen(false);
});
setLogOpen(store.get('sharbLogOpen',false));
function renderLog(){
  const ul=$('#glogList');if(!ul||!G||$('#glog').classList.contains('off'))return;
  const L=G.log||[];
  if(L.length===_logN&&ul.dataset.r===String(G.round))return;
  _logN=L.length;ul.dataset.r=String(G.round);
  let n=0;
  ul.innerHTML=L.map((e,k)=>e.sep?`<li class="sep">${esc(e.m)}</li>`:`<li class="${k===L.length-1?'last':''}"><i>${++n}</i><span>${esc(e.m)}</span></li>`).join('');
  $('#glogN').textContent=n+' حركة';
  ul.scrollTop=ul.scrollHeight;
}
function render(){
  if(!G)return;
  syncLog();renderLog();
  const me=mySeat();
  const myTurn=me>=0&&G.turn===me&&G.phase==='play';
  if(G.type==='uno' && G.uno && !G.uno.called && Date.now() > (G.uno.deadline||0)){
    const seat = G.uno.seat;
    if(host){
      const wasBot = G.seats[seat] && G.seats[seat].bot;
      G.uno = null;
      drawCardsTo(seat,2);
      G.msg = wasBot ? (G.seats[seat].name + ' نسي إعلان UNO - عقوبة ٢ كرت') : (G.seats[seat].name + ' فاتته مهلة إعلان UNO فسحب ٢ كرت');
      broadcastState();
    }
  }
  if(pending>=0&&(!myTurn||!G.hands[me]||!G.hands[me][pending]))pending=-1;

  if(G.type==='uno'){
    const bits=[`<b>${G.tm ? '🛡️ UNO فرق' : '🎴 UNO فردي'}</b>`];
    bits.push(`<span class="pill">جولة ${G.round}</span>`);
    bits.push(`<span class="pill">اتجاه ${G.dir===1?'→':'←'}</span>`);
    if(G.color)bits.push(`<span class="pill">لون: ${G.color}</span>`);
    bits.push(`<span class="pill">سحب: ${G.drawPile.length}</span>`);
    bits.push(`<span class="pill">لاعبون: ${G.n}</span>`);
    if(G.tm)bits.push(`<span class="pill t0">🔵 أ: ${G.scores[0]||0}</span><span class="pill t1">🔴 ب: ${G.scores[1]||0}</span>`);
    if(code)bits.push(`<span class="pill">كود ${esc(code)}</span>`);
    setHTMLIfChanged($('#info'), bits.join(' '));
  }else{
    const bits=[`<b>${esc(MODE_NAMES[G.mode]||G.mode)}${G.tm ? ' • فرق' : ' • فردي'}</b>`];
    if(G.open)bits.push('<span class="pill">👁 مكشوف</span>');
    bits.push(`<span class="pill">جولة ${G.round}</span>`);
    bits.push(`<span class="pill">هدف ${G.target}</span>`);
    if(G.tm)bits.push(`<span class="pill t0">🔵 أ: ${G.scores[0]}</span><span class="pill t1">🔴 ب: ${G.scores[1]}</span>`);
    if(code)bits.push(`<span class="pill">كود ${esc(code)}</span>`);
    setHTMLIfChanged($('#info'), bits.join(' '));
  }

  const oppsEl = $('#opps');
  if(oppsEl){
    oppsEl.classList.toggle('crowded', G.n >= 5);
    setHTMLIfChanged(oppsEl, G.seats.map((s,i)=>i===me?'':oppHTML(s,i)).join(''));
  }

  if(me>=0){
    const s=G.seats[me];
    const myTmLabel = G.tm ? (seatTeam(me)===0 ? '🔵 فريق أ • ' : '🔴 فريق ب • ') : '';
    if(G.type==='uno'){
      setHTMLIfChanged($('#me'), `<span class="av sm" style="--c:${esc(s.col)}">${esc(s.av)}</span>
        <span><b>${esc(s.name)} (أنت)</b>
        <small>${myTmLabel}نقاط ${G.scores[sc(me)]||0} • ${G.hands[me].length} كرت</small></span>`);
    }else{
      setHTMLIfChanged($('#me'), `<span class="av sm" style="--c:${esc(s.col)}">${esc(s.av)}</span>
        <span><b>${esc(s.name)} (أنت)</b>
        <small>${myTmLabel}${G.scores[sc(me)]} نقطة • ${G.hands[me].length} أحجار</small></span>`);
    }
  }else{
    setHTMLIfChanged($('#me'), '<span class="mut">مش في اللعبة</span>');
  }

  const n=G.chain.length;
  renderBoard();

  const side=$('#sidesel');
  if(G.type!=='uno' && myTurn&&pending>=0&&G.hands[me]&&G.hands[me][pending]){
    const t=G.hands[me][pending];
    side.classList.remove('hide');
    side.innerHTML=`<span>تحط ${t[0]}–${t[1]} فين؟</span>
      <button class="btn ok" data-side="L">◀ شمال</button>
      <button class="btn ok" data-side="R">يمين ▶</button>
      <button class="btn g" data-side="X">إلغاء</button>`;
  }else side.classList.add('hide');

  const csel=$('#unoColorSel');
  if(G.type==='uno' && unoPendingColor && myTurn){
    csel.classList.remove('hide');
    csel.innerHTML=`<span>اختر لونًا جديدًا</span> `+UNO_COLORS.map(col=>`<button class="btn" data-ucol="${col}" style="background:${col==='yellow'?'#f77f50':(col==='red'?'#d62828':(col==='blue'?'#023e8a':'#2a9d8f'))};color:#fff">${col}</button>`).join('')+` <button class="btn g" data-ucol="X">إلغاء</button>`;
  }else if(!(pending>=0 && myTurn && G.hands[me] && G.hands[me][pending] && (G.hands[me][pending].type==='wild'||G.hands[me][pending].type==='wild4'))){
    csel.classList.add('hide');
  } else {
    csel.classList.remove('hide');
    const pc=G.hands[me][pending];
    csel.innerHTML=`<span>اختر لونًا لـ ${pc.type==='wild4'?'+4 Wild':'Wild'}</span> `+UNO_COLORS.map(col=>`<button class="btn" data-ucol="${col}" style="background:${col==='yellow'?'#f77f50':(col==='red'?'#d62828':(col==='blue'?'#023e8a':'#2a9d8f'))};color:#fff">${col}</button>`).join('')+` <button class="btn g" data-ucol="X">إلغاء</button>`;
  }

  let msg='';
  if(G.phase==='play'){
    if(myTurn){
      if(G.type==='uno'){
        if(unoPendingColor) msg='🎯 دورك — اختر اللون';
        else if(G.hands[me].some((c,idx)=>canPlayUno(me,idx))) msg='🎯 دورك — العب كرت مطابق';
        else msg='🎯 دورك — اسحب كرتًا';
      }else{
        if(canPlaySeat(me))msg='🎯 دورك — العب حجر';
        else if(G.yard.length)msg='🎯 دورك — مفيش حجر مناسب، اسحب من الكومة';
        else msg='🎯 دورك — مفيش لعب، اضغط تعدّي';
      }
    }else{
      msg=G.msg||('دور '+(G.seats[G.turn]?G.seats[G.turn].name:''));
    }
  }else msg=G.msg||'';
  const msgEl=$('#msg');
  msgEl.textContent=msg;
  msgEl.classList.toggle('myturn',myTurn);
  if(myTurn&&lastTurn!==me){hintIdx=-1;beep(560,.09,'sine',.09)}
  lastTurn=myTurn?me:-1;

  const h=me>=0?G.hands[me]:[];
  if(G.type==='uno'){
    $('#hand').innerHTML=h.map((c,k)=>{
      const ok=myTurn&&!unoPendingColor&&canPlayUno(me,k);
      const cls=[ok?'ok':'',pending===k?'sel':'',hintIdx===k?'hint':''].filter(Boolean).join(' ');
      return `<div class="tilewrap" data-k="${k}">${unoCardHTML(c,cls)}</div>`;
    }).join('');
  }else{
    $('#hand').innerHTML=h.map((t,k)=>{
      const ok=myTurn&&tileFits(t);
      const cls=[myTurn?(ok?'ok':'no'):'',pending===k?'sel':'',hintIdx===k?'hint':''].filter(Boolean).join(' ');
      return `<div class="tilewrap" data-k="${k}">${tileHTML(t,cls)}</div>`;
    }).join('');
  }

  const unoCallBtn=$('#unoCallBtn');
  if(G.type==='uno' && G.uno && G.uno.seat===me && !G.uno.called && Date.now()< (G.uno.deadline||0)){
    unoCallBtn.classList.remove('hide');
    unoCallBtn.onclick=()=>{ send({t:'unoCall'}); };
  }else{
    unoCallBtn.classList.add('hide');
  }
  const unoCatchBtn=$('#unoCatchBtn');
  if(G.type==='uno' && G.uno && G.uno.seat!==me && !G.uno.called && Date.now()< (G.uno.deadline||0)){
    unoCatchBtn.style.display='inline-flex';
    unoCatchBtn.onclick=()=>{ send({t:'unoCatch'}); };
  }else{
    unoCatchBtn.style.display='none';
  }
  const unoMeta=$('#unoMeta');
  if(G.type==='uno' && G.uno){
    const left=Math.max(0,Math.ceil(((G.uno.deadline||0)-Date.now())/1000));
    if(G.uno.seat===me && !G.uno.called){
      unoMeta.textContent='لديك كرت واحد - أعلن UNO خلال '+left+' ث';
    }else if(G.uno.seat!==me && !G.uno.called){
      unoMeta.textContent=G.seats[G.uno.seat].name+' بقى له كرت واحد ولم يعلن UNO';
    }else if(G.uno.called){
      unoMeta.textContent='تم إعلان UNO';
    }else{
      unoMeta.textContent='';
    }
  }else{
    unoMeta.textContent='';
  }

  const drawBtn=$('#dr');
  if(G.type!=='uno'){
    if(G.mode==='block')drawBtn.classList.add('hide');else drawBtn.classList.remove('hide');
    drawBtn.disabled=!(myTurn&&G.phase==='play'&&G.yard.length&&!canPlaySeat(me));
    $('#by').textContent='('+G.yard.length+')';
  }else{
    drawBtn.classList.add('hide');
  }
  if(G.type==='uno'){
    $('#by').textContent='('+G.drawPile.length+')';
  }
  if(G.type!=='uno'){
    $('#ps').classList.remove('hide');
    $('#ps').textContent='⏭️ تعدّي';
    $('#ps').disabled=!(myTurn&&!canPlaySeat(me)&&!G.yard.length);
  }else{
    $('#ps').classList.remove('hide');
    $('#ps').textContent='🎴 سحب';
    $('#ps').disabled=!(myTurn && !unoPendingColor && me>=0 && G.hands[me] && !G.hands[me].some((c,idx)=>canPlayUno(me,idx)));
  }
  $('#sort').disabled=!G.hands[me];

  if(n!==lastLen){lastLen=n}

  if(G.phase==='over')updateStats();
  if(G.phase!=='play'&&G.res){
    const key=G.phase+'|'+G.round+'|'+G.scores.join(',')+'|'+(G.res.pts||0);
    if(resultKey!==key&&$('#ovl').dataset.kind!=='profile'){
      resultKey=key;showResult();
    }
  }else if($('#ovl').dataset.kind==='result'){
    closeOverlay();resultKey='';
  }
}
function closeResultIfNeeded(){
  if($('#ovl').dataset.kind==='result'){closeOverlay();resultKey=''}
}

/* ================= game events ================= */
$('#hand').addEventListener('click',e=>{
  const el=e.target.closest('[data-k]');
  if(!el||!G||G.phase!=='play')return;
  const me=mySeat();
  if(me<0||G.turn!==me)return;
  const k=+el.dataset.k;
  if(G.type==='uno'){
    if(unoPendingColor)return;
    const c=G.hands[me]&&G.hands[me][k];
    if(!c||!canPlayUno(me,k))return;
    if(c.type==='wild'||c.type==='wild4'){
      pending=k; unoPendingColor=false; hintIdx=-1; render();
      // show color selector immediately
      setTimeout(()=>{
        const csel=$('#unoColorSel');
        if(csel){ csel.classList.remove('hide'); csel.innerHTML=`<span>اختر اللون الذي سيتم اللعب به</span> `+['red','blue','green','yellow'].map(col=>`<button class="btn" data-ucol="${col}" style="background:${col==='yellow'?'#f77f50':(col==='red'?'#d62828':(col==='blue'?'#023e8a':'#2a9d8f'))};color:#fff">${col}</button>`).join('')+` <button class="btn g" data-ucol="X">إلغاء</button>`; }
      }, 10);
      return;
    }
    pending=-1; hintIdx=-1;
    send({t:'play',i:k});
    return;
  }
  const t=G.hands[me]&&G.hands[me][k];
  if(!t||!tileFits(t))return;
  const e2=ends();
  if(e2&&t.includes(e2[0])&&t.includes(e2[1])&&e2[0]!==e2[1]){
    pending=pending===k?-1:k;
    hintIdx=-1;
    render();
    return;
  }
  pending=-1;hintIdx=-1;
  send({t:'play',i:k});
});
$('#sidesel').addEventListener('click',e=>{
  const b=e.target.closest('[data-side]');
  if(!b)return;
  const s=b.dataset.side;
  const k=pending;
  pending=-1;
  if(s==='X'){render();return}
  if(k>=0)send({t:'play',i:k,s});
  render();
});
$('#unoColorSel').addEventListener('click',e=>{
  const b=e.target.closest('[data-ucol]');
  if(!b)return;
  const col=b.dataset.ucol;
  if(col==='X'){ unoPendingColor=false; pending=-1; render(); return; }
  if(UNO_COLORS.includes(col)){
    const me=mySeat();
    if(me<0||!G||G.turn!==me)return;
    if(pending>=0){
      send({t:'play',i:pending,color:col});
      pending=-1;
      unoPendingColor=false;
    }else if(unoPendingColor && unoPendingWild){
      // apply via color action
      if(host){ applyAct({t:'color',color:col},G.seats[me].pid); } else { send({t:'color',color:col}); }
      unoPendingColor=false;
    }
  }
  render();
});
$('#dr').onclick=()=>{hintIdx=-1; if(G && G.type==='uno'){ return; } send({t:'draw'})};
$('#ps').onclick=()=>{hintIdx=-1; if(G && G.type==='uno'){ if(unoPendingColor)return; const me2=mySeat(); if(me2<0||G.turn!==me2)return; if(G.hands[me2] && G.hands[me2].some((c,idx)=>canPlayUno(me2,idx))) return toast('ما تقدر تسحب وأنت تقدر تلعب','warn'); if(host){ applyAct({t:'draw'},G.seats[me2].pid); } else { send({t:'draw'}); } return; } send({t:'pass'})};
$('#sort').onclick=()=>{
  if(!G)return;
  pending=-1;
  send({t:'sort'});
};
$('#hint').onclick=()=>{
  if(!G||G.phase!=='play')return;
  const me=mySeat();
  if(me<0||G.turn!==me)return toast('مش دورك دلوقتي');
  if(G.type==='uno'){
    const h=G.hands[me]||[];
    for(let k=0;k<h.length;k++){ if(canPlayUno(me,k)){ hintIdx=k; render(); toast('جرّب الكرت المضيء 💡','ok'); return; } }
    toast('مفيش كرت مطابق — اسحب','warn');
    return;
  }
  const h=G.hands[me];
  if(!canPlaySeat(me))return toast(G.yard.length?'مفيش حجر مناسب — اسحب من الكومة':'مفيش لعب — اضغط تعدّي','warn');
  const e=ends();
  if(!e){hintIdx=0;render();return toast('ابدأ بأي حجر')}
  let best=-1,bv=-1e9;
  h.forEach((t,k)=>{
    if(!tileFits(t))return;
    const sides=[];
    if(t.includes(e[0]))sides.push('L');
    if(t.includes(e[1]))sides.push('R');
    sides.forEach(s=>{
      const c=chainAfter(k,s);
      let v=(G.mode==='fives'&&endCount(c)%5===0)?200:0;
      v+=t[0]+t[1]+Math.random();
      if(v>bv){bv=v;best=k}
    });
  });
  hintIdx=best;
  render();
  toast('جرّب الحجر المضيء 💡','ok');
};
$('#leave').onclick=()=>leaveGame();



/* ================= MULTI-PAGE SESSION PERSISTENCE & EVENT BINDING (DOMINO) ================= */
function saveTabletopSession() {
  if (!code && !G) {
    SharbSession.clearGameSession('domino');
    return;
  }
  SharbSession.saveGameSession('domino', {
    gameType: 'domino',
    host,
    code,
    lobbyPl,
    lobbyMeta,
    mode,
    G
  });
  if (code) {
    SharbSession.setActiveRoom({
      roomKey: 'domino_' + code,
      game: 'domino',
      code,
      visibility: getRoomVisibility('domino'),
      hostPid: host ? ME : '',
      playersCount: G ? G.seats.filter(s => !s.bot).length : (lobbyPl.length || 1),
      maxPlayers: lobbyMeta.n || 4,
      status: G ? (G.phase === 'over' ? 'finished' : 'playing') : 'waiting'
    });
  }
}

const _origBroadcastLobby = broadcastLobby;
broadcastLobby = function() {
  _origBroadcastLobby();
  saveTabletopSession();
};

const _origBroadcastState = broadcastState;
broadcastState = function() {
  _origBroadcastState();
  saveTabletopSession();
};

const _origRender = render;
render = function() {
  _origRender();
  saveTabletopSession();
};

function leaveRoom() {
  if (host && G && G.phase === 'play' && !confirm('لو خرجت اللعبة هتقف على الباقيين. تخرج؟')) return;
  clearTimeout(botTimer);
  botTimer = null;
  teardownNet(true);
  G = null; host = false; code = ''; lobbyPl = [];
  pending = -1; hintIdx = -1; resultKey = ''; unoPendingColor = false; unoPendingWild = null;
  SharbSession.clearGameSession('domino');
  SharbSession.clearActiveRoom('domino');
  closeOverlay();
  showScreen('lobby');
  renderRoom();
  if (typeof renderFriends === 'function') renderFriends();
  if (typeof renderProfileBtn === 'function') renderProfileBtn();
  setNetStatus('');
  toast('خرجت من الغرفة');
}
window.leaveRoom = leaveRoom;

function leaveGame() {
  if (!confirm('تخرج من المباراة؟')) return;
  clearTimeout(botTimer);
  botTimer = null;
  teardownNet(true);
  G = null; host = false; code = ''; lobbyPl = [];
  pending = -1; hintIdx = -1; resultKey = ''; unoPendingColor = false; unoPendingWild = null;
  SharbSession.clearGameSession('domino');
  SharbSession.clearActiveRoom('domino');
  closeOverlay();
  showScreen('lobby');
  renderRoom();
  if (typeof renderFriends === 'function') renderFriends();
  if (typeof renderProfileBtn === 'function') renderProfileBtn();
  toast('خرجت من المباراة');
}
window.leaveGame = leaveGame;

function restoreTabletopSession() {
  const saved = SharbSession.loadGameSession('domino');
  if (!saved || saved.gameType !== 'domino') return false;
  if (!saved.code && !saved.G) return false;
  host = !!saved.host;
  code = saved.code || '';
  lobbyPl = Array.isArray(saved.lobbyPl) ? saved.lobbyPl : [me0()];
  lobbyMeta = Object.assign(lobbyMeta, saved.lobbyMeta || {});
  mode = saved.mode || mode;
  G = saved.G || null;

  if (code) {
    NET.want = true;
    $('#rm').classList.remove('hide');
    $('#joinEmpty').classList.add('hide');
    $('#rc').textContent = code;
    if (host) {
      $('#go').classList.remove('hide');
      openHostRoom();
    } else {
      $('#go').classList.add('hide');
      openGuestRoom();
    }
    ensureMQTT().then(ok => {
      if (ok && code) {
        if (host) { hostBeat(); broadcastLobby(); if (G) broadcastState(); }
        else guestHello();
      }
    }).catch(() => {});
  }

  if (G && G.phase !== 'lobby') {
    showScreen('game');
    render();
    if (host) scheduleBot();
  } else {
    showScreen('lobby');
    renderRoomPlayers();
  }
  return true;
}

function initTabletopPage() {
  GAME_TYPE = 'domino';
  syncLobbyConfigUI();
  renderRoomPlayers();
  updateDominoUnoVisUI();

  $$('#modes .mode').forEach(el => {
    el.onclick = () => {
      if (GAME_TYPE !== 'domino') return;
      mode = el.dataset.m;
      $$('#modes .mode').forEach(x => x.classList.toggle('on', x === el));
      beep(420, 0.05, 'sine', 0.05);
    };
  });

  if ($('#host')) $('#host').onclick = () => createRoom();
  if ($('#solo')) $('#solo').onclick = () => soloGame();
  if ($('#join')) $('#join').onclick = () => joinRoom($('#cd').value);
  if ($('#cd')) $('#cd').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom($('#cd').value); });
  if ($('#go')) $('#go').onclick = () => { if (host) startGame(); };
  if ($('#leaveRoom')) $('#leaveRoom').onclick = () => leaveRoom();
  if ($('#copyCode')) $('#copyCode').onclick = () => copyText(code);
  if ($('#shareCode')) $('#shareCode').onclick = () => shareInvite(null);
  if ($('#rmVisToggleBtn')) {
    $('#rmVisToggleBtn').onclick = () => {
      const next = getRoomVisibility('domino') === 'public' ? 'private' : 'public';
      setRoomVisibility('domino', next, false);
    };
  }
  if ($('#lobbyRoomNameInp')) {
    $('#lobbyRoomNameInp').addEventListener('input', () => {
      SHARB_ROOM_CFG.roomNames['domino'] = $('#lobbyRoomNameInp').value;
      if (host && code) pubDirSyncHostRoom(true);
    });
  }
  if ($('#fa') && $('#fn')) {
    $('#fa').onclick = () => { if (handleAddFriendInput($('#fn').value)) $('#fn').value = ''; };
    $('#fn').addEventListener('keydown', e => { if (e.key === 'Enter') $('#fa').click(); });
  }
  if ($('#copyMe')) $('#copyMe').onclick = () => copyText(PF.uid);
  if ($('#fl')) $('#fl').addEventListener('click', e => handleFriendListClick(e, ''));

  document.addEventListener('click', e => {
    const tmBtn = e.target.closest('[data-lob-tm]');
    if (tmBtn) {
      LOBBY_DRAFT['domino'].tm = tmBtn.getAttribute('data-lob-tm') === '1';
      if (LOBBY_DRAFT['domino'].tm && (LOBBY_DRAFT['domino'].n % 2 === 1)) {
        LOBBY_DRAFT['domino'].allowUneven = true;
      }
      saveLobbyDraft();
      syncLobbyConfigUI();
      beep(460, 0.05, 'sine', 0.05);
      return;
    }
    const capBtn = e.target.closest('[data-lob-cap]');
    if (capBtn) {
      const maxAllowed = 'domino' === 'uno' ? 10 : 4;
      const val = Math.max(2, Math.min(maxAllowed, parseInt(capBtn.getAttribute('data-lob-cap'), 10) || 4));
      LOBBY_DRAFT['domino'].n = val;
      if (LOBBY_DRAFT['domino'].tm && (val % 2 === 1)) {
        LOBBY_DRAFT['domino'].allowUneven = true;
      }
      saveLobbyDraft();
      syncLobbyConfigUI();
      beep(480, 0.05, 'sine', 0.05);
      return;
    }
    const pickTeamBtn = e.target.closest('[data-pick-my-team]');
    if (pickTeamBtn) {
      const t = parseInt(pickTeamBtn.getAttribute('data-pick-my-team'), 10) === 1 ? 1 : 0;
      requestSetPlayerTeam(ME, t);
      beep(520, 0.05, 'sine', 0.05);
      return;
    }
  });

  const allowChk = document.getElementById('allowUnevenTgl');
  if (allowChk) {
    allowChk.addEventListener('change', () => {
      LOBBY_DRAFT['domino'].allowUneven = !!allowChk.checked;
      saveLobbyDraft();
      syncLobbyConfigUI();
    });
  }
  const fillChk = document.getElementById('fillBotsTgl');
  if (fillChk) {
    fillChk.addEventListener('change', () => {
      LOBBY_DRAFT['domino'].fillBots = !!fillChk.checked;
      saveLobbyDraft();
      syncLobbyConfigUI();
    });
  }
  const tgInp = document.getElementById('tg');
  if (tgInp) {
    tgInp.addEventListener('change', () => {
      const v = parseInt(tgInp.value, 10);
      if (v > 0) LOBBY_DRAFT['domino'].target = v;
      saveLobbyDraft();
      syncLobbyConfigUI();
    });
  }

  let rsz = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rsz);
    rsz = setTimeout(() => { if (G && !$('#game').classList.contains('hide')) renderBoard(); }, 140);
  });

  // Check URL params or cross-page room intent first
  const qs = new URLSearchParams(window.location.search);
  const qRoom = (qs.get('room') || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const qAction = qs.get('action') || '';
  const qVis = qs.get('vis') || '';
  const intent = SharbSession.consumeRoomIntent('domino');

  if (qVis === 'private' || qVis === 'public') setRoomVisibility('domino', qVis, true);
  if (intent && intent.visibility) setRoomVisibility('domino', intent.visibility, true);
  if (intent && intent.roomName) {
    SHARB_ROOM_CFG.roomNames['domino'] = intent.roomName;
    if ($('#lobbyRoomNameInp')) $('#lobbyRoomNameInp').value = intent.roomName;
  }

  if (qAction === 'solo' || (intent && intent.action === 'solo')) {
    soloGame();
    return;
  }
  if (qAction === 'create' || qAction === 'arena' || (intent && intent.action === 'create')) {
    createRoom().then(() => {
      if (intent && intent.code && host) {
        code = intent.code;
        if ($('#rc')) $('#rc').textContent = code;
        openHostRoom();
      }
    });
    return;
  }
  if (qRoom || (intent && intent.action === 'join' && intent.code)) {
    const targetCode = qRoom || intent.code;
    const saved = SharbSession.loadGameSession('domino');
    if (saved && saved.code === targetCode && saved.host) {
      restoreTabletopSession();
      return;
    }
    window._sharbJoinVia = (qs.get('via') === 'public' || (intent && intent.via === 'public')) ? 'public' : 'code';
    if ($('#cd')) $('#cd').value = targetCode;
    joinRoom(targetCode);
    return;
  }

  // Otherwise restore saved session if user refreshed or navigated back
  restoreTabletopSession();
}

document.addEventListener('DOMContentLoaded', initTabletopPage);
window.addEventListener('beforeunload', saveTabletopSession);
