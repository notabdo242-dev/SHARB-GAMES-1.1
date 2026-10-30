/* =====================================================================
   DRAW & GUESS (ارسم وخمّن) — COMPLETE ONLINE MULTIPLAYER GAME MODULE
   ===================================================================== */
const DG_COLORS = [
  '#111827', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981',
  '#06b6d4', '#2563eb', '#8b5cf6', '#ec4899', '#78350f', '#64748b', '#84cc16'
];
const DG_SIZES = [
  { size: 4, label: 'رفيع (4px)' },
  { size: 8, label: 'متوسط (8px)' },
  { size: 14, label: 'عريض (14px)' },
  { size: 22, label: 'سميك (22px)' },
  { size: 32, label: 'فرشاة كبيرة (32px)' }
];

const DG_WORD_BANK = [
  // Arabic — حيوانات (Animals)
  { word: 'أسد', cat: 'حيوانات', lang: 'ar' },
  { word: 'فيل', cat: 'حيوانات', lang: 'ar' },
  { word: 'زرافة', cat: 'حيوانات', lang: 'ar' },
  { word: 'قطة', cat: 'حيوانات', lang: 'ar' },
  { word: 'كلب', cat: 'حيوانات', lang: 'ar' },
  { word: 'أرنب', cat: 'حيوانات', lang: 'ar' },
  { word: 'حصان', cat: 'حيوانات', lang: 'ar' },
  { word: 'سلحفاة', cat: 'حيوانات', lang: 'ar' },
  { word: 'تمساح', cat: 'حيوانات', lang: 'ar' },
  { word: 'دولفين', cat: 'حيوانات', lang: 'ar' },
  { word: 'بطريق', cat: 'حيوانات', lang: 'ar' },
  { word: 'فراشة', cat: 'حيوانات', lang: 'ar' },
  { word: 'نحلة', cat: 'حيوانات', lang: 'ar' },
  { word: 'عنكبوت', cat: 'حيوانات', lang: 'ar' },
  { word: 'سمكة', cat: 'حيوانات', lang: 'ar' },
  { word: 'أخطبوط', cat: 'حيوانات', lang: 'ar' },
  { word: 'جمل', cat: 'حيوانات', lang: 'ar' },
  { word: 'قرد', cat: 'حيوانات', lang: 'ar' },
  { word: 'ثعبان', cat: 'حيوانات', lang: 'ar' },
  { word: 'بومة', cat: 'حيوانات', lang: 'ar' },

  // Arabic — أطعمة وفواكه (Food & Drinks)
  { word: 'بيتزا', cat: 'أطعمة', lang: 'ar' },
  { word: 'برجر', cat: 'أطعمة', lang: 'ar' },
  { word: 'تفاحة', cat: 'أطعمة', lang: 'ar' },
  { word: 'موزة', cat: 'أطعمة', lang: 'ar' },
  { word: 'بطيخ', cat: 'أطعمة', lang: 'ar' },
  { word: 'فراولة', cat: 'أطعمة', lang: 'ar' },
  { word: 'أناناس', cat: 'أطعمة', lang: 'ar' },
  { word: 'آيس كريم', cat: 'أطعمة', lang: 'ar' },
  { word: 'كعكة', cat: 'أطعمة', lang: 'ar' },
  { word: 'جزر', cat: 'أطعمة', lang: 'ar' },
  { word: 'عنب', cat: 'أطعمة', lang: 'ar' },
  { word: 'برتقال', cat: 'أطعمة', lang: 'ar' },
  { word: 'بطاطس', cat: 'أطعمة', lang: 'ar' },
  { word: 'جبنة', cat: 'أطعمة', lang: 'ar' },
  { word: 'فنجان قهوة', cat: 'أطعمة', lang: 'ar' },
  { word: 'بيضة', cat: 'أطعمة', lang: 'ar' },
  { word: 'ذرة', cat: 'أطعمة', lang: 'ar' },
  { word: 'سمبوسة', cat: 'أطعمة', lang: 'ar' },

  // Arabic — أشياء وأدوات (Objects)
  { word: 'مفتاح', cat: 'أشياء', lang: 'ar' },
  { word: 'نظارة', cat: 'أشياء', lang: 'ar' },
  { word: 'ساعة يد', cat: 'أشياء', lang: 'ar' },
  { word: 'مظلة', cat: 'أشياء', lang: 'ar' },
  { word: 'كتاب', cat: 'أشياء', lang: 'ar' },
  { word: 'قلم رصاص', cat: 'أشياء', lang: 'ar' },
  { word: 'مقص', cat: 'أشياء', lang: 'ar' },
  { word: 'مصباح', cat: 'أشياء', lang: 'ar' },
  { word: 'هاتف', cat: 'أشياء', lang: 'ar' },
  { word: 'حاسوب', cat: 'أشياء', lang: 'ar' },
  { word: 'كاميرا', cat: 'أشياء', lang: 'ar' },
  { word: 'تلفزيون', cat: 'أشياء', lang: 'ar' },
  { word: 'كرسي', cat: 'أشياء', lang: 'ar' },
  { word: 'سرير', cat: 'أشياء', lang: 'ar' },
  { word: 'باب', cat: 'أشياء', lang: 'ar' },
  { word: 'شمعة', cat: 'أشياء', lang: 'ar' },
  { word: 'تاج', cat: 'أشياء', lang: 'ar' },
  { word: 'خاتم', cat: 'أشياء', lang: 'ar' },
  { word: 'حقيبة', cat: 'أشياء', lang: 'ar' },
  { word: 'حذاء', cat: 'أشياء', lang: 'ar' },
  { word: 'قبعة', cat: 'أشياء', lang: 'ar' },
  { word: 'فرشاة أسنان', cat: 'أشياء', lang: 'ar' },
  { word: 'مطرقة', cat: 'أشياء', lang: 'ar' },
  { word: 'سلم', cat: 'أشياء', lang: 'ar' },
  { word: 'جيتار', cat: 'أشياء', lang: 'ar' },
  { word: 'طبلة', cat: 'أشياء', lang: 'ar' },
  { word: 'جرس', cat: 'أشياء', lang: 'ar' },
  { word: 'مغناطيس', cat: 'أشياء', lang: 'ar' },
  { word: 'بوصلة', cat: 'أشياء', lang: 'ar' },
  { word: 'تلسكوب', cat: 'أشياء', lang: 'ar' },

  // Arabic — مواصلات وطبيعة ورياضة (Vehicles, Nature & Sports)
  { word: 'سيارة', cat: 'مواصلات', lang: 'ar' },
  { word: 'طائرة', cat: 'مواصلات', lang: 'ar' },
  { word: 'سفينة', cat: 'مواصلات', lang: 'ar' },
  { word: 'قطار', cat: 'مواصلات', lang: 'ar' },
  { word: 'دراجة', cat: 'مواصلات', lang: 'ar' },
  { word: 'صاروخ', cat: 'مواصلات', lang: 'ar' },
  { word: 'غواصة', cat: 'مواصلات', lang: 'ar' },
  { word: 'منطاد', cat: 'مواصلات', lang: 'ar' },
  { word: 'هليكوبتر', cat: 'مواصلات', lang: 'ar' },
  { word: 'إشارة مرور', cat: 'مواصلات', lang: 'ar' },
  { word: 'شمس', cat: 'طبيعة', lang: 'ar' },
  { word: 'قمر', cat: 'طبيعة', lang: 'ar' },
  { word: 'سحابة', cat: 'طبيعة', lang: 'ar' },
  { word: 'قوس قزح', cat: 'طبيعة', lang: 'ar' },
  { word: 'بركان', cat: 'طبيعة', lang: 'ar' },
  { word: 'جبل', cat: 'طبيعة', lang: 'ar' },
  { word: 'شجرة', cat: 'طبيعة', lang: 'ar' },
  { word: 'وردة', cat: 'طبيعة', lang: 'ar' },
  { word: 'نخلة', cat: 'طبيعة', lang: 'ar' },
  { word: 'جزيرة', cat: 'طبيعة', lang: 'ar' },
  { word: 'كرة قدم', cat: 'رياضة', lang: 'ar' },
  { word: 'كرة سلة', cat: 'رياضة', lang: 'ar' },
  { word: 'مضرب تنس', cat: 'رياضة', lang: 'ar' },
  { word: 'كأس البطولة', cat: 'رياضة', lang: 'ar' },
  { word: 'أهرامات', cat: 'معالم', lang: 'ar' },
  { word: 'قلعة', cat: 'معالم', lang: 'ar' },
  { word: 'منارة', cat: 'معالم', lang: 'ar' },
  { word: 'جسر', cat: 'معالم', lang: 'ar' },
  { word: 'رجل ثلج', cat: 'شخصيات', lang: 'ar' },
  { word: 'روبوت', cat: 'شخصيات', lang: 'ar' },

  // English — Animals, Food, Objects, Nature, Vehicles, Sports
  { word: 'Lion', cat: 'Animals', lang: 'en' },
  { word: 'Elephant', cat: 'Animals', lang: 'en' },
  { word: 'Giraffe', cat: 'Animals', lang: 'en' },
  { word: 'Penguin', cat: 'Animals', lang: 'en' },
  { word: 'Dolphin', cat: 'Animals', lang: 'en' },
  { word: 'Butterfly', cat: 'Animals', lang: 'en' },
  { word: 'Octopus', cat: 'Animals', lang: 'en' },
  { word: 'Turtle', cat: 'Animals', lang: 'en' },
  { word: 'Rabbit', cat: 'Animals', lang: 'en' },
  { word: 'Shark', cat: 'Animals', lang: 'en' },
  { word: 'Crocodile', cat: 'Animals', lang: 'en' },
  { word: 'Spider', cat: 'Animals', lang: 'en' },
  { word: 'Owl', cat: 'Animals', lang: 'en' },
  { word: 'Camel', cat: 'Animals', lang: 'en' },
  { word: 'Monkey', cat: 'Animals', lang: 'en' },
  { word: 'Pizza', cat: 'Food', lang: 'en' },
  { word: 'Burger', cat: 'Food', lang: 'en' },
  { word: 'Watermelon', cat: 'Food', lang: 'en' },
  { word: 'Pineapple', cat: 'Food', lang: 'en' },
  { word: 'Strawberry', cat: 'Food', lang: 'en' },
  { word: 'Ice Cream', cat: 'Food', lang: 'en' },
  { word: 'Cupcake', cat: 'Food', lang: 'en' },
  { word: 'Banana', cat: 'Food', lang: 'en' },
  { word: 'Apple', cat: 'Food', lang: 'en' },
  { word: 'Carrot', cat: 'Food', lang: 'en' },
  { word: 'Donut', cat: 'Food', lang: 'en' },
  { word: 'Coffee', cat: 'Food', lang: 'en' },
  { word: 'Umbrella', cat: 'Objects', lang: 'en' },
  { word: 'Glasses', cat: 'Objects', lang: 'en' },
  { word: 'Crown', cat: 'Objects', lang: 'en' },
  { word: 'Guitar', cat: 'Objects', lang: 'en' },
  { word: 'Camera', cat: 'Objects', lang: 'en' },
  { word: 'Scissors', cat: 'Objects', lang: 'en' },
  { word: 'Key', cat: 'Objects', lang: 'en' },
  { word: 'Candle', cat: 'Objects', lang: 'en' },
  { word: 'Hammer', cat: 'Objects', lang: 'en' },
  { word: 'Ladder', cat: 'Objects', lang: 'en' },
  { word: 'Telescope', cat: 'Objects', lang: 'en' },
  { word: 'Compass', cat: 'Objects', lang: 'en' },
  { word: 'Headphones', cat: 'Objects', lang: 'en' },
  { word: 'Diamond', cat: 'Objects', lang: 'en' },
  { word: 'Backpack', cat: 'Objects', lang: 'en' },
  { word: 'Clock', cat: 'Objects', lang: 'en' },
  { word: 'Lightbulb', cat: 'Objects', lang: 'en' },
  { word: 'Magnet', cat: 'Objects', lang: 'en' },
  { word: 'Airplane', cat: 'Vehicles', lang: 'en' },
  { word: 'Rocket', cat: 'Vehicles', lang: 'en' },
  { word: 'Submarine', cat: 'Vehicles', lang: 'en' },
  { word: 'Helicopter', cat: 'Vehicles', lang: 'en' },
  { word: 'Bicycle', cat: 'Vehicles', lang: 'en' },
  { word: 'Train', cat: 'Vehicles', lang: 'en' },
  { word: 'Sailboat', cat: 'Vehicles', lang: 'en' },
  { word: 'Volcano', cat: 'Nature', lang: 'en' },
  { word: 'Rainbow', cat: 'Nature', lang: 'en' },
  { word: 'Mountain', cat: 'Nature', lang: 'en' },
  { word: 'Sunflower', cat: 'Nature', lang: 'en' },
  { word: 'Cactus', cat: 'Nature', lang: 'en' },
  { word: 'Island', cat: 'Nature', lang: 'en' },
  { word: 'Snowman', cat: 'Characters', lang: 'en' },
  { word: 'Robot', cat: 'Characters', lang: 'en' },
  { word: 'Castle', cat: 'Landmarks', lang: 'en' },
  { word: 'Pyramid', cat: 'Landmarks', lang: 'en' },
  { word: 'Lighthouse', cat: 'Landmarks', lang: 'en' },
  { word: 'Football', cat: 'Sports', lang: 'en' },
  { word: 'Basketball', cat: 'Sports', lang: 'en' },
  { word: 'Trophy', cat: 'Sports', lang: 'en' }
];

