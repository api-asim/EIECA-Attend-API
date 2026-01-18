import mongoose from "mongoose";
const { Schema } = mongoose;

const stockTransferSchema = new Schema(
    {
        reference: {
            type: String,
            required: true,
            unique: true
        },
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
        requestedQuantity: {
            type: Number,
            min: 0,
            default: 0
        },
        shippedQuantity: {
            type: Number,
            required: true,
            min: 1
        },
        receivedQuantity: {
            type: Number,
            min: 0,
            default: 0
        },
        disputeQuantity: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            required: true,
            enum: [
                'طلب توريد',  
                'قيد الانتظار',   
                'جاري النقل',
                'مكتمل',           
                'مكتمل مع عجز',   
                'ملغي'
            ],
            default: 'قيد الانتظار'
        },
        disputeNote: {
            type: String,
            default: ""
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
        },
        receivedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    {
        timestamps: true 
    }
);

stockTransferSchema.index({ createdAt: 1, sourceLocation: 1, destinationLocation: 1 });

const StockTransfer = mongoose.model("StockTransfer", stockTransferSchema);
export default StockTransfer;