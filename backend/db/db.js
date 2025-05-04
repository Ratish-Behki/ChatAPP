const mongoose=require("mongoose");
console.log(6);
module.exports = async()=>{
    try{
        await mongoose.connect(process.env.DB);
        console.log(7,"Connected to MongoDB");
    }
    catch(error){
        console.log(8,error);
    }
}