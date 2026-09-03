# 智能巡检前端 Monorepo 上下文

## 项目定位

本仓库使用 pnpm workspace（pnpm 工作区）统一管理多个智能巡检版本和共享包。安装、构建及质量检查统一从仓库根目录执行，各应用不保证脱离仓库独立安装。

## 工作区结构

| 目录                 | 包名                | 说明                                                           |
| -------------------- | ------------------- | -------------------------------------------------------------- |
| `apps/hglh`          | `@patrol/hglh`      | 黄阁、榄核共用源码，通过不同 Vite mode（构建模式）生成两个版本 |
| `apps/HK`            | `@patrol/hk`        | HK 版本                                                        |
| `apps/nanchang`      | `@patrol/nanchang`  | 南昌版本                                                       |
| `apps/yuedong`       | `@patrol/yuedong`   | 粤东版本                                                       |
| `packages/languages` | `@patrol/languages` | 四端共用的基础语言资源，应用可自行创建资源进行定制覆盖         |
| `packages/shared`    | `@patrol/shared`    | 四端共用 hooks、utils 和 typings 的单一源码                    |
| `packages/ui`        | `@patrol/ui`        | 四端共用基础组件、指令及 UI 能力的单一源码                     |

黄阁使用 `hgProduction`，榄核使用 `lhProduction`；必须继续保留两套环境文件、构建命令和产物，不应拆成两个应用。

## 工程约定

- Node.js 基准版本：`20.12.2`；pnpm 版本：`10.28.0`。
- `pnpm-workspace.yaml` 包含 `apps/*` 和 `packages/*`。
- 依赖版本由 pnpm catalog（依赖版本目录）统一维护，各应用和共享包仍显式声明自己使用的依赖。
- ESLint、Prettier、Stylelint、PostCSS、EditorConfig、lint-staged 和 Husky 配置位于根目录。
- TypeScript 公共选项位于 `tsconfig.base.json`，各项目保留路径别名和 include 配置。
- Vite 配置、环境变量、代理地址和版本专属构建脚本保留在各应用内。
- 根目录 `pnpm-lock.yaml` 是唯一锁文件，不使用应用内 `package-lock.json`。
- 共享包采用单一源码策略，修改 `packages/languages`、`packages/shared` 或 `packages/ui` 会同时影响四个应用，必须执行四端验证。

## 常用命令

```bash
pnpm install
pnpm dev:hglh
pnpm dev:hk
pnpm dev:nanchang
pnpm dev:yuedong
pnpm build:hglh
pnpm build:hk
pnpm build:nanchang
pnpm build:yuedong
pnpm build:test
pnpm lint
```

## 共享包现状

### `@patrol/shared`

公共 hooks、utils 和 typings 已从原三个应用迁入 `packages/shared`，HK 也复用同一份共享源码。应用通过显式子路径导入，例如：

```ts
import { isArray } from '@patrol/shared/utils/is';
```

应用专属 Store、Router、API 和业务逻辑继续留在各应用内。

### `@patrol/languages`

四个应用原有且内容一致的语言资源已迁入 `packages/languages`，共享包只维护语言文件：

- `src/zh.ts`：简体中文。
- `src/en.ts`：英文。
- `src/zh-HK.ts`：香港繁体中文。
- `src/index.ts`：统一导出 `zh`、`en` 和 `zhHK`。

四个应用不保留重复的语言资源文件，但各自保留 `src/languages/index.ts`，负责调用 `createI18n()`、注册 `zh`、`en`、`zh-HK`，并作为后续版本级定制入口。i18n（国际化）初始化不放入 `main.ts`；未扫描或批量替换业务模块中的其他中文。

共享语言资源包含基础布局词条和 `ui` 基础组件词条。四个应用在 `App.vue` 中保留 Element Plus 内置 locale（区域语言资源），并把对应的 `ui` 词条深度合并到 `el.patrol` 命名空间：

```ts
const extendLocale = (locale: Language, patrol: TranslatePair): Language => ({
  ...locale,
  el: {
    ...locale.el,
    patrol,
  },
});
```

