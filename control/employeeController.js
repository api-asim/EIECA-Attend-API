import multer from "multer";
import Employee from "../models/Employee.js";
import User from "../models/User.js";
import bcrypt from 'bcrypt';
import cloudinary from '../utils/cloudinary.js';
import mongoose from "mongoose";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// دالة مساعدة لتحويل النص (Cairo/Mansoura) إلى ObjectId من قاعدة البيانات
const getBranchIdFromName = async (branchName) => {
    if (!branchName) return null;
    // إذا كان المدخل أصلاً ObjectId صالح، نرجعه كما هو
    if (mongoose.Types.ObjectId.isValid(branchName)) {
        return branchName;
    }
    // أما إذا كان نصاً (مثل Cairo)، نبحث عن الـ ID المقابل له في جدول الـ Locations
    let searchTerm = branchName;
    if (branchName.toLowerCase() === 'cairo') searchTerm = 'القاهرة';
    if (branchName.toLowerCase() === 'mansoura') searchTerm = 'المنصورة';
    const LocationModel = mongoose.model('Location');
    const foundLocation = await LocationModel.findOne({
        name: { $regex: new RegExp(searchTerm, "i") }
    });
    return foundLocation ? foundLocation._id : null;
};


const addEmployee = async (req, res) => {
    try {
        // 1. استلام البيانات الأساسية
        const {
            name, email, employeeId, dob, gender, maritalStatus, 
            designation, department, salary, phoneNumber, password, 
            role, branch, inventoryPermissions 
        } = req.body;

        // 2. التحقق من وجود المستخدم
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ success: false, error: "المستخدم مسجل بالفعل" });

        // 3. معالجة الصلاحيات بحذر (Safe Parsing)
        let parsedPermissions = { canView: false, canManage: false, accessibleBranches: 'Cairo' };
        if (inventoryPermissions) {
            try {
                // نختبر إذا كان النص المرسل هو JSON فعلاً أم نص عادي
                parsedPermissions = typeof inventoryPermissions === 'string' 
                    ? JSON.parse(inventoryPermissions) 
                    : inventoryPermissions;
            } catch (e) {
                console.error("Permission Parsing Error:", e);
            }
        }

        // 4. معالجة الفرع
        const finalBranchId = await getBranchIdFromName(branch);

        // 5. رفع الصورة إلى Cloudinary (إذا وجدت)
        let imageUrl = '', publicId = '';
        if (req.file) {
            try {
                const uploadRes = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream(
                        { folder: "Employee Platform" }, // تأكد من اسم الفولدر
                        (err, result) => {
                            if (err) return reject(err);
                            resolve(result);
                        }
                    ).end(req.file.buffer);
                });
                imageUrl = uploadRes.secure_url;
                publicId = uploadRes.public_id;
            } catch (uploadError) {
                console.error("Cloudinary Upload Error:", uploadError);
                // يمكننا اختيار إكمال العملية بدون صورة أو التوقف هنا
            }
        }

        // 6. تشفير كلمة المرور وحفظ المستخدم
        const hashPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name, email, password: hashPassword, 
            role: role || 'employee', 
            profileImage: imageUrl, 
            profileImagePublicId: publicId,
            location: finalBranchId
        });
        const savedUser = await newUser.save();

        // 7. حفظ بيانات الموظف
        const newEmployee = new Employee({
            userId: savedUser._id,
            employeeId: employeeId || `EMP-${Date.now()}`,
            dob, gender, maritalStatus, 
            designation, department, salary, phoneNumber,
            branch: finalBranchId,
            inventoryPermissions: {
                canView: role === 'admin' ? true : parsedPermissions.canView,
                canManage: role === 'admin' ? true : parsedPermissions.canManage,
                accessibleBranches: parsedPermissions.accessibleBranches === 'Both' 
                    ? 'Both' 
                    : (await getBranchIdFromName(parsedPermissions.accessibleBranches || branch))
            }
        });

        await newEmployee.save();
        return res.status(200).json({ success: true, message: 'تمت الإضافة بنجاح مع الصورة والصلاحيات' });

    } catch (err) {
        console.error("Main Controller Error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

const updatedEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, maritalStatus, designation, department, 
            salary, phoneNumber, branch, inventoryPermissions 
        } = req.body; 

        // 1. البحث عن الموظف
        let employee = await Employee.findById(id) || await Employee.findOne({ userId: id });
        if (!employee) return res.status(404).json({ success: false, message: 'الموظف غير موجود' });

        // 2. معالجة الصلاحيات بشكل آمن (Safe Parsing)
        let parsedPermissions = employee.inventoryPermissions; // كقيمة افتراضية نبقي القديم
        if (inventoryPermissions) {
            try {
                parsedPermissions = typeof inventoryPermissions === 'string' 
                    ? JSON.parse(inventoryPermissions) 
                    : inventoryPermissions;
            } catch (e) {
                console.error("Error parsing permissions during update:", e);
            }
        }

        // 3. ترجمة الفرع إلى ID
        const finalBranchId = await getBranchIdFromName(branch);

        // 4. معالجة الصورة الجديدة (إذا تم رفع صورة)
        let updateUserFields = { name, location: finalBranchId };
        
        if (req.file) {
            try {
                const uploadRes = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream(
                        { folder: "Employee Platform" }, 
                        (err, result) => {
                            if (err) return reject(err);
                            resolve(result);
                        }
                    ).end(req.file.buffer);
                });
                updateUserFields.profileImage = uploadRes.secure_url;
                updateUserFields.profileImagePublicId = uploadRes.public_id;
            } catch (uploadError) {
                console.error("Cloudinary Update Error:", uploadError);
            }
        }
        
        // تحديث بيانات الـ User
        await User.findByIdAndUpdate(employee.userId, updateUserFields);

        // 5. تحديث بيانات الـ Employee
        const updatedData = {
            maritalStatus, 
            designation, 
            salary, 
            department, 
            phoneNumber,
            branch: finalBranchId,
            inventoryPermissions: {
                canView: parsedPermissions.canView,
                canManage: parsedPermissions.canManage,
                accessibleBranches: parsedPermissions.accessibleBranches === 'Both' 
                    ? 'Both' 
                    : (await getBranchIdFromName(parsedPermissions.accessibleBranches || branch))
            },
            updateAt: Date.now()
        };

        await Employee.findByIdAndUpdate(employee._id, updatedData);

        return res.status(200).json({ success: true, message: 'تم تحديث البيانات والصورة بنجاح' });
    } catch (err) {
        console.error("Update Controller Error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

const getEmployees = async (req, res) => {
    try {
        const employees = await Employee.find()
            .populate({
                path: 'userId',
                select: 'name role profileImage',
                match: { role: { $ne: 'admin' } } 
            })
            .populate('department', 'dep_name');

        const filteredEmployees = employees.filter(emp => emp.userId !== null);

        return res.status(200).json({
            success: true,
            employees: filteredEmployees
        });
    } catch (err) {
        return res.status(500).json({ success: false, err: err.message });
    }
};

const getEmployee = async (req , res)=>{
    const {id} = req.params;
    try{
        let employee;
        employee = await Employee.findById({_id: id}).populate('userId' , {password:0}).populate('department');
        
        if(!employee){
            employee = await Employee.findOne({userId: id}).populate('userId' , {password:0}).populate('department');
        }
        
        if (!employee) {
             return res.status(404).json({success: false , message:'Employee not found'})
        }
        
        return res.status(200).json({success: true , employee})
    }catch(err){
        return res.status(500).json({success:false , message:'get employees server error'})
    }
}

const fetchEmpolyeeById = async(req , res)=>{
    const {id} = req.params;
    try{
        const employee = await Employee.find({department: id});
        return res.status(200).json({success: true , employee})
    }catch(err){
        return res.status(500).json({success:false , message:'Get EmployeesByDepId server error'})
    }
}

const getMyProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        // نستخدم populate لجلب اسم الموقع الفعلي بدلاً من الـ ID فقط
        const employee = await Employee.findOne({ userId })
            .populate('userId', { password: 0 })
            .populate('department')
            .populate('branch'); // جلب بيانات الفرع كاملة (Name, ID, etc.)

        if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

        const formattedEmployee = employee.toObject();
        
        // إرسال اسم الفرع للفرونت إند لسهولة العرض
        formattedEmployee.branchName = employee.branch ? employee.branch.name : "غير محدد";
        
        return res.status(200).json({ success: true, employee: formattedEmployee });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

const getAdmins = async (req, res) => {
    try {
        const adminUsers = await User.find({ role: 'admin' }).select('-password');

        const adminsWithDetails = await Promise.all(
            adminUsers.map(async (user) => {
                const employeeInfo = await Employee.findOne({ userId: user._id })
                    .populate('department') 
                    .lean(); 

                return {
                    ...user.toObject(),
                    employeeId: employeeInfo ? employeeInfo.employeeId : null,
                    branch: employeeInfo ? employeeInfo.branch : null,
                    salary: employeeInfo ? employeeInfo.salary : 0,
                    designation: employeeInfo ? employeeInfo.designation : "Admin",
                    inventoryPermissions: employeeInfo ? employeeInfo.inventoryPermissions : null
                };
            })
        );

        return res.status(200).json({ success: true, admins: adminsWithDetails });
    } catch (err) {
        console.error("Get Admins server error:", err);
        return res.status(500).json({ success: false, message: 'Server error retrieving admin accounts' });
    }
}

const getAdminDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const adminUser = await User.findOne({ _id: id, role: 'admin' }).select('-password');
        
        if (!adminUser) {
            return res.status(404).json({ success: false, message: 'Admin user not found' });
        }
        const employeeData = await Employee.findOne({ userId: id }).populate('department');

        const fullAdminData = {
            ...adminUser.toObject(),
            inventoryPermissions: employeeData ? employeeData.inventoryPermissions : null,
            branch: employeeData ? employeeData.branch : null,
            designation: employeeData ? employeeData.designation : "Admin",
            salary: employeeData ? employeeData.salary : 0,
            phoneNumber: employeeData ? employeeData.phoneNumber : ""
        };

        return res.status(200).json({ success: true, admin: fullAdminData });
    } catch (err) {
        console.error("Get Admin Details server error:", err);
        return res.status(500).json({ success: false, message: 'Server error retrieving admin details' });
    }
}

export { addEmployee , upload , getEmployees , getEmployee , updatedEmployee , fetchEmpolyeeById , getMyProfile , getAdmins , getAdminDetails};