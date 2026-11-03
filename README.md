# Portau 波陶 · Warframe Card Game (Web)

**中文** | [English](#english)

《Warframe》波陶（Portau）卡牌游戏网页版。纯静态页面，无需后端、无需安装，打开即玩。

**[▶ 立即游玩](https://zjm960929.github.io/warframe-portau/)**

## 玩法简介

- 牌堆由 4 花色 A~K 共 52 张普通牌 + 4 张鬼牌组成
- 桌上有 13 个牌槽（对应 A 至 K），双方各持 4 张手牌轮流落牌
- **计分口诀**：所放的牌不在任何两张牌之间 **+2**；夹在两牌之间但两侧间隔不对称 **+4**；恰好夹在正中间（两侧对称）**+7**
- **鬼牌（Joker）**：可放入任意空槽，按位置正常计分；当对应点数的普通牌打出时会被**抢夺**——普通牌盖住鬼牌、鬼牌回到原主人手中，抢夺计 0 分且不摸牌
- **没有可出的牌时**：弃 1 摸 1（-2 分，新牌可立即打出）或整手重摸（立即结束回合）
- **决定先手**：开局双方各抽一张同花色 A~K 比大小，点数大者先手
- **魂主（AI）**：三档难度，困难难度会评估给玩家送分与自身连携
- 13 个牌槽全部填满后结算，得分高者获胜

## 特性

- Tau 科幻风格 UI，全屏自适应（桌面大屏分级放大 / 移动端横屏提示）
- 完整动画：抽牌揭示、发牌、出牌飞行、摸牌补位、鬼牌抢夺飞回
- 背景音乐与合成音效，可一键开关
- 无后端、无追踪、无依赖框架

## 关注作者

- B站（哔哩哔哩）：[@ZJM](https://space.bilibili.com/16730771)
- 抖音：[@ZJM](https://www.douyin.com/user/MS4wLjABAAAAFIQ6-Ww8fODvrsOR2oFTtegpwDnpVq_PKHIUbxkvFSE)

---

<a id="english"></a>
# Portau · Warframe Card Game (Web)

**[中文](#portau-波陶--warframe-card-game-web)** | **English**

A web version of *Portau*, the card game from Warframe's PMCF live stream. Fully static — no backend, no install, just open and play.

**[▶ Play now](https://zjm960929.github.io/warframe-portau/)**

## How to Play

- The deck has 52 suited cards (A–K × 4 suits) plus 4 Jokers
- There are 13 slots on the table (one per rank, A through K); both players hold 4 cards and take turns
- **Scoring**: a card placed with no cards on both sides scores **+2**; placed between two cards with unequal gaps on each side scores **+4**; placed exactly in the middle of two cards (equal gaps) scores **+7**
- **Joker**: may be placed on any empty slot and scores normally; when the matching rank is played, the Joker is **captured** — the rank card covers it and returns to the Joker's owner. Capturing scores 0 and skips the draw
- **No legal moves?** Discard 1 and draw 1 (−2 points, the new card may be played immediately), or redraw your whole hand (ends your turn)
- **First player**: each side draws one card from a single suit (A–K); the higher rank goes first
- **The Soul Master (AI)**: three difficulty levels; on Hard it weighs feeding points to you against its own synergies
- Once all 13 slots are filled, the higher total score wins

## Features

- Tau sci-fi styled UI, fully responsive (large-screen scaling on desktop / rotate hint on mobile)
- Full animation set: draw reveal, dealing, card flight, draw-to-hand refill, joker capture fly-back
- Background music and synthesized sound effects with a one-click toggle
- No backend, no tracking, no frameworks

## Follow the Author

- Bilibili: [@ZJM](https://space.bilibili.com/16730771)
- Douyin (TikTok): [@ZJM](https://www.douyin.com/user/MS4wLjABAAAAFIQ6-Ww8fODvrsOR2oFTtegpwDnpVq_PKHIUbxkvFSE)

## Development

```bash
# 核心规则自测 / core logic tests
node tools/test-core.js

# 端到端 UI 冒烟测试 / end-to-end UI smoke test
node tools/test-ui.js
```

## License

The game design comes from Digital Extremes' Warframe PMCF live stream. This project is for learning and personal entertainment only.
