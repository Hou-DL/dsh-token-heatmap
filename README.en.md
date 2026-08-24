# dsh-token-heatmap

> 中文版：见 [README.md](./README.md)

A local Token usage heatmap plugin for DSH Web — GitHub-style calendar views, built into the Settings pane.

## Install

```bash
# From GitHub
dsh plugin --profile web add github:Hou-DL/dsh-token-heatmap

# Or from Gitee (faster in China)
dsh plugin --profile web add "git+https://gitee.com/HouDL/dsh-token-heatmap.git"
```

Restart, then open **Settings → Token Heatmap**. 

- **Zero network, zero billing** — reads local session logs only, never touches billing/balance APIs
- **Persistent** — history is stored on disk; deleting sessions never loses data
- **Multiple views** — Week (per-hour) / Month (calendar) / Quarter (last ~90 days) / Year (full year, two rows)
- **Stats** — Today / This week / This month / All time + Top 5 by model and by provider

## Screenshots

![Week view](assets/screenshot-week.png)

![Month view](assets/screenshot-month.png)

![Quarter / Year view](assets/screenshot-quarter-year.png)

## Features

| Module | Description |
| --- | --- |
| View switcher | Week / Month / Quarter / Year, colored with a view-adaptive 25 / 50 / 75 / 100% palette |
| Week view | 24 hourly bars per day to spot peak hours; click a row to see that day's Top 5 |
| Month view | Calendar cells showing date and daily usage |
| Quarter / Year | GitHub-style grids; quarter is enlarged for readability, year laid out in two rows |
| Top stats | Today / Week / Month / All-time, M / k abbreviated |
| Top 5 models | By model or provider, switching with the view window / clicked date |
| Refresh | Manual refresh + auto refresh (5 / 10 / 30 / 60 min, or off) |
| Language | 中 / English switch |

## FAQ

- **Everything shows 0?** Make sure `~/.dsh/sessions` contains session logs with a `usage` field.
- **Does it go online?** No. Fully local.
- **Timezone?** Fixed to Asia/Shanghai, weeks start on Monday.
- **How to reset?** Settings page → ⋯ menu (top-right) → Reset history.

## Development

```bash
pnpm install && npx tsdown   # build
node --test src/             # run tests
```

## License

MIT