import mongoose from "mongoose";
import { Schema } from "mongoose";

const locationSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        city: {
            type: String,
            required: true,
            trim: true
        },
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
        }
    },
    {
        timestamps: true 
    }
);

const Location = mongoose.model("Location", locationSchema);
export default Location;