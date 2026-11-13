// tools/test-ui.js —— 网页版无头 DOM 端到端冒烟测试（Node 运行，无需浏览器）
// 模拟最小 DOM，驱动完整对局：开局抽牌 → 初始牌 → 发牌 → 自动打完整局 → 结算 → 再来一局
'use strict';

// ---------- 最小 DOM 垫片 ----------
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
    // 通用解析：注册所有带 id 的 div，并建立 dataset
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
        // board-inner 的直接子级是 13 个 slot-wrap（供 children[i] 索引）
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
// 无 AudioContext → 音效静默

// ---------- 载入代码 ----------
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
  // 1. 启动对局
  click('btn-start');
  await sleep(100);
  check('对局界面显示', !el('screen-game').hasClass('hidden'));
  check('开局抽牌层显示', !el('opening-overlay').hasClass('hidden'));
  check('牌堆 56 张（未发牌）', num('deck-num') === '56');
  check('开局前手牌为空', el('player-hand').innerHTML === '');

  // 2. 玩家抽牌（点第 3 张）
  const poolBack = el('pool-row').children[2]._pcard;
  el('pool-row').dispatch('click', { target: poolBack });
  await sleep(120);
  check('抽牌后界面已上移', el('draw-stage').hasClass('shifted'));
  check('牌背保留到克隆卡出现', poolBack.style.visibility !== 'hidden');
  await sleep(600);
  check('上移后牌背隐藏（克隆卡已接管）', poolBack.style.visibility === 'hidden');
  check('揭示区展开', el('draw-result').hasClass('show'));

  // 3. 等待 AI 抽牌与揭示
  await sleep(2600);
  check('双方已揭示', el('frame-player').innerHTML !== '' && el('frame-ai').innerHTML !== '');
  check('先手信息显示', el('draw-msg').textContent.indexOf('先手') >= 0);

  // 4. 等待初始牌 + 发牌动画完成
  const st1 = state();
  const dealtAt = Date.now();
  while (Date.now() - dealtAt < 12000) {
    await sleep(200);
    if (flags().animating === false && state().hands.player.length === 4) break;
  }
  check('发牌完成：双方各 4 张', state().hands.player.length === 4 && state().hands.ai.length === 4);
  check('牌堆 47 张（56-1初始-8手牌）', num('deck-num') === '47' && state().deck.length === 47);
  check('初始牌在桌面', state().slots.filter(function (s) { return !!s; }).length === 1);
  check('发牌动画已解锁', flags().animating === false);
  const afterDealHtml = el('player-hand').innerHTML;
  if (state().turn === 'player') {
    check('我方回合手牌无全暗标记', afterDealHtml.indexOf('turn-dim') < 0);
  } else {
    check('魂主回合我方手牌全暗', afterDealHtml.indexOf('turn-dim') >= 0);
  }

  // 5. 自动打完整局
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
    if (!handCard) { check('手牌元素存在', false); break; }
    if (m.type === 'play' && m.card.kind === 'normal') {
      // 双击直出
      el('player-hand').dispatch('click', { target: handCard });
      el('player-hand').dispatch('click', { target: handCard });
    } else {
      // 鬼牌 / 抢夺：选牌 + 点槽
      el('player-hand').dispatch('click', { target: handCard });
      const slotEl = el('board-inner').children[m.slot]._slot;
      el('board-inner').dispatch('click', { target: slotEl });
    }
    // 出牌动画开始：手牌应立即全暗
    if (guard === 1 || guard === 2) {
      await sleep(80);
      check('出牌动画开始手牌立即全暗', el('player-hand').innerHTML.indexOf('turn-dim') >= 0);
    }
  }
  check('对局正常终局', state().phase === 'over');
  // 终局在出牌动画开始时即判定，结算弹窗要等动画落地——等待就绪
  let settle = 0;
  while (flags().animating && settle < 40) { await sleep(150); settle += 1; }
  await sleep(300);
  check('结算层显示', !el('result-overlay').classList.contains('hidden'));
  const scoreMatch = /(\d+)\D+(\d+)/.exec(el('result-score').textContent);
  check('结算比分渲染',
    !!scoreMatch && Number(scoreMatch[1]) === state().result.player && Number(scoreMatch[2]) === state().result.ai);
  check('动画锁已解锁', flags().animating === false);

  // 6. 再来一局
  click('btn-restart');
  await sleep(100);
  check('重开后回开局抽牌', !el('opening-overlay').classList.contains('hidden'));
  check('重开后台牌清空', state().slots.every(function (s) { return !s; }) || state().slots.filter(function (s) { return !!s; }).length === 0);
  check('重开后手牌为空', state().hands.player.length === 0);

  console.log('----------------------------------------');
  console.log('TOTAL: ' + (passed + failed) + '  PASS: ' + passed + '  FAIL: ' + failed);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(function (e) { console.error('ERROR:', e && e.stack || e); process.exit(1); });
