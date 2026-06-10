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
3. 继续完善 MVP：一只羊、一个羊仓、点羊胜利、点其他任何地方失败。
4. 重点提升羊的 4 向渲染。只有羊需要多方向 sprite，羊仓/障碍/棋盘可以保持固定等距资源。
5. 增加 5-10 个关卡 JSON，并让 `tools/validate-levels.mjs` 覆盖它们。
6. 如果要引入图片资源，统一放在 `src/assets`，并用 manifest key 管理，不要把文件名散落在业务逻辑里。
7. 运行 `npm test` 和 `npm run build`，再用浏览器实际点击验证。

验收标准：
- 首屏主菜单可用。
- 点击开始后看到 2.5D 棋盘、羊、羊仓、障碍。
- 点羊且路径通畅播放进仓动画并胜利。
- 点空格、羊仓、障碍、棋盘其他位置立即失败。
- UI 支持 zh-CN/en/ja 切换。
- 音效可开关。
```
