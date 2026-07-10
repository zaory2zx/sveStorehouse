# SVE 小仓库 (sveStorehouse)

影之诗进化对决（Shadowverse: Evolve）卡牌库存管理桌面应用。

## 功能

- **库存管理**：跨语言搜索，按版本筛选，增减库存，导出图片清单
- **购物车**：记录计划购入的卡牌，支持筛选、数量调整与导出图片
- **添加卡牌**：搜索卡名/卡号，按普通/闪卡/异画/PR 版本录入
- **交易记录**：买入/卖出/交换，记录金额（¥），自动更新库存
- **库存统计**：按职业、系列、版本分布，交易金额汇总

## 卡库数据

| 来源 | 内容 |
|------|------|
| [SVEDB_Extract](https://github.com/capnkenny/SVEDB_Extract) | 英文卡名/效果（辅助搜索） |
| [SVE-helper API](https://www.svehelperwin.com/) | 简中/日文卡名与效果 |

每张卡以卡号（如 `BP01-001`）为唯一标识，不区分简中/英文/日文印刷版本。

## 开发

```bash
npm install
npm run dev
```

首次启动需联网同步卡库（英文 + 简中，约需 1～2 分钟）。

侧边栏「同步卡库」可手动更新。

## 数据存储

Windows: `%APPDATA%/sve-inventory/inventory.db`

## 数据同步（可选）

应用可完全离线使用。侧边栏「数据同步」提供两种方式，按需选用：

| 方式 | 说明 |
|------|------|
| **离线备份** | 导出 `.svebackup` 文件，在另一台电脑导入。无需云账号。 |
| **OneDrive** | 连接微软账号后一键同步。需在 `electron/onedrive.config.json` 配置客户端 ID（见下方）。 |

### 配置 OneDrive（开发者打包前）

```bash
cp electron/onedrive.config.example.json electron/onedrive.config.json
```

编辑 `electron/onedrive.config.json`，填入 Azure 应用注册的 `clientId`，然后重新打包。

未配置 OneDrive 时，用户仍可使用离线导入/导出，不影响其他功能。

### 公司 / 家里交替使用

1. 离开电脑前：打开「数据同步」→ 点「智能同步」或「上传覆盖」
2. 到另一台电脑：连接同一微软账号 →「智能同步」或「下载覆盖」

## 职业图标

将 PNG 放入 `public/assets/craft/`，详见该目录 README。
