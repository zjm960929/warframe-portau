/* Portau - game controller (UI rendering, animation, and interaction flow) */
(function () {
  'use strict';
  const Core = window.PortauCore;
  const engine = Core.engine, rules = Core.rules, gameUtil = Core.game, ai = Core.ai;

  // ---------- Localization ----------
  let lang = 'zh';
  const I18N = {
    zh: {
      doc_title: 'PORτAU 波陶',
      title_zh: ' 波陶',
      choose_difficulty: '选择难度',
      diff_easy: '简单', diff_normal: '普通', diff_hard: '困难',
      start: '开始对局', howto: '规则说明',
      music_on: '背景音乐：开', music_off: '背景音乐：关',
      author: '作者：ZJM',
      back_title: '返回主界面', music_title: '背景音乐',
      bilibili_title: '哔哩哔哩主页', douyin_title: '抖音主页',
      tenno: '天诺', hunra: '魂主',
      deck: '牌堆',
      tenno_turn: '天诺的回合', hunra_thinking: '魂主思考中…',
      ai_name: '魂主（{d}）',
      decide_first: '决定先手',
      decide_sub: '点选一张牌，与魂主比大小，点数大者先手',
      hunra_drawing: '对方正在抽牌…',
      tenno_first: '天诺的牌更大，天诺先手',
      hunra_first: '魂主的牌更大，魂主先手',
      no_moves: '没有可出的牌', choose_option: '选择一个方案',
      discard1: '弃 1 摸 1（-2 分）', redraw: '重新摸牌（立即结束回合）', end_turn: '直接结束回合', endturn: '结束回合',
      victory: '胜利', defeat: '惜败', draw_game: '平局',
      play_again: '再来一局', main_menu: '返回首页',
      video_from: '视频来自 B站 @ZJM', close: '关闭',
      rotate_landscape: '请将设备旋转至横屏游玩', rotate_auto: '横屏后此提示会自动消失',
      banner_capture: '{w}抢走了鬼牌（不摸牌）',
      banner_ai_discard: '魂主弃 1 摸 1（-2 分）',
      banner_ai_redraw: '魂主重新摸牌，回合结束',
      banner_new_playable: '摸到新牌！可以立即打出',
      banner_new_unplayable: '新牌无法打出，回合结束',
      banner_redraw_end: '重新摸牌，回合结束',
      toast_no_slot: '这张牌当前不能出', toast_highlight: '只能放到高亮槽位',
      toast_invalid: '无效操作', toast_no_discard: '无法弃牌', toast_deck_low: '牌堆不足',
      gain_capture: '抢夺！+0',
      score_line: '{t} {p} : {a} {h}',
      switch_lang: 'Switch to English'
    },
    en: {
      doc_title: 'PORτAU',
      title_zh: '',
      choose_difficulty: 'Choose Difficulty',
      diff_easy: 'Easy', diff_normal: 'Normal', diff_hard: 'Hard',
      start: 'Start Game', howto: 'How to Play',
      music_on: 'Music: On', music_off: 'Music: Off',
      author: 'Author: ZJM',
      back_title: 'Back to Menu', music_title: 'Music',
      bilibili_title: 'Bilibili Channel', douyin_title: 'Douyin Channel',
      tenno: 'TENNO', hunra: 'HUNRA',
      deck: 'Deck',
      tenno_turn: "TENNO's Turn", hunra_thinking: 'HUNRA is thinking…',
      ai_name: 'HUNRA ({d})',
      decide_first: 'Decide the First Player',
      decide_sub: 'Pick a card to compare with HUNRA — the higher rank goes first',
      hunra_drawing: 'HUNRA is drawing…',
      tenno_first: "TENNO's card is higher — TENNO goes first",
      hunra_first: "HUNRA's card is higher — HUNRA goes first",
      no_moves: 'No Legal Moves', choose_option: 'Choose an option',
      discard1: 'Discard 1 & Draw 1 (−2 pts)', redraw: 'Redraw Hand (ends your turn)', end_turn: 'End Turn', endturn: 'End Turn',
      victory: 'Victory', defeat: 'Defeat', draw_game: 'Draw',
      play_again: 'Play Again', main_menu: 'Main Menu',
      video_from: 'Video from Bilibili @ZJM', close: 'Close',
      rotate_landscape: 'Please rotate your device to landscape', rotate_auto: 'This message disappears in landscape',
      banner_capture: '{w} captured the Joker (no draw)',
      banner_ai_discard: 'HUNRA discards 1 & draws 1 (−2 pts)',
      banner_ai_redraw: 'HUNRA redraws its hand; turn ends',
      banner_new_playable: 'New card is playable — play it now!',
      banner_new_unplayable: 'New card cannot be played; turn ends',
      banner_redraw_end: 'Hand redrawn; turn ends',
      toast_no_slot: 'This card has no legal slot right now', toast_highlight: 'Only highlighted slots are legal',
      toast_invalid: 'Invalid move', toast_no_discard: 'Cannot discard', toast_deck_low: 'Not enough cards in the deck',
      gain_capture: 'CAPTURE! +0',
      score_line: '{t} {p} : {a} {h}',
      switch_lang: '切换到中文'
    }
  };
  function tr(key, vars) {
    // Test key existence rather than truthiness: an empty string is a valid translation (e.g. the English title suffix)
    const dict = I18N[lang] || {};
    let s = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key]
      : (Object.prototype.hasOwnProperty.call(I18N.zh, key) ? I18N.zh[key] : key);
    if (vars) { for (const k in vars) s = s.split('{' + k + '}').join(vars[k]); }
    return s;
  }
  // Apply to every static element with data-i18n / data-i18n-title; the toggle shows the other language
  function applyI18n() {
    if (document.documentElement) document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
    document.title = tr('doc_title');
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = tr(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.setAttribute('title', tr(el.getAttribute('data-i18n-title')));
    });
    const btnLang = $('btn-lang');
    if (btnLang) btnLang.textContent = tr('switch_lang');
    syncBgmButtons();
  }

  // ---------- Utilities ----------
  const $ = function (id) { return document.getElementById(id); };
  const timers = new Set();
  function t(fn, ms) {
    const id = setTimeout(function () { timers.delete(id); fn(); }, ms);
    timers.add(id);
    return id;
  }
  function clearTimers() {
    timers.forEach(function (id) { clearTimeout(id); });
    timers.clear();
    const fl = $('fly-layer');
    if (fl) fl.innerHTML = ''; // Clear in-flight clone cards so they do not linger on other screens
  }

  // localStorage can throw in private mode or with cookies disabled, so wrap it safely
  function lsGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignore; fall back to a session-only preference */ }
  }
  lang = lsGet('portau_lang') === 'en' ? 'en' : 'zh';

  function rect(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r || r.width === 0) return null;
    return r;
  }

  // ---------- Sound effects (WebAudio synthesis) ----------
  let actx = null;
  function audioCtx() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }

  function tone(freq, start, dur, vol, type) {
    const ctx = audioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const t0 = ctx.currentTime + start;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  const sound = {
    play: function () { tone(260, 0, 0.09, 0.18, 'triangle'); },
    draw: function () { tone(500, 0, 0.06, 0.12, 'sine'); },
    score: function () { tone(660, 0, 0.09, 0.16); tone(880, 0.09, 0.12, 0.18); },
    capture: function () { tone(220, 0, 0.24, 0.16, 'sine'); tone(331, 0, 0.24, 0.1, 'sine'); },
    win: function () { tone(523.25, 0, 0.13, 0.16); tone(659.25, 0.13, 0.13, 0.16); tone(783.99, 0.26, 0.13, 0.16); tone(1046.5, 0.39, 0.22, 0.18); },
    lose: function () { tone(392, 0, 0.15, 0.16); tone(311, 0.15, 0.15, 0.16); tone(261, 0.3, 0.25, 0.16); }
  };

  // ---------- BGM ----------
  // Off by default; remember the preference once the player turns it on (auto-plays on the next visit)
  let bgmOn = lsGet('portau_bgm') === 'on';
  let bgmStarted = false;

  // Try autoplay right after the page loads; if browser policy blocks it, start on the first user interaction
  function tryStartBgm() {
    if (!bgmOn || bgmStarted) return;
    const a = $('bgm-audio');
    if (!a) return;
    a.volume = 0.3;
    const p = a.play();
    if (p && p.then) {
      p.then(function () { bgmStarted = true; }).catch(function () { bgmStarted = false; });
    }
  }

  // Mobile / tablet detection (UA plus iPadOS touch traits)
  function isMobileOrTablet() {
    const ua = navigator.userAgent || '';
    if (/Android|iPhone|iPad|iPod|Mobile|Tablet|HarmonyOS/i.test(ua)) return true;
    if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true; // iPadOS 13+
    return false;
  }

  const BILI_VIDEO_URL = 'https://www.bilibili.com/video/BV191436sE5f/';

  function toggleBgm() {
    bgmOn = !bgmOn;
    lsSet('portau_bgm', bgmOn ? 'on' : 'off');
    const a = $('bgm-audio');
    if (bgmOn) { tryStartBgm(); if (a) a.play().catch(function () {}); }
    else if (a) a.pause();
    syncBgmButtons();
  }

  // Sync both music toggle displays (menu text button and in-game icon button)
  function syncBgmButtons() {
    const btnBgm = $('btn-bgm');
    if (btnBgm) btnBgm.textContent = bgmOn ? tr('music_on') : tr('music_off');
    const btnIcon = $('btn-bgm-ingame');
    if (btnIcon) btnIcon.classList.toggle('muted', !bgmOn);
  }

  // ---------- Views ----------
  function toView(c) {
    if (!c) return null;
    return { id: c.id, kind: c.kind, rank: c.rank, label: c.label, symbol: c.symbol, red: !!c.red };
  }

  // Standard card face: corner indices plus a large central suit pip; the Joker shows the Tau glyph and a star
  function faceInner(view) {
    if (view.kind === 'joker') {
      return '<div class="corner tl"><span class="c-suit">τ</span></div>' +
        '<div class="joker-mid"><span class="j-tau">τ</span></div>' +
        '<div class="corner br"><span class="c-suit">τ</span></div>';
    }
    return '<div class="corner tl"><span class="c-rank">' + view.label + '</span><span class="c-suit">' + view.symbol + '</span></div>' +
      '<div class="pip">' + view.symbol + '</div>' +
      '<div class="corner br"><span class="c-rank">' + view.label + '</span><span class="c-suit">' + view.symbol + '</span></div>';
  }

  function cardHtml(view, cls) {
    const clsAll = 'pcard ' + (cls || '') + ' ' + (view.red ? 'red' : 'black') + (view.kind === 'joker' ? ' joker' : '');
    return '<div class="' + clsAll + '">' + faceInner(view) + '</div>';
  }

  function backHtml(cls) { return '<div class="pcard back ' + (cls || '') + '"></div>'; }

  // ---------- Global state ----------
  let state = null;
  let difficulty = 'normal';
  let selectedId = null;
  let legalFlags = [];
  let captureFlags = [];
  let animating = false;
  // Animation lock: while true, syncs the body.anim class and disables in-game buttons (back/music) to block input mid-animation
  function setAnimating(v) {
    animating = v;
    if (document.body) document.body.classList.toggle('anim', v);
  }
  let discardMode = false;
  let canEndTurn = false;
  let screen = 'menu';

  // ---------- Rendering ----------
  function renderBoard() {
    let html = '';
    for (let i = 0; i < rules.SLOT_COUNT; i++) {
      const c = state.slots[i];
      const glow = legalFlags[i] ? (captureFlags[i] ? ' glow-cap' : ' glow') : '';
      const lblGlow = legalFlags[i] ? (captureFlags[i] ? ' label-cap' : ' label-glow') : '';
      html += '<div class="slot-wrap">' +
        '<div class="slot' + (c ? ' filled' : '') + glow + '" data-idx="' + i + '">' +
        '<span class="slot-label' + lblGlow + '">' + gameUtil.rankLabel(i + 1) + '</span>' +
        (c ? cardHtml(toView(c)) : '') +
        '</div>' +
        '<span class="float-gain hidden" data-float="' + i + '"></span>' +
        '</div>';
    }
    $('board-inner').innerHTML = html;
    $('score-player').textContent = state.scores.player;
    $('score-ai').textContent = state.scores.ai;
  }

  function handHtml(hand, who, small) {
    let html = '';
    for (let i = 0; i < hand.length; i++) {
      const v = hand[i];
      let cls = (small ? 'sm ' : '');
      if (who === 'player') {
        if (selectedId === v.id) cls += 'selected ';
        // Compute playability (drives dimming): a normal card needs an empty slot or a capturable Joker; a Joker needs any empty slot
        if (v.kind === 'joker') v.playable = state.slots.some(function (s) { return !s; });
        else {
          const occ = state.slots[v.rank - 1];
          v.playable = !occ || occ.kind === 'joker';
        }
        if (discardMode) cls += 'discard ';
        else if (animating || state.turn !== 'player') cls += 'turn-dim '; // Cannot act (animating or opponent turn) -> fully dimmed
        else if (!v.playable) cls += 'dim ';
      }
      const idAttr = who === 'player' ? 'hand-' + v.id : 'aihand-' + v.id;
      html += cardHtml(v, cls).replace('<div class="pcard ', '<div id="' + idAttr + '" data-id="' + v.id + '" class="pcard ');
    }
    return html;
  }

  function renderHands() {
    $('player-hand').innerHTML = handHtml(state.hands.player, 'player', false);
    $('ai-hand').innerHTML = handHtml(state.hands.ai, 'ai', true);
  }

  function renderAll() {
    renderBoard();
    renderHands();
    $('deck-num').textContent = state.deck.length;
  }

  function setTurnText() {
    const el = $('turn-text');
    el.textContent = state.turn === 'player' ? tr('tenno_turn') : tr('hunra_thinking');
    el.className = state.turn === 'player' ? 'turn-me' : 'turn-ai';
    // Re-render the player hand dimming on turn change (static HTML needs a manual refresh)
    renderHands();
  }

  function showGain(slotIdx, text, cls) {
    const el = document.querySelector('[data-float="' + slotIdx + '"]');
    if (!el) return;
    el.textContent = text;
    el.className = 'float-gain ' + (cls || 'normal');
    // Retrigger the animation
    void el.offsetWidth;
    t(function () { el.className = 'float-gain hidden'; }, 1000);
  }

  function showBanner(text) {
    let b = $('banner');
    if (!b) {
      b = document.createElement('div');
      b.id = 'banner';
      b.className = 'banner';
      document.body.appendChild(b);
    }
    b.textContent = text;
    b.style.display = 'block';
    t(function () { b.style.display = 'none'; }, 1600);
  }

  // ---------- Flying clone cards ----------
  const FLY_DUR = { slow: 490, draw: 430, deal: 360 };

  // targetEl: placeholder of the real card at the landing point; the clone inherits its font size so the face matches seamlessly on landing
  function spawnFly(view, isBack, from, to, durCls, cb, targetEl) {
    const layer = $('fly-layer');
    const div = document.createElement('div');
    let cls = 'pcard fly-card ' + (durCls || 'draw');
    if (isBack) cls += ' back';
    else cls += (view.red ? ' red' : ' black') + (view.kind === 'joker' ? ' joker' : '');
    div.className = cls;
    div.innerHTML = isBack ? '' : faceInner(view);
    if (targetEl && window.getComputedStyle) {
      try { div.style.fontSize = getComputedStyle(targetEl).fontSize; } catch (e) { /* keep the base font size */ }
    }
    // The clone keeps the target size and flies via transform translate+scale (GPU compositing), starting scaled down to the source size
    div.style.width = to.width + 'px';
    div.style.height = to.height + 'px';
    div.style.left = '0px';
    div.style.top = '0px';
    const sx = (from.left + from.width / 2) + 'px';
    const sy = (from.top + from.height / 2) + 'px';
    const ex = (to.left + to.width / 2) + 'px';
    const ey = (to.top + to.height / 2) + 'px';
    const s0 = Math.max(0.2, from.width / to.width).toFixed(3);
    div.style.transform = 'translate(' + sx + ',' + sy + ') translate(-50%,-50%) scale(' + s0 + ')';
    layer.appendChild(div);
    t(function () {
      div.style.transform = 'translate(' + ex + ',' + ey + ') translate(-50%,-50%) scale(1)';
    }, 30);
    t(function () {
      if (div.parentNode) div.parentNode.removeChild(div); // layer may have been purged by clearTimers
      cb();
    }, FLY_DUR[durCls] || 430);
  }

  // ---------- Screen switching ----------
  function showScreen(name) {
    screen = name;
    $('screen-menu').classList.toggle('hidden', name !== 'menu');
    $('screen-game').classList.toggle('hidden', name !== 'game');
  }

  // Rect of the real card inside a slot (.slot .pcard is 92% x 94% of the slot and centered)
  function slotCardRect(slotRect) {
    const w = slotRect.width * 0.92, h = slotRect.height * 0.94;
    return { left: slotRect.left + (slotRect.width - w) / 2, top: slotRect.top + (slotRect.height - h) / 2, width: w, height: h };
  }

  // Deck launch rect: shrink the size but anchor at the deck center (otherwise the start drifts left of the deck)
  function deckStartRect(from) {
    const w = Math.min(44, from.width), h = Math.min(58, from.height);
    return { left: from.left + (from.width - w) / 2, top: from.top + (from.height - h) / 2, width: w, height: h };
  }

  // Board visibility: hidden during the opening and dealing, then fades in and rises when dealing ends
  function setBoardVisible(show) {
    const b = $('board');
    if (b) b.classList.toggle('board-show', !!show);
  }

  // ---------- Match ----------
  function startGame() {
    clearTimers();
    setAnimating(false);
    selectedId = null;
    legalFlags = [];
    captureFlags = [];
    discardMode = false;
    canEndTurn = false;
    // Create the match without dealing: decide the first player, then play the dealing animation
    state = engine.createState(difficulty);
    $('ai-name').textContent = tr('ai_name', { d: tr('diff_' + difficulty) });
    $('actionbar').classList.add('hidden');
    $('remedy-overlay').classList.add('hidden');
    $('result-overlay').classList.add('hidden');
    showScreen('game');
    setBoardVisible(false); // Hide slot cards while deciding the first player and dealing
    renderBoard();
    renderHands();
    $('deck-num').textContent = state.deck.length;
    // Leave the turn label empty until dealing ends (no "your turn" text during the deal)
    $('turn-text').textContent = '';
    startOpening();
  }

  // ---------- Opening draw ----------
  let poolSlots = null;
  let openingBusy = false;

  function startOpening() {
    const pool = gameUtil.createOpeningPool();
    poolSlots = [];
    for (let i = 0; i < 13; i++) poolSlots.push({ idx: i, card: pool.cards[i] });
    openingBusy = false;
    renderPool();
    $('draw-stage').classList.remove('shifted');
    $('draw-result').classList.remove('show');
    $('draw-msg').textContent = '';
    $('draw-msg').className = 'draw-msg';
    $('frame-player').innerHTML = '';
    $('frame-ai').innerHTML = '';
    $('opening-overlay').classList.remove('hidden');
  }

  function renderPool() {
    let html = '';
    for (const s of poolSlots) {
      const vis = s.card === null && s.drawn ? ' style="visibility:hidden"' : '';
      html += '<div class="pool-slot" id="pool-' + s.idx + '">' +
        (s.card ? backHtml('pool-card" data-idx="' + s.idx) : '<div class="pcard back pool-card"' + vis + '></div>') +
        '</div>';
    }
    $('pool-row').innerHTML = html;
  }

  function onDrawTap(idx) {
    if (openingBusy) return;
    if (!poolSlots || !poolSlots[idx] || !poolSlots[idx].card) return;
    openingBusy = true;
    const playerCard = poolSlots[idx].card;
    poolSlots[idx].drawn = true; // Mark as drawn but keep the back until the clone card appears
    sound.play('draw');
    $('draw-stage').classList.add('shifted');
    $('draw-result').classList.add('show');

    t(function () {
      const backEl = document.querySelector('#pool-' + idx + ' .pcard');
      const from = rect(backEl);
      const to = rect($('frame-player'));
      if (backEl) backEl.style.visibility = 'hidden'; // The clone card is about to cover it
      if (!from || !to) {
        poolSlots[idx].card = null;
        revealPlayer(playerCard);
        return;
      }
      spawnFly(null, true, from, to, 'slow', function () {
        sound.play('draw');
        poolSlots[idx].card = null;
        revealPlayer(playerCard);
      });
    }, 430);
  }

  function revealPlayer(playerCard) {
    $('frame-player').innerHTML = cardHtml(toView(playerCard));
    $('draw-msg').textContent = tr('hunra_drawing');
    $('draw-msg').className = 'draw-msg drawing';
    t(function () { aiDrawSequence(playerCard); }, 800);
  }

  function aiDrawSequence(playerCard) {
    const avail = poolSlots.filter(function (s) { return s.card; });
    if (avail.length === 0) { finishOpening(null, playerCard); return; }
    const pick = avail[Math.floor(Math.random() * avail.length)];
    const aiCard = pick.card;
    pick.drawn = true;
    t(function () {
      const backEl = document.querySelector('#pool-' + pick.idx + ' .pcard');
      const from = rect(backEl);
      const to = rect($('frame-ai'));
      if (backEl) backEl.style.visibility = 'hidden';
      if (!from || !to) { poolSlots[pick.idx].card = null; revealAi(aiCard, playerCard); return; }
      spawnFly(null, true, from, to, 'slow', function () {
        sound.play('draw');
        poolSlots[pick.idx].card = null;
        revealAi(aiCard, playerCard);
      });
    }, 430);
  }

  function revealAi(aiCard, playerCard) {
    $('frame-ai').innerHTML = cardHtml(toView(aiCard));
    const first = playerCard.rank > aiCard.rank ? 'player' : 'ai';
    $('draw-msg').textContent = first === 'player' ? tr('tenno_first') : tr('hunra_first');
    $('draw-msg').className = 'draw-msg';
    t(function () { beginPlay(first); }, 1400);
  }

  function finishOpening(aiCard, playerCard) {
    if (!aiCard || !playerCard) { beginPlay('player'); return; }
    const first = playerCard.rank > aiCard.rank ? 'player' : 'ai';
    $('draw-msg').textContent = first === 'player' ? tr('tenno_first') : tr('hunra_first');
    t(function () { beginPlay(first); }, 1400);
  }

  function beginPlay(first) {
    engine.setFirstPlayer(state, first);
    $('opening-overlay').classList.add('hidden');
    renderBoard(); // Slots are hidden at this point (layout placeholders remain)
    renderDealingHands({ player: 0, ai: 0 });
    $('turn-text').textContent = '';
    setAnimating(true);
    // 1) Deal to both sides; 2) show the slots when dealing ends; 3) place the initial card after the transition; 4) enter play
    dealSequence(first, function () {
      renderAll();
      setBoardVisible(true);
      t(function () { afterBoardReveal(first); }, 520); // Wait for the board fade-in transition to finish
    });
  }

  // 3) After the board is shown, fly the initial card from the deck onto the table
  function afterBoardReveal(first) {
    const init = engine.drawInitialCard(state);
    $('deck-num').textContent = state.deck.length;
    const slotEl = document.getElementById('board-inner').children[init.rank - 1] ?
      document.getElementById('board-inner').children[init.rank - 1].querySelector('.slot') : null;
    const from = rect($('deck-box'));
    const to = rect(slotEl);
    if (!from || !to) {
      renderBoard();
      enterPlay(first);
      return;
    }
    const startRect = deckStartRect(from);
    spawnFly(toView(init), false, startRect, slotCardRect(to), 'deal', function () {
      renderBoard(); // The initial card lands (covering the text label)
      // 4) Enter play for real
      enterPlay(first);
    });
  }

  // 4) Unlock input, show the turn label, start the turn flow
  function enterPlay(first) {
    setAnimating(false); // Unlock before rendering
    setTurnText();
    if (state.turn === 'ai') aiTurn();
    else checkPlayerMoves();
  }

  // Rendering during the deal: 4 placeholders per side; the first n show their faces
  function renderDealingHands(revealed) {
    function row(who) {
      let html = '';
      for (let i = 0; i < 4; i++) {
        const phId = (who === 'player' ? 'phand-' : 'aihand-') + i;
        if (i < revealed[who]) {
          const v = toView(state.hands[who][i]);
          const cls = who === 'player' ? '' : 'sm';
          const idAttr = who === 'player' ? 'hand-' + v.id : 'aihand-' + v.id;
          html += cardHtml(v, cls).replace('<div class="pcard ', '<div id="' + idAttr + '" data-id="' + v.id + '" class="pcard ');
        } else {
          html += '<div class="pcard ' + (who === 'player' ? '' : 'sm ') + 'gone" id="' + phId + '"></div>';
        }
      }
      return html;
    }
    $('player-hand').innerHTML = row('player');
    $('ai-hand').innerHTML = row('ai');
  }

  function dealSequence(first, onDone) {
    const order = [];
    const other = first === 'player' ? 'ai' : 'player';
    for (let i = 0; i < 4; i++) { order.push(first, other); } // The first player draws first; deals alternate
    const revealed = { player: 0, ai: 0 };
    let i = 0;
    function step() {
      if (i >= order.length) {
        // Dealing done: keep the animation lock (no player input) and let the callback continue
        renderAll();
        if (onDone) onDone();
        return;
      }
      const who = order[i];
      const idx = revealed[who];
      const card = state.deck.pop();
      state.hands[who].push(card);
      $('deck-num').textContent = state.deck.length;
      const from = rect($('deck-box'));
      const placeholder = document.getElementById((who === 'player' ? 'phand-' : 'aihand-') + idx);
      const to = rect(placeholder);
      sound.draw();
      if (!from || !to) {
        revealed[who] += 1;
        i += 1;
        renderDealingHands(revealed);
        step();
        return;
      }
      const startRect = deckStartRect(from);
      spawnFly(toView(card), false, startRect, to, 'deal', function () {
        revealed[who] += 1;
        renderDealingHands(revealed);
        i += 1;
        step();
      }, placeholder);
    }
    step();
  }

  // ---------- Player actions ----------
  function onHandTap(id) {
    if (screen !== 'game' || state.phase !== 'playing') return;
    if (state.turn !== 'player' || animating) return;

    if (discardMode) { doDiscard(id); return; }

    const card = state.hands.player.find(function (c) { return c.id === id; });
    if (!card) return;

    // Tapping the selected normal card again plays it directly (a Joker must pick a slot manually)
    if (selectedId === id) {
      if (card.kind === 'normal') {
        const occupied = state.slots[card.rank - 1];
        const isCap = !!(occupied && occupied.kind === 'joker');
        execPlay('player', { type: isCap ? 'capture' : 'play', card: card, slot: card.rank - 1 });
      }
      return;
    }

    // Compute legal slots
    const flags = new Array(rules.SLOT_COUNT).fill(false);
    const capFlags = new Array(rules.SLOT_COUNT).fill(false);
    if (card.kind === 'joker') {
      for (let i = 0; i < rules.SLOT_COUNT; i++) if (!state.slots[i]) flags[i] = true;
    } else if (!state.slots[card.rank - 1]) {
      flags[card.rank - 1] = true;
    } else if (state.slots[card.rank - 1].kind === 'joker') {
      flags[card.rank - 1] = true;
      capFlags[card.rank - 1] = true;
    }
    if (!flags.some(function (f) { return f; })) {
      toast(tr('toast_no_slot'));
      return;
    }
    selectedId = id;
    legalFlags = flags;
    captureFlags = capFlags;
    renderBoard();
    renderHands();
  }

  function onSlotTap(idx) {
    if (screen !== 'game' || state.phase !== 'playing') return;
    if (state.turn !== 'player' || animating) return;
    if (!selectedId || !legalFlags[idx]) {
      if (selectedId) toast(tr('toast_highlight'));
      return;
    }
    const card = state.hands.player.find(function (c) { return c.id === selectedId; });
    if (!card) return;
    const isCap = !!(state.slots[idx] && state.slots[idx].kind === 'joker');
    execPlay('player', { type: isCap ? 'capture' : 'play', card: card, slot: idx });
  }

  function toast(text) {
    let el = $('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.style.cssText = 'position:fixed;top:24%;left:50%;transform:translateX(-50%);background:rgba(18,24,60,.95);border:1px solid rgba(80,220,255,.4);color:#dfe8ff;padding:8px 20px;border-radius:20px;font-size:13px;z-index:230;white-space:nowrap;';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.display = 'block';
    t(function () { el.style.display = 'none'; }, 1200);
  }

  // ---------- Playing a card + delayed draw ----------
  function execPlay(who, move) {
    if (animating) return;
    setAnimating(true);
    const r = engine.playMove(state, who, move, true);
    if (r.error) {
      setAnimating(false);
      toast(tr('toast_invalid'));
      return;
    }
    selectedId = null;
    legalFlags = [];
    captureFlags = [];
    canEndTurn = false;
    discardMode = false;
    $('actionbar').classList.add('hidden');

    const handEl = document.getElementById((who === 'player' ? 'hand-' : 'aihand-') + move.card.id);
    const slotEl = document.getElementById('board-inner').children[move.slot] ?
      document.getElementById('board-inner').children[move.slot].querySelector('.slot') : null;
    const from = rect(handEl);
    const to = rect(slotEl);

    if (!from || !to) { afterPlay(who, r, move.slot); return; }

    // Leave a placeholder at the old hand position (other cards stay put)
    renderHandsWithGap(who, r.handIndex);
    $('deck-num').textContent = state.deck.length;

    const fw = who === 'player' ? Math.min(64, from.width) : Math.min(46, from.width);
    const fh = who === 'player' ? Math.min(88, from.height) : Math.min(64, from.height);
    const startRect = { left: from.left, top: from.top, width: fw, height: fh };
    const endRect = slotCardRect(to);
    spawnFly(toView(move.card), false, startRect, endRect, '', function () {
      afterFlyToSlot(who, r, move.slot);
    });
  }

  function renderHandsWithGap(who, index) {
    if (who === 'player') {
      const hand = state.hands.player.map(toView);
      hand.splice(index, 0, { gone: true });
      $('player-hand').innerHTML = hand.map(function (v) {
        if (v.gone) return '<div class="pcard gone" id="hand-gap"></div>';
        return handHtml([v], 'player', false);
      }).join('');
    } else {
      const hand = state.hands.ai.map(toView);
      hand.splice(index, 0, { gone: true });
      $('ai-hand').innerHTML = hand.map(function (v) {
        if (v.gone) return '<div class="pcard sm gone" id="aihand-gap"></div>';
        return handHtml([v], 'ai', true);
      }).join('');
    }
  }

  function renderSlotsOnly() {
    renderBoard();
  }

  function afterFlyToSlot(who, r, slotIdx) {
    renderSlotsOnly();
    if (r.captured) {
      sound.capture();
      showGain(slotIdx, tr('gain_capture'), 'cap');
      showBanner(tr('banner_capture', { w: who === 'player' ? tr('tenno') : tr('hunra') }));
    } else {
      sound.play();
      if (r.gain > 0) {
        sound.score();
        showGain(slotIdx, '+' + r.gain, r.gain >= 7 ? 'best' : 'normal');
      }
    }
    if (state.phase === 'over') {
      if (r.capturedCard) engine.insertCard(state, who, r.handIndex, r.capturedCard);
      renderAll();
      finish();
      return;
    }
    startDrawAnimation(who, r, slotIdx);
  }

  function startDrawAnimation(who, r, slotIdx) {
    // Capture: the Joker flies from the table back into the free hand slot
    if (r.capturedCard) {
      const capGap = document.getElementById(who === 'player' ? 'hand-gap' : 'aihand-gap');
      const slotEl = document.getElementById('board-inner').children[slotIdx] ?
        document.getElementById('board-inner').children[slotIdx].querySelector('.slot') : null;
      // Start from the real card rect inside the slot (92% x 94%, centered) so it overlaps the table card exactly
      const from = slotEl ? slotCardRect(rect(slotEl)) : null;
      const to = rect(capGap);
      if (!from || !to) {
        engine.insertCard(state, who, r.handIndex, r.capturedCard);
        renderAll();
        continueAfterDraw(who);
        return;
      }
      spawnFly(toView(r.capturedCard), false, from, to, 'draw', function () {
        engine.insertCard(state, who, r.handIndex, r.capturedCard);
        renderAll();
        continueAfterDraw(who);
      }, capGap);
      return;
    }

    const newCard = engine.drawCard(state);
    if (!newCard) { renderAll(); continueAfterDraw(who); return; }

    const deckEl = $('deck-box');
    const gapEl = document.getElementById(who === 'player' ? 'hand-gap' : 'aihand-gap');
    const from = rect(deckEl);
    const to = rect(gapEl);
    if (!from || !to) {
      engine.insertCard(state, who, r.handIndex, newCard);
      renderAll();
      continueAfterDraw(who);
      return;
    }
    const startRect = deckStartRect(from);
    spawnFly(null, true, startRect, to, 'draw', function () {
      engine.insertCard(state, who, r.handIndex, newCard);
      renderAll();
      continueAfterDraw(who);
    }, gapEl);
  }

  function continueAfterDraw(who) {
    setAnimating(false);
    engine.endTurn(state);
    setTurnText();
    if (state.turn === 'ai') aiTurn();
    else checkPlayerMoves();
  }

  function afterPlay(who, r, slotIdx) {
    // Fallback path: no animation
    if (!r.captured && state.phase !== 'over') {
      const nc = engine.drawCard(state);
      if (nc) engine.insertCard(state, who, r.handIndex, nc);
    }
    if (r.capturedCard) engine.insertCard(state, who, r.handIndex, r.capturedCard);
    renderAll();
    if (r.captured) { sound.capture(); showGain(slotIdx, tr('gain_capture'), 'cap'); }
    else { sound.play(); if (r.gain > 0) { sound.score(); showGain(slotIdx, '+' + r.gain, r.gain >= 7 ? 'best' : 'normal'); } }
    if (state.phase === 'over') { finish(); return; }
    setAnimating(false);
    engine.endTurn(state);
    setTurnText();
    if (state.turn === 'ai') aiTurn();
    else checkPlayerMoves();
  }

  // ---------- AI turn ----------
  function aiTurn() {
    if (state.phase !== 'playing') return;
    t(function () {
      if (state.phase !== 'playing') return;
      const move = ai.chooseMove(state, 'ai');
      if (move) { execPlay('ai', move); return; }
      const remedy = ai.chooseRemedy(state, 'ai');
      if (remedy.type === 'discard') {
        const r = engine.discardOne(state, 'ai', remedy.card.id);
        if (r.error) { engine.skipTurn(state); }
        else {
          sound.draw();
          showBanner(tr('banner_ai_discard'));
          renderHands();
          const m2 = ai.playDrawnIfPossible(state, 'ai', r.newCard);
          if (m2) { t(function () { execPlay('ai', m2); }, 350); return; }
          renderAll();
          engine.endTurn(state);
        }
      } else if (remedy.type === 'redraw') {
        const r = engine.fullRedraw(state, 'ai');
        if (r.error) { engine.skipTurn(state); }
        else {
          sound.draw();
          showBanner(tr('banner_ai_redraw'));
          renderAll();
          engine.endTurn(state);
        }
      } else {
        engine.skipTurn(state);
      }
      if (state.phase === 'over') { finish(); return; }
      setTurnText();
      if (state.turn === 'ai') aiTurn();
      else checkPlayerMoves();
    }, 800 + Math.random() * 700);
  }

  // ---------- Remedies ----------
  function checkPlayerMoves() {
    if (state.phase !== 'playing' || state.turn !== 'player') return;
    const moves = rules.legalMoves(state.hands.player, state.slots);
    if (moves.length === 0) {
      $('remedy-overlay').classList.remove('hidden');
      const can = engine.canDiscardOne(state, 'player');
      $('btn-discard').classList.toggle('disabled', !can);
    }
  }

  // Remedy animation: the clone covers the discarded card first to avoid a vanish-then-reappear flicker, then slides down and fades out
  // srcEl: the source card element; the clone inherits its font size so rank and suit match the real card
  function fadeCardDown(view, fromRect, outDelay, srcEl) {
    const layer = $('fly-layer');
    const div = document.createElement('div');
    let cls = 'pcard fly-card fade-down' + (view.red ? ' red' : ' black') + (view.kind === 'joker' ? ' joker' : '');
    div.className = cls;
    div.innerHTML = faceInner(view);
    if (srcEl && window.getComputedStyle) {
      try { div.style.fontSize = getComputedStyle(srcEl).fontSize; } catch (e) { /* keep the base font size */ }
    }
    div.style.left = fromRect.left + 'px';
    div.style.top = fromRect.top + 'px';
    div.style.width = fromRect.width + 'px';
    div.style.height = fromRect.height + 'px';
    layer.appendChild(div);
    t(function () { div.classList.add('out'); }, 30 + (outDelay || 0));
    t(function () { if (div.parentNode) div.parentNode.removeChild(div); }, 450 + (outDelay || 0));
  }

  function doDiscard(id) {
    if (animating) return;
    const cardEl = document.getElementById('hand-' + id);
    const cardView = toView(state.hands.player.find(function (c) { return c.id === id; }));
    const fromRect = rect(cardEl);
    // Locate the discard index first (discardOne removes the card from the hand)
    const discardIdx = state.hands.player.findIndex(function (c) { return c.id === id; });
    const r = engine.discardOne(state, 'player', id);
    if (r.error) { toast(tr('toast_no_discard')); return; }
    sound.draw();
    discardMode = false;
    setAnimating(true);
    const newCard = r.newCard;
    state.hands.player.pop(); // Hold the new card back (it enters the discard gap after the animation)
    // 1) The clone covers the discarded position first, then fades downward
    if (fromRect && cardView) fadeCardDown(cardView, fromRect, 0, cardEl);
    // 2) Open the discard gap; other hand cards stay in place
    renderHandsWithGap('player', discardIdx);
    // 3) Then run the draw animation: deck to the discard gap
    t(function () {
      const deckR = rect($('deck-box'));
      const gapEl = document.getElementById('hand-gap');
      const toR = rect(gapEl);
      function done() {
        // Insert the new card into the discard gap so state order matches the visuals and later renders do not jump
        const h = state.hands.player;
        h.push(newCard);
        h.splice(h.indexOf(newCard), 1);
        h.splice(discardIdx, 0, newCard);
        const playable = rules.legalMoves(h, state.slots).some(function (m) { return m.card.id === newCard.id; });
        setAnimating(false);
        if (playable) {
          canEndTurn = true;
          $('actionbar').classList.remove('hidden');
          renderHands();
          showBanner(tr('banner_new_playable'));
        } else {
          showBanner(tr('banner_new_unplayable'));
          engine.endTurn(state);
          setTurnText();
          aiTurn();
        }
      }
      if (!deckR || !toR) { done(); return; }
      const startR = deckStartRect(deckR);
      spawnFly(null, true, startR, toR, 'draw', done, gapEl);
    }, 460);
  }

  // Redraw: fly each new card from the deck into its placeholder
  function dealRedrawnHand() {
    const hand = state.hands.player;
    let i = 0;
    function step() {
      if (i >= hand.length) { afterRedrawDone(); return; }
      const deckR = rect($('deck-box'));
      const phEl = document.getElementById('rhand-' + i);
      const toR = rect(phEl);
      if (!deckR || !toR) { i += 1; step(); return; }
      const startR = deckStartRect(deckR);
      sound.draw();
      spawnFly(toView(hand[i]), false, startR, toR, 'draw', function () {
        if (phEl) {
          phEl.innerHTML = faceInner(toView(hand[i]));
          phEl.classList.remove('gone');
          phEl.classList.add(hand[i].red ? 'red' : 'black');
        }
        i += 1;
        step();
      }, phEl);
    }
    step();
  }

  function afterRedrawDone() {
    showBanner(tr('banner_redraw_end'));
    engine.endTurn(state);
    setAnimating(false);
    setTurnText();
    aiTurn();
  }

  // ---------- Results ----------
  function finish() {
    setAnimating(false);
    // Clear the turn label so "your turn" / "thinking" no longer shows behind the result dialog
    const turnEl = $('turn-text');
    if (turnEl) { turnEl.textContent = ''; turnEl.className = 'turn-me'; }
    const outcome = state.result.outcome;
    $('result-title').textContent = outcome === 'player_win' ? tr('victory') : (outcome === 'ai_win' ? tr('defeat') : tr('draw_game'));
    $('result-title').className = 'result-title ' + outcome;
    $('result-score').textContent = tr('score_line', { t: tr('tenno'), p: state.result.player, a: state.result.ai, h: tr('hunra') });
    $('result-overlay').classList.remove('hidden');
    if (outcome === 'player_win') sound.win();
    else if (outcome === 'ai_win') sound.lose();
  }

  // ---------- Portrait detection (prompt on mobile, clears in landscape) ----------
  function checkOrientation() {
    const el = $('rotate-overlay');
    if (!el) return;
    const portrait = window.innerHeight > window.innerWidth;
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    const isSmall = Math.min(window.innerWidth, window.innerHeight) <= 500;
    const show = portrait && (isTouchDevice || isSmall);
    el.classList.toggle('hidden', !show);
  }
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);
  checkOrientation();

  // ---------- Event binding ----------
  function bind() {
    // Menu
    document.querySelectorAll('.diff-item').forEach(function (el) {
      el.addEventListener('click', function () {
        document.querySelectorAll('.diff-item').forEach(function (e) { e.classList.remove('active'); });
        el.classList.add('active');
        difficulty = el.dataset.d;
      });
    });
    $('btn-start').addEventListener('click', function () { tryStartBgm(); startGame(); });
  // ---------- Rules video (Bilibili embed; iframe markup kept as-is) ----------
  let bgmPausedForVideo = false; // Whether BGM was playing before the video opened (used to restore it on close)
  // Remove the iframe on close to stop playback; rebuild it from the original markup on open
  const rulesVideoHTML = $('rules-video') ? $('rules-video').outerHTML : '';

  function openRulesVideo() {
    const a = $('bgm-audio');
    // The video and BGM share the audio channel: pause BGM when the video opens and restore the prior state on close
    if (bgmOn && a && !a.paused) {
      bgmPausedForVideo = true;
      a.pause();
    }
    $('rules-video').outerHTML = rulesVideoHTML;
    $('rules-overlay').classList.remove('hidden');
  }

  function closeRulesVideo() {
    const iframe = $('rules-video');
    if (iframe) iframe.outerHTML = '<div id="rules-video"></div>'; // Remove the iframe to stop playback
    $('rules-overlay').classList.add('hidden');
    if (bgmPausedForVideo) {
      bgmPausedForVideo = false;
      const a = $('bgm-audio');
      if (bgmOn && a) a.play().catch(function () {});
    }
  }

    $('btn-rules').addEventListener('click', function () {
      if (isMobileOrTablet()) {
        // Phone / tablet: open the Bilibili video page instead (noopener blocks access to the opener)
        window.open(BILI_VIDEO_URL, '_blank', 'noopener');
        return;
      }
      openRulesVideo();
    });
    $('btn-rules-close').addEventListener('click', closeRulesVideo);
    $('btn-bgm').addEventListener('click', function () { toggleBgm(); });
    $('btn-bgm-ingame').addEventListener('click', function () { toggleBgm(); });
    $('btn-lang').addEventListener('click', function () {
      lang = lang === 'zh' ? 'en' : 'zh';
      lsSet('portau_lang', lang);
      applyI18n();
    });

    // Match
    $('btn-back').addEventListener('click', function () { if (animating) return; clearTimers(); showScreen('menu'); });
    $('btn-restart').addEventListener('click', startGame);
    $('btn-home').addEventListener('click', function () { if (animating) return; clearTimers(); showScreen('menu'); });
    $('btn-endturn').addEventListener('click', function () {
      if (animating || state.turn !== 'player' || !canEndTurn) return;
      canEndTurn = false;
      $('actionbar').classList.add('hidden');
      engine.endTurn(state);
      setTurnText();
      aiTurn();
    });
    $('btn-discard').addEventListener('click', function () {
      if (animating || !engine.canDiscardOne(state, 'player')) return;
      $('remedy-overlay').classList.add('hidden');
      discardMode = true;
      renderHands();
    });
    $('btn-redraw').addEventListener('click', function () {
      if (animating) return;
      // Record the old rects, elements and views first (fullRedraw clears the hand)
      const oldViews = state.hands.player.map(toView);
      const oldEls = state.hands.player.map(function (c) { return document.getElementById('hand-' + c.id); });
      const oldRects = state.hands.player.map(function (c) { return rect(document.getElementById('hand-' + c.id)); });
      const r = engine.fullRedraw(state, 'player');
      if (r.error) { toast(tr('toast_deck_low')); return; }
      sound.draw();
      $('remedy-overlay').classList.add('hidden');
      setAnimating(true);
      $('deck-num').textContent = state.deck.length;
      // Clones cover the 4 old cards first, then move down and fade with staggered delays (avoids a flash)
      oldViews.forEach(function (v, i) { if (oldRects[i]) fadeCardDown(v, oldRects[i], i * 70, oldEls[i]); });
      // Render empty placeholders; when the deck has fewer than 4 cards, render only the actual count to avoid blank slots
      let ph = '';
      for (let i = 0; i < state.hands.player.length; i++) ph += '<div class="pcard gone" id="rhand-' + i + '"></div>';
      $('player-hand').innerHTML = ph;
      // Deal the new cards one by one after the fades finish
      t(function () { dealRedrawnHand(); }, 450 + 3 * 70);
    });
    $('btn-skip').addEventListener('click', function () {
      if (animating) return;
      $('remedy-overlay').classList.add('hidden');
      engine.skipTurn(state);
      renderAll();
      if (state.phase === 'over') { finish(); return; }
      setTurnText();
      if (state.turn === 'ai') aiTurn();
      else checkPlayerMoves();
    });

    // Hand / slots (event delegation)
    $('player-hand').addEventListener('click', function (e) {
      const el = e.target.closest('.pcard');
      if (el && el.dataset.id) onHandTap(el.dataset.id);
    });
    $('board-inner').addEventListener('click', function (e) {
      const slot = e.target.closest('.slot');
      if (slot && slot.dataset.idx !== undefined) onSlotTap(parseInt(slot.dataset.idx, 10));
    });

    // Opening draw (delegation)
    $('pool-row').addEventListener('click', function (e) {
      const el = e.target.closest('.pool-card');
      if (el && el.dataset.idx !== undefined) onDrawTap(parseInt(el.dataset.idx, 10));
    });

    // BGM: try autoplay right after load; if browser policy blocks it, start on the first user interaction
    tryStartBgm();
    ['click', 'keydown', 'touchstart'].forEach(function (type) {
      const fallback = function () {
        tryStartBgm();
        ['click', 'keydown', 'touchstart'].forEach(function (t2) {
          document.removeEventListener(t2, fallback);
          window.removeEventListener(t2, fallback);
        });
      };
      document.addEventListener(type, fallback);
      window.addEventListener(type, fallback);
    });
  }

  bind();
  applyI18n();

  // Debug/test hook (does not affect normal play)
  window.__portau = {
    getState: function () { return state; },
    getFlags: function () {
      return { animating: animating, selectedId: selectedId, legalFlags: legalFlags, captureFlags: captureFlags, discardMode: discardMode, canEndTurn: canEndTurn };
    }
  };
})();
