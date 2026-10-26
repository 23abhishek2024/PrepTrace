import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCacheKey, resumeCacheTag, withCache } from "../utils/llmCache.js";

const memoryStore = () => {
  const map = new Map();
  return { map, get: async (k) => map.get(k) ?? null, set: async (k, _t, v) => void map.set(k, v) };
};

test("same inputs -> same key; different inputs -> different key", () => {
  const a = buildCacheKey("resume-analysis", { resumeText: "x", jobDescription: "" });
  const b = buildCacheKey("resume-analysis", { resumeText: "x", jobDescription: "" });
  const c = buildCacheKey("resume-analysis", { resumeText: "x", jobDescription: "jd" });
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^[a-f0-9]{64}$/);
});

test("second call is served from cache without computing", async () => {
  const store = memoryStore();
  let computed = 0;
  const compute = async () => { computed++; return { score: 70 }; };
  const first = await withCache("roadmap", { role: "sde" }, compute, store);
  const second = await withCache("roadmap", { role: "sde" }, compute, store);
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.deepEqual(second.value, { score: 70 });
  assert.equal(computed, 1);
});

test("entries are tagged by resume so deleting a resume can remove them", async () => {
  const tags = [];
  const store = { get: async () => null, set: async (_key, _task, _value, tag) => void tags.push(tag) };
  await withCache("resume-analysis", { resumeText: "abc" }, async () => ({ ok: 1 }), store, {
    tag: resumeCacheTag("abc"),
  });
  assert.equal(tags[0], resumeCacheTag("abc"));
  assert.match(tags[0], /^resume:[a-f0-9]{64}$/);
  assert.notEqual(resumeCacheTag("abc"), resumeCacheTag("abd"));
});

test("a broken cache never breaks the request", async () => {
  const broken = { get: async () => { throw new Error("db down"); }, set: async () => { throw new Error("db down"); } };
  const result = await withCache("roadmap", { role: "sde" }, async () => ({ ok: true }), broken);
  assert.deepEqual(result, { value: { ok: true }, cached: false });
});
