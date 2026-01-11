import express from "express";
import authMiddleware from "../Middelware/authMiddelware.js";
import {
    upload, 
    addEmployee, 
    getEmployees, 
    getEmployee, 
    updatedEmployee, 
    fetchEmpolyeeById, 
    getMyProfile, 
    getAdmins, 
    getAdminDetails
} from '../control/employeeController.js';

const router = express.Router();

// --- 1. المسارات الثابتة (يجب أن تكون في الأعلى) ---
router.get('/api/employee/my-profile', authMiddleware(), getMyProfile);
router.get('/api/admins', authMiddleware(), getAdmins);

// --- 2. عمليات الإضافة والعرض العام ---
router.get('/api/employee', authMiddleware(), getEmployees);
router.post('/api/employee/add', authMiddleware(), upload.single('profileImage'), addEmployee);

// --- 3. المسارات التي تحتوي على متغيرات (:id) تضعها في الأسفل ---
router.get('/api/admins/:id', authMiddleware(), getAdminDetails);
router.get('/api/employee/department/:id', authMiddleware(), fetchEmpolyeeById);
router.get('/api/employee/:id', authMiddleware(), getEmployee); // هذا المسار كان يبتلع طلب profile/
router.put('/api/employee/:id', authMiddleware(), upload.single('profileImage'), updatedEmployee);

export default router;