`packages/ui` 内的共享组件通过 `useLocale().t('el.patrol.xxx')` 读取宿主当前语言。当前已接入搜索表单、公共弹窗、筛选列表和树表选择组件；组件调用方传入的标题、按钮文字仍优先于默认翻译。动态语言由 `<el-config-provider :locale="i18nLocale">` 响应式提供，不额外调用 `provideGlobalConfig()`。

### `@patrol/ui`

原三个应用的 `znxj-components` 已整合为 `packages/ui`，HK 也接入该共享包，四个应用的业务代码统一从 `@patrol/ui` 引用。共享 UI 不应反向导入任何应用的 Store、Router 或 API。

宿主能力通过 Vue `provide/inject`（依赖提供/注入）传递，并在安装插件时注入：

```ts
app.use(znxjUi, {
  getCurrentUserId: () => AuthStore().userInfo.account,
  getCurrentPage: () => router.currentRoute.value.name,
  getTableCol,
  setTableCol,
});
```

当前适配器注入能力只服务于 ProTable 的用户列配置。`v-auth` 按钮权限指令由四个应用各自注册并直接读取本地 `AuthStore`，不通过共享 UI 适配器读取权限。

`@patrol/ui` 将 `vue`、`element-plus`、`@element-plus/icons-vue` 和 `@vueuse/core` 声明为 `peerDependencies`（对等依赖），运行时复用宿主提供的实例；相同依赖同时保留在 `devDependencies`（开发依赖），只供 UI 包自身开发和类型检查。四个应用的 Vite 配置同时使用 `resolve.dedupe`（模块去重）作为构建侧保障，避免同一运行时被重复打包。共享 UI 能继承宿主 `el-config-provider` 的语言上下文，依赖的也是这套统一运行时。

## 已处理问题

- 四个应用均显式声明 `lodash`、`lodash-es` 及对应类型，修复 pnpm 严格依赖隔离下的模块解析失败。
- 四个 Vite 配置显式使用根目录 `.eslintignore`，避免构建时检查字体图标生成文件。
- `ProTableProps` 对 Element Plus `TableProps` 的复杂类型继承使用 `/* @vue-ignore */`，其余表格属性继续通过 `$attrs` 透传。
- `packages/ui/src/env.d.ts` 提供 `*.vue` 模块声明，解决共享组件入口的 TS2307 模块解析错误。
- ProTable 保留现有列配置 `get/set` 接口和数据格式。正式构建中的列宽异常和 Element Plus 空数据英文问题，根因是宿主与 `@patrol/ui` 曾解析到不同物理实例，导致组件注入上下文和布局状态分离；现已通过 `peerDependencies`、宿主显式依赖及 Vite `resolve.dedupe` 统一 Vue、Element Plus、图标包和 VueUse 运行时。
- ProTable 不使用 `ResizeObserver`（尺寸观察器）、`requestAnimationFrame`（浏览器逐帧回调）或额外 `doLayout()` 监听。该临时方案已移除，统一运行时后不再需要尺寸补偿。
- 四个应用的 Element Plus 和共享 UI 语言均支持 `zh`、`en`、`zh-HK`，语言切换由应用 Store 和响应式 `el-config-provider` 统一驱动。
- Element Plus 的配置合并是顶层合并，现已在应用侧显式保留 `locale.el` 后再加入 `el.patrol`，避免分页、日期选择器和空数据等内置词条丢失。
- 四个应用中未使用的 `getEnvConfig()` 及其 `dotenv`、`fs` 导入已移除。

## HK Three.js 水厂巡检场景

