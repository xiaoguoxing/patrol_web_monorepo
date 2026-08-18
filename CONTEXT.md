# 智能巡检前端 Monorepo 上下文

## 项目定位

本仓库使用 pnpm workspace（pnpm 工作区）统一管理多个智能巡检版本和共享包。安装、构建及质量检查统一从仓库根目录执行，各应用不保证脱离仓库独立安装。

## 工作区结构

| 目录              | 包名               | 说明                                                           |
| ----------------- | ------------------ | -------------------------------------------------------------- |
| `apps/hglh`       | `@patrol/hglh`     | 黄阁、榄核共用源码，通过不同 Vite mode（构建模式）生成两个版本 |
| `apps/HK`         | `@patrol/hk`       | HK 版本                                                        |
| `apps/nanchang`   | `@patrol/nanchang` | 南昌版本                                                       |
| `apps/yuedong`    | `@patrol/yuedong`  | 粤东版本                                                       |
| `packages/shared` | `@patrol/shared`   | 四端共用 hooks、utils 和 typings 的单一源码                    |
| `packages/ui`     | `@patrol/ui`       | 四端共用基础组件、指令及 UI 能力的单一源码                     |

黄阁使用 `hgProduction`，榄核使用 `lhProduction`；必须继续保留两套环境文件、构建命令和产物，不应拆成两个应用。

## 工程约定

- Node.js 基准版本：`20.12.2`；pnpm 版本：`10.28.0`。
- `pnpm-workspace.yaml` 包含 `apps/*` 和 `packages/*`。
- 依赖版本由 pnpm catalog（依赖版本目录）统一维护，各应用和共享包仍显式声明自己使用的依赖。
- ESLint、Prettier、Stylelint、PostCSS、EditorConfig、lint-staged 和 Husky 配置位于根目录。
- TypeScript 公共选项位于 `tsconfig.base.json`，各项目保留路径别名和 include 配置。
- Vite 配置、环境变量、代理地址和版本专属构建脚本保留在各应用内。
- 根目录 `pnpm-lock.yaml` 是唯一锁文件，不使用应用内 `package-lock.json`。
- 共享包采用单一源码策略，修改 `packages/shared` 或 `packages/ui` 会同时影响四个应用，必须执行四端验证。

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

当前注入能力只服务于 ProTable 的用户列配置。`v-auth` 按钮权限指令由四个应用各自注册并直接读取本地 `AuthStore`，不通过共享 UI 适配器读取权限。

`@patrol/ui` 将 `vue`、`element-plus`、`@element-plus/icons-vue` 和 `@vueuse/core` 声明为 `peerDependencies`（对等依赖），运行时复用宿主提供的实例；相同依赖同时保留在 `devDependencies`（开发依赖），只供 UI 包自身开发和类型检查。四个应用的 Vite 配置同时使用 `resolve.dedupe`（模块去重）作为构建侧保障，避免同一运行时被重复打包。

## 已处理问题

- 四个应用均显式声明 `lodash`、`lodash-es` 及对应类型，修复 pnpm 严格依赖隔离下的模块解析失败。
- 四个 Vite 配置显式使用根目录 `.eslintignore`，避免构建时检查字体图标生成文件。
- `ProTableProps` 对 Element Plus `TableProps` 的复杂类型继承使用 `/* @vue-ignore */`，其余表格属性继续通过 `$attrs` 透传。
- `packages/ui/src/env.d.ts` 提供 `*.vue` 模块声明，解决共享组件入口的 TS2307 模块解析错误。
- ProTable 保留现有列配置 `get/set` 接口和数据格式。正式构建中的列宽异常和 Element Plus 空数据英文问题，根因是宿主与 `@patrol/ui` 曾解析到不同物理实例，导致组件注入上下文和布局状态分离；现已通过 `peerDependencies`、宿主显式依赖及 Vite `resolve.dedupe` 统一 Vue、Element Plus、图标包和 VueUse 运行时。
- ProTable 不使用 `ResizeObserver`（尺寸观察器）、`requestAnimationFrame`（浏览器逐帧回调）或额外 `doLayout()` 监听。该临时方案已移除，统一运行时后不再需要尺寸补偿。
- 四个应用的 Element Plus 语言配置默认使用中文，仅在应用语言显式为 `en` 时切换英文。
- 四个应用中未使用的 `getEnvConfig()` 及其 `dotenv`、`fs` 导入已移除。

## HK Three.js 水厂巡检场景

HK 的执行中任务页面已使用 `ThreeRectangle` 替换原 `PicRes`，当前组件实际展示模块化水厂巡检场景，不再是简单长方体。场景包含 28 台前端写死的模拟设备，覆盖水泵、电机柜、仪表盘、指示灯、加药装置和鼓风机；不与真实巡检项名称或编号映射，`activeItem.itemId` 每次变为新的非空值时只触发固定顺序中的下一台设备特写。

