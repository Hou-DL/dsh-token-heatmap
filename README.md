# dsh-token-heatmap

> English: [README.en.md](./README.en.md)

本地 Token 用量热图插件，GitHub 风格日历视图，内置于 DSH Web 设置页。

## 环境要求

- **Node.js ≥ 23.8**（内置 `node:zlib` 的 zstd 解码，无需额外安装）；更早版本会回退到外部 `zstd` CLI（`sudo apt install zstd` / `brew install zstd`）。
- **DSH Web profile**（`dsh web` 已运行）。

## 安装


```bash
# 从 GitHub
dsh plugin --profile web add github:Hou-DL/dsh-token-heatmap

# 或从 Gitee（国内访问更快）
dsh plugin --profile web add "git+https://gitee.com/HouDL/dsh-token-heatmap.git"
```

重启后打开 **设置 → Token Heatmap** 即可。

- **零网络、零计费**：只读本地会话日志，不触碰任何计费 / 余额接口
- **持久化**：历史落盘，删除会话不丢数据
- **多视图**：周（按小时展开）/ 月（日历）/ 季度（近 90 天）/ 年（整年双行）
- **统计**：今日 / 本周 / 本月 / 累计 + 按模型与供应商的 Top 5

## 截图

<p align="center">
  <img src="assets/screenshot-week.png" alt="周视图" width="80%">
  <br><br>
  <img src="assets/screenshot-month.png" alt="月视图" width="80%">
  <br><br>
  <img src="assets/screenshot-quarter-year.png" alt="季度 / 年度视图" width="80%">
</p>

## 功能

| 模块 | 说明 |
| --- | --- |
| 视图切换 | 周 / 月 / 季度 / 年，颜色按视图内 25% / 50% / 75% / 100% 四档分档 |
| 周视图 | 每天 24 个小时柱，看高峰时段；可点击行查看当日 Top 5 |
| 月视图 | 日历格显示日期与当日用量 |
| 季度 / 年度 | GitHub 风格栅格，季度放大便于观察，年度双行排布 |
| 顶部统计 | 今日 / 本周 / 本月 / 累计，M / k 缩写 |
| 模型 Top 5 | 按模型或供应商查看，随视图窗口 / 点击日期动态切换 |
| 刷新 | 手动刷新 + 自动刷新（5 / 10 / 30 / 60 分钟，可关闭） |
| 语言 | 中 / 英文切换 |

## 常见问题

- **显示 0？** 确认 `~/.dsh/sessions` 下有含 `usage` 字段的会话日志。
- **会联网吗？** 不会，纯本地统计。
- **时区？** 固定北京时区，周一为周起始。
- **如何重置？** 设置页右上角 ⋯ → 「重置历史」。

## 开发

```bash
pnpm install && npx tsdown   # 构建
node --test src/             # 运行测试
```

## License

MIT