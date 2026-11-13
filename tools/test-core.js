// tools/test-core.js - self-test for web core logic (run with Node)
// Usage: node tools/test-core.js
const Core = require('../js/core.js');
const engine = Core.engine, rules = Core.rules, gameUtil = Core.game, ai = Core.ai;

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log('PASS ' + name); }
  catch (e) { failed += 1; console.log('FAIL ' + name + ' :: ' + e.message); }
}

test('scoring 2/4/7', function () {
  const s = new Array(13).fill(null);
  s[12] = gameUtil.makeCard(13, gameUtil.SUITS[0]);
  if (rules.scorePlacement(s, 0) !== 2) throw new Error('edge');
  s[4] = gameUtil.makeCard(5, gameUtil.SUITS[0]);
  s[7] = gameUtil.makeCard(8, gameUtil.SUITS[1]);
  if (rules.scorePlacement(s, 5) !== 4) throw new Error('asym');
  s[8] = gameUtil.makeCard(9, gameUtil.SUITS[0]);
  s[12] = gameUtil.makeCard(13, gameUtil.SUITS[1]);
  if (rules.scorePlacement(s, 10) !== 7) throw new Error('sym');
});

test('new game initial state', function () {
  for (let i = 0; i < 100; i++) {
    const st = engine.newGame('normal');
    if (st.hands.player.length !== 4 || st.hands.ai.length !== 4) throw new Error('hand');
    if (st.deck.length !== 47) throw new Error('deck ' + st.deck.length);
    const filled = st.slots.filter(function (s) { return !!s; });
    if (filled.length !== 1 || filled[0].kind !== 'normal') throw new Error('init card');
  }
});

test('two cards on board after first move', function () {
  for (let i = 0; i < 50; i++) {
    const st = engine.newGame('normal');
    let card = st.hands.player.find(function (c) { return c.kind === 'normal' && !st.slots[c.rank - 1]; });
    let slot;
    if (card) slot = card.rank - 1;
    else { card = st.hands.player.find(function (c) { return c.kind === 'joker'; }); slot = st.slots.findIndex(function (s) { return !s; }); }
    const r = engine.playMove(st, 'player', { type: 'play', card: card, slot: slot });
    if (r.error) throw new Error(r.error);
    if (st.slots.filter(function (s) { return !!s; }).length !== 2) throw new Error('filled');
  }
});

test('capture conservation (deferDraw mode)', function () {
  const st = engine.newGame('normal');
  const j = gameUtil.makeJoker();
  st.slots[1] = j;
  const two = gameUtil.makeCard(2, gameUtil.SUITS[2]);
  st.hands.player = [two, gameUtil.makeCard(5, gameUtil.SUITS[0]), gameUtil.makeCard(9, gameUtil.SUITS[1]), gameUtil.makeCard(13, gameUtil.SUITS[3])];
  const r = engine.playMove(st, 'player', { type: 'capture', card: two, slot: 1 }, true);
  if (r.error) throw new Error(r.error);
  if (r.gain !== 0 || !r.captured || !r.capturedCard || r.handIndex !== 0) throw new Error('result');
  if (st.hands.player.length !== 3) throw new Error('deferred hand');
  engine.insertCard(st, 'player', r.handIndex, r.capturedCard);
  if (st.hands.player.length !== 4 || !st.hands.player.some(function (c) { return c.id === j.id; })) throw new Error('insert');
});

test('AI 600 games legal (three difficulties)', function () {
  for (const d of ['easy', 'normal', 'hard']) {
    for (let g = 0; g < 200; g++) {
      const st = engine.newGame(d);
      engine.setFirstPlayer(st, Math.random() < 0.5 ? 'player' : 'ai');
      let guard = 0;
      while (st.phase === 'playing' && guard < 500) {
        guard += 1;
        const who = st.turn;
        const moves = rules.legalMoves(st.hands[who], st.slots);
        if (moves.length > 0) {
          const m = ai.chooseMove(st, who);
          const r = engine.playMove(st, who, m);
          if (r.error) throw new Error('illegal');
          engine.endTurn(st);
        } else {
          const remedy = ai.chooseRemedy(st, who);
          if (remedy.type === 'discard') {
            const rd = engine.discardOne(st, who, remedy.card.id);
            if (rd.error) { engine.skipTurn(st); continue; }
            const m2 = ai.playDrawnIfPossible(st, who, rd.newCard);
            if (m2) { const r2 = engine.playMove(st, who, m2); if (r2.error) throw new Error('illegal2'); }
            engine.endTurn(st);
          } else if (remedy.type === 'redraw') {
            const rr = engine.fullRedraw(st, who);
            if (rr.error) { engine.skipTurn(st); continue; }
            engine.endTurn(st);
          } else engine.skipTurn(st);
        }
      }
      if (st.phase !== 'over') throw new Error('not terminated');
    }
  }
});

test('opening pool 13 distinct ranks of one suit', function () {
  for (let i = 0; i < 30; i++) {
    const pool = gameUtil.createOpeningPool();
    if (pool.cards.length !== 13) throw new Error('len');
    if (new Set(pool.cards.map(function (c) { return c.suit; })).size !== 1) throw new Error('suit');
    if (new Set(pool.cards.map(function (c) { return c.rank; })).size !== 13) throw new Error('rank');
  }
});

test('createState deals nothing / dealHands gives 4 each', function () {
  for (let i = 0; i < 30; i++) {
    const st = engine.createState('normal');
    if (st.hands.player.length !== 0 || st.hands.ai.length !== 0) throw new Error('createState dealt');
    if (st.deck.length !== 56) throw new Error('deck ' + st.deck.length);
    if (st.slots.filter(function (s) { return !!s; }).length !== 0) throw new Error('slots not empty');
    engine.drawInitialCard(st);
    if (st.deck.length !== 55) throw new Error('deck after init');
    const filled = st.slots.filter(function (s) { return !!s; });
    if (filled.length !== 1 || filled[0].kind !== 'normal') throw new Error('init card');
    engine.dealHands(st);
    if (st.hands.player.length !== 4 || st.hands.ai.length !== 4) throw new Error('deal');
    if (st.deck.length !== 47) throw new Error('deck after deal');
  }
});

console.log('----------------------------------------');
console.log('TOTAL: ' + (passed + failed) + '  PASS: ' + passed + '  FAIL: ' + failed);
process.exit(failed > 0 ? 1 : 0);
