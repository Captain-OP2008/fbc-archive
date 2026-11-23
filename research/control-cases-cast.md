# 《控制》(Control, Remedy 2019) 案例档案 · 人物 · 文档文本 研究笔记
English + 中文对照 | 主要信源：Control Fandom Wiki (control.fandom.com)

---

## 0. 研究说明与可复现性（Read this first）

**目标站点控制台封锁说明**：本会话所在网络无法直连 `control.fandom.com`（DNS/SNI 层被阻断，Playwright 亦超时），`archive.today` / `textise.net` / `r.jina.ai` / 各类 CORS 代理均不可用。最终可用通道为三条：

1. **W3C html2txt 纯文本代理**（`https://www.w3.org/services/html2txt?url=<encoded fandom url>`）：可读取 Fandom 页面的 `?action=render`（正文）与 `?action=raw`（wikitext 源码），信息密度最高，本条笔记的**主体内容来自此通道**。抓取约 10 页后被 Cloudflare 429，随后不可用。
2. **DuckDuckGo HTML 检索**（`html.duckduckgo.com/html/?q=...`）：Fandom 页面的首段/首句快照，用于补齐物品与文档条目。
3. **Bing（cn.bing.com）** 与 harness `web_search`：交叉核对页面标题与首句。

**置信度分级**（下文标注）：
- `[已核验]` = 本次会话从 Fandom 页面正文/wikitext 直接读到；
- `[快照]` = 来自搜索引擎缓存的该页首段，文字与页面一致但**可能被截断**（截断处标 `[截断]`）；
- `[记忆·未核验]` = 通用游戏知识/我的记忆，本次未能从 Fandom 核验，**引用前须复核**；
- `[存疑/未命中]` = 本次检索未找到对应条目，可能并非本作内容。

**未能取到的东西（诚实清单）**：`?action=raw` 的 Timeline / Altered_Item / Object_of_Power 三页在工具回传时被**中段裁剪**，因此 OOP 完整编号-日期总表、AWE 完整编号总表我**没有拿到**（下文只写我有直接证据的部分）；带 `■■■` 涂黑的原文样张、"For your eyes only" 字样本次未命中任何样本，故不伪造引用。

---

## 1. 术语对照表（English → 中文）

| English | 中文（本笔记统一译法） | 备注 |
|---|---|---|
| Federal Bureau of Control (FBC) | 联邦控制局 | 官方简中常用 |
| Oldest House | 最古老之屋 | 官方简中译名 |
| Altered Item (AI) | 异化物 | 官方简中 |
| Object of Power (OoP/OOP) | 能量之体 | 中文 Fandom 用「能量之体」 |
| Altered World Event (AWE) | 异世界事件 | 中文 Fandom 页名 |
| The Board | 董事会 | 亦译「委员会」 |
| The Hiss | 希斯 | 官方简中 |
| Polaris | 北极星 | 官方简中 |
| Hedron | 赫德隆（音译） | 简中官方译名未能核验 |
| Panopticon | 全景监狱 | 收容区内的收容设施 |
| Astral Plane | 星界 | 亦译「星体层」 |
| Slidescape-36 | 幻灯世界-36（Slidescape-36） | 不逐字意译 |
| Threshold | 阈界 | 亦译「门径」 |
| Parautilitarian | 超能者 | 亦译「灵能使用者」 |
| Place of Power | 力量之地 | |
| Service Weapon | 公务武器 | 官方简中 |
| Director | 局长 | |
| Prime Candidate | 首席候选人 | P6/P7 |
| Hedron Resonance Amplifier (HRA) | 赫德隆共振增幅器（HRA） | |
| Dead Letters | 死信 | 行政区邮件档案馆 |

---

## 2. 异化物与能量之体（Altered Items & Objects of Power）

### 2.1 定义（[已核验]，取自 Fandom /wiki/Altered_Item 与 /wiki/Object_of_Power）

> **Altered Items** are ordinary objects which have been acted upon by paranatural forces during Altered World Events, resulting in the development of unique and sometimes dangerous properties. They are distinguished from Objects of Power in that they lack an inherent connection to the **Board**, or the ability for parautilitarians to bind to them and wield their abilities.
> — Control Wiki, "Altered Item"
>
> **异化物**是普通物件在**异世界事件**中被超自然力量作用的产物，因而发展出独特且往往危险的性质。它们与能量之体的区别在于：异化物与**董事会**没有内在联系，超能者也无法与之「绑定」并使用其能力。

> The term "Altered Item" is modern FBC terminology. Prior to the death of Director Theodore Ash, Sr. in 1964, the FBC employed the term "Possessed Object" instead, which reflected the organization's origins in occultism.
> — Control Wiki, "Altered Item"（[已核验]）
>
> 「异化物」是控制局的现代术语。1964 年局长西奥多·阿什（老阿什）去世前，控制局使用的词是「**被附身之物**（Possessed Object）」，这反映了该机构起源于神秘学。

同页另一条术语史（[已核验]，/wiki/Altered_World_Event）：**「异世界事件」也是现代术语**，1964 年前控制局称之为「**超维事件**（Paradimensional Occurrence）」。

### 2.2 名录（含编号 / 收容 / 效应 / 生动细节）

下表合并了「[已核验]」条目、Fandom 页首段快照与明确标注的记忆补全。**编号格式**：`AIxx-XX` = 异化物；`OOPxx-XX` = 能量之体；后缀（KE/UE/PE/BE/AE）为控制局内部代码。

