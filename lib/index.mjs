import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
//#region src/date-bucket.ts
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
//#region src/host/session-reader.ts
/**
* Parse a batch of raw session events into RawUsageEvents.
* Rules:
* - request/header stores provider/model for fallback
* - assistant/chunk type=usage is provisional, keyed by turn/step
* - assistant/message with usage is authoritative, overwrites provisional for same turn/step
*/
function parseUsageEvents(events) {
	let fallbackProvider = "";
	let fallbackModel = "";
	const byTurnStep = /* @__PURE__ */ new Map();
	for (const ev of events) {
		if (ev.type === "request/header" && ev.data?.header?.config) {
			const cfg = ev.data.header.config;
			if (cfg.provider) fallbackProvider = cfg.provider;
			if (cfg.model) fallbackModel = cfg.model;
		}
		if (ev.type === "request/context" && ev.data) {
			if (ev.data.provider) fallbackProvider = ev.data.provider;
			if (ev.data.model) fallbackModel = ev.data.model;
		}
		if (ev.type === "assistant/chunk" && ev.data?.chunk?.type === "usage") {
			const key = `${ev.data.turn}:${ev.data.step}`;
			if (!byTurnStep.has(key)) {
				const u = ev.data.chunk.usage;
				byTurnStep.set(key, {
					time: ev.time ?? Date.now(),
					provider: fallbackProvider,
					model: fallbackModel,
					usage: {
						inputTokens: u.inputTokens ?? 0,
						cacheReadTokens: u.cacheReadTokens ?? 0,
						cacheWriteTokens: u.cacheWriteTokens ?? 0,
						outputTokens: u.outputTokens ?? 0
					}
				});
			}
		}
		if (ev.type === "assistant/message" && ev.data?.usage) {
			const src = ev.data.message?.source;
			const provider = src?.provider ?? fallbackProvider;
			const model = src?.model ?? fallbackModel;
			const turn = ev.data.turn;
			const step = ev.data.step;
			const key = turn !== void 0 && step !== void 0 ? `${turn}:${step}` : `msg:${ev.seq ?? Math.random()}`;
			const u = ev.data.usage;
			byTurnStep.set(key, {
				time: ev.time ?? Date.now(),
				provider,
				model,
				usage: {
					inputTokens: u.inputTokens ?? 0,
					cacheReadTokens: u.cacheReadTokens ?? 0,
					cacheWriteTokens: u.cacheWriteTokens ?? 0,
					outputTokens: u.outputTokens ?? 0
				}
			});
			if (src?.provider) fallbackProvider = src.provider;
			if (src?.model) fallbackModel = src.model;
		}
	}
	return [...byTurnStep.values()];
}
/**
* Read all sessions' events via ctx.sessions or filesystem fallback.
* Returns flattened RawUsageEvents across all sessions.
*/
async function readAllUsageEvents(ctx) {
	const allEvents = [];
	try {
		if (ctx.sessions?.list) {
			const sessions = await ctx.sessions.list();
			for (const s of sessions ?? []) {
				const events = s.events ?? [];
				allEvents.push(...events);
			}
			if (allEvents.length > 0) return parseUsageEvents(allEvents);
		}
	} catch {}
	try {
		const { readdirSync, existsSync } = await import("node:fs");
		const { join } = await import("node:path");
		const { execSync } = await import("node:child_process");
		const sessionsDir = join(process.env.HOME ?? "/home/dell", ".dsh", "sessions");
		if (!existsSync(sessionsDir)) return [];
		function walk(dir, acc) {
			try {
				for (const entry of readdirSync(dir, { withFileTypes: true })) {
					const p = join(dir, entry.name);
					if (entry.isDirectory()) walk(p, acc);
					else if (entry.name === "session.jsonl.zstd" || entry.name === "session.jsonl") acc.push(p);
				}
			} catch {}
		}
		const files = [];
		walk(sessionsDir, files);
		for (const f of files) try {
			let text;
			if (f.endsWith(".zstd")) text = execSync(`zstd -dc ${JSON.stringify(f)}`, {
				encoding: "utf-8",
				maxBuffer: 52428800
			});
			else {
				const { readFileSync } = await import("node:fs");
				text = readFileSync(f, "utf-8");
			}
			for (const line of text.split("\n")) {
				if (!line.trim()) continue;
				try {
					const obj = JSON.parse(line);
					if (obj.type === "request/header" || obj.type === "request/context" || obj.type === "assistant/chunk" || obj.type === "assistant/message") allEvents.push(obj);
				} catch {}
			}
		} catch {}
	} catch {}
	return parseUsageEvents(allEvents);
}
//#endregion
//#region src/host/persist.ts
function persistPath() {
	const dir = join(homedir(), ".dsh", "storages", "dsh-token-heatmap");
	return join(dir, "daily.json");
}
function libDailyPath() {
	try {
		const candidates = [join(homedir(), ".dsh", "profiles", "web", "node_modules", "dsh-token-heatmap", "lib", "daily.json"), join("/home/dell/testdsh/dsh-token-heatmap/lib/daily.json")];
		for (const c of candidates) try {
			mkdirSync(dirname(c), { recursive: true });
			return c;
		} catch {}
		return candidates[0];
	} catch {
		return null;
	}
}
function toPersistedDay(day) {
	return {
		dayKey: day.dayKey,
		totalTokens: day.totalTokens,
		uncachedInputTokens: day.uncachedInputTokens,
		cacheReadTokens: day.cacheReadTokens,
		cacheWriteTokens: day.cacheWriteTokens,
		outputTokens: day.outputTokens,
		count: day.count,
		byModel: Object.fromEntries(day.byModel),
		byProvider: Object.fromEntries(day.byProvider),
		hourlyTokens: [...day.hourlyTokens ?? new Array(24).fill(0)],
		winnerModel: day.winnerModel,
		winnerProvider: day.winnerProvider
	};
}
function fromPersistedDay(p) {
	const byModel = new Map(Object.entries(p.byModel ?? {}));
	const byProvider = new Map(Object.entries(p.byProvider ?? {}));
	const hourlyTokens = Array.isArray(p.hourlyTokens) && p.hourlyTokens.length === 24 ? [...p.hourlyTokens] : new Array(24).fill(0);
	return {
		dayKey: p.dayKey,
		totalTokens: p.totalTokens,
		uncachedInputTokens: p.uncachedInputTokens ?? 0,
		cacheReadTokens: p.cacheReadTokens ?? 0,
		cacheWriteTokens: p.cacheWriteTokens ?? 0,
		outputTokens: p.outputTokens ?? 0,
		count: p.count ?? 0,
		byModel,
		byProvider,
		hourlyTokens,
		winnerModel: p.winnerModel ?? null,
		winnerProvider: p.winnerProvider ?? null
	};
}
function loadPersisted() {
	try {
		const p = persistPath();
		if (!existsSync(p)) return /* @__PURE__ */ new Map();
		const raw = readFileSync(p, "utf-8");
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed.days !== "object") return /* @__PURE__ */ new Map();
		const m = /* @__PURE__ */ new Map();
		for (const [k, v] of Object.entries(parsed.days)) try {
			m.set(k, fromPersistedDay(v));
		} catch {}
		return m;
	} catch {
		return /* @__PURE__ */ new Map();
	}
}
function savePersisted(days) {
	try {
		const out = {
			version: 1,
			days: Object.fromEntries([...days.entries()].map(([k, v]) => [k, toPersistedDay(v)]))
		};
		const json = JSON.stringify(out, null, 2);
		const p = persistPath();
		mkdirSync(dirname(p), { recursive: true });
		const tmp = p + ".tmp";
		writeFileSync(tmp, json, "utf-8");
		renameSync(tmp, p);
		const libPath = libDailyPath();
		if (libPath) {
			try {
				writeFileSync(libPath, json, "utf-8");
			} catch {}
			try {
				const wsLib = join("/home/dell/testdsh/dsh-token-heatmap/lib/daily.json");
				if (wsLib !== libPath) writeFileSync(wsLib, json, "utf-8");
			} catch {}
		}
	} catch {}
}
/**
* Merge strategy: persisted is cumulative historical truth that never shrinks.
* For each dayKey, if live has data, take element-wise MAX for additive fields,
* and merge byModel/byProvider by taking max per key (or summing? No - live total is sum of remaining sessions, persisted is sum of all-time events. Taking max per day total prevents loss on deletion while allowing growth on new events. Per-model we also take max per model per day? But that would undercount if a new model appears. Better: merge by taking max of total, and for byModel: for each model, max(persisted, live). If a new model appears only in live, it propagates.
* For count: max as well.
*/
function mergePersistedAndLive(persisted, live) {
	const result = /* @__PURE__ */ new Map();
	for (const [k, v] of persisted) result.set(k, cloneDay$1(v));
	for (const [k, liveDay] of live) {
		const prev = result.get(k);
		if (!prev) {
			result.set(k, cloneDay$1(liveDay));
			continue;
		}
		const mergedHourly = (prev.hourlyTokens ?? new Array(24).fill(0)).map((v, i) => Math.max(v, liveDay.hourlyTokens?.[i] ?? 0));
		const merged = {
			dayKey: k,
			totalTokens: Math.max(prev.totalTokens, liveDay.totalTokens),
			uncachedInputTokens: Math.max(prev.uncachedInputTokens, liveDay.uncachedInputTokens),
			cacheReadTokens: Math.max(prev.cacheReadTokens, liveDay.cacheReadTokens),
			cacheWriteTokens: Math.max(prev.cacheWriteTokens, liveDay.cacheWriteTokens),
			outputTokens: Math.max(prev.outputTokens, liveDay.outputTokens),
			count: Math.max(prev.count, liveDay.count),
			byModel: mergeMapMax(prev.byModel, liveDay.byModel),
			byProvider: mergeMapMax(prev.byProvider, liveDay.byProvider),
			hourlyTokens: mergedHourly,
			winnerModel: null,
			winnerProvider: null
		};
		let bestM = null;
		let bestMVal = -1;
		for (const [m, v2] of merged.byModel) if (v2 > bestMVal) {
			bestMVal = v2;
			bestM = m;
		}
		merged.winnerModel = bestM;
		let bestP = null;
		let bestPVal = -1;
		for (const [p, v2] of merged.byProvider) if (v2 > bestPVal) {
			bestPVal = v2;
			bestP = p;
		}
		merged.winnerProvider = bestP;
		result.set(k, merged);
	}
	return result;
}
function cloneDay$1(d) {
	return {
		dayKey: d.dayKey,
		totalTokens: d.totalTokens,
		uncachedInputTokens: d.uncachedInputTokens,
		cacheReadTokens: d.cacheReadTokens,
		cacheWriteTokens: d.cacheWriteTokens,
		outputTokens: d.outputTokens,
		count: d.count,
		byModel: new Map(d.byModel),
		byProvider: new Map(d.byProvider),
		hourlyTokens: [...d.hourlyTokens ?? new Array(24).fill(0)],
		winnerModel: d.winnerModel,
		winnerProvider: d.winnerProvider
	};
}
function mergeMapMax(a, b) {
	const r = new Map(a);
	for (const [k, v] of b) r.set(k, Math.max(r.get(k) ?? 0, v));
	return r;
}
//#endregion
//#region src/host/store.ts
var HeatmapStore = class HeatmapStore {
	events = [];
	aggregated;
	listeners = /* @__PURE__ */ new Set();
	byTurnStep = /* @__PURE__ */ new Map();
	fallbackProvider = "";
	fallbackModel = "";
	ctx;
	persistedDays = /* @__PURE__ */ new Map();
	constructor(ctx) {
		this.ctx = ctx;
		this.aggregated = aggregate([], Date.now());
	}
	async init() {
		this.persistedDays = loadPersisted();
		const evs = await readAllUsageEvents(this.ctx);
		this.events = evs;
		this.rebuildPersistedAndAggregated();
	}
	/** Full rescan + merge with persisted (call on manual refresh or periodic timer) */
	async refresh() {
		const evs = await readAllUsageEvents(this.ctx);
		this.events = evs;
		const freshPersisted = loadPersisted();
		this.persistedDays = mergePersistedAndLive(freshPersisted, this.persistedDays);
		this.persistedDays = loadPersisted();
		this.rebuildPersistedAndAggregated();
	}
	rebuildPersistedAndAggregated() {
		this.invalidateCache();
		const live = aggregate(this.events, Date.now());
		const mergedDays = mergePersistedAndLive(this.persistedDays, live.byDay);
		if (mergedDays.size !== this.persistedDays.size || hasAnyIncrease(this.persistedDays, mergedDays)) {
			this.persistedDays = mergedDays;
			savePersisted(this.persistedDays);
		} else {
			this.persistedDays = mergedDays;
			if (!mapsEqual(loadPersisted(), mergedDays)) savePersisted(this.persistedDays);
		}
		this.aggregated = aggregateFromPersisted(this.persistedDays, Date.now());
		this.emit();
	}
	rebuildAggregated() {
		this.invalidateCache();
		this.aggregated = aggregateFromPersisted(this.persistedDays, Date.now());
		this.emit();
	}
	cachedAgg = null;
	cachedAt = 0;
	static CACHE_TTL_MS = 3e4;
	getAggregated() {
		const now = Date.now();
		if (this.cachedAgg && now - this.cachedAt < HeatmapStore.CACHE_TTL_MS) return this.cachedAgg;
		const live = aggregate(this.events, now);
		const merged = mergePersistedAndLive(this.persistedDays, live.byDay);
		this.cachedAgg = aggregateFromPersisted(merged, now);
		this.cachedAt = now;
		return this.cachedAgg;
	}
	invalidateCache() {
		this.cachedAgg = null;
		this.cachedAt = 0;
	}
	/** Ingest a single session event incrementally */
	ingest(event) {
		if (event.type === "request/header" && event.data?.header?.config) {
			const cfg = event.data.header.config;
			if (cfg.provider) this.fallbackProvider = cfg.provider;
			if (cfg.model) this.fallbackModel = cfg.model;
			return;
		}
		if (event.type === "request/context" && event.data) {
			if (event.data.provider) this.fallbackProvider = event.data.provider;
			if (event.data.model) this.fallbackModel = event.data.model;
			return;
		}
		if (event.type === "assistant/chunk" && event.data?.chunk?.type === "usage") {
			const key = `${event.data.turn}:${event.data.step}`;
			if (!this.byTurnStep.has(key)) {
				const u = event.data.chunk.usage;
				const ev = {
					time: event.time ?? Date.now(),
					provider: this.fallbackProvider,
					model: this.fallbackModel,
					usage: {
						inputTokens: u.inputTokens ?? 0,
						cacheReadTokens: u.cacheReadTokens ?? 0,
						cacheWriteTokens: u.cacheWriteTokens ?? 0,
						outputTokens: u.outputTokens ?? 0
					}
				};
				this.byTurnStep.set(key, ev);
				this.events.push(ev);
				this.persistIncremental(ev);
				this.rebuildAggregated();
			}
			return;
		}
		if (event.type === "assistant/message" && event.data?.usage) {
			const src = event.data.message?.source;
			const provider = src?.provider ?? this.fallbackProvider;
			const model = src?.model ?? this.fallbackModel;
			const turn = event.data.turn;
			const step = event.data.step;
			const key = turn !== void 0 && step !== void 0 ? `${turn}:${step}` : `msg:${event.seq ?? Math.random()}`;
			const existing = this.byTurnStep.get(key);
			const u = event.data.usage;
			const ev = {
				time: event.time ?? Date.now(),
				provider,
				model,
				usage: {
					inputTokens: u.inputTokens ?? 0,
					cacheReadTokens: u.cacheReadTokens ?? 0,
					cacheWriteTokens: u.cacheWriteTokens ?? 0,
					outputTokens: u.outputTokens ?? 0
				}
			};
			if (existing) {
				const idx = this.events.indexOf(existing);
				if (idx !== -1) this.events.splice(idx, 1);
			}
			this.byTurnStep.set(key, ev);
			this.events.push(ev);
			if (src?.provider) this.fallbackProvider = src.provider;
			if (src?.model) this.fallbackModel = src.model;
			this.persistIncremental(ev);
			this.rebuildAggregated();
		}
	}
	persistIncremental(ev) {
		const live = aggregate(this.events, Date.now());
		const dayKey = toDayKey(ev.time);
		const liveDay = live.byDay.get(dayKey);
		if (!liveDay) return;
		const prev = this.persistedDays.get(dayKey);
		const merged = prev ? mergeTwoDays(prev, liveDay) : cloneDay(liveDay);
		this.persistedDays.set(dayKey, merged);
		savePersisted(this.persistedDays);
	}
	onChange(cb) {
		this.listeners.add(cb);
		return () => this.listeners.delete(cb);
	}
	emit() {
		for (const cb of this.listeners) cb();
	}
	dispose() {
		this.listeners.clear();
	}
	/** For testing: inject events directly */
	_injectEvents(evs) {
		this.events.push(...evs);
		this.rebuildAggregated();
	}
	getPersistedDays() {
		return new Map(this.persistedDays);
	}
	clearPersisted() {
		this.persistedDays.clear();
		savePersisted(this.persistedDays);
		this.rebuildAggregated();
	}
};
function cloneDay(d) {
	return {
		dayKey: d.dayKey,
		totalTokens: d.totalTokens,
		uncachedInputTokens: d.uncachedInputTokens,
		cacheReadTokens: d.cacheReadTokens,
		cacheWriteTokens: d.cacheWriteTokens,
		outputTokens: d.outputTokens,
		count: d.count,
		byModel: new Map(d.byModel),
		byProvider: new Map(d.byProvider),
		winnerModel: d.winnerModel,
		winnerProvider: d.winnerProvider
	};
}
function mergeTwoDays(prev, live) {
	const byModel = new Map(prev.byModel);
	for (const [k, v] of live.byModel) byModel.set(k, Math.max(byModel.get(k) ?? 0, v));
	const byProvider = new Map(prev.byProvider);
	for (const [k, v] of live.byProvider) byProvider.set(k, Math.max(byProvider.get(k) ?? 0, v));
	const merged = {
		dayKey: prev.dayKey,
		totalTokens: Math.max(prev.totalTokens, live.totalTokens),
		uncachedInputTokens: Math.max(prev.uncachedInputTokens, live.uncachedInputTokens),
		cacheReadTokens: Math.max(prev.cacheReadTokens, live.cacheReadTokens),
		cacheWriteTokens: Math.max(prev.cacheWriteTokens, live.cacheWriteTokens),
		outputTokens: Math.max(prev.outputTokens, live.outputTokens),
		count: Math.max(prev.count, live.count),
		byModel,
		byProvider,
		winnerModel: null,
		winnerProvider: null
	};
	let bestM = null;
	let bestMVal = -1;
	for (const [m, v2] of byModel) if (v2 > bestMVal) {
		bestMVal = v2;
		bestM = m;
	}
	merged.winnerModel = bestM;
	let bestP = null;
	let bestPVal = -1;
	for (const [p, v2] of byProvider) if (v2 > bestPVal) {
		bestPVal = v2;
		bestP = p;
	}
	merged.winnerProvider = bestP;
	return merged;
}
function hasAnyIncrease(a, b) {
	for (const [k, vb] of b) {
		const va = a.get(k);
		if (!va) return true;
		if (vb.totalTokens > va.totalTokens) return true;
		if (vb.count > va.count) return true;
	}
	return false;
}
function mapsEqual(a, b) {
	if (a.size !== b.size) return false;
	for (const [k, va] of a) {
		const vb = b.get(k);
		if (!vb) return false;
		if (va.totalTokens !== vb.totalTokens || va.count !== vb.count) return false;
	}
	return true;
}
function aggregateFromPersisted(persistedDays, nowMs) {
	const fakeEvents = [];
	for (const day of persistedDays.values()) {
		for (const [model, tokens] of day.byModel) fakeEvents.push({
			time: (/* @__PURE__ */ new Date(day.dayKey + "T12:00:00+08:00")).getTime(),
			provider: day.winnerProvider ?? "unknown",
			model,
			usage: {
				inputTokens: tokens,
				cacheReadTokens: 0,
				cacheWriteTokens: 0,
				outputTokens: 0
			}
		});
		if (day.byModel.size === 0 && day.totalTokens > 0) fakeEvents.push({
			time: (/* @__PURE__ */ new Date(day.dayKey + "T12:00:00+08:00")).getTime(),
			provider: day.winnerProvider ?? "unknown",
			model: day.winnerModel ?? "unknown",
			usage: {
				inputTokens: day.totalTokens,
				cacheReadTokens: 0,
				cacheWriteTokens: 0,
				outputTokens: 0
			}
		});
	}
	const agg = aggregate(fakeEvents, nowMs);
	const todayKey = toDayKey(nowMs);
	const [wS, wE] = weekRangeFor(todayKey);
	const [mS, mE] = monthRangeFor(todayKey);
	const sumRange = (s, e) => {
		let sum = 0;
		let cur = s;
		while (cur <= e) {
			sum += persistedDays.get(cur)?.totalTokens ?? 0;
			const d = /* @__PURE__ */ new Date(cur + "T12:00:00+08:00");
			d.setDate(d.getDate() + 1);
			cur = toDayKey(d.getTime());
			if (cur > e) break;
		}
		return sum;
	};
	let all = 0;
	for (const v of persistedDays.values()) all += v.totalTokens;
	agg.totals = {
		today: persistedDays.get(todayKey)?.totalTokens ?? 0,
		thisWeek: sumRange(wS, wE),
		thisMonth: sumRange(mS, mE),
		all
	};
	agg.byDay = new Map(persistedDays);
	return agg;
}
//#endregion
//#region src/index.ts
const name = "dsh-token-heatmap";
const inject = ["sessions"];
function apply(ctx) {
	const store = new HeatmapStore(ctx);
	ctx.provide("heatmapStore", store);
	ctx.heatmapStore = store;
	let disposed = false;
	store.init().catch((e) => {
		ctx.logger?.warn?.(`dsh-token-heatmap init failed: ${String(e)}`);
	});
	ctx.on("session/event", (_session, event) => {
		if (disposed) return;
		store.ingest(event);
	});
	ctx.on("session/flush", () => {});
	let unregisterRoute = null;
	ctx.inject(["webServer"], (wsCtx) => {
		try {
			const handler = (req, res) => {
				try {
					const agg = store.getAggregated();
					const days = [...agg.byDay.values()].map((d) => ({
						dayKey: d.dayKey,
						totalTokens: d.totalTokens,
						uncachedInputTokens: d.uncachedInputTokens,
						cacheReadTokens: d.cacheReadTokens,
						cacheWriteTokens: d.cacheWriteTokens,
						outputTokens: d.outputTokens,
						count: d.count,
						byModel: Object.fromEntries(d.byModel),
						byProvider: Object.fromEntries(d.byProvider),
						hourlyTokens: d.hourlyTokens,
						winnerModel: d.winnerModel,
						winnerProvider: d.winnerProvider
					}));
					const body = JSON.stringify({
						version: 1,
						totals: agg.totals,
						topModels: agg.topModels.map((x) => ({
							name: x.model,
							tokens: x.tokens
						})),
						topProviders: agg.topProviders.map((x) => ({
							name: x.provider,
							tokens: x.tokens
						})),
						days
					});
					res.writeHead(200, {
						"Content-Type": "application/json",
						"Cache-Control": "no-store"
					});
					res.end(body);
				} catch (e) {
					res.writeHead(500, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: String(e) }));
				}
			};
			unregisterRoute = wsCtx.webServer.register({
				kind: "exact",
				path: "/api/dsh-token-heatmap/daily.json",
				handler
			});
			ctx.logger.info("dsh-token-heatmap: registered /api/dsh-token-heatmap/daily.json");
		} catch (e) {
			ctx.logger?.warn?.(`dsh-token-heatmap route register failed: ${String(e)}`);
		}
	});
	ctx.effect(() => () => {
		disposed = true;
		store.dispose();
		if (unregisterRoute) try {
			unregisterRoute();
		} catch {}
	}, "dsh-token-heatmap.dispose");
	ctx.logger.info("dsh-token-heatmap host up");
}
//#endregion
export { apply, inject, name };

//# sourceMappingURL=index.mjs.map