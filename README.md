# Portau 波陶 · Warframe 卡牌游戏（网页版）

<a id="chinese"></a>
**中文** | [English](#english)

《Warframe》官方直播里出现的 **Portau（波陶）** 扑克小游戏的网页复刻：纯静态单页，无后端、无框架、无构建，浏览器打开即玩。

**[▶ 在线游玩](https://zjm960929.github.io/warframe-portau/)**

## 玩法

一副 56 张牌：4 花色 × A~K（52 张普通牌）+ 4 张鬼牌。桌面固定 13 个牌槽，从左到右对应 A、2 … K。双方各持 4 张明牌，轮流出牌。

### 一局流程

1. **定先手**：双方从同一花色的 A~K 中各抽一张比大小，点数大者先手（同花色保证不会同点）。
2. **发牌**：从牌堆抽 1 张普通牌作为初始牌放进对应牌槽，双方各发 4 张手牌，牌堆剩 47 张。
3. **出牌**：普通牌只能放进自己点数对应的槽；鬼牌可以放进任意空槽。
4. **结算**：13 个牌槽填满后比较总分，高者胜；若双方连续两次结束回合，也提前结算。

### 计分

| 落牌位置 | 得分 |
| --- | --- |
| 左右任一侧没有牌（桌面边缘，或落点两侧为空） | **+2** |
| 夹在两牌之间，两侧间隔不相等 | **+4** |
| 正好夹在正中间（两侧间隔相等） | **+7** |

「间隔」指牌槽序号之差，只看落点左右最近的两张牌。

### 鬼牌与抢夺

- 鬼牌放进任意空槽，按上表正常计分。
- 之后谁打出与该槽点数相同的普通牌，就能**抢夺**：普通牌盖住鬼牌，鬼牌回到原主人手中。
- 抢夺本身 **0 分**，并且不补牌——相当于用一次出牌机会换回一张鬼牌。

### 没有可出的牌

| 选择 | 代价与效果 |
| --- | --- |
| 弃 1 摸 1 | **-2 分**；需要当前分数 ≥ 2 且牌堆非空；摸到的新牌可以立即打出，也可以选择结束回合 |
| 整手重摸 | 立即结束回合（牌堆不足 4 张时按剩余张数发） |
| 直接结束回合 | 连续两次「结束回合」后对局直接结算 |

### 魂主（AI）

| 难度 | 策略 |
| --- | --- |
| 简单 | 随机出牌；摸到能打的牌也有概率不打 |
| 普通 | 贪心：每次挑当前得分最高的落点 |
| 困难 | 在得分基础上评估「给对手送了多少分」和「自己后续还能连出几个 +7」，并给抢夺额外加权 |

## 特性

- 中英双语界面，一键切换并记住偏好
- 完整动画：开局抽牌揭示、先手判定、发牌、出牌飞行、摸牌补位、鬼牌飞回、弃牌与整手重摸
- WebAudio 合成音效 + 本地背景音乐，主菜单与对局内都能开关
- Tau 科幻风界面；桌面大屏分级放大，窄屏横屏提示，系统开启「减弱动态效果」时关闭装饰性动画
- 规则说明内嵌 B 站视频（手机端直接跳转 B 站观看）
- 无后端、无追踪；除规则视频外不发起任何外部请求
- 仅用 HTML / CSS / 原生 JS，没有第三方运行时依赖

## 项目结构

```text
warframe-portau/
├─ index.html          单页结构：主菜单、对局、开局抽牌、补救与结算弹窗、规则视频
├─ css/style.css       Tau 风格样式、响应式分级、减弱动画适配
├─ js/core.js          规则引擎（UMD：浏览器挂 window.PortauCore，Node 下可直接 require）
├─ js/ui.js            对局控制器：渲染、动画、回合流程、界面文案表、音效
├─ tools/test-core.js  规则自测（7 项，含三难度各 200 局 AI 合规压测）
├─ tools/test-ui.js    无头 DOM 端到端冒烟测试（20 余项，含终局与重开流程）
├─ images/bg.jpg       背景图
├─ audio/bgm.mp3       背景音乐
├─ .nojekyll           GitHub Pages 不做 Jekyll 处理
└─ .gitignore
```

## 本地运行

不需要安装任何东西。直接双击 `index.html` 即可游玩；也可以起一个静态服务器：

```bash
python -m http.server 8080
# 打开 http://localhost:8080
```

## 开发与测试

没有构建步骤，改完刷新页面就生效。改动 JS 后先做语法检查，再跑两套测试：

```bash
node --check js/core.js
node --check js/ui.js
node tools/test-core.js   # 规则 / 引擎 / AI
node tools/test-ui.js     # 界面流程冒烟测试
```

`tools/test-ui.js` 自带最小 DOM 垫片，能在 Node 里完整驱动一局：开局抽牌 → 发牌 → 自动出牌到结算 → 再来一局，不需要浏览器。需要 Node.js 18 或更新版本（本地在 Node 24 上验证）。

## 界面偏好与隐私

- 只往 `localStorage` 写两项偏好：`portau_lang`（`zh` / `en`）和 `portau_bgm`（`on` / `off`）。键名带 `portau_` 前缀；读取时容错，缺失或非法值退回默认（中文、音乐关闭）。
- 不做访问统计、不写 Cookie、不加载第三方脚本。唯一的外部请求是桌面端点「规则说明」时加载的 B 站播放器 iframe。

## 浏览器支持

面向近两年的 Chrome / Edge / Firefox / Safari。用到 Flexbox、CSS `transform` 动画、`localStorage` 和 WebAudio；缺少这些能力时音效静默、动画降级，游戏本身仍可进行。移动端建议横屏游玩。

## 已知限制

- 竖屏时会盖一层旋转提示，需转为横屏才能正常对局。
- 规则视频依赖 B 站外链，离线环境无法播放。
- 单机对战 AI，没有联机、存档和回放。
- 背景音乐是随仓库分发的本地文件（约 9.4 MB），不会拖慢首屏（`preload="none"`）。
- AI 是规则评估而非搜索，困难档也并非不可战胜。

## 发布

GitHub Pages：`main` 分支根目录 + `.nojekyll`。推送到 `main` 后等 Pages 构建完成，再打开线上地址确认资源加载正常。

## 素材与致谢

- 游戏设计来自 Digital Extremes 的《Warframe》官方直播（PMCF 环节）；本项目是独立的非商业复刻，与 Digital Extremes 无关。
- 规则视频来自 B 站 [@ZJM](https://space.bilibili.com/16730771)。
- 背景图与背景音乐随仓库分发，不引用 CDN。

## 授权

《Warframe》的名称、美术与游戏规则归 Digital Extremes 所有。本仓库代码用于学习与个人娱乐，按「现状」提供，不附带任何担保。

## 关注作者

- B 站（哔哩哔哩）：[@ZJM](https://space.bilibili.com/16730771)
- 抖音：[@ZJM](https://www.douyin.com/user/MS4wLjABAAAAFIQ6-Ww8fODvrsOR2oFTtegpwDnpVq_PKHIUbxkvFSE)

---

<a id="english"></a>
# Portau · Warframe Card Game (Web)

[中文](#chinese) | **English**

A web recreation of **Portau**, the poker-like card game shown in the official *Warframe* PMCF livestream. One static page: no backend, no framework, no build step. Open it in a browser and play.

**[▶ Play online](https://zjm960929.github.io/warframe-portau/)**

## How to Play

The deck holds 56 cards: 52 suited cards (A–K in four suits) plus 4 Jokers. The table has 13 fixed slots, laid out left to right as A, 2 … K. Both sides hold 4 face-up cards and take turns.

### A Round

1. **Decide the first player**: each side draws one card from the same suit (A–K) and compares ranks; the higher rank goes first. A shared suit guarantees no tie.
2. **Deal**: one random normal card is drawn from the deck as the starting card and placed in its slot; each side then gets 4 cards, leaving 47 in the deck.
3. **Play**: a normal card may only go into the slot matching its own rank; a Joker may go into any empty slot.
4. **Score**: once all 13 slots are filled, the higher total wins. Two consecutive "end turn" choices also end the game early.

### Scoring

| Where the card lands | Points |
| --- | --- |
| No card on at least one side (table edge, or both sides empty) | **+2** |
| Between two cards, with unequal gaps on each side | **+4** |
| Exactly in the middle (equal gaps on both sides) | **+7** |

A "gap" is the difference between slot indexes; only the two nearest cards on each side count.

### Jokers and Capture

- A Joker may be placed in any empty slot and scores normally by the table above.
- Whoever later plays the normal card of that slot's rank **captures** it: the rank card covers the Joker, and the Joker returns to its owner's hand.
- A capture is worth **0 points** and draws no replacement card — you spend a turn to get a Joker back.

### When You Have No Legal Move

| Choice | Cost and effect |
| --- | --- |
| Discard 1, draw 1 | **−2 points**; requires a score of at least 2 and a non-empty deck; the new card may be played immediately or you may end the turn |
| Redraw the whole hand | Ends your turn at once (if the deck has fewer than 4 cards, you get what is left) |
| End the turn | After two consecutive "end turn" choices the game ends immediately |

### The AI ("Soul Master")

| Difficulty | Strategy |
| --- | --- |
| Easy | plays at random, and may skip a playable drawn card |
| Normal | greedy: always takes the highest-scoring placement |
| Hard | weighs points against what it gives away and how many future +7s it keeps, with extra weight on captures |

## Features

- Bilingual UI (Chinese / English) with a one-click toggle that remembers your choice
- Full animation set: opening draw reveal, first-player showdown, dealing, card flight, draw refill, Joker fly-back, discard and full-hand redraw
- WebAudio-synthesised sound effects plus local background music, toggleable from the menu and in game
- Tau sci-fi look; tiered scaling on large desktop screens, landscape hint on narrow screens, decorative animation disabled under "reduce motion"
- Rules video embedded from Bilibili (opens on Bilibili on mobile)
- No backend, no tracking; the rules video is the only external request
- HTML, CSS and vanilla JS only — no third-party runtime dependencies

## Project Layout

```text
warframe-portau/
├─ index.html          Single page: menu, match, opening draw, remedy/result modals, rules video
├─ css/style.css       Tau styling, responsive tiers, reduced-motion support
├─ js/core.js          Rule engine (UMD: window.PortauCore in the browser, require() in Node)
├─ js/ui.js            Match controller: rendering, animation, turn flow, UI strings, audio
├─ tools/test-core.js  7 core rule tests, including 200 games per difficulty for AI legality
├─ tools/test-ui.js    Headless DOM end-to-end smoke test (20+ checks, including the result and restart flow)
├─ images/bg.jpg       Background image
├─ audio/bgm.mp3       Background music
├─ .nojekyll           Tells GitHub Pages to skip Jekyll
└─ .gitignore
```

## Run Locally

Nothing to install. Open `index.html` directly, or serve the folder statically:

```bash
python -m http.server 8080
# then open http://localhost:8080
```

## Development and Tests

There is no build step — edit and refresh. After changing JS, check the syntax and run both suites:

```bash
node --check js/core.js
node --check js/ui.js
node tools/test-core.js   # rules / engine / AI
node tools/test-ui.js     # UI flow smoke test
```

`tools/test-ui.js` ships a minimal DOM shim, so it drives a full match inside Node — opening draw, dealing, auto-play to the result, then a restart — with no browser involved. Requires Node.js 18 or newer (verified on Node 24).

## Preferences and Privacy

- Only two preferences are written to `localStorage`: `portau_lang` (`zh` / `en`) and `portau_bgm` (`on` / `off`). Keys carry the `portau_` prefix; reads are fault-tolerant and missing or invalid values fall back to the defaults (Chinese, music off).
- No analytics, no cookies, no third-party scripts. The only external request is the Bilibili player iframe loaded when you open "How to Play" on desktop.

## Browser Support

Targets the last two years of Chrome, Edge, Firefox and Safari. It relies on Flexbox, CSS `transform` animation, `localStorage` and WebAudio; without them the sound is silent and animation degrades, but the game stays playable. Landscape is recommended on mobile.

## Known Limitations

- In portrait orientation a rotate hint covers the screen; switch to landscape to play.
- The rules video is an external Bilibili link, so it cannot play offline.
- Single-player against the AI: no online play, saves or replays.
- Background music is a local file bundled with the repository (~9.4 MB); it does not delay first paint (`preload="none"`).
- The AI evaluates rules rather than searching, so even Hard is beatable.

## Deployment

GitHub Pages from the repository root of `main`, with `.nojekyll`. After pushing to `main`, wait for the Pages build and then re-open the live URL to confirm assets load correctly.

## Credits

- Game design comes from Digital Extremes' official *Warframe* livestream (the PMCF segment). This is an independent, non-commercial recreation and is not affiliated with Digital Extremes.
- Rules video by [@ZJM](https://space.bilibili.com/16730771) on Bilibili.
- Background image and music ship with the repository; no CDN is used.

## License

The *Warframe* name, artwork and game rules belong to Digital Extremes. The code in this repository is for learning and personal entertainment, provided "as is" without warranty of any kind.

## Follow the Author

- Bilibili: [@ZJM](https://space.bilibili.com/16730771)
- Douyin (TikTok): [@ZJM](https://www.douyin.com/user/MS4wLjABAAAAFIQ6-Ww8fODvrsOR2oFTtegpwDnpVq_PKHIUbxkvFSE)
