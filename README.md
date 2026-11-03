# Warframe Portau 波陶 · 网页版

《Warframe》波陶（Portau）卡牌游戏的网页版。

纯静态页面，无需后端，可直接通过 GitHub Pages 部署游玩。

## 玩法简介

- 13 个牌槽（A~K），双方轮流落牌，按「不夹牌 2 分 / 不对称夹牌 4 分 / 对称夹牌 7 分」计分
- 鬼牌（Joker）可放任意空槽；对应点数的普通牌可以抢夺它（计 0 分、不摸牌）
- 无牌可出时：弃 1 摸 1（-2 分）或重新摸牌（结束回合）
- 开局比大小决定先手；AI（魂主）分简单 / 普通 / 困难三档

## 本地游玩

直接用浏览器打开 `index.html` 即可（推荐 Chrome / Edge，横屏或宽窗口体验最佳）。

## GitHub Pages 部署

1. 仓库页面 → **Settings** → **Pages**
2. Source 选择 **Deploy from a branch**，Branch 选择 **main** / **(root)**，保存
3. 等待 1~2 分钟，访问 `https://<你的用户名>.github.io/warframe-portau/` 即可游玩

> 已包含 `.nojekyll`，无需额外构建步骤。

## 目录结构

```
index.html        页面入口
css/style.css     样式（Tau 科幻风）
js/core.js        核心规则（UMD，浏览器/Node 通用）
js/ui.js          对局控制器与动画
images/bg.jpg     背景图
audio/bgm.mp3     背景音乐
tools/            Node 自测脚本（node tools/test-core.js / node tools/test-ui.js）
```

## 许可

游戏玩法来自 Digital Extremes 的《Warframe》PMCF 活动演示，仅供学习交流。
