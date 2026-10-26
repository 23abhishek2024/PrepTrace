import express from "express";
import {
  startInterview,
  submitAnswer,
  endInterview,
  getAllInterviews,
  getInterview,
} from "../controllers/interview.controller.js";
import { isAuth } from "../middleware/isAuth.js";

const router = express.Router();

router.post("/start", isAuth, startInterview);
router.post("/answer", isAuth, submitAnswer);
router.post("/end", isAuth, endInterview); // end early: report for answered questions only
router.get("/all", isAuth, getAllInterviews);
router.get("/:id", isAuth, getInterview);

export default router;