| # | 名称 (EN) | 中文 | 编号 | 类型 | 收容/位置 | 效应 | 生动细节 | 置信度 |
|---|---|---|---|---|---|---|---|---|
| 1 | Service Weapon | 公务武器 | OOP1-KE | OoP | 局长办公室；绑定于局长 | 局长专属武器，可变换形态（Grip/Shatter/Spin…） | 1964-08-04「Entry Day」由**诺斯莫尔**在纽约发现最古老之屋时取得；他声称遇见了「董事会」 | [已核验]（编号/日期/来历来自 Timeline 页） |
| 2 | Hotline | 热线 | OOP3-UE | OoP | 局长办公室 | 与**董事会**及其他超自然实体通讯 | 1965-08-09 一架**胶木（Bakelite）电话**自行显现在局长办公室；**仅局长可用，他人使用会致死** | [已核验]（Timeline + [Hotline (Case Files)] 引用） |
| 3 | The Oscillator | 振荡器 | AI3-KE | AI | 收容区（推定） | 未取到 | 1954-07-28 被控制局收管；公共知识与转移部主管 **William S. Powers** 抱怨局里对该物件的掩盖处理 | [已核验]（Timeline） |
| 4 | Game Hammer | 游戏锤 | AI5-BE | AI | 收容区（推定） | 接触者染上**类麻风病** | 1956 年**微笑嘉年华**巡演城镇的年轻男子在触碰后发病；1959-11-02 被收管 | [已核验]（Timeline） |
| 5 | Waist Mannequin | 腰部人体模型 | AI7-KE | AI | 收容区（推定） | 未取到 | 1967-12-23 被收管 | [已核验]（Timeline） |
| 6 | Arctic Queen | 北极女王 | AI10-KE | AI | 全景监狱（Containment Sector） | 必须被**持续注视**，否则周边人员会疼痛乃至死亡 | 这就是「**冰箱值守**（Fridge Duty）」里的那台冰箱；初级探员 **Phillip Philson** 因失守而死 | [已核验]/[记忆·未核验]（编号与「持续注视」来自 Altered_Item 正文与 Langston 页；「冰箱=北极女王」为我的记忆，标存疑） |
| 7 | (未具名婴儿车) | 巴黎古董店婴儿车 | AI13-KE | AI | 收容区 | 不断**冒烟** | 「an old baby carriage discovered in a Paris antique shop that constantly produces smoke」——同一句里被点名为「看似随机、无意义」的能力范例 | [已核验]（Altered_Item 正文） |
| 8 | (未具名邮筒) | 亚利桑那州贾斯珀十字路口邮筒 | AI31-PE | AI | 收容区 | 使**附近任何人瘫痪** | 「a post box from Jasper Crossing, Arizona that paralyzes anyone near it」 | [已核验]（Altered_Item 正文） |
| 9 | Pink Flamingo | 粉红火烈鸟 | AI46-KE | AI | 全景监狱 | 疑似影响**大气物理**，改变区域内气象 | 1997-08-12 就在控制局总部**大门外**被发现；档案：一名流浪汉常抱着它，大声宣称「天气不好是我的功劳」 | [快照]（Pink Flamingo 页 + Pink Flamingo Supplement 档案原文） |
| 10 | Red Light (Traffic Light) | 红绿灯 | AI49-KE | AI | 全景监狱 | 效应可被**阳光**压制；四面各三灯（红黄绿） | 档案原文见 §5.2，含 `CONTAINMENT PROCEDURE:` / `DESCRIPTION/ALTERED EFFECT:` 标准字段 | [快照] |
| 11 | Rubber Duck | 橡皮鸭 | AI52-AE | AI | 研究区（Luck & Probability 外走廊男洗手间）；档案存于该处 | **禁止直接接触**，须戴防护手套 | 1950 年代黄色浴用橡皮鸭，底部单孔可进出空气与水；档案副标题为「Rubber Duck Procedures AI52 Testing」 | [快照]（Rubber Duck Procedures / Supplement） |
| 12 | Swan Boat | 天鹅船 | 未取到 | AI | 全景监狱 | 无特殊程序 | 玻璃钢制、漆成天鹅形，脚踏板可在水中推进；1983-06-24 被收管 | [快照] |
| 13 | ActionMaxx Camera | ActionMaxx 摄影机 | 未取到 | AI | 未取到 | 把现实**改写成动作片** | 1968 年撒丁岛一部电影拍摄中剧组人员死亡，疑与该机有关；后售予「蒙福影业」（Blessed Pictures） | [已核验]（Altered_Item 正文 + Timeline） |
| 14 | Eagle Limited (train car) | 雄鹰特快车厢 | 未取到 | AI | 收容区 | 反复**重演**事故当时的情绪、记忆与创伤 | 关联「雄鹰特快异世界事件」：一场**超自然恐怖袭击**杀死全车人 | [已核验]（Altered_Item 正文） |
| 15 | Human Hand Chair | 人手椅 | 未取到 | AI | 维护区（事件地） | 极危险，曾差点团灭一支游骑兵小队 | 网上流言称当地「每逢满月」出事，被当成**狼人**；实际是一把**手形椅子**；七名幸存者各留一枚**银弹**挂在颈袋里 | [已核验]（Simon Arish 页） |
| 16 | Whiskey Flask | 威士忌酒壶 | 未取到 | AI | 未取到 | 未取到 | 仅作为**开场字幕动画**里的「Altered Object document」被截图辨认 | [已核验]（Altered_Item 页图注） |
| 17 | Floppy Disk | 软盘 | OOP5-KE | OoP | 行政区（邮箱室一线） | 授予 **Launch**（意念投掷） | 玩家最早绑定的能量之体之一 | [记忆·未核验]（编号与授予能力均未核验） |
| 18 | Benicoff TV | 贝尼科夫电视 | OOP7-KE | OoP | 全景监狱 716 号加固单元 | 授予 **Levitate**（悬浮） | 页首配图即该电视；旧安保主管 **Lin Salvador** 无视 Langston 警告前去收容后失踪 | [记忆·未核验]+[已核验]（Salvador 一段来自 Langston 页） |
| 19 | X-Ray Light Box | X 光观片灯箱 | OOP18-PE | OoP | 研究区**心理学部（Parapsychology）催眠实验室** | 接触它可进入/记录**星界**（Astralnauts 计划） | 档案《Astralnauts Information》：「评估候选人资格、训练流程与星界研究程序……星界宇航员通过与 X 光观片灯箱发生物理接触来探索星界（详见案卷 OOP18）」 | [快照]（Astralnauts Information） |
| 20 | Merry-Go-Round Horse | 旋转木马 | OOP16-KE | OoP | 收容区（曾**脱逃**） | 未取到（传闻与机动能力有关） | 保安主管 Arish 发内部通告警告下属**不要自行绑定**这匹脱逃的旋转木马 | [快照]（Arish: Escaped OoP）+编号[记忆·未核验] |
| 21 | Songmaster Jukebox | 歌王点唱机 | OOP10-KE | OoP | 未取到 | 未取到 | 玩家社区常以其为「会放歌的能量之体」记忆点 | [记忆·未核验] |
| 22 | Ashtray and Cigarette | 烟灰缸与香烟 | OOP11-KE | OoP | 未取到 | 未取到 | 与「烟灰缸迷宫」（Ashtray Maze，Ahti 的试炼）同名意象 | [记忆·未核验] |
| 23 | Slide Projector | 幻灯机 | OOP15-UE | OoP | 最古老之屋（研究区/最古老之屋收容） | 通过幻灯片打开通往其他维度的门（slidescape） | **2002 年平凡镇异世界事件的起因**；特伦奇用它**放出了希斯**，随后死于办公室；杰西当年烧掉了除一张以外的所有幻灯片 | [已核验]（Casper Darling / Timeline / Jesse Faden 页） |
| 24 | Home Safe | 家用保险箱 | OOP22-KE | OoP | 最古老之屋 | 绑定后授予 **Shield**（护盾） | 「Guardhouse」牌家用保险箱，表面锈蚀刮花，门上标签有部分残缺；2014-11-28 被发现，绑定发生在支线「A Good Defense」 | [快照]（Home Safe 页） |
| 25 | Victorian Mirror | 维多利亚镜子 | 未取到 | AI | 未取到（档案提及） | 未取到 | 1914 年 **Carver 太太**一家迁往伊利诺伊州；1915-08-18 她被送进精神病院 | [已核验]（Timeline，引 [Mirror Supplement]） |
| 26 | The Furnace | 熔炉 | — | **力量之地**（非异化物） | 维护区（Ahti 的地盘） | 焚烧异物，与 Ahti 的清洁任务绑定 | 任务「What a Mess」：把垃圾丢进熔炉；Ahti 以清洁工身份调度局长干活 | [记忆·未核验]（性质标注存疑） |
| 27 | Punch Card | 打孔卡 | — | — | — | — | **本次检索未在 Control Fandom 找到此物件**；推测为与「软盘（Floppy Disk）」混淆 | [存疑/未命中] |

