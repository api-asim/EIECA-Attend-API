import mongoose from 'mongoose';
const { Schema } = mongoose;

const employeeSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    employeeId: { type: String, required: true, unique: true },
    dob: { type: Date },
    gender: { type: String },
    maritalStatus: { type: String },
    designation: { type: String },
    department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },

    // --- التعديل الجوهري هنا ---
    // تم تغيير النوع من String إلى ObjectId ليرتبط بجدول الـ Location مباشرة
    branch: { 
        type: Schema.Types.ObjectId, 
        ref: 'Location', 
        required: true 
    },
    
    inventoryPermissions: {
        canView: { type: Boolean, default: false },
        canManage: { type: Boolean, default: false },
        // تم ترك هذا كـ String مؤقتاً إذا كنت تستخدمه لنصوص وصفية مثل "كل الفروع"
        accessibleBranches: { type: String, default: 'Cairo' } 
    },

    phoneNumber: {
        type: String, 
        trim: true,
        maxlength: 20
    }, 
    salary: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    updateAt: { type: Date, default: Date.now },
});

// تم حذف الـ Index اليدوي لتجنب رسالة "Duplicate schema index" في الـ Console
const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;