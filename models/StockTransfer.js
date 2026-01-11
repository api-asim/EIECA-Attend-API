import mongoose from "mongoose";
const { Schema } = mongoose;

const stockTransferSchema = new Schema(
    {
        sourceLocation: {
            type: Schema.Types.ObjectId,
            ref: 'Location',
            required: true
        },
        destinationLocation: {
            type: Schema.Types.ObjectId,
            ref: 'Location',
            required: true
        },
        item: {
            type: Schema.Types.ObjectId,
            ref: 'Item',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        status: {
            type: String,
            required: true,
            enum: [
                'قيد الانتظار', 
                'جاري النقل',   
                'مكتمل',       
                'ملغي'         
            ],
            default: 'قيد الانتظار'
        },
        reference: {
            type: String,
            default: null
        },
        outgoingMovementId: {
            type: Schema.Types.ObjectId,
            ref: 'StockMovement',
            default: null
        },
        incomingMovementId: {
            type: Schema.Types.ObjectId,
            ref: 'StockMovement',
            default: null
        },
        initiatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true 
        }
    },
    {
        timestamps: true
    }
);

const StockTransfer = mongoose.model("StockTransfer", stockTransferSchema);
export default StockTransfer;