import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import Leave from "../models/Leave.js";
import OfficialHoliday from "../models/OfficialHoliday.js";
import mongoose from "mongoose";
import moment from "moment-timezone";

const OFFICIAL_START_HOUR = 9; 
const OFFICIAL_END_HOUR = 17; 
const LATE_CHECK_IN_CUTOFF = 11; 
const DAILY_REQUIRED_HOURS = 8;
const WEEKEND_DAY = 5; 
const LOCAL_TIMEZONE = 'Africa/Cairo';

const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const getMonthDateRange = (year, month) => {
    const startOfMonth = moment.tz({ year, month: month - 1, day: 1 }, LOCAL_TIMEZONE).startOf('month').toDate();
    const endOfMonth = moment.tz({ year, month: month - 1, day: 1 }, LOCAL_TIMEZONE).endOf('month').toDate();
    return { startOfMonth, endOfMonth }; 
};

const formatAttendanceRecordForDisplay = (record) => {
    if (!record) return null;
    const recordObject = record.toObject();

    const displayDate = moment(recordObject.date).tz(LOCAL_TIMEZONE).format('YYYY-MM-DD'); 
    const displayCheckInTime = moment(recordObject.checkInTime).tz(LOCAL_TIMEZONE).format('HH:mm:ss'); 
    let displayCheckOutTime = recordObject.checkOutTime 
        ? moment(recordObject.checkOutTime).tz(LOCAL_TIMEZONE).format('HH:mm:ss')
        : 'N/A';
    return {
        ...recordObject, 
        date: displayDate, 
        checkIn: displayCheckInTime, 
        checkOut: displayCheckOutTime,
    };
};


