import Department from "../models/Department.js";

const getDepartments = async(req, res) => {
    try{
        const departments = await Department.find();
        return res.status(200).json({success:true , departments});
    }catch(err){
        return res.status(500).json({success:false , message: "Get department server error", error: err.message });
    }
}

const addDepartment = async(req, res) => {
    try{
        const {dep_name , description} = req.body;
        const newDep = new Department({
            dep_name,
            description
        })
        await newDep.save();
        return  res.status(200).json({success:true , message: "Department added successfully", department: newDep });
    } 
    catch (error) {
        return res.status(500).json({success:false ,  message: "Server Error", error: error.message });
    }
};

const getDepartment = async(req, res) => {
    try{
        const {id} = req.params;
        const department = await Department.findById({_id: id});
        return res.status(200).json({success:true , department});
    }catch(err){
        return res.status(500).json({success:false , message: "Get department server error", error: err.message });
    }
}

const updatedDepartment = async(req, res) => {
    try{
        const {id} = req.params;
        const {dep_name , description} = req.body;
        const updatedDep = await Department.findByIdAndUpdate({_id: id} , {
            dep_name,
            description,
            updatedAt: Date.now()
        } , {new: true});
        return res.status(200).json({success:true , message: "Department updated successfully", department: updatedDep });
    }catch(err){
        return res.status(500).json({success:false , message: "Update department server error", error: err.message
        })
    }
}

const deleDepartment = async(req ,res)=>{
    try{
        const {id} = req.params;
        const deleteDep = await Department.findByIdAndDelete({_id: id});
        return res.status(200).json({success:true , message: "Department delete successfully", department: deleteDep });
    }catch(err){
        return res.status(500).json({success:false , message: "Delete department server error", error: err.message
        })
    }    
}

export { addDepartment , getDepartments , getDepartment , updatedDepartment , deleDepartment};