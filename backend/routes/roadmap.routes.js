import express from "express";
import {
  generateRoadmap,
  getAllRoadmap,
  getRoadmapbyId,
} from "../controllers/roadmap.controller.js";
import { isAuth } from "../middleware/isAuth.js";

const router = express.Router();

router.post("/generate", isAuth, generateRoadmap);
router.get("/all", isAuth, getAllRoadmap);
router.get("/:id", isAuth, getRoadmapbyId);

export default router;