const generateMonthlyReport = async (employeeId, year, month, isIndividualReport) => {
    const { startOfMonth, endOfMonth } = getMonthDateRange(year, month);
    const monthNameArabic = arabicMonths[month - 1];
    
    const holidays = await OfficialHoliday.find({
        date: { $gte: startOfMonth, $lte: endOfMonth }
    });
    const holidayDates = holidays.map(h => moment(h.date).tz(LOCAL_TIMEZONE).format('YYYY-MM-DD'));
    const numDaysInMonth = moment(startOfMonth).tz(LOCAL_TIMEZONE).daysInMonth();
    let totalRequiredWorkDays = 0;
    
    for (let day = 1; day <= numDaysInMonth; day++) {
        const currentDay = moment.tz({ year, month: month - 1, day }, LOCAL_TIMEZONE).startOf('day');
        const dateStr = currentDay.format('YYYY-MM-DD');
        const dayOfWeek = currentDay.isoWeekday();
        
        if (dayOfWeek !== WEEKEND_DAY && !holidayDates.includes(dateStr)) {
            totalRequiredWorkDays++;
        }
    }
    
    const totalRequiredHours = totalRequiredWorkDays * DAILY_REQUIRED_HOURS;
    
    const employeeQuery = isIndividualReport ? { employeeId: new mongoose.Types.ObjectId(employeeId) } : {};
    
    let attendanceRecords = await Attendance.find({
        ...employeeQuery,
        date: { $gte: startOfMonth, $lte: endOfMonth } 
    })
    .select('employeeId checkInTime checkOutTime workDuration status date')
    .populate({
        path: 'employeeId',
        select: 'employeeId department userId',
        populate: [
            { path: 'department', select: 'dep_name' },
            { path: 'userId', select: 'name role' } // أضفنا role للتأكد
        ]
    });

    let leaveRecords = await Leave.find({
        ...employeeQuery,
        status: 'Approved',
        $or: [
            { startDate: { $lte: endOfMonth } },
            { endDate: { $gte: startOfMonth } }
        ]
    }).select('employeeId startDate endDate leaveType');

    const employeeMap = new Map();
    const allEmployeeIds = new Set();
    
    // التعديل الجوهري هنا لاستثناء الأدمين من قائمة التقرير العام
    if (!isIndividualReport) {
        const allEmployees = await Employee.find().select('employeeId department userId')
           .populate({ 
               path: 'userId', 
               select: 'name role',
               match: { role: { $ne: 'admin' } } // فلتر لاستثناء الـ admin
           })
           .populate({ path: 'department', select: 'dep_name' });
        
        allEmployees.forEach(emp => {
            // لا نضيف الموظف للقائمة إلا إذا كان userId موجود (يعني ليس admin)
            if (emp.userId) {
                allEmployeeIds.add(emp._id.toString());
            }
        });
    } else {
        // في حالة التقرير الفردي، نضيف المعرف الممرر فقط
        allEmployeeIds.add(employeeId.toString());
    }

    allEmployeeIds.forEach(id => {
        // محاولة إيجاد بيانات الموظف من سجلات الحضور أو الإجازات أو البحث المباشر
        const empData = attendanceRecords.find(a => a.employeeId && a.employeeId._id.toString() === id)?.employeeId 
                      || null;

        if (!employeeMap.has(id)) {
            employeeMap.set(id, {
                employeeId: id,
                name: 'N/A', // سيتم تحديثه لاحقاً
                employeeID_Number: 'N/A',
                department: 'N/A',
                presentDays: 0,
                totalLeaveDays: 0,
                absenceDays: 0,
                totalWorkDurationHours: 0,
                dailyAttendance: [],
                leaves: [],
                requiredHours: totalRequiredHours,
                overtimeHours: 0,
                shortfallHours: 0,
            });
        }
    });

    // جلب بيانات الموظفين المتبقين بدقة (الاسم والقسم)
    const detailedEmployees = await Employee.find({ _id: { $in: Array.from(allEmployeeIds) } })
        .populate('userId', 'name')
        .populate('department', 'dep_name');

    detailedEmployees.forEach(emp => {
        if (employeeMap.has(emp._id.toString())) {
            const entry = employeeMap.get(emp._id.toString());
            entry.name = emp.userId?.name || 'N/A';
            entry.employeeID_Number = emp.employeeId || 'N/A';
            entry.department = emp.department?.dep_name || 'N/A';
        }
    });

    const reportData = Array.from(employeeMap.values());
    for (const report of reportData) {
        const targetEmployeeId = report.employeeId.toString();
        const empAttendance = attendanceRecords.filter(a => a.employeeId && a.employeeId._id.toString() === targetEmployeeId);
        
        report.presentDays = empAttendance.length;
        const totalMinutes = empAttendance.reduce((sum, r) => sum + (r.workDuration || 0), 0);
        report.totalWorkDurationHours = (totalMinutes / 60).toFixed(2);
        
        const actualHours = parseFloat(report.totalWorkDurationHours);
        
        if (actualHours > totalRequiredHours) {
            report.overtimeHours = (actualHours - totalRequiredHours).toFixed(2);
            report.shortfallHours = 0;
        } else {
            report.overtimeHours = 0;
            report.shortfallHours = (totalRequiredHours - actualHours).toFixed(2);
        }
        
        const empLeaves = leaveRecords.filter(l => l.employeeId.toString() === targetEmployeeId);
        const coveredDays = new Set(empAttendance.map(a => moment(a.date).tz(LOCAL_TIMEZONE).format('YYYY-MM-DD'))); 
        
        let calculatedLeaveDays = 0;
        empLeaves.forEach(leave => {
            let start = moment(leave.startDate).tz(LOCAL_TIMEZONE).startOf('day');
            let end = moment(leave.endDate).tz(LOCAL_TIMEZONE).startOf('day');
            
            if (start.isBefore(moment(startOfMonth).tz(LOCAL_TIMEZONE).startOf('day'))) start = moment(startOfMonth).tz(LOCAL_TIMEZONE).startOf('day');
            if (end.isAfter(moment(endOfMonth).tz(LOCAL_TIMEZONE).startOf('day'))) end = moment(endOfMonth).tz(LOCAL_TIMEZONE).startOf('day');

            report.leaves.push({
                type: leave.leaveType,
                start: start.format('YYYY-MM-DD'),
                end: end.format('YYYY-MM-DD')
            });

            for (let d = start.clone(); d.isSameOrBefore(end); d.add(1, 'days')) {
                const dateStr = d.format('YYYY-MM-DD');
                if (d.isoWeekday() !== WEEKEND_DAY && !holidayDates.includes(dateStr)) { 
                    if (!coveredDays.has(dateStr)) {
                        coveredDays.add(dateStr);
                        calculatedLeaveDays++;
                    }
                }
            }
        });
        
        report.totalLeaveDays = calculatedLeaveDays;
        let absenceCount = 0;
        
        for (let day = 1; day <= numDaysInMonth; day++) {
            const currentDay = moment.tz({ year, month: month - 1, day }, LOCAL_TIMEZONE).startOf('day');
            const dateStr = currentDay.format('YYYY-MM-DD');
            const dayOfWeek = currentDay.isoWeekday(); 
            
            if (dayOfWeek === WEEKEND_DAY || holidayDates.includes(dateStr)) continue;

            if (!coveredDays.has(dateStr)) {
                absenceCount++;
            }
        }
        report.absenceDays = absenceCount;
        report.dailyAttendance = empAttendance.map(a => formatAttendanceRecordForDisplay(a));
    }
    
    if (isIndividualReport) {
        return { 
            report: {
                ...reportData[0],
                monthName: monthNameArabic,
                year: year
            }
        };
    }
    
    return { 
        reports: reportData,
        monthName: monthNameArabic,
        year: year
    };
};

