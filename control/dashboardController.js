import Department from "../models/Department.js";
import Employee from "../models/Employee.js";
import Leave from "../models/Leave.js";

const getSummary = async (req, res) => {
    try {
        const employeeStats = await Employee.aggregate([
            {
                $lookup: {
                    from: 'users', 
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            { $unwind: '$userDetails' },
            {
                $match: { 'userDetails.role': { $ne: 'admin' } }
            },
            {
                $group: {
                    _id: null,
                    totalCount: { $sum: 1 },
                    totalSalary: { $sum: '$salary' }
                }
            }
        ]);
        const { totalEmployees = 0, totalSalary = 0 } = employeeStats.length > 0 
            ? { totalEmployees: employeeStats[0].totalCount, totalSalary: employeeStats[0].totalSalary } 
            : {};

        const totalDepartments = await Department.countDocuments();

        const leaveStats = await Leave.aggregate([
            {
                $lookup: {
                    from: 'employees',
                    localField: 'employeeId',
                    foreignField: '_id',
                    as: 'employeeInfo'
                }
            },
            { $unwind: '$employeeInfo' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'employeeInfo.userId',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: '$userInfo' },
            { $match: { 'userInfo.role': { $ne: 'admin' } } }, 
            {
                $facet: {
                    totalApplied: [{ $group: { _id: '$employeeId' } }, { $count: 'count' }],
                    byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }]
                }
            }
        ]);

        const leaveSummary = {
            appliedFor: leaveStats[0].totalApplied[0]?.count || 0,
            approved: leaveStats[0].byStatus.find(i => i._id === 'Approved')?.count || 0,
            rejected: leaveStats[0].byStatus.find(i => i._id === 'Rejected')?.count || 0,
            pending: leaveStats[0].byStatus.find(i => i._id === 'Pending')?.count || 0,
        };

        return res.status(200).json({
            success: true,
            totalEmployees,
            totalDepartments,
            totalSalary,
            leaveSummary
        });

    } catch (err) {
        console.error("Dashboard summary error:", err);
        return res.status(500).json({ 
            success: false, 
            error: "حدث خطأ أثناء جلب بيانات لوحة التحكم" 
        });
    }
};

export { getSummary };