function dgNormWord(str){
  if(!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    // Strip Arabic diacritics & tatweel
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    // Normalize Alef variants (أ إ آ ٱ -> ا)
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize Teh Marbuta (ة -> ه)
    .replace(/ة/g, 'ه')
    // Normalize Alef Maksura (ى -> ي)
    .replace(/ى/g, 'ي')
    // Normalize Hamza on Waw/Ya
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    // Remove punctuation
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function dgLevenshtein(a, b){
  if(a === b) return 0;
  const al = a.length, bl = b.length;
  if(!al) return bl;
  if(!bl) return al;
  const dp = Array.from({length: al + 1}, () => new Array(bl + 1).fill(0));
  for(let i = 0; i <= al; i++) dp[i][0] = i;
  for(let j = 0; j <= bl; j++) dp[0][j] = j;
  for(let i = 1; i <= al; i++){
    for(let j = 1; j <= bl; j++){
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[al][bl];
}

function dgIsCloseGuess(normGuess, normSecret){
  if(!normGuess || !normSecret || normGuess === normSecret) return false;
  if(normSecret.length < 4 || Math.abs(normGuess.length - normSecret.length) > 1) return false;
  return dgLevenshtein(normGuess, normSecret) === 1;
}

function dgBuildInitialMask(word){
  return Array.from(String(word || '')).map(ch => (ch === ' ' ? ' ' : '_'));
}

function dgFormatMaskDisplay(maskArr){
  if(!Array.isArray(maskArr) || !maskArr.length) return '_ _ _ _';
  return maskArr.map(ch => (ch === ' ' ? '   ' : ch)).join(' ');
}

function dgCountLetters(word){
  return Array.from(String(word || '')).filter(ch => ch !== ' ').length;
}

const DG = {
  code: '',
  host: false,
  subs: [],
  hbTimer: null,
  tickTimer: null,
  moveFlushTimer: null,
  // Public state synced across all players in the room
  S: null,
  // Host-only private state (never broadcast directly)
  H: {
    secretWordObj: null,
    wordChoices: [],
    usedWords: new Set(),
    hintsGiven: 0,
    botTimer: null
  },
  // Local player's private knowledge (only populated if ME === drawerPid)
  myWordChoices: null,
  myWordChoicesTurnSeq: -1,
  mySecretWord: null,
  // Drawing state & history for the current turn
  tool: 'pen', // 'pen' | 'eraser'
  color: '#111827',
  size: 8,
  isDrawing: false,
  currentStroke: null,
  strokes: [], // array of { id, tool, color, size, pts: [[x,y], ...] }
  turnSeqRendered: -1,
  // Feed messages in the Guess Panel
  feed: [],
  seenFeedIds: new Set(),
  // Draft config before creating room
  draftCfg: {
    rounds: 3,
    drawTime: 80,
    maxPlayers: 8,
    lang: 'ar'
  }
};
window.DG = DG;

function dgGetActiveDrawerSecret(){
  if(!DG.S || DG.S.drawerPid !== ME) return null;
  if(DG.mySecretWord && DG.mySecretWord.word && (!DG.mySecretWord.turnSeq || DG.mySecretWord.turnSeq === DG.S.turnSeq)){
    return DG.mySecretWord;
  }
  if(DG.host && DG.H && DG.H.secretWordObj && DG.H.secretWordObj.word){
    return { word: DG.H.secretWordObj.word, cat: DG.H.secretWordObj.cat };
  }
  return null;
}

function dgRebindMQTTSubs(){
  if(!DG.subs || !DG.subs.length) return;
  for(const s of DG.subs){
    NET.topics.set(s.topic, s.wrappedFn || s.fn);
    if(NET.client && NET.ready){
      try{ NET.client.subscribe(s.topic, {qos:0}); }catch(e){}
    }
  }
}

function dgOpen(){
  ['#home','#dominoPage','#unoPage','#lobbyDomino','#lobbyUno','#lobby','#game','#bakasa','#chess','#ttt','#c4'].forEach(s=>{
    const el = $(s); if(el) el.classList.add('hide');
  });
  $('#draw').classList.remove('hide');
  $('#backHome').classList.remove('hide');
  setSharbHeaderBrand('SHARB GAMES • ارسم وخمّن DRAW & GUESS','Your Ultimate Online Gaming Hub • رسم وتخمين مباشر','🎨');
  dgRender();
  window.scrollTo(0, 0);
}
window.dgOpen = dgOpen;

function dgLeaveRoom(rerender=true){
  if(DG.code){
    if(DG.host && typeof pubDirNotifyRoomClosed === 'function'){
      pubDirNotifyRoomClosed('draw', DG.code);
    }
    if(DG.S){
      arcPub('draw', DG.code, 'bye', { pid: ME, uid: PF.uid, name: PF.name, hostClosed: !!DG.host });
    }
  }
  arcClearSubs(DG);
  if(DG.hbTimer){ clearInterval(DG.hbTimer); DG.hbTimer = null; }
  if(DG.tickTimer){ clearInterval(DG.tickTimer); DG.tickTimer = null; }
  if(DG.moveFlushTimer){ clearTimeout(DG.moveFlushTimer); DG.moveFlushTimer = null; }
  if(DG.H && DG.H.botTimer){ clearTimeout(DG.H.botTimer); DG.H.botTimer = null; }
  DG.code = '';
  DG.host = false;
  DG.S = null;
  DG.myWordChoices = null;
  DG.myWordChoicesTurnSeq = -1;
  DG.mySecretWord = null;
  DG.strokes = [];
  DG.currentStroke = null;
  DG.isDrawing = false;
  DG.feed = [];
  DG.seenFeedIds.clear();
  const root = document.getElementById('dgRoot');
  if(root){
    delete root.dataset.dgPhase;
    delete root.dataset.dgTurnSeq;
    delete root.dataset.dgIsDrawer;
    delete root.dataset.dgCode;
  }
  if(rerender) dgRender();
}
window.dgLeaveRoom = dgLeaveRoom;

function dgAddFeedItem(item){
  if(!item) return;
  const fid = item.id || (item.ts + '_' + (item.pid || '') + '_' + (item.type || ''));
  if(DG.seenFeedIds.has(fid)) return;
  DG.seenFeedIds.add(fid);
  DG.feed.push(Object.assign({ id: fid }, item));
  if(DG.feed.length > 120) DG.feed.shift();
  dgRenderFeedOnly();
}

function dgBroadcastState(){
  if(!DG.host || !DG.code || !DG.S) return;
  DG.S.ts = Date.now();
  arcPub('draw', DG.code, 'state', JSON.parse(JSON.stringify(DG.S)), true);
  if(typeof pubDirSyncHostRoom === 'function') pubDirSyncHostRoom(true);
}

function dgSendPrivateToDrawer(pkt){
  if(!DG.code) return;
  arcPub('draw', DG.code, 'priv', pkt, true);
}

async function dgCreateRoom(){
  dgLeaveRoom(false);
  const rmCode = genCode();
  DG.code = rmCode;
  DG.host = true;
  const me = me0();
  DG.H = {
    secretWordObj: null,
    wordChoices: [],
    usedWords: new Set(),
    hintsGiven: 0,
    botTimer: null
  };
  DG.S = {
    code: rmCode,
    hostPid: ME,
    phase: 'lobby', // 'lobby' | 'choose_word' | 'drawing' | 'turn_end' | 'game_over'
    cfg: Object.assign({}, DG.draftCfg),
    round: 1,
    turnIndex: 0,
    turnSeq: 0,
    drawerPid: '',
    drawerName: '',
    phaseEndsAt: 0,
    wordLen: 0,
    wordCat: '',
    wordLang: 'ar',
    hintMask: [],
    revealedWord: '',
    guessedPids: [],
    turnDelta: {},
    players: [
      {
        pid: me.pid,
        uid: me.uid,
        name: me.name,
        av: me.av,
        col: me.col,
        score: 0,
        isHost: true,
        isBot: false,
        gone: false,
        lastSeen: Date.now()
      }
    ],
    ts: Date.now()
  };
  dgSetupSubscriptions(rmCode);
  dgBroadcastState();
  ensureMQTT().then(ok => {
    if(ok && DG.code === rmCode && DG.host){
      dgRebindMQTTSubs();
      dgBroadcastState();
    }
  }).catch(()=>{});
  dgAddFeedItem({
    id: 'sys_create_' + Date.now(),
    type: 'sys',
    text: `🎨 تم إنشاء غرفة ارسم وخمّن بكود ${rmCode}! ادعُ أصدقاءك للبدء.`
  });
  toast('تم إنشاء غرفة ارسم وخمّن: ' + rmCode + ' 🎨', 'ok');
  dgRender();
}
window.dgCreateRoom = dgCreateRoom;

async function dgJoinRoom(rawCode){
  const c = String(rawCode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if(c.length < 4){
    toast('اكتب كود غرفة صحيح (٤-٦ أحرف أو أرقام)', 'warn');
    return;
  }
  dgLeaveRoom(false);
  DG.code = c;
  DG.host = false;
  DG.S = null;
  dgSetupSubscriptions(c);
  const viaMode = window._sharbJoinVia || 'code';
  arcPub('draw', c, 'join', { player: me0(), via: viaMode, ts: Date.now() });
  setTimeout(()=>{
    if(DG.code === c && !DG.host){
      arcPub('draw', c, 'join', { player: me0(), via: viaMode, ts: Date.now() });
    }
  }, 450);
  ensureMQTT().then(ok => {
    if(ok && DG.code === c && !DG.host){
      dgRebindMQTTSubs();
      arcPub('draw', c, 'join', { player: me0(), ts: Date.now() });
    }
  }).catch(()=>{});
  toast('جاري الاتصال بغرفة ارسم وخمّن ' + c + '...', 'ok', 2200);
  dgRender();
}
window.dgJoinRoom = dgJoinRoom;

function dgHostUpsertGuestPlayer(rmCode, p, via){
  if(!DG.host || !DG.S || !p || !p.pid) return false;
  if(via === 'public' && typeof getRoomVisibility === 'function' && getRoomVisibility('draw') === 'private'){
    arcPub('draw', rmCode, 'priv', { toPid: p.pid, type: 'room_rejected', msg: 'هذه الغرفة خاصة ولا يمكن الانضمام إليها من القائمة العامة' });
    return false;
  }
  const existing = DG.S.players.find(x => x.pid === p.pid || (x.uid && p.uid && x.uid === p.uid));
  let isNewOrRestored = false;
  if(existing){
    const wasGone = !!existing.gone;
    const pidChanged = existing.pid !== p.pid;
    existing.pid = p.pid;
    existing.name = p.name || existing.name;
    existing.av = p.av || existing.av;
    existing.col = p.col || existing.col;
    existing.gone = false;
    existing.lastSeen = Date.now();
    if(wasGone || pidChanged) isNewOrRestored = true;
  } else {
    if(DG.S.phase !== 'lobby'){
      arcPub('draw', rmCode, 'priv', { toPid: p.pid, type: 'room_rejected', msg: 'المباراة جارية حاليًا — انتظر انتهاء الجولة للانضمام' });
      return false;
    }
    const activeCount = DG.S.players.filter(x => !x.gone).length;
    if(activeCount >= (DG.S.cfg.maxPlayers || 8)){
      arcPub('draw', rmCode, 'priv', { toPid: p.pid, type: 'room_full' });
      if(typeof pubDirSyncHostRoom === 'function') pubDirSyncHostRoom(true);
      return false;
    }
    if(typeof pubDirClearReservation === 'function') pubDirClearReservation(p.pid);
    DG.S.players.push({
      pid: p.pid,
      uid: p.uid,
      name: p.name,
      av: p.av,
      col: p.col,
      score: 0,
      isHost: false,
      isBot: false,
      gone: false,
      lastSeen: Date.now()
    });
    arcPub('draw', rmCode, 'feed', {
      id: 'join_' + p.pid + '_' + Date.now(),
      type: 'sys',
      text: `👋 انضم ${p.name} إلى الغرفة!`
    });
    isNewOrRestored = true;
  }
  return isNewOrRestored;
}

function dgSetupSubscriptions(rmCode){
  arcClearSubs(DG);

  // 1. Join requests (processed by Host)
  arcSub(DG, 'draw', rmCode, 'join', d => {
    if(!DG.host || !DG.S || !d || !d.player) return;
    const p = d.player;
    if(!dgHostUpsertGuestPlayer(rmCode, p, d.via)) return;
    dgBroadcastState();
    // Sync current canvas strokes to newly joined/rejoined player
    if(DG.S.phase === 'drawing' && (DG.strokes.length || DG.currentStroke)){
      const allStrokes = DG.currentStroke ? DG.strokes.concat([DG.currentStroke]) : DG.strokes;
      arcPub('draw', rmCode, 'draw', {
        action: 'sync_strokes',
        turnSeq: DG.S.turnSeq,
        drawerPid: DG.S.drawerPid,
        strokes: allStrokes
      });
    }
    // If the rejoined player is the active Drawer, re-send their private word
    if(DG.S.drawerPid === p.pid){
      if(DG.S.phase === 'choose_word' && DG.H.wordChoices.length){
        dgSendPrivateToDrawer({
          toPid: p.pid,
          type: 'word_choices',
          turnSeq: DG.S.turnSeq,
          choices: DG.H.wordChoices
        });
      } else if(DG.S.phase === 'drawing' && DG.H.secretWordObj){
        dgSendPrivateToDrawer({
          toPid: p.pid,
          type: 'secret_word',
          turnSeq: DG.S.turnSeq,
          word: DG.H.secretWordObj.word,
          cat: DG.H.secretWordObj.cat
        });
      }
    }
  });

  // 1b. Guest Heartbeat & Stroke Sync Verification (processed by Host)
  arcSub(DG, 'draw', rmCode, 'hb', pkt => {
    if(!DG.host || !DG.S || !pkt || !pkt.pid) return;
    const added = pkt.player ? dgHostUpsertGuestPlayer(rmCode, pkt.player) : false;
    const p = DG.S.players.find(x => x.pid === pkt.pid);
    if(p) p.lastSeen = Date.now();
    if(added || pkt.turnSeq !== DG.S.turnSeq){
      dgBroadcastState();
    }
    if(DG.S.phase === 'drawing' && pkt.turnSeq === DG.S.turnSeq && pkt.pid !== DG.S.drawerPid){
      if(typeof pkt.strokeCount === 'number' && pkt.strokeCount !== DG.strokes.length && !DG.isDrawing){
        arcPub('draw', rmCode, 'draw', {
          action: 'sync_strokes',
          turnSeq: DG.S.turnSeq,
          drawerPid: DG.S.drawerPid,
          strokes: DG.strokes
        });
      }
    }
  });

  // 2. Room State broadcast (processed by all clients)
  arcSub(DG, 'draw', rmCode, 'state', s => {
    if(!s || s.code !== rmCode) return;
    if(DG.host){
      dgRender();
      return;
    }
    const prevTurnSeq = DG.S ? DG.S.turnSeq : -1;
    const prevPhase = DG.S ? DG.S.phase : '';
    DG.S = s;

    // Reset canvas & turn-local secrets only when turnSeq actually changes
    if(s.turnSeq !== prevTurnSeq){
      DG.strokes = [];
      DG.currentStroke = null;
      DG.isDrawing = false;
      if(s.drawerPid !== ME){
        DG.myWordChoices = null;
        DG.myWordChoicesTurnSeq = -1;
        DG.mySecretWord = null;
      } else {
        if(DG.myWordChoicesTurnSeq !== s.turnSeq){
          DG.myWordChoices = null;
        }
        if(DG.mySecretWord && DG.mySecretWord.turnSeq !== s.turnSeq){
          DG.mySecretWord = null;
        }
      }
      dgRedrawCanvas();
    }
    if(s.phase !== 'choose_word'){
      DG.myWordChoices = null;
    }
    if(s.phase === 'lobby'){
      DG.mySecretWord = null;
      DG.myWordChoices = null;
      DG.myWordChoicesTurnSeq = -1;
      DG.strokes = [];
      DG.currentStroke = null;
    }
    // If I am the Drawer and haven't received my private packet yet, request it from Host
    if(s.drawerPid === ME && ((s.phase === 'choose_word' && (!DG.myWordChoices || !DG.myWordChoices.length)) || (s.phase === 'drawing' && (!DG.mySecretWord || !DG.mySecretWord.word)))){
      arcPub('draw', rmCode, 'req_priv', { pid: ME, turnSeq: s.turnSeq });
    }
    if(s.phase === 'game_over' && prevPhase !== 'game_over'){
      if(typeof confettiBurst === 'function') confettiBurst();
      beep(880, 0.16, 'triangle', 0.12);
    }
    dgRender();
  });

  // 2b. Drawer private word re-request (processed by Host)
  arcSub(DG, 'draw', rmCode, 'req_priv', req => {
    if(!DG.host || !DG.S || !req || req.pid !== DG.S.drawerPid) return;
    if(DG.S.phase === 'choose_word' && DG.H.wordChoices.length){
      dgSendPrivateToDrawer({
        toPid: req.pid,
        type: 'word_choices',
        turnSeq: DG.S.turnSeq,
        choices: DG.H.wordChoices
      });
    } else if(DG.S.phase === 'drawing' && DG.H.secretWordObj){
      dgSendPrivateToDrawer({
        toPid: req.pid,
        type: 'secret_word',
        turnSeq: DG.S.turnSeq,
        word: DG.H.secretWordObj.word,
        cat: DG.H.secretWordObj.cat
      });
    }
  });

  // 3. Targeted private messages (word choices & secret word for Drawer)
  arcSub(DG, 'draw', rmCode, 'priv', pkt => {
    if(!pkt || pkt.toPid !== ME) return;
    if(pkt.type === 'room_full' || pkt.type === 'room_rejected'){
      toast(pkt.msg || 'الغرفة ممتلئة بالحد الأقصى من اللاعبين!', 'warn');
      dgLeaveRoom(true);
      return;
    }
    if(DG.S && pkt.turnSeq && pkt.turnSeq < DG.S.turnSeq) return;
    if(pkt.type === 'word_choices'){
      DG.myWordChoices = pkt.choices || [];
      DG.myWordChoicesTurnSeq = pkt.turnSeq || (DG.S ? DG.S.turnSeq : 0);
      dgRender();
    } else if(pkt.type === 'secret_word'){
      DG.mySecretWord = { word: pkt.word, cat: pkt.cat, turnSeq: pkt.turnSeq || (DG.S ? DG.S.turnSeq : 0) };
      DG.myWordChoices = null;
      dgRender();
    }
  });

  // 4. Drawer word selection packet (processed by Host)
  arcSub(DG, 'draw', rmCode, 'pick_word', pkt => {
    if(!DG.host || !DG.S || DG.S.phase !== 'choose_word') return;
    if(!pkt || pkt.pid !== DG.S.drawerPid) return;
    dgHostCommitWordChoice(pkt.choiceIndex || 0);
  });

  // 5. Real-time Canvas Drawing packets (processed by all clients, self-healing & strictly validated)
  arcSub(DG, 'draw', rmCode, 'draw', pkt => {
    if(!DG.S || !pkt) return;
    if(pkt.turnSeq !== DG.S.turnSeq) return;
    if(pkt.drawerPid !== DG.S.drawerPid) return;

    if(pkt.action === 'stroke_start'){
      if(pkt.drawerPid === ME || !pkt.stroke) return;
      if(DG.strokes.some(st => st.id === pkt.stroke.id)) return;
      if(DG.currentStroke && DG.currentStroke.id === pkt.stroke.id && DG.currentStroke.pts.length >= (pkt.stroke.pts ? pkt.stroke.pts.length : 0)){
        return;
      }
      DG.currentStroke = {
        id: pkt.stroke.id,
        tool: pkt.stroke.tool || 'pen',
        color: pkt.stroke.color || '#111827',
        size: Number(pkt.stroke.size) || 8,
        pts: Array.isArray(pkt.stroke.pts) ? pkt.stroke.pts.slice() : []
      };
      dgDrawSegmentOnCanvas(DG.currentStroke, true);
    } else if(pkt.action === 'stroke_move'){
      if(pkt.drawerPid === ME) return;
      const sId = pkt.strokeId || (pkt.stroke && pkt.stroke.id);
      if(!sId || DG.strokes.some(st => st.id === sId)) return;
      if(!DG.currentStroke || DG.currentStroke.id !== sId){
        // Self-heal if stroke_start was missed or delayed
        const initPts = Array.isArray(pkt.pts) ? pkt.pts.slice() : (pkt.pt ? [pkt.pt] : []);
        if(!initPts.length) return;
        DG.currentStroke = {
          id: sId,
          tool: pkt.tool || 'pen',
          color: pkt.color || '#111827',
          size: Number(pkt.size) || 8,
          pts: initPts
        };
        dgDrawSegmentOnCanvas(DG.currentStroke, false);
        return;
      }
      if(Array.isArray(pkt.pts)){
        const prevLen = DG.currentStroke.pts.length;
        if(pkt.pts.length > prevLen){
          for(let i = prevLen; i < pkt.pts.length; i++){
            DG.currentStroke.pts.push(pkt.pts[i]);
            dgDrawPointAppend(DG.currentStroke);
          }
        }
      } else if(pkt.pt){
        DG.currentStroke.pts.push(pkt.pt);
        dgDrawPointAppend(DG.currentStroke);
      }
    } else if(pkt.action === 'stroke_full'){
      if(pkt.drawerPid === ME || !pkt.stroke) return;
      if(DG.currentStroke && DG.currentStroke.id === pkt.stroke.id){
        DG.currentStroke = null;
      }
      const existingIdx = DG.strokes.findIndex(st => st.id === pkt.stroke.id);
      if(existingIdx >= 0){
        DG.strokes[existingIdx] = pkt.stroke;
      } else {
        DG.strokes.push(pkt.stroke);
      }
      dgRedrawCanvas();
    } else if(pkt.action === 'undo'){
      if(pkt.drawerPid === ME) return;
      DG.currentStroke = null;
      if(Array.isArray(pkt.strokes)){
        DG.strokes = pkt.strokes;
      } else {
        DG.strokes.pop();
      }
      dgRedrawCanvas();
    } else if(pkt.action === 'clear'){
      if(pkt.drawerPid === ME) return;
      DG.strokes = [];
      DG.currentStroke = null;
      dgRedrawCanvas();
    } else if(pkt.action === 'sync_strokes'){
      if(pkt.drawerPid === ME && DG.isDrawing) return;
      if(Array.isArray(pkt.strokes)){
        DG.strokes = pkt.strokes;
        DG.currentStroke = null;
        dgRedrawCanvas();
      }
    }
  });

  // 6. Guess submissions (processed by Host)
  arcSub(DG, 'draw', rmCode, 'guess', pkt => {
    if(!DG.host || !DG.S || !pkt || !pkt.pid) return;
    dgHostHandleGuess(pkt);
  });

  // 7. Public Feed events (celebrations, guesses, hints, system notices)
  arcSub(DG, 'draw', rmCode, 'feed', item => {
    if(!item) return;
    if(item.type === 'correct'){
      beep(880, 0.11, 'sine', 0.1);
    } else if(item.type === 'close' && item.targetPid && item.targetPid !== ME){
      return;
    }
    dgAddFeedItem(item);
  });

  // 8. Player leave / disconnect handling
  arcSub(DG, 'draw', rmCode, 'bye', d => {
    if(!d || !d.pid || d.pid === ME) return;
    if(DG.host && DG.S){
      const p = DG.S.players.find(x => x.pid === d.pid);
      if(p && !p.gone){
        p.gone = true;
        arcPub('draw', rmCode, 'feed', {
          id: 'bye_' + d.pid + '_' + Date.now(),
          type: 'sys',
          text: `🚪 غادر ${p.name || 'لاعب'} الغرفة.`
        });
        if(DG.S.drawerPid === d.pid && (DG.S.phase === 'choose_word' || DG.S.phase === 'drawing')){
          dgHostEndTurn('غادر الرسام الجولة الحالية');
        } else {
          dgBroadcastState();
        }
      }
    } else if(!DG.host && DG.S && d.pid === DG.S.hostPid){
      toast('غادر مضيف الغرفة', 'warn');
    }
  });

  // 9. Periodic Heartbeat & Auto-Discovery Retry Timer (DG.hbTimer)
  if(DG.hbTimer) clearInterval(DG.hbTimer);
  DG.hbTimer = setInterval(() => {
    if(!DG.code || DG.code !== rmCode) return;
    if(!DG.host){
      if(!DG.S){
        arcPub('draw', rmCode, 'join', { player: me0(), ts: Date.now() });
      } else {
        arcPub('draw', rmCode, 'hb', {
          pid: ME,
          player: me0(),
          turnSeq: DG.S.turnSeq,
          strokeCount: DG.strokes.length,
          ts: Date.now()
        });
        if(DG.S.drawerPid === ME){
          if(DG.S.phase === 'choose_word' && (!DG.myWordChoices || !DG.myWordChoices.length)){
            arcPub('draw', rmCode, 'req_priv', { pid: ME, turnSeq: DG.S.turnSeq });
          } else if(DG.S.phase === 'drawing' && (!DG.mySecretWord || !DG.mySecretWord.word)){
            arcPub('draw', rmCode, 'req_priv', { pid: ME, turnSeq: DG.S.turnSeq });
          }
        }
      }
    }
  }, 2200);

  // Host tick timer (manages phase countdowns, progressive hints, and turn transitions)
  if(DG.tickTimer) clearInterval(DG.tickTimer);
  DG.tickTimer = setInterval(() => {
    dgUpdateTimerDOM();
    if(DG.host && DG.S){
      dgHostTick();
    }
  }, 500);
}

/* ================= HOST GAME ENGINE & STATE MACHINE ================= */
function dgHostStartMatch(){
  if(!DG.host || !DG.S) return;
  const active = DG.S.players.filter(p => !p.gone);
  if(active.length < 2){
    toast('تحتاج إلى لاعبين اثنين على الأقل لبدء المباراة', 'warn', 4000);
    return;
  }
  DG.H.usedWords.clear();
  DG.S.players.forEach(p => { p.score = 0; });
  DG.S.round = 1;
  DG.S.turnIndex = 0;
  dgHostStartChooseWordPhase();
}
window.dgHostStartMatch = dgHostStartMatch;

function dgPickRandomWords(langPref, count=3){
  const pool = DG_WORD_BANK.filter(w => {
    if(langPref === 'ar') return w.lang === 'ar';
    if(langPref === 'en') return w.lang === 'en';
    return true;
  });
  let available = pool.filter(w => !DG.H.usedWords.has(w.word));
  if(available.length < count){
    DG.H.usedWords.clear();
    available = pool.slice();
  }
  const shuffled = available.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function dgHostStartChooseWordPhase(){
  if(!DG.host || !DG.S) return;
  if(DG.H.botTimer){ clearTimeout(DG.H.botTimer); DG.H.botTimer = null; }

  const active = DG.S.players.filter(p => !p.gone);
  if(active.length < 2){
    DG.S.phase = 'lobby';
    dgBroadcastState();
    return;
  }
  if(DG.S.turnIndex >= active.length){
    DG.S.turnIndex = 0;
    DG.S.round += 1;
  }
  if(DG.S.round > (DG.S.cfg.rounds || 3)){
    DG.S.phase = 'game_over';
    DG.S.phaseEndsAt = 0;
    dgBroadcastState();
    return;
  }

  const drawer = active[DG.S.turnIndex];
  const choices = dgPickRandomWords(DG.S.cfg.lang || 'ar', 3);
  DG.H.wordChoices = choices;
  DG.H.secretWordObj = null;
  DG.H.hintsGiven = 0;

  DG.S.turnSeq = (DG.S.turnSeq || 0) + 1;
  DG.S.phase = 'choose_word';
  DG.S.drawerPid = drawer.pid;
  DG.S.drawerName = drawer.name;
  DG.S.phaseEndsAt = Date.now() + 15000;
  DG.S.wordLen = 0;
  DG.S.wordCat = '';
  DG.S.wordLang = DG.S.cfg.lang || 'ar';
  DG.S.hintMask = [];
  DG.S.revealedWord = '';
  DG.S.guessedPids = [];
  DG.S.turnDelta = {};
  DG.strokes = [];
  DG.currentStroke = null;
  DG.isDrawing = false;

  if(drawer.pid === ME){
    DG.myWordChoices = choices;
    DG.myWordChoicesTurnSeq = DG.S.turnSeq;
    DG.mySecretWord = null;
  } else {
    DG.myWordChoices = null;
    DG.myWordChoicesTurnSeq = -1;
    DG.mySecretWord = null;
  }

  dgBroadcastState();
  dgSendPrivateToDrawer({
    toPid: drawer.pid,
    type: 'word_choices',
    turnSeq: DG.S.turnSeq,
    choices
  });

  arcPub('draw', DG.code, 'feed', {
    id: 'turn_' + DG.S.turnSeq,
    type: 'sys',
    text: `🎨 الجولة ${DG.S.round}/${DG.S.cfg.rounds} — دور ${drawer.name} لاختيار كلمة والرسم!`
  });

  if(drawer.isBot){
    DG.H.botTimer = setTimeout(() => {
      if(DG.host && DG.S && DG.S.phase === 'choose_word' && DG.S.drawerPid === drawer.pid){
        dgHostCommitWordChoice(0);
      }
    }, 1800);
  }
}

function dgHostCommitWordChoice(choiceIdx){
  if(!DG.host || !DG.S || DG.S.phase !== 'choose_word') return;
  const choices = DG.H.wordChoices || [];
  const picked = choices[choiceIdx] || choices[0] || DG_WORD_BANK[0];
  DG.H.secretWordObj = picked;
  DG.H.usedWords.add(picked.word);
  DG.H.hintsGiven = 0;

  const drawSecs = Number(DG.S.cfg.drawTime) || 80;
  DG.S.phase = 'drawing';
  DG.S.phaseEndsAt = Date.now() + drawSecs * 1000;
  DG.S.wordLen = dgCountLetters(picked.word);
  DG.S.wordCat = picked.cat;
  DG.S.wordLang = picked.lang;
  DG.S.hintMask = dgBuildInitialMask(picked.word);
  DG.S.revealedWord = '';

  if(DG.S.drawerPid === ME){
    DG.mySecretWord = { word: picked.word, cat: picked.cat, turnSeq: DG.S.turnSeq };
    DG.myWordChoices = null;
  }

  dgBroadcastState();
  dgSendPrivateToDrawer({
    toPid: DG.S.drawerPid,
    type: 'secret_word',
    turnSeq: DG.S.turnSeq,
    word: picked.word,
    cat: picked.cat
  });

  arcPub('draw', DG.code, 'feed', {
    id: 'drawstart_' + DG.S.turnSeq,
    type: 'sys',
    text: `✏️ بدأ ${DG.S.drawerName} الرسم! الكلمة من تصنيف (${picked.cat}) وعدد حروفها (${DG.S.wordLen}).`
  });

  dgHostScheduleBotActions();
}

function dgPlayerPickWord(idx){
  if(!DG.S || DG.S.phase !== 'choose_word' || DG.S.drawerPid !== ME) return;
  let chosen = null;
  if(Array.isArray(DG.myWordChoices) && DG.myWordChoices[idx]){
    chosen = DG.myWordChoices[idx];
    DG.mySecretWord = { word: chosen.word, cat: chosen.cat, turnSeq: DG.S.turnSeq };
  }
  if(DG.host){
    dgHostCommitWordChoice(idx);
  } else {
    if(chosen){
      const drawSecs = Number(DG.S.cfg && DG.S.cfg.drawTime) || 80;
      DG.S.phase = 'drawing';
      DG.S.phaseEndsAt = Date.now() + drawSecs * 1000;
      DG.S.wordLen = dgCountLetters(chosen.word);
      DG.S.wordCat = chosen.cat;
      DG.S.hintMask = dgBuildInitialMask(chosen.word);
      DG.myWordChoices = null;
      dgRender();
    }
    arcPub('draw', DG.code, 'pick_word', { pid: ME, choiceIndex: idx, ts: Date.now() });
  }
}
window.dgPlayerPickWord = dgPlayerPickWord;

function dgHostRevealOneHintLetter(hintNumber){
  if(!DG.host || !DG.S || DG.S.phase !== 'drawing' || !DG.H.secretWordObj) return;
  const wordChars = Array.from(DG.H.secretWordObj.word);
  const mask = DG.S.hintMask.slice();
  const hiddenIndices = [];
  for(let i = 0; i < wordChars.length; i++){
    if(wordChars[i] !== ' ' && mask[i] === '_'){
      hiddenIndices.push(i);
    }
  }
  if(hiddenIndices.length <= 2) return;
  const pickIdx = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
  mask[pickIdx] = wordChars[pickIdx];
  DG.S.hintMask = mask;
  dgBroadcastState();
  arcPub('draw', DG.code, 'feed', {
    id: 'hint_' + DG.S.turnSeq + '_' + hintNumber,
    type: 'sys',
    text: `💡 تلميح ${hintNumber}: تم كشف حرف في الكلمة (${dgFormatMaskDisplay(mask)})!`
  });
}

function dgHostTick(){
  if(!DG.host || !DG.S) return;
  const now = Date.now();
  if(DG.S.phase === 'choose_word'){
    if(DG.S.phaseEndsAt && now >= DG.S.phaseEndsAt){
      dgHostCommitWordChoice(0);
    }
  } else if(DG.S.phase === 'drawing'){
    const totalMs = (Number(DG.S.cfg.drawTime) || 80) * 1000;
    const leftMs = Math.max(0, (DG.S.phaseEndsAt || 0) - now);
    if(leftMs <= totalMs * 0.55 && DG.H.hintsGiven === 0 && DG.S.wordLen >= 3){
      DG.H.hintsGiven = 1;
      dgHostRevealOneHintLetter(1);
    } else if(leftMs <= totalMs * 0.25 && DG.H.hintsGiven === 1 && DG.S.wordLen >= 5){
      DG.H.hintsGiven = 2;
      dgHostRevealOneHintLetter(2);
    }
    if(now >= DG.S.phaseEndsAt){
      dgHostEndTurn('انتهى وقت الجولة ⏰');
    }
  } else if(DG.S.phase === 'turn_end'){
    if(DG.S.phaseEndsAt && now >= DG.S.phaseEndsAt){
      DG.S.turnIndex += 1;
      dgHostStartChooseWordPhase();
    }
  }
}

function dgHostEndTurn(reasonText){
  if(!DG.host || !DG.S || DG.S.phase === 'turn_end') return;
  if(DG.H.botTimer){ clearTimeout(DG.H.botTimer); DG.H.botTimer = null; }
  const secretWord = DG.H.secretWordObj ? DG.H.secretWordObj.word : '';
  DG.S.phase = 'turn_end';
  DG.S.revealedWord = secretWord;
  DG.S.hintMask = Array.from(secretWord);
  DG.S.phaseEndsAt = Date.now() + 5500;
  dgBroadcastState();

  arcPub('draw', DG.code, 'feed', {
    id: 'turnend_' + DG.S.turnSeq,
    type: 'sys',
    text: `🎯 ${reasonText} — الكلمة الصحيحة كانت: « ${secretWord} »`
  });
}

function dgHostHandleGuess(pkt){
  if(!DG.host || !DG.S) return;
  const rawText = String(pkt.text || '').trim().slice(0, 120);
  if(!rawText) return;
  const sender = DG.S.players.find(p => p.pid === pkt.pid && !p.gone);
  if(!sender) return;

  if(DG.S.phase !== 'drawing' || !DG.H.secretWordObj){
    arcPub('draw', DG.code, 'feed', {
      id: 'g_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      type: 'guess',
      pid: sender.pid,
      name: sender.name,
      av: sender.av,
      col: sender.col,
      text: rawText,
      ts: Date.now()
    });
    return;
  }

  const normGuess = dgNormWord(rawText);
  const normSecret = dgNormWord(DG.H.secretWordObj.word);

  if(sender.pid === DG.S.drawerPid){
    if(normGuess.includes(normSecret) || normSecret.includes(normGuess)){
      return;
    }
    arcPub('draw', DG.code, 'feed', {
      id: 'g_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      type: 'guess',
      pid: sender.pid,
      name: sender.name,
      av: sender.av,
      col: sender.col,
      text: rawText,
      ts: Date.now()
    });
    return;
  }

  if(DG.S.guessedPids.includes(sender.pid)){
    if(normGuess === normSecret || normGuess.includes(normSecret)){
      return;
    }
    arcPub('draw', DG.code, 'feed', {
      id: 'g_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      type: 'guess',
      pid: sender.pid,
      name: sender.name,
      av: sender.av,
      col: sender.col,
      text: rawText,
      ts: Date.now()
    });
    return;
  }

  if(normGuess === normSecret){
    DG.S.guessedPids.push(sender.pid);
    const guessedOrder = DG.S.guessedPids.length;
    const totalSecs = Number(DG.S.cfg.drawTime) || 80;
    const leftSecs = Math.max(0, ((DG.S.phaseEndsAt || 0) - Date.now()) / 1000);
    const speedRatio = Math.max(0, Math.min(1, leftSecs / totalSecs));
    const orderBonus = guessedOrder === 1 ? 35 : (guessedOrder === 2 ? 15 : 0);
    const guesserPts = Math.round(70 + 90 * speedRatio) + orderBonus;
    const drawerPts = 45;

    sender.score = (sender.score || 0) + guesserPts;
    DG.S.turnDelta[sender.pid] = (DG.S.turnDelta[sender.pid] || 0) + guesserPts;

    const drawerObj = DG.S.players.find(p => p.pid === DG.S.drawerPid);
    if(drawerObj){
      drawerObj.score = (drawerObj.score || 0) + drawerPts;
      DG.S.turnDelta[drawerObj.pid] = (DG.S.turnDelta[drawerObj.pid] || 0) + drawerPts;
    }

    arcPub('draw', DG.code, 'feed', {
      id: 'correct_' + DG.S.turnSeq + '_' + sender.pid,
      type: 'correct',
      pid: sender.pid,
      name: sender.name,
      av: sender.av,
      col: sender.col,
      pts: guesserPts,
      order: guessedOrder,
      text: `🎉 خمّن ${sender.name} الكلمة الصحيحة! (+${guesserPts} نقطة)`
    });

    const activeGuessers = DG.S.players.filter(p => !p.gone && p.pid !== DG.S.drawerPid);
    const allGuessed = activeGuessers.length > 0 && activeGuessers.every(p => DG.S.guessedPids.includes(p.pid));
    if(allGuessed){
      if(drawerObj){
        drawerObj.score += 25;
        DG.S.turnDelta[drawerObj.pid] = (DG.S.turnDelta[drawerObj.pid] || 0) + 25;
      }
      dgBroadcastState();
      dgHostEndTurn('خمّن جميع اللاعبين الكلمة الصحيحة! 👏');
    } else {
      dgBroadcastState();
    }
    return;
  }

  if(dgIsCloseGuess(normGuess, normSecret)){
    arcPub('draw', DG.code, 'feed', {
      id: 'close_' + Date.now() + '_' + sender.pid,
      type: 'close',
      targetPid: sender.pid,
      text: `🔥 إجابتك « ${rawText} » قريبة جدًا من الكلمة الصحيحة!`
    });
    return;
  }

  arcPub('draw', DG.code, 'feed', {
    id: 'g_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    type: 'guess',
    pid: sender.pid,
    name: sender.name,
    av: sender.av,
    col: sender.col,
    text: rawText,
    ts: Date.now()
  });
}

function dgSubmitGuess(rawVal){
  if(!DG.code || !DG.S) return;
  const text = String(rawVal || '').trim();
  if(!text) return;
  if(DG.S.phase === 'drawing' && DG.S.drawerPid === ME){
    toast('أنت الرسام في هذه الجولة! ارسم الكلمة على اللوحة ليخمّنها الآخرون 🎨', 'warn');
    return;
  }
  if(DG.S.phase === 'drawing' && DG.S.guessedPids && DG.S.guessedPids.includes(ME)){
    toast('لقد خمّنت الكلمة الصحيحة بالفعل في هذه الجولة ✅', 'ok');
    return;
  }
  const pkt = { pid: ME, name: PF.name, av: PF.av, col: PF.col, text, ts: Date.now() };
  if(DG.host){
    dgHostHandleGuess(pkt);
  } else {
    arcPub('draw', DG.code, 'guess', pkt);
  }
}
window.dgSubmitGuess = dgSubmitGuess;

window.dgInterceptRoomChat = function(trimmedText){
  if(!DG.S || DG.S.phase !== 'drawing') return { blocked: false };
  const activeSecret = dgGetActiveDrawerSecret();
  if(DG.S.drawerPid === ME && activeSecret && activeSecret.word){
    const nMsg = dgNormWord(trimmedText);
    const nSec = dgNormWord(activeSecret.word);
    if(nSec && (nMsg.includes(nSec) || nSec.includes(nMsg))){
      return { blocked: true, reason: '🔒 لا يمكن للرسام كتابة الكلمة السرية في شات الغرفة!' };
    }
  }
  if(DG.host && DG.H.secretWordObj && DG.H.secretWordObj.word){
    const nMsg = dgNormWord(trimmedText);
    const nSec = dgNormWord(DG.H.secretWordObj.word);
    if(nMsg === nSec){
      dgSubmitGuess(trimmedText);
      return { blocked: true, reason: '🎉 تم احتساب تخمينك الصحيح في لوحة التخمين حتى لا تظهر الكلمة لباقي اللاعبين!' };
    }
  }
  return { blocked: false };
};

/* ================= BOT COMPANION DRAWING & GUESSING ================= */
function dgHostScheduleBotActions(){
  if(!DG.host || !DG.S || DG.S.phase !== 'drawing') return;
  const drawer = DG.S.players.find(p => p.pid === DG.S.drawerPid);
  if(drawer && drawer.isBot){
    const botStrokes = [
      { id: 'bs1_' + Date.now(), tool: 'pen', color: '#2563eb', size: 8, pts: [[280,260],[340,180],[460,180],[520,260],[280,260]] },
      { id: 'bs2_' + Date.now(), tool: 'pen', color: '#ef4444', size: 8, pts: [[310,260],[310,370],[490,370],[490,260]] },
      { id: 'bs3_' + Date.now(), tool: 'pen', color: '#eab308', size: 14, pts: [[620,110],[650,110],[650,140],[620,140],[620,110]] }
    ];
    botStrokes.forEach((st, idx) => {
      setTimeout(() => {
        if(!DG.host || !DG.S || DG.S.phase !== 'drawing' || DG.S.drawerPid !== drawer.pid) return;
        DG.strokes.push(st);
        dgRedrawCanvas();
        arcPub('draw', DG.code, 'draw', {
          action: 'stroke_full',
          turnSeq: DG.S.turnSeq,
          drawerPid: drawer.pid,
          stroke: st
        });
      }, 900 * (idx + 1));
    });
  }
  const botGuessers = DG.S.players.filter(p => !p.gone && p.isBot && p.pid !== DG.S.drawerPid);
  botGuessers.forEach((bot, idx) => {
    setTimeout(() => {
      if(!DG.host || !DG.S || DG.S.phase !== 'drawing' || !DG.H.secretWordObj) return;
      if(DG.S.guessedPids.includes(bot.pid)) return;
      if(DG.strokes.length > 0){
        dgHostHandleGuess({ pid: bot.pid, name: bot.name, av: bot.av, col: bot.col, text: DG.H.secretWordObj.word, ts: Date.now() });
      }
    }, (14000 + idx * 5000));
  });
}

/* ================= INTERACTIVE HTML5 CANVAS ENGINE ================= */
function dgGetCanvasAndCtx(){
  const canvas = document.getElementById('dgCanvas');
  if(!canvas) return { canvas: null, ctx: null };
  const ctx = canvas.getContext('2d');
  return { canvas, ctx };
}

function dgRedrawCanvas(){
  const { canvas, ctx } = dgGetCanvasAndCtx();
  if(!canvas || !ctx) return;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for(const st of DG.strokes){
    dgDrawSegmentOnCanvas(st, false);
  }
  if(DG.currentStroke){
    dgDrawSegmentOnCanvas(DG.currentStroke, false);
  }
}

function dgDrawSegmentOnCanvas(st, isSingleStart){
  const { ctx } = dgGetCanvasAndCtx();
  if(!ctx || !st || !Array.isArray(st.pts) || !st.pts.length) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Number(st.size) || 8;
  ctx.strokeStyle = st.tool === 'eraser' ? '#ffffff' : (st.color || '#111827');

  ctx.beginPath();
  const [x0, y0] = st.pts[0];
  ctx.moveTo(x0, y0);
  if(st.pts.length === 1){
    ctx.lineTo(x0 + 0.1, y0 + 0.1);
  } else {
    for(let i = 1; i < st.pts.length; i++){
      ctx.lineTo(st.pts[i][0], st.pts[i][1]);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function dgDrawPointAppend(st){
  const { ctx } = dgGetCanvasAndCtx();
  if(!ctx || !st || !st.pts || st.pts.length < 2) return;
  const len = st.pts.length;
  const [x1, y1] = st.pts[len - 2];
  const [x2, y2] = st.pts[len - 1];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Number(st.size) || 8;
  ctx.strokeStyle = st.tool === 'eraser' ? '#ffffff' : (st.color || '#111827');
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function dgCanIDrawNow(){
  return !!(DG.code && DG.S && DG.S.phase === 'drawing' && DG.S.drawerPid === ME);
}

function dgClientCoordsToCanvas(canvas, clientX, clientY){
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / Math.max(1, rect.width);
  const scaleY = canvas.height / Math.max(1, rect.height);
  const x = Math.round(Math.max(0, Math.min(canvas.width, (clientX - rect.left) * scaleX)));
  const y = Math.round(Math.max(0, Math.min(canvas.height, (clientY - rect.top) * scaleY)));
  return [x, y];
}

function dgFlushCurrentStrokeMove(){
  DG.moveFlushTimer = null;
  if(!DG.isDrawing || !DG.currentStroke || !dgCanIDrawNow()) return;
  arcPub('draw', DG.code, 'draw', {
    action: 'stroke_move',
    turnSeq: DG.S.turnSeq,
    drawerPid: ME,
    strokeId: DG.currentStroke.id,
    tool: DG.currentStroke.tool,
    color: DG.currentStroke.color,
    size: DG.currentStroke.size,
    pts: DG.currentStroke.pts.slice()
  });
}

function dgBindCanvasEvents(){
  const canvas = document.getElementById('dgCanvas');
  if(!canvas || canvas.dataset.bound === '1') return;
  canvas.dataset.bound = '1';

  canvas.style.touchAction = 'none';
  canvas.style.userSelect = 'none';
  canvas.style.webkitUserSelect = 'none';

  const startStroke = (e) => {
    if(!dgCanIDrawNow() || DG.isDrawing) return;
    if(e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch(err) {}
    const pt = dgClientCoordsToCanvas(canvas, e.clientX, e.clientY);
    DG.isDrawing = true;
    DG.currentStroke = {
      id: 'st_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      tool: DG.tool,
      color: DG.color,
      size: DG.size,
      pts: [pt]
    };
    dgDrawSegmentOnCanvas(DG.currentStroke, true);
    arcPub('draw', DG.code, 'draw', {
      action: 'stroke_start',
      turnSeq: DG.S.turnSeq,
      drawerPid: ME,
      stroke: {
        id: DG.currentStroke.id,
        tool: DG.currentStroke.tool,
        color: DG.currentStroke.color,
        size: DG.currentStroke.size,
        pts: [pt]
      }
    });
  };

  const moveStroke = (e) => {
    if(!DG.isDrawing || !DG.currentStroke || !dgCanIDrawNow()) return;
    e.preventDefault();
    const pt = dgClientCoordsToCanvas(canvas, e.clientX, e.clientY);
    const lastPt = DG.currentStroke.pts[DG.currentStroke.pts.length - 1];
    if(lastPt && Math.hypot(pt[0] - lastPt[0], pt[1] - lastPt[1]) < 1) return;
    DG.currentStroke.pts.push(pt);
    dgDrawPointAppend(DG.currentStroke);
    if(!DG.moveFlushTimer){
      DG.moveFlushTimer = setTimeout(dgFlushCurrentStrokeMove, 30);
    }
  };

  const endStroke = (e) => {
    if(!DG.isDrawing || !DG.currentStroke) return;
    if(e && e.preventDefault) e.preventDefault();
    if(DG.moveFlushTimer){
      clearTimeout(DG.moveFlushTimer);
      DG.moveFlushTimer = null;
    }
    DG.isDrawing = false;
    const finished = {
      id: DG.currentStroke.id,
      tool: DG.currentStroke.tool,
      color: DG.currentStroke.color,
      size: DG.currentStroke.size,
      pts: DG.currentStroke.pts.slice()
    };
    DG.currentStroke = null;
    if(!DG.strokes.some(st => st.id === finished.id)) DG.strokes.push(finished);
    if(dgCanIDrawNow()){
      arcPub('draw', DG.code, 'draw', {
        action: 'stroke_full',
        turnSeq: DG.S.turnSeq,
        drawerPid: ME,
        stroke: finished
      });
    }
    try {
      if(e && e.pointerId !== undefined && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    } catch(err) {}
  };

  canvas.addEventListener('pointerdown', startStroke, { passive: false });
  canvas.addEventListener('pointermove', moveStroke, { passive: false });
  canvas.addEventListener('pointerup', endStroke, { passive: false });
  canvas.addEventListener('pointercancel', endStroke, { passive: false });
  canvas.addEventListener('lostpointercapture', () => {
    if(DG.isDrawing) endStroke();
  });

  if(!window.__dgBlurHooked){
    window.__dgBlurHooked = true;
    window.addEventListener('blur', () => {
      if(DG.isDrawing){
        endStroke();
      }
    });
  }
}

function dgUndoStroke(){
  if(!dgCanIDrawNow()) return;
  if(!DG.strokes.length) return;
  DG.strokes.pop();
  dgRedrawCanvas();
  arcPub('draw', DG.code, 'draw', {
    action: 'undo',
    turnSeq: DG.S.turnSeq,
    drawerPid: ME,
    strokes: DG.strokes.slice()
  });
}
window.dgUndoStroke = dgUndoStroke;

function dgClearCanvas(){
  if(!dgCanIDrawNow()) return;
  DG.strokes = [];
  DG.currentStroke = null;
  dgRedrawCanvas();
  arcPub('draw', DG.code, 'draw', {
    action: 'clear',
    turnSeq: DG.S.turnSeq,
    drawerPid: ME
  });
}
window.dgClearCanvas = dgClearCanvas;

/* ================= UI RENDERING (WITH IN-PLACE DRAWING UPDATES) ================= */
function dgUpdateTimerDOM(){
  const badge = document.getElementById('dgTimerVal');
  const wrap = document.getElementById('dgTimerBadge');
  if(!badge || !DG.S) return;
  if(!DG.S.phaseEndsAt || DG.S.phase === 'lobby' || DG.S.phase === 'game_over'){
    badge.textContent = '--';
    if(wrap) wrap.classList.remove('urgent');
    return;
  }
  const secs = Math.max(0, Math.ceil((DG.S.phaseEndsAt - Date.now()) / 1000));
  badge.textContent = secs + 's';
  if(wrap){
    wrap.classList.toggle('urgent', DG.S.phase === 'drawing' && secs <= 15);
  }
}

function dgRenderFeedOnly(){
  const log = document.getElementById('dgGuessLog');
  if(!log) return;
  if(!DG.feed.length){
    log.innerHTML = `<div class="mut tiny" style="text-align:center;padding:24px 8px">اكتب تخمينك للكلمة هنا أثناء الرسم! الإجابات الصحيحة تمنحك نقاطًا فورية 🎯</div>`;
    return;
  }
  log.innerHTML = DG.feed.map(m => {
    if(m.type === 'sys'){
      return `<div class="dg-msg sys">${esc(m.text)}</div>`;
    }
    if(m.type === 'correct'){
      return `<div class="dg-msg correct">${esc(m.text)}</div>`;
    }
    if(m.type === 'close'){
      return `<div class="dg-msg close-guess">${esc(m.text)}</div>`;
    }
    return `<div class="dg-msg"><b style="color:${esc(m.col || '#38bdf8')}">${esc(m.av || '🙂')} ${esc(m.name || 'لاعب')}:</b> ${esc(m.text)}</div>`;
  }).join('');
  log.scrollTop = log.scrollHeight;
}

function dgBuildRankListHTML(S, sortedPlayers){
  return sortedPlayers.map((p, i) => {
    const pIsDrawer = S.phase !== 'lobby' && S.phase !== 'game_over' && S.drawerPid === p.pid;
    const pGuessed = S.phase === 'drawing' && S.guessedPids && S.guessedPids.includes(p.pid);
    return `
      <div class="dg-rank-item ${pIsDrawer ? 'is-drawer' : ''} ${pGuessed ? 'has-guessed' : ''}">
        <div class="dg-rank-player">
          <span class="dg-rank-num ${i === 0 ? 'top1' : ''}">${i + 1}</span>
          <span class="av" style="--c:${esc(p.col || '#38bdf8')};width:28px;height:28px;font-size:14px;flex-shrink:0">${esc(p.av || '🙂')}</span>
          <div style="min-width:0;flex:1">
            <div style="font-weight:800;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              ${esc(p.name)} ${p.pid === ME ? '<span class="tiny mut">(أنت)</span>' : ''}
            </div>
            <div class="tiny" style="color:${pIsDrawer ? '#38bdf8' : (pGuessed ? '#4ade80' : 'var(--mut)')};white-space:nowrap">
              ${pIsDrawer ? '🎨 الرسام الآن' : (pGuessed ? '✅ خمّن الكلمة!' : (p.isHost ? '👑 المضيف' : 'مخمّن'))}
            </div>
          </div>
        </div>
        <div class="dg-flex" style="gap:4px">
          <span class="dg-rank-score">${p.score || 0}</span>
        </div>
      </div>`;
  }).join('');
}

function dgRender(){
  const root = document.getElementById('dgRoot');
  if(!root) return;

  // 1. Entry Screen (No active room yet)
  if(!DG.code){
    delete root.dataset.dgPhase;
    const cfg = DG.draftCfg;
    root.innerHTML = `
      <div class="dg-wrap">
        <section class="hero glass" style="padding:26px 22px">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px">
            <div>
              <div class="badge" style="margin-bottom:8px">🎨 لعبة جماعية تفاعلية مباشرة • SHARB GAMES</div>
              <h1 style="margin:0;font-size:clamp(22px,3.2vw,32px)">ارسم وخمّن — DRAW &amp; GUESS</h1>
              <p class="mut" style="margin:6px 0 0;max-width:680px;line-height:1.7">
                أنشئ غرفة خاصة أو انضم لأصدقائك، تناوبوا على رسم الكلمات السرية على اللوحة الذكية، واكسب أعلى النقاط بتخمين الكلمة في الشات بأسرع وقت!
              </p>
            </div>
            <button class="btn g" onclick="goHome()">🏠 الرئيسية</button>
          </div>

          <div class="grid2" style="margin-top:20px;gap:16px">
            <div class="dg-panel">
              <div class="dg-panel-head">
                <span>✨ إنشاء غرفة جديدة (المضيف)</span>
                <span class="tag host">إعدادات مرنة</span>
              </div>
              <div class="grid2" style="gap:10px">
                <div>
                  <label class="tiny mut">عدد الجولات</label>
                  <select id="dgCfgRounds">
                    ${[2,3,4,5,6,8].map(n => `<option value="${n}" ${cfg.rounds===n?'selected':''}>${n} جولات</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="tiny mut">مدة الرسم لكل دور</label>
                  <select id="dgCfgTime">
                    ${[45,60,80,100,120].map(t => `<option value="${t}" ${cfg.drawTime===t?'selected':''}>${t} ثانية</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="tiny mut">الحد الأقصى للاعبين</label>
                  <select id="dgCfgMax">
                    ${[2,4,6,8,10].map(m => `<option value="${m}" ${cfg.maxPlayers===m?'selected':''}>${m} لاعبين</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="tiny mut">لغة الكلمات</label>
                  <select id="dgCfgLang">
                    <option value="ar" ${cfg.lang==='ar'?'selected':''}>العربية 🇪🇬</option>
                    <option value="en" ${cfg.lang==='en'?'selected':''}>English 🇬🇧</option>
                    <option value="mix" ${cfg.lang==='mix'?'selected':''}>مختلط (عربي + إنجليزي) 🌍</option>
                  </select>
                </div>
              </div>
              ${typeof buildGameVisControlHTML==='function' ? buildGameVisControlHTML('draw', false, false) : ''}
              <button class="btn ok big" id="dgBtnCreateRoom" style="margin-top:10px;width:100%">🎨 إنشاء غرفة ارسم وخمّن الآن</button>
            </div>

            <div class="dg-panel">
              <div class="dg-panel-head">
                <span>🚀 الانضمام إلى غرفة موجودة</span>
                <span class="tag">أونلاين مباشر</span>
              </div>
              <p class="mut tiny" style="margin:2px 0 8px;line-height:1.6">
                أدخل كود الغرفة المكون من ٦ أحرف وأرقام للانضمام مباشرة إلى أصدقائك:
              </p>
              <div style="display:flex;gap:8px;align-items:center">
                <input id="dgJoinCodeInp" placeholder="اكتب كود الغرفة هنا" maxlength="6" style="flex:1;min-width:0;text-transform:uppercase;direction:ltr;text-align:center;letter-spacing:3px;font-weight:900;font-size:16px">
                <button class="btn" id="dgBtnJoinRoom" style="flex:0 0 auto">دخول الغرفة</button>
              </div>
              <div style="margin-top:12px;padding:12px;border-radius:12px;background:rgba(56,189,248,.07);border:1px solid rgba(56,189,248,.18)">
                <div class="tiny" style="font-weight:800;margin-bottom:4px">💡 مميزات اللعبة:</div>
                <div class="tiny mut" style="line-height:1.7">
                  • لوحة رسم فورية تدعم الماوس واللمس مع ١٤ لونًا و٥ أحجام وممحاة وتراجع.<br>
                  • إخفاء تام للكلمة السرية عن المخمنين مع تلميحات تدريجية.<br>
                  • احتساب تلقائي للنقاط حسب سرعة الإجابة للرسام والمخمنين.
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>`;

    const bindSel = (id, key, isNum) => {
      const el = document.getElementById(id);
      if(el) el.onchange = () => { DG.draftCfg[key] = isNum ? Number(el.value) : el.value; };
    };
    bindSel('dgCfgRounds', 'rounds', true);
    bindSel('dgCfgTime', 'drawTime', true);
    bindSel('dgCfgMax', 'maxPlayers', true);
    bindSel('dgCfgLang', 'lang', false);

    const btnCreate = document.getElementById('dgBtnCreateRoom');
    if(btnCreate) btnCreate.onclick = () => dgCreateRoom();
    const btnJoin = document.getElementById('dgBtnJoinRoom');
    const inpJoin = document.getElementById('dgJoinCodeInp');
    if(btnJoin && inpJoin){
      btnJoin.onclick = () => dgJoinRoom(inpJoin.value);
      inpJoin.onkeydown = e => { if(e.key === 'Enter') dgJoinRoom(inpJoin.value); };
    }
    return;
  }

  // 2. Active Room Screen (Waiting for state or active room)
  const S = DG.S;
  if(!S){
    delete root.dataset.dgPhase;
    root.innerHTML = `
      <div class="dg-wrap">
        <section class="hero glass" style="text-align:center;padding:36px 20px">
          <h2>🔄 جاري الاتصال بغرفة ارسم وخمّن (${esc(DG.code)})...</h2>
          <p class="mut">يرجى الانتظار لحظات لمزامنة بيانات الغرفة من المضيف.</p>
          <div class="dg-flex" style="justify-content:center;margin-top:14px">
            <button class="btn bad" onclick="dgLeaveRoom(true)">إلغاء والعودة</button>
          </div>
        </section>
      </div>`;
    return;
  }

  const isDrawer = S.drawerPid === ME;
  const activeSecret = dgGetActiveDrawerSecret();
  const activePlayers = (S.players || []).filter(p => !p.gone);
  const sortedPlayers = activePlayers.slice().sort((a, b) => (b.score || 0) - (a.score || 0));
  const langLabels = { ar: 'العربية 🇪🇬', en: 'English 🇬🇧', mix: 'مختلط 🌍' };

  // Build Top Word & Status Banner + Dedicated Above-Canvas Word Bar
  let wordBannerHTML = '';
  let canvasWordBarHTML = '';

  if(S.phase === 'lobby'){
    wordBannerHTML = `<div class="dg-word-banner"><span class="tiny">⏳ في انتظار بدء المباراة (${activePlayers.length}/${S.cfg.maxPlayers || 8} لاعبين)</span></div>`;
    canvasWordBarHTML = `
      <div class="dg-canvas-word-bar">
        <span class="tiny mut">🎨 لوحة الرسم ستفتح فور بدء المباراة</span>
        <span class="tag">${activePlayers.length} لاعبين متصلين</span>
      </div>`;
  } else if(S.phase === 'choose_word'){
    wordBannerHTML = `<div class="dg-word-banner"><span class="tiny">🎨 <b>${esc(S.drawerName)}</b> يختار الكلمة السرية الآن...</span></div>`;
    if(isDrawer){
      canvasWordBarHTML = `
        <div class="dg-canvas-word-bar is-drawer-bar">
          <span style="font-weight:800;font-size:13px">🎯 اختر إحدى الكلمات الثلاث بالأسفل لبدء الرسم!</span>
          <span class="tag host">أنت الرسام 🎨</span>
        </div>`;
    } else {
      canvasWordBarHTML = `
        <div class="dg-canvas-word-bar">
          <span class="tiny">⏳ الرسام <b>${esc(S.drawerName)}</b> يختار الكلمة السرية الآن...</span>
          <span class="tag">استعد للتخمين</span>
        </div>`;
    }
  } else if(S.phase === 'drawing'){
    if(isDrawer && activeSecret){
      wordBannerHTML = `
        <div class="dg-word-banner">
          <span class="tiny" style="font-weight:800">🎨 كلمتك للرسم:</span>
          <span class="dg-secret-pill">${esc(activeSecret.word)}</span>
          <span class="tag">${esc(activeSecret.cat || S.wordCat)}</span>
        </div>`;
      canvasWordBarHTML = `
        <div class="dg-canvas-word-bar is-drawer-bar" id="dgActiveWordReminder">
          <div class="dg-flex" style="gap:8px">
            <span style="font-weight:900;font-size:13px;color:#86efac">🎯 الكلمة التي اخترتها للرسم:</span>
            <span class="dg-canvas-word-highlight" id="dgCanvasSecretWordText">${esc(activeSecret.word)}</span>
          </div>
          <div class="dg-flex" style="gap:6px">
            <span class="tag">التصنيف: ${esc(activeSecret.cat || S.wordCat)}</span>
            <span class="tag host">${S.wordLen || dgCountLetters(activeSecret.word)} حروف</span>
          </div>
        </div>`;
    } else {
      const maskDisp = dgFormatMaskDisplay(S.hintMask);
      wordBannerHTML = `
        <div class="dg-word-banner">
          <span class="tiny mut">خمّن الكلمة (${S.wordLen} حروف • ${esc(S.wordCat)}):</span>
          <span class="dg-word-mask" id="dgWordMaskDisp">${esc(maskDisp)}</span>
        </div>`;
      canvasWordBarHTML = `
        <div class="dg-canvas-word-bar">
          <div class="dg-flex" style="gap:8px">
            <span style="font-weight:800;font-size:13px">🔎 خمّن الكلمة (${S.wordLen} حروف):</span>
            <span class="dg-word-mask">${esc(maskDisp)}</span>
          </div>
          <span class="tag">التصنيف: ${esc(S.wordCat)} • الرسام: ${esc(S.drawerName)}</span>
        </div>`;
    }
  } else if(S.phase === 'turn_end'){
    wordBannerHTML = `
      <div class="dg-word-banner">
        <span class="tiny">🎯 الكلمة كانت:</span>
        <span class="dg-secret-pill">${esc(S.revealedWord)}</span>
      </div>`;
    canvasWordBarHTML = `
      <div class="dg-canvas-word-bar is-drawer-bar">
        <span style="font-weight:800;font-size:13px">🎯 انتهى الدور! الكلمة الصحيحة كانت:</span>
        <span class="dg-canvas-word-highlight">${esc(S.revealedWord)}</span>
      </div>`;
  } else if(S.phase === 'game_over'){
    const winner = sortedPlayers[0];
    wordBannerHTML = `
      <div class="dg-word-banner">
        <span class="tiny">🏆 انتهت المباراة! الفائز: <b>${esc(winner ? winner.name : '—')}</b></span>
      </div>`;
    canvasWordBarHTML = `
      <div class="dg-canvas-word-bar">
        <span style="font-weight:800;font-size:13px">🏆 الفائز بالمباراة: <b>${esc(winner ? winner.name : '—')}</b></span>
        <span class="tag host">${winner ? winner.score : 0} نقطة</span>
      </div>`;
  }

  const guessPlaceholder = (S.phase === 'drawing' && isDrawer)
    ? 'أنت الرسام الآن — لا يمكنك التخمين 🎨'
    : (S.phase === 'drawing' && S.guessedPids && S.guessedPids.includes(ME))
      ? 'خمّنت الكلمة الصحيحة! ✅'
      : 'اكتب تخمينك للكلمة هنا ثم اضغط إرسال...';

  const guessDisabled = (S.phase === 'drawing' && (isDrawer || (S.guessedPids && S.guessedPids.includes(ME))));

  // FAST IN-PLACE UPDATE DURING ACTIVE DRAWING:
  // Never destroy #dgCanvas or #dgGuessInput while a turn is in 'drawing' phase!
  if(
    S.phase === 'drawing' &&
    root.dataset.dgPhase === 'drawing' &&
    Number(root.dataset.dgTurnSeq) === S.turnSeq &&
    root.dataset.dgIsDrawer === (isDrawer ? '1' : '0') &&
    root.dataset.dgCode === S.code &&
    document.getElementById('dgCanvas')
  ){
    const topSlot = document.getElementById('dgTopWordBannerSlot');
    if(topSlot && topSlot.innerHTML !== wordBannerHTML) topSlot.innerHTML = wordBannerHTML;
    const barSlot = document.getElementById('dgCanvasWordBarSlot');
    if(barSlot && barSlot.innerHTML !== canvasWordBarHTML) barSlot.innerHTML = canvasWordBarHTML;
    const rankList = document.getElementById('dgRankList');
    const newRankHTML = dgBuildRankListHTML(S, sortedPlayers);
    if(rankList && rankList.innerHTML !== newRankHTML) rankList.innerHTML = newRankHTML;
    const rankHead = document.getElementById('dgRankHeadTitle');
    if(rankHead) rankHead.textContent = `🏆 ترتيب اللاعبين (${activePlayers.length}/${S.cfg.maxPlayers || 8})`;
    const roundTag = document.getElementById('dgRoundTag');
    if(roundTag) roundTag.innerHTML = `الجولة <b>${Math.min(S.round, S.cfg.rounds)}/${S.cfg.rounds}</b>`;
    const gTag = document.getElementById('dgGuessedCountTag');
    if(gTag) gTag.textContent = `${S.guessedPids ? S.guessedPids.length : 0} خمّنوها`;
    const gInp = document.getElementById('dgGuessInput');
    const gBtn = document.getElementById('dgGuessSubmitBtn');
    if(gInp){
      if(gInp.placeholder !== guessPlaceholder) gInp.placeholder = guessPlaceholder;
      if(gInp.disabled !== !!guessDisabled) gInp.disabled = !!guessDisabled;
    }
    if(gBtn && gBtn.disabled !== !!guessDisabled){
      gBtn.disabled = !!guessDisabled;
    }
    dgUpdateTimerDOM();
    return;
  }

  // Build Canvas Stage Overlay for Lobby, Choose Word, Turn End, or Game Over
  let overlayHTML = '';
  if(S.phase === 'lobby'){
    overlayHTML = `
      <div class="dg-canvas-overlay">
        <div class="dg-overlay-card">
          <div style="font-size:32px;line-height:1">🎨✏️</div>
          <h3 style="margin:0;font-size:18px">غرفة ارسم وخمّن جاهزة (${esc(S.code)})</h3>
          <p class="mut" style="margin:0;font-size:12px">
            الجولات: <b>${S.cfg.rounds}</b> • مدة الرسم: <b>${S.cfg.drawTime} ثانية</b> • اللغة: <b>${langLabels[S.cfg.lang] || 'العربية'}</b>
          </p>
          ${DG.host ? `
            <div class="dg-flex" style="justify-content:center;margin-top:2px">
              <select id="dgLobbyRounds" style="width:auto;padding:6px 9px;font-size:12px">
                ${[2,3,4,5,6,8].map(n => `<option value="${n}" ${S.cfg.rounds===n?'selected':''}>${n} جولات</option>`).join('')}
              </select>
              <select id="dgLobbyTime" style="width:auto;padding:6px 9px;font-size:12px">
                ${[45,60,80,100,120].map(t => `<option value="${t}" ${S.cfg.drawTime===t?'selected':''}>${t} ثانية</option>`).join('')}
              </select>
              <select id="dgLobbyLang" style="width:auto;padding:6px 9px;font-size:12px">
                <option value="ar" ${S.cfg.lang==='ar'?'selected':''}>العربية 🇪🇬</option>
                <option value="en" ${S.cfg.lang==='en'?'selected':''}>English 🇬🇧</option>
                <option value="mix" ${S.cfg.lang==='mix'?'selected':''}>مختلط 🌍</option>
              </select>
            </div>
            <button class="btn ok" id="dgBtnStartMatch" style="min-width:210px;margin-top:4px">🚀 ابدأ المباراة الآن (${activePlayers.length} لاعبين)</button>
          ` : `
            <div class="badge">⏳ بانتظار المضيف لبدء المباراة...</div>
          `}
        </div>
      </div>`;
  } else if(S.phase === 'choose_word'){
    const choicesToShow = (isDrawer && Array.isArray(DG.myWordChoices) && DG.myWordChoices.length)
      ? DG.myWordChoices
      : (isDrawer && DG.host && Array.isArray(DG.H.wordChoices) ? DG.H.wordChoices : []);
    if(isDrawer && choicesToShow.length){
      overlayHTML = `
        <div class="dg-canvas-overlay">
          <div class="dg-overlay-card">
            <div class="badge" style="font-size:11px;padding:3px 10px">🎨 دورك في الرسم الآن!</div>
            <h3 style="margin:0;font-size:17px">اختر كلمة سرية لترسمها</h3>
            <p class="mut tiny" style="margin:0;font-size:11px">ستظهر الكلمة المختارة أعلى اللوحة طوال وقت الرسم لتذكيرك بها</p>
            <div class="dg-word-choices">
              ${choicesToShow.map((w, idx) => `
                <button type="button" class="dg-word-choice-btn" data-pickword="${idx}">
                  <span class="w-txt">${esc(w.word)}</span>
                  <span class="w-meta">${esc(w.cat)} • ${dgCountLetters(w.word)} حروف</span>
                </button>
              `).join('')}
            </div>
          </div>
        </div>`;
    } else {
      overlayHTML = `
        <div class="dg-canvas-overlay">
          <div class="dg-overlay-card">
            <div style="font-size:32px;line-height:1">🤔🎨</div>
            <h3 style="margin:0;font-size:17px">${esc(S.drawerName)} يختار كلمة للرسم...</h3>
            <p class="mut tiny" style="margin:0">استعد للتخمين في الشات بمجرد بدء الرسم!</p>
          </div>
        </div>`;
    }
  } else if(S.phase === 'turn_end'){
    overlayHTML = `
      <div class="dg-canvas-overlay">
        <div class="dg-overlay-card">
          <div class="badge">انتهى الدور!</div>
          <h3 style="margin:0;font-size:18px">الكلمة الصحيحة كانت: <span style="color:#4ade80">${esc(S.revealedWord)}</span></h3>
          <div class="dg-flex" style="justify-content:center">
            ${activePlayers.map(p => {
              const d = (S.turnDelta && S.turnDelta[p.pid]) || 0;
              return `<div class="tag" style="padding:5px 10px">${esc(p.av)} ${esc(p.name)}: <b style="color:${d>0?'#4ade80':'#94a3b8'}">+${d}</b></div>`;
            }).join('')}
          </div>
          <p class="mut tiny" style="margin:0">ينتقل الدور للرسام التالي خلال لحظات...</p>
        </div>
      </div>`;
  } else if(S.phase === 'game_over'){
    const winner = sortedPlayers[0];
    overlayHTML = `
      <div class="dg-canvas-overlay">
        <div class="dg-overlay-card">
          <div style="font-size:36px;line-height:1">🏆🎉</div>
          <h3 style="margin:0;font-size:18px">الفائز بالمباراة: <span style="color:#fbbf24">${esc(winner ? winner.name : '—')}</span></h3>
          <p class="mut tiny" style="margin:0">مجموع النقاط: <b>${winner ? winner.score : 0}</b> نقطة</p>
          <div style="display:flex;flex-direction:column;gap:5px;width:100%;max-width:310px">
            ${sortedPlayers.slice(0, 5).map((p, idx) => `
              <div class="dg-rank-item" style="background:rgba(255,255,255,.08);padding:6px 10px">
                <span><b>#${idx + 1}</b> ${esc(p.av)} ${esc(p.name)}</span>
                <span class="dg-rank-score">${p.score || 0} نقطة</span>
              </div>
            `).join('')}
          </div>
          <div class="dg-flex" style="justify-content:center;margin-top:6px">
            ${DG.host ? `<button class="btn ok sm" id="dgBtnRestartMatch">🔄 بدء مباراة جديدة</button>` : `<span class="tiny mut">بانتظار المضيف لبدء مباراة جديدة</span>`}
            <button class="btn g sm" onclick="goHome()">🏠 الرئيسية</button>
          </div>
        </div>
      </div>`;
  }

  const prevInpEl = document.getElementById('dgGuessInput');
  const prevInpVal = prevInpEl ? prevInpEl.value : '';
  const wasInpFocused = prevInpEl && document.activeElement === prevInpEl;

  root.dataset.dgPhase = S.phase;
  root.dataset.dgTurnSeq = String(S.turnSeq);
  root.dataset.dgIsDrawer = isDrawer ? '1' : '0';
  root.dataset.dgCode = S.code;

  root.innerHTML = `
    <div class="dg-wrap">
      <!-- Top Room & Turn Bar -->
      <div class="dg-top-bar">
        <div class="dg-flex" id="dgTopActions">
          <span class="tag host">🎨 كود الغرفة: <b id="dgRoomCodeDisp" style="letter-spacing:1.2px">${esc(S.code)}</b></span>
          <button type="button" class="btn ghost sm" id="dgBtnCopyCode">📋 نسخ الكود</button>
          <button type="button" class="btn ghost sm" id="dgBtnCopyLink">🔗 رابط الدعوة</button>
          <span class="tag" id="dgRoundTag">الجولة <b>${Math.min(S.round, S.cfg.rounds)}/${S.cfg.rounds}</b></span>
          ${typeof buildGameVisControlHTML==='function' ? buildGameVisControlHTML('draw', true, DG.host) : ''}
        </div>

        <div id="dgTopWordBannerSlot" style="display:contents">${wordBannerHTML}</div>

        <div class="dg-flex">
          <div class="dg-timer-badge" id="dgTimerBadge">
            <span>⏱️</span>
            <span id="dgTimerVal">--</span>
          </div>
          <button type="button" class="btn bad sm" id="dgBtnLeave">خروج</button>
        </div>
      </div>

      <!-- 3-Column Interactive Layout: Leaderboard | Canvas & Tools | Guess Chat -->
      <div class="dg-main-grid">
        <!-- Col 1: Live Leaderboard & Friends Invite -->
        <div class="dg-panel dg-RankCol">
          <div class="dg-panel-head">
            <span id="dgRankHeadTitle">🏆 ترتيب اللاعبين (${activePlayers.length}/${S.cfg.maxPlayers || 8})</span>
            <span class="tiny mut">النقاط</span>
          </div>
          <div class="dg-rank-list" id="dgRankList">
            ${dgBuildRankListHTML(S, sortedPlayers)}
          </div>

          <div style="margin-top:auto;padding-top:10px;border-top:1px solid rgba(148,163,184,.14)">
            <div class="tiny mut" style="margin-bottom:6px;font-weight:700">👥 دعوة صديق للغرفة مباشرة:</div>
            <div id="dgFriendsList" class="plist" style="max-height:210px;overflow-y:auto;margin:0">${buildFriendsPanelListHTML('dg')}</div>
          </div>
        </div>

        <!-- Col 2: Interactive Drawing Board & Tools -->
        <div class="dg-panel dg-CanvasCol">
          <div class="dg-panel-head">
            <span>🖌️ لوحة الرسم التفاعلية المباشرة</span>
            <span class="tiny mut">${isDrawer && S.phase === 'drawing' ? '🟢 دورك في الرسم الآن' : '👀 وضع المشاهدة والتخمين'}</span>
          </div>

          <!-- Active Word Reminder / Hint Bar Directly Above Canvas -->
          <div id="dgCanvasWordBarSlot" style="display:contents">${canvasWordBarHTML}</div>

          <div class="dg-canvas-stage">
            <canvas id="dgCanvas" width="800" height="500" class="${(isDrawer && S.phase === 'drawing') ? '' : 'readonly'}"></canvas>
            ${overlayHTML}
          </div>

          <!-- Drawing Toolbar -->
          <div class="dg-toolbar ${(isDrawer && S.phase === 'drawing') ? '' : 'disabled'}" id="dgToolbar">
            <div class="dg-colors">
              ${DG_COLORS.map(c => `
                <button type="button" class="dg-swatch ${DG.tool === 'pen' && DG.color === c ? 'on' : ''}" data-dgcolor="${c}" style="background:${c}" title="لون ${c}"></button>
              `).join('')}
            </div>

            <div class="dg-sizes">
              ${DG_SIZES.map(s => `
                <button type="button" class="dg-size-btn ${DG.size === s.size ? 'on' : ''}" data-dgsize="${s.size}" title="${s.label}">
                  <span class="dg-size-dot" style="width:${Math.min(18, Math.max(4, Math.round(s.size * 0.58)))}px;height:${Math.min(18, Math.max(4, Math.round(s.size * 0.58)))}px"></span>
                </button>
              `).join('')}
            </div>

            <div class="dg-tools-act">
              <button type="button" class="btn sm ${DG.tool === 'pen' ? 'ok' : 'ghost'}" id="dgToolPen">✏️ قلم</button>
              <button type="button" class="btn sm ${DG.tool === 'eraser' ? 'ok' : 'ghost'}" id="dgToolEraser">🧽 ممحاة</button>
              <button type="button" class="btn ghost sm" id="dgToolUndo" title="تراجع عن آخر خطوة">↩️ تراجع</button>
              <button type="button" class="btn bad sm" id="dgToolClear" title="مسح اللوحة بالكامل">🗑️ مسح الكل</button>
            </div>
          </div>
        </div>

        <!-- Col 3: Dedicated In-Game Guess Chat -->
        <div class="dg-panel dg-GuessCol">
          <div class="dg-panel-head">
            <span>💬 شات التخمين الذكي</span>
            <span class="tag" id="dgGuessedCountTag">${S.guessedPids ? S.guessedPids.length : 0} خمّنوها</span>
          </div>
          <div class="dg-guess-log" id="dgGuessLog"></div>
          <form class="dg-guess-form" id="dgGuessForm" autocomplete="off">
            <input id="dgGuessInput" type="text" maxlength="100" placeholder="${esc(guessPlaceholder)}" ${guessDisabled ? 'disabled' : ''}>
            <button type="submit" id="dgGuessSubmitBtn" class="btn ok sm" ${guessDisabled ? 'disabled' : ''}>إرسال</button>
          </form>
        </div>
      </div>
    </div>`;

  // Restore canvas strokes & bind events
  dgBindCanvasEvents();
  dgRedrawCanvas();
  dgRenderFeedOnly();
  dgUpdateTimerDOM();
  if(window.SharbRoomChat && typeof window.SharbRoomChat.refresh === 'function'){
    window.SharbRoomChat.refresh();
  }
  const dgFl = document.getElementById('dgFriendsList');
  if(dgFl){
    dgFl.onclick = e => {
      const invBtn = e.target.closest('[data-dginv]');
      if(invBtn){
        const f = friends()[Number(invBtn.dataset.dginv)];
        if(f && DG.code) dispatchInviteToFriend(f, DG.code, 'draw');
        return;
      }
      handleFriendListClick(e, 'dg');
    };
  }

  // Bind UI buttons
  const btnCopyCode = document.getElementById('dgBtnCopyCode');
  if(btnCopyCode) btnCopyCode.onclick = () => copyText(S.code);
  const btnCopyLink = document.getElementById('dgBtnCopyLink');
  if(btnCopyLink) btnCopyLink.onclick = () => copyText(buildInviteUrl(S.code, 'draw'));
  const btnLeave = document.getElementById('dgBtnLeave');
  if(btnLeave) btnLeave.onclick = () => {
    if(confirm('هل تريد الخروج من غرفة ارسم وخمّن؟')) dgLeaveRoom(true);
  };

  // Lobby Host controls
  const selRounds = document.getElementById('dgLobbyRounds');
  if(selRounds) selRounds.onchange = () => { S.cfg.rounds = Number(selRounds.value); dgBroadcastState(); };
  const selTime = document.getElementById('dgLobbyTime');
  if(selTime) selTime.onchange = () => { S.cfg.drawTime = Number(selTime.value); dgBroadcastState(); };
  const selLang = document.getElementById('dgLobbyLang');
  if(selLang) selLang.onchange = () => { S.cfg.lang = selLang.value; dgBroadcastState(); };

  const btnStart = document.getElementById('dgBtnStartMatch');
  if(btnStart) btnStart.onclick = () => dgHostStartMatch();
  const btnRestart = document.getElementById('dgBtnRestartMatch');
  if(btnRestart) btnRestart.onclick = () => dgHostStartMatch();

  // Word choice buttons for Drawer
  root.querySelectorAll('[data-pickword]').forEach(btn => {
    btn.onclick = () => dgPlayerPickWord(Number(btn.dataset.pickword));
  });

  const refreshToolbarInPlace = () => {
    root.querySelectorAll('[data-dgcolor]').forEach(sw => {
      sw.classList.toggle('on', DG.tool === 'pen' && DG.color === sw.dataset.dgcolor);
    });
    root.querySelectorAll('[data-dgsize]').forEach(sb => {
      sb.classList.toggle('on', DG.size === Number(sb.dataset.dgsize));
    });
    const bp = document.getElementById('dgToolPen');
    if(bp){ bp.classList.toggle('ok', DG.tool === 'pen'); bp.classList.toggle('ghost', DG.tool !== 'pen'); }
    const be = document.getElementById('dgToolEraser');
    if(be){ be.classList.toggle('ok', DG.tool === 'eraser'); be.classList.toggle('ghost', DG.tool !== 'eraser'); }
  };
  root.querySelectorAll('[data-dgcolor]').forEach(sw => {
    sw.onclick = () => {
      DG.tool = 'pen';
      DG.color = sw.dataset.dgcolor;
      refreshToolbarInPlace();
    };
  });
  root.querySelectorAll('[data-dgsize]').forEach(sb => {
    sb.onclick = () => {
      DG.size = Number(sb.dataset.dgsize);
      refreshToolbarInPlace();
    };
  });
  const btnPen = document.getElementById('dgToolPen');
  if(btnPen) btnPen.onclick = () => { DG.tool = 'pen'; refreshToolbarInPlace(); };
  const btnEraser = document.getElementById('dgToolEraser');
  if(btnEraser) btnEraser.onclick = () => { DG.tool = 'eraser'; refreshToolbarInPlace(); };
  const btnUndo = document.getElementById('dgToolUndo');
  if(btnUndo) btnUndo.onclick = () => dgUndoStroke();
  const btnClear = document.getElementById('dgToolClear');
  if(btnClear) btnClear.onclick = () => dgClearCanvas();

  // Guess Chat form submission
  const guessForm = document.getElementById('dgGuessForm');
  const guessInp = document.getElementById('dgGuessInput');
  if(guessInp && prevInpVal && !guessDisabled){
    guessInp.value = prevInpVal;
    if(wasInpFocused){
      try{ guessInp.focus({preventScroll:true}); }catch(e){}
    }
  }
  if(guessForm && guessInp){
    guessForm.onsubmit = e => {
      e.preventDefault();
      const val = guessInp.value;
      if(!val.trim()) return;
      guessInp.value = '';
      dgSubmitGuess(val);
    };
  }
}



/* ================= MULTI-PAGE INITIALIZATION & SESSION PERSISTENCE FOR DRAW & GUESS ================= */
function dgSaveSession() {
  if (!DG.code) {
    SharbSession.clearGameSession('draw');
    return;
  }
  SharbSession.saveGameSession('draw', {
    code: DG.code,
    host: DG.host,
    S: DG.S,
    strokes: DG.strokes,
    myWordChoices: DG.myWordChoices,
    mySecretWord: DG.mySecretWord,
    secretWordObj: DG.H ? DG.H.secretWordObj : null,
    wordChoices: DG.H ? DG.H.wordChoices : []
  });
}

const _origDgRender = dgRender;
dgRender = function() {
  _origDgRender();
  dgSaveSession();
};

function dgRestoreSession() {
  const saved = SharbSession.loadGameSession('draw');
  if (!saved || !saved.code) return false;
  DG.code = saved.code;
  DG.host = !!saved.host;
  DG.S = saved.S || null;
  DG.strokes = Array.isArray(saved.strokes) ? saved.strokes : [];
  DG.myWordChoices = saved.myWordChoices || null;
  DG.mySecretWord = saved.mySecretWord || null;
  if (DG.host && DG.H) {
    DG.H.secretWordObj = saved.secretWordObj || null;
    DG.H.wordChoices = saved.wordChoices || [];
  }
  dgSetupSubscriptions(DG.code);
  if (DG.host && DG.S) dgBroadcastState();
  return true;
}

function initDrawGuessPage() {
  const qs = new URLSearchParams(window.location.search);
  const qRoom = (qs.get('room') || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const qAction = qs.get('action') || '';
  const qVis = qs.get('vis') || '';
  const intent = SharbSession.consumeRoomIntent('draw');

  if (qVis === 'private' || qVis === 'public') setRoomVisibility('draw', qVis, true);
  if (intent && intent.visibility) setRoomVisibility('draw', intent.visibility, true);
  if (intent && intent.roomName) SHARB_ROOM_CFG.roomNames.draw = intent.roomName;

  if (qAction === 'create' || qAction === 'arena' || (intent && intent.action === 'create')) {
    dgCreateRoom();
    return;
  }
  if (qRoom || (intent && intent.action === 'join' && intent.code)) {
    const targetCode = qRoom || intent.code;
    const saved = SharbSession.loadGameSession('draw');
    if (saved && saved.code === targetCode && saved.host) {
      dgRestoreSession();
      dgRender();
      return;
    }
    window._sharbJoinVia = (qs.get('via') === 'public' || (intent && intent.via === 'public')) ? 'public' : 'code';
    dgJoinRoom(targetCode);
    return;
  }

  dgRestoreSession();
  dgRender();
}

document.addEventListener('DOMContentLoaded', initDrawGuessPage);
window.addEventListener('beforeunload', dgSaveSession);