> 补充（[已核验]，Timeline 页注）：档案日期写作 `Month Date` 或 `MM/DD/YYYY` 两种格式并存 —— 这本身就是控制局文书的一个小特征。

---

## 3. 异世界事件（Altered World Events / AWE）

**定义（[已核验]）**：

> Altered World Events (AWEs) are events in which paranatural forces intrude upon our universe, resulting in reality being altered. AWEs are responsible for the existence of Altered Items and Objects of Power.
> — Control Wiki, "Altered World Event"
>
> **异世界事件（AWE）**是超自然力量侵入我们的宇宙、导致现实被改写的事件。异化物与能量之体的存在都源于 AWE。

| # | 事件 | 中文 | 编号 | 地点 | 年份/日期 | 内容 | 置信度 |
|---|---|---|---|---|---|---|---|
| 1 | Meteor Hill AWE | 流星山异世界事件 | **AWE-3** | 威斯康星州索耶县 | 1958-06-23 | 有《Meteor Hill Summary》《Meteor Hill Supplement》两份档案；公共知识与转移部参与掩盖 | [已核验]（Timeline） |
| 2 | Ordinary AWE | 平凡镇异世界事件 | **AWE-24** | 缅因州平凡镇（Ordinary） | 2002-08-30 起 | **全镇成年人消失，只剩孩子**；杰西与迪伦带特伦奇、达林找到幻灯机；控制局收走幻灯机并**带走迪伦**，杰西逃脱 | [已核验]（Casper Darling 页明写「see AWE-24」，Jesse 页写 08/30/2002） |
| 3 | Butte AWE | 比尤特异世界事件 | 未取到 | 蒙大拿州比尤特 | 1992（海景旅馆发现日 09/23/1992） | **海景汽车旅馆 & 赌场**由此事件被发现/进入 | [已核验]（Oceanview Motel 页） |
| 4 | Bergen Peak AWE | 卑尔根峰异世界事件 | 未取到 | 未取到 | 未取到 | 海伦·马歇尔**独自解决**了它，由此奠定她在局内的强硬名声 | [已核验]（Helen Marshall 页 Trivia） |
| 5 | Eagle Limited AWE | 雄鹰特快异世界事件 | 未取到 | 未取到（列车） | 未取到 | 一起**超自然恐怖袭击**杀死全车乘客；车厢成为异化物，不断重演惨剧 | [已核验]（Altered_Item 正文） |
| 6 | Sterling AWE | 斯特灵异世界事件 | 未取到 | 斯特灵（Sterling） | 未取到 | 「**斯特灵事件的残骸**存放在收容区」（页面配图说明）；任务点名清单中的一项 | [已核验]（AWE 页配图注）+[记忆·未核验]（细节） |
| 7 | Keystone（疑似 AWE） | 拱心石镇（疑似） | 未取到 | 拱心石镇（Keystone） | 未取到 | 调查另一桩 AWE 的探员发现整座镇**空无一人**，多栋建筑上印着「**重叠圆环**」符号；该符号即海景旅馆六扇门之一 | [已核验]（Oceanview Motel 页，引 [Keystone Inspection]） |
| 8 | Bright Falls / Cauldron Lake | 亮瀑镇 / 釜湖 | 未取到 | 华盛顿州亮瀑镇 | 亮瀑镇 1878 年建镇 | **Alan Wake 交叉**：1970 年诗人 Thomas Zane 失踪等事件属《Alan Wake》线；Control 侧只在时间线里收 1878 年建镇（由 Hubert Biltmore 与 Amos Gunderson 建立） | [已核验]（Timeline 1878）+[记忆·未核验]（1970 等交叉细节） |
| 9 | The Hiss invasion | 希斯入侵 | —（2019-10-29 事件） | 最古老之屋 | 2019-10-29 | 特伦奇经幻灯机放出希斯、死于办公室（表面自杀）；最古老之屋封闭所有出口；杰西进入并被董事会任命为局长 | [已核验]（Timeline） |
| 10 | Moscow AWE / Eagle River AWE | 莫斯科 / 鹰河 | — | — | — | **本次检索未能核验**这两条；「Eagle River」疑与「Eagle Limited（雄鹰特快）」混淆 | [存疑/未命中] |

---

## 4. 主要人物

