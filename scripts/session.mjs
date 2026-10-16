import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const IDLE_CAP = 10 * 60 * 1000;

export function parseMinutes(text) {
  const value = String(text ?? "").trim().toLowerCase();
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value);
  const match = value.match(/^(?:(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|hours?))?\s*(?:(\d+)\s*(?:m|min|mins|minutes?))?$/);
  if (!match || (!match[1] && !match[2])) return undefined;
  return Math.round(Number((match[1] ?? "0").replace(",", ".")) * 60 + Number(match[2] ?? 0)) || undefined;
}

export function parseTokens(text) {
  const value = String(text ?? "").trim().toLowerCase().replace(/[\s,_]/g, "").replace(/tokens?$/, "");
  if (!value) return null;
  const match = value.match(/^(\d+(?:\.\d+)?)([km]?)$/);
  if (!match) return undefined;
  const tokens = Math.round(Number(match[1]) * (match[2] === "m" ? 1e6 : match[2] === "k" ? 1e3 : 1));
  return tokens >= 1 && tokens <= 1e10 ? tokens : undefined;
}

function walk(dir, out = []) {
  for (const name of existsSync(dir) ? readdirSync(dir) : []) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".jsonl")) out.push(full);
  }
  return out;
}

export function sessionFiles(sessionId, root = join(homedir(), ".claude", "projects")) {
  if (!sessionId || !/^[0-9a-f-]{8,64}$/i.test(sessionId) || !existsSync(root)) return [];
  for (const project of readdirSync(root)) {
    const main = join(root, project, `${sessionId}.jsonl`);
    if (existsSync(main)) return [main, ...walk(join(root, project, sessionId))];
  }
  return [];
}

function subagentIds(file) {
  const full = file.replace(/transcript\.jsonl$/, "transcript_full.jsonl");
  const source = existsSync(full) ? full : file;
  const out = [];
  for (const line of readFileSync(source, "utf8").split("\n")) {
    if (!line.includes("Created the following subagents:")) continue;
    try {
      const content = String(JSON.parse(line)?.content ?? "").trim();
      if (!/^(?:Created At:[^\n]*\nCompleted At:[^\n]*\n)?Created the following subagents:/.test(content)) continue;
      for (const match of content.matchAll(/"conversationId":\s*"([0-9a-f-]{8,64})"/gi)) out.push(match[1]);
    } catch {}
  }
  return out;
}

export function antigravityFiles(sessionId, root = join(homedir(), ".gemini", "antigravity", "brain")) {
  if (!sessionId || !/^[0-9a-f-]{8,64}$/i.test(sessionId) || !existsSync(root)) return [];
  const base = existsSync(join(root, "brain")) ? join(root, "brain") : root;
  const logOf = (id) => join(base, id, ".system_generated", "logs", "transcript.jsonl");
  if (!existsSync(logOf(sessionId))) return [];
  const seen = new Set([sessionId]);
  const queue = [sessionId];
  const files = [];
  for (const id of queue) {
    const file = logOf(id);
    if (!existsSync(file)) continue;
    files.push(file);
    for (const sub of subagentIds(file)) {
      if (!seen.has(sub)) {
        seen.add(sub);
        queue.push(sub);
      }
    }
  }
  return files;
}

const userRequest = (text) => {
  const match = String(text ?? "").match(/<USER_REQUEST>\s*([\s\S]*?)\s*<\/USER_REQUEST>/);
  return match ? match[1] : String(text ?? "");
};

