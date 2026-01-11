import express from "express";
import { 
    generateResetToken, 
    login, 
    register, 
    simpleResetPassword, 
    verify 
} from "../control/authController.js";
import authMiddelware from "../Middelware/authMiddelware.js";

const router = express.Router();

// مسارات عامة (Public)
router.post('/api/login', login);
router.post('/api/generate-reset-token', generateResetToken); 
router.patch('/api/reset-password-simple/:token', simpleResetPassword);

// مسارات محمية (Protected)
router.get('/api/verify', authMiddelware(), verify);
router.post('/api/register', authMiddelware(), register);
export default router;