| 人物 | 中文 | 身份 | 性格关键词 | 代表作式台词 |
|---|---|---|---|---|
| Jesse Faden | 杰西·法登 | 局长（P7，超能者） | 追问真相、执拗、对弟弟的愧疚 | 「我们住在一个房间里，墙上贴着一张海报……」 |
| Dylan Faden | 迪伦·法登 | P6，希斯阵营；《Control Resonant》主角 | 被实验塑造的愤怒与依赖 | 「是我欢迎了希斯。」 |
| Emily Pope | 艾米莉·波普 | 研究专员 → 研究部主管 | 天才、厌烦官僚保密、语带愤世 | 「这里没有操作手册。」 |
| Casper Darling | 卡斯珀·达林 | 研究部主管（1995–2019），失踪 | 亢奋、科普腔、把自我献祭浪漫化 | 「倒计时开始，Major Tom。」 |
| Zachariah Trench | 撒迦利亚·特伦奇 | 前局长，2019-10-29 死亡 | 勤勉、不信任权力、创伤驱动 | 「它始于一声遥远的低语……」 |
| Helen Marshall | 海伦·马歇尔 | 行动部主管，前 CIA | 强硬、独立、怀疑董事会 | 「撒迦利亚死了，我猜你找到了他的枪。」 |
| Simon Arish | 西蒙·阿里什 | 维护区安保主管 → 安保总长 | 可靠、礼貌、爱冒险、爱打牌 | 「希斯？我们就这么叫他们？挺顺口。」 |
| Ahti | 阿赫蒂 | 清洁工；FBC 编号 **Entity A-001** | 谜样、长者式、芬兰谚语 | 「阿里什那家伙不是废物。」 |
| Frederick Langston | 弗雷德里克·朗斯顿 | 全景监狱主管 | 仪式主义者、牢骚、猫奴 | 「别清希斯清太久，我的猫有分离焦虑。」 |
| Lin Salvador | 林·萨尔瓦多 | 前安保总长 | 务实（据 Langston 页） | —（无视警告去收容贝尼科夫电视后失踪） |
| Phillip Philson | 菲利普·菲尔森 | 初级探员 | 讨厌「冰箱值守」 | —（死于 Fridge Duty） |
| The Board | 董事会 | 星界中的超自然实体群 | 用尖括号与斜杠说话、官僚 + 威胁 | `< 批准 / 拒绝 >` 式断句 |
| The Former | 前任者 | 董事会**前成员**/异议者 | 兽形、被董事会敌视 | `< Locks @#$#@$ Ancient @#$#@$ Reason @#$#@$ Abalone >` |
| Polaris | 北极星 | 来自 Slidescape-36 的共振实体 | 导引、安静、以「频率」存在 | 见 §5 |
| Hedron | 赫德隆 | Slidescape-36 中的多面体实体 | 巨大质量、人类只能感知其局部 | 「它的形体并非实体的全部」 |

### 4.1 逐人要点（含原文引用）

**Jesse Faden（杰西·法登）** [已核验]
1991 年生于缅因州平凡镇，弟弟迪伦生于 1992。别名 **Prime Candidate 7**，前任局长特伦奇，演员 Courtney Hope。2002 年 8 月 30 日，11 岁的她与迪伦发现垃圾场「位移」，找到幻灯机 —— 杰西说有**九张幻灯片**，迪伦坚持只有**八张**。她厌恶「Meadow」（会让人做怪梦），「Temple」里有他们称作 **Not-Mother** 的东西；在名为「Hand」的幻灯世界里遇见后来被她命名为 **Polaris**（北极星）的智能 ——「它说我们很特别，并让我们变得特别」。

> We live in a room, and there's a poster on the wall. We stare at it and we think that's the whole world. The room... and the poster. But it's all a lie. Something to distract us from the truth. The room's not the world, the world... is much bigger, and much stranger.
> — Jesse Faden（角色页引言）
>
> 我们住在一个房间里，墙上贴着一张海报。我们盯着它，以为那就是整个世界——房间……和海报。但这一切都是谎言，是用来分散我们注意力的东西。房间不是世界；世界要大得多，也**怪异**得多。

**Dylan Faden（迪伦·法登）** [已核验]
P6；达林判定他潜力堪比前局长诺斯莫尔，纳入**首席候选人计划**；《阈限儿童》节目据信就是为他而做。约 13 岁起被加严管制，**颅后植入「移动收容装置」**（可远程关闭脑功能的保险装置）；看护人 **Roberts** 多次虐待他，他自卫时误杀对方；一次用药剂量错误导致他再次失控、又杀死数名探员，达林为保住职位**把责任推给迪伦**。

> I welcomed the Hiss. I let it in. To get rid of her. The Hiss set me free. Polaris is using you. The Bureau is using you. You are a puppet.
> — Dylan Faden（角色页引言）
>
> 是我欢迎了希斯。是我放它进来的。为了摆脱她。希斯让我自由了。北极星在利用你。控制局在利用你。你是个**傀儡**。

**Emily Pope（艾米莉·波普）** [已核验]
约 2014 年被 FBC 亲自招募为达林的门生；近两年因达林隐瞒情报而沮丧；希斯入侵时戴 HRA 幸存，在中央行政区安全屋与杰西建立联系。达林消失后，杰西**提拔她为研究部主管**。

> See, there's no guidebook for what we do here. Everything that happens at the Bureau, including the science, is without precedent.
> — Emily Pope（角色页引言）
>
> 你看，我们在这里做的事没有操作手册。控制局里发生的一切——包括「科学」——都没有先例。

**Casper Darling（卡斯珀·达林）** [已核验]
研究部主管 1995–2019，前任为小西奥多·阿什，继任者波普；演员 Matthew Porretta；状态「失踪」。在**通讯部主管 Alberto Tommasi** 的建议下，他拍摄了一系列超自然主题的**入门科普录像**，遍布最古老之屋 —— 这就是玩家收集到的「Darling Presentation / Multimedia」文档来源。另注：游戏假字幕把他的名字拼成「Kasper」。

> It's there now. Protecting the most important thing from what's coming. I'll be there, inside. Locked in. Ready to be blown away. Commencing countdown, Major Tom. Ready for the journey - to be Bowman, flying into the Monolith. Ready to see... to understand.
> — Casper Darling, 《Large Scale HRA》
>
> 它已经在那里了，保护着最重要的东西，抵御即将到来的东西。我会在里面。锁住。准备好被吹散。倒计时开始，Major Tom。准备好这段旅程——去做 Bowman，飞进那块巨石。准备好去看……去理解。