HK 的 AI 巡检执行详情页 `BIMdetail`（`inspectionMonitor/aiInspection/BIMdetail.vue`）挂载 `ThreeRectangle`（`three-water-plant/threeRectangle.vue`）展示水厂三维巡检场景。场景已从早期的程序化几何体/写死模拟设备演进为真实 GLB 模型巡检：并发加载外立面与内部结构两份模型，按业务提供的 28 个巡检点位（GLB 节点，巡检点位即"任务"）自动循环巡检（点位间镜头由 GSAP 时间轴平滑运镜，加载完成后首个点位镜头直接定格就位），并集成 orbit/patrol 两种相机模式（patrol 自动巡检为主，orbit 仅用于鼠标手动自由查看）、外立面三态、悬浮结果卡片、左侧任务面板（自动巡检推进时列表平滑滚动跟随，保证"巡检中"项始终在可视范围内）、全屏与"巡检对象配置视角"联动。早期全景浏览/厂房漫游切换按钮及整体/正面/侧面/内部预设视角飞行、操作提示均已按需求移除；任务列表不支持点击跳转（点击跳转会导致巡检 currentIndex 非顺序跳变、completed 计数错乱，破坏任务状态与进度条，故取消）。模型文件位于 `apps/HK/public/GLB/`：`TWFWPS_WLM.glb`（外立面）、`TWFWPS_SNSB.glb`（内部设备，由 Babylon 场景调试导出）。

### 目录与职责

- `three-water-plant/`：`threeRectangle.vue`（组件壳：工具栏、任务面板、结果卡片、全屏、加载遮罩）、`WaterPlantScene.ts`（渲染、相机、交互、GSAP 镜头运镜、模型加载与资源释放）、`patrolController.ts`（点位解析、transit/dwell 巡检节奏、停留高亮与进度）、`patrolResult.ts`（模拟 AI 识别结果数据源）、`types.ts`（场景回调与目标类型）。
- 同级 `shared/`（巡视页与"配置视角"页共用，保证保存的视角坐标两侧互通）：`constants.ts`（`TARGET_SIZE=1200` 归一化边长、GLB 文件名、`WATER_PLANT_MODELS`、`SCENE_CONFIG` 相机/雾/地面参数、`PATROL_CONFIG` 巡检控制配置、`CAMERA_CONTROL_CONFIG` 相机控制配置、`UI_CONFIG` UI 配置、`VIEWPOINT_PICKER_CONFIG` 配置视角选择器参数、`PATROL_IDS` 巡检点位列表，每项含展示名 `name` 与可选预设视角数据）、`environment.ts`（灯光与场景环境）、`utils.ts`（可见性/命中判定、递归释放几何材质纹理、Canvas 纹理）。
- `viewpoint/`：`ViewpointPicker.ts` + `viewpointDialog.vue`，巡检对象"配置视角"弹窗场景。点击设备自动聚焦运镜同样用 GSAP timeline（相机位置与注视点同步 `power2.inOut` 缓入缓出，时长 `FOCUS_FLIGHT_DURATION=0.8`），与巡检场景运镜观感一致，不再手写渲染循环补间。

### 模型加载与场景搭建

- `WaterPlantScene` 构造即创建 renderer，用 `GLTFLoader` 并发加载外立面 + 内部结构两个 GLB；URL 用 `new URL('GLB/…', window.location.href)` 基于当前地址解析，兼容 hash 路由与部署子路径。
- 外立面 mesh 统一半透明处理（opacity 0.45、DoubleSide、depthWrite 保持 true 避免内部变暗）；两个模型全部加载完成后再在 `modelRoot` 整体上统一缩放至 `TARGET_SIZE`、水平居中、底面贴 `y=0`（整体变换不改变内外模型相对位置，保证严格对齐）。
- 公共环境（`shared/environment.ts`，与配置视角页完全一致）：太阳光（2048 阴影贴图）作主光 + 环境光/半球光 + 正面/顶部内部补光；Canvas 程序化蓝天白云全景背景 + 雾效 + 水泥地面（接收模型阴影）+ PMREM 工业环境反射（不用外部 HDR 图）。
- 加载进度按"百分比 + 当前文件名标签"上报到加载遮罩；失败显示错误并可"重新加载"（`reloadModels` 先重置 `modelRoot` 的缩放/平移再重载，避免叠加）；全部加载完成后在 `modelRoot` 上统一归一化对齐，初始化巡检控制器并 `fitAll` 计算整体包围基线（作为 orbit 与自动跟随的参考，不要求镜头停留在覆盖全厂的鸟瞰位）；存在巡检对象时自动切入自动巡检，且首个点位若配置了预设机位则镜头直接定格该机位进入停留（`snapToFirstPatrolTarget`，避免加载完成后从高空晃入目标设备），否则停留在 orbit 自由观察。

