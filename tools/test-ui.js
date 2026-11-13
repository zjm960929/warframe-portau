// tools/test-ui.js - headless DOM end-to-end smoke test for the web build (runs in Node, no browser)
// Simulates a minimal DOM and drives a full match: opening draw -> initial card -> deal -> auto-play to the end -> result -> play again
'use strict';

// ---------- Minimal DOM shim ----------
const registry = {};       // id -> El
const floats = {};         // data-float -> El
let bodyEl = null;

class El {
  constructor(id, classes) {
    this.id = id || '';
    this._classes = new Set(classes || []);
    this._handlers = {};
    this.children = [];
    this.dataset = {};
    this.style = {};
    this._html = '';
    this._rect = { left: 120, top: 120, width: 64, height: 88 };
    if (this.id) registry[this.id] = this;
  }
  get classList() {
    const self = this;
    return {
      add: function () { for (const c of arguments) self._classes.add(c); },
      remove: function () { for (const c of arguments) self._classes.delete(c); },
      toggle: function (c, force) {
        if (force === undefined) { self._classes.has(c) ? self._classes.delete(c) : self._classes.add(c); }
        else { force ? self._classes.add(c) : self._classes.delete(c); }
      },
      contains: function (c) { return self._classes.has(c); }
    };
  }
  hasClass(c) { return this._classes.has(c); }
  get innerHTML() { return this._html; }
  set innerHTML(v) {
    this._html = String(v);
    this.children = [];
    // Generic parse: register every div with an id and build its dataset
    const tagRe = /<div\b([^>]*)>/g;
    let m;
    while ((m = tagRe.exec(this._html))) {
      const attrs = m[1];
      const idM = attrs.match(/id="([^"]+)"/);
      const clsM = attrs.match(/class="([^"]*)"/);
      const el = new El(idM ? idM[1] : '', clsM ? clsM[1].trim().split(/\s+/).filter(Boolean) : []);
      const dm = attrs.match(/data-id="([^"]+)"/); if (dm) el.dataset.id = dm[1];
      const di = attrs.match(/data-idx="([^"]+)"/); if (di) el.dataset.idx = di[1];
      if (this.id === 'board-inner') {
        // board-inner's direct children are 13 slot-wraps (indexed via children[i])
        if (el.hasClass('slot-wrap')) this.children.push(el);
        if (el.hasClass('slot')) {
          const wrap = this.children[this.children.length - 1];
          if (wrap) { wrap._slot = el; wrap.children.push(el); }
        }
      }
      if (this.id === 'pool-row' && el.hasClass('pool-slot')) {
        this.children.push(el);
        el._pcard = null;
      }
      if (this.id === 'pool-row' && el.hasClass('pool-card')) {
        const wrap = this.children[this.children.length - 1];
        if (wrap) { wrap._pcard = el; wrap.children.push(el); }
      }
    }
  }
  getBoundingClientRect() { return this._rect; }
  addEventListener(type, fn) { (this._handlers[type] = this._handlers[type] || []).push(fn); }
  dispatch(type, evt) { (this._handlers[type] || []).forEach(function (fn) { fn(evt || { target: null }); }); }
  matchesSel(sel) {
    if (sel.charAt(0) === '.') return this.hasClass(sel.slice(1));
    if (sel.charAt(0) === '#') return this.id === sel.slice(1);
    return false;
  }
  closest(sel) { return this.matchesSel(sel) ? this : null; }
  querySelector(sel) {
    if (sel === '.slot') return this._slot || null;
    if (sel === '.pcard') return this._pcard || null;
    return null;
  }
  appendChild(c) { this.children.push(c); return c; }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); }
  play() { return Promise.resolve(); }
  pause() {}
}

