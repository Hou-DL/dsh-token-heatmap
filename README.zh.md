# dsh-token-pulse

本地 Token 用量热图插件，GitHub 风格日历视图，内置于 DSH Web 设置页。

## 环境要求

- **Node.js ≥ 23.8**（内置 zstd 解码，无需额外安装）；更早版本需外部 `zstd` CLI。

## 安装


```bash
# 从 GitHub
dsh plugin --profile web add github:Hou-DL/dsh-token-pulse
# 或从 Gitee
dsh plugin --profile web add "git+https://gitee.com/HouDL/dsh-token-pulse.git"
```

重启后打开 **设置 → Token Pulse**。


- **零网络、零计费**：只读本地会话日志
- **持久化**：历史落盘，删除会话不丢数据
- **多视图**：周（按小时）/ 月（日历）/ 季度（近 90 天）/ 年（整年双行）
- **Top 5**：按模型与供应商统计

## 常见问题

- **会联网吗？** 不会，纯本地统计。
- **时区？** 固定北京时区，周一为周起始。
- **如何重置？** 设置页右上角 ⋯ → 「重置历史」。

完整文档：[README.md](./README.md) · [README.en.md](./README.en.md)