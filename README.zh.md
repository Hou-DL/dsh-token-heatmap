# dsh-token-heatmap · 用量热图

设置内独立栏的本地 Token 热图：周/月/季度/年四视图、GitHub 风格日历、日/周/月/总统计、按模型/供应商 Top5 与每日最常用。

> 纯本地：解析 `~/.dsh/sessions/**/session.jsonl.zstd` 的 `assistant/message` + `assistant/chunk usage`，按北京时间自然日分桶，零网络、零计费。首次安装同步历史后持久化，删除会话不丢失历史。

## 安装

```bash
dsh plugin --profile web add file:./dsh-token-heatmap
# 重启 dsh web 后打开 设置 → 用量热图
```

## 常见问题

- **如何清零？** 在设置页重置或删除 `~/.dsh/storages/dsh-token-heatmap.json`。
- **时区？** 固定 `Asia/Shanghai`，周一为周起始。
- **会联网吗？** 不会。
