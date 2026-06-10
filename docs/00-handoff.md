# Canvas 2.5D 交接说明

## 最新方向

项目改为 Canvas 2.5D，不再使用 Unity 或 Three.js。

原因：

- 游戏只有一只羊需要多方向渲染。
- 棋盘、羊仓、障碍和装饰都可以用等距 2D 绘制或贴图。
- Canvas 2D 包体小、启动快、移动 WebView 稳定，后续用 Capacitor 包 Android/iOS 更直接。
- 玩法规则非常小，不需要 3D 引擎、物理引擎或 Unity 编辑器。

## 当前已完成

- Vite + TypeScript 项目骨架。
- Canvas 2.5D 可玩 MVP。
- 主菜单、HUD、结果弹窗。
- 程序化占位音效和轻音乐。
- zh-CN、en、ja 多语言。
- 初始关卡 JSON 和本地校验脚本。
- 下一阶段 Codex prompt。

## 不再推进的方向

- 不再创建 Unity 工程。
- 不再用 Three.js 做真实 3D。
- 不把所有 UI 画进 Canvas。文字和按钮继续用 DOM，便于移动端适配和多语言。

## 下一阶段重点

1. 把程序化羊替换为正式 4 向或 8 向 sprite sheet。
2. 增加 5-10 个关卡 JSON。
3. 增加轻量关卡选择。
4. 接 Capacitor，生成 Android/iOS 原生壳。
5. 做真机 WebView 触摸、音频解锁和安全区验证。
