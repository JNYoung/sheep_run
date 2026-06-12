# 下一阶段 Codex Prompt

```text
你正在接手 `sheep_run`。最新技术方向是 Canvas 2.5D，不要改回 Unity 或 Three.js。

请先阅读：
- README.md
- docs/00-handoff.md
- docs/01-canvas-25d-plan.md
- docs/02-visual-direction-and-prompts.md

当前目标：
1. 保持 Vite + TypeScript + Canvas 2D + DOM Overlay。
2. 保持 `src/game/rules.ts` 作为唯一玩法规则来源，不要把胜负判断写进 renderer。
3. 当前版本已经有 200 个本地关卡、WebP 资产、关卡选择、设置、多语言、提示、撤销、星级、每日挑战和成就摘要。
4. 前 20 关是新手保护：误点和阻挡只扣星并显示路径提示；第 21 关后恢复失败压力。
5. 如果继续改玩法，保持规则层、渲染层、DOM UI 分离；不要把胜负判断写进 renderer。
6. 如果要新增图片资源，统一放在 `public/assets/v1`，并通过 renderer 资产 manifest key 引用。
7. 运行 `npm test`、`npm run build`，再用浏览器实际点击验证桌面和移动视口。

验收标准：
- 首屏主菜单可用。
- 点击开始后看到 2.5D 棋盘、羊、羊仓、障碍。
- 点羊且路径通畅播放进仓动画并累计星级。
- 新手关误点显示警告和阻挡路线，不直接重开。
- 高阶关误点进入失败页，但仍显示路线反馈。
- HUD 的提示、撤销按钮状态正确；菜单每日挑战、成就摘要、星级显示正确。
- UI 支持 zh-CN/zh-TW/en/ja/fr/de/ar，阿拉伯文保持 RTL。
- 音效可开关。
```
