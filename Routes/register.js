import express from "express";
import User from "../models/User.js"; 
import bcrypt from "bcrypt";

const router = express.Router();

router.post('/api/register', async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password are required." });
    }

    try {

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "This email is already registered." });
        }

        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

       
        const newUser = new User({
            name,
            email,
            password: hashedPassword, 
            role: role || 'employee', 
        });

        const savedUser = await newUser.save();

        res.status(200).json({
            message: "User registered successfully.",
            user: {
                id: savedUser._id,
                name: savedUser.name,
                email: savedUser.email,
                role: savedUser.role
            }
        });

    } catch (err) {
        console.error("Error during registration process:", err);
        res.status(500).json({ message: "Server error occurred during registration." });
    }
});

export default router;