// registerControllers.js

const bcrypt = require("bcrypt");
const { User , validateRegister } = require("../models/userModel.js");
const { Token } = require("../models/tokenModel.js");
const sendEmail = require("../utils/sendEmail.js");
const crypto = require("crypto");

const registerController = async (req , res) => {
    console.log("Register Controller");
    try {
        const {error} = validateRegister(req.body);
        console.log("Register Controller 2");
        if(error){
            console.log("Register Controller 3");
            return res.status(400).send({message:error.details[0].message});
        }

        //Check if user exists
        let user = await User.findOne({email:req.body.email});
        console.log("Register Controller 4");
        if(user && user.verified) {
            console.log("Register Controller 5");
            return res.status(409).send({message:"User with given email already exists"});
        }
        if (user && user.verificationLinkSent) {
            console.log("Register Controller 6");
            return res
              .status(400)
              .send({
                message: "A verification link has been already sent to this Email",
              });
        }

        const salt = await bcrypt.genSalt(Number(process.env.SALT));
        const hashPassword = await bcrypt.hash(req.body.password, salt);
        console.log("Register Controller 7");
        //save user
        console.log("Register Controller 8");
        user = await new User({...req.body,password:hashPassword}).save();
        console.log("Register Controller 9");
        // Generate a verification token and send a n email
        console.log("Register Controller 10");
        const token = await new Token({
            userId:user._id,
            token:crypto.randomBytes(16).toString("hex"),
            createdAt:Date.now(),
            expiresAt:Date.now() + 3600000,
        }).save();
        console.log("Register Controller 10");
        // const url = `${process.env.BASE_URL}/users/${user._id}/verify/${token.token}`;
        // console.log("Register Controller 11");
        // await sendEmail(user.email, "Verify Email", url);
        console.log("Register Controller 12");
        user.verified = true;
        user.verificationLinkSent = true;
        console.log("Register Controller 13");
        await user.save();
        console.log("Register Controller 14");
        res.status(201).send({message:"Verification link has been sent to your email"});
    }
    catch(error){
        console.log("Register Controller 15");
        console.log(error);
        res.status(500).send({message:"Internal Server Error"});
    }
};

module.exports = registerController;