import searchVideo from "../config/youtube.js";

// ---------------------------------------------------------------------------
// Attaches learning links to every roadmap module:
//   - youtube: best tutorial from the YouTube Data API (or a YouTube search link)
//   - article: a search for the topic's official documentation
//
// The LLM is NOT asked for documentation URLs any more: models invent
// plausible-looking links that can be broken. A search link is always valid,
// and this removes one LLM call per roadmap.
// ---------------------------------------------------------------------------

const docsSearchLink = (topic) =>
  `https://www.google.com/search?q=${encodeURIComponent(`${topic} official documentation`)}`;

const youtubeSearchLink = (topic) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${topic} tutorial`)}`;

export const resourceAgent = async (roadmap) => {
  try {
    if (!roadmap || !roadmap.modules || roadmap.modules.length === 0) {
      return roadmap;
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
          youtube: video?.url || youtubeSearchLink(module.title),
          article: docsSearchLink(module.title),
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