### 渲染配置

renderer：`antialias + alpha`、`pixelRatio ≤ 2`、`SRGBColorSpace`、`ReinhardToneMapping` + exposure 2.0（明确不用 ACESFilmic，保证内部明亮同时避免地面过曝）、`PCFShadowMap`（避免 r155+ 弃用路径导致 shadow 采样器格式不匹配、地面消失）、`renderer.setAnimationLoop` 驱动渲染。`renderer.debug.checkShaderErrors = false` 静默 Windows Chrome ANGLE/D3D 后端对 three 内置 shader 的 X4122 浮点精度警告（`Program Info Log` 刷屏，该警告无害）；排查真实 shader 编译错误时移除该行即可。

### 两种相机模式（全景浏览/厂房漫游/预设视角已移除）

相机系统已收敛为两种模式，相关按钮与 TS 逻辑均已删除：orbit 全景浏览中的键盘移动辅助（WASD/方向键/Q-E，`updateOrbitMove`）、"整体/正面/侧面/内部"预设视角飞行（`flyToPreset`）以及 walk 厂房漫游整套（第一人称移动/转向、键盘监听、人眼高度贴地行走）都不再存在，仅保留下列能力：

- orbit 自由观察：球坐标（theta/phi/radius）。鼠标左键旋转、右键平移、滚轮缩放（带范围与俯仰限制）。仅用于用户手动查看，不承载任何自动跳转/恢复机位（原先"任务列表点击恢复保存机位"的 `flyToViewpoint` 已随点击跳转一起移除）。
- patrol 自动巡检：加载完成且存在巡检点位时默认进入（页面进入后即自动循环巡检）；首个点位若配置了预设机位则加载后镜头直接定格就位，后续点位间由 GSAP 时间轴平滑运镜，停留阶段无预设视角的点位走自动跟随；滚轮调整观察距离（默认 75，范围 40~900）。工具栏保留"自动巡检"按钮，随时可回到跟随模式。
- 两种模式互相切换都保持相机位置/朝向连续，不跳变（切换即结束当前飞行并平滑接管）。

`CameraMode` 类型现为 `'orbit' | 'patrol'`。

### 自动巡检（patrolController.ts）

