import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Employee from "../models/Employee.js";

const verifyUser = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ success: false, error: "Authorization required." });
            }

            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            const user = await User.findById({ _id: decoded._id }).select('-password');
            if (!user) return res.status(404).json({ success: false, error: "User Not Found" });

            req.user = user;
            req.token = token;

            if (requiredPermission) {
                // 1. الأدمن له صلاحية مطلقة
                if (user.role === 'admin') return next();

                // 2. فحص صلاحيات المخازن الخاصة بالموظف
                if (user.role === 'employee') {
                    const employee = await Employee.findOne({ userId: user._id });
                    
                    if (employee) {
                        // إذا كان المطلوب 'inventory:read' نفحص canView
                        if (requiredPermission === 'inventory:read' && employee.inventoryPermissions?.canView) {
                            return next();
                        }
                        // إذا كان المطلوب 'inventory:write' نفحص canManage
                        if (requiredPermission === 'inventory:write' && employee.inventoryPermissions?.canManage) {
                            return next();
                        }
                    }
                }

                // 3. الفحص التقليدي (للمصفوفة القديمة إن وجدت)
                if (user.permissions && user.permissions.includes(requiredPermission)) {
                    return next();
                }

                // إذا لم يتحقق أي شرط مما سبق
                return res.status(403).json({
                    success: false,
                    error: `Access Denied: Missing required permission (${requiredPermission}).`
                });
            }
            
            next();

        } catch (err) {
            console.error("Auth Middleware Error:", err.message);
            return res.status(401).json({ success: false, error: "Invalid or Expired Token." });
        }
    }
}

export default verifyUser;