const getEmployeeMonthlyReport = async (req, res) => {
    try {
        const userId = req.user._id.toString(); 
        if (req.user.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: "لا تحتوي حسابات المسؤول على تقارير شهرية شخصية."
            });
        }
        const { year, month } = req.params; 
        const employee = await Employee.findOne({ userId: userId });
        if (!employee) {
            return res.status(404).json({ success: false, message: "لم يتم العثور على سجل الموظف." });
        }
        const result = await generateMonthlyReport(employee._id, parseInt(year), parseInt(month), true)
        if (result.error) {
            return res.status(404).json({ success: false, message: result.error });
        } 
        return res.status(200).json({ success: true, report: result.report });
    } 
    catch (err) {
        console.error("حدث خطأ أثناء جلب التقرير الشهري للموظف:", err.message);
        return res.status(500).json({ success: false, error: "خطأ في الخادم أثناء استرجاع التقريرl." });
    }
};

const getAllEmployeesMonthlyReport = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
             return res.status(403).json({ success: false, message: "تم رفض الوصول. مطلوب امتيازات المسؤول." });
        }
        
        const { year, month } = req.params;
        
        const reportData = await generateMonthlyReport(null, parseInt(year), parseInt(month), false);
        
        return res.status(200).json({ success: true, reports: reportData });

    } catch (err) {
        console.error("خطأ في التقرير الشهري للمسؤول:", err.message);
        return res.status(500).json({ success: false, error: "حدث خطأ في الخادم أثناء إنشاء تقرير لجميع الموظفين." });
    }
};

const getAttendanceArchive = async (req, res) => {
    try {
        const role = req.params.role;
        let matchQuery = {};
        
        if (role === 'employee') {
            const employee = await Employee.findOne({ userId: req.user._id.toString() });
            if (!employee) {
                return res.status(404).json({ success: false, message: "لم يتم العثور على سجل الموظف." });
            }
            matchQuery.employeeId = employee._id;
        }

        const archiveData = await Attendance.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: {
                        year: { $year: "$date" },
                        month: { $month: "$date" }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    year: "$_id.year",
                    month: "$_id.month",
                }
            },
            { $sort: { year: -1, month: -1 } }
        ]);

        return res.status(200).json({ success: true, archive: archiveData });

    } catch (err) {
        console.error("خطأ في استرجاع الأرشيف:", err.message);
        return res.status(500).json({ success: false, error: "خطأ في الخادم أثناء استرداد الأرشيف." });
    }
};

const getIndividualEmployeeReportForAdmin = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "تم رفض الوصول. مطلوب امتيازات المسؤول." });
        }
        const { employeeId, year, month } = req.params; 
        if (!mongoose.Types.ObjectId.isValid(employeeId)) {
            return res.status(400).json({ success: false, message: "تنسيق معرف الموظف غير صالح." });
        }
        const result = await generateMonthlyReport(employeeId, parseInt(year), parseInt(month), true);
        if (!result.report) {
             return res.status(404).json({ success: false, message: "لم يتم العثور على بيانات التقرير لهذا الموظف وهذا الشهر." });
        }
        return res.status(200).json({ success: true, report: result.report });
    } catch (err) {
        console.error("خطأ في جلب تقرير فردي من قبل المسؤول:", err.message);
        return res.status(500).json({ success: false, error: "خطأ في الخادم أثناء استرداد التقرير للموظف." });
    }
};


const getEmployeeTodayStatus = async (req, res) => {
    try {
        const userId = req.user._id;
        if (req.user.role === 'admin') {
            return res.status(200).json({
                success: true,
                isCheckedIn: false,
                message: "لا يقوم مستخدمو الإدارة بتتبع الحضور اليومي."
            });
        }
        
        const employee = await Employee.findOne({ userId: userId.toString() });
        if (!employee) {
            return res.status(404).json({ success: false, message: "لم يتم العثور على سجل الموظف." });
        }
        
        const now = new Date(); 
        const localMoment = moment(now).tz(LOCAL_TIMEZONE).startOf('day');
        const todayStartLocal = localMoment.toDate(); 

        const attendanceRecord = await Attendance.findOne({
            employeeId: employee._id, 
            date: todayStartLocal,
            checkOutTime: null,
        });

        const isCheckedIn = !!attendanceRecord;

        return res.status(200).json({
            success: true,
            isCheckedIn: isCheckedIn
        });

    } catch (error) {
        console.error("Error in getEmployeeTodayStatus:", error.message);
        return res.status(500).json({ 
            success: false, 
            message: "فشل التحقق من الحضور اليومي.",
            error: error.message 
        });
    }
};

