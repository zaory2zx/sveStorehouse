# SVE 小仓库 (sveStorehouse)

影之诗进化对决（Shadowverse: Evolve）卡牌库存管理桌面应用。

## 功能

- **库存管理**：跨语言搜索，按版本与印刷筛选，增减库存
- **购物车**：记录计划购入的卡牌，支持筛选与数量调整
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

## 职业图标

将 PNG 放入 `public/assets/craft/`，详见该目录 README。
