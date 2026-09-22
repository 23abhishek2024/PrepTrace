import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import llm from "../config/llm.js";
import searchVideo from "../config/youtube.js";

export const resourceAgent = async (roadmap) => {
  try {
    if (!roadmap || !roadmap.modules || roadmap.modules.length === 0) {
      return roadmap;
    }

    const moduleTitles = roadmap.modules
      .map((module) => module.title)
      .join("\n");

    const docsResponse = await llm.invoke([
      new SystemMessage(`
You are an expert software engineer.

For every module below, return the best official documentation or learning resource URL.

Rules:
1. Prefer official documentation (e.g. react.dev, developer.mozilla.org, nodejs.org, mongodb.com).
2. If official documentation does not exist, return a high-quality free learning guide.
3. Return ONLY valid JSON array.
4. Do not explain anything.
5. Keep the exact same title.

Return format:
[
  {
    "title": "",
    "article": "https://..."
  }
]
`),
      new HumanMessage(`Modules:\n${moduleTitles}`),
    ]);

    let docs = [];
    try {
      let cleaned = docsResponse.content.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
      }
      docs = JSON.parse(cleaned);
    } catch (e) {
      docs = [];
    }

    const docsMap = new Map();
    if (Array.isArray(docs)) {
      docs.forEach((item) => {
        if (item?.title && item?.article) {
          docsMap.set(item.title.toLowerCase().trim(), item.article);
        }
      });
    }

    roadmap.modules = await Promise.all(
      roadmap.modules.map(async (module) => {
        let video = null;
        try {
          video = await searchVideo(module.title);
        } catch (err) {
          console.error("Video search error:", err.message);
        }

        return {
          ...module,
          youtube: video?.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(module.title + " tutorial")}`,
          article:
            docsMap.get(module.title.toLowerCase().trim()) ||
            `https://developer.mozilla.org/`,
        };
      })
    );

    return roadmap;
  } catch (error) {
    console.error("Resource Agent Error:", error);
    return roadmap;
  }
};

export default resourceAgent;