const checkIn = async (req, res) => {
    try {
        const userId = req.user._id;
        if (req.user.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: "لا يُسمح لحسابات المسؤول بتسجيل الحضور."
            });
        }

        const employee = await Employee.findOne({ userId: userId.toString() });
        if (!employee) {
            return res.status(404).json({ success: false, message: "لم يتم العثور على سجل الموظف." });
        }

        const checkInTime = new Date(); 
        const localMoment = moment(checkInTime).tz(LOCAL_TIMEZONE);
        const todayStartLocal = localMoment.clone().startOf('day').toDate(); 

        const localCheckInHour = localMoment.hours();

        if (localCheckInHour >= LATE_CHECK_IN_CUTOFF) {
            return res.status(403).json({ 
                success: false, 
                message: "فشل تسجيل الدخول: لا يُمكن تسجيل الحضور بعد الساعة ١١:٠٠ صباحًا. سيُسجّل هذا اليوم كغياب." 
            });
        }

        const existingAttendance = await Attendance.findOne({
            employeeId: employee._id, 
            date: todayStartLocal,
            checkOutTime: null
        });

        if (existingAttendance) {
            return res.status(400).json({ success: false, message: "لقد قمت بتسجيل الدخول اليوم ولم تقم بتسجيل الخروج بعد." });
        }
        
        let status = 'Present'; 
        if (localCheckInHour > OFFICIAL_START_HOUR || (localCheckInHour === OFFICIAL_START_HOUR && localMoment.minutes() > 0)) {
            status = 'Tardy';
        }

        const newAttendance = new Attendance({
            employeeId: employee._id,
            checkInTime: checkInTime, 
            date: todayStartLocal,
            status: status
        });

        await newAttendance.save();
        return res.status(200).json({ success: true, message: "تم تسجيل الحضور بنجاح.", attendance: newAttendance });

    } catch (err) {
        console.error("Check-in error:", err.message);
        return res.status(500).json({ success: false, error: "خطأ في الخادم أثناء تسجيل الوصول." });
    }
};

const checkOut = async (req, res) => {
    try {
        const userId = req.user._id;
        if (req.user.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: "لا يُسمح لحسابات المسؤول بالخروج."
            });
        }

        const employee = await Employee.findOne({ userId: userId.toString() });
        if (!employee) {
            return res.status(404).json({ success: false, message: "لم يتم العثور على سجل الموظف." });
        }
        
        const checkOutTime = new Date();
        const localMoment = moment(checkOutTime).tz(LOCAL_TIMEZONE).startOf('day');
        const todayStartLocal = localMoment.toDate(); 

        const attendanceRecord = await Attendance.findOne({
            employeeId: employee._id,
            date: todayStartLocal, 
            checkOutTime: null 
        });

        if (!attendanceRecord) {
            return res.status(404).json({ success: false, message: "لم يتم العثور على سجل تسجيل وصول نشط لهذا اليوم." });
        }
        
        const durationMs = checkOutTime.getTime() - attendanceRecord.checkInTime.getTime();
        const durationMinutes = Math.round(durationMs / (1000 * 60));

        attendanceRecord.checkOutTime = checkOutTime;
        attendanceRecord.workDuration = durationMinutes;
        const localCheckOutHour = moment(checkOutTime).tz(LOCAL_TIMEZONE).hours();
        
        if (attendanceRecord.status !== 'Tardy') {
            if (localCheckOutHour < OFFICIAL_END_HOUR) {
                attendanceRecord.status = 'Early Out';
            } else {
                attendanceRecord.status = 'Full Day';
            }
        }
        
        await attendanceRecord.save();
        
        return res.status(200).json({ 
            success: true, 
            message: "Check-out successful.", 
            workDurationMinutes: durationMinutes 
        });

    } catch (err) {
        console.error("Check-out error:", err.message);
        return res.status(500).json({ success: false, error: "Server error during check-out." });
    }
};

export { 
    checkIn, 
    checkOut, 
    getEmployeeMonthlyReport, 
    getAllEmployeesMonthlyReport,
    getIndividualEmployeeReportForAdmin,
    getAttendanceArchive ,
    getEmployeeTodayStatus
};