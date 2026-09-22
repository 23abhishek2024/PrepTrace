import Roadmap from "../models/roadmap.model.js";
import { roadmapAgent } from "../agents/roadmap.agent.js";
import { resourceAgent } from "../agents/resource.agent.js";

export const generateRoadmap = async (req, res) => {
  try {
    const { role, targetPackage, useResume = false, resume } = req.body;
    const userId = req.user._id;

    if (!role || !targetPackage) {
      return res.status(400).json({
        success: false,
        message: "Role and Target Package are required.",
      });
    }

    if (useResume && !resume) {
      return res.status(400).json({
        success: false,
        message: "Resume data is required when useResume is true.",
      });
    }

    // 1. Generate roadmap milestones
    const generatedRoadmap = await roadmapAgent({
      role,
      targetPackage,
      useResume,
      resume,
    });

    // 2. Attach documentation and YouTube video tutorials
    const enrichedRoadmap = await resourceAgent(generatedRoadmap);

    // 3. Save directly to MongoDB (Zero Redis)
    const roadmap = await Roadmap.create({
      userId,
      ...enrichedRoadmap,
    });

    return res.status(201).json({
      success: true,
      message: "Roadmap generated successfully.",
      data: roadmap,
    });
  } catch (error) {
    console.error("Generate Roadmap Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllRoadmap = async (req, res) => {
  try {
    const userId = req.user._id;

    // Directly query MongoDB (Zero Redis)
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
