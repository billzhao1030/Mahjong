# 国标麻将 · Guobiao Mahjong (MCR)

一个网页版单机国标麻将：你对阵三名 AI，完整一场 **4 圈 16 局**，
严格按《中国麻将竞赛规则》自动算番与结算，生涯数据持久化到本地数据库。

A single-player web implementation of **Chinese Official Mahjong (MCR)**:
you versus three bots over a full 4-round, 16-hand match, with the complete
official fan table scored automatically and career stats stored in a local database.

---

## 快速开始 / Quick start

需要 **Node.js 22 或更新版本**，除此之外没有任何依赖：不用 `npm install`，不用打包构建。

Requires **Node.js 22+**. There are no dependencies at all — no `npm install`, no build step.

```bash
node server.js
```

然后浏览器打开 **http://localhost:8030/**

### 最省事的方式：桌面图标

* **macOS** — 桌面上的 **国标麻将.app**（游戏文件本体在 `~/mahjong`）。点一下就行：
  服务器没起就自动起，已经起了就直接打开网页。不会留终端窗口。
* **Windows** — 双击项目里的 **`play.bat`**（逻辑相同：没起就起，起了就开网页）。
  想放到桌面：右键 `play.bat` →「发送到」→「桌面快捷方式」。

也可以只启动服务器不开浏览器：`start.bat`（Windows）/ `start.command`（macOS）/ `start.sh`（Linux）。

> **为什么游戏文件夹在 `~/mahjong` 而不是桌面？**
> macOS 把「桌面」「文稿」「下载」列为隐私保护目录（TCC）。双击启动的 App 默认没有这些目录的
> 访问权限，会导致服务器根本起不来（日志里是 `EPERM / uv_cwd`）。放在主目录根下就完全不受此限制，
> 不需要任何授权。桌面上的 `mahjong` 是指向它的快捷方式，照常双击即可查看文件。
>
> 如果把文件夹移到别处，App 会依次在主目录、桌面、Documents、Downloads 里查找；都找不到会弹窗提示。
>
> 换一台 Mac 时，克隆仓库到 `~/mahjong` 后执行 `bash tools/make-macos-app.sh` 即可重新生成桌面图标。

> **Windows 没有这个限制**，项目放桌面、`C:\Games` 等任意位置都可以。

---

## Windows 配置步骤（详细）

### 1. 安装 Node.js

1. 打开 <https://nodejs.org/> ，下载 **LTS** 版本的 Windows Installer（`.msi`，64-bit）。
   版本需要 **22 或更高**；推荐 24 LTS 及以上。
2. 一路"下一步"安装，保持默认选项（安装程序会自动把 `node` 加入 PATH）。
3. 安装完成后**新开**一个 PowerShell 或命令提示符窗口，验证：

```powershell
node -v
```

应输出类似 `v24.8.0`。如果提示 `'node' 不是内部或外部命令`，说明 PATH 未生效——
重启终端；仍不行则重启电脑，或在安装时勾选 "Add to PATH"。

> 也可以用包管理器安装：
> ```powershell
> winget install OpenJS.NodeJS.LTS
> ```

### 2. 放置项目

把整个 `mahjong` 文件夹复制到 Windows 上任意位置，例如 `C:\Games\mahjong`（桌面也可以）。
文件夹内应包含 `server.js`、`db.js`、`package.json`、`public\` 和 `start.bat`。

### 3. 启动

**方式一（最简单）**：双击 `start.bat`。会弹出一个黑色窗口显示服务器地址，保持它开着。

**方式二（推荐日常使用）**：双击 `play.bat`。它会检查服务器是否已经在跑，
没跑就在后台起一个最小化窗口，然后自动打开浏览器。右键它「发送到 → 桌面快捷方式」，
以后就在桌面点一下进游戏。

**方式三（命令行）**：

```powershell
cd C:\Games\mahjong
node server.js
```

看到下面的输出就成功了：

```
  国标麻将 / MCR Mahjong
  storage : sqlite  (data/mahjong.db)
  local   : http://localhost:8030/
  network : http://192.168.x.x:8030/
