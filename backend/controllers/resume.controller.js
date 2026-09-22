import fs from "fs";
import { resumeAgent } from "../agents/resume.agent.js";
import extractText from "../config/pdf.js";
import Resume from "../models/resume.model.js";

const toStringArray = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) =>
    typeof item === "string"
      ? item
      : item?.title || item?.name || JSON.stringify(item)
  );
};

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

    // 1. Extract text from PDF
    const resumeText = await extractText(file.path);

    // 2. Send to AI Agent for ATS analysis
    const aiResponse = await resumeAgent(resumeText);

    // 3. Clean and parse JSON safely
    let cleaned = aiResponse.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
    }
    const resumeData = JSON.parse(cleaned);

    // 4. Normalize arrays that must be strings for UI tags
    if (resumeData.strengths) resumeData.strengths = toStringArray(resumeData.strengths);
    if (resumeData.weaknesses) resumeData.weaknesses = toStringArray(resumeData.weaknesses);
    if (resumeData.missingSkills) resumeData.missingSkills = toStringArray(resumeData.missingSkills);
    if (resumeData.recommendations) resumeData.recommendations = toStringArray(resumeData.recommendations);
    if (resumeData.skills) resumeData.skills = toStringArray(resumeData.skills);

    // 5. Save/Update in MongoDB directly (Zero Redis)
    const resume = await Resume.findOneAndUpdate(
      { userId },
      {
        userId,
        extractedText: resumeText,
        ...resumeData,
      },
      { upsert: true, new: true }
    );

    // 6. Clean up temporary uploaded file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return res.status(200).json({
      success: true,
      message: "Resume analyzed successfully",
      data: resume,
    });
  } catch (error) {
    console.error("Resume Upload Error:", error);
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to analyze resume",
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
