/* Portau 波陶 —— 核心规则
 * UMD 封装：浏览器挂载 window.PortauCore，Node 下 module.exports（可直接跑自测脚本）
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PortauCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- game ----------
  const SUITS = [
    { key: 'spade', symbol: '♠', red: false },
    { key: 'heart', symbol: '♥', red: true },
    { key: 'club', symbol: '♣', red: false },
    { key: 'diamond', symbol: '♦', red: true }
  ];
  const RANK_LABELS = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

  function rankLabel(rank) { return RANK_LABELS[rank] || String(rank); }

  let cardSeq = 0;

  function makeCard(rank, suit) {
    cardSeq += 1;
    return { id: 'c' + cardSeq, kind: 'normal', rank: rank, suit: suit.key, label: rankLabel(rank), symbol: suit.symbol, red: !!suit.red };
  }

  function makeJoker() {
    cardSeq += 1;
    return { id: 'j' + cardSeq, kind: 'joker', rank: 0, suit: null, label: 'τ', symbol: '★', red: true };
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function createDeck() {
    const deck = [];
    for (const s of SUITS) for (let r = 1; r <= 13; r++) deck.push(makeCard(r, s));
    for (let i = 0; i < 4; i++) deck.push(makeJoker());
    return shuffle(deck);
  }

  function createOpeningPool() {
    const s = SUITS[Math.floor(Math.random() * SUITS.length)];
    const cards = [];
    for (let r = 1; r <= 13; r++) {
      cards.push({ id: 'o' + r, kind: 'normal', rank: r, suit: s.key, label: rankLabel(r), symbol: s.symbol, red: !!s.red });
    }
    return { suit: s.key, cards: shuffle(cards) };
  }

  // ---------- rules ----------
  const SLOT_COUNT = 13;

  function nearestFilled(slots, i) {
    let L = null, R = null;
    for (let k = i - 1; k >= 0; k--) { if (slots[k]) { L = k; break; } }
    for (let k = i + 1; k < SLOT_COUNT; k++) { if (slots[k]) { R = k; break; } }
    return { L: L, R: R };
  }

  function scorePlacement(slots, i) {
    const n = nearestFilled(slots, i);
    if (n.L === null || n.R === null) return 2;
    return (i - n.L) === (n.R - i) ? 7 : 4;
  }

  function legalMoves(hand, slots) {
    const moves = [];
    for (const card of hand) {
      if (card.kind === 'joker') {
        for (let i = 0; i < SLOT_COUNT; i++) {
          if (!slots[i]) moves.push({ type: 'play', card: card, slot: i });
        }
      } else {
        const i = card.rank - 1;
        if (!slots[i]) moves.push({ type: 'play', card: card, slot: i });
        else if (slots[i].kind === 'joker') moves.push({ type: 'capture', card: card, slot: i });
      }
    }
    return moves;
  }

  function isBoardFull(slots) {
    for (let i = 0; i < SLOT_COUNT; i++) if (!slots[i]) return false;
    return true;
  }

  // ---------- engine ----------
  // 建局：仅洗牌，手牌与牌槽全空（初始牌/手牌由调用方按节奏抽取）
  function createState(difficulty) {
    const deck = createDeck();
    return {
      slots: new Array(SLOT_COUNT).fill(null),
      deck: deck,
      hands: { player: [], ai: [] },
      scores: { player: 0, ai: 0 },
      turn: 'player',
      discardedThisTurn: false,
      skips: 0,
      phase: 'playing',
      difficulty: difficulty || 'normal',
      firstPlayer: null,
      result: null
    };
  }

  // 从牌堆抽 1 张普通牌放到对应牌槽（开局初始牌）
  function drawInitialCard(state) {
    const normalIdx = [];
    for (let i = 0; i < state.deck.length; i++) {
      if (state.deck[i].kind === 'normal') normalIdx.push(i);
    }
    const pick = normalIdx[Math.floor(Math.random() * normalIdx.length)];
    const init = state.deck.splice(pick, 1)[0];
    state.slots[init.rank - 1] = init;
    return init;
  }

  // 发牌：双方各 4 张（明牌）
  function dealHands(state) {
    for (let i = 0; i < 4; i++) {
      state.hands.player.push(state.deck.pop());
      state.hands.ai.push(state.deck.pop());
    }
  }

  function newGame(difficulty) {
    const state = createState(difficulty);
    drawInitialCard(state);
    dealHands(state);
    return state;
  }

  function setFirstPlayer(state, who) { state.firstPlayer = who; state.turn = who; }

  function playMove(state, who, move, deferDraw) {
    const hand = state.hands[who];
    const idx = hand.findIndex(function (c) { return c.id === move.card.id; });
    if (idx < 0) return { error: 'CARD_NOT_IN_HAND' };
    const card = hand[idx];
    let gain = 0;
    let captured = null;

    if (move.type === 'capture') {
      const target = state.slots[move.slot];
      if (!(target && target.kind === 'joker' && card.kind === 'normal' && card.rank === move.slot + 1)) {
        return { error: 'ILLEGAL_MOVE' };
      }
      captured = target;
      state.slots[move.slot] = card;
      hand.splice(idx, 1);
      if (!deferDraw) hand.push(captured);
    } else if (move.type === 'play') {
      if (state.slots[move.slot]) return { error: 'ILLEGAL_MOVE' };
      if (card.kind === 'joker') {
        state.slots[move.slot] = card;
        hand.splice(idx, 1);
        gain = scorePlacement(state.slots, move.slot);
      } else {
        if (move.slot !== card.rank - 1) return { error: 'ILLEGAL_MOVE' };
        state.slots[move.slot] = card;
        hand.splice(idx, 1);
        gain = scorePlacement(state.slots, move.slot);
      }
    } else {
      return { error: 'ILLEGAL_MOVE' };
    }

    state.scores[who] += gain;
    if (!deferDraw && !captured && state.deck.length > 0) hand.push(state.deck.pop());
    state.skips = 0;
    if (isBoardFull(state.slots)) {
      state.phase = 'over';
      state.result = getResult(state);
    }
    return { gain: gain, captured: !!captured, capturedCard: captured || null, handIndex: idx };
  }

  function drawCard(state) {
    if (state.deck.length === 0) return null;
    return state.deck.pop();
  }

  function insertCard(state, who, index, card) {
    if (!card) return;
    const hand = state.hands[who];
    hand.splice(Math.max(0, Math.min(index, hand.length)), 0, card);
  }

  function canDiscardOne(state, who) {
    return !state.discardedThisTurn && state.scores[who] >= 2 && state.deck.length > 0;
  }

  function discardOne(state, who, cardId) {
    if (!canDiscardOne(state, who)) return { error: 'CANNOT_DISCARD' };
    const hand = state.hands[who];
    const idx = hand.findIndex(function (c) { return c.id === cardId; });
    if (idx < 0) return { error: 'CARD_NOT_IN_HAND' };
    hand.splice(idx, 1);
    state.scores[who] -= 2;
    const nc = state.deck.pop();
    hand.push(nc);
    state.discardedThisTurn = true;
    return { newCard: nc };
  }

  function canFullRedraw(state) { return state.deck.length > 0; }

  function fullRedraw(state, who) {
    if (!canFullRedraw(state)) return { error: 'DECK_EMPTY' };
    state.hands[who] = [];
    const n = Math.min(4, state.deck.length);
    for (let i = 0; i < n; i++) state.hands[who].push(state.deck.pop());
    state.discardedThisTurn = true;
    return { ok: true };
  }

  function endTurn(state) {
    state.discardedThisTurn = false;
    state.turn = state.turn === 'player' ? 'ai' : 'player';
  }

  function skipTurn(state) {
    state.skips += 1;
    if (state.skips >= 2) { state.phase = 'over'; state.result = getResult(state); return; }
    endTurn(state);
  }

  function getResult(state) {
    const p = state.scores.player, a = state.scores.ai;
    return { player: p, ai: a, outcome: p > a ? 'player_win' : (a > p ? 'ai_win' : 'draw') };
  }

  // ---------- ai ----------
  const HARD_CFG = { captureBonus: 6, feedPenalty: 0.5, synergyWeight: 1 };

  function evaluateMove(state, who, move, cfg) {
    if (move.type === 'capture') return cfg.captureBonus;
    const gain = scorePlacement(state.slots, move.slot);
    let v = gain;
    if (cfg.feedPenalty) {
      const slotsCopy = state.slots.slice();
      slotsCopy[move.slot] = move.card;
      const ms = legalMoves(state.hands.player, slotsCopy);
      let playerBest = 0;
      for (const m of ms) {
        const g = m.type === 'capture' ? 0 : scorePlacement(slotsCopy, m.slot);
        if (g > playerBest) playerBest = g;
      }
      v -= cfg.feedPenalty * playerBest;
      let syn = 0;
      for (const c of state.hands[who]) {
        if (c.kind === 'normal' && c.id !== move.card.id && !slotsCopy[c.rank - 1]) {
          if (scorePlacement(slotsCopy, c.rank - 1) === 7) syn += 1;
        }
      }
      v += cfg.synergyWeight * syn;
    }
    return v;
  }

  function chooseMove(state, who) {
    const moves = legalMoves(state.hands[who], state.slots);
    if (moves.length === 0) return null;
    const d = state.difficulty;
    if (d === 'easy') return moves[Math.floor(Math.random() * moves.length)];
    if (d === 'normal') {
      let best = null, bv = -Infinity;
      for (const m of moves) {
        const g = m.type === 'capture' ? 0 : scorePlacement(state.slots, m.slot);
        if (g > bv) { bv = g; best = m; }
      }
      return best;
    }
    let best = null, bv = -Infinity;
    for (const m of moves) {
      const v = evaluateMove(state, who, m, HARD_CFG);
      if (v > bv) { bv = v; best = m; }
    }
    return best;
  }

  function chooseRemedy(state, who) {
    if (canDiscardOne(state, who)) {
      const hand = state.hands[who];
      let worst = hand[0], wv = Infinity;
      for (const c of hand) {
        const dist = Math.abs(c.rank - 1 - 6);
        const val = -dist;
        if (val < wv) { wv = val; worst = c; }
      }
      return { type: 'discard', card: worst };
    }
    if (canFullRedraw(state)) return { type: 'redraw' };
    return { type: 'skip' };
  }

  function playDrawnIfPossible(state, who, newCard) {
    const moves = legalMoves(state.hands[who], state.slots);
    for (const m of moves) {
      if (m.card.id === newCard.id) {
        if (state.difficulty === 'easy' && Math.random() < 0.3) return null;
        return m;
      }
    }
    return null;
  }

  return {
    game: { SUITS: SUITS, rankLabel: rankLabel, makeCard: makeCard, makeJoker: makeJoker, shuffle: shuffle, createDeck: createDeck, createOpeningPool: createOpeningPool },
    rules: { SLOT_COUNT: SLOT_COUNT, nearestFilled: nearestFilled, scorePlacement: scorePlacement, legalMoves: legalMoves, isBoardFull: isBoardFull },
    engine: { newGame: newGame, createState: createState, drawInitialCard: drawInitialCard, dealHands: dealHands, setFirstPlayer: setFirstPlayer, playMove: playMove, drawCard: drawCard, insertCard: insertCard, canDiscardOne: canDiscardOne, discardOne: discardOne, canFullRedraw: canFullRedraw, fullRedraw: fullRedraw, endTurn: endTurn, skipTurn: skipTurn, getResult: getResult },
    ai: { HARD_CFG: HARD_CFG, chooseMove: chooseMove, chooseRemedy: chooseRemedy, playDrawnIfPossible: playDrawnIfPossible }
  };
});
