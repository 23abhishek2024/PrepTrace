import express from "express";
import {
  register,
  login,
  logout,
  useInterviewCoins,
} from "../controllers/auth.controller.js";
import { isAuth } from "../middleware/isAuth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/logout", logout);
router.post("/use-coins", isAuth, useInterviewCoins);

export default router;