**Zachariah Trench（撒迦利亚·特伦奇）** [已核验]
前妻 Kate，女儿 **Susanna** 因他把「工作带回家」而染上超自然病症、无法医治而死，随后离婚 —— 这是他一切创伤的起点。他把诺斯莫尔**装进维护区的石棺室（NSC）当整栋楼电源**；诺斯莫尔形容为「像一场爆炸的人，渴求权威、秩序、更多」；而特伦奇自认「从不渴望或信任权力」。他「几乎是出于逞强」拿起了公务武器，被董事会选中。

> It started as a distant whisper, like something you'd hear in a dream. A far away voice telling me to "Wake up!" I'd open my eyes with those words still on my lips. In the dream they had made perfect sense, but awake they're like a foreign language, already forgotten. Then the sense of loss hits. Like losing a child. Like losing yourself.
> — Zachariah Trench（角色页引言，热线独白腔）
>
> 它始于一声遥远的低语，像梦里听到的东西。一个很远的声音对我说「醒醒！」我睁开眼时，那几句话还留在唇边。在梦里它们完全说得通，可醒来后它们像一门外语，已经被遗忘。然后**失落感**袭来。像失去一个孩子。像失去你自己。

**Helen Marshall（海伦·马歇尔）** [已核验]
前 CIA 探员，行动部主管。希斯入侵时率游骑兵小队去研究区保住 HRA 生产线，随后**再也没有回来**。《地基》中她的声音出现在**热线**上 —— 这意味着凶多吉少。她私下**怀疑董事会**，怀疑它与特伦奇之死有关；她**亲手炸毁了「钉子」（the Nail）**，因为这既是希斯的目标、也是董事会控制最古老之屋的接口，却因此引发了地基危机；最后被一根星界尖刺（疑为董事会所为）击伤、损坏 HRA，被希斯腐化。她曾在 1978-06-18 的一份「阈界探索」行动后报告里担任队长 —— 也就是说她在控制局干了 **40 多年**。

> Congratulations on your appointment, Director Faden. I'm Helen Marshall, Head of Bureau Operations. Zachariah's dead then, and I assume you found his gun.
> — Helen Marshall（角色页引言）
>
> 恭喜上任，法登局长。我是海伦·马歇尔，控制局行动部主管。那么撒迦利亚是死了，我猜你捡到了他的枪。

**Simon Arish（西蒙·阿里什）** [已核验]
原是游骑兵，与 **Remus、Thomson、Hazzard、Heptonstall、Guy、Cho** 同队；七人在那场「狼人」AWE（实为人手椅）中侥幸活下来，各留一枚**银弹**挂在颈袋。转岗维护区安保后又打赢了所有牌局，Remus 指控他出千。他在游戏中逐渐把队伍带到中央行政区，并请杰西去「让老朋友们解脱」、取回银弹。

> The Hiss? That's what we're calling 'em? That's catchy.
> — Simon Arish（角色页引言）
>
> 希斯？我们就这么叫他们？挺顺口。

> That Arish fellow is not a useless guy. Respects his elders. Makes good coffee.
> — Ahti 评价 Arish（引用自 Arish 页）
>
> 阿里什那家伙不是废物。敬重长辈。咖啡煮得好。

**Ahti（阿赫蒂）** [已核验首句 + 快照]
FBC 编号 **Entity A-001**，一位「以年长芬兰男性形象出现」的神秘超自然实体，无解释地出现在最古老之屋，作为「清洁工」在大楼里游荡，同时被控制局监视；他做的工作看似琐碎，却对整栋楼的安全至关重要。杰西绑定公务武器、成为局长后，在维护区的**清洁工办公室**（位于 NSC 冷却泵与通风系统之间）再次遇到他，他给她派发一连串清洁任务，其中多项直接决定 FBC 存亡。

- 芬兰语/谚语风格（[快照]）：「**yesterday's grouse's son**」（*eilisen teeren poika*，字面「昨天那只松鸡的儿子」）= 英语「I wasn't born yesterday（我不是三岁小孩）」；「**last winter's snow(s)**」（*menneen talven lumia*，「去年冬天的雪」）= 早已被遗忘之事。
- 圣歌/画廊式收束：他常哼歌、把清扫说成「the house keeps shifting」的应对。
- [记忆·未核验] 台词样本：「Jahaa, jaa-a, you think there's a dog buried in this?」（芬兰语惯用语，意为「你觉得这里有猫腻？」）

**Frederick Langston（弗雷德里克·朗斯顿）** [已核验]
约 2004 年入职，靠着家族关系进收容区做初级探员；一场事故**杀光了收容区几乎全部管理层**，他因此连跳数级。2017 年他想找被关在调查区的心理学家 **Emil Hartman** 给自己的《The Creator's Dilemma》签名，结果被当成「试图接触超自然实体」而遭拘留审问（只被警告、书被没收）；Hartman 逃脱时他正在买**只有那个区域才有的薯片**，因此逃过一劫。他提出《全景监狱方法提案》，主张以**更仪式化**的方式安抚异化物，被特伦奇否决（「像对待囚犯一样」）。琐碎设定：出身宗教家庭、高中吹大号、最爱《在山魔王的宫殿里》、并且知道看守他的两名游骑兵在**假装机器人**逗他。

> Just don't take too long clearing out the Hiss. My cat gets... separation anxiety.
> — Frederick Langston（角色页引言）
>
> 只是别清希斯清太久。我的猫会……分离焦虑。

**Lin Salvador / Phillip Philson** [已核验]
- **Lin Salvador**（前安保总长）：希斯入侵时带安保队进入全景监狱，**无视 Langston 的警告**去收容贝尼科夫电视，随后失踪。
- **Phillip Philson**（初级探员）：Langston 慌乱中忘了把他从**监视北极女王**的岗位上换下来；杰西在全景监狱找到他，随后在「Fridge Duty」中失去他。Langston 事后哀叹：这孩子一直讨厌「冰箱值守」。