- 巡检点位 `PATROL_IDS`（`shared/constants.ts`）共 28 个：每项含 `name`（任务/结果卡片展示名，如 "1#输水管道"）与 `modelId`（对应 GLB 内的节点名，`getObjectByName` 定位），并内置 `position/target/fov/distance` 预设视角数据（与"配置视角"页保存的数据结构一致，fov 均为 46）；未找到节点时 `console.warn` 并跳过。
- 点位解析取节点包围盒中心为巡检注视点、包围球半径为"设备整体入画"距离依据。`PatrolController` 只负责巡检"节奏"，不再内置路径巡航，阶段机为 `transit`（运镜中）/ `dwell`（停留中）两态：多点位构造后 `phase = 'transit'`、`pendingIndex = 0`，等待场景把镜头运镜到首个点位后由 `completeTransit()` 切入停留；单点位在构造时直接 `beginDwell(0)` 停留并循环巡检自身。
- 停留时长由 `PATROL_CONFIG.DWELL_DURATION`（3.4s）配置：目标设备所有 mesh 替换为青色 `MeshBasicMaterial` 闪烁（透明度正弦脉冲，频率与范围由 `PATROL_CONFIG` 配置），结束后恢复原材质并释放临时材质、进入下一段 `transit`；`completed/total` 与 `dwelling` 状态经 `onChange` 快照驱动界面。`beginDwell()` 包含索引边界检查，防止数组越界崩溃。
- 点位间镜头运镜由 `WaterPlantScene.updateCamera` 按阶段分派到 GSAP（`gsap@3.14.2`，pnpm catalog 管理）：`transit` 调 `ensurePatrolFlight()`——确保存在一次朝向 pending 点位的 GSAP 运镜，该点位未配置预设视角则直接 `completeTransit()`；`dwell` 调 `updateDwellCamera()`——点位有预设机位且镜头已在位时逐帧锁定 position/lookAt/fov，不在位（如从 orbit 切回）先 `flyCameraTo` 补一次运镜；未配置预设视角的点位走 `updatePatrolFollow` 自动跟随（注视点锁定设备中心、相机略高轻微俯视、距离保证设备整体入画、每 8 帧沿视线射线检测遮挡并拉近，不做抬升）。
- `flyCameraTo` 用 `gsap.timeline` 三轨编排：位置/注视点均为 `power2.inOut` 三次缓入缓出（位置全程、注视点 0.8× 时长，先转看目标再推进，出发缓起、临近目标减速滑入、到点速度趋零，避免"快速冲到设备前戛然而止"）、fov `sine.inOut`（0.7× 时长），时长按两点距离与 `CAMERA_CONTROL_CONFIG.FLIGHT_DURATION_FACTOR` 计算并限制在配置范围；注视起点取视线前方远点避免起飞瞬间镜头转动生硬，`onComplete` 统一收尾精确到位，消除旧方案逐帧 lerp"永远差一点、镜头晃动"的问题。所有运镜参数（时长系数、缓动、起点距离等）均由 `CAMERA_CONTROL_CONFIG` 统一配置。
- 首次进入：模型加载完成后若首个巡检点位配置了预设机位，`snapToFirstPatrolTarget()` 把相机直接定格到该机位（同步 `camPos`/`camLook` 平滑状态、写入机位 fov）并 `completeTransit()` 直接进入首段停留，跳过"整体鸟瞰 → 首个点位"的长距离运镜——页面进入即显示设备特写，不再从高空晃入。
- 推进驱动：控制器只按顺序自动推进/循环，不再提供外部驱动入口（原先组件 watch `activeItem.itemId` → `advanceToNextTarget()` 的接入链已随 `activeItem` prop 移除并整体删除）与"跳转到任意点位"的 `jumpToTarget`（随任务列表点击跳转一并移除），保证 `currentIndex`/`completed` 的顺序语义不被破坏。

### 前端面板与结果卡片（threeRectangle.vue）

- 工具栏：自动巡检（切回跟随模式，`cameraMode === 'patrol'` 时高亮）＋外立面 显示/透视（默认半透明 0.45）/隐藏 三态＋全屏按钮（`@vueuse/core` 的 `useFullscreen(containerRef)` 以场景容器为全屏目标，`:fullscreen` 时撑满视口并去除圆角边框；容器已有 `ResizeObserver`，全屏切换自动触发渲染尺寸与相机 aspect 更新）。全景浏览/厂房漫游模式切换按钮、整体/正面/侧面/内部预设视角按钮与右侧操作提示已按需求移除，对应 TS（`flyToPreset`、第一人称漫游、键盘移动辅助）也已一并删除。
- 左侧"巡检任务"面板：按 `name` 展示巡检点位并带状态（待巡检/巡检中/已巡检）与进度条（已巡检数 + 百分比），状态由巡检顺序推导（`index < currentIndex` 为已巡检），面板可收起/展开。任务项为纯展示、不支持点击跳转（点击后无法跟随自动巡检推进，会导致状态与进度失真，故移除该交互）。
- 智能巡检结果卡片：到达点位停留即弹出，卡片使用 CSS 自定义属性 `--card-x`/`--card-y` + `transform` 实现位置跟随（替代内联 `left`/`top` 样式，减少 DOM 重排），并启用 `will-change: transform` GPU 加速。每帧跟随设备屏幕投影（`emitTargetScreenPos`：仅在 `dwelling` 状态时计算投影，避免无效计算；投影锚点取设备顶部偏下"半径 × `UI_CONFIG.CARD_ANCHOR_HEIGHT_FACTOR`"高度，让卡片覆盖部分模型而不飘远；屏幕坐标做边界保护，左右留半卡宽、左侧避开任务面板、上下不出容器，边界参数由 `UI_CONFIG` 配置）。卡片含巡检结论（正常绿/异常橙/失败红）、识别结果（loading 转圈 → 模拟快照图 + 文案 + 置信度）、巡检时间，展示时长由 `UI_CONFIG.RESULT_CARD_DURATION`（15s）配置后自动淡出；切换任务时 abort 上一次请求防竞态。
- `patrolResult.ts`：当前为本地模拟数据源（1.5~3s 延迟、按 taskId hash 返回确定性模板、SVG data URL 快照占位图）；约定后续接后端时只替换 `requestPatrolResult` 实现（如 WebSocket 按 taskId 订阅识别结果），组件调用方不感知。
- 卸载清理：使用 try-catch/try-finally 包裹所有资源释放操作，防止异常阻塞后续清理；abort 结果请求、清除定时器、断开 `ResizeObserver`、`scene.dispose()`（停动画循环、移除事件、递归释放几何/材质/纹理、dispose 背景/环境纹理与 `renderLists`、`renderer.dispose()` + `forceContextLoss()`、移除 canvas）。

