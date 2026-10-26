import { test } from "node:test";
import assert from "node:assert/strict";
import {
  feedbackSchema,
  questionsSchema,
  resumeAnalysisSchema,
  roadmapSchema,
  resourceDocsSchema,
} from "../schemas/llm.schemas.js";
import { sampleAnalysis, sixQuestions } from "./helpers.js";

test("questions: normalizes difficulty case, clamps timers, unwraps {questions}", () => {
  const raw = sixQuestions();
  raw[0].difficulty = "Easy";
  raw[1].timer = 10;
  raw[3].timer = 99999;
  const parsed = questionsSchema.parse({ questions: raw });
  assert.equal(parsed[0].difficulty, "easy");
  assert.equal(parsed[1].timer, 60);
  assert.equal(parsed[3].timer, 1800);
  assert.equal(parsed[2].refId, null);
});

test("questions: wrong count or bad difficulty fails", () => {
  assert.throws(() => questionsSchema.parse(sixQuestions().slice(0, 5)));
  const bad = sixQuestions();
  bad[0].difficulty = "coding";
  assert.throws(() => questionsSchema.parse(bad));
});

test("feedback: scores must be 0-100", () => {
  const ok = {
    score: 70, correctness: 70, clarity: 70, relevance: 70, detail: 70, efficiency: 70,
    communication: 70, problemSolving: 70, creativity: 70,
    feedback: "Good answer.", improvements: ["Add an example."],
  };
  assert.equal(feedbackSchema.parse(ok).score, 70);
  assert.throws(() => feedbackSchema.parse({ ...ok, score: 140 }));
  assert.throws(() => feedbackSchema.parse({ ...ok, improvements: [] }));
});

test("resume: object projects become strings (fixes [object Object])", () => {
  const parsed = resumeAnalysisSchema.parse(sampleAnalysis());
  assert.equal(parsed.projects[0], "ChatApp — Real-time chat with Socket.IO");
  assert.equal(parsed.projects.join(", ").includes("[object Object]"), false);
});

test("resume: nice-to-have list defaults to [] and alternatives are kept as one item", () => {
  const parsed = resumeAnalysisSchema.parse(sampleAnalysis({ jdRequiredSkills: ["C# | Java | Python | Go | C++"] }));
  assert.deepEqual(parsed.jdPreferredSkills, []);
  assert.equal(parsed.jdRequiredSkills[0], "C# | Java | Python | Go | C++");
});

test("resume: rubric scores must be 0-10", () => {
  const bad = sampleAnalysis();
  bad.rubric.impact.score = 85;
  assert.throws(() => resumeAnalysisSchema.parse(bad));
});

test("roadmap: capitalizes level and difficulty", () => {
  const parsed = roadmapSchema.parse({
    title: "Backend roadmap",
    targetPackage: 20,
    duration: "6 months",
    level: "intermediate",
    modules: [1, 2, 3].map((i) => ({
      title: `Module ${i}`, duration: "2 weeks", difficulty: "medium", description: "Learn things well.",
    })),
  });
  assert.equal(parsed.level, "Intermediate");
  assert.equal(parsed.modules[0].difficulty, "Medium");
  assert.equal(parsed.targetPackage, "20");
});

test("resource docs: drops items without a valid http link", () => {
  const parsed = resourceDocsSchema.parse([
    { title: "React", article: "https://react.dev" },
    { title: "Bad", article: "javascript:alert(1)" },
    { title: "Missing" },
  ]);
  assert.deepEqual(parsed, [{ title: "React", article: "https://react.dev" }]);
});
