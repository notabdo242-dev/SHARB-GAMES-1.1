/* ==========================================================================
   SHARB GAMES — PROFILE MANAGEMENT & DEDICATED PROFILE PAGE (js/profile.js)
   Displays real player statistics (never fabricated), avatar/username editor,
   favorite/recent games, and theme/audio preferences.
   ========================================================================== */

function renderProfileBtn() {
  const pb = $('#pb');
  const L = lvl(PF.st);
  if (pb) {
    pb.innerHTML = `<span class="av sm" style="--c:${esc(PF.col)}">${esc(PF.av)}</span><span><b>${esc(PF.name)}</b><small>مستوى ${L.l} • ${PF.st.w} فوز</small></span>`;
  }
  if (typeof syncHubWidgets === 'function') syncHubWidgets();
}
window.renderProfileBtn = renderProfileBtn;

function renderSound() {
  const sBtn = $('#snd');
  if (sBtn) sBtn.textContent = soundOn ? '🔊' : '🔇';
}
window.renderSound = renderSound;

function openProfile(p, mine) {
  const st = Object.assign({ g: 0, w: 0, r: 0, p: 0 }, p.st || {});
  const L = lvl(st);
  const av = p.av || '🙂';
  const col = p.col || COLS[0];
  let inner = `<span class="av lg" id="pa" style="--c:${esc(col)};margin:0 auto">${esc(av)}</span>`;
  if (mine) {
    inner += `
      <input id="pn" value="${esc(p.name)}" maxlength="14" style="margin:10px 0;text-align:center;font-weight:800">
      <div class="grd" id="ga">${AVS.map(a => `<span data-av="${a}" class="${a === av ? 'on' : ''}">${a}</span>`).join('')}</div>
      <div class="grd" id="gc">${COLS.map(c => `<span data-col="${c}" class="col ${c === col ? 'on' : ''}" style="background:${c}"></span>`).join('')}</div>
      <div class="fcode"><span>كود الصداقة: <b>${esc(PF.uid)}</b></span><button class="mini" data-copy="uid">📋 نسخ</button></div>`;
  } else {
    inner += `<h2 style="margin-top:8px">${esc(p.name)}</h2>`;
  }
  inner += `
    <div class="mut tiny">مستوى ${L.l}</div>
    <div class="lv"><i style="width:${L.pc}%"></i></div>
    <div class="stt">
      <div><b>${st.g}</b>مباريات</div>
      <div><b>${st.w}</b>فوز</div>
      <div><b>${st.g ? Math.round((st.w / st.g) * 100) : 0}%</b>نسبة الفوز</div>
      <div><b>${st.p}</b>نقاط</div>
    </div>
    <div class="row" style="justify-content:center;margin-top:14px">
      ${mine ? '<button class="btn ok" id="psave">حفظ التعديلات</button><a class="btn g" href="' + esc(getPageUrl('profile')) + '">⚙️ صفحة البروفايل الكاملة</a>' : ''}
      <button class="btn g" id="pclose">إغلاق</button>
    </div>`;
  openOverlay(`<div class="card">${inner}</div>`, 'profile');
  const pcBtn = $('#pclose');
  if (pcBtn) pcBtn.onclick = closeOverlay;
  if (mine) {
    let nav = av, ncol = col;
    $('#ga').addEventListener('click', e => {
      const s = e.target.closest('[data-av]');
      if (!s) return;
      nav = s.dataset.av;
      $('#pa').textContent = nav;
      $$('#ga span').forEach(x => x.classList.toggle('on', x === s));
      beep(500, 0.05, 'sine', 0.06);
    });
    $('#gc').addEventListener('click', e => {
      const s = e.target.closest('[data-col]');
      if (!s) return;
      ncol = s.dataset.col;
      $('#pa').style.setProperty('--c', ncol);
      $$('#gc span').forEach(x => x.classList.toggle('on', x === s));
    });
    const psave = $('#psave');
    if (psave) {
      psave.onclick = () => {
        PF.name = ($('#pn').value.trim() || 'لاعب').slice(0, 14);
        PF.av = nav;
        PF.col = ncol;
        savePF();
        renderProfileBtn();
        if (typeof renderFriends === 'function') renderFriends();
        if (typeof announce === 'function') announce();
        if (typeof renderProfilePage === 'function') renderProfilePage();
        closeOverlay();
        toast('تم حفظ البروفايل بنجاح ✅', 'ok');
      };
    }
  }
  const cp = $('[data-copy="uid"]');
  if (cp) cp.onclick = () => copyText(PF.uid);
}
window.openProfile = openProfile;

