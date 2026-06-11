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
- Canvas 2.5D 可玩版本。
- 主菜单、HUD、结果弹窗、设置、多语言。
- 程序化占位音效和轻音乐。
- 200 个本地关卡 JSON 和可解性校验脚本。
- WebP 运行时资产、4 向羊 sprite、谷仓、障碍、场景贴图和 UI 资产。
- 新手教程、阻挡路线反馈、提示、撤销、星级、每日挑战和成就摘要。
- 下一阶段 Codex prompt。

## 不再推进的方向

- 不再创建 Unity 工程。
- 不再用 Three.js 做真实 3D。
- 不把所有 UI 画进 Canvas。文字和按钮继续用 DOM，便于移动端适配和多语言。

## 下一阶段重点

1. 生成 Google Play 截图、补完整多语言商店文案。
2. 配置正式 release upload keystore，生成可上传 AAB。
3. 做 Android 真机或模拟器 WebView 触摸、音频解锁和安全区验证。
4. 继续补完整成就页、章节目标和更多留存任务。
5. 若接入广告、统计、远端关卡或账号，先更新隐私政策、权限、SDK 声明和数据安全表。
