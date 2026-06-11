# Google Play 上架待办清单

更新日期：2026-06-11

## 当前结论

当前代码侧基础准备较好，但还不能直接提交生产审核。`npm run release:audit` 已通过，Android 壳、商店素材、隐私/支持页面文件都在仓库内；真正阻塞 Google Play 上架的是公开 URL、正式签名 AAB、Play Console 表单和测试轨道。

## 当前证据

- 本地分支：`main`
- App ID：`com.jnyoung.sheeprun`
- 版本：`versionCode 1`, `versionName 1.0.0`
- SDK：`compileSdkVersion 36`, `targetSdkVersion 36`, `minSdkVersion 24`
- 权限：`android/app/src/main/AndroidManifest.xml` 当前不声明 `INTERNET`
- 本地审核：`npm run release:audit` 通过 16 项检查
- 当前本机缺失：`android/keystore.properties`
- 当前本机缺失：`android/app/build/outputs/bundle/release/app-release.aab`
- 公开 URL 检查结果：以下 URL 当前均返回 GitHub Pages 404
  - `https://jnyoung.github.io/sheep_run/`
  - `https://jnyoung.github.io/sheep_run/privacy.html`
  - `https://jnyoung.github.io/sheep_run/support.html`
  - `https://jnyoung.github.io/sheep_run/data-deletion.html`

## P0 阻塞上架

### 1. 修好公开 URL

Google Play 上架需要可访问的隐私政策 URL；当前配置在 `docs/store-metadata.zh-CN.json` 里的 GitHub Pages 地址全部 404。先启用 GitHub Pages 或换成其他静态托管，然后确认这些页面返回 `HTTP 200`，并且正文内容与当前 App 行为一致。

待办：

- 部署 `public/app-home.html` 到公开首页，或配置 GitHub Pages 正确发布 `dist/`/静态文件。
- 确认以下页面公开可访问：
  - 隐私政策：`/privacy.html`
  - 支持页：`/support.html`
  - 数据删除说明：`/data-deletion.html`
- URL 变更后同步更新 `docs/store-metadata.zh-CN.json` 和 Play Console。

验证命令：

```bash
for url in \
  https://jnyoung.github.io/sheep_run/ \
  https://jnyoung.github.io/sheep_run/privacy.html \
  https://jnyoung.github.io/sheep_run/support.html \
  https://jnyoung.github.io/sheep_run/data-deletion.html
do
  curl -L -sS -o /tmp/urlcheck.html -w "$url HTTP %{http_code} final=%{url_effective}\n" "$url"
done
```

### 2. 生成正式 upload keystore 并构建 release AAB

正式上传 Google Play 需要 release AAB，并且 AAB 要用 upload key 签名。仓库已经提供 `android/keystore.properties.example`，但本机还没有真实 `android/keystore.properties`，也没有 release AAB。

待办：

- 生成 upload keystore，并安全保存，不提交到仓库。
- 创建本地 `android/keystore.properties`，按模板填入：
  - `storeFile`
  - `storePassword`
  - `keyAlias`
  - `keyPassword`
- 执行正式构建：

```bash
npm run android:aab
```

- 确认产物存在：

```bash
ls -lh android/app/build/outputs/bundle/release/app-release.aab
```

### 3. 完成 Play Console App content 表单

Play Console 里这些内容是审核入口条件，不是代码仓库能完全替代的事项。

当前建议填写：

- Privacy policy：填公开可访问的隐私政策 URL。
- Ads：当前版本无广告 SDK，应填 `No`。
- App access：当前无登录、无账号、无访问限制，应填无受限内容。
- Data safety：当前版本不联网、不含广告/统计/账号 SDK，建议按“不收集/不共享用户数据”填写；仍需提交 Data safety 表单和隐私政策。
- Content rating：按休闲益智游戏、无用户生成内容、无暴力/血腥/赌博/社交功能填写。
- Target audience and content：按实际目标年龄段填写；如果选择儿童或家庭目标，会触发额外 Families policy 要求。

### 4. 判断账号是否需要 12 人 14 天 closed test

