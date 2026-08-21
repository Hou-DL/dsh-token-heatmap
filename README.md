# dsh-token-heatmap

Settings-only local Token heatmap for DSH Web — GitHub-style daily grid, with week/month/quarter/year views, daily/weekly/monthly/all totals, and Top 5 models plus daily winner.

> 数据源完全本地：解析 `~/.dsh/sessions/**/session.jsonl.zstd` 的 `assistant/message` + `assistant/chunk usage`，按 `Asia/Shanghai` 自然日分桶，零网络、零计费。首次安装同步历史后持久化到独立数据文件，删除会话不丢失历史。

## Features

- **Settings 独立栏**：设置左侧「用量热图」入口（`settings.section`），不占主页/侧边栏
- **四档视图**：周（7 天明细）/ 月（周一对齐）/ 季度 / 年（53 周 GitHub 式）
- **四档统计**：今日 / 本周 / 本月 / 累计，总 token + 今日次数
- **热图**：5 档绿（0/1-2k/2k-10k/10k-50k/50k+），悬停显示日期、总量、Top3 模型、每日最常用
- **Top 5 模型 & 供应商**：随视图窗口重新计算 + 每日最常用徽标
- **持久化**：历史按日聚合持久化，删除会话不丢数
- **刷新**：支持手动刷新与可配置自动刷新（默认 10 分钟）

## Install

```bash
dsh plugin --profile web add file:./dsh-token-heatmap
# restart dsh web, then open Settings → 用量热图
```

## How it works

- Host: `session-reader.ts` parses `request/header` (fallback provider/model) + `assistant/chunk:usage` (provisional) + `assistant/message:usage` (authoritative, overwrites provisional for same turn/step) → `HeatmapStore` aggregates via `aggregation.ts` (dedup by turn:step, `Asia/Shanghai` bucketing, per-model & per-provider).
- Persistent store: `storages/dsh-token-heatmap.json` (append-only by day, surviving session deletion).
- Client: `SettingsSection` + `HeatmapGrid` + `StatsCards` + `ModelTop5`, auto-refresh 10 min + manual refresh + settings for interval.

## FAQ

- **如何重置？** 在设置页点击重置或删除 `~/.dsh/storages/dsh-token-heatmap.json`。
- **时区？** 固定北京时区，周一为周起始。
- **会联网吗？** 不会，无计费/余额接口。

## Dev

```bash
node --test src/date-bucket.node-test.mjs src/aggregation.node-test.mjs src/host/store.node-test.mjs
# vitest variants also present: src/*.test.ts
```

## Screenshot

See the GitHub contribution-style heatmap in Settings → 用量热图.
