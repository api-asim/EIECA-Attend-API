import express from "express";
import authMiddleware from '../Middelware/authMiddelware.js';


import { checkIn ,checkOut , getEmployeeMonthlyReport , getAllEmployeesMonthlyReport , getAttendanceArchive , getEmployeeTodayStatus , getIndividualEmployeeReportForAdmin } from "../control/attendanceController.js";

const router = express.Router();

router.post('/check-in', authMiddleware(), checkIn);
router.post('/check-out', authMiddleware(), checkOut);

router.get('/report/my/:year/:month', authMiddleware() , getEmployeeMonthlyReport);
router.get('/report/all/:year/:month', authMiddleware(), getAllEmployeesMonthlyReport);

router.get('/report/individual/:employeeId/:year/:month', authMiddleware(), getIndividualEmployeeReportForAdmin);

router.get('/archive/:role', authMiddleware(), getAttendanceArchive);
router.get('/today-status', authMiddleware(), getEmployeeTodayStatus);


export default router;