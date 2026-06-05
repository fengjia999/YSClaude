# YSClaude

YSClaude 是一个个人向的移动端 AI 客户端，基于 React Native + Expo 构建。主体验是 OpenAI 兼容对话，同时集成了工具调用、网页面板、AI 共读、日记、音乐/AI 电台、番茄专注和多角色副本等模块。

当前项目使用 Expo SDK 56。Expo 56 的版本化文档见 <https://docs.expo.dev/versions/v56.0.0/>；该版本对应 React Native 0.85、React 19.2.3，最低 Node.js 版本为 22.13.x。

## 技术栈

| 领域 | 当前选型 |
| --- | --- |
| App 框架 | Expo SDK 56 + React Native 0.85.3 |
| React | React 19.2.3 / React DOM 19.2.3 |
| 路由 | expo-router |
| 状态管理 | Zustand + zustand persist |
| 本地存储 | expo-sqlite，自定义 KV storage 适配 |
| 网络模型接口 | OpenAI 兼容 `/v1/chat/completions` 与 `/v1/models` |
| Markdown | @ronradtke/react-native-markdown-display |
| 音频 | expo-audio |
| WebView | react-native-webview |
| 文件与图片 | expo-file-system、expo-image-picker、Android 文件来源选择器 |
| 电子书解析 | fflate、fast-xml-parser |
| 系统能力 | expo-device、expo-battery、expo-calendar、expo-notifications |
| 图标/图形 | lucide-react-native、react-native-svg |
| 构建 | EAS Build，可产出 Android APK |

## 当前功能

### AI 对话

- OpenAI 兼容 API 配置，支持保存多个命名配置、切换模型、拉取模型列表和测试连接。
- 流式回复，支持停止生成、重新生成、编辑消息、删除消息、历史对话分页加载。
- 支持空输入触发 AI 继续回复，适合让模型基于当前上下文主动继续。
- 支持图片消息：从相册选择图片后转换为 `image_url` 多段内容发送给视觉模型，图片 URI 随消息落库。
- 支持 Markdown 渲染、代码块、表格横向滚动、`<thinking>...</thinking>` 思维内容折叠。
- 支持消息楼层与隐藏范围。隐藏范围按对话独立保存，重叠/相邻范围会合并，发送给模型时会跳过隐藏楼层。
- 自动注入运行时上下文：当前时间、相邻消息时间间隔、正在听的歌曲、打开的网页、专注事件、生理期记录等。
- 可选 Prompt Cache：对兼容的服务端在请求消息中添加 ephemeral cache control 标记。

### Tool 与网页能力

- Memory Vault：语义检索、日记查询、日记上传。
- Tavily Web Search：联网搜索实时信息。
- Web Page Reader：检测用户消息中的链接，读取网页标题、正文与摘要；可配置动态渲染服务。
- Web Interaction：App 内可见 WebView 面板，AI 可打开、观察、点击元素/selector、坐标点击和等待。
- AI 网页巡游：通过 UAPI 热榜挑选话题，结合 WebView 查看网页后生成自然回复。
- Native Tools：读取设备信息、电池状态、应用使用统计和系统日历；日历能力依赖 Expo Calendar 权限。
- 工具调用过程会显示在 AI 气泡上方，并持久化参数、结果与状态，便于调试。

### WebView 面板

- 可由用户主动打开，也可由 AI 工具打开。
- 支持拖动、缩放、收起为贴边悬浮入口、关闭会话。
- 内置首页、Bing 搜索框、收藏夹、地址栏、刷新/返回、收藏/取消收藏、UA 切换、缓存/Cookie 清理。
- 当面板有活动页面时，下次聊天请求会自动观察当前网页并附带给 AI。

### AI 共读

- 书架支持导入 `txt` / `epub`，解析正文、章节、作者和封面。
- 阅读页按章节阅读，保存阅读进度，支持目录跳转和章节底部自动切换。
- 长按句子可添加/移除划线，高亮记录独立存储。
- 共读对话独立于主聊天，可编辑/删除消息，显示楼层。
- 共读面板可拖动、缩放、折叠为悬浮球。
- AI 回复时会带入书名、作者、当前位置前方原文片段和最近共读对话。
- 可按楼层范围总结共读聊天，并保存为读书总结。
- 总结页按书聚合划线、AI 总结和手动读书心得；删除书后仍保留快照展示历史记录。

