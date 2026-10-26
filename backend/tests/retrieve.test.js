import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import { buildRetrievalQuery, cosineSimilarity, questionEmbeddingText, rankQuestions, retrieveQuestions } from "../rag/retrieve.js";
import { fakeEmbed, useFakeEmbedder } from "./helpers.js";

const bank = JSON.parse(fs.readFileSync(new URL("../rag/questionBank.json", import.meta.url)));

test("question bank is well-formed", () => {
  const ids = new Set(bank.map((q) => q.qid));
  assert.equal(ids.size, bank.length);
  assert.ok(bank.length >= 150);
  for (const q of bank) {
    assert.ok(["technical", "hr"].includes(q.type));
    assert.ok(["easy", "medium", "hard"].includes(q.difficulty));
    assert.ok(q.question.length > 10);
  }
});

test("cosine similarity basics", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.equal(cosineSimilarity([0, 0], [1, 0]), 0);
});

test("ranking returns k items, most similar first, max 2 per topic", () => {
  const items = bank.filter((q) => q.type === "technical");
  const vectors = fakeEmbed(items.map(questionEmbeddingText));
  const withVectors = items.map((q, i) => ({ ...q, embedding: vectors[i] }));
  const query = fakeEmbed(["MongoDB aggregation pipeline indexes schema design"])[0];
  const top = rankQuestions(query, withVectors, 8);
  assert.equal(top.length, 8);
  assert.equal(top[0].topic, "MongoDB");
  for (let i = 1; i < top.length; i++) assert.ok(top[i - 1].similarity >= top[i].similarity);
  const perTopic = top.reduce((m, q) => m.set(q.topic, (m.get(q.topic) || 0) + 1), new Map());
  assert.ok([...perTopic.values()].every((n) => n <= 2));
});

test("retrieval uses resume skills in the query", () => {
  const query = buildRetrievalQuery({
    role: "Backend Developer",
    type: "technical",
    resume: { skills: ["PostgreSQL", "Docker"], projects: [{ title: "AuctionLoom", description: "bids" }] },
  });
  assert.match(query, /Backend Developer/);
  assert.match(query, /PostgreSQL, Docker/);
  assert.match(query, /AuctionLoom — bids/);
});

test("retrieveQuestions end-to-end with a fake embedder", async () => {
  useFakeEmbedder();
  const items = bank.filter((q) => q.type === "hr");
  const vectors = fakeEmbed(items.map(questionEmbeddingText));
  const loadBank = async () => items.map((q, i) => ({ ...q, embedding: vectors[i] }));
  const refs = await retrieveQuestions({ role: "Software Engineer", type: "hr", loadBank, k: 5 });
  assert.equal(refs.length, 5);
  assert.ok(refs.every((r) => r.qid.startsWith("hr-")));
});

test("retrieval failure returns [] instead of throwing", async () => {
  const loadBank = async () => { throw new Error("db down"); };
  assert.deepEqual(await retrieveQuestions({ role: "x", type: "technical", loadBank }), []);
});
