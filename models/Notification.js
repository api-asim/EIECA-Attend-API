import mongoose from "mongoose";
const notificationSchema = new mongoose.Schema({
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: String,
    message: String,
    type: { type: String, enum: ['transfer_request', 'transfer_shipped', 'transfer_completed', 'dispute', 'low_stock'] },
    relatedId: mongoose.Schema.Types.ObjectId, 
    isReadBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
    createdAt: { type: Date, default: Date.now }
});
export default mongoose.model("Notification", notificationSchema);