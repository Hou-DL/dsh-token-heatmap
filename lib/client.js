window.__ModuleLoader__.load({
	id: "dsh-token-heatmap",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __exportAll = (all, no_symbols) => {
			let target = {};
			for (var name in all) __defProp(target, name, {
				get: all[name],
				enumerable: true
			});
			if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
			return target;
		};
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/StatsCards.tsx
		function formatTokens$1(n) {
			if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
			if (n >= 1e3) return (n / 1e3).toFixed(2) + "k";
			return n.toLocaleString();
		}
		function StatCard({ label, value, hint }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					border: "1px solid var(--dsw-alias-border-l2)",
					background: "var(--dsw-alias-bg-layer-3)",
					borderRadius: 12,
					padding: "12px 14px",
					display: "flex",
					flexDirection: "column",
					gap: 4,
					minWidth: 0
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 12,
							color: "var(--dsw-alias-label-tertiary)",
							lineHeight: "18px"
						},
						children: label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 18,
							fontWeight: 600,
							color: "var(--dsw-alias-label-primary)",
							lineHeight: "28px",
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap"
						},
						children: formatTokens$1(value)
					}),
					hint ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 12,
							color: "var(--dsw-alias-label-tertiary)",
							lineHeight: "16px"
						},
						children: hint
					}) : null
				]
			});
		}
		function StatsCards({ t, totals, todayCount }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "grid",
					gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
					gap: 12
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
						label: t("stats.today"),
						value: totals.today,
						hint: todayCount !== void 0 ? t("stats.count", { count: todayCount }) : void 0
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
						label: t("stats.week"),
						value: totals.thisWeek
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
						label: t("stats.month"),
						value: totals.thisMonth
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
						label: t("stats.all"),
						value: totals.all
					})
				]
			});
		}
		//#endregion
		//#region src/date-bucket.ts
		var date_bucket_exports = /* @__PURE__ */ __exportAll({
			addDays: () => addDays,
			dayKeyToDate: () => dayKeyToDate,
			listDaysInRange: () => listDaysInRange,
			monthRangeFor: () => monthRangeFor,
			monthStartOf: () => monthStartOf,
			quarterRangeFor: () => quarterRangeFor,
			toDayKey: () => toDayKey,
			weekRangeFor: () => weekRangeFor,
			weekStartOf: () => weekStartOf,
			yearRangeFor: () => yearRangeFor,
			yearStartOf: () => yearStartOf
		});
		const TZ = "Asia/Shanghai";
		function toDayKey(ms, tz = TZ) {
			return new Intl.DateTimeFormat("en-CA", {
				timeZone: tz,
				year: "numeric",
				month: "2-digit",
				day: "2-digit"
			}).format(new Date(ms));
		}
		function dayKeyToDate(key, _tz = TZ) {
			return /* @__PURE__ */ new Date(key + "T12:00:00+08:00");
		}
		function weekStartOf(dayKey) {
			const d = dayKeyToDate(dayKey);
			const dow = (d.getDay() + 6) % 7;
			d.setDate(d.getDate() - dow);
			return toDayKey(d.getTime());
		}
		function monthStartOf(dayKey) {
			const d = dayKeyToDate(dayKey);
			return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
		}
		function yearStartOf(dayKey) {
			return `${dayKeyToDate(dayKey).getFullYear()}-01-01`;
		}
		function addDays(dayKey, n) {
			const d = dayKeyToDate(dayKey);
			d.setDate(d.getDate() + n);
			return toDayKey(d.getTime());
		}
		function listDaysInRange(startKey, endKey) {
			const result = [];
			let cur = startKey;
			while (cur <= endKey) {
				result.push(cur);
				cur = addDays(cur, 1);
			}
			return result;
		}
		function weekRangeFor(dateKey) {
			const s = weekStartOf(dateKey);
			return [s, addDays(s, 6)];
		}
		function monthRangeFor(dateKey) {
			const s = monthStartOf(dateKey);
			const d = dayKeyToDate(s);
			const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
			return [s, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`];
		}
		/** Last ~90 days: sliding window for the "Quarter" tab (not calendar quarter). */
		function quarterRangeFor(dateKey) {
			return [addDays(dateKey, -89), dateKey];
		}
		function yearRangeFor(dateKey) {
			const s = yearStartOf(dateKey);
			return [s, `${dayKeyToDate(s).getFullYear()}-12-31`];
		}
		//#endregion
		//#region src/aggregation.ts
		function emptyDay(dayKey) {
			return {
				dayKey,
				totalTokens: 0,
				uncachedInputTokens: 0,
				cacheReadTokens: 0,
				cacheWriteTokens: 0,
				outputTokens: 0,
				count: 0,
				byModel: /* @__PURE__ */ new Map(),
				byProvider: /* @__PURE__ */ new Map(),
				hourlyTokens: new Array(24).fill(0),
				winnerModel: null,
				winnerProvider: null
			};
		}
		function sumByDay(days) {
			return days.reduce((s, d) => s + d.totalTokens, 0);
		}
		function resolveDay(byDay, key) {
			return byDay.get(key) ?? emptyDay(key);
		}
		function resolveRange(byDay, start, end) {
			return listDaysInRange(start, end).map((k) => resolveDay(byDay, k));
		}
		/** View-aware quantile: 0, (0,25%], (25%,50%], (50%,75%], (75%,100%] so month/quarter spread across the palette. */
		function levelForView(value, viewMax) {
			if (value === 0) return 0;
			if (viewMax <= 0) return 1;
			const r = value / viewMax;
			if (r <= .25) return 1;
			if (r <= .5) return 2;
			if (r <= .75) return 3;
			return 4;
		}
		function hourInShanghai(ms) {
			const s = new Date(ms).toLocaleString("en-GB", {
				timeZone: "Asia/Shanghai",
				hour: "2-digit",
				hour12: false
			});
			const h = Number(s);
			return h === 24 ? 0 : h;
		}
		function aggregate(events, nowMs) {
			const byDay = /* @__PURE__ */ new Map();
			const globalByModel = /* @__PURE__ */ new Map();
			const globalByProvider = /* @__PURE__ */ new Map();
			for (const ev of events) {
				const dayKey = toDayKey(ev.time);
				let agg = byDay.get(dayKey);
				if (!agg) {
					agg = emptyDay(dayKey);
					byDay.set(dayKey, agg);
				}
				const u = ev.usage;
				const total = (u.inputTokens ?? 0) + (u.cacheReadTokens ?? 0) + (u.cacheWriteTokens ?? 0) + (u.outputTokens ?? 0);
				agg.totalTokens += total;
				agg.uncachedInputTokens += u.inputTokens ?? 0;
				agg.cacheReadTokens += u.cacheReadTokens ?? 0;
				agg.cacheWriteTokens += u.cacheWriteTokens ?? 0;
				agg.outputTokens += u.outputTokens ?? 0;
				agg.count += 1;
				const h = hourInShanghai(ev.time);
				if (h >= 0 && h < 24) agg.hourlyTokens[h] += total;
				const modelKey = ev.model || "unknown";
				const providerKey = ev.provider || "unknown";
				agg.byModel.set(modelKey, (agg.byModel.get(modelKey) ?? 0) + total);
				agg.byProvider.set(providerKey, (agg.byProvider.get(providerKey) ?? 0) + total);
				globalByModel.set(modelKey, (globalByModel.get(modelKey) ?? 0) + total);
				globalByProvider.set(providerKey, (globalByProvider.get(providerKey) ?? 0) + total);
			}
			for (const agg of byDay.values()) {
				let bestM = null;
				let bestMVal = -1;
				for (const [m, v] of agg.byModel) if (v > bestMVal) {
					bestMVal = v;
					bestM = m;
				}
				agg.winnerModel = bestM;
				let bestP = null;
				let bestPVal = -1;
				for (const [p, v] of agg.byProvider) if (v > bestPVal) {
					bestPVal = v;
					bestP = p;
				}
				agg.winnerProvider = bestP;
			}
			const todayKey = toDayKey(nowMs);
			const [wStart, wEnd] = weekRangeFor(todayKey);
			const [mStart, mEnd] = monthRangeFor(todayKey);
			const today = byDay.get(todayKey)?.totalTokens ?? 0;
			const thisWeek = sumByDay(resolveRange(byDay, wStart, wEnd));
			const thisMonth = sumByDay(resolveRange(byDay, mStart, mEnd));
			let all = 0;
			for (const v of byDay.values()) all += v.totalTokens;
			const topModels = [...globalByModel.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([model, tokens]) => ({
				model,
				tokens
			}));
			const topProviders = [...globalByProvider.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([provider, tokens]) => ({
				provider,
				tokens
			}));
			function top5InWindow(days) {
				const m = /* @__PURE__ */ new Map();
				for (const d of days) for (const [model, tokens] of d.byModel) m.set(model, (m.get(model) ?? 0) + tokens);
				return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([model, tokens]) => ({
					model,
					tokens
				}));
			}
			function topProvidersInWindow(days) {
				const m = /* @__PURE__ */ new Map();
				for (const d of days) for (const [provider, tokens] of d.byProvider) m.set(provider, (m.get(provider) ?? 0) + tokens);
				return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([provider, tokens]) => ({
					provider,
					tokens
				}));
			}
			return {
				byDay,
				totals: {
					today,
					thisWeek,
					thisMonth,
					all
				},
				topModels,
				topProviders,
				top5: topModels,
				weekDays: (k) => {
					const [s, e] = weekRangeFor(k);
					return resolveRange(byDay, s, e);
				},
				monthDays: (k) => {
					const [s, e] = monthRangeFor(k);
					return resolveRange(byDay, s, e);
				},
				quarterDays: (k) => {
					const [s, e] = quarterRangeFor(k);
					return resolveRange(byDay, s, e);
				},
				yearDays: (k) => {
					const [s, e] = yearRangeFor(k);
					return resolveRange(byDay, s, e);
				},
				top5InWindow,
				topProvidersInWindow
			};
		}
		//#endregion
		//#region src/client/HeatmapGrid.tsx
		const VIEW_ORDER = [
			"week",
			"month",
			"quarter",
			"year"
		];
		function formatTokensShort(n) {
			if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
			if (n >= 1e3) return (n / 1e3).toFixed(2) + "k";
			return n.toLocaleString();
		}
		function tooltipTotal(day) {
			if (day.totalTokens === 0) return `${day.dayKey}: No usage`;
			return `${day.dayKey}: ${formatTokensShort(day.totalTokens)} tokens`;
		}
		function HeatCell({ day, viewMax, size = 14 }) {
			const level = levelForView(day.totalTokens, viewMax);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				title: tooltipTotal(day),
				"aria-label": tooltipTotal(day),
				style: {
					width: size,
					height: size,
					borderRadius: 3,
					background: {
						0: "var(--dsw-alias-bg-layer-2, #ebedf0)",
						1: "#c6e48b",
						2: "#7bc96f",
						3: "#239a3b",
						4: "#196127"
					}[level],
					border: level === 0 ? "1px solid var(--dsw-alias-border-l2, #e5e7eb)" : "1px solid transparent",
					boxSizing: "border-box",
					cursor: "pointer",
					flexShrink: 0
				}
			});
		}
		/** Same quantile language as levelForView: 0, (0,25%], (25%,50%], (50%,75%], (75%,100%]. */
		function miniLevel(v, max) {
			if (v === 0 || max === 0) return 0;
			const r = v / max;
			if (r <= .25) return 1;
			if (r <= .5) return 2;
			if (r <= .75) return 3;
			return 4;
		}
		function HourStrip({ day, weekMax }) {
			const hourly = day.hourlyTokens ?? new Array(24).fill(0);
			const colors = {
				0: "var(--dsw-alias-bg-layer-2, #ebedf0)",
				1: "#c6e48b",
				2: "#7bc96f",
				3: "#239a3b",
				4: "#196127"
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					display: "flex",
					gap: 1,
					alignItems: "end",
					flex: 1,
					minWidth: 0
				},
				children: hourly.map((v, h) => {
					const lv = miniLevel(v, weekMax);
					const hh = v === 0 ? `${String(h).padStart(2, "0")}:00 — No usage` : `${String(h).padStart(2, "0")}:00 — ${formatTokensShort(v)} tokens`;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						title: hh,
						"aria-label": hh,
						style: {
							flex: 1,
							height: 6 + lv * 4,
							borderRadius: 1,
							background: colors[lv],
							border: lv === 0 ? "1px solid var(--dsw-alias-border-l2)" : "none",
							boxSizing: "border-box",
							minWidth: 0
						}
					}, h);
				})
			});
		}
		function ViewSwitcher({ t, value, onChange }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "tablist",
				"aria-label": "view switcher",
				style: {
					display: "inline-flex",
					border: "1px solid var(--dsw-alias-border-l2)",
					borderRadius: 8,
					overflow: "hidden",
					background: "var(--dsw-alias-bg-layer-3)"
				},
				children: VIEW_ORDER.map((v) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					role: "tab",
					"aria-selected": value === v,
					onClick: () => onChange(v),
					style: {
						padding: "6px 14px",
						fontSize: 13,
						lineHeight: "20px",
						border: "none",
						cursor: "pointer",
						background: value === v ? "var(--dsw-alias-label-primary)" : "transparent",
						color: value === v ? "var(--dsw-alias-bg-layer-3)" : "var(--dsw-alias-label-primary)",
						fontWeight: value === v ? 600 : 400
					},
					children: t(`view.${v}`)
				}, v))
			});
		}
		function MonthHeader({ weeks, cellSize }) {
			const seen = /* @__PURE__ */ new Set();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					display: "flex",
					gap: 3,
					paddingLeft: cellSize + 20,
					marginBottom: 2
				},
				children: weeks.map((week, i) => {
					const m = week.find((d) => d.totalTokens !== -1)?.dayKey.slice(0, 7) ?? "";
					let label = "";
					if (m && !seen.has(m)) {
						seen.add(m);
						label = [
							"Jan",
							"Feb",
							"Mar",
							"Apr",
							"May",
							"Jun",
							"Jul",
							"Aug",
							"Sep",
							"Oct",
							"Nov",
							"Dec"
						][Number(m.slice(5, 7)) - 1];
					}
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							width: cellSize,
							fontSize: 10,
							color: "var(--dsw-alias-label-tertiary)",
							lineHeight: "12px",
							whiteSpace: "nowrap",
							overflow: "visible"
						},
						children: label
					}, i);
				})
			});
		}
		function GitHubGrid({ days, t, cellSize, twoRows, isEn }) {
			const viewMax = days.reduce((m, d) => Math.max(m, d.totalTokens), 1);
			const weeks = [];
			let cur = [];
			for (const d of days) {
				const rawDow = (/* @__PURE__ */ new Date(d.dayKey + "T12:00:00+08:00")).getDay();
				const dow = isEn ? rawDow : (rawDow + 6) % 7;
				if (cur.length === 0 && weeks.length === 0 && dow !== 0) for (let i = 0; i < dow; i++) cur.push({
					dayKey: `pad-${i}`,
					totalTokens: -1,
					uncachedInputTokens: 0,
					cacheReadTokens: 0,
					cacheWriteTokens: 0,
					outputTokens: 0,
					count: 0,
					byModel: /* @__PURE__ */ new Map(),
					byProvider: /* @__PURE__ */ new Map(),
					hourlyTokens: new Array(24).fill(0),
					winnerModel: null,
					winnerProvider: null
				});
				cur.push(d);
				if (cur.length === 7) {
					weeks.push(cur);
					cur = [];
				}
			}
			if (cur.length > 0) {
				while (cur.length < 7) cur.push({
					dayKey: `pad-end-${cur.length}`,
					totalTokens: -1,
					uncachedInputTokens: 0,
					cacheReadTokens: 0,
					cacheWriteTokens: 0,
					outputTokens: 0,
					count: 0,
					byModel: /* @__PURE__ */ new Map(),
					byProvider: /* @__PURE__ */ new Map(),
					hourlyTokens: new Array(24).fill(0),
					winnerModel: null,
					winnerProvider: null
				});
				weeks.push(cur);
			}
			const renderWeeks = (ws) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					display: "flex",
					gap: cellSize >= 22 ? 10 : 5
				},
				children: ws.map((week, wi) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 3
					},
					children: week.map((d) => d.totalTokens === -1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
						width: cellSize,
						height: cellSize
					} }, d.dayKey) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HeatCell, {
						day: d,
						viewMax,
						size: cellSize
					}, d.dayKey))
				}, wi))
			});
			if (twoRows && weeks.length > 26) {
				const mid = Math.ceil(weeks.length / 2);
				const top = weeks.slice(0, mid);
				const bot = weeks.slice(mid);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 16,
						alignItems: "center"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MonthHeader, {
						weeks: top,
						cellSize
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							gap: 3
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								flexDirection: "column",
								gap: 3
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										height: cellSize,
										fontSize: cellSize >= 22 ? 13 : 10,
										color: "var(--dsw-alias-label-tertiary)",
										lineHeight: `${cellSize}px`
									},
									children: isEn ? "Sun" : "Mon"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { height: cellSize } }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										height: cellSize,
										fontSize: cellSize >= 22 ? 13 : 10,
										color: "var(--dsw-alias-label-tertiary)",
										lineHeight: `${cellSize}px`
									},
									children: isEn ? "Tue" : "Wed"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { height: cellSize } }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										height: cellSize,
										fontSize: cellSize >= 22 ? 13 : 10,
										color: "var(--dsw-alias-label-tertiary)",
										lineHeight: `${cellSize}px`
									},
									children: isEn ? "Thu" : "Fri"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { height: cellSize } }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { height: cellSize } })
							]
						}), renderWeeks(top)]
					})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MonthHeader, {
						weeks: bot,
						cellSize
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							gap: 3
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								flexDirection: "column",
								gap: 3
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										height: cellSize,
										fontSize: cellSize >= 22 ? 13 : 10,
										color: "var(--dsw-alias-label-tertiary)",
										lineHeight: `${cellSize}px`
									},
									children: isEn ? "Sun" : "Mon"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { height: cellSize } }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										height: cellSize,
										fontSize: cellSize >= 22 ? 13 : 10,
										color: "var(--dsw-alias-label-tertiary)",
										lineHeight: `${cellSize}px`
									},
									children: isEn ? "Tue" : "Wed"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { height: cellSize } }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										height: cellSize,
										fontSize: cellSize >= 22 ? 13 : 10,
										color: "var(--dsw-alias-label-tertiary)",
										lineHeight: `${cellSize}px`
									},
									children: isEn ? "Thu" : "Fri"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { height: cellSize } }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { height: cellSize } })
							]
						}), renderWeeks(bot)]
					})] })]
				});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					overflowX: "auto",
					paddingBottom: 4,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: 6
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MonthHeader, {
					weeks,
					cellSize
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						gap: cellSize >= 22 ? 10 : 5,
						justifyContent: "center"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							gap: 3,
							fontSize: cellSize >= 22 ? 13 : 10,
							color: "var(--dsw-alias-label-tertiary)"
						},
						children: (isEn ? [
							"Sun",
							"Mon",
							"Tue",
							"Wed",
							"Thu",
							"Fri",
							"Sat"
						] : [
							"Mon",
							"Tue",
							"Wed",
							"Thu",
							"Fri",
							"Sat",
							"Sun"
						]).map((w, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								height: cellSize,
								lineHeight: `${cellSize}px`,
								textAlign: "right",
								paddingRight: 4,
								fontWeight: 500
							},
							children: w
						}, w))
					}), renderWeeks(weeks)]
				})]
			});
		}
		function CalendarGrid({ days, t, viewMax, selectedKey, onSelect, isEn }) {
			(t("heatmap.title") || "").includes("Token");
			const header = [
				"Mon",
				"Tue",
				"Wed",
				"Thu",
				"Fri",
				"Sat",
				"Sun"
			];
			const pad = firstDowOf(days);
			const cells = [];
			for (let i = 0; i < pad; i++) cells.push(null);
			for (const d of days) cells.push(d);
			while (cells.length % 7 !== 0) cells.push(null);
			function firstDowOf(ds) {
				if (ds.length === 0) return 0;
				const raw = (/* @__PURE__ */ new Date(ds[0].dayKey + "T12:00:00+08:00")).getDay();
				return isEn ? raw : (raw + 6) % 7;
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					border: "1px solid var(--dsw-alias-border-l2)",
					borderRadius: 12,
					overflow: "hidden",
					background: "var(--dsw-alias-bg-layer-3)"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						display: "grid",
						gridTemplateColumns: "repeat(7, 1fr)",
						gap: 6,
						padding: "8px 6px 6px"
					},
					children: (isEn ? [
						"Sun",
						"Mon",
						"Tue",
						"Wed",
						"Thu",
						"Fri",
						"Sat"
					] : header).map((w) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							textAlign: "center",
							fontSize: 11,
							fontWeight: 500,
							color: "var(--dsw-alias-label-tertiary)"
						},
						children: w
					}, w))
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						display: "grid",
						gridTemplateColumns: "repeat(7, 1fr)",
						gap: 6,
						padding: "0 6px"
					},
					children: cells.map((d, idx) => {
						if (!d) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: { minHeight: 50 } }, `pad-${idx}`);
						const selected = d.dayKey === selectedKey;
						const level = levelForView(d.totalTokens, viewMax);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							onClick: () => onSelect(selected ? null : d.dayKey),
							title: tooltipTotal(d),
							"aria-label": tooltipTotal(d),
							style: {
								minHeight: 50,
								padding: "6px 6px 4px",
								textAlign: "left",
								border: selected ? "1.5px solid var(--dsw-alias-brand-primary, #1677ff)" : "1px solid var(--dsw-alias-border-l2, #e5e7eb)",
								borderRadius: 8,
								background: selected ? "var(--dsw-alias-brand-primary, #1677ff)" : {
									0: "var(--dsw-alias-bg-layer-3)",
									1: "#c6e48b",
									2: "#7bc96f",
									3: "#239a3b",
									4: "#196127"
								}[level],
								color: selected ? "#fff" : level === 0 ? "var(--dsw-alias-label-primary)" : level <= 2 ? "#1a1a1a" : "#fff",
								cursor: "pointer",
								display: "flex",
								flexDirection: "column",
								gap: 1,
								alignItems: "flex-start"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: 12,
									fontWeight: 600,
									lineHeight: "16px"
								},
								children: d.dayKey.slice(8, 10).replace(/^0/, "")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: 10,
									lineHeight: "12px",
									opacity: .8,
									whiteSpace: "nowrap",
									overflow: "hidden",
									textOverflow: "ellipsis",
									maxWidth: "100%"
								},
								children: d.totalTokens > 0 ? formatTokensShort(d.totalTokens) : ""
							})]
						}, d.dayKey);
					})
				})]
			});
		}
		function HeatmapGrid({ t, days, view, onViewChange, selectedKey, onSelect, isEn }) {
			const isWeek = view === "week";
			const hasAny = days.some((d) => d.totalTokens > 0);
			const viewMax = days.reduce((m, d) => Math.max(m, d.totalTokens), 1);
			const weekMax = days.reduce((m, d) => Math.max(m, ...d.hourlyTokens ?? []), 1);
			const cellSize = isWeek ? 16 : view === "quarter" ? 23 : view === "year" ? 14 : 14;
			const handleViewChange = (v) => {
				onSelect?.(null);
				onViewChange(v);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 6
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ViewSwitcher, {
						t,
						value: view,
						onChange: handleViewChange
					}),
					!hasAny ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							border: "1px solid var(--dsw-alias-border-l2)",
							background: "var(--dsw-alias-bg-layer-3)",
							borderRadius: 12,
							padding: 24,
							color: "var(--dsw-alias-label-tertiary)",
							fontSize: 13
						},
						children: t("heatmap.empty")
					}) : null,
					isWeek ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							gap: 5
						},
						children: days.map((d) => {
							const wd = (/* @__PURE__ */ new Date(d.dayKey + "T12:00:00+08:00")).getDay();
							const weekday = isEn ? [
								"Sun",
								"Mon",
								"Tue",
								"Wed",
								"Thu",
								"Fri",
								"Sat"
							][wd] : [
								"Mon",
								"Tue",
								"Wed",
								"Thu",
								"Fri",
								"Sat",
								"Sun"
							][(wd + 6) % 7];
							const sel = d.dayKey === selectedKey;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								onClick: () => onSelect?.(sel ? null : d.dayKey),
								title: tooltipTotal(d),
								style: {
									display: "flex",
									alignItems: "center",
									gap: 10,
									minWidth: 0,
									width: "100%",
									padding: "6px 8px",
									borderRadius: 8,
									border: sel ? "1px solid var(--dsw-alias-brand-primary)" : "1px solid transparent",
									background: sel ? "var(--dsw-alias-bg-layer-2)" : "transparent",
									cursor: "pointer",
									textAlign: "left"
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											width: 52,
											flexShrink: 0,
											display: "flex",
											flexDirection: "column",
											gap: 1
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												fontSize: 12,
												fontWeight: 600,
												color: "var(--dsw-alias-label-primary)",
												lineHeight: "16px"
											},
											children: weekday
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												fontSize: 10,
												color: "var(--dsw-alias-label-tertiary)",
												lineHeight: "12px"
											},
											children: d.dayKey.slice(5)
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(HourStrip, {
										day: d,
										weekMax
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											fontSize: 11,
											color: "var(--dsw-alias-label-tertiary)",
											whiteSpace: "nowrap",
											width: 80,
											textAlign: "right"
										},
										children: d.totalTokens === 0 ? "No usage" : `${formatTokensShort(d.totalTokens)} tokens`
									})
								]
							}, d.dayKey);
						})
					}) : view === "month" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CalendarGrid, {
						days,
						t,
						viewMax,
						selectedKey: selectedKey ?? null,
						onSelect: onSelect ?? (() => {}),
						isEn
					}) : view === "year" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GitHubGrid, {
						days,
						t,
						cellSize,
						twoRows: true,
						isEn
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GitHubGrid, {
						days,
						t,
						cellSize,
						isEn
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 6,
							justifyContent: "flex-end",
							fontSize: 12,
							color: "var(--dsw-alias-label-tertiary)"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("heatmap.legend.less") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
								width: 12,
								height: 12,
								borderRadius: 2,
								background: "var(--dsw-alias-bg-layer-2, #ebedf0)",
								border: "1px solid var(--dsw-alias-border-l2)"
							} }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
								width: 12,
								height: 12,
								borderRadius: 2,
								background: "#c6e48b"
							} }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
								width: 12,
								height: 12,
								borderRadius: 2,
								background: "#7bc96f"
							} }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
								width: 12,
								height: 12,
								borderRadius: 2,
								background: "#239a3b"
							} }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
								width: 12,
								height: 12,
								borderRadius: 2,
								background: "#196127"
							} }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("heatmap.legend.more") })
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/ModelTop5.tsx
		function formatTokens(n) {
			if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
			if (n >= 1e3) return (n / 1e3).toFixed(2) + "k";
			return n.toLocaleString();
		}
		function ModelTop5({ t, topModels, topProviders, days, mode = "model", onModeChange }) {
			const active = mode === "provider" ? topProviders : topModels;
			if (active.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					border: "1px solid var(--dsw-alias-border-l2)",
					background: "var(--dsw-alias-bg-layer-3)",
					borderRadius: 12,
					padding: 16,
					color: "var(--dsw-alias-label-tertiary)",
					fontSize: 13
				},
				children: t("model.none")
			});
			const max = active[0]?.tokens ?? 1;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 12
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						border: "1px solid var(--dsw-alias-border-l2)",
						background: "var(--dsw-alias-bg-layer-3)",
						borderRadius: 12,
						overflow: "hidden"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							padding: "12px 16px 8px",
							borderBottom: "1px solid var(--dsw-alias-border-l2)",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 8
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: 8
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: 13,
									fontWeight: 600,
									color: "var(--dsw-alias-label-primary)"
								},
								children: mode === "provider" ? t("provider.top5") : t("model.top5")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: 11,
									color: "var(--dsw-alias-label-tertiary)"
								},
								children: t("model.top5.hint")
							})]
						}), onModeChange ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "inline-flex",
								border: "1px solid var(--dsw-alias-border-l2)",
								borderRadius: 6,
								overflow: "hidden"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								onClick: () => onModeChange("model"),
								style: {
									padding: "2px 8px",
									fontSize: 11,
									border: "none",
									cursor: "pointer",
									background: mode === "model" ? "var(--dsw-alias-label-primary)" : "transparent",
									color: mode === "model" ? "var(--dsw-alias-bg-layer-3)" : "var(--dsw-alias-label-secondary)"
								},
								children: t("view.model")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								onClick: () => onModeChange("provider"),
								style: {
									padding: "2px 8px",
									fontSize: 11,
									border: "none",
									cursor: "pointer",
									background: mode === "provider" ? "var(--dsw-alias-label-primary)" : "transparent",
									color: mode === "provider" ? "var(--dsw-alias-bg-layer-3)" : "var(--dsw-alias-label-secondary)"
								},
								children: t("view.provider")
							})]
						}) : null]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "flex",
							flexDirection: "column"
						},
						children: active.map((item, idx) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: 12,
								padding: "10px 16px",
								borderTop: idx === 0 ? "none" : "1px solid var(--dsw-alias-border-l2)"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										width: 20,
										textAlign: "center",
										fontSize: 12,
										fontWeight: 600,
										color: "var(--dsw-alias-label-tertiary)"
									},
									children: idx + 1
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										flex: "0 1 40%",
										minWidth: 0,
										fontSize: 13,
										color: "var(--dsw-alias-label-primary)",
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									title: item.name,
									children: item.name
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										flex: 1,
										height: 6,
										borderRadius: 3,
										background: "var(--dsw-alias-bg-layer-2, #ebedf0)",
										overflow: "hidden"
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
										width: `${Math.max(4, item.tokens / max * 100)}%`,
										height: "100%",
										background: "#40c463",
										borderRadius: 3
									} })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 12,
										color: "var(--dsw-alias-label-secondary)",
										whiteSpace: "nowrap"
									},
									children: formatTokens(item.tokens)
								})
							]
						}, item.name))
					})]
				})
			});
		}
		//#endregion
		//#region src/client/hooks.ts
		const LS_INTERVAL_KEY = "dsh-token-heatmap:autoRefreshMinutes";
		function getAutoRefreshMinutes() {
			try {
				const v = localStorage.getItem(LS_INTERVAL_KEY);
				if (v === null) return 10;
				const n = Number(v);
				if (!Number.isFinite(n) || n < 0) return 10;
				return Math.min(1440, Math.max(0, Math.round(n)));
			} catch {
				return 10;
			}
		}
		function setAutoRefreshMinutes(minutes) {
			try {
				localStorage.setItem(LS_INTERVAL_KEY, String(minutes));
			} catch {}
		}
		const API_TIMEOUT_MS = 5e3;
		async function fetchFromApi() {
			const ctrl = new AbortController();
			const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
			try {
				const res = await fetch("/api/dsh-token-heatmap/daily.json", {
					cache: "no-store",
					signal: ctrl.signal
				});
				if (!res.ok) return null;
				const json = await res.json();
				if (!json || !Array.isArray(json.days)) return null;
				const byDay = /* @__PURE__ */ new Map();
				for (const d of json.days) byDay.set(d.dayKey, {
					dayKey: d.dayKey,
					totalTokens: d.totalTokens ?? 0,
					uncachedInputTokens: d.uncachedInputTokens ?? 0,
					cacheReadTokens: d.cacheReadTokens ?? 0,
					cacheWriteTokens: d.cacheWriteTokens ?? 0,
					outputTokens: d.outputTokens ?? 0,
					count: d.count ?? 0,
					byModel: new Map(Object.entries(d.byModel ?? {})),
					byProvider: new Map(Object.entries(d.byProvider ?? {})),
					hourlyTokens: Array.isArray(d.hourlyTokens) && d.hourlyTokens.length === 24 ? d.hourlyTokens : new Array(24).fill(0),
					winnerModel: d.winnerModel ?? null,
					winnerProvider: d.winnerProvider ?? null
				});
				const totals = json.totals ?? {
					today: 0,
					thisWeek: 0,
					thisMonth: 0,
					all: 0
				};
				const topModels = Array.isArray(json.topModels) ? json.topModels.map((x) => ({
					model: x.name ?? x.model,
					tokens: x.tokens
				})) : [];
				const topProviders = Array.isArray(json.topProviders) ? json.topProviders.map((x) => ({
					provider: x.name ?? x.provider,
					tokens: x.tokens
				})) : [];
				const fakeAgg = aggregate([], Date.now());
				fakeAgg.byDay = byDay;
				fakeAgg.totals = totals;
				fakeAgg.topModels = topModels;
				fakeAgg.topProviders = topProviders;
				fakeAgg.top5 = topModels;
				const { weekRangeFor, monthRangeFor, quarterRangeFor, yearRangeFor, listDaysInRange } = await Promise.resolve().then(() => date_bucket_exports);
				const resolveDay = (k) => byDay.get(k) ?? {
					dayKey: k,
					totalTokens: 0,
					uncachedInputTokens: 0,
					cacheReadTokens: 0,
					cacheWriteTokens: 0,
					outputTokens: 0,
					count: 0,
					byModel: /* @__PURE__ */ new Map(),
					byProvider: /* @__PURE__ */ new Map(),
					hourlyTokens: new Array(24).fill(0),
					winnerModel: null,
					winnerProvider: null
				};
				const resolveRange = (s, e) => listDaysInRange(s, e).map(resolveDay);
				fakeAgg.weekDays = (k) => resolveRange(...weekRangeFor(k));
				fakeAgg.monthDays = (k) => resolveRange(...monthRangeFor(k));
				fakeAgg.quarterDays = (k) => resolveRange(...quarterRangeFor(k));
				fakeAgg.yearDays = (k) => resolveRange(...yearRangeFor(k));
				fakeAgg.top5InWindow = (days) => {
					const m = /* @__PURE__ */ new Map();
					for (const d of days) for (const [model, tokens] of d.byModel) m.set(model, (m.get(model) ?? 0) + tokens);
					return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([model, tokens]) => ({
						model,
						tokens
					}));
				};
				fakeAgg.topProvidersInWindow = (days) => {
					const m = /* @__PURE__ */ new Map();
					for (const d of days) for (const [provider, tokens] of d.byProvider) m.set(provider, (m.get(provider) ?? 0) + tokens);
					return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([provider, tokens]) => ({
						provider,
						tokens
					}));
				};
				return fakeAgg;
			} catch {
				return null;
			} finally {
				clearTimeout(timer);
			}
		}
		function useHeatmapData(ctx, refreshMs, manualTick) {
			const [data, setData] = react.useState(null);
			const [refreshing, setRefreshing] = react.useState(false);
			const [lastRefresh, setLastRefresh] = react.useState(null);
			const intervalMs = react.useMemo(() => {
				if (refreshMs !== void 0) return refreshMs;
				const mins = getAutoRefreshMinutes();
				return mins === 0 ? 0 : mins * 60 * 1e3;
			}, [refreshMs, manualTick]);
			const fetchData = react.useCallback(async () => {
				setRefreshing(true);
				try {
					const apiData = await fetchFromApi();
					if (apiData) {
						setData(apiData);
						setLastRefresh((/* @__PURE__ */ new Date()).toLocaleString());
						return;
					}
					const store = ctx?.get?.("heatmapStore") ?? (typeof window !== "undefined" ? window.__dsh_heatmapStore : null);
					if (store?.refresh) await store.refresh();
					if (store?.getAggregated) {
						setData(store.getAggregated());
						setLastRefresh((/* @__PURE__ */ new Date()).toLocaleString());
						return;
					}
					const snap = typeof window !== "undefined" ? window.__dsh_heatmapSnapshot : null;
					if (snap?.byDay && snap?.totals) {
						setData(snap);
						setLastRefresh((/* @__PURE__ */ new Date()).toLocaleString());
						return;
					}
				} catch {} finally {
					setRefreshing(false);
				}
				setData((prev) => prev ?? aggregate([], Date.now()));
			}, [ctx]);
			react.useEffect(() => {
				fetchData();
			}, [fetchData, manualTick]);
			react.useEffect(() => {
				if (intervalMs === 0) return;
				const id = setInterval(fetchData, intervalMs);
				const onVis = () => {
					if (document.visibilityState === "visible") fetchData();
				};
				document.addEventListener("visibilitychange", onVis);
				return () => {
					clearInterval(id);
					document.removeEventListener("visibilitychange", onVis);
				};
			}, [fetchData, intervalMs]);
			return {
				data,
				refreshing,
				lastRefresh,
				refresh: react.useCallback(() => fetchData(), [fetchData]),
				intervalMs
			};
		}
		function useHeatmapView(aggregated, initial = "month") {
			const [view, setView] = react.useState(initial);
			const [anchor, setAnchor] = react.useState(() => toDayKey(Date.now()));
			const days = react.useMemo(() => {
				if (!aggregated) return null;
				switch (view) {
					case "week": return aggregated.weekDays(anchor);
					case "month": return aggregated.monthDays(anchor);
					case "quarter": return aggregated.quarterDays(anchor);
					case "year": return aggregated.yearDays(anchor);
				}
			}, [
				aggregated,
				view,
				anchor
			]);
			return {
				view,
				setView,
				anchor,
				setAnchor,
				days,
				topModels: react.useMemo(() => {
					if (!aggregated || !days) return aggregated?.topModels ?? [];
					return aggregated.top5InWindow(days);
				}, [aggregated, days]),
				topProviders: react.useMemo(() => {
					if (!aggregated || !days) return aggregated?.topProviders ?? [];
					return aggregated.topProvidersInWindow(days);
				}, [aggregated, days])
			};
		}
		//#endregion
		//#region src/client/SettingsSection.tsx
		function SettingsSection({ t, ctx, days: injectedDays, totals: injectedTotals, top5: injectedTop5 }) {
			const [tick, setTick] = react.useState(0);
			const { data: aggregated, refreshing, lastRefresh, refresh } = useHeatmapData(ctx ?? null, void 0, tick);
			const { view, setView, anchor, setAnchor, days: computedDays, topModels: computedTopModels, topProviders: computedTopProviders } = useHeatmapView(aggregated);
			const [topMode, setTopMode] = react.useState("model");
			const [selectedKey, setSelectedKey] = react.useState(null);
			const [intervalMins, setIntervalMins] = react.useState(() => getAutoRefreshMinutes());
			const [lang, setLang] = react.useState(() => {
				try {
					return localStorage.getItem("dsh-token-heatmap:lang") === "en" ? "en" : "zh";
				} catch {
					return "zh";
				}
			});
			const days = injectedDays ?? computedDays;
			const totals = injectedTotals ?? aggregated?.totals;
			const viewTopModelsRaw = computedTopModels.length ? computedTopModels : aggregated?.topModels ?? [];
			const viewTopProvidersRaw = computedTopProviders.length ? computedTopProviders : aggregated?.topProviders ?? [];
			let viewTopModels = viewTopModelsRaw;
			let viewTopProviders = viewTopProvidersRaw;
			if (selectedKey && aggregated) {
				const sel = aggregated.byDay.get(selectedKey);
				if (sel) {
					viewTopModels = [...sel.byModel.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([model, tokens]) => ({
						model,
						tokens
					}));
					viewTopProviders = [...sel.byProvider.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([provider, tokens]) => ({
						provider,
						tokens
					}));
					`${selectedKey}`;
				}
			}
			const viewTopModelsNamed = viewTopModels.map((x) => ({
				name: x.model,
				tokens: x.tokens
			}));
			const viewTopProvidersNamed = viewTopProviders.map((x) => ({
				name: x.provider ?? x.name,
				tokens: x.tokens
			}));
			const injectedTop = injectedTop5;
			const hasData = totals && (totals.today > 0 || totals.thisWeek > 0 || totals.thisMonth > 0 || totals.all > 0);
			const tt = (key, params) => {
				const entry = {
					"heatmap.lang.zh": {
						zh: "中文",
						en: "中文"
					},
					"heatmap.lang.en": {
						zh: "English",
						en: "English"
					},
					"heatmap.lang.label": {
						zh: "语言",
						en: "Language"
					},
					"heatmap.dayDetail": {
						zh: `${selectedKey ?? ""} · 当日 Top 5`,
						en: `${selectedKey ?? ""} · Top 5 of the day`
					},
					"heatmap.clearSelection": {
						zh: "清除选择",
						en: "Clear"
					}
				}[key];
				if (entry) {
					let s = entry[lang];
					if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v));
					return s;
				}
				return t(key, params);
			};
			const handleRefresh = async () => {
				await refresh();
				setTick((x) => x + 1);
			};
			const handleIntervalChange = (e) => {
				const v = Number(e.target.value);
				setAutoRefreshMinutes(v);
				setIntervalMins(v);
				setTick((x) => x + 1);
			};
			const handleLangChange = (e) => {
				const v = e.target.value;
				setLang(v);
				try {
					localStorage.setItem("dsh-token-heatmap:lang", v);
				} catch {}
			};
			const handleReset = () => {
				if (!confirm(t("heatmap.reset.confirm"))) return;
				const store = ctx?.get?.("heatmapStore") ?? (typeof window !== "undefined" ? window.__dsh_heatmapStore : null);
				if (store?.clearPersisted) {
					store.clearPersisted();
					setTick((x) => x + 1);
				}
			};
			const handleViewChange = (v) => {
				setSelectedKey(null);
				setView(v);
			};
			const handleSelect = (k) => setSelectedKey(k);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				"aria-labelledby": "heatmap-title",
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 16
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "flex-start",
							justifyContent: "space-between",
							gap: 12
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							id: "heatmap-title",
							style: {
								margin: 0,
								fontSize: 16,
								fontWeight: 600,
								color: "var(--dsw-alias-label-primary)"
							},
							children: t("heatmap.title")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: {
								margin: "4px 0 0",
								fontSize: 13,
								color: "var(--dsw-alias-label-tertiary)",
								lineHeight: 1.5
							},
							children: lang === "en" ? "Token usage from local session logs, bucketed by Asia/Shanghai. Synced once then persisted — deleting sessions keeps history." : t("heatmap.subtitle")
						})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: 6,
								fontSize: 12,
								color: "var(--dsw-alias-label-secondary)",
								flexShrink: 0
							},
							children: [tt("heatmap.lang.label"), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								value: lang,
								onChange: handleLangChange,
								style: {
									padding: "4px 8px",
									fontSize: 12,
									borderRadius: 6,
									border: "1px solid var(--dsw-alias-border-l2)",
									background: "var(--dsw-alias-bg-layer-3)",
									color: "var(--dsw-alias-label-primary)"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "zh",
									children: tt("heatmap.lang.zh")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "en",
									children: tt("heatmap.lang.en")
								})]
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 8,
							flexWrap: "wrap"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								onClick: handleRefresh,
								disabled: refreshing,
								style: {
									padding: "6px 14px",
									fontSize: 13,
									borderRadius: 8,
									border: "1px solid var(--dsw-alias-border-l2)",
									background: refreshing ? "var(--dsw-alias-bg-layer-2)" : "var(--dsw-alias-bg-layer-3)",
									color: "var(--dsw-alias-label-primary)",
									cursor: refreshing ? "wait" : "pointer"
								},
								children: lang === "en" ? refreshing ? "Refreshing…" : "Refresh" : refreshing ? t("heatmap.refreshing") : t("heatmap.refresh")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: 12,
									color: "var(--dsw-alias-label-tertiary)"
								},
								children: lastRefresh ? lang === "en" ? `Last refresh: ${lastRefresh}` : t("heatmap.lastRefresh", { time: lastRefresh }) : ""
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { flex: 1 } }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: 6,
									fontSize: 12,
									color: "var(--dsw-alias-label-secondary)"
								},
								children: [lang === "en" ? "Auto refresh" : t("heatmap.autoRefresh"), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									value: intervalMins,
									onChange: handleIntervalChange,
									title: t("heatmap.autoRefresh.hint"),
									style: {
										padding: "4px 8px",
										fontSize: 12,
										borderRadius: 6,
										border: "1px solid var(--dsw-alias-border-l2)",
										background: "var(--dsw-alias-bg-layer-3)",
										color: "var(--dsw-alias-label-primary)"
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: 0,
											children: t("heatmap.autoRefresh.off")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: 5,
											children: "5 min"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: 10,
											children: "10 min"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: 30,
											children: "30 min"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: 60,
											children: "60 min"
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: { position: "relative" },
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
									style: { display: "inline" },
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", {
										style: {
											listStyle: "none",
											cursor: "pointer",
											padding: "2px 6px",
											fontSize: 11,
											color: "var(--dsw-alias-label-tertiary)",
											opacity: .6
										},
										children: "⋯"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											position: "absolute",
											right: 0,
											top: "100%",
											zIndex: 10,
											background: "var(--dsw-alias-bg-layer-3)",
											border: "1px solid var(--dsw-alias-border-l2)",
											borderRadius: 8,
											padding: 6,
											minWidth: 120,
											boxShadow: "0 4px 12px rgba(0,0,0,0.12)"
										},
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											onClick: handleReset,
											style: {
												width: "100%",
												padding: "6px 10px",
												fontSize: 12,
												borderRadius: 6,
												border: "none",
												background: "transparent",
												color: "var(--dsw-alias-state-error-primary, #e5484d)",
												cursor: "pointer",
												textAlign: "left"
											},
											children: lang === "en" ? "Reset history" : t("heatmap.reset")
										})
									})]
								})
							})
						]
					}),
					view === "week" || view === "month" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 8,
							justifyContent: "space-between"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								onClick: () => setAnchor((a) => {
									const d = /* @__PURE__ */ new Date(a + "T12:00:00+08:00");
									if (view === "week") d.setDate(d.getDate() - 7);
									else d.setMonth(d.getMonth() - 1);
									const ms = d.getTime();
									return new Date(ms).toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
								}),
								style: {
									padding: "4px 10px",
									fontSize: 12,
									borderRadius: 6,
									border: "1px solid var(--dsw-alias-border-l2)",
									background: "var(--dsw-alias-bg-layer-3)",
									cursor: "pointer"
								},
								children: [lang === "en" ? "‹ Prev" : "‹ 上一", view === "week" ? lang === "en" ? " Week" : "周" : lang === "en" ? " Month" : "月"]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: {
									fontSize: 12,
									color: "var(--dsw-alias-label-secondary)",
									fontWeight: 500
								},
								children: [view === "week" ? (() => {
									const d = /* @__PURE__ */ new Date(anchor + "T12:00:00+08:00");
									const dow = (d.getDay() + 6) % 7;
									const mon = new Date(d);
									mon.setDate(d.getDate() - dow);
									const sun = new Date(mon);
									sun.setDate(mon.getDate() + 6);
									const fmt = (x) => `${x.getMonth() + 1}/${x.getDate()}`;
									return lang === "en" ? `Week of ${fmt(mon)} - ${fmt(sun)}` : `${mon.getMonth() + 1}月${mon.getDate()}日 - ${sun.getMonth() + 1}月${sun.getDate()}日`;
								})() : `${Number(anchor.slice(0, 4))}年${Number(anchor.slice(5, 7))}月`, lang === "en" && view === "month" ? ` ${anchor.slice(0, 7)}` : ""]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								onClick: () => setAnchor((a) => {
									const d = /* @__PURE__ */ new Date(a + "T12:00:00+08:00");
									if (view === "week") d.setDate(d.getDate() + 7);
									else d.setMonth(d.getMonth() + 1);
									const ms = d.getTime();
									return new Date(ms).toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
								}),
								style: {
									padding: "4px 10px",
									fontSize: 12,
									borderRadius: 6,
									border: "1px solid var(--dsw-alias-border-l2)",
									background: "var(--dsw-alias-bg-layer-3)",
									cursor: "pointer"
								},
								children: [
									lang === "en" ? "Next ›" : "下一",
									view === "week" ? lang === "en" ? " Week" : "周" : lang === "en" ? " Month" : "月",
									" ›"
								]
							})
						]
					}) : null,
					totals ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatsCards, {
						t: lang === "en" ? (k, p) => {
							const enMap = {
								"stats.today": "Today",
								"stats.week": "This week",
								"stats.month": "This month",
								"stats.all": "All time"
							};
							if (k === "stats.count") return `${p?.count ?? ""} turns`;
							return enMap[k] ?? t(k, p);
						} : t,
						totals,
						todayCount: void 0
					}) : null,
					days ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HeatmapGrid, {
						t: lang === "en" ? (k, p) => {
							return {
								"view.week": "Week",
								"view.month": "Month",
								"view.quarter": "Quarter",
								"view.year": "Year",
								"heatmap.legend.less": "Less",
								"heatmap.legend.more": "More",
								"heatmap.empty": "No data yet",
								"heatmap.tooltip.none": "No usage",
								"heatmap.subtitle": "Token usage from local session logs, bucketed by Asia/Shanghai. First sync is persisted — deleting sessions keeps history.",
								"heatmap.title": "Token Heatmap"
							}[k] ?? t(k, p);
						} : t,
						days,
						view,
						onViewChange: handleViewChange,
						selectedKey,
						onSelect: handleSelect,
						isEn: lang === "en"
					}) : null,
					selectedKey ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 8,
							fontSize: 12,
							color: "var(--dsw-alias-label-secondary)"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: tt("heatmap.dayDetail") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							onClick: () => setSelectedKey(null),
							style: {
								padding: "2px 8px",
								fontSize: 11,
								borderRadius: 6,
								border: "1px solid var(--dsw-alias-border-l2)",
								background: "var(--dsw-alias-bg-layer-3)",
								cursor: "pointer"
							},
							children: tt("heatmap.clearSelection")
						})]
					}) : null,
					injectedTop ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelTop5, {
						t,
						topModels: injectedTop,
						topProviders: [],
						days: days ?? void 0,
						mode: topMode,
						onModeChange: setTopMode
					}) : viewTopModelsNamed.length > 0 || viewTopProvidersNamed.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelTop5, {
						t: lang === "en" ? (k, p) => ({
							"model.top5": "Top 5 Models",
							"provider.top5": "Top 5 Providers",
							"model.top5.hint": "By token usage",
							"model.none": "No data",
							"view.model": "Model",
							"view.provider": "Provider"
						})[k] ?? t(k, p) : t,
						topModels: viewTopModelsNamed,
						topProviders: viewTopProvidersNamed,
						days: days ?? void 0,
						mode: topMode,
						onModeChange: setTopMode
					}) : null,
					!hasData && !days ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							border: "1px solid var(--dsw-alias-border-l2)",
							background: "var(--dsw-alias-bg-layer-3)",
							borderRadius: 12,
							padding: 24,
							color: "var(--dsw-alias-label-tertiary)",
							fontSize: 13
						},
						children: t("heatmap.empty")
					}) : null
				]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		const zh = {
			"nav": "Token Heatmap",
			"heatmap.title": "Token Heatmap",
			"heatmap.subtitle": "基于本地会话日志统计 Token 用量，北京时间自然日分桶，零网络零计费。首次同步后持久化，删除会话不丢历史。",
			"heatmap.empty": "暂无用量数据，开始一次对话后这里会出现热图。",
			"heatmap.legend.less": "少",
			"heatmap.legend.more": "多",
			"heatmap.tooltip.tokens": "{count} tokens",
			"heatmap.tooltip.none": "无用量",
			"heatmap.refresh": "刷新",
			"heatmap.refreshing": "刷新中…",
			"heatmap.lastRefresh": "上次刷新：{time}",
			"heatmap.autoRefresh": "自动刷新",
			"heatmap.autoRefresh.off": "关闭",
			"heatmap.autoRefresh.hint": "设置自动刷新间隔（分钟）",
			"heatmap.reset": "重置历史",
			"heatmap.reset.confirm": "确定重置所有历史数据？此操作不可撤销。",
			"heatmap.reset.done": "已重置",
			"view.week": "周",
			"view.month": "月",
			"view.quarter": "季度",
			"view.year": "年",
			"view.model": "模型",
			"view.provider": "供应商",
			"stats.today": "今日",
			"stats.week": "本周",
			"stats.month": "本月",
			"stats.all": "累计",
			"stats.count": "{count} 次",
			"model.top5": "Top 5 模型",
			"model.top5.hint": "按 Token 用量排序",
			"model.winner": "当日最常用模型",
			"model.none": "暂无模型数据",
			"model.tokens": "{count} tokens",
			"provider.top5": "Top 5 供应商",
			"provider.winner": "当日最常用供应商",
			"common.tokens": "tokens"
		};
		const en = {
			"nav": "Token Heatmap",
			"heatmap.title": "Token Heatmap",
			"heatmap.subtitle": "Local token usage from session logs, bucketed by Asia/Shanghai, no network or billing. Synced once then persisted, surviving session deletion.",
			"heatmap.empty": "No usage yet. Start a conversation and the heatmap will appear here.",
			"heatmap.legend.less": "Less",
			"heatmap.legend.more": "More",
			"heatmap.tooltip.tokens": "{count} tokens",
			"heatmap.tooltip.none": "No usage",
			"heatmap.refresh": "Refresh",
			"heatmap.refreshing": "Refreshing…",
			"heatmap.lastRefresh": "Last refresh: {time}",
			"heatmap.autoRefresh": "Auto refresh",
			"heatmap.autoRefresh.off": "Off",
			"heatmap.autoRefresh.hint": "Auto refresh interval (minutes)",
			"heatmap.reset": "Reset history",
			"heatmap.reset.confirm": "Reset all historical data? This cannot be undone.",
			"heatmap.reset.done": "Reset done",
			"view.week": "Week",
			"view.month": "Month",
			"view.quarter": "Quarter",
			"view.year": "Year",
			"view.model": "Model",
			"view.provider": "Provider",
			"stats.today": "Today",
			"stats.week": "This week",
			"stats.month": "This month",
			"stats.all": "All time",
			"stats.count": "{count} turns",
			"model.top5": "Top 5 Models",
			"model.top5.hint": "By token usage",
			"model.winner": "Daily winner (model)",
			"model.none": "No model data",
			"model.tokens": "{count} tokens",
			"provider.top5": "Top 5 Providers",
			"provider.winner": "Daily winner (provider)",
			"common.tokens": "tokens"
		};
		//#endregion
		//#region src/client/index.ts
		const NS = "dsh-token-heatmap";
		const inject = ["locale", "slots"];
		const NAV_CSS = `
[data-dsh-token-heatmap-nav] > svg:first-child { display: none; }
[data-dsh-token-heatmap-nav]::before {
  content: ''; flex: none; width: 16px; height: 16px; background: currentColor;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='7' height='7' rx='1'/%3E%3Crect x='14' y='3' width='7' height='7' rx='1'/%3E%3Crect x='3' y='14' width='7' height='7' rx='1'/%3E%3Crect x='14' y='14' width='7' height='7' rx='1'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='7' height='7' rx='1'/%3E%3Crect x='14' y='3' width='7' height='7' rx='1'/%3E%3Crect x='3' y='14' width='7' height='7' rx='1'/%3E%3Crect x='14' y='14' width='7' height='7' rx='1'/%3E%3C/svg%3E") center / contain no-repeat;
}
`;
		function injectNavCss() {
			if (typeof document === "undefined") return;
			const id = "dsh-token-heatmap-nav-css";
			if (document.getElementById(id)) return;
			const el = document.createElement("style");
			el.id = id;
			el.textContent = NAV_CSS;
			document.head.appendChild(el);
		}
		function markNavRow() {
			if (typeof document === "undefined") return;
			t_global();
			for (const label of ["Token Heatmap", "用量热图"]) {
				const btn = [...document.querySelectorAll("button")].find((b) => b.textContent?.trim().includes(label));
				if (btn) btn.setAttribute("data-dsh-token-heatmap-nav", "");
			}
		}
		let t_global = () => (k) => k;
		function apply(ctx) {
			injectNavCss();
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-token-heatmap: dictionaries");
			const t = ctx.locale.bind(NS);
			t_global = () => t;
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "heatmap",
				order: 55,
				label: () => t("nav"),
				locale: NS
			}, (props) => {
				setTimeout(markNavRow, 50);
				return react.createElement(SettingsSection, {
					t,
					ctx,
					...props
				});
			}));
			if (typeof document !== "undefined") {
				const mo = new MutationObserver(() => markNavRow());
				mo.observe(document.documentElement, {
					childList: true,
					subtree: true
				});
				setTimeout(() => mo.disconnect(), 3e4);
			}
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map