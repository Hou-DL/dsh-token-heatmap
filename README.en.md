# dsh-token-heatmap · v0.1.0-beta

> 中文版本：见 [README.md](./README.md)

A settings-pane-only local Token heatmap plugin for DSH Web, styled after the GitHub contribution grid.

- **Zero network, zero billing** — reads `~/.dsh/sessions/**/session.jsonl.zstd` only
- **Persistent** — first sync is written to `~/.dsh/storages/dsh-token-heatmap/`; deleting sessions never loses history
- **Views** — Week (per-hour bars) / Month (full calendar) / Quarter (last ~90 days, GitHub grid) / Year (full year split in two rows)
- **Stats** — Today / This week / This month / All time
- **Top 5** — by Model and by Provider, recomputed per view; click a day to scope Top 5 to that day

## Screenshots

![Week view](assets/screenshot-week.png)

![Month view](assets/screenshot-month.png)

![Quarter / Year view](assets/screenshot-quarter-year.png)

## Install

```bash
# 1. Add the plugin to your web profile
dsh plugin --profile web add file:./dsh-token-heatmap

# 2. Restart dsh web
pkill -f "dsh web"
sleep 2
nohup dsh web > /tmp/dsh-web.log 2>&1 &

# 3. Open http://127.0.0.1:3080 → Settings → Token Heatmap
```

> If you run `pnpm run dev:web` with `dsh-client-hmr` enabled, step 2 is optional — the browser auto-reloads.

## Feature tour

| Module | Behavior |
| --- | --- |
| **Stats cards** (top-right) | Today / week / month / all-time in one row, two-decimal M / k formatting |
| **Language switch** (top-right) | 中 / English; refresh timestamp and view labels switch too |
| **View switch** (Week / Month / Quarter / Year) | One consistent 25 / 50 / 75 / 100% quantile palette across every view |
| **Week** | Fixed weekday column on the left; 24 hourly bars per row to see which hour is hot; click a row to scope Top 5 |
| **Month** | 7 × 5/6 calendar grid; cell background = usage bucket; date and total printed inside |
| **Quarter** | GitHub-style grid for the last 90 days, larger cells and gaps for trend spotting |
| **Year** | All 53 weeks laid out across two rows, month headers on top, small cells |
| **Paging** | Week / Month have ‹Prev / Next› controls (English-aware) |
| **Top 5 tabs** | Model ↔ Provider, recomputed per view; click a day in Month to scope it |
| **Refresh** | Manual button + auto refresh (5 / 10 / 30 / 60 min / Off) |
| **More** | A hidden ⋯ menu in the top-right has "Reset history" |

## Data source

1. On boot the Host scans every `~/.dsh/sessions/<ws>/<sid>/session.jsonl.zstd`, line-parses `assistant/message` and `assistant/chunk:usage`
2. Provisional `chunk:usage` for the same `turn:step` is replaced by the final `assistant/message:usage` (matches `tokenUsage` projection de-duplication)
3. Bucketed by `Asia/Shanghai` natural day, summing `inputTokens / cacheReadTokens / cacheWriteTokens / outputTokens` and per-model / per-provider subtotals
4. Atomically written to `~/.dsh/storages/dsh-token-heatmap/daily.json` (tmp + rename)
5. The client polls `/api/dsh-token-heatmap/daily.json` every 10 minutes (or on demand via Refresh)

> After you delete a session, the next refresh keeps the historical high water mark — totals never decrease.

## Persistent files

| Path | Purpose |
| --- | --- |
| `~/.dsh/storages/dsh-token-heatmap/daily.json` | Cumulative per-day aggregation (max-merge of live × persisted) |
| `~/.dsh/storages/dsh-token-heatmap/daily.json.tmp` | Atomic-write scratch (renamed on success) |
| `localStorage["dsh-token-heatmap:autoRefreshMinutes"]` | Auto-refresh interval in minutes, default `10` |
| `localStorage["dsh-token-heatmap:lang"]` | Language preference, `zh` or `en` |

## Color scale (5 buckets, view-aware 25% quantile)

| Level | Color | Range |
| --- | --- | --- |
| 0 | `#ebedf0` | day total = 0 |
| 1 | `#c6e48b` | (0, 25% × max] |
| 2 | `#7bc96f` | (25%, 50% × max] |
| 3 | `#239a3b` | (50%, 75% × max] |
| 4 | `#196127` | (75%, 100% × max] |

> Quantiles are computed against the **current view's** maximum, so Month and Quarter no longer collapse into the darkest band.

## Develop

```bash
cd dsh-token-heatmap
pnpm install            # tsdown / typescript / vitest
npx tsdown              # produces lib/

# Offline tests (node:test)
node --test src/date-bucket.node-test.mjs \
           src/aggregation.node-test.mjs \
           src/host/store.node-test.mjs \
           src/host/persist.node-test.mjs
```

Layout:

```
dsh-token-heatmap/
├── src/
│   ├── aggregation.ts       # per-day / per-hour aggregation + Top 5 + view windows
│   ├── date-bucket.ts       # Week / Month / Quarter / Year ranges (Mon-start)
│   ├── host/
│   │   ├── session-reader.ts  # zstd + session event parser
│   │   ├── store.ts          # HeatmapStore: incremental + persisted merge
│   │   └── persist.ts        # daily.json R/W + max-merge
│   ├── client/
│   │   ├── SettingsSection.tsx
│   │   ├── HeatmapGrid.tsx
│   │   ├── StatsCards.tsx
│   │   ├── ModelTop5.tsx
│   │   ├── hooks.ts          # useHeatmapData / useHeatmapView
│   │   ├── locales.ts        # zh / en dictionaries
│   │   └── index.ts
│   └── index.ts              # Host entry: registers /api/dsh-token-heatmap/daily.json
├── lib/                      # tsdown output (client.js / index.mjs)
└── tsdown.config.ts
```

## Hot reload

- Changed `src/client/*` → just `npx tsdown && cp lib/client.js profile/lib/client.js`, then hard-refresh the browser.
- Changed `src/index.ts`, `src/host/*`, or `cordis.patch.yml` → restart `dsh web`.

```bash
# Client-only hot update (no restart)
cd /home/dell/testdsh/dsh-token-heatmap && npx tsdown && cp lib/client.js /home/dell/.dsh/profiles/web/node_modules/dsh-token-heatmap/lib/client.js

# Build + deploy + restart (host changes)
cd /home/dell/testdsh/dsh-token-heatmap && npx tsdown && cp lib/client.js lib/index.mjs /home/dell/.dsh/profiles/web/node_modules/dsh-token-heatmap/lib/ && (pkill -f "dsh web"; sleep 3; nohup dsh web > /tmp/dsh-web.log 2>&1 &)
```

## FAQ

- **Why is everything 0?** Check whether `~/.dsh/sessions/<...>/session.jsonl.zstd` actually contains `assistant/message` with a `usage` field — the Host only consumes client-reported usage.
- **Does this hit the network?** No. No billing / balance endpoints are called.
- **Timezone?** Fixed to `Asia/Shanghai`. Week starts on Monday.
- **How accurate is the data?** Exactly the sum of `assistant/message` / `assistant/chunk:usage` — no inference or re-derivation.
- **How do I reset?** The hidden ⋯ menu in the top-right of the page has a "Reset history" item (with a confirmation), or simply delete the JSON file.

## License

MIT