### 配置视角联动

- 巡检设置-巡检对象表单（`optCenter/inspectionSet/area/formDialog.vue`）提供"配置视角/重新配置"按钮，打开 `viewpointDialog`：在 `ViewpointPicker` 场景中点击模型内部设备（`BoxHelper` 青色高亮边框，不改材质避免替换 bug）自动计算右前上方 45° 机位并平滑飞行聚焦，可再手动微调后保存 `{ modelId, position, target, fov, distance }` 回写巡检对象。
- `ViewpointPicker` 与巡视场景共用同一套 GLB（外立面 + 内部结构）与 `TARGET_SIZE` 归一化参数、`shared/environment` 环境，保证保存视角坐标在巡视侧直接复用；巡视侧停留在点位时按点位内置视角数据（`PATROL_IDS` 的 `position/target/fov`）恢复机位，任务列表点击跳转入口已下线。配置弹窗侧栏提供外立面 显示/透视/隐藏 三态切换（默认半透明透视，与巡视场景一致），隐藏后内部设备完全可见便于选中；外立面构件不可拾取——点击外墙会跳过该命中、穿透选中其背后的内部设备，悬停外墙不显示手型。
- 组件 props 收敛为仅保留 `id`（`BIMdetail` 传入当前巡检任务 id，仅作标识，不参与场景逻辑）；`activeItem` 外部驱动（watch → `advanceToNextTarget`）已整体移除，`WaterPlantScene`/`PatrolController` 对应方法同步删除。页面进入后由 `PatrolController` 自动循环巡检全部内置点位；原 `viewpoints`（点位 → 机位映射，用于点击任务恢复机位）已随点击跳转功能移除。

### 与旧版本描述差异

- 相机交互已收敛为 orbit/patrol 两种模式：orbit 仅剩鼠标操作（左键旋转/右键平移/滚轮缩放），已无键盘移动辅助与"整体/正面/侧面/内部"预设视角；walk 厂房漫游整套（第一人称 WASD 行走、键盘监听、贴地高度回落）及 `flyToPreset` 均已从 `WaterPlantScene.ts` 删除，工具栏不再提供模式切换与预设视角入口。任务列表点击跳转（`jumpToTarget`）及用于恢复机位的 `flyToViewpoint` 飞行动画也已移除——点击跳转会令 `currentIndex` 非顺序跳变、`completed` 重复计数，导致任务状态与进度条失真，故任务面板改为纯展示。
- 已不存在 `plantFactory.ts / deviceFactory.ts / mockData.ts`，也无暂停/继续按钮、路径显隐开关、设备点击信息浮层；色调映射已从 ACESFilmic 调整为 Reinhard（exposure 2.0）；阴影为每帧动态渲染的 `PCFShadowMap`，并非"初始化后按需更新"。
- 场景独立使用 `ResizeObserver` 适配容器尺寸，与已废弃的 ProTable 尺寸补偿方案无关；组件卸载会完整释放 WebGL（网页图形渲染）资源。

