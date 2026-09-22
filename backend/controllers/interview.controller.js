import Interview from "../models/interview.model.js";
import { interviewAgent } from "../agents/interview.agent.js";
import { feedbackAgent } from "../agents/feedback.agent.js";
import { summaryAgent } from "../agents/summary.agent.js";

export const startInterview = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, role, useResume = false, resume = {} } = req.body;

    if (!type || !role) {
      return res.status(400).json({
        success: false,
        message: "Interview type and role are required",
      });
    }

    // Call interviewAgent directly (No LangGraph, no state machine)
    const questions = await interviewAgent({
      role,
      type,
      useResume,
      resume,
    });

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate interview questions",
      });
    }

    const interview = await Interview.create({
      userId,
      type,
      role,
      useResume,
      questions,
      currentQuestion: 0,
      status: "in-progress",
    });

    return res.status(200).json({
      success: true,
      interviewId: interview._id,
      currentQuestion: 0,
      totalQuestions: interview.questions.length,
      question: interview.questions[0],
    });
  } catch (error) {
    console.error("Start Interview Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const submitAnswer = async (req, res) => {
  try {
    const userId = req.user._id;
    const { interviewId, answer } = req.body;

    if (!interviewId || answer === undefined) {
      return res.status(400).json({
        success: false,
        message: "Interview Id and Answer are required",
      });
    }

    const interview = await Interview.findOne({
      _id: interviewId,
      userId,
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    if (interview.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Interview already completed",
      });
    }

    const index = interview.currentQuestion;
    const currentQuestion = interview.questions[index];

    if (!currentQuestion) {
      return res.status(400).json({
        success: false,
        message: "Invalid question index",
      });
    }

    currentQuestion.userAnswer = answer;

    const completed = interview.currentQuestion + 1 >= interview.questions.length;

    // Call feedbackAgent directly (No LangGraph)
    const feedback = await feedbackAgent({
      question: currentQuestion.question,
      answer,
      difficulty: currentQuestion.difficulty,
    });

    currentQuestion.feedback = feedback;
    interview.currentQuestion++;

    if (completed) {
      // Call summaryAgent directly
      const report = await summaryAgent({
        role: interview.role,
        type: interview.type,
        questions: interview.questions,
      });

      interview.status = "completed";
      interview.overallScore = report.overallScore || 0;
      interview.summary = report.summary || "";
      interview.strengths = report.strengths || [];
      interview.weaknesses = report.weaknesses || [];
      interview.recommendations = report.recommendations || [];

      await interview.save();

      return res.status(200).json({
        success: true,
        completed: true,
        interview,
        feedback,
      });
    }

    await interview.save();

    return res.status(200).json({
      success: true,
      completed: false,
      currentQuestion: interview.currentQuestion,
      question: interview.questions[interview.currentQuestion],
      feedback,
    });
  } catch (error) {
    console.error("Submit Answer Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getInterview = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const interview = await Interview.findOne({
      _id: id,
      userId,
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    return res.status(200).json({
      success: true,
      interview,
    });
  } catch (error) {
    console.error("Get Interview Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllInterviews = async (req, res) => {
  try {
    const userId = req.user._id;

    // Directly query MongoDB (Zero Redis)
    const interviews = await Interview.find({ userId }).sort({ createdAt: -1 });

    const completed = interviews.filter((item) => item.status === "completed");
    const totalQuestions = interviews.reduce((sum, item) => sum + item.questions.length, 0);

    const averageScore =
      completed.length > 0
        ? Number(
            (completed.reduce((sum, item) => sum + item.overallScore, 0) / completed.length).toFixed(1)
          )
        : 0;

    const stats = {
      totalInterviews: interviews.length,
      totalQuestions,
      completed: completed.length,
      averageScore,
    };

    const getAverageData = (list) => {
      if (!list.length) {
        return [
          { skill: "Correctness", score: 0 },
          { skill: "Clarity", score: 0 },
          { skill: "Relevance", score: 0 },
          { skill: "Detail", score: 0 },
          { skill: "Efficiency", score: 0 },
          { skill: "Communication", score: 0 },
          { skill: "Problem solving", score: 0 },
          { skill: "Creativity", score: 0 },
        ];
      }

      const total = {
        correctness: 0,
        clarity: 0,
        relevance: 0,
        detail: 0,
        efficiency: 0,
        communication: 0,
        problemSolving: 0,
        creativity: 0,
      };

      list.forEach((interview) => {
        interview.questions.forEach((q) => {
          total.correctness += q.feedback?.correctness || 0;
          total.clarity += q.feedback?.clarity || 0;
          total.relevance += q.feedback?.relevance || 0;
          total.detail += q.feedback?.detail || 0;
          total.efficiency += q.feedback?.efficiency || 0;
          total.communication += q.feedback?.communication || 0;
          total.problemSolving += q.feedback?.problemSolving || 0;
          total.creativity += q.feedback?.creativity || 0;
        });
      });

      const count = list.reduce((sum, item) => sum + item.questions.length, 0);

      if (count === 0) {
        return [
          { skill: "Correctness", score: 0 },
          { skill: "Clarity", score: 0 },
          { skill: "Relevance", score: 0 },
          { skill: "Detail", score: 0 },
          { skill: "Efficiency", score: 0 },
          { skill: "Communication", score: 0 },
          { skill: "Problem solving", score: 0 },
          { skill: "Creativity", score: 0 },
        ];
      }

      return [
        { skill: "Correctness", score: Math.round(total.correctness / count) },
        { skill: "Clarity", score: Math.round(total.clarity / count) },
        { skill: "Relevance", score: Math.round(total.relevance / count) },
        { skill: "Detail", score: Math.round(total.detail / count) },
        { skill: "Efficiency", score: Math.round(total.efficiency / count) },
        { skill: "Communication", score: Math.round(total.communication / count) },
        { skill: "Problem solving", score: Math.round(total.problemSolving / count) },
        { skill: "Creativity", score: Math.round(total.creativity / count) },
      ];
    };

    const technicalInterviews = completed.filter((item) => item.type === "technical");
    const HrInterviews = completed.filter((item) => item.type === "hr");

    const technicalData = getAverageData(technicalInterviews);
    const hrData = getAverageData(HrInterviews);

    const technicalCount = technicalInterviews.length;
    const hrCount = HrInterviews.length;

    const payload = {
      success: true,
      interviews,
      stats,
      technicalData,
      hrData,
      technicalCount,
      hrCount,
    };

    return res.status(200).json(payload);
  } catch (error) {
    console.error("Get All Interviews Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
