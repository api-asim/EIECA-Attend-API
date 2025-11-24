import Employee from "../models/Employee.js";
import Salary from "../models/Salary.js";

const addSalary = async(req , res)=>{
    try{
        const { employeeId , basicSalary , allowances , deductions , payDate } = req.body;
        const base = parseFloat(basicSalary) || 0;
        const alow = parseFloat(allowances) || 0;
        const ded = parseFloat(deductions) || 0;
        const netSalary = base + alow - ded;
        const newSalary = new Salary({
            employeeId ,
            basicSalary: base, 
            allowances: alow,
            deductions: ded,
            netSalary: netSalary, 
            payDate
        });
        await newSalary.save();
        return res.status(200).json({success: true, message: "Salary added successfully"})

    }catch(err){
        console.error("Error in addSalary:", err.message); 
        return res.status(500).json({success: false , error: 'salary add server error', details: err.message })
    } 
}

const getSalary = async(req , res)=>{
    try{
        const {id} = req.params;
        let employee = await Employee.findOne({
            $or: [{ _id: id }, { userId: id }] 
        });

        if (!employee) {
            return res.status(200).json({ success: true, salary: [] });
        }

        const employeeId = employee._id; 
        const salaries = await Salary.find({ employeeId: employeeId })
                                      .populate('employeeId' , 'employeeId');
        return res.status(200).json({success:true , salary: salaries})

    }catch(err){
        console.error("Error in getSalary:", err.message);
        return res.status(500).json({success:false , error: 'salary get server error', details: err.message})
    }
}

export { addSalary , getSalary }