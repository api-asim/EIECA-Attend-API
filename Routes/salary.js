import express from "express";
import authMiddleware from "../Middelware/authMiddelware.js";
import { addSalary, getSalary } from "../control/salaryConroller.js";

const router = express.Router();

router.post('/api/salary/add', authMiddleware() , addSalary);
router.get('/api/salary/:id', authMiddleware() , getSalary);

export default router;