const documentShim = {
  _floats: floats,
  getElementById: function (id) {
    if (registry[id]) return registry[id];
    return new El(id);
  },
  createElement: function (tag) { return new El(''); },
  querySelector: function (sel) {
    let m = sel.match(/^#([\w-]+) \.([\w-]+)$/);
    if (m) {
      const parent = registry[m[1]];
      if (!parent) return null;
      return parent.querySelector('.' + m[2]);
    }
    m = sel.match(/^\[data-float="(\d+)"\]$/);
    if (m) return floats[m[1]] || null;
    return null;
  },
  querySelectorAll: function (sel) {
    if (sel === '.diff-item') {
      return ['easy', 'normal', 'hard'].map(function (d) {
        const el = new El('diff-' + d, ['diff-item', d === 'normal' ? 'active' : '']);
        el.dataset.d = d;
        registry['diff-' + d] = el;
        return el;
      });
    }
    return [];
  },
  addEventListener: function () {},
  removeEventListener: function () {},
  createElement: function () { return new El(''); }
};
bodyEl = new El('body');
documentShim.body = bodyEl;

global.document = documentShim;
global.window = global;
global.innerWidth = 1280;
global.innerHeight = 800;
global.matchMedia = function () { return { matches: false }; };
global.addEventListener = function () {};
global.localStorage = { _s: {}, getItem: function (k) { return this._s[k] !== undefined ? this._s[k] : null; }, setItem: function (k, v) { this._s[k] = v; } };
// No AudioContext -> sound effects stay silent

// ---------- Load code ----------
const Core = require(__dirname + '/../js/core.js');
global.PortauCore = Core;
require(__dirname + '/../js/ui.js');

const engine = Core.engine, rules = Core.rules;
const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
const state = function () { return window.__portau.getState(); };
const flags = function () { return window.__portau.getFlags(); };
const el = function (id) { return registry[id] || documentShim.getElementById(id); };
const click = function (id) { el(id).dispatch('click', { target: el(id) }); };
const num = function (id) { return String(el(id).textContent); };

let passed = 0, failed = 0;
function check(name, ok) {
  if (ok) { passed += 1; console.log('PASS ' + name); }
  else { failed += 1; console.log('FAIL ' + name); }
}

async function main() {
  // 1. Start the match
  click('btn-start');
  await sleep(100);
  check('game screen shown', !el('screen-game').hasClass('hidden'));
  check('opening draw overlay shown', !el('opening-overlay').hasClass('hidden'));
  check('deck 56 cards (undealt)', num('deck-num') === '56');
  check('hand empty before opening', el('player-hand').innerHTML === '');

  // 2. Player draws (click the 3rd card)
  const poolBack = el('pool-row').children[2]._pcard;
  el('pool-row').dispatch('click', { target: poolBack });
  await sleep(120);
  check('draw stage shifted up after pick', el('draw-stage').hasClass('shifted'));
  check('card back kept until clone appears', poolBack.style.visibility !== 'hidden');
  await sleep(600);
  check('card back hidden after shift (clone took over)', poolBack.style.visibility === 'hidden');
  check('reveal area expanded', el('draw-result').hasClass('show'));

  // 3. Wait for AI draw and reveal
  await sleep(2600);
  check('both sides revealed', el('frame-player').innerHTML !== '' && el('frame-ai').innerHTML !== '');
  check('first-player info shown', el('draw-msg').textContent.indexOf('先手') >= 0);

  // 4. Wait for the initial card and deal animation
  const st1 = state();
  const dealtAt = Date.now();
  while (Date.now() - dealtAt < 12000) {
    await sleep(200);
    if (flags().animating === false && state().hands.player.length === 4) break;
  }
  check('deal complete: 4 cards each', state().hands.player.length === 4 && state().hands.ai.length === 4);
  check('deck 47 cards (56-1 initial-8 hands)', num('deck-num') === '47' && state().deck.length === 47);
  check('initial card on board', state().slots.filter(function (s) { return !!s; }).length === 1);
  check('deal animation unlocked', flags().animating === false);
  const afterDealHtml = el('player-hand').innerHTML;
  if (state().turn === 'player') {
    check('player hand not dimmed on our turn', afterDealHtml.indexOf('turn-dim') < 0);
  } else {
    check('player hand dimmed on soulmaster turn', afterDealHtml.indexOf('turn-dim') >= 0);
  }

  // 5. Auto-play the whole match
  let guard = 0;
  const maxGuard = 600;
  while (state().phase === 'playing' && guard < maxGuard) {
    guard += 1;
    await sleep(120);
    if (flags().animating) continue;
    if (state().turn !== 'player') continue;
    if (!el('remedy-overlay').classList.contains('hidden')) { click('btn-skip'); continue; }
    const moves = rules.legalMoves(state().hands.player, state().slots);
    if (moves.length === 0) continue;
    const m = moves[0];
    const handCard = el('hand-' + m.card.id);
    if (!handCard) { check('hand element exists', false); break; }
    if (m.type === 'play' && m.card.kind === 'normal') {
      // Double-click plays the card directly
      el('player-hand').dispatch('click', { target: handCard });
      el('player-hand').dispatch('click', { target: handCard });
    } else {
      // Joker / capture: select the card, then click the slot
      el('player-hand').dispatch('click', { target: handCard });
      const slotEl = el('board-inner').children[m.slot]._slot;
      el('board-inner').dispatch('click', { target: slotEl });
    }
    // Play animation starts: the hand should dim immediately
    if (guard === 1 || guard === 2) {
      await sleep(80);
      check('hand dimmed immediately when play animation starts', el('player-hand').innerHTML.indexOf('turn-dim') >= 0);
    }
  }
  check('match ended normally', state().phase === 'over');
  // The game is decided when the play animation starts, but the result modal waits for the animation to land - wait until ready
  let settle = 0;
  while (flags().animating && settle < 40) { await sleep(150); settle += 1; }
  await sleep(300);
  check('result overlay shown', !el('result-overlay').classList.contains('hidden'));
  check('turn label cleared when result opens', el('turn-text').textContent === '');
  const scoreMatch = /(\d+)\D+(\d+)/.exec(el('result-score').textContent);
  check('result score rendered',
    !!scoreMatch && Number(scoreMatch[1]) === state().result.player && Number(scoreMatch[2]) === state().result.ai);
  check('animation lock released', flags().animating === false);

  // 6. Play again
  click('btn-restart');
  await sleep(100);
  check('restart returns to opening draw', !el('opening-overlay').classList.contains('hidden'));
  check('board cleared after restart', state().slots.every(function (s) { return !s; }) || state().slots.filter(function (s) { return !!s; }).length === 0);
  check('hand empty after restart', state().hands.player.length === 0);

  console.log('----------------------------------------');
  console.log('TOTAL: ' + (passed + failed) + '  PASS: ' + passed + '  FAIL: ' + failed);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(function (e) { console.error('ERROR:', e && e.stack || e); process.exit(1); });
