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

    branch: { 
        type: String, 
        enum: ['Cairo', 'Mansoura', 'Both', 'مخزن القاهرة', 'مخزن المنصورة'], 
        required: true,
        default: 'Cairo'
    },
    inventoryPermissions: {
        canView: { type: Boolean, default: false },
        canManage: { type: Boolean, default: false },
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

const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;