import mongoose from "mongoose";
const { Schema } = mongoose;

const locationSchema = new Schema(
    {
        name: { type: String, required: true, unique: true, trim: true },
        city: { type: String, required: true },
        address: {
            type: String,
            default: null,
            required: false,
        },
        manager: {
            type: Schema.Types.ObjectId,
            ref: 'Employee',
            default: null,
            required: false 
        },
        branchCode: {
            type: String,
            unique: true,
            sparse: true,
            uppercase: true
        }
    },
    {
        timestamps: true 
    }
);

locationSchema.index({ name: 1 });

const Location = mongoose.model("Location", locationSchema);
export default Location;