**董事会 / 前任者 / 北极星 / 赫德隆** [快照 + 已核验]
- **The Board（董事会）**：「一组存在于**星界**中的极强大超自然实体」，与星界、能量之体、最古老之屋都有重要关联；**完全通过「心灵广播」经黑色金字塔（Black Pyramid）通信**（Astral Plane 页）。
- **The Former（前任者）**：星界中另一实体，**呈兽形**而非几何形或无定形；被强烈暗示是**董事会的前成员**，董事会视其为异议者并敌视它。《地基》里董事会「暴怒，随后恢复镇定，试图说服杰西不要相信前任者」。
- **Polaris（北极星）**：「一种**超维度、基于共振的实体**，本质上是一种有知觉的频率，源自 Slidescape-36」；在平凡镇事件中帮助杰西**关掉幻灯机**、终结事件并救下他们；十七年后杰西仍与它保持心灵联系，它持续引导她。
- **Hedron（赫德隆）**：由 FBC 在 Slidescape-36 发现的大型多面体活体实体，灰色外壳，达林称其「质量可观」，并强调**人类所见的形状并不是实体的全部**；HRA（赫德隆共振增幅器）由达林开发，用来放大源自 Hedron（Polaris）的共振。相关收藏品《Hedron》是其科普系列「Introduction to Paranatural Topics」的 **26.3 讲**，且被标注为**机密**。

**其他被点名但本次未核验的角色** [存疑/未命中]：`Raya Underhill`、`Bernard`、`Carla Vaughn`、`Phillip Biederman` —— 对 control.fandom.com 的定向检索（`site:control.fandom.com "Carla Vaughn" OR "Biederman" OR "Bernard"`）返回**零结果**；`Phillip Biederman` 疑为 `Phillip Philson` 之误。引用这些人名之前必须复核。

---

## 5. 世界观内的「文档文体」与逐字摘录（VERBATIM）

### 5.1 收藏品分类学（控制局自己的文献体系）

[已核验] 系列内部子类：**Case Files（案卷）** → Altered Items / Altered World Events / Objects of Power 三个子类；**Correspondence（通信）** → Official（官方）/ Non-Official（非官方）/ **Dead Letters（死信）** 三个子类。另有 Multimedia（达林科普影像）、Hotline（热线独白）、Threshold Kids（儿童节目）等系列。[快照] 《Collectibles/List of Collectibles》页载明总数：**412 件**（本体 287、PS4 独占 1、《地基》57、《AWE》67）。

### 5.2 案卷格式（Case Files 的字段骨架）

Fandom 页面在引用这些档案时统一以 `File text` 起头，随后是「物件名（编号）」加粗标题，再列字段。可直接观察到的字段有：`BACKGROUND:` / `CONTAINMENT PROCEDURE:` / `DESCRIPTION/ALTERED EFFECT:` / `SUMMARY:`。

> File text
> **Pink Flamingo (AI46-KE)**
> **BACKGROUND**: Agents noticed a transient commonly found outside the entrance of the Bureau headquarters would carry the item and loudly claim to be responsible for the lack of inclement weather.
> — Case File《Pink Flamingo Supplement》（[快照]，Control Fandom）
>
> 案卷文本 / **粉红火烈鸟（AI46-KE）** / **背景**：探员们注意到，常年在局总部入口外游荡的一名流浪者会抱着该物件，并大声宣称「天气一直不错」是他的功劳。

> File text
> **Red Light (AI49-KE)**
> **CONTAINMENT PROCEDURE**: The object's effect is subdued by exposure to sunlight.
> **DESCRIPTION/ALTERED EFFECT**: A traffic light with three distinct lights arranged vertically on each of its four sides. From top to bottom, the lights shine red, yellow, and …[截断]
> — Case File《Traffic Light Procedures》（[快照]）
>
> 案卷文本 / **红灯（AI49-KE）** / **收容程序**：该物件的效应在**阳光照射**下会被压制。 / **描述/异变效应**：一盏交通信号灯，四面各垂直排列三只独立的灯。自上而下依次为红、黄、……[截断]

> File text
> **Rubber Duck (AI52-AE)**
> **CONTAINMENT PROCEDURE**: Direct contact with the item is not permitted. Safety gloves are required when handling.
> **DESCRIPTION/ALTERED EFFECT**: Item is a yellow rubber duck bath toy from the 1950s. A single hole at the bottom allows air and water to flow …[截断]
> — Case File《Rubber Duck Procedures》（[快照]）
>
> 案卷文本 / **橡皮鸭（AI52-AE）** / **收容程序**：**禁止直接接触**该物件。搬运时必须佩戴防护手套。 / **描述/异变效应**：该物件是 1950 年代的黄色橡皮鸭浴玩具。底部有一个单孔，可供空气与水进出……[截断]

**文体观察（可直接用于仿写）**：
1. 标题 = 通俗名（编号），全大写字段名 + 冒号；
2. **收容程序在前、效应与外观在后**，语气是「防呆手册」而非学术论文；
3. 通话与档案混杂：`§` 之外还有 `[Jesse Faden Movement Tracking]`、`[Travel Costs]`、`[Door Appearance]` 这类**监控记录/差旅报销/门扉异动**式标题，把超自然现象塞进行政流程；
4. 分类学研究：`[Keystone Inspection]`（巡检报告）、`[Fan Procedures]/[Fan Supplement]`（1954 年的老案卷）、`[Mirror Supplement]`（1914 年旧案）、`[Meteor Hill Summary]`、`[Movie Camera Supplement]` —— **「Supplement/补遗」与「Procedures/程序」是成对出现的**；
5. 机密标记：达林科普系列《Hedron》（26.3 讲）被标注为 **classified**（[快照]）；本次未取得 `■■■` 涂黑样张与「for your eyes only」字样，故不示例。

### 5.3 达林的科普影像（Multimedia / Darling Presentations）

> There is a curious correlation with the yet unknowable forces intruding upon our world in the form of Altered World Events. These forces gravitate toward archetypal objects: a gun, a television, a supposedly haunted house. So clearly, humanity affects this process. Our collective unconscious is a map of sorts. We hold the key but we don't know how to use it.
> — Casper Darling,《Altered World Events》(Multimedia)（[已核验]）
>
> 那些以「异世界事件」形式闯入我们世界的、尚不可知的力量之间，存在一种奇特的关联。这些力量会被**原型化**的物件吸引：一把枪、一台电视、一栋据说闹鬼的房子。所以很明显——**人类在影响这个过程**。我们的集体无意识某种意义上是一张地图。钥匙在我们手上，只是我们还不知道怎么用。

> Objects of Power can cause or be results of AWEs - Altered World Events, intrusions upon the perceived reality.
> — Casper Darling,《Objects of Power》(Multimedia)（[已核验]）
>
> 能量之体可以**引发**异世界事件，也可以是异世界事件的**结果**——所谓异世界事件，就是对「被感知到的现实」的侵入。

