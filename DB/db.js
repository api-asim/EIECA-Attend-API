import mongoose from "mongoose";

const connenctToDataBase = async ()=>{
    try{
        await mongoose.connect(process.env.DB_URL, {
            serverSelectionTimeoutMS: 50000,
            socketTimeoutMS: 45000,
        }); 
        console.log("Connected to database successfully");
    }catch(err){
        console.log("Error connecting to database:", err);
    }
}
export default connenctToDataBase;