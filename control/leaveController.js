import Employee from "../models/Employee.js";
import Leave from "../models/Leave.js";

const addLeave = async(req , res)=>{
    try{
        const {userId , leaveType , startDate , endDate , reason} = req.body;

        if(!userId || typeof userId !== 'string'){
            return res.status(400).json({success:false ,err:'User ID is missing or invalid in the request.'})
        }
        
        const employee = await Employee.findOne({userId});
        if(!employee){
            return res.status(404).json({success:false ,err:'Employee record not found for this user'})
        }
        
        const newLeave = new Leave({
            employeeId: employee._id , 
            leaveType , 
            startDate , 
            endDate , 
            reason
        });
        await newLeave.save()
        return res.status(200).json({success:true})
    }
    catch(err){
        console.log(err.message);
        return res.status(500).json({success: false , err:'Leave request server error'})
    }
}

const getLeave = async(req , res)=>{
    try{
        const {id} = req.params;
        let targetEmployeeId = id;
        let leaves = await Leave.find({ employeeId: targetEmployeeId }).sort({ appliedAt: -1 });
        if (!leaves || leaves.length === 0) {
            const employee = await Employee.findOne({ userId: id });
            if (employee) {
                targetEmployeeId = employee._id;
                leaves = await Leave.find({ employeeId: targetEmployeeId }).sort({ appliedAt: -1 });
            } 
        }
        return res.status(200).json({ success: true , leaves });
    }catch(err){
        console.error("Error in getLeave:", err.message); 
        return res.status(500).json({success: false , err:'Server error retrieving employee leaves.'})
    }
}

const getLeaves = async(req , res)=>{
    try{
        const leaves = await Leave.find().populate({
            path: "employeeId",
            populate:[
                {
                    path: 'department',
                    select: 'dep_name',
                },
                {
                    path: 'userId',
                    select: 'name',
                }
            ]
        })
        return res.status(200).json({success: true , leaves});
    }catch(err){
        console.log(err.message);
        return res.status(500).json({success: false , err:'get leave request is not valid'})
    }
}

const getLeaveDetail = async(req , res)=>{
    try{
        const {id} = req.params;
        const leave = await Leave.findById({_id: id}).populate({
            path: "employeeId",
            populate:[
                {
                    path: 'department',
                    select: 'dep_name',
                },
                {
                    path: 'userId',
                    select: 'name , profileImage',
                }
            ]
        })
        return res.status(200).json({success: true , leave});
    }catch(err){
        console.log(err.message);
        return res.status(500).json({success: false , err:'get leave request is not valid'})
    }
}

const updateLeave = async(req , res)=>{
    try{
        const {id} = req.params;
        const leave = await Leave.findByIdAndUpdate({_id: id} , {status: req.body.status});
        if(!leave){
            return res.status(404).json({success: false , error: 'leave not founded'})
        }
        return res.status(200).json({success: true});
    }
    catch(err){
        console.log(err.message);
        return res.status(500).json({success: false , err:'leave update server error'})
    }
}

export { addLeave  , getLeave , getLeaves , getLeaveDetail , updateLeave}