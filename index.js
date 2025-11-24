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

const app = express();
app.use(cors({
    origin:process.env.VERCEL_LINK ,
    credentials: true,
}));
app.use(express.json());
dotenv.config();

connenctToDataBase();
app.use('/api/attendance' , attendanceRouter);

app.use('/', registerRoute);
app.use('/' , loginRoute);
app.use('/' , departmentRouter);
app.use('/' , employeeRouter);
app.use('/' , salaryRouter);
app.use('/' , leaveRouter);
app.use('/' , settingRouter);
app.use('/' , dashboardRouter);

app.get('/', (req, res) => {
    res.send('Welcome to our online shop API...');
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT || 5000}`);
});

