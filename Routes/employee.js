import express from "express";
import authMiddleware from "../Middelware/authMiddelware.js";
import {upload , addEmployee, getEmployees, getEmployee , updatedEmployee , fetchEmpolyeeById, getMyProfile, getAdmins, getAdminDetails} from '../control/employeeController.js'

const router = express.Router();

router.get('/api/employee', authMiddleware , getEmployees);
router.post('/api/employee/add', authMiddleware , upload.single('profileImage') , addEmployee);

router.get('/api/employee/:id', authMiddleware , getEmployee);
router.get('/api/employee/my-profile', authMiddleware , getMyProfile);

router.put('/api/employee/:id', authMiddleware , upload.single('profileImage') , updatedEmployee);
router.get('/api/employee/department/:id', authMiddleware , fetchEmpolyeeById);


router.get('/api/admins', authMiddleware, getAdmins);
router.get('/api/admins/:id', authMiddleware, getAdminDetails);

export default router;