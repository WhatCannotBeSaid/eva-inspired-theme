# EVA S1–S10 实施与验收记录

## 状态与边界

基线：`b724a210625ff17c7cd5c3708fe3a39a77725799`；实施前工作树为空，Node `v24.19.0`。原 `npm run verify`：126/126 静态断言通过。未安装依赖、未修改宿主 profile、未发布、未重启用户应用、未清理用户 storage。

本轮完成代码修复、行为测试、双模式构建和源码拆分。真实 DSH 挂载、浏览器视效、交互 P95、资源解码、堆增长尚未验收。开发 verify 通过不等于发布验收通过；旧 out/ 证据缺少采集来源，因此现在明确报 partial，而不是继续误报全部验证通过。

## 逐项变更

| 步骤 | 实施位置 | 完成内容及验证 |
|---|---|---|
| S1 | [build-contract.mjs](../tools/build-contract.mjs)、[audit-evidence.mjs](../tools/audit-evidence.mjs)、[verify.mjs](../tools/verify.mjs)、[build-contract.test.mjs](../tools/build-contract.test.mjs)、[runtime.test.mjs](../tools/runtime.test.mjs) | 统一 auto/public/local；保留 --public 别名，冲突和缺失 local 直接失败。MANIFEST.build 记录解析后的模式、壁纸清单及 SHA256，不再猜测 WebP。verify 将同一模式传入各检查。发布审计核验目标宿主版本、30 天时效和输入哈希。行为测试先验证故障路径，再由修复通过。 |
| S2 | [pins.js](../src/runtime/pins.js) 的 step/enforce | 每次实际派发 insertBefore 前检查 disposed；串行微任务也检查，卸载后不发出后续 RPC。已经发出的宿主操作不冒称可撤销。测试覆盖卸载发生在第一项尚未结束时。 |
| S3 | [wechat.js](../src/runtime/wechat.js) 的 refreshStatus | 10 秒 deadline 覆盖 fetch 和 JSON body；独立 timer 解锁，支持时 AbortController 取消。request identity 隔离旧结果、旧 finally 和新请求。卸载取消进行中的请求。失败、非 2xx、坏 JSON、错误 schema 均保留最后有效状态；隐藏页不请求。测试覆盖以上路径。 |
| S4 | [panels.js](../src/runtime/panels.js)、[glass.js](../src/runtime/glass.js) | 记录并取消 frame/timer，添加 disposed 防护。body 只发现候选，候选节点单独观察属性。弹层先批量测量再写 left；记录原值和 priority，只有值仍属本层时恢复，宿主已写的新值不被覆盖。测试覆盖 frame/timer、候选属性、宿主接管和 glass 的迟到回调。 |
| S5 | [model-effort-picker.js](../src/model-effort-picker.js) 的 toggleGroup/renderGroups/paint | 键盘和点击都用原始 provider ID；focus 查找不再拼接 raw ID 到 CSS selector。effort 内容变化后重新定位，空态同样定位；返回值避免 open 再测一次。测试覆盖特殊 ID、空态、翻译和焦点。 |
| S6 | [pins.js](../src/runtime/pins.js)、[session-eva-status.js](../build/session-eva-status.js) | scopeMissed 时放行文档回退行的 mutation；有效侧栏行恢复后重新收窄。测试覆盖进入和退出 fallback。 |
| S7 | [plugin-toggle.js](../build/plugin-toggle.js)、[wechat.js](../src/runtime/wechat.js) | 缓存 connected group/head，过滤无关记录；首挂载、标题替换、分组替换及 remount 仍重发现。微信直接查询 workspace 前缀并在一次 view 中取得 head/group，去掉重复扫描。夹具中 1000 批无关记录的全页分组查询为 0；这不是浏览器 CPU 提升百分比。 |
| S8 | [model-effort-picker.js](../src/model-effort-picker.js)、[effort-fixture.mjs](../tools/effort-fixture.mjs) | effort view signature 包含 choices/value/title/empty；相同视图保留 row，pending 只原位更新 disabled，点击时使用当前 state。夹具在 1000 次不变通知后仍只创建最初 2 个 row，焦点不丢失；内容变化时才重建和定位。未对已经有 signature 的 model 控件再做重复优化。 |
| S9 | [measure-resources.mjs](../tools/measure-resources.mjs) | 分 public/local 记录 raw/gzip/Brotli、资源哈希和 Node 编译耗时。没有证据支持无风险减图：保留原品牌、字体、壁纸、blob 转换和单束分发。不外置资源，不改像素、字体加载或 boot 时序。浏览器 parse/decode/heap 待测。 |
| S10 | [src/client.js](../src/client.js)、[src/runtime/](../src/runtime/)、[source-transforms.mjs](../tools/source-transforms.mjs)、[package.json](../package.json) | 抽出 glass/pins/wechat/panels 私有 mount 函数；CLIENT_FILES 在 build-contract 中声明固定输入顺序，先定义函数再编排挂载。不引入 ESM loader 或运行时依赖，仍为一个 ModuleLoader 束、55 token、11 effect。集中构建格式转换，selfcheck 保留独立 token/行号参考实现。增加生成束的 loader/factory smoke。随包包含 tools/*.mjs，修补 source/prepare 构建工具缺失。 |

源码拆分不是按字符串随意执行多个脚本：构建器一次拼接私有函数和编排源，再使用原转换与单束工厂。公共 name/inject/apply 和 React seat 契约不变。没有对 JS minifier 进行激进算法替换；仍不应把它用于任意 JS。

## Vendor 维护清单

- `build/plugin-toggle.js`：基于文件原记录的上游 v1.3.0；a 序号守卫、b reload 去抖、c 文本差异写入、d 运行正文节流、e Set 去重、f 排除承载主题、g 本轮分组缓存与 mutation 过滤。
- `build/session-eva-status.js`：基于文件原记录的上游 v0.1.0；a rAF 合并、b pin 差异写入、c frame 取消、d 侧栏收窄、e opacity 呼吸、f 本轮 fallback 唤醒修复。
- 更新副本头部和 NOTICE，不声称有 pristine upstream 哈希。重新 vendor 时须逐项迁移并重跑行为与静态门禁。

## 构建与检查用法

```sh
# 默认保留原本的 auto 选择规则
npm run build
npm run verify

# 明确验证一种产物，不能跨模式检查旧产物
npm run build -- --mode local
npm run verify -- --mode local
npm run build:public
npm run verify -- --mode public
npm run check -- --mode public

# 不安装额外依赖
npm test
npm run measure:resources

# 正式发布前必须有目标宿主新采集的证据
npm run verify:release -- --mode public --host-version <exact-version>
```

`out/audit-evidence.json` 由真正的目标宿主采集过程产生：schema=1、hostVersion、collectedAt（ISO 时间）、sha256 对象。对象键必须覆盖 `tools/audit-evidence.mjs` 的 EVIDENCE_INPUTS（tokens、theme CSS、client 及三个官方转储）。不同产物模式、代码哈希或宿主版本必须重采；不能对旧数据补一个今天的日期。默认开发检查允许 partial，strict 发布检查拒绝 partial。

发布契约为“可构建源码 + 已生成束”：files 包含 src、build、tools/*.mjs 和 client。Git 安装仍由 prepare 构建；注册表 tarball 使用生成束。`prepare` 保持 auto，发布机器若有 local 清单，单次 public 构建后直接 npm pack 仍可能被生命周期重建为 local。正式打包应在无 out/ 的干净隔离 checkout 执行 prepare/build/verify:release，再检查 tarball 内 MANIFEST.build.mode=public；不要从维护者的 local 工作目录直接发布。本轮没有实际 pack 或 publish，只做 --dry-run --ignore-scripts 的白名单检查。

## 本轮实测结果

| 检查 | 结果 | 证明范围 |
|---|---|---|
| Node 行为与构建契约测试 | 25/25 通过 | 隔离 vm、简化 DOM/宿主夹具；不是浏览器端到端 |
| 静态门禁 | 127/127 通过 | 55 token、11 effect、CSS/vendor 合同、压缩 token 和行号、构建同步 |
| public/local 构建与 verify | 两种均通过开发检查 | 模式一致、输入一致、生成束语法及 factory |
| token audit | partial | out/ 旧转储存在，但 provenance 不足；不算目标宿主兼容性通过 |
| npm pack --dry-run --ignore-scripts --json | 45 项；含实施记录、client、4 个 runtime 文件及 mjs 工具；不含 out/ | 白名单与源码完整性；未执行安装生命周期或打出 tarball |

资源数据（字节，Node v24.19.0，内存压缩，不是 HTTP 传输量）：

| 当前产物 | raw | gzip level 9 | Brotli quality 11 | Node 独立源码编译中位/P95 |
|---|---:|---:|---:|---:|
| public | 1,846,966 | 1,128,837 | 1,002,153 | 11.11 / 15.39 ms |
| local | 2,288,798 | 1,461,957 | 1,334,320 | 13.25 / 18.12 ms |

编译计时每种 15 次，源末尾附唯一注释以避开同源 V8 cache，不执行工厂。该微基准不能证明 Chrome 启动改善，也不能当成变更前后对照。

品牌 SVG 1,202,003 B → base64 1,602,672 字符；字体 42,800 B → 57,068 字符。均保持原始字节和许可：品牌 SHA256 `5f41a58ba415f40df19365a7c4566de6cadab963b0278c2c8d482c23079b79e3`；字体 SHA256 `c59dc73d29daf142ef2431f455d21464172374aa750d793a79d608735db2d856`。主要体积来自资源，不是被 strip 掉的源码注释。本轮未宣称产物变小。

最终工作目录已重建回 local 模式；生成束仍被 git 忽略。修改代码会更新 boot mark，这是既有 once-per-build 规则，不更改其存储键和时序。

## 真实宿主验收（尚未执行）

使用同一 DSH 精确版本、浏览器、数据集和窗口尺寸，对照 B0 主题关闭、B1 基线、B2 本轮。public/local、冷/热启动分开；boot=0 测可交互，boot=1 单测既有动画，不能移除动画换分数。

1. 亮/暗、窄/宽窗口、缩放与 reduced-motion；品牌、玻璃、portal、键盘和屏幕阅读器。
2. 模型特殊 provider ID、不同 effort 数量、空态、实时翻译、pending、连续模型切换。控件不越界，内容能容纳时建议保留至少 12px 边距。
3. pin 队列进行中停用；微信 fetch/body 分别挂起、超时后迟到、切目录、隐藏恢复、插件缺失；不得有卸载后新 RPC/DOM 写入。
4. 插件页首次进入、分组替换/重挂载；侧栏丢失/回退/恢复；弹层被宿主重新定位后停用。
5. 20 次启停后记录观察器、timer、listener、blob 与保留节点；数量不应持续增长。流式会话 5 轮、交互 100 次、每种启动 10 次；保留 Performance trace/heap/Network 原始数据。
6. 建议值而非本轮实测：非目标路径 P95 不恶化超过约 5%（需先看噪声），主题归属长任务不应超过 50ms。只有出现有统计意义的差异，才声称脚本耗时改进。

## 回滚

本轮起点为干净 HEAD，但现在的工作树包含完整实现。不要执行全仓 reset/clean 或清空 localStorage。按具体缺陷回退对应源模块、行为测试及必要构建合同；模块拆分回退必须同步 CLIENT_FILES 和 builder/selfcheck，不能单删某文件。对照基线提交逐项审阅，不覆盖后续用户改动。

恢复同一壁纸输入和模式后重新 build/verify。保留原壁纸、字体、pin 顺序和浏览器存储；已完成的官方 insertBefore 不属于 UI 层回滚范围。没有改动宿主配置，因此不需要恢复 profile。未完成真实宿主验收及严格证据门禁前，不发布。
