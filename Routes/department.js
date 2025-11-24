import express from "express";
import authMiddleware from "../Middelware/authMiddelware.js";
import { addDepartment , getDepartments , getDepartment , updatedDepartment , deleDepartment} from "../control/departmentController.js";

const router = express.Router();

router.get('/api/department', authMiddleware , getDepartments);
router.post('/api/department/add', authMiddleware , addDepartment);
router.get('/api/department/:id', authMiddleware , getDepartment);
router.put('/api/department/:id', authMiddleware , updatedDepartment);
router.delete('/api/department/:id', authMiddleware , deleDepartment);



export default router;