import express from "express";
import authMiddleware from '../Middelware/authMiddelware.js';
import { getSummary } from "../control/dashboardController.js";

const router = express.Router();

router.get('/summary' , authMiddleware(), getSummary)
export default router