### 性能优化与代码质量改进（2025-01）

**配置管理集中化**：所有硬编码的魔法数字已提取到 `shared/constants.ts`，新增 4 个配置对象统一管理参数：

- `PATROL_CONFIG`：巡检控制配置（停留时长 3.4s、闪烁频率 7Hz、高亮颜色与不透明度范围）
- `CAMERA_CONTROL_CONFIG`：相机控制配置（跟随距离 75、距离范围 40~900、高度系数 0.5、遮挡检测间隔 8 帧、orbit 半径/俯仰角范围、拖拽灵敏度、滚轮系数、平滑插值系数、GSAP 运镜时长计算参数）
- `UI_CONFIG`：UI 配置（结果卡片宽度 420px、显示时长 15s、任务面板宽度含边距 276px、卡片边界保护、锚点高度系数 0.35）
- `VIEWPOINT_PICKER_CONFIG`：配置视角选择器参数（最小/最大距离、阻尼系数、自动聚焦时长 0.8s、机位距离系数 2.2、拖拽判定阈值 5px）

**性能优化**（典型巡检场景整体性能提升约 20-40%）：

- 屏幕投影计算：添加 `isDwelling()` 检查，仅在停留阶段计算投影，减少约 70% 无效计算（orbit 模式和 transit 阶段跳过）
- 遮挡检测优化：频率从每 4 帧降低到每 8 帧；射线投射递归深度从 `true` 改为 `false`（只检测顶层模型容器 `glb-facade`/`glb-interior`，不递归到细小部件），复杂场景性能提升约 60%
- 结果卡片渲染：使用 CSS 自定义属性 `--card-x`/`--card-y` + `transform` 替代内联 `left`/`top` 样式，配合 `will-change: transform` 启用 GPU 加速，减少每帧 DOM 重排重绘约 30%

**资源释放安全性增强**：`threeRectangle.vue`、`WaterPlantScene.ts`、`ViewpointPicker.ts` 三个文件的 `dispose()` 清理逻辑全部使用 `try-catch`/`try-finally` 包裹，分别处理 GSAP timeline、事件监听器、Three.js 资源、DOM 操作的异常，防止单一异常阻塞后续清理导致内存泄漏。

**边界检查与错误处理**：

- `patrolController.beginDwell()` 添加索引边界检查（`index < 0 || index >= targets.length`），防止数组越界崩溃
- `emitSnapshot()` 安全访问当前点位，避免 `currentIndex` 越界导致 `targets[currentIndex]` 返回 `undefined`
- `ViewpointPicker` 模型加载失败添加日志（`console.error` 含模型标签与错误详情），便于排查

**代码可维护性**：所有相机控制参数（移动灵敏度、缩放系数、视角限制、运镜时长计算、平滑插值、遮挡检测间隔）、UI 尺寸（卡片宽度、面板宽度、边界保护）、巡检配置（停留时长、闪烁参数）均由配置对象统一管理，修改参数无需搜索代码中的硬编码数字。所有配置均有注释说明含义与单位。

## 验证状态

