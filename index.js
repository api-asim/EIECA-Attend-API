import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connenctToDataBase from "./DB/db.js";
import attendanceRouter from './Routes/attendanceRoute.js';
import registerRoute from "./Routes/register.js";
import loginRoute from "./Routes/login.js";
import departmentRouter from "./Routes/department.js";
import employeeRouter from "./Routes/employee.js";
import salaryRouter from './Routes/salary.js';
import leaveRouter from './Routes/leave.js';
import settingRouter from './Routes/setting.js';
import dashboardRouter from './Routes/dashboard.js';
import inventoryRouter from './Routes/InventoryRoutes.js';

const app = express();
dotenv.config();

app.use(cors({
    // origin: process.env.VERCEL_LINK,
    origin:'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());


const startServer = async () => {
    try {
        await connenctToDataBase();
        console.log("Database connection successful. Starting server setup...");

        app.use('/api/attendance' , attendanceRouter);
        app.use('/', registerRoute);
        app.use('/' , loginRoute);
        app.use('/' , departmentRouter);
        app.use('/' , employeeRouter);
        app.use('/' , salaryRouter);
        app.use('/' , leaveRouter);
        app.use('/' , settingRouter);
        app.use('/api/dashboard' , dashboardRouter);
        app.use('/api/inventory' , inventoryRouter);

        app.get('/', (req, res) => {
            res.send('Welcome to our online shop API...');
        });

        app.listen(process.env.PORT || 5000, () => {
            console.log(`Server is running on port ${process.env.PORT || 5000}`);
        });

    } catch (error) {
        console.error("FAILED TO START SERVER due to a database connection error:", error);
        process.exit(1); 
    }
}

startServer();