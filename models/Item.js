import mongoose from "mongoose";
import { Schema } from "mongoose";

const itemSchema = new Schema(
    {
        sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
        name: { type: String, required: true, unique: true, trim: true },
        description: { type: String, default: null },
        unitOfMeasure: { 
            type: String, 
            required: true, 
            enum: ['قطعة', 'كرتون', 'متر', 'لتر', 'كيلوغرام', 'صندوق', 'أخرى'], 
            default: 'قطعة' 
        },
        costPrice: { type: Number, required: true, min: 0 },
        category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
        
        // --- قم بتعديل هذه السطور ---
        locationId: { 
            type: Schema.Types.ObjectId, 
            ref: 'Location', 
            required: false // غيرها من true إلى false
        },
        initialStock: {
            type: Number,
            default: 0 // اجعلها اختيارية
        },
        // --------------------------

        imageUrl: { type: String, default: null },
        imagePublicId: { type: String, default: null },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

const Item = mongoose.model("Item", itemSchema);
export default Item;