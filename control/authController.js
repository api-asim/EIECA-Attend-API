import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const login = async (req, res) => {
    try{
        const { email, password } = req.body;
        const user = await User.findOne({email});

        if(!user){
            return res.status(404).json({success:false , error:"Invalid email or password" });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        
        if(!isMatch){
            return res.status(404).json({ message: "Wrong password" });
        }
        
        const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        
        res.status(200).json({success: true , message: "Login successful", token , user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        } });
    }
    catch(err){
        res.status(500).json({success: false , message: "Server error", error: err.message });
        console.error("Error during login process:", err);
    }
}

const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, error: "User with this email already exists" });
        }

        const userRole = role || 'employee';

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({
            name,
            email,
            password: hashedPassword, 
            role: userRole
        });

        await newUser.save();
        const token = jwt.sign({ _id: newUser._id, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.status(201).json({ 
            success: true, 
            message: "User registered successfully", 
            token, 
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error during registration", error: err.message });
        console.error("Error during registration process:", err);
    }
};

const verify = (req , res)=>{
    return res.status(200).json({success:true , user: req.user});
}

const generateResetToken = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, error: "المستخدم غير موجود بهذا البريد." });
        }
        const shortLivedToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '5m' });

        res.status(200).json({ 
            success: true, 
            message: "تم توليد رابط التحديث بنجاح.",
            token: shortLivedToken 
        });

    } catch (err) {
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
}

const simpleResetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        if (!token) {
             return res.status(400).json({ success: false, error: "رمز التحديث مفقود." });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await User.findById(decoded._id);

        if (!user) {
             return res.status(404).json({ success: false, error: "المستخدم غير موجود أو الرمز غير صالح." });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.status(200).json({ success: true, message: "تم تحديث كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن." });
        
    } catch (err) {
        res.status(400).json({ success: false, message: "رمز التحديث غير صالح أو انتهت صلاحيته.", error: err.message });
    }
}

export { login , register , verify , generateResetToken , simpleResetPassword };