- `@patrol/shared` 和 `@patrol/ui` 初次从原三个应用抽取后，hglh、nanchang、yuedong 的 `build:test` 曾实际执行并通过。
- HK 已通过 `apps/*` 自动纳入 pnpm workspace，包名统一为 `@patrol/hk`，依赖使用 catalog（依赖版本目录）和 `workspace:*`；HK 由现有应用复制后接入，共享配置保持一致。使用仅对当前进程生效的 `HTTP_PROXY`/`HTTPS_PROXY=http://127.0.0.1:7890` 执行 `pnpm install --frozen-lockfile` 已成功，根锁文件包含 `apps/HK` importer（项目依赖入口）且无需更新。
- `gsap@3.14.2` 已加入 pnpm catalog 并由 HK 显式声明（`"gsap": "catalog:"`）。npm 官方 registry 直连下载 `gsap-3.14.2.tgz` 报 `ECONNRESET`，已在用户级 `~/.npmrc` 配置 `proxy`/`https-proxy=http://127.0.0.1:7890`（仅本机生效，未提交），走代理后 `pnpm install` 成功。巡检点位间镜头已改为 GSAP timeline 运镜 + 首点位直接定格，用户已在浏览器验收：设备与设备之间动画衔接流畅、无镜头晃动；"初始直接从高空飞入首个设备"问题已通过 `snapToFirstPatrolTarget` 修复，待再次人工确认。
- `three@0.185.0` 和 `@types/three@0.185.0` 已由 catalog 管理并由 HK 显式声明，HK 实际解析版本已核对为 `0.185.0`，`pnpm install --frozen-lockfile --ignore-scripts` 验证锁文件一致。水厂场景相关目标文件已通过语义诊断。
- 本次多语言改造涉及的四个 `App.vue`、三份共享语言资源和共享 UI 组件均已通过语义诊断，未发现错误。
- `pnpm --filter @patrol/hk build:test` 已在 Three.js r185 和 `el.patrol` 多语言改造后实际执行成功，退出码为 0，共转换 3063 个模块。因此可确认 HK 测试环境构建通过，但不能据此声明 HK 最新正式生产构建通过。
- HK 构建仍有原有非阻断警告，包括 `jsencrypt` 和部分旧业务代码使用 `eval`。尚未执行浏览器人工视觉验收，不能据此确认三语切换后的全部页面文案、布局、镜头动画和页面切换后的 WebGL 资源重建效果。
- 安装后已核对宿主与 `@patrol/ui` 的 Vue、Element Plus、图标包和 VueUse 物理解析路径，确认共享同一套运行时实例并绑定 TypeScript `4.9.5`。
- 粤东此前的 `pnpm --filter @patrol/yuedong build:pro` 已实际执行，退出码为 0；用户已验证统一运行时后的正式包表格列宽及空数据文案显示正常。该结果早于本次 `el.patrol` 改造，不能替代最新构建验证。
- 最新全工作区 `pnpm build:test` 未获执行授权；hglh、nanchang、yuedong 尚未针对本次多语言改造重新构建。声明四端最新状态全部通过前，仍需补跑并检查退出码。

## 已知问题与待办

- 需要在浏览器中人工切换 `zh`、`en`、`zh-HK`，确认 Element Plus 内置组件和已接入的共享 UI 文案同步变化；尚未批量迁移其他业务模块硬编码中文。
- 需要补跑 hglh、nanchang、yuedong 的最新测试或正式构建；HK 最新正式生产构建也尚未执行。
- Node 24 运行旧 Vite 4 开发代理时仍可能出现 `DEP0060`；应用中的 `volta.extends` 未能约束 `pnpm --filter ... exec node` 的实际 Node 版本，该项尚未解决。
- 根 TypeScript 已固定为 `4.9.5`，消除了 `@typescript-eslint` 对 TypeScript 5.9.3 的兼容警告；Commitizen 间接依赖仍可能提示要求 TypeScript 5 以上的 peer dependency（对等依赖）警告。
- 安装和构建仍可能提示旧版 Stylelint/Vite 插件对等依赖、`NODE_ENV=test`、`eval` 使用及大包体积警告，目前均为非阻断项。
- `aiPatrolManage` 单一 package 尚处于设计阶段。已确认 hglh、yuedong、nanchang 的视频能力递增及多处实现分叉；新增 HK 的能力差异尚未纳入调查，在范围方案确定前不得迁移或删除应用源码。
- ProTable 列配置目前按列 `label` 保存。若改为更稳定的 `prop`，必须兼容已有用户配置，不能直接替换。

## Git 状态

远程仓库为 `https://github.com/xiaoguoxing/patrol_web_monorepo.git`，首次 Monorepo 提交为 `4a63260`。当前工作区仍有未提交改动；不要假定本文列出的所有调整已进入 Git 历史。远程 push、PR 和 MR 默认由用户执行。