如果开发者账号是 2023-11-13 后创建的个人账号，生产发布前需要 closed testing：至少 12 个测试者连续 opt-in 14 天，然后才能申请 production access。

待办：

- 在 Play Console 确认账号类型和 production access 状态。
- 如果需要 closed test：
  - 建立测试者列表。
  - 上传 signed AAB 到 closed testing track。
  - 确认至少 12 个测试者 opt-in 并连续保持 14 天。
  - 收集测试反馈、崩溃/ANR 状态、核心玩法通过证据。
  - 到 Dashboard 申请 production access。

## P1 提审前必须补齐

### 5. 上传 Internal/Closed test 并跑 Pre-launch report

即使不受个人账号 closed-test 门槛影响，也建议先走 Internal testing。重点看 Google 设备云上的启动、WebView、触控、方向、安全区、性能和崩溃。

待办：

- 上传 signed AAB 到 Internal testing。
- 跑 Pre-launch report。
- 处理崩溃、ANR、兼容性、权限、渲染异常。
- 至少在 1 台真实 Android 设备上验证：
  - 首次启动
  - 开始游戏
  - 点击正确小羊
  - 点击错误对象失败态
  - 语言切换
  - 静音/声音切换
  - 退出重进进度恢复

### 6. 补齐 Play 商店截图

仓库已有 feature graphic 和 icon，但还缺 Play Console 截图资产。

最低要求：

- 至少 2 张手机截图。
- PNG/JPEG，无 alpha。
- 最小边不低于 320px，最大边不超过 3840px。

建议：

- 准备 4-8 张 9:16 手机截图，至少包括：
  - 主菜单
  - 初级关卡
  - 高密度关卡
  - 失败态/提示状态
  - 设置/多语言状态
- 如果希望覆盖平板推荐位，再补 7-inch/10-inch tablet 截图。
- 截图必须展示真实游戏画面，不要用误导性文案或与实际玩法不符的营销图。

### 7. 复核商店文案和分发国家/语言

当前商店中文文案在 `docs/store-metadata.zh-CN.json`。提审前需要确认 Play Console 内的实际文案、截图和应用内语言支持匹配。

待办：

- 确认 App 名称、短描述、完整描述不含夸大、排名、免费诱导、下载号召。
- 确认支持邮箱可用：`j.n.young0209@gmail.com`
- 如上架多个国家/地区，补英文 listing；否则先只用中文 listing 也可以，但要符合目标市场。
- 确认当前游戏声明“不含广告/内购/账号/联网关卡”与 AAB 实际一致。

### 8. 版本和发布节奏确认

当前版本是 `1.0.0` / `versionCode 1`。首版正式提交前确认是否保留。

待办：

- 如果已上传过同 package 的测试包且需要再传新包，递增 `versionCode`。
- 每次上传 Play Console 的 AAB 都记录：
  - git commit
  - versionCode
  - versionName
  - AAB 文件 SHA256
  - 测试轨道

## P2 上线质量

### 9. App 内补隐私政策/支持入口

现在公开 HTML 已在仓库里，但游戏内最好也能从设置/关于入口打开隐私政策和支持邮箱。这样审核员和用户更容易找到合规信息。

### 10. 关闭或明确“广告预留”体验

当前文档说明失败页和首页有“额外救援笔”入口，未来可能接激励广告。正式首版如果不接广告，需要确保 UI 不出现“看广告”“奖励广告”等实际承诺，避免 Ads 声明与用户体验不一致。

### 11. 首版 staged rollout

生产获批后建议不要直接 100% 发布。

建议节奏：

- 第 1 天：5%-10%
- 观察：崩溃率、ANR、差评关键词、安装失败、设备兼容
- 无异常后再逐步扩大

## 官方参考

- Target API level requirement: <https://developer.android.com/google/play/requirements/target-sdk>
- Play App Signing: <https://support.google.com/googleplay/android-developer/answer/9842756>
- Data safety form: <https://support.google.com/googleplay/android-developer/answer/10787469>
- New personal account testing requirements: <https://support.google.com/googleplay/android-developer/answer/14151465>
- Store preview assets: <https://support.google.com/googleplay/android-developer/answer/9866151>
