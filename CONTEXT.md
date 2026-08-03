# 智能巡检前端 Monorepo 上下文

## 项目定位

本仓库使用 pnpm workspace（pnpm 工作区）统一管理多个智能巡检版本。所有安装、构建和质量检查均从仓库根目录执行，各应用不保证脱离仓库独立安装。

## 当前应用

| 目录            | 包名               | 说明                                                                 |
| --------------- | ------------------ | -------------------------------------------------------------------- |
| `apps/hglh`     | `@patrol/hglh`     | 黄阁、榄核共用同一套源码，通过不同 Vite mode（构建模式）生成两个版本 |
| `apps/nanchang` | `@patrol/nanchang` | 南昌版本                                                             |
| `apps/yuedong`  | `@patrol/yuedong`  | 粤东版本                                                             |

黄阁使用 `hgProduction`，榄核使用 `lhProduction`；必须继续保留两套环境文件、构建命令和产物，不应拆成两个应用。

## 工程约定

- Node.js 基准版本：`20.12.2`。
- pnpm 版本：`10.28.0`。
- 工作区入口：`pnpm-workspace.yaml`，当前包含 `apps/*`。
- 依赖版本由 pnpm catalog（依赖版本目录）统一维护，各应用仍显式声明自己使用的依赖。
- ESLint、Prettier、Stylelint、PostCSS、EditorConfig、lint-staged 和 Husky 配置位于根目录。
- TypeScript 公共选项位于 `tsconfig.base.json`，应用保留路径别名和 include 配置。
- Vite 配置、环境变量、代理地址和版本专属构建脚本保留在各应用内。
- 统一锁文件为根目录 `pnpm-lock.yaml`，不再使用应用内 `package-lock.json`。

## 常用命令

```bash
pnpm install
pnpm dev:hglh
pnpm dev:nanchang
pnpm dev:yuedong
pnpm build:hglh
pnpm build:nanchang
pnpm build:yuedong
pnpm build:test
pnpm lint
```

## 已处理问题

- 三个应用补充了直接依赖 `lodash`、`lodash-es` 及对应类型声明，修复 pnpm 严格依赖隔离下的模块解析失败。
- 三个 Vite 配置显式使用根目录 `.eslintignore`，避免构建时检查字体图标生成文件。
- `ProTableProps` 对 Element Plus `TableProps` 的复杂类型继承使用 `/* @vue-ignore */`，并显式声明 `height`；其余表格属性仍通过 `$attrs` 透传。
- `hglh`、`nanchang`、`yuedong` 的 `build:test` 均已实际执行并通过。

## 已知警告

安装和构建仍会提示旧版 peer dependency（对等依赖）、`NODE_ENV=test`、TypeScript 版本、`eval` 使用及大包体积警告。它们当前不阻断构建，但后续升级工具链时需单独处理，不能与共享包抽取混在一次改造中。

## 下一阶段：共享 packages

三个应用约有 359 个文件逐字相同，其中 `hooks`、`stores`、基础组件和多数静态资源重合度较高；`views`、`public`、API 端点和 Vite 配置已有明显版本差异。抽取前需确认共享策略：单一源码、模板复制或混合模式。建议优先采用混合模式，将稳定的基础组件、hooks 和 utils 抽到 `packages`，业务页面继续留在应用内。抽取后修改共享包会同时影响所有版本，必须逐包迁移并验证三个应用。

## Git 状态

远程仓库为 `https://github.com/xiaoguoxing/patrol_web_monorepo.git`。首次 monorepo 提交为 `4a63260`；当前依赖修复、锁文件和本文档尚未提交。
