import mongoose from "mongoose";
import { Schema } from "mongoose";

const stockMovementSchema = new Schema(
    {
        item: {
            type: Schema.Types.ObjectId,
            ref: 'Item',
            required: true
        },
        location: {
            type: Schema.Types.ObjectId,
            ref: 'Location',
            required: true
        },
        type: {
            type: String,
            enum: ['إضافة', 'خصم'], 
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        reference: {
            type: String,
            default: 'تعديل يدوي' 
        },
        reasonType: {
            type: String,
            required: true,
            enum: [
                'أستلام مشتريات',
                'صرف مبيعات',      
                'التحويل', 
                'تسوية جرد', 
                'تلف أو فقدان',     
                'تصحيح يدوي آخر' 
            ],
            default: 'تصحيح يدوي آخر' 
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true 
        }
    },
    {
        timestamps: true 
    }
);

const StockMovement = mongoose.model("StockMovement", stockMovementSchema);
export default StockMovement;