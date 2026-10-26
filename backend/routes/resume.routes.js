import express from "express";
import {
  uploadResume,
  getResume,
  deleteResume,
} from "../controllers/resume.controller.js";
import { isAuth } from "../middleware/isAuth.js";
import { upload } from "../middleware/multer.js";

const router = express.Router();

// Multer errors (file too large, not a PDF) become a clean 400 response
const handleUpload = (req, res, next) => {
  upload.single("resume")(req, res, (error) => {
    if (error) {
      const message =
        error.code === "LIMIT_FILE_SIZE" ? "Resume PDF must be 5 MB or smaller" : error.message;
      return res.status(400).json({ success: false, message });
    }
    next();
  });
};

router.post("/upload", isAuth, handleUpload, uploadResume);
router.get("/get-resume", isAuth, getResume);
router.delete("/", isAuth, deleteResume); // DELETE /api/resume

export default router;