```

### 4. 打开游戏

浏览器访问 **http://localhost:8030/** 。推荐 Edge / Chrome / Firefox 任意较新版本。

关闭服务器：在那个黑窗口里按 `Ctrl + C`。

### 5. 防火墙与局域网访问

第一次运行时 Windows 可能弹出 **"Windows 安全中心警报"**，询问是否允许 Node.js 通信。
* 只想自己在这台电脑上玩 → 点"取消"也没关系，`localhost` 依然可用。
* 想让同一 WiFi 下的手机 / 平板 / 别的电脑也能玩 → 勾选 **"专用网络"** 并点"允许访问"，
  然后用启动时打印的 `network:` 地址访问。

如果当时点错了，可以手动放行：

```powershell
# 以管理员身份运行 PowerShell
New-NetFirewallRule -DisplayName "Guobiao Mahjong 8030" -Direction Inbound -LocalPort 8030 -Protocol TCP -Action Allow -Profile Private
```

### 6. 换端口

端口 8030 被占用时可以改：

```powershell
# PowerShell
$env:PORT=9000; node server.js
```
```cmd
:: 命令提示符 cmd
set PORT=9000 && node server.js
```

查看 8030 被谁占用：

```powershell
netstat -ano | findstr :8030
```

### 7. 开机自动启动（可选）

按 `Win + R`，输入 `shell:startup` 回车，把 `start.bat` 的**快捷方式**放进打开的文件夹即可。

---

## 常见问题 / Troubleshooting

| 现象 | 原因与处理 |
| --- | --- |
| `'node' 不是内部或外部命令` | Node.js 未安装或 PATH 未生效。重开终端，或重装 Node.js 并确认勾选 Add to PATH。 |
| `Error: listen EADDRINUSE :::8030` | 端口被占用。改用其他端口（见上），或结束占用进程。 |
| 启动时出现 `ExperimentalWarning: SQLite is an experimental feature` | 正常提示，不影响使用。用 Node 24+ 不会出现。 |
| 控制台打印 `node:sqlite unavailable … falling back to JSON store` | 你的 Node 版本不带内置 SQLite。程序会自动改用 `data/mahjong.json` 存档，**功能完全一致**，无需处理。 |
| 页面打开是空白 | 确认访问的是 `http://localhost:8030/` 而不是直接双击 `public/index.html`（必须经服务器访问）。 |
| 想清空所有记录 | 主菜单 →「生涯档案」→「清空档案」；或直接删除 `data/` 文件夹。 |
| macOS 点图标没反应 | 说明 App 被隐私保护挡住了。确认游戏文件夹在 `~/mahjong`（不要放桌面/文稿/下载），日志见 `~/Library/Logs/GuobiaoMahjong.log`。 |

---

## 玩法说明

* **开始新游戏** — 先选 **起胡番数** 和 **难度**，整场 16 局沿用同一设置。

  | 起胡番数 | 说明 |
  | --- | --- |
  | 0 番 | 练习模式，任何胡牌牌型都能和 |
  | 4 番 | 入门模式，节奏更快 |
  | 8 番 | 国标标准，正式比赛使用 |

  | 难度 | AI 行为 |
  | --- | --- |
  | ★ 新手 | 只顾向听数，不看番种，鸣牌不管能不能胡，还会偶尔失误 |
  | ★★ 普通 | 计算有效进张和番型潜力，字牌取舍合理 |
  | ★★★ 高手 | 规划番型目标（清一色/碰碰和/断幺等），评估各家听牌威胁，落后时打现物安全牌弃和，牌墙将尽时不轻易补杠 |
  | ★★★★ 大师 | 在高手之上：听牌时用算番引擎逐张核算每种和牌张**到底能不能和、值多少番**，绝不做够不到起胡番的牌；防守加入壁牌（kabe）推理；前半局重番型、后半局重速度；手牌无望时彻底弃和只打安全牌 |

  实测（同一参考策略分别对阵各档，相同牌局种子配对比较）：对手越强，参考方净分越低。

* **运气** — 0–100%，默认 **50%（公平对局）**。
  调高后你更容易摸到需要的牌，别家也更容易打出你能吃碰杠胡的牌；调低则相反。
  实现上**不改变牌的总张数**，只调整尚未摸到的牌的顺序，以及 AI 在几张等价好牌之间的取舍
  （绝不会让 AI 打出损害自己牌型的牌）。50% 时这两处逻辑完全不生效。
* **继续游戏** — 接着上次未打完的 16 局继续；进度在每局结束时自动保存。
* **本局统计** — 对局中随时查看四家牌河、副露、花牌、余牌数以及自己的听牌张。
* **胡牌手册** — 全部番种一览，按番数分组，可搜索；已达成过的番种会高亮。
  **每个番种都配一副画出来的示例牌型**：副露的牌组带底色下划线，暗杠两端盖牌，
  和牌张用金框标出。所有示例都经过算番引擎自动校验，确保确实能算出该番种。
* **规则讲解** — 牌张构成、行牌流程、起胡番数、计分方式、算番五原则、界面操作。
* **中 / English** — 右下角（或对局界面右上角）一键切换，选择会被记住。

操作：轮到你时点手牌即可打出；可以吃碰杠胡时下方会出现按钮，不想操作点「过」。

