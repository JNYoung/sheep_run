# Canvas 2.5D 方案

## 技术结论

使用 `Vite + TypeScript + Canvas 2D + DOM Overlay`。

不引入 Phaser 的原因：

- MVP 规则极小，只有一个棋盘、一个羊、一个羊仓。
- 自己实现坐标、命中和动画成本低。
- 后续如果关卡和特效复杂，再迁移到 Phaser 也不会浪费规则层，因为规则层已经和渲染层分离。

## 分层

```text
src/
  game/
    types.ts
    rules.ts
    levelLoader.ts
  render/
    iso.ts
    canvasRenderer.ts
  ui/
    localization.ts
  audio/
    audio.ts
  content/
    levels/level_001.json
```

## 核心规则

- `game/rules.ts` 是唯一胜负判断来源。
- Canvas 命中只负责把点击转换成 `TapIntent`。
- 点羊且羊仓同排/同列且路径无障碍，胜利。
- 点羊以外任何内容，失败。

## 渲染策略

- 棋盘：等距菱形草地格。
- 羊仓：固定等距 2.5D 绘制，不需要多方向。
- 障碍：固定等距 2.5D 绘制，不需要多方向。
- 羊：唯一需要方向和帧动画的对象。
- 深度：按 `x + y` 排序绘制棋盘实体。

## 羊多方向资产策略

MVP 当前用程序化绘制：

- `north`
- `east`
- `south`
- `west`

正式资产建议：

- 先做 4 方向，每方向 4 帧 idle + 6 帧 run。
- 如果关卡需要斜线或更细腻移动，再扩展为 8 方向。
- sprite sheet 命名建议：`sheep_{direction}_{state}_{frame}.png`。
- 每帧锚点统一为脚底中心，避免移动时跳动。

## Android/iOS

MVP 可玩后用 Capacitor：

- `npm run build`
- `npx cap add android`
- `npx cap add ios`
- Web build 作为唯一游戏代码。

移动端注意：

- 第一次用户点击后解锁 Web Audio。
- 所有按钮必须避开 safe area。
- Canvas 按 DPR 缩放，但限制上限，避免低端机内存压力。
