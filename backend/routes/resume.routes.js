import express from "express";
import {
  uploadResume,
  getResume,
} from "../controllers/resume.controller.js";
import { isAuth } from "../middleware/isAuth.js";
import { upload } from "../middleware/multer.js";

const router = express.Router();

router.post("/upload", isAuth, upload.single("resume"), uploadResume);
router.get("/get-resume", isAuth, getResume);

export default router;
