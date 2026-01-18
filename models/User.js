import mongoose from "mongoose"; 

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, enum: ['admin', 'employee'], default: 'employee', index: true, required: true },
        location: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Location', 
            default: null
        },
        isActive: { type: Boolean, index: true, default: true },
        profileImage: { type: String },
    },
    { timestamps: true }
);
const User =  mongoose.model("User", userSchema);
export default User;