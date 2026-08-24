# dsh-token-heatmap · v0.1.0-beta

> English version: see [README.en.md](./README.en.md)

设置内独立栏的本地 Token 热图插件，GitHub 风格日历视图。

- **零网络、零计费**：完全读取本地 `~/.dsh/sessions/**/session.jsonl.zstd`
- **持久化**：首次同步后，历史写到 `~/.dsh/storages/dsh-token-heatmap/`，删除会话不丢数
- **视图**：周（按小时展开）/ 月（铺满日历）/ 季度（近 90 天 GitHub 式）/ 年（整年双行）
- **统计**：今日 / 本周 / 本月 / 累计
- **Top5**：按模型 + 供应商双 Tab，按视图窗口动态计算；点击日期格后展示当日 Top5

## 截图

![周视图](assets/screenshot-week.png)

![月视图](assets/screenshot-month.png)

![季度 / 年度视图](assets/screenshot-quarter-year.png)

## 安装

```bash
# 1. 把插件装进 web profile
dsh plugin --profile web add file:./dsh-token-heatmap

# 2. 重启 dsh web
pkill -f "dsh web"
sleep 2
nohup dsh web > /tmp/dsh-web.log 2>&1 &

# 3. 打开 http://127.0.0.1:3080 → 设置 → Token Heatmap
```

> 如果是 `pnpm run dev:web` 模式且开启 `dsh-client-hmr`，第 2 步可省略，浏览器会自动重载。

## 效果一览

| 模块 | 效果 |
| --- | --- |
| **统计卡片**（右上） | 当周月总四张卡片，单行展示，数值保留两位小数 + 缩写 M / k |
| **语言切换**（右上角） | 中 / 英文，刷新时间线与视图也跟随 |
| **视图切换**（周 / 月 / 季度 / 年） | 跨视图统一分档：25% / 50% / 75% / 100% 四档绿 |
| **周视图** | 行号一列固定周几；每行 24 个小时柱看哪一时段用量高峰；点击行可看当日 Top5 |
| **月视图** | 7×5/6 日历格，方格颜色按用量分档，格内显示日期与当日总用量 |
| **季度视图** | 近 90 天 GitHub 风格栅格，方格与间距都拉大便于看清趋势 |
| **年度视图** | 整年 53 周双行排布，下方月份头、上方周列小方块 |
| **翻页** | 周 / 月视图有 ‹上一周 / 下一周› 控件（英文版同样有） |
| **Top5 切换** | 模型 ↔ 供应商 Tab；切换「视图」时重算；点击某天格后展示该日的 Top5 |
| **刷新** | 「刷新」按钮 + 自动刷新（5 / 10 / 30 / 60 分钟 / 关闭） |
| **更多操作** | 右上角 ⋯ 菜单里有「重置历史」（隐藏入口，罕用） |

## 数据来源

1. 启动时 Host 扫一遍 `~/.dsh/sessions/<ws>/<sid>/session.jsonl.zstd`，按行解析 `assistant/message` 与 `assistant/chunk:usage`
2. 同 `turn:step` 的临时 chunk 用量会被最终的 `assistant/message` 用量覆盖（同 `tokenUsage` projection 的去重策略）
3. 按 `Asia/Shanghai` 自然日分桶，逐日累加 `inputTokens / cacheReadTokens / cacheWriteTokens / outputTokens` 与按模型 / 供应商的子项
4. 写入 `~/.dsh/storages/dsh-token-heatmap/daily.json`（原子 `tmp + rename`）
5. 客户端每 10 分钟自动 fetch `/api/dsh-token-heatmap/daily.json`，或点「刷新」立即拉取

> 删除会话后再次刷新：持久化层保留历史最大值，不会回退。

## 持久化文件