function normalizeEntry(entry, file, index) {
  if (!entry || typeof entry !== "object") return null;
  if (typeof entry.timestamp === "string") return entry;
  if (typeof entry.created_at !== "string") return null;
  if (entry.type === "USER_INPUT" && (!entry.source || entry.source === "USER_EXPLICIT")) {
    return {
      type: "user",
      timestamp: entry.created_at,
      isSidechain: Boolean(entry.isSidechain),
      message: { role: "user", content: userRequest(entry.content) },
    };
  }
  if (entry.type === "PLANNER_RESPONSE" && (entry.input_tokens || entry.output_tokens)) {
    const id = String(entry.step_index ?? index);
    return {
      type: "assistant",
      timestamp: entry.created_at,
      sessionId: file,
      uuid: id,
      message: {
        id,
        usage: {
          input_tokens: entry.input_tokens ?? 0,
          cache_read_input_tokens: entry.cache_read_tokens ?? 0,
          output_tokens: entry.output_tokens ?? 0,
        },
      },
    };
  }
  return { type: "step", timestamp: entry.created_at };
}

function entriesOf(file) {
  const out = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const entry = normalizeEntry(JSON.parse(line), file, out.length);
      if (entry) out.push(entry);
    } catch {}
  }
  return out;
}

const textOf = (entry) => {
  const content = entry.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.filter((part) => part?.type === "text").map((part) => part.text).join("\n");
  return "";
};

const squash = (text) => text.toLowerCase().replace(/\s+/g, " ").trim();

export function measure(files, { prompt = "" } = {}) {
  if (!files.length) return null;
  const [main, ...side] = files;
  const mainEntries = entriesOf(main).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const asks = mainEntries.filter((entry) => entry.type === "user" && !entry.isSidechain && textOf(entry));
  const head = squash(prompt).slice(0, 48);
  const start =
    (head ? asks.find((entry) => squash(textOf(entry)).includes(head)) : null) ??
    asks.find((entry) => /\/anatomy\b|\banatomy\b/i.test(textOf(entry))) ??
    mainEntries[0];
  if (!start) return null;
  const end = asks.find((entry) => entry.timestamp > start.timestamp && /\bpublish\b/i.test(textOf(entry)) && /\b(community|gallery)\b/i.test(textOf(entry)));
  const from = start.timestamp;
  const to = end?.timestamp ?? "￿";
  const inWindow = (entry) => entry.timestamp >= from && entry.timestamp < to;

  const all = [...mainEntries, ...side.flatMap(entriesOf)].filter(inWindow);
  const times = [...new Set(all.map((entry) => Date.parse(entry.timestamp)).filter(Number.isFinite))].sort((a, b) => a - b);
  let active = 0;
  for (let i = 1; i < times.length; i++) active += Math.min(times[i] - times[i - 1], IDLE_CAP);

  const perMessage = new Map();
  for (const entry of all) {
    const usage = entry.type === "assistant" ? entry.message?.usage : null;
    if (!usage) continue;
    const key = `${entry.sessionId ?? ""}:${entry.agentId ?? ""}:${entry.message?.id ?? entry.uuid}`;
    const spent = (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.output_tokens ?? 0);
    perMessage.set(key, Math.max(perMessage.get(key) ?? 0, spent));
  }
  const tokens = [...perMessage.values()].reduce((sum, spent) => sum + spent, 0);
  if (!tokens) return null;
  const last = end?.timestamp ?? (times.length ? new Date(times.at(-1)).toISOString() : from);
  return { minutes: Math.max(1, Math.round(active / 60000)), tokens, from, to: last };
}

export function fromThisSession({ prompt, env = process.env, root } = {}) {
  const files = env.CLAUDE_CODE_SESSION_ID
    ? sessionFiles(env.CLAUDE_CODE_SESSION_ID, root)
    : antigravityFiles(env.ANTIGRAVITY_CONVERSATION_ID, root ?? env.ANTIGRAVITY_APP_DATA_DIR);
  return measure(files, { prompt });
}

export function describe({ minutes, tokens }) {
  const time = minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`;
  const count = tokens >= 1e6 ? `${(tokens / 1e6).toFixed(1).replace(/\.0$/, "")}M` : tokens >= 1e3 ? `${Math.round(tokens / 1e3)}k` : String(tokens);
  return `about ${time} and ${count} tokens`;
}