### 计分

底分 8 分。

* **自摸**：另外三家各付 `8 + 番数`
* **点和**：点炮者付 `8 + 番数`，其余两家各付 `8`
* **荒牌**：不计分

花牌每张计 1 番并参与支付，但**不计入起胡番的门槛**。

---

## 项目结构

```
mahjong/
├── server.js            静态服务 + 持久化 API（仅用 Node 内置模块）
├── db.js                node:sqlite 存储层，缺失时自动降级为 JSON
├── data/mahjong.db      生涯数据与存档（自动创建）
├── tools/
│   ├── make-macos-app.sh   在 macOS 桌面生成「国标麻将.app」图标
│   └── make-icon.js        纯 Node 绘制应用图标（无依赖）
├── play.bat             Windows 一键游玩（自动起服务 + 开浏览器）
├── start.bat            Windows 启动脚本（只起服务）
├── start.command        macOS 启动脚本
├── start.sh             Linux 启动脚本
└── public/
    ├── icon.png         应用图标（桌面 .app 用的同一张）
    ├── fonts/           本地打包的字体（Quicksand + 中文圆体子集 + 牌面宋体子集）
    ├── index.html
    ├── css/style.css    3D 牌桌样式
    └── js/
        ├── tiles.js     牌张编码、理牌（条→筒→万→风→箭）、洗牌
        ├── hand.js      手牌拆解、和牌判定、听牌、向听数
        ├── fandefs.js   番种表（名称 / 番数 / 中英文说明 / 示例牌型），胡牌手册的数据源
        ├── fan.js       算番引擎：枚举所有解释并取最高
        ├── ai.js        四档难度的出牌与鸣牌决策
        ├── game.js      对局状态机：发牌、补花、摸打、鸣牌、抢杠、结算、存读档
        ├── tileface.js  牌面 SVG 绘制（不依赖字体，跨平台一致）
        ├── i18n.js      中英文案与教程内容
        └── ui.js        界面渲染、交互、面板、与后端通信
```

### 数据存储

默认使用 Node 内置的 `node:sqlite`，数据库文件在 `data/mahjong.db`，包含四张表：

* `profile` — 总场数、胜场、和牌 / 负局 / 荒牌局数、点炮次数、自摸次数、累计得分、最佳和牌
* `patterns` — 每个番种达成的次数与首次 / 最近时间
* `hand_log` — 每一局的详细记录
* `savegame` — 未打完对局的完整存档（可继续）

若运行环境不支持 `node:sqlite`，会自动改用 `data/mahjong.json`，接口与行为完全相同。

---

## 算番引擎说明

引擎会枚举一手牌的**所有**合法解释（4 面子 + 将、七对、十三幺、全不靠、组合龙），
分别算番后取最高（就高不就低），并应用番种互斥表（不重复 / 不计）。

几处实现口径，写在这里以便查证：

* **不拆移原则**用于「牌组组合类」番种（一般高、喜相逢、连六、老少副、双同刻及其三副 / 四副的升级番种）：
  每副牌最多参与其中一个番种，引擎取总番最高的互不相交组合。
* **暗刻 / 杠类**与**整手牌类**（清一色、碰碰和等）属于不同维度，各自独立计算，
  因此四暗刻与一色四节高可以同时计入。
* **边张 / 坎张 / 单钓将**仅在确实是单一听牌时才计，多面听不计。
* **幺九刻**与箭刻、圈风刻、门风刻叠加：东圈东家的东风刻 = 圈风刻 2 + 门风刻 2 + 幺九刻 1 = **5 番**。
* **无番和**仅在完全算不出任何番种时计 8 番；只凑到 1–7 番的牌在 8 番门槛下不能和。

---

## English quick reference

* **Start**: `node server.js` (or double-click `start.bat` on Windows), then open `http://localhost:8030/`.
* **Requirements**: Node.js 22+. No dependencies, no build.
* **Port**: set the `PORT` environment variable to change it from 8030.
* **Data**: `data/mahjong.db` (SQLite) or `data/mahjong.json` (automatic fallback).
* **Language**: toggle 中文 / English from the main menu or the in-game top bar.
* **Minimum fan**: choose 0, 4 or 8 when starting a match; 8 is the official MCR setting.
* **Difficulty**: Novice / Standard / Expert / Master, chosen per match alongside the minimum fan.
* **Luck**: 0–100%, default 50% (fair). Higher favours your draws and the tiles bots let go;
  it never changes how many of each tile exist, only the order of what is still to come.
* **One-click launch**: `国标麻将.app` on the macOS desktop, or `play.bat` on Windows — both start
  the server only if it is not already running, then open the browser.
