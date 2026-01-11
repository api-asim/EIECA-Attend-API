import mongoose from "mongoose";
const { Schema } = mongoose;

const inventorySchema = new Schema(
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
        quantity: {
            type: Number,
            required: true,
            default: 0,
            min: 0 
        },
        minStockLevel: {
            type: Number,
            default: 0,
            min: 0
        },
        unique_item_location: {
            type: String,
            unique: true
        }
    },
    {
        timestamps: true
    }
);

// تصحيح الخطأ هنا: أضفنا (next) كمعامل للدالة لكي يتم التعرف عليها بالأسفل
inventorySchema.pre('save', function (next) {
    if (this.item && this.location) {
        this.unique_item_location = `${this.item.toString()}-${this.location.toString()}`;
    }
    // الآن لن يعطي خطأ "next is not a function" لأنها أصبحت معرفة
    next();
});

inventorySchema.index({ item: 1, location: 1 }, { unique: true });

const Inventory = mongoose.model("Inventory", inventorySchema);

export default Inventory;