> The exact process of how an Altered Item is born eludes us. We find them in the aftermath of Altered World Events. They take the form of everyday objects - ever-present in our lives, constantly evoked in the thoughts of millions of people. Now infused with unpredictable energies, they're altered.
> — Casper Darling,《Altered Items》(Darling Presentation)（[已核验]）
>
> 异化物究竟如何诞生，其确切过程仍让我们困惑。我们总是在异世界事件的**余波**里找到它们。它们呈现为日常物品的形态——无处不在，被千百万人反复想起。如今被注入了不可预测的能量，它们**被改变了**。

> Dream-like haze.
> — Casper Darling,《Oceanview Motel and Casino》(Collectible)（[已核验]，作为海景旅馆页引言）
>
> 梦一般的迷雾。

### 5.4 特伦奇的热线独白（Hotline）

热线是**只有局长能用**的通讯物：1965-08-09 自行显现在局长办公室，诺斯莫尔是第一个使用者；它对**其他人有致命效果**（[已核验]，Timeline 引 [Hotline (Case Files)]）。其文体是**第二人称/自述式、诗意、断续**，并在偶尔出现的 `[STATIC]` 式噪声中丢字。

> It started as a distant whisper, like something you'd hear in a dream… Then the sense of loss hits. Like losing a child. Like losing yourself.
> — Zachariah Trench（完整原文见 §4.1）（[已核验]）

### 5.5 阿赫蒂的芬兰语腔（Ahti）

[快照] 「Ahti 喜欢用**芬兰语**骂人，并把大量芬兰谚语**逐字直译**成英语。」可用的两条：

> "yesterday's grouse's son" (*eilisen teeren poika*) ≈ "I wasn't born yesterday"
> "last winter's snow(s)" (*menneen talven lumia*) = things long forgotten
> — Control Wiki, "Ahti"
>
> 「昨天那只松鸡的儿子」≈「我可不是三岁小孩」；「去年冬天的雪」= 早已被遗忘的事。

### 5.6 《阈限儿童》(Threshold Kids)

[已核验] 这是控制局为**首席候选人（实指迪伦）**制作的教育节目：副心理学家 **Bethany Harrington**（社区大学时上过几节木偶制作课）提案，研究部员工搭布景、录制、配音，**预算极低**。主角 **Meg 与 Topher** 分别对应 P7（杰西）与 P6（迪伦）；唯一其他角色 **Mr. Bones** 是穿紫西装、戴**婴儿脸面具**的骷髅，暗示是 FBC 的成年成员、且可能**已经死了**；它的职责是讲规则与危险，「但这些说明往往无用、过度凶狠，或语气明显阴暗」。

> Step into the FBC / There's lots to do, there's lots to read / But look, don't touch, and don't scream *much* / Let's join the Threshold Kids / Let's join the Threshold Kids!
> — Threshold Kids 主题曲（wiki 注：无字幕、声音失真，此为听写，「much」一词游离）（[已核验，听写存疑]）
>
> 走进 FBC／要做的事很多，要读的东西很多／但**只能看、不能碰，也别尖叫**——别叫得太大声／来加入阈限儿童吧／来加入阈限儿童！

设定细节（可作素材）：Meg 那对**像束身衣的长袖**是「她是囚犯」的符号；Meg 木偶**后脑还有第三只眼**，藏在头发下；Topher 的衣服取自游骑兵制服；Mr. Bones 的怪异形象源于他在一次**房屋位移**中被压碎（叙事主管 Anna Megill 语）；主题曲由作曲 **Petri Alanko** 演唱——他同时也是**董事会的配音**。灵感来源被点名为《Don't Hug Me I'm Scared》《G.I. Joe》公益广告与 creepypasta《Candle Cove》。

### 5.7 通信与死信（Correspondence / Dead Letters）

[快照] **Dead Letters（死信档案馆）**：位于行政区；在特伦奇任期内、由 **Penny Bartwell** 请愿开设（她后来成为首席档案员）；它保存的是**美国邮政认定无法投递**的信件。相关收藏品标题本身就是文体示范：`Trench: Dead Letter Approval`（特伦奇：死信批准）、`Our Whereabouts`（我们的下落，页面注其「词语沙拉」风格受「Time Cube」影响）。

