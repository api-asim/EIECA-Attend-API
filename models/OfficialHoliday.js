import mongoose from "mongoose";

const officialHolidaySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true,
        unique: true
    },
    createdAt: { type: Date, default: Date.now }
});

const OfficialHoliday = mongoose.model("OfficialHoliday", officialHolidaySchema);
export default OfficialHoliday;