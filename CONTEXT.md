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

HK 的执行中任务页面已使用 `ThreeRectangle` 替换原 `PicRes`，当前组件实际展示模块化水厂巡检场景，不再是简单长方体。场景包含 28 台前端写死的模拟设备，覆盖水泵、电机柜、仪表盘、指示灯、加药装置和鼓风机；不与真实巡检项名称或编号映射，`activeItem.itemId` 每次变为新的非空值时只触发固定顺序中的下一台设备特写。

场景源码拆分在 `three-water-plant` 目录：`plantFactory.ts` 负责厂区环境，`deviceFactory.ts` 负责设备几何体，`patrolController.ts` 负责路径、停留、高亮和结果状态，`WaterPlantScene.ts` 负责渲染、相机、鼠标交互及资源释放，`mockData.ts` 和 `types.ts` 分别维护模拟数据与类型。当前支持自动循环巡检、暂停/继续、路径显隐、跟随/自由视角、旋转/平移/缩放、设备点击信息和模拟 AI 巡检结果。

巡检路径进度与光标位置统一使用曲线参数取点 `getPoint()`，已消除设备间距不一致时 `getPointAt()` 按弧长取点造成的切换瞬移。Three.js 已升级到 `0.185.0`，渲染循环使用 `renderer.setAnimationLoop()`，启用 `ACESFilmicToneMapping`（ACES 电影级色调映射），静态阴影初始化后按需更新，并复用光标向量以减少每帧内存分配。

组件卸载时会清理动画循环、事件、几何体、材质、纹理和 WebGL（网页图形渲染）上下文。该场景使用 `ResizeObserver`（尺寸观察器）适配画布容器，与已废弃的 ProTable 尺寸补偿方案无关。当前仍是 Three.js 程序化几何体，不包含 RVT/GLB 实际模型、原 Demo 的画中画识别浮层或楼层过滤。

## 验证状态

- `@patrol/shared` 和 `@patrol/ui` 初次从原三个应用抽取后，hglh、nanchang、yuedong 的 `build:test` 曾实际执行并通过。
- HK 已通过 `apps/*` 自动纳入 pnpm workspace，包名统一为 `@patrol/hk`，依赖使用 catalog（依赖版本目录）和 `workspace:*`；HK 由现有应用复制后接入，共享配置保持一致。使用仅对当前进程生效的 `HTTP_PROXY`/`HTTPS_PROXY=http://127.0.0.1:7890` 执行 `pnpm install --frozen-lockfile` 已成功，根锁文件包含 `apps/HK` importer（项目依赖入口）且无需更新。
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