> …a mail archive maintained by the Federal Bureau of Control for "dead letters" (mail deemed by the United States Post Office as unfit for …[截断]
> — Control Wiki, "Dead Letters"（[快照]）
>
> ……一个由联邦控制局维护的邮件档案馆，专门保存「死信」（被美国邮政认定为不适合……[截断]）

### 5.8 海景汽车旅馆的「梦逻辑」笔记（Oceanview）

[已核验] 地点：**「美国内华达州某处」**；类型：力量之地；发现日 09/23/1992。经营规则本身就是文体：

> …visitors are only capable of returning to other areas of the Oldest House … it is impossible to enter or leave it by any means other than a light switch cord.
> — Control Wiki, "Oceanview Motel"
>
> ……来访者只能回到最古老之屋的其他区域……除了**拉灯绳**，没有任何办法进出它。

走廊右侧六扇门，只有**倒金字塔**（董事会符号）那扇能打开；**螺旋门**是 2017 年 **Alice Wake** 被带到最古老之屋面谈后才出现的（同时触发 Hartman 事件与调查区封锁），在《AWE》里通向艾伦·韦克在「黑暗之地」的幻象；**重叠圆环门**疑与拱心石镇空城事件相关。控制局曾派探员**普查全美公路旅馆**想找到它，至 2019 年仍未成功（档案《Travel Costs》）。

---

## 6. 时间线（1964 前后的控制局 → 2019 希斯入侵）

以下每条来自 Fandom `/wiki/Timeline`（[已核验]，原始页面另标了引用来源，如 `[Fan Procedures]`、`[Meteor Hill Summary]`）：

| 年份 | 事件 |
|---|---|
| 1878 | 华盛顿州**亮瀑镇**由 Hubert Biltmore 与 Amos Gunderson 建立（Alan Wake 交叉）。 |
| 1914 | **Carver 太太**（与「维多利亚镜子」异化物相关）一家迁往伊利诺伊州。 |
| 1915-08-18 | Carver 太太被送进精神病院。 |
| 1954-07-28 | 异化物**振荡器（AI3-KE）**被控制局收管。同年，公共知识与转移部主管 **William S. Powers** 抗议局方对该事件的掩盖处理。 |
| 1956 | 微笑嘉年华巡演城镇的年轻男子在触摸**游戏锤**后患上类麻风病。 |
| 1958-06-23 | 威斯康星州索耶县发生 AWE（**AWE-3，流星山**），公共知识与转移部参与掩盖。 |
| 1959-11-02 | **游戏锤（AI5-BE）**被收管。 |
| 1964-07-28 | 前局长**老西奥多·阿什**下葬。 |
| 1964-08-04 | **「Entry Day（进入日）」**：控制局在调查纽约市一桩疑似 AWE 时**发现最古老之屋**；局长**布罗德里克·诺斯莫尔**取得能量之体**公务武器（OOP1-KE）**，并声称遇见了「董事会」。 |
| 1964-09-01 | 该建筑被命名为**最古老之屋**。 |
| 1964-09-14 | 研究部主管**小西奥多·阿什**发现**「本我」（the Id）**。 |
| 1964-09-24 | 诺斯莫尔下令**搜寻更多能量之体**。 |
| 1964-10-29 | 「本我」无故转为敌对，控制局人员从**地基**撤退。 |
| 1964-11-30 | 阿什拒绝撤退、留在地基，并记录自己正被「本我」**猎杀**。 |
| 1965-08-09 | **热线（OOP3-UE）**自行显现在局长办公室；诺斯莫尔成为首位使用者，发现它可与董事会及其他超自然实体通讯；仅局长可使用，**对其他使用者致命**。 |
| 1967-12-23 | **腰部人体模型（AI7-KE）**被收管。 |
| 1968 | 撒丁岛一部电影的剧组人员在拍摄期间死亡，疑与 **ActionMaxx 摄影机**有关；影片停拍，摄影机后来被卖给「蒙福影业」。 |
| 1992（09/23） | **比尤特 AWE**（蒙大拿州）使**海景汽车旅馆 & 赌场**被发现。 |
| 1997-08-12 | **粉红火烈鸟**在控制局总部**门外**被发现，后收容于全景监狱。 |
| 2002-08-30 | **平凡镇 AWE（AWE-24）**：全镇成年人消失；杰西与迪伦发现幻灯机；特伦奇与达林率队抵达、收走幻灯机并**带走迪伦**；杰西逃跑并烧掉大部分幻灯片。 |
| 2014-11-28 | **家用保险箱（OOP22-KE）**被发现。 |
| 2019-09-24 | 杰西确信**北极星**在召唤她向东，离开怀俄明州夏延，向东行进一个月（监控档案《Jesse Faden Movement Tracking》）。 |
| 2019-10-29 | **《控制》正篇**：特伦奇经**幻灯机**放出**希斯**，死于局长办公室（表面自杀）；**希斯入侵**开始，最古老之屋封闭所有出口；杰西抵达纽约、进入大楼、发现特伦奇尸体，被**董事会**任命为新局长。 |
| 2025 / 2026 | 后续作品：《FBC: Firebreak》事件发生于 2025 年；《Control Resonant》事件发生于 2026 年（[已核验]，同一 Timeline 页末尾）。 |

---

## 7. 交叉与存疑（Alan Wake / RCM）

- [已核验] 海景旅馆的**螺旋门**与 2017 年 **Alice Wake** 被带进最古老之屋面谈直接相关；《AWE》用它导向艾伦·韦克在「黑暗之地」的幻象；《Alan Wake 2》中的螺旋意象也被认为指向韦克/黑暗之地。
- [已核验] 《Alan Wake 2》第二部 DLC《The Lake House》里出现了**《Control Resonant》的符号**，画在一扇通向「疑似关押迪伦·法登之处」的海景旅馆门上。
- [已核验] 达林在《Alan Wake II》中登场（角色页 appearances 列明）；杰西在《Alan Wake 2》中客串（含《Night Springs》「North Star」单元，饰演 "The Sibling"），并在《The Lake House》中被提及。
- [已核验] 时间线页明确把《Alan Wake》事件纳入：亮瀑镇 1878 年建镇。**[记忆·未核验]**：1970 年釜湖/诗人 Thomas Zane 的失踪、「Bright Falls AWE」编号等细节本次未从 Fandom 核验。
- [存疑/未命中]：`Moscow AWE`、`Eagle River AWE`、`Punch Card`、`Carla Vaughn`、`Phillip Biederman`、`Bernard`、`Raya Underhill` 本次均未在 Fandom 命中。

---

## 8. 参考信源（本会话实际访问）

1. `https://control.fandom.com/wiki/Altered_Item`（经 W3C html2txt，`?action=raw`）
2. `https://control.fandom.com/wiki/Object_of_Power`（同上，含 `?action=render`）
3. `https://control.fandom.com/wiki/Altered_World_Event`（`?action=render`）
4. `https://control.fandom.com/wiki/Timeline`（`?action=raw`）
5. `https://control.fandom.com/wiki/Jesse_Faden`、`/Dylan_Faden`、`/Casper_Darling`、`/Zachariah_Trench`、`/Helen_Marshall`、`/Simon_Arish`、`/Frederick_Langston`、`/Emily_Pope`
6. `https://control.fandom.com/wiki/Threshold_Kids`、`/Oceanview_Motel`、`/Ahti`
7. 快照（DuckDuckGo 索引）：`/Pink_Flamingo`、`/Pink_Flamingo_Supplement`、`/Traffic_Light_Procedures`、`/Rubber_Duck_Procedures`、`/Rubber_Duck_Supplement`、`/Swan_Boat`、`/Home_Safe`、`/Astralnauts_Information`、`/Polaris`、`/Hedron`、`/The_Board`、`/Astral_Plane`、`/Paranatural_entity`、`/Former/Quotes`、`/Dead_Letters`、`/Collectibles/List_of_Collectibles`、`/Janitor's_Office`、`/Talented_Janitor`
8. 旁证：`https://web.archive.org/web/2024/https://control.fandom.com/wiki/Altered_Item`（Wayback，仅取得导航壳层）

> 写作于本会话；所有英文引文按抓取原样保留，截断处以 `[截断]` 标注；中文为本人翻译，术语尽量对齐官方简中，未能确认处已在表中注明。
