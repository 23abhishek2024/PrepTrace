import Roadmap from "../models/roadmap.model.js";
import { roadmapAgent } from "../agents/roadmap.agent.js";
import { resourceAgent } from "../agents/resource.agent.js";
import Resume from "../models/resume.model.js";
import { resumeCacheTag, withCache } from "../utils/llmCache.js";
import { LLMOutputError } from "../utils/llmJson.js";

export const generateRoadmap = async (req, res) => {
  try {
    // `resume` in the request body is ignored: it is loaded from the database.
    const { role, targetPackage, useResume = false } = req.body;
    const userId = req.user._id;

    if (!role || !targetPackage) {
      return res.status(400).json({
        success: false,
        message: "Role and Target Package are required.",
      });
    }

    let resume = null;
    if (useResume) {
      resume = await Resume.findOne({ userId }).lean();
      if (!resume) {
        return res.status(400).json({
          success: false,
          message: "Please upload your resume first.",
        });
      }
    }

    // 1 + 2. Generate milestones, then attach docs and YouTube tutorials.
    // The same role + package + resume reuses the cached roadmap (no LLM calls).
    const cacheInputs = {
      role: String(role).trim().toLowerCase(),
      targetPackage: String(targetPackage).trim().toLowerCase(),
      resumeText: resume ? resume.extractedText : null,
    };
    const { value: enrichedRoadmap, cached } = await withCache(
      "roadmap",
      cacheInputs,
      async () => {
        const generatedRoadmap = await roadmapAgent({ role, targetPackage, resume });
        return resourceAgent(generatedRoadmap);
      },
      undefined, // default store (MongoDB)
      // tagged with the resume, so deleting the resume also removes this cached roadmap
      { tag: resume ? resumeCacheTag(resume.extractedText) : null }
    );

    // 3. Save to MongoDB
    const roadmap = await Roadmap.create({
      userId,
      ...enrichedRoadmap,
    });

    return res.status(201).json({
      success: true,
      message: "Roadmap generated successfully.",
      cached,
      data: roadmap,
    });
  } catch (error) {
    console.error("Generate Roadmap Error:", error);
    if (error instanceof LLMOutputError) {
      return res.status(502).json({
        success: false,
        message: "The AI returned an invalid roadmap. Please try again.",
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllRoadmap = async (req, res) => {
  try {
    const userId = req.user._id;

    const roadmaps = await Roadmap.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: roadmaps,
    });
  } catch (error) {
    console.error("Get All Roadmaps Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getRoadmapbyId = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const roadmap = await Roadmap.findOne({
      _id: id,
      userId,
    });

    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: "Roadmap not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: roadmap,
    });
  } catch (error) {
    console.error("Get Roadmap By Id Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
