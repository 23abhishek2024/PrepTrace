import mongoose from "mongoose";

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    extractedText: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    summary: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    education: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    skills: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    projects: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    experience: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    strengths: {
      type: [String],
      default: [],
    },
    weaknesses: {
      type: [String],
      default: [],
    },
    missingSkills: {
      type: [String],
      default: [],
    },
    suggestedRole: {
      type: String,
      default: "",
    },
    recommendations: {
      type: [String],
      default: [],
    },
    // Rubric breakdown behind `score` (computed in utils/atsScore.js)
    scoreBreakdown: {
      type: [
        {
          _id: false,
          key: String,
          label: String,
          weight: Number,
          score: Number, // 0-10
          evidence: String,
          source: { type: String, enum: ["llm", "computed"] },
        },
      ],
      default: [],
    },
    // Optional job description the resume was scored against
    jobDescription: {
      type: String,
      default: "",
    },
    jdMatch: {
      type: {
        _id: false,
        matched: [String], // required skills found
        missing: [String], // required skills missing
        coverage: Number, // percent of required skills found
        preferredMatched: [String], // nice-to-have skills found
        preferredMissing: [String], // nice-to-have skills missing
        preferredCoverage: Number, // percent, or null when the JD lists none
      },
      default: null,
    },
    // True when instruction-like text (possible prompt injection) was found
    injectionFlag: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Resume = mongoose.model("Resume", resumeSchema);
export default Resume;
