# Google Play 上架准备

更新日期：2026-06-11

## 当前上架口径

- App 名称：赶了个羊
- 包名：`com.jnyoung.sheeprun`
- 版本：`versionCode 1`, `versionName 1.0.0`
- 技术栈：Vite + TypeScript + Canvas 2D，通过 Capacitor 6 Android 壳打包。
- 内容：200 个本地关卡，无远端关卡、账号、内购或第三方统计 SDK。
- 多语言：简体中文、繁体中文、日文、法文、德文、英文、阿拉伯文；阿拉伯文启用 RTL 布局。
- 变现预留：失败页和首页有透明的“额外救援笔”入口；当前实现为本地候选羊高亮，不接入广告 SDK，不做隐蔽强制广告。
- 权限：当前 Android Manifest 不声明 `INTERNET`，也不请求相机、麦克风、通讯录、定位或通知。
- 本地数据：仅保存关卡进度、星级、每日挑战状态、成就摘要、语言和声音设置到设备本地存储。

## 已准备资源

- 512x512 图标：`public/brand/icon-512.png`
- 1024x1024 源图标：`public/brand/icon-1024.png`
- Android mipmap 图标：`android/app/src/main/res/mipmap-*`
- 启动图：`public/brand/splash-1080x1920.png`
- Android 启动图：`android/app/src/main/res/drawable-port-*` 和 `drawable-land-*`
- Google Play feature graphic：`public/brand/feature-graphic-1024x500.png`
- 商店文案：`docs/store-metadata.zh-CN.json`
- 隐私政策：`public/privacy.html`
- 支持页：`public/support.html`
- 数据删除说明：`public/data-deletion.html`
- 官网介绍页：`public/app-home.html`
- 主菜单设计图：`docs/design/main-menu-concept-v2.png`

## 关卡与性能

- 前 20 关重新平衡为 4 到 25 只羊的平滑曲线；第 21 关后继续每 10 关阶梯式增加拥挤度。
- 前 20 关误点和被挡路径只扣星并显示路线提示；高阶关恢复失败压力。
- 最大棋盘为 16x16，最大羊数 220，最大障碍数 25。
- 高密度关卡会自动缩小羊和障碍，并降低超密场景 DPR 上限以控制帧率和内存。
- 小羊方向通过高对比箭头徽章强化显示，避免仅靠羊头朝向导致上/下方向不明显。
- 运行时素材已从 PNG 转为 WebP，`public/assets/v1` 约 456KB。
- Android 同步后会自动移除 WebView 内重复品牌大图，并将启动图资源转为 WebP；当前 release AAB 约 4.1MB。

## 推荐命令

```bash
npm run levels:generate
npm run assets:optimize
npm run brand:generate
npm test
npm run build
npm run android:sync
npm run release:audit
```

生成 Android 调试包：

```bash
npm run android:apk
```

生成 Android App Bundle：

```bash
npm run android:aab
```

## 签名与提审前检查

Google Play 正式上传需要 release keystore。建议在 `android/keystore.properties` 中配置本地签名信息，并在 `android/app/build.gradle` 添加 release signingConfig。不要把 keystore 或密码提交进仓库。

当前本机已成功生成 AAB：

```text
android/app/build/outputs/bundle/release/app-release.aab
```

上传 Google Play 前请使用自己的 upload keystore 重新签名构建；模板见 `android/keystore.properties.example`。

提审前复核：

- `npm run release:audit` 通过。
- AAB 使用正式 release keystore 签名。
- Google Play 数据安全填写“不收集用户数据”。
- 内容分级按休闲益智/无暴力/无用户生成内容填写。
- 隐私政策、支持页、数据删除说明 URL 能公开访问。
- 若后续接入广告、统计、远端关卡或账号，必须同步更新权限、SDK 声明、隐私政策和数据安全表。