场景源码拆分在 `three-water-plant` 目录：`plantFactory.ts` 负责厂区环境，`deviceFactory.ts` 负责设备几何体，`patrolController.ts` 负责路径、停留、高亮和结果状态，`WaterPlantScene.ts` 负责渲染、相机、鼠标交互及资源释放，`mockData.ts` 和 `types.ts` 分别维护模拟数据与类型。当前支持自动循环巡检、暂停/继续、路径显隐、跟随/自由视角、旋转/平移/缩放、设备点击信息和模拟 AI 巡检结果。

组件卸载时会清理动画帧、事件、几何体、材质、纹理和 WebGL（网页图形渲染）上下文。该场景使用 `ResizeObserver`（尺寸观察器）适配画布容器，与已废弃的 ProTable 尺寸补偿方案无关。当前仍是 Three.js 程序化几何体，不包含 RVT/GLB 实际模型、原 Demo 的画中画识别浮层或楼层过滤。

## 验证状态

- `@patrol/shared` 和 `@patrol/ui` 初次从原三个应用抽取后，hglh、nanchang、yuedong 的 `build:test` 曾实际执行并通过。
- HK 已通过 `apps/*` 自动纳入 pnpm workspace，包名统一为 `@patrol/hk`，依赖使用 catalog（依赖版本目录）和 `workspace:*`；HK 由现有应用复制后接入，共享配置保持一致。使用仅对当前进程生效的 `HTTP_PROXY`/`HTTPS_PROXY=http://127.0.0.1:7890` 执行 `pnpm install --frozen-lockfile` 已成功，根锁文件包含 `apps/HK` importer（项目依赖入口）且无需更新。
- HK 的 `package.json`、`tsconfig.json`、Vite 配置、`main.ts` 和 `App.vue` 已通过语义诊断，未发现错误；其 `tsconfig.json` 已继承根配置并包含共享包源码，无需额外调整。
- `three@0.160.0` 和 `@types/three@0.160.0` 已由 catalog 管理并由 HK 显式声明。水厂场景 8 个目标文件已通过语义诊断；`pnpm build:hk` 已实际执行成功，退出码为 0，转换 3057 个模块并生成 `apps/HK/dist_HK_production`。Three.js 场景 chunk 约 `494.58 kB`，gzip 后约 `128.63 kB`。
- HK 构建仍有原有非阻断警告，包括 `.env` 中的 `NODE_ENV=production` 提示，以及 `jsencrypt` 和部分旧业务代码使用 `eval`。尚未执行浏览器人工视觉验收，不能据此确认布局、交互、镜头动画和页面切换后的 WebGL 资源重建效果。
- 安装后已核对宿主与 `@patrol/ui` 的 Vue、Element Plus、图标包和 VueUse 物理解析路径，确认共享同一套运行时实例并绑定 TypeScript `4.9.5`。
- 粤东最新 `pnpm --filter @patrol/yuedong build:pro` 已实际执行，退出码为 0；用户已验证统一运行时后的正式包表格列宽及空数据文案显示正常。
- 黄阁/榄核和南昌尚未在最新对等依赖状态下重新执行正式构建。声明四端全部通过前，仍需补跑对应构建并检查退出码。

## 已知问题与待办

- Node 24 运行旧 Vite 4 开发代理时仍可能出现 `DEP0060`；应用中的 `volta.extends` 未能约束 `pnpm --filter ... exec node` 的实际 Node 版本，该项尚未解决。
- 根 TypeScript 已固定为 `4.9.5`，消除了 `@typescript-eslint` 对 TypeScript 5.9.3 的兼容警告；Commitizen 间接依赖仍可能提示要求 TypeScript 5 以上的 peer dependency（对等依赖）警告。
- 安装和构建仍可能提示旧版 Stylelint/Vite 插件对等依赖、`NODE_ENV=test`、`eval` 使用及大包体积警告，目前均为非阻断项。
- `aiPatrolManage` 单一 package 尚处于设计阶段。已确认 hglh、yuedong、nanchang 的视频能力递增及多处实现分叉；新增 HK 的能力差异尚未纳入调查，在范围方案确定前不得迁移或删除应用源码。
- ProTable 列配置目前按列 `label` 保存。若改为更稳定的 `prop`，必须兼容已有用户配置，不能直接替换。

## Git 状态

远程仓库为 `https://github.com/xiaoguoxing/patrol_web_monorepo.git`，首次 Monorepo 提交为 `4a63260`。当前工作区仍有未提交改动；不要假定本文列出的所有调整已进入 Git 历史。远程 push、PR 和 MR 默认由用户执行。
