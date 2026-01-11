import multer from "multer";
import Employee from "../models/Employee.js";
import User from "../models/User.js";
import bcrypt from 'bcrypt';
import cloudinary from '../utils/cloudinary.js';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


const addEmployee = async(req, res) => {
    try {
        const {
            name, email, employeeId, dob, gender, maritalStatus, 
            designation, department, salary, phoneNumber, password, 
            role, branch, inventoryAccessType, inventoryScope 
        } = req.body;

        const user = await User.findOne({email});
        if(user) return res.status(400).json({success: false , error:"user already registered"});
        
        const hashPassword = await bcrypt.hash(password , 10);
        let imageUrl = '', publicId = '';

        if (req.file) {
            const uploadRes = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream({ upload_preset: "Employee Platform" }, (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                }).end(req.file.buffer);
            });
            imageUrl = uploadRes.secure_url;
            publicId = uploadRes.public_id;
        }

        const newUser = new User({
            name, email, password: hashPassword, role, 
            profileImage: imageUrl, profileImagePublicId: publicId 
        });
        const savedUser = await newUser.save();
        const newEmployee = new Employee({
            userId: savedUser._id,
            employeeId: employeeId || `ADM-${Date.now()}`,
            dob, 
            gender, 
            maritalStatus, 
            designation: designation || (role === 'admin' ? 'System Admin' : 'Staff'), 
            department, 
            salary: salary || 0, 
            phoneNumber,
            branch: branch || 'Cairo', 
            inventoryPermissions: {
                canView: role === 'admin' ? true : (inventoryAccessType === 'view' || inventoryAccessType === 'manage'),
                canManage: role === 'admin' ? true : (inventoryAccessType === 'manage'),
                accessibleBranches: role === 'admin' ? 'Both' : (inventoryScope || branch || 'Cairo')
            }
        });

        await newEmployee.save();

        return res.status(200).json({success: true , message:'User created successfully with profile details'});
    } catch(err){
        return res.status(500).json({success: false , message: err.message})
    }
};

const updatedEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, maritalStatus, designation, department, 
            salary, phoneNumber, branch, inventoryAccessType, inventoryScope 
        } = req.body; 

        let employee = await Employee.findById(id);
        if (!employee) {
            employee = await Employee.findOne({ userId: id });
        }

        if (!employee) {
            return res.status(404).json({ success: false, message: 'لم يتم العثور على بيانات الموظف أو المسؤول' });
        }

        const user = await User.findById(employee.userId);
        if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });

        let updateUserFields = { name };
        if (req.file) {
            const uploadRes = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream({ upload_preset: "Employee Platform" }, (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                }).end(req.file.buffer);
            });
            updateUserFields.profileImage = uploadRes.secure_url;
            updateUserFields.profileImagePublicId = uploadRes.public_id;
            
            if (user.profileImagePublicId) {
                await cloudinary.uploader.destroy(user.profileImagePublicId);
            }
        }
        await User.findByIdAndUpdate(employee.userId, updateUserFields);

        const isSystemAdmin = user.role === 'admin';

        const updatedData = {
            maritalStatus,
            designation: designation || (isSystemAdmin ? "System Admin" : undefined),
            salary,
            department,
            phoneNumber,
            branch,
            inventoryPermissions: {
                canView: isSystemAdmin ? true : (inventoryAccessType === 'view' || inventoryAccessType === 'manage'),
                canManage: isSystemAdmin ? true : (inventoryAccessType === 'manage'),
                accessibleBranches: isSystemAdmin ? 'Both' : (inventoryScope || branch || 'Cairo')
            }
        };

        await Employee.findByIdAndUpdate(employee._id, updatedData);

        return res.status(200).json({ success: true, message: 'تم تحديث البيانات بنجاح' });
    } catch (err) {
        console.error("Update Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

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
        const employee = await Employee.findOne({ userId })
            .populate('userId', { password: 0 })
            .populate('department');

        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }
        const formattedEmployee = employee.toObject();
        formattedEmployee.inventoryPermissions = {
            accessType: employee.inventoryPermissions.canManage ? 'manage' : 
                       (employee.inventoryPermissions.canView ? 'view' : 'none'),
            accessibleBranches: employee.inventoryPermissions.accessibleBranches || 'Cairo'
        };

        return res.status(200).json({ 
            success: true, 
            employee: formattedEmployee 
        });
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