### 日记

- 在设置页「日记」tab 管理日记，支持新建、编辑、删除、收藏。
- 可从聊天消息范围生成第一人称日记总结。
- 收藏日记会注入主聊天 system 上下文，帮助 AI 了解近期生活记录。
- 可上传单篇日记到 Memory Vault；上传时确认日期，标题会并入正文。

### 音乐与 AI 电台

- 内置「一起听」播放器，支持播放/暂停、上一首/下一首、进度拖动、列表循环、单曲循环和随机播放。
- 支持时间轴歌词滚动，点击歌词可跳转播放进度。
- 支持桌面歌词开关和自定义桌面歌词背景。
- 歌单管理支持连接网易云 API，二维码登录，读取歌单并导入可播放歌曲。
- AI 电台会基于当前歌单生成固定节目、AI 主持串场和收尾，使用 TTS 播放主持词。
- 音乐播放上下文会自动附带到主聊天，AI 可知道当前歌曲、歌手、进度和歌词。

### 番茄专注

- 支持今日任务、倒计时/正计时、目标次数、暂停、继续、完成和放弃。
- 支持手动补记一次专注。
- 统计页支持按日期查看专注次数、总时长、任务分布饼图与明细。
- 专注事件会被主聊天读取为运行时上下文。

### Game 副本

- 支持创建独立多角色副本，包含旁白、总结 AI 和任意角色。
- 每个角色可绑定独立 OpenAI 兼容 API preset，支持 temperature 和 max tokens。
- 支持副本牌面、角色头像、角色气泡颜色、用户头像和头像显示开关。
- 房间中用户先发言，再手动选择旁白、总结 AI 或角色生成回复。
- 支持消息编辑/删除、清空房间、隐藏楼层范围，隐藏消息不会发给副本 AI。

### 美化、悬浮球与设备入口

- 设置页「美化」支持自定义顶栏图标、输入框图标、聊天背景、输入框背景、用户/AI 头像、昵称、字体大小、气泡颜色、透明度、圆角和主题快照。
- 设置页「悬浮球」支持 Android 悬浮球开关，以及 TTS 相关悬浮操作。
- 顶栏中间的 Clawd 入口进入 M5Stack 页面，目前是硬件连接配置预留页。
- 支持浅色/深色主题，使用内置 Sohne、Sohne Mono、Tiempos Text 字体。

## 配置入口

### API 配置

设置页「API 配置」中填写：

- `Base URL`：OpenAI 兼容接口地址，例如 `https://api.openai.com/v1`
- `API Key`
- `Model`
- 配置名称

模型列表拉取使用 `${Base URL}/models`，聊天请求使用 `${Base URL}/chat/completions`。

### 对话设置

设置页「对话设置」中可配置：

- 主聊天 System Prompt 与 Prompt 预设。
- 最大输出 token。
- 是否从上下文中剔除 `<thinking>...</thinking>`。
- 隐藏楼层范围。
- 是否启用 Prompt Cache。
- 是否把生理期记录附带给 AI。

### TTS 配置

设置页「TTS 配置」使用 MiniMax T2A：

- `Group ID`
- `API Key`
- `Voice ID`
- 模型，例如 `speech-02-hd`、`speech-02-turbo`、`speech-2.8-hd`
- 语速、音量、音调

TTS 用于普通消息朗读，也用于 AI 电台主持词。

### Tool 设置

设置页「Tool 设置」可分别启用：

- Memory Vault：填写 Base URL、管理员 Token、返回条数、token 预算、最大调用次数。
- Web Search：填写 Tavily API Key 和最大结果数。
- Web Page Reader：开启链接读取，可选渲染服务地址。
- Web Interaction：设置每轮最大网页操作次数。
- AI 网页巡游 Hotboard：填写 UAPI API Key 并选择热榜平台。
- Native Tools：设备信息、电池状态、应用使用统计、日历。

