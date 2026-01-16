import mongoose from "mongoose";

const connenctToDataBase = async ()=>{
    try{
        await mongoose.connect(process.env.DB_URL, {
            serverSelectionTimeoutMS: 50000,
            socketTimeoutMS: 45000,
        }); 
        console.log("Connected to database successfully");
        // // --- كود التحديث المؤقت ---
        // // يمكنك تشغيل هذا السطر مرة واحدة فقط لضمان انتقال البيانات
        // await mongoose.connection.collection('inventories').updateMany({}, [{ $set: { alertLimit: "$minStockLevel" } }]);
        // console.log("Data Migration: alertLimit updated for old records.");
        // ------------------------
    }catch(err){
        console.log("Error connecting to database:", err);
        throw err; 
    }
}
export default connenctToDataBase;