import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const BASE_URL = "https://www.googleapis.com/youtube/v3/search";

const searchVideo = async (topic) => {
  try {
    if (process.env.YOUTUBE_API_KEY) {
      const { data } = await axios.get(BASE_URL, {
        params: {
          key: process.env.YOUTUBE_API_KEY,
          part: "snippet",
          q: `${topic} tutorial`,
          maxResults: 1,
          type: "video",
        },
      });

      if (data?.items?.length > 0) {
        const video = data.items[0];
        return {
          title: video.snippet.title,
          channel: video.snippet.channelTitle,
          url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
        };
      }
    }

    // Graceful fallback: direct YouTube search URL
    return {
      title: `${topic} Tutorial`,
      channel: "YouTube",
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(
        topic + " tutorial"
      )}`,
    };
  } catch (error) {
    return {
      title: `${topic} Tutorial`,
      channel: "YouTube",
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(
        topic + " tutorial"
      )}`,
    };
  }
};

export default searchVideo;