### 共读设置

AI 共读页「设置」中可配置独立 API，也可以复制当前主聊天 API：

- `Base URL`
- `API Key`
- `Model`
- 共读 System Prompt
- 总结 System Prompt
- 每次附带的原文字数
- 每次附带的最近对话条数

### 网易云音乐

音乐页进入「歌单管理」后填写网易云 API 地址，例如局域网中的 NeteaseCloudMusicApi 服务地址。登录流程为：

1. 填写 API 地址。
2. 点击获取二维码。
3. 用网易云音乐扫码。
4. 点击确认登录。
5. 刷新歌单并导入。

## 运行与检查

本项目在 Windows PowerShell 下开发时请使用 `npm.cmd` 和 `npx.cmd`，避免 PowerShell 执行被拦截的 `.ps1` shim。

```bash
# 安装依赖
npm.cmd install

# 启动 Expo 开发服务器
npx.cmd expo start

# Android development build
npm.cmd run android

# Web 预览
npm.cmd run web

# 类型检查
npm.cmd run typecheck
```

部分能力需要 development build 或 Android 权限：

- 应用使用统计依赖 Android 原生能力和系统「使用情况访问权限」。
- 悬浮球需要系统悬浮窗权限。
- 日历工具首次使用会请求系统日历权限。
- 后台音频、通知和 TTS 依赖对应 Expo 插件与权限配置。

## 构建

`eas.json` 已包含 development、preview 和 production profile：

```bash
# 内部分发 APK
npx.cmd eas build --platform android --profile preview

# development client APK
npx.cmd eas build --platform android --profile development
```

Android 包名为 `com.ysclaude.app`。Expo owner 为 `linwang_004`，EAS projectId 已写入 `app.json`。

## 项目结构

```text
app/
├── _layout.tsx              # 根布局、字体、通知、WebViewPanel、悬浮球和全局监听
├── index.tsx                # 主聊天页
├── history.tsx              # 历史对话
├── settings.tsx             # 设置页：API/对话/TTS/Tool/日记/悬浮球/美化
├── focus.tsx                # 番茄专注
├── music.tsx                # 播放器与 AI 电台入口
├── music-playlists.tsx      # 网易云歌单管理
├── m5stack.tsx              # Clawd/M5Stack 设备配置预留
├── chat/[id].tsx            # 历史对话详情
├── reading/
│   ├── index.tsx            # 共读书架、总结、共读设置
│   └── [id].tsx             # 阅读页、划线、目录、共读面板
└── game/
    ├── index.tsx            # 副本列表、API preset、场景配置
    └── [id].tsx             # 副本房间

src/
├── components/              # 聊天气泡、输入框、模型选择器、WebView 面板等
├── db/                      # SQLite 初始化、迁移、CRUD、KV storage
├── hooks/                   # 键盘高度等通用 hook
├── services/                # API、TTS、工具、WebView、音乐、导入、通知等服务
├── services/toolModules/    # Memory Vault、Web Search、网页读取、WebView、Native Tool、Hotboard
├── stores/                  # chat/settings/diary/focus/music/netease/radio/game/period
├── theme/                   # 颜色与字体
├── types/                   # 全局 TypeScript 类型
└── utils/                   # 时间、楼层范围、贴纸、热榜平台、专注/生理期上下文等
```

## 数据持久化

- SQLite 数据库名：`ysclaude.db`
- 表：对话、消息、日记、生理期记录、共读书籍、共读消息、阅读笔记、划线、专注任务、专注会话等。
- Zustand persist 通过 `src/db/kv-storage.ts` 落到 SQLite，保存设置、音乐、网易云、游戏副本等状态。
- 数据库迁移基于 `PRAGMA user_version`，并额外用列存在性检查避免全新安装重复 ALTER。

## 主要外部服务

- OpenAI 兼容聊天/模型接口。
- MiniMax T2A。
- Memory Vault，自建记忆库服务。
- Tavily Search。
- UAPI 热榜。
- 可选网页渲染读取服务。
- NeteaseCloudMusicApi 或兼容网易云接口。

## License

MIT
