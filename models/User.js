import mongoose from "mongoose"; 

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, enum: ['admin', 'employee'], default: 'employee', index: true , required: true },
        isActive: { type: Boolean, index: true , default: true },
        profileImage: { type: String },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
);
const User =  mongoose.model("User", userSchema);
export default User;