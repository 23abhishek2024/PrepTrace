import { resumeAgent } from "../agents/resume.agent.js";
import extractText from "../config/pdf.js";
import Resume from "../models/resume.model.js";
import { deleteResumeCache, resumeCacheTag, withCache } from "../utils/llmCache.js";
import { LLMOutputError } from "../utils/llmJson.js";
import { LIMITS } from "../utils/promptGuard.js";

// Below this many characters the PDF is probably a scanned image.
const MIN_RESUME_TEXT = 200;

export const uploadResume = async (req, res) => {
  const file = req.file;
  try {
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Resume PDF is required",
      });
    }

    const userId = req.user._id;
    const jobDescription = String(req.body?.jobDescription || "")
      .trim()
      .slice(0, LIMITS.jobDescription);

    // 1. Extract text from the PDF (kept in memory, never written to disk)
    const resumeText = (await extractText(file.buffer)).trim();

    if (resumeText.length < MIN_RESUME_TEXT) {
      return res.status(400).json({
        success: false,
        message:
          "Could not read enough text from this PDF. If it is a scanned image, export it as a text-based PDF and try again.",
      });
    }

    // 2. ATS analysis. Identical resume + JD reuses the cached result (no LLM call).
    const { value: analysis, cached } = await withCache(
      "resume-analysis",
      { resumeText, jobDescription },
      () => resumeAgent({ resumeText, jobDescription }),
      undefined, // default store (MongoDB)
      { tag: resumeCacheTag(resumeText) } // lets "delete resume" remove this entry too
    );

    // 3. Save/update the user's resume
    const resume = await Resume.findOneAndUpdate(
      { userId },
      {
        userId,
        extractedText: resumeText,
        jobDescription,
        ...analysis,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Resume analyzed successfully",
      cached,
      data: resume,
    });
  } catch (error) {
    console.error("Resume Upload Error:", error);

    if (error instanceof LLMOutputError) {
      return res.status(502).json({
        success: false,
        message: "The AI returned an invalid analysis. Please try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to analyze resume",
    });
  }
};

// Delete the user's resume and every cached AI result built from it.
// Interviews and roadmaps the user already created are kept.
export const deleteResume = async (req, res) => {
  try {
    const userId = req.user._id;
    const resume = await Resume.findOne({ userId }).select("extractedText jobDescription").lean();

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "No resume to delete",
      });
    }

    await Resume.deleteOne({ _id: resume._id });

    // Privacy: cached analyses contain resume data, so they go too.
    // A cache failure must not undo the delete, so it is only logged.
    let removedCacheEntries = 0;
    try {
      removedCacheEntries = await deleteResumeCache(resume.extractedText, resume.jobDescription);
    } catch (error) {
      console.warn("[cache] could not delete cached results for resume:", error.message);
    }

    return res.status(200).json({
      success: true,
      message: "Resume deleted",
      removedCacheEntries,
    });
  } catch (error) {
    console.error("Delete Resume Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete resume",
    });
  }
};

export const getResume = async (req, res) => {
  try {
    const userId = req.user._id;
    const resume = await Resume.findOne({ userId });

    if (!resume) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      data: resume,
    });
  } catch (error) {
    console.error("Get Resume Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
