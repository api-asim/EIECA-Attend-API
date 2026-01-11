import express from "express";
import authMiddleware from '../Middelware/authMiddelware.js';
import { addLeave , getLeave , getLeaves , getLeaveDetail , updateLeave} from "../control/leaveController.js";

const router = express.Router();

router.post('/api/leave/add', authMiddleware() , addLeave);
router.get('/api/leave/:id', authMiddleware() , getLeave); 
router.get('/api/leave' , authMiddleware() , getLeaves);
router.get('/api/leave/detail/:id', authMiddleware() , getLeaveDetail);
router.put('/api/leave/:id', authMiddleware() , updateLeave);

export default router;