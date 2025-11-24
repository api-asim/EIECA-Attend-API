import multer from "multer";
import Employee from "../models/Employee.js";
import User from "../models/User.js";
import bcrypt from 'bcrypt';
import cloudinary from '../utils/cloudinary.js';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


const addEmployee = async(req, res) => {
    try{
        const {name , email , employeeId , dob , gender , maritalStatus , designation , department , salary , phoneNumber , password , role} = req.body;
        const user = await User.findOne({email});
        if(user){
            return res.status(400).json({success: false , error:"user already registered in emp"});
        }
        
        const hashPassword = await bcrypt.hash(password , 10);
        let imageUrl = '';
        let publicId = '';
        
        if (req.file) {
            console.log('Image file detected. Uploading to Cloudinary...');
            const uploadRes = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream({
                    upload_preset: "Employee Platform" 
                }, (error, result) => {
                    if (error) {
                        console.error("Cloudinary upload_stream error:", error);
                        return reject(error);
                    }
                    resolve(result);
                }).end(req.file.buffer);
            });

            if (uploadRes) {
                imageUrl = uploadRes.secure_url;
                publicId = uploadRes.public_id;
            }
        }
        
        const newUser = new User({
            name , 
            email ,
            password: hashPassword , 
            role , 
            profileImage: imageUrl, 
            profileImagePublicId: publicId 
        });
        const savedUser = await newUser.save();

        if (role === 'employee') {
            const newEmployee = new Employee({
                userId: savedUser._id ,
                employeeId,
                dob , 
                gender , 
                maritalStatus , 
                designation , 
                department , 
                salary , 
                phoneNumber
            });
            
            await newEmployee.save();
            return res.status(200).json({success: true , message:'Employee created successfully'});
        }
        return res.status(200).json({success: true , message:'Admin user created successfully'});
    }
    catch(err){
        console.error("Add Employee Error:", err);
        return res.status(500).json({success: false , message:'server error in adding employee'})
    }
};

const updatedEmployee = async (req , res)=>{
    try{
        const {id} = req.params;
        const {name , maritalStatus , designation , department , salary , phoneNumber} = req.body; 
        const employee = await Employee.findById({_id: id})
        if(!employee){
             return res.status(404).json({success: false , err:'employee not found'})
        }
        const user = await User.findById({_id: employee.userId})
        if(!user){
             return res.status(404).json({success: false , err:'user not found'})
        }

        let updateUserFields = { name };
        if (req.file) {
            console.log('New image detected. Uploading to Cloudinary...');
            const uploadRes = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream({ upload_preset: "Employee Platform" }, (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }).end(req.file.buffer);
            });
            updateUserFields.profileImage = uploadRes.secure_url;
            updateUserFields.profileImagePublicId = uploadRes.public_id;
            if (user.profileImagePublicId) {
                console.log('Destroying old image:', user.profileImagePublicId);
                await cloudinary.uploader.destroy(user.profileImagePublicId);
            }
        }
        const updateUser = await User.findByIdAndUpdate(employee.userId , updateUserFields, {new: true});
        const updateEmployee =await Employee.findByIdAndUpdate({_id: id} , {
            maritalStatus,
            designation,
            salary,
            department,
            phoneNumber
        });
        
        if(!updateEmployee || !updateUser){
            return res.status(404).json({success: false , err:'document not found'})
        }
        
        return res.status(200).json({success: true , message:'Update Employee Successfully'})
    }
    catch(err){
        console.error("Update Employee Error:", err);
        return res.status(500).json({success: false , err:'Update employee data server error'})
    }
}

const getEmployees = async (req , res)=>{
    try{
        const employees = await Employee.find().populate('userId' , {password:0}).populate('department');
        return res.status(200).json({success: true , employees})
    }catch(err){
        return res.status(500).json({success:false , message:'get employees server error'})
    }
}

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

const getMyProfile = async (req , res)=>{
    try{
        const userId = req.user._id; 
        const employee = await Employee.findOne({userId: userId.toString()}) .populate('userId' , {password:0}).populate('department');
        
        if (!employee) {
            return res.status(404).json({success: false , message:'Employee data not found for this user'})
        }

        return res.status(200).json({success: true , employee})
    }
    catch(err){
        console.error("Get My Profile server error:", err); 
        return res.status(500).json({success:false , message:'Get My Profile server error'})
    }
}

const getAdmins = async (req , res) => {
    try{
        const admins = await User.find({ role: 'admin' }).select('-password');
        return res.status(200).json({ success: true, admins });
    } catch(err) {
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
        return res.status(200).json({ success: true, admin: adminUser });
    } catch (err) {
        console.error("Get Admin Details server error:", err);
        return res.status(500).json({ success: false, message: 'Server error retrieving admin details' });
    }
}

export { addEmployee , upload , getEmployees , getEmployee , updatedEmployee , fetchEmpolyeeById , getMyProfile , getAdmins , getAdminDetails};