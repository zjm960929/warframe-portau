/* Portau 波陶 —— 对局控制器（界面渲染、动画与交互流程） */
(function () {
  'use strict';
  const Core = window.PortauCore;
  const engine = Core.engine, rules = Core.rules, gameUtil = Core.game, ai = Core.ai;

  // ---------- 工具 ----------
  const $ = function (id) { return document.getElementById(id); };
  const timers = new Set();
  function t(fn, ms) {
    const id = setTimeout(function () { timers.delete(id); fn(); }, ms);
    timers.add(id);
    return id;
  }
  function clearTimers() { timers.forEach(function (id) { clearTimeout(id); }); timers.clear(); }

  function rect(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r || r.width === 0) return null;
    return r;
  }

  // ---------- 音效（WebAudio 合成） ----------
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

  // ---------- 背景音乐 ----------
  let bgmOn = localStorage.getItem('portau_bgm') !== 'off';
  let bgmStarted = false;

  function startBgm() {
    if (!bgmOn || bgmStarted) return;
    const a = $('bgm-audio');
    if (!a) return;
    a.volume = 0.3;
    a.play().then(function () { bgmStarted = true; }).catch(function () { bgmStarted = false; });
  }

  function toggleBgm() {
    bgmOn = !bgmOn;
    localStorage.setItem('portau_bgm', bgmOn ? 'on' : 'off');
    const a = $('bgm-audio');
    if (bgmOn) { startBgm(); if (a) a.play().catch(function () {}); }
    else if (a) a.pause();
    $('btn-bgm').textContent = '背景音乐：' + (bgmOn ? '开' : '关');
  }

  // ---------- 视图 ----------
  function toView(c) {
    if (!c) return null;
    return { id: c.id, kind: c.kind, rank: c.rank, label: c.label, symbol: c.symbol, red: !!c.red };
  }

  function cardHtml(view, cls) {
    const clsAll = 'pcard ' + (cls || '') + ' ' + (view.red ? 'red' : 'black') + (view.kind === 'joker' ? ' joker' : '');
    return '<div class="' + clsAll + '">' +
      '<span class="rank">' + view.label + '</span>' +
      '<span class="suit">' + view.symbol + '</span>' +
      '</div>';
  }

  function backHtml(cls) { return '<div class="pcard back ' + (cls || '') + '"></div>'; }

  // ---------- 全局状态 ----------
  let state = null;
  let difficulty = 'normal';
  let selectedId = null;
  let legalFlags = [];
  let captureFlags = [];
  let animating = false;
  let discardMode = false;
  let canEndTurn = false;
  let screen = 'menu';

  // ---------- 渲染 ----------
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

  function handHtml(hand, who, gapIndex, small) {
    let html = '';
    for (let i = 0; i < hand.length; i++) {
      const v = hand[i];
      if (i === gapIndex) {
        const gapId = who === 'player' ? 'hand-gap' : 'aihand-gap';
        html += '<div class="pcard sm gone" id="' + gapId + '"></div>';
        continue;
      }
      let cls = (small ? 'sm ' : '');
      if (who === 'player') {
        if (selectedId === v.id) cls += 'selected ';
        // 计算可出状态（决定变暗）：普通牌=槽空或可抢鬼牌；鬼牌=存在空槽
        if (v.kind === 'joker') v.playable = state.slots.some(function (s) { return !s; });
        else {
          const occ = state.slots[v.rank - 1];
          v.playable = !occ || occ.kind === 'joker';
        }
        if (discardMode) cls += 'discard ';
        else if (animating || state.turn !== 'player') cls += 'turn-dim '; // 无法操作（动画中/对方回合）→ 全暗
        else if (!v.playable) cls += 'dim ';
      }
      const idAttr = who === 'player' ? 'hand-' + v.id : 'aihand-' + v.id;
      html += cardHtml(v, cls).replace('<div class="pcard ', '<div id="' + idAttr + '" data-id="' + v.id + '" class="pcard ');
    }
    return html;
  }

  function renderHands(gapIndex) {
    $('player-hand').innerHTML = handHtml(state.hands.player, 'player', gapIndex, false);
    $('ai-hand').innerHTML = handHtml(state.hands.ai, 'ai', -1, true);
  }

  function renderAll() {
    renderBoard();
    renderHands(-1);
    $('deck-num').textContent = state.deck.length;
  }

  function setTurnText() {
    const el = $('turn-text');
    el.textContent = state.turn === 'player' ? '你的回合' : '魂主思考中…';
    el.className = state.turn === 'player' ? 'turn-me' : 'turn-ai';
    // 回合切换时重渲染我方手牌的明暗状态（静态 HTML 需手动刷新）
    renderHands(-1);
  }

  function showGain(slotIdx, text, cls) {
    const el = document.querySelector('[data-float="' + slotIdx + '"]');
    if (!el) return;
    el.textContent = text;
    el.className = 'float-gain ' + (cls || 'normal');
    // 重触发动画
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

  // ---------- 飞行克隆卡 ----------
  const FLY_DUR = { slow: 490, draw: 430, deal: 360 };

  function spawnFly(view, isBack, from, to, durCls, cb) {
    const layer = $('fly-layer');
    const div = document.createElement('div');
    let cls = 'pcard fly-card ' + (durCls || 'draw');
    if (isBack) cls += ' back';
    else cls += (view.red ? ' red' : ' black') + (view.kind === 'joker' ? ' joker' : '');
    div.className = cls;
    div.innerHTML = isBack ? '' : '<span class="rank">' + view.label + '</span><span class="suit">' + view.symbol + '</span>';
    div.style.left = (from.left + from.width / 2) + 'px';
    div.style.top = (from.top + from.height / 2) + 'px';
    div.style.width = from.width + 'px';
    div.style.height = from.height + 'px';
    div.style.transform = 'translate(-50%,-50%)';
    layer.appendChild(div);
    t(function () {
      div.style.left = (to.left + to.width / 2) + 'px';
      div.style.top = (to.top + to.height / 2) + 'px';
      div.style.width = to.width + 'px';
      div.style.height = to.height + 'px';
    }, 30);
    t(function () {
      layer.removeChild(div);
      cb();
    }, FLY_DUR[durCls] || 430);
  }

  // ---------- 屏幕切换 ----------
  function showScreen(name) {
    screen = name;
    $('screen-menu').classList.toggle('hidden', name !== 'menu');
    $('screen-game').classList.toggle('hidden', name !== 'game');
  }

  // ---------- 对局 ----------
  function startGame() {
    clearTimers();
    animating = false;
    selectedId = null;
    legalFlags = [];
    captureFlags = [];
    discardMode = false;
    canEndTurn = false;
    // 建局但不发牌：先决定先手，再播发牌动画
    state = engine.createState(difficulty);
    $('ai-name').textContent = '魂主（' + (difficulty === 'easy' ? '简单' : difficulty === 'hard' ? '困难' : '普通') + '）';
    $('hint').textContent = '';
    $('actionbar').classList.add('hidden');
    $('remedy-overlay').classList.add('hidden');
    $('result-overlay').classList.add('hidden');
    showScreen('game');
    renderBoard();
    renderHands(-1);
    $('deck-num').textContent = state.deck.length;
    setTurnText();
    startOpening();
  }

  // ---------- 开局抽牌 ----------
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
    poolSlots[idx].drawn = true; // 标记已抽，但牌背保留到克隆卡出现
    sound.play('draw');
    $('draw-stage').classList.add('shifted');
    $('draw-result').classList.add('show');

    t(function () {
      const backEl = document.querySelector('#pool-' + idx + ' .pcard');
      const from = rect(backEl);
      const to = rect($('frame-player'));
      if (backEl) backEl.style.visibility = 'hidden'; // 克隆卡即将盖住它
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
    $('draw-msg').textContent = '对方正在抽牌…';
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
    $('draw-msg').textContent = first === 'player' ? '你的牌更大，你先手' : '魂主的牌更大，魂主先手';
    $('draw-msg').className = 'draw-msg';
    t(function () { beginPlay(first); }, 1400);
  }

  function finishOpening(aiCard, playerCard) {
    if (!aiCard || !playerCard) { beginPlay('player'); return; }
    const first = playerCard.rank > aiCard.rank ? 'player' : 'ai';
    $('draw-msg').textContent = first === 'player' ? '你的牌更大，你先手' : '魂主的牌更大，魂主先手';
    t(function () { beginPlay(first); }, 1400);
  }

  function beginPlay(first) {
    engine.setFirstPlayer(state, first);
    $('opening-overlay').classList.add('hidden');
    renderBoard(); // 空桌面（13 个槽位与文字标签可见）
    renderDealingHands({ player: 0, ai: 0 });
    $('hint').textContent = '';
    animating = true;
    // 顺序：初始牌上桌 → 双方发牌
    const init = engine.drawInitialCard(state);
    $('deck-num').textContent = state.deck.length;
    const slotEl = document.getElementById('board-inner').children[init.rank - 1] ?
      document.getElementById('board-inner').children[init.rank - 1].querySelector('.slot') : null;
    const from = rect($('deck-box'));
    const to = rect(slotEl);
    if (!from || !to) {
      renderBoard();
      afterInitialCard(first);
      return;
    }
    const startRect = { left: from.left, top: from.top, width: Math.min(44, from.width), height: Math.min(58, from.height) };
    spawnFly(toView(init), false, startRect, { left: to.left, top: to.top, width: to.width * 0.92, height: to.height * 0.94 }, 'deal', function () {
      renderBoard(); // 初始牌落桌（盖住文字标签）
      afterInitialCard(first);
    });
  }

  function afterInitialCard(first) {
    renderDealingHands({ player: 0, ai: 0 });
    $('deck-num').textContent = state.deck.length;
    dealSequence(first);
  }

  // 发牌期间的渲染：每方 4 个占位，前 n 张已发亮出牌面
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

  function dealSequence(first) {
    const order = [];
    const other = first === 'player' ? 'ai' : 'player';
    for (let i = 0; i < 4; i++) { order.push(first, other); } // 先手先拿牌，交替发
    const revealed = { player: 0, ai: 0 };
    let i = 0;
    function step() {
      if (i >= order.length) {
        animating = false; // 先解锁再渲染，避免手牌按「无法操作」变暗
        renderAll();
        setTurnText();
        if (state.turn === 'ai') aiTurn();
        else checkPlayerMoves();
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
      const startRect = { left: from.left, top: from.top, width: Math.min(44, from.width), height: Math.min(58, from.height) };
      spawnFly(toView(card), false, startRect, to, 'deal', function () {
        revealed[who] += 1;
        renderDealingHands(revealed);
        i += 1;
        step();
      });
    }
    step();
  }

  // ---------- 玩家操作 ----------
  function onHandTap(id) {
    if (screen !== 'game' || state.phase !== 'playing') return;
    if (state.turn !== 'player' || animating) return;

    if (discardMode) { doDiscard(id); return; }

    const card = state.hands.player.find(function (c) { return c.id === id; });
    if (!card) return;

    // 再次点击已选中的普通牌：直接出牌（鬼牌必须手动选槽）
    if (selectedId === id) {
      if (card.kind === 'normal') {
        const occupied = state.slots[card.rank - 1];
        const isCap = !!(occupied && occupied.kind === 'joker');
        execPlay('player', { type: isCap ? 'capture' : 'play', card: card, slot: card.rank - 1 });
      }
      return;
    }

    // 计算合法槽位
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
      toast('这张牌当前不能出');
      return;
    }
    selectedId = id;
    legalFlags = flags;
    captureFlags = capFlags;
    renderBoard();
    renderHands(-1);
  }

  function onSlotTap(idx) {
    if (screen !== 'game' || state.phase !== 'playing') return;
    if (state.turn !== 'player' || animating) return;
    if (!selectedId || !legalFlags[idx]) {
      if (selectedId) toast('只能放到高亮槽位');
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

  // ---------- 出牌 + 延迟摸牌 ----------
  function execPlay(who, move) {
    if (animating) return;
    animating = true;
    const r = engine.playMove(state, who, move, true);
    if (r.error) {
      animating = false;
      toast('无效操作');
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

    // 手牌原位留空占位（其余牌不动）
    renderHandsWithGap(who, r.handIndex);
    $('deck-num').textContent = state.deck.length;

    const fw = who === 'player' ? Math.min(64, from.width) : Math.min(46, from.width);
    const fh = who === 'player' ? Math.min(88, from.height) : Math.min(64, from.height);
    const startRect = { left: from.left, top: from.top, width: fw, height: fh };
    const endRect = { left: to.left, top: to.top, width: to.width * 0.92, height: to.height * 0.94 };
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
        return handHtml([v], 'player', -1, false);
      }).join('');
    } else {
      const hand = state.hands.ai.map(toView);
      hand.splice(index, 0, { gone: true });
      $('ai-hand').innerHTML = hand.map(function (v) {
        if (v.gone) return '<div class="pcard sm gone" id="aihand-gap"></div>';
        return handHtml([v], 'ai', -1, true);
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
      showGain(slotIdx, '抢夺！+0', 'cap');
      showBanner((who === 'player' ? '你' : '魂主') + '抢走了鬼牌（不摸牌）');
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
    // 抢夺：鬼牌从牌桌飞回手牌空位
    if (r.capturedCard) {
      const capGap = document.getElementById(who === 'player' ? 'hand-gap' : 'aihand-gap');
      const slotEl = document.getElementById('board-inner').children[slotIdx] ?
        document.getElementById('board-inner').children[slotIdx].querySelector('.slot') : null;
      const from = rect(slotEl);
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
      });
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
    const startRect = { left: from.left, top: from.top, width: Math.min(44, from.width), height: Math.min(58, from.height) };
    spawnFly(null, true, startRect, to, 'draw', function () {
      engine.insertCard(state, who, r.handIndex, newCard);
      renderAll();
      continueAfterDraw(who);
    });
  }

  function continueAfterDraw(who) {
    animating = false;
    engine.endTurn(state);
    setTurnText();
    if (state.turn === 'ai') aiTurn();
    else checkPlayerMoves();
  }

  function afterPlay(who, r, slotIdx) {
    // 降级路径：无动画
    if (!r.captured && state.phase !== 'over') {
      const nc = engine.drawCard(state);
      if (nc) engine.insertCard(state, who, r.handIndex, nc);
    }
    if (r.capturedCard) engine.insertCard(state, who, r.handIndex, r.capturedCard);
    renderAll();
    if (r.captured) { sound.capture(); showGain(slotIdx, '抢夺！+0', 'cap'); }
    else { sound.play(); if (r.gain > 0) { sound.score(); showGain(slotIdx, '+' + r.gain, r.gain >= 7 ? 'best' : 'normal'); } }
    if (state.phase === 'over') { finish(); return; }
    animating = false;
    engine.endTurn(state);
    setTurnText();
    if (state.turn === 'ai') aiTurn();
    else checkPlayerMoves();
  }

  // ---------- AI 回合 ----------
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
          showBanner('魂主弃 1 摸 1（-2 分）');
          renderHands(-1);
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
          showBanner('魂主重新摸牌，回合结束');
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

  // ---------- 补救 ----------
  function checkPlayerMoves() {
    if (state.phase !== 'playing' || state.turn !== 'player') return;
    const moves = rules.legalMoves(state.hands.player, state.slots);
    if (moves.length === 0) {
      $('remedy-overlay').classList.remove('hidden');
      const can = engine.canDiscardOne(state, 'player');
      $('btn-discard').classList.toggle('disabled', !can);
    } else {
      $('hint').textContent = '点选手牌后再次点击直接出牌（鬼牌需手动选槽），或点击发光槽位放置';
    }
  }

  function doDiscard(id) {
    const r = engine.discardOne(state, 'player', id);
    if (r.error) { toast('无法弃牌'); return; }
    sound.draw();
    discardMode = false;
    renderAll();
    const playable = rules.legalMoves(state.hands.player, state.slots).some(function (m) { return m.card.id === r.newCard.id; });
    if (playable) {
      canEndTurn = true;
      $('actionbar').classList.remove('hidden');
      $('hint').textContent = '新牌可以打出：点击它并选择槽位，或结束回合';
      showBanner('摸到新牌！可以立即打出');
    } else {
      showBanner('新牌无法打出，回合结束');
      engine.endTurn(state);
      setTurnText();
      aiTurn();
    }
  }

  // ---------- 结算 ----------
  function finish() {
    animating = false;
    const outcome = state.result.outcome;
    $('result-title').textContent = outcome === 'player_win' ? '胜利' : (outcome === 'ai_win' ? '惜败' : '平局');
    $('result-title').className = 'result-title ' + outcome;
    $('result-score').textContent = '你 ' + state.result.player + ' : ' + state.result.ai + ' 魂主';
    $('result-overlay').classList.remove('hidden');
    if (outcome === 'player_win') sound.win();
    else if (outcome === 'ai_win') sound.lose();
  }

  // ---------- 竖屏检测（移动端弹窗提示，横屏自动消除） ----------
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

  // ---------- 事件绑定 ----------
  function bind() {
    // 菜单
    document.querySelectorAll('.diff-item').forEach(function (el) {
      el.addEventListener('click', function () {
        document.querySelectorAll('.diff-item').forEach(function (e) { e.classList.remove('active'); });
        el.classList.add('active');
        difficulty = el.dataset.d;
      });
    });
    $('btn-start').addEventListener('click', function () { startBgm(); startGame(); });
  // ---------- 规则视频（B站嵌入） ----------
  const RULES_VIDEO_SRC = 'https://player.bilibili.com/player.html?isOutside=true&aid=117553221341646&bvid=BV191436sE5f&cid=43300489990&p=1&autoplay=0';

  $('btn-rules').addEventListener('click', function () {
    // 打开时注入视频地址，关闭时置空以停止播放
    $('rules-video').src = RULES_VIDEO_SRC;
    $('rules-overlay').classList.remove('hidden');
  });
  $('btn-rules-close').addEventListener('click', function () {
    $('rules-video').src = 'about:blank';
    $('rules-overlay').classList.add('hidden');
  });
    $('btn-bgm').addEventListener('click', function () { toggleBgm(); });

    // 对局
    $('btn-back').addEventListener('click', function () { clearTimers(); showScreen('menu'); });
    $('btn-restart').addEventListener('click', startGame);
    $('btn-home').addEventListener('click', function () { clearTimers(); showScreen('menu'); });
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
      renderHands(-1);
      $('hint').textContent = '点选一张要弃掉的牌（-2 分）';
    });
    $('btn-redraw').addEventListener('click', function () {
      if (animating) return;
      const r = engine.fullRedraw(state, 'player');
      if (r.error) { toast('牌堆不足'); return; }
      sound.draw();
      $('remedy-overlay').classList.add('hidden');
      renderAll();
      showBanner('重新摸牌，回合结束');
      engine.endTurn(state);
      setTurnText();
      aiTurn();
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

    // 手牌 / 牌槽（事件委托）
    $('player-hand').addEventListener('click', function (e) {
      const el = e.target.closest('.pcard');
      if (el && el.dataset.id) onHandTap(el.dataset.id);
    });
    $('ai-hand').addEventListener('click', function (e) {
      // 对方手牌不可操作
    });
    $('board-inner').addEventListener('click', function (e) {
      const slot = e.target.closest('.slot');
      if (slot && slot.dataset.idx !== undefined) onSlotTap(parseInt(slot.dataset.idx, 10));
    });

    // 开局抽牌（委托）
    $('pool-row').addEventListener('click', function (e) {
      const el = e.target.closest('.pool-card');
      if (el && el.dataset.idx !== undefined) onDrawTap(parseInt(el.dataset.idx, 10));
    });

    // 首次任意交互后启动背景音乐（浏览器自动播放策略）
    document.addEventListener('click', function onFirst() {
      startBgm();
      document.removeEventListener('click', onFirst);
    });
  }

  bind();
  $('btn-bgm').textContent = '背景音乐：' + (bgmOn ? '开' : '关');

  // 调试/测试钩子（不影响正常玩法）
  window.__portau = {
    getState: function () { return state; },
    getFlags: function () {
      return { animating: animating, selectedId: selectedId, legalFlags: legalFlags, captureFlags: captureFlags, discardMode: discardMode, canEndTurn: canEndTurn };
    }
  };
})();
