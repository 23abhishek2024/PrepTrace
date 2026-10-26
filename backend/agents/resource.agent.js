import invokeJSON from "../utils/llmJson.js";
import { resourceDocsSchema } from "../schemas/llm.schemas.js";
import searchVideo from "../config/youtube.js";

const RESOURCE_SYSTEM_PROMPT = `
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
`;

export const resourceAgent = async (roadmap) => {
  try {
    if (!roadmap || !roadmap.modules || roadmap.modules.length === 0) {
      return roadmap;
    }

    const moduleTitles = roadmap.modules
      .map((module) => module.title)
      .join("\n");

    // Validated output; invalid items are dropped by the schema.
    // If the call fails completely, every module falls back to the defaults below.
    let docs = [];
    try {
      docs = await invokeJSON({
        task: "roadmap-resources",
        system: RESOURCE_SYSTEM_PROMPT,
        user: `Modules:\n${moduleTitles}`,
        schema: resourceDocsSchema,
      });
    } catch (error) {
      console.warn("[roadmap-resources] falling back to default links:", error.message);
      docs = [];
    }

    const docsMap = new Map();
    docs.forEach((item) => {
      docsMap.set(item.title.toLowerCase().trim(), item.article);
    });

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
