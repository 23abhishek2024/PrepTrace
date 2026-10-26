import { test } from "node:test";
import assert from "node:assert/strict";
import { computeATSScore, computeKeywordCoverage, RUBRIC } from "../utils/atsScore.js";
import { sampleRubric } from "./helpers.js";

test("weights add up to 1", () => {
  const total = RUBRIC.reduce((s, r) => s + r.weight, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
});

test("score is the weighted rubric, computed in code", () => {
  // 0.3*6 + 0.25*4 + 0.2*7 + 0.15*6 + 0.1*8 = 5.9 -> 59
  const { score, breakdown } = computeATSScore(sampleRubric());
  assert.equal(score, 59);
  assert.equal(breakdown.length, 5);
  assert.ok(breakdown.every((b) => b.source === "llm"));
});

test("all 10s gives 100, all 0s gives 0", () => {
  const all = (n) => Object.fromEntries(RUBRIC.map((r) => [r.key, { score: n, evidence: "" }]));
  assert.equal(computeATSScore(all(10)).score, 100);
  assert.equal(computeATSScore(all(0)).score, 0);
});

test("keyword coverage: whole words, spacing variants, plurals", () => {
  const resume = "Built REST APIs with Node.js, Express and PostgreSQL. Used JavaScript and React.js.";
  const { matched, missing, coverage } = computeKeywordCoverage(resume, [
    "NodeJS", "Express", "PostgreSQL", "REST API", "React", "Java", "Docker", "Go",
  ]);
  assert.deepEqual(matched.sort(), ["Express", "NodeJS", "PostgreSQL", "REST API", "React"].sort());
  assert.ok(missing.includes("Java"), "java must not match inside javascript");
  assert.ok(missing.includes("Go"), "short names must not match inside words");
  assert.ok(missing.includes("Docker"));
  assert.equal(coverage, 5 / 8);
});

test("with a JD, keyword criterion comes from computed coverage, not the LLM", () => {
  const rubric = sampleRubric({ keywords: { score: 10, evidence: "LLM says perfect" } });
  const jdMatch = { matched: ["A", "B"], missing: ["C", "D", "E", "F", "G", "H"], coverage: 0.25 };
  const { breakdown, score } = computeATSScore(rubric, jdMatch);
  const keywords = breakdown.find((b) => b.key === "keywords");
  assert.equal(keywords.source, "computed");
  assert.equal(keywords.score, 2.5);
  // 0.3*2.5 + 0.25*4 + 0.2*7 + 0.15*6 + 0.1*8 = 4.85 -> 49 (not inflated by the LLM's 10)
  assert.equal(score, 49);
});

test("too few JD skills falls back to the LLM keyword rating", () => {
  const jdMatch = { matched: ["A"], missing: [], coverage: 1 };
  const { breakdown } = computeATSScore(sampleRubric(), jdMatch);
  assert.equal(breakdown[0].source, "llm");
});

test("keyword coverage: 'A | B | C' is satisfied by any one alternative", () => {
  const resume = "Languages: C++, Python (basic), SQL. Built REST APIs.";
  const { matched, missing, coverage } = computeKeywordCoverage(resume, [
    "C# | Java | Python | Go | C++",
    "Kafka | RabbitMQ",
    "SQL",
  ]);
  assert.deepEqual(matched, ["Python", "SQL"]); // the alternative the resume actually has
  assert.deepEqual(missing, ["Kafka / RabbitMQ"]);
  assert.equal(coverage, 2 / 3);
});

test("keyword coverage: a SQL database counts as SQL", () => {
  const { matched } = computeKeywordCoverage("Designed PostgreSQL schemas.", ["SQL"]);
  assert.deepEqual(matched, ["SQL"]);
});

test("with nice-to-have skills: keywords = 80% required + 20% nice-to-have coverage", () => {
  const jdMatch = {
    matched: ["A", "B", "C"], missing: ["D"], coverage: 0.75,
    preferredMatched: [], preferredMissing: ["E", "F"], preferredCoverage: 0,
  };
  const { breakdown } = computeATSScore(sampleRubric(), jdMatch);
  assert.equal(breakdown[0].source, "computed");
  assert.equal(breakdown[0].score, 6); // 10 * (0.8 * 0.75 + 0.2 * 0)
  assert.match(breakdown[0].evidence, /0 of 2 nice-to-have/);
});

test("keyword coverage: common aliases (RESTful, Postgres, K8s)", () => {
  const resume = "Designed RESTful APIs on Postgres; deployed with K8s and GitHub Actions CI/CD.";
  const { matched, missing } = computeKeywordCoverage(resume, ["REST APIs", "PostgreSQL", "Kubernetes", "CI/CD", "Redis"]);
  assert.deepEqual(matched.sort(), ["CI/CD", "Kubernetes", "PostgreSQL", "REST APIs"].sort());
  assert.deepEqual(missing, ["Redis"]);
});