/* Dedicated Profile Page Controller (pages/profile.html) */
function renderProfilePage() {
  const root = $('#profilePageRoot');
  if (!root) return;

  const st = Object.assign({ g: 0, w: 0, r: 0, p: 0 }, PF.st || {});
  const L = lvl(st);
  const winRate = st.g > 0 ? Math.round((st.w / st.g) * 100) : 0;
  const arc = getArcadeStats();
  const recentIds = store.get('sharb_recent_games', []);
  const favGames = store.get('sharb_fav_games', ['domino', 'uno', 'chess']);
  const curTheme = store.get('sharb_theme_v3', 'blue');

  const perGameRows = Object.values(SHARB_GAME_META).map(gm => {
    const b = arc[gm.id] || { g: 0, w: 0, l: 0, d: 0 };
    const isFav = favGames.includes(gm.id);
    return `<div class="player" style="padding:10px 14px">
      <div class="pc" style="cursor:default">
        <span class="av sm" style="--c:var(--accent-primary)">${gm.icon}</span>
        <span>
          <b>${esc(gm.name)} • ${esc(gm.nameEn)}</b>
          <small>${b.g > 0 ? `لُعبت: ${b.g} • فوز: ${b.w} • تعادل: ${b.d} • خسارة: ${b.l}` : 'لم تلعب مباريات مسجلة بعد في هذه اللعبة'}</small>
        </span>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <button type="button" class="mini ${isFav ? 'ok' : ''}" data-prof-fav="${gm.id}">${isFav ? '⭐ مفضلة' : '☆ أضف للمفضلة'}</button>
        <a class="btn sm" href="${esc(getPageUrl(gm.id))}">العب الآن ←</a>
      </div>
    </div>`;
  }).join('');

  const favListHTML = favGames.map(gid => SHARB_GAME_META[gid]).filter(Boolean).map(gm => `
    <a class="pub-f-pill on" href="${esc(getPageUrl(gm.id))}" style="padding:7px 13px;font-size:12.5px">
      <span>${gm.icon}</span>
      <span>${esc(gm.name)}</span>
      <span>▶</span>
    </a>
  `).join('');

  root.innerHTML = `
    <div class="profile-page-grid">
      <!-- Left Column: Avatar, Username & Friend Code Editor -->
      <section class="profile-hero-card">
        <span class="av lg" id="profPageAvPreview" style="--c:${esc(PF.col)}">${esc(PF.av)}</span>
        <div style="width:100%">
          <label class="lbl" style="text-align:right" for="profPageNameInp">اسم اللاعب (يظهر في الغرف والأصدقاء):</label>
          <input id="profPageNameInp" value="${esc(PF.name)}" maxlength="14" style="text-align:center;font-weight:800;font-size:15px">
        </div>

        <div style="width:100%">
          <label class="lbl" style="text-align:right">اختر الأفاتار:</label>
          <div class="grd" id="profPageAvGrid">
            ${AVS.map(a => `<span data-pav="${a}" class="${a === PF.av ? 'on' : ''}">${a}</span>`).join('')}
          </div>
        </div>

        <div style="width:100%">
          <label class="lbl" style="text-align:right">اختر لون الهوية:</label>
          <div class="grd" id="profPageColGrid">
            ${COLS.map(c => `<span data-pcol="${c}" class="col ${c === PF.col ? 'on' : ''}" style="background:${c}"></span>`).join('')}
          </div>
        </div>

        <div class="fcode" style="width:100%">
          <span>🔑 كود الصداقة الخاص بك: <b id="profPageUid">${esc(PF.uid)}</b></span>
          <button type="button" class="mini ok" id="profPageCopyUid">📋 نسخ الكود</button>
        </div>

        <button type="button" class="btn ok big" id="profPageSaveBtn" style="width:100%">💾 حفظ تعديلات البروفايل</button>
      </section>

      <!-- Right Column: Real Statistics, Favorite Games & Preferences -->
      <div style="display:flex;flex-direction:column;gap:16px">
        <section class="panel glass">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px">
            <h2 style="margin:0">📊 إحصائيات اللاعب الفعلية</h2>
            <span class="bk-chip ac">المستوى ${L.l} (${L.pc}% للمستوى التالي)</span>
          </div>
          <div class="lv" style="margin-bottom:14px"><i style="width:${L.pc}%"></i></div>
          <div class="stats-overview-grid">
            <div class="stat-metric-box">
              <small>إجمالي المباريات</small>
              <b id="profStatGames">${st.g}</b>
            </div>
            <div class="stat-metric-box">
              <small>مرات الفوز</small>
              <b id="profStatWins" style="color:var(--status-online)">${st.w}</b>
            </div>
            <div class="stat-metric-box">
              <small>نسبة الفوز</small>
              <b id="profStatWinRate" style="color:var(--accent-primary-hover)">${winRate}%</b>
            </div>
            <div class="stat-metric-box">
              <small>إجمالي النقاط</small>
              <b id="profStatPoints" style="color:var(--accent-secondary)">${st.p}</b>
            </div>
          </div>
          ${st.g === 0 ? `<div class="mut tiny" style="margin-top:10px">لم تُسجّل مباريات مكتملة بعد — العب أي مباراة أونلاين أو ضد الذكاء الاصطناعي ليتم تحديث إحصائياتك الحقيقية تلقائيًا.</div>` : ''}
        </section>

        <section class="panel glass">
          <h2>⭐ الألعاب المفضلة والوصول السريع</h2>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
            ${favListHTML || '<span class="mut tiny">لم تختر ألعابًا مفضلة بعد — اضغط «☆ أضف للمفضلة» بالأسفل.</span>'}
          </div>
          <div class="lbl">سجل الألعاب وتفاصيل الأداء حسب اللعبة:</div>
          <div class="plist">${perGameRows}</div>
        </section>

        <section class="panel glass">
          <h2>🎨 إعدادات الحساب والثيمات</h2>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border-subtle)">
            <div>
              <b style="font-size:14px">🔊 المؤثرات الصوتية التفاعلية</b>
              <div class="mut tiny">تشغيل أو كتم أصوات اللعب والتنبيهات</div>
            </div>
            <button type="button" class="btn ${soundOn ? 'ok' : 'g'} sm" id="profPageSoundToggle">
              ${soundOn ? '🔊 الصوت مفعّل' : '🔇 الصوت مكتوم'}
            </button>
          </div>

          <label class="lbl">اختر ثيم المنصة:</label>
          <div class="theme-selector-grid">
            ${SHARB_THEMES_LIST.map(t => `
              <div class="theme-option-card ${curTheme === t.cls ? 'on' : ''}" data-prof-theme="${t.cls}">
                <span class="theme-swatch" style="background:${t.prev}"></span>
                <div style="min-width:0;flex:1">
                  <b style="font-size:12.5px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.name)}</b>
                  <small class="mut tiny">${curTheme === t.cls ? 'مفعّل حاليًا ✓' : 'اضغط للتفعيل'}</small>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      </div>
    </div>
  `;

  let draftAv = PF.av;
  let draftCol = PF.col;

  $('#profPageAvGrid').onclick = e => {
    const s = e.target.closest('[data-pav]');
    if (!s) return;
    draftAv = s.getAttribute('data-pav');
    $('#profPageAvPreview').textContent = draftAv;
    $$('#profPageAvGrid span').forEach(x => x.classList.toggle('on', x === s));
    beep(500, 0.05, 'sine', 0.05);
  };

  $('#profPageColGrid').onclick = e => {
    const s = e.target.closest('[data-pcol]');
    if (!s) return;
    draftCol = s.getAttribute('data-pcol');
    $('#profPageAvPreview').style.setProperty('--c', draftCol);
    $$('#profPageColGrid span').forEach(x => x.classList.toggle('on', x === s));
    beep(520, 0.05, 'sine', 0.05);
  };

  $('#profPageCopyUid').onclick = () => copyText(PF.uid);

  $('#profPageSaveBtn').onclick = () => {
    const nameVal = ($('#profPageNameInp').value || '').trim();
    PF.name = (nameVal || 'لاعب').slice(0, 14);
    PF.av = draftAv;
    PF.col = draftCol;
    savePF();
    renderProfileBtn();
    if (typeof announce === 'function') announce();
    renderProfilePage();
    toast('تم حفظ بيانات البروفايل بنجاح ✅', 'ok');
  };

  $('#profPageSoundToggle').onclick = () => {
    soundOn = !soundOn;
    store.set('snd', soundOn);
    renderSound();
    if (soundOn) beep(520, 0.08, 'sine', 0.08);
    renderProfilePage();
  };

  $$('[data-prof-theme]', root).forEach(card => {
    card.onclick = () => {
      applySharbThemeChoice(card.getAttribute('data-prof-theme'));
      renderProfilePage();
      toast('تم تغيير ثيم المنصة ✅', 'ok');
    };
  });

  $$('[data-prof-fav]', root).forEach(btn => {
    btn.onclick = () => {
      const gid = btn.getAttribute('data-prof-fav');
      let favs = store.get('sharb_fav_games', ['domino', 'uno', 'chess']);
      if (favs.includes(gid)) favs = favs.filter(x => x !== gid);
      else favs.push(gid);
      store.set('sharb_fav_games', favs);
      renderProfilePage();
    };
  });
}
window.renderProfilePage = renderProfilePage;
