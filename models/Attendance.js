import mongoose from "mongoose";
import { Schema } from "mongoose";

const attendanceSchema = new Schema(
    {
        employeeId: {
            type: Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
            index: true
        },
        date: {
            type: Date,
            required: true,
        },
        checkInTime: {
            type: Date,
            required: true
        },
        checkOutTime: {
            type: Date,
            default: null
        },
        workDuration: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ['Present', 'Tardy', 'Early Out', 'Full Day', 'Missing Check-out'],
            default: 'Present'
        }
    }, 
    { 
        timestamps: true 
    }
);

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;