| 路径 | 作用 |
| --- | --- |
| `~/.dsh/storages/dsh-token-heatmap/daily.json` | 累计的每日聚合（合并策略：取 `live` 与 `persisted` 的逐日 max，避免被删会话回退） |
| `~/.dsh/storages/dsh-token-heatmap/daily.json.tmp` | 原子写临时文件，写完后 `rename` 覆盖 |
| `localStorage["dsh-token-heatmap:autoRefreshMinutes"]` | 自动刷新间隔（分钟），默认 10 |
| `localStorage["dsh-token-heatmap:lang"]` | 语言偏好（zh / en） |

## 主题色阶（5 档，视图内 25% 分位）

| 档 | 颜色 | 含义 |
| --- | --- | --- |
| 0 | `#ebedf0` | 当日 0 |
| 1 | `#c6e48b` | (0, 25%×max] |
| 2 | `#7bc96f` | (25%, 50%×max] |
| 3 | `#239a3b` | (50%, 75%×max] |
| 4 | `#196127` | (75%, 100%×max] |

> 分档按当前视图内最大值自适应，避免月视图「全顶到最深色」或季度「一片白」。

## 开发

```bash
cd dsh-token-heatmap
pnpm install            # 装 tsdown / typescript / vitest 等
npx tsdown              # 出 lib/

# 单测（node:test 离线可跑）
node --test src/date-bucket.node-test.mjs \
           src/aggregation.node-test.mjs \
           src/host/store.node-test.mjs \
           src/host/persist.node-test.mjs
```

目录结构：

```
dsh-token-heatmap/
├── src/
│   ├── aggregation.ts       # 按日 / 按小时聚合 + Top 5 + 视图窗口
│   ├── date-bucket.ts       # 周 / 月 / 季度 / 年范围工具（周一为周起始）
│   ├── host/
│   │   ├── session-reader.ts  # 解 zstd + 解析会话事件
│   │   ├── store.ts          # HeatmapStore 增量 + 持久化合并
│   │   └── persist.ts        # 持久化文件读写 + max-merge 合并
│   ├── client/
│   │   ├── SettingsSection.tsx
│   │   ├── HeatmapGrid.tsx
│   │   ├── StatsCards.tsx
│   │   ├── ModelTop5.tsx
│   │   ├── hooks.ts          # useHeatmapData / useHeatmapView
│   │   ├── locales.ts        # 中英文文案
│   │   └── index.ts
│   └── index.ts              # 宿主侧入口 + 注册 /api/dsh-token-heatmap/daily.json
├── lib/                      # tsdown 产物（client.js / index.mjs）
└── tsdown.config.ts
```

## 热更新说明

- 改了 `src/client/*` 后只需 `npx tsdown && cp lib/client.js profile/lib/client.js`，浏览器硬刷新即可看到效果
- 改了 `src/index.ts`、`src/host/*`、`cordis.patch.yml` 需要重启 `dsh web`

```bash
# 一键：客户端热更新（无需重启）
cd /home/dell/testdsh/dsh-token-heatmap && npx tsdown && cp lib/client.js /home/dell/.dsh/profiles/web/node_modules/dsh-token-heatmap/lib/client.js

# 一键：构建 + 部署 + 重启（改宿主时）
cd /home/dell/testdsh/dsh-token-heatmap && npx tsdown && cp lib/client.js lib/index.mjs /home/dell/.dsh/profiles/web/node_modules/dsh-token-heatmap/lib/ && (pkill -f "dsh web"; sleep 3; nohup dsh web > /tmp/dsh-web.log 2>&1 &)
```

## FAQ

- **为什么都显示 0？** 检查 `~/.dsh/sessions` 下的 `session.jsonl.zstd` 是否有 `assistant/message` 与 `usage` 字段；Host 仅识别本地上报的 usage。
- **会联网吗？** 不会。无任何对计费 / 余额接口的调用。
- **时区？** 固定北京时区（`Asia/Shanghai`），周一为周起始。
- **数据准确吗？** 仅按 `assistant/message` / `assistant/chunk:usage` 客户端上报累加，未触发任何推断 / 重算。
- **如何重置？** 设置页右上角 ⋯ 菜单 → 「重置历史」（确认后清空 `daily.json`）；或直接删除该 JSON。

## 许可证

MIT
