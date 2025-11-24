import express from "express";
import authMiddleware from '../Middelware/authMiddelware.js';
import { changePassword } from "../control/settingController.js";

const router = express.Router();

router.put('/api/setting/change-password' , authMiddleware , changePassword)


export default router