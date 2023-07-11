import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import validator from "validator";
import bcrypt from "bcrypt";
import crypto from "crypto";


const schema = new mongoose.Schema({

    // Name type required

    name: {
        type: String,
        required: [true, "Please enter your name"],
      },

    //Email type required unique validate

    email: {
        type: String,
        required: [true, "Please enter your email"],
        unique: true,
        validate: validator.isEmail,
      },

    //Password type required minLength Select

      password: {
        type: String,
        required: [true, "Please enter your password"],
        minLength: [6, "Password must be at least 6 characters"],
        select: false, //This is mandatory to select false, so that no password is by default selected.
      },

    
      //Role type enum default

      role: {
        type: String,
        enum: ["admin", "user"],
        default: "user", // This is default user, whenver we crate user the role will be default user.
      },

      //subscription id, status

      subscription: {  //This both parameter will be receiving from razaor pay.
        id: String,
        status: String,
      },

      //Avatar {public_id,url}

      avatar: {
        public_id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },

      //Playlist [courseID,poster]

      playlist: [
        {
          course: {
            type: mongoose.Schema.Types.ObjectId, //This is id we received from mongoose.schema.
            ref: "Course", //The id we received above will be reffered to Course and it will search the id in Courses.
          },
          poster: String,
        },
      ],

      //CreatedAt type default

      createdAt: {
        type: Date,
        default: Date.now,
      },
    
      resetPasswordToken: String, //This will generate token during forget password and reset password.
      resetPasswordExpire: String,
});

//This methond is used to bcrypt the password received from database into haspassword and save again to database.

schema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); //This 'if' condition will ensured that if 'psswd' filed not changed/updated that don't do hash password.
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

//JWT token schema

schema.methods.getJWTToken = function () {
  return jwt.sign({ _id: this._id }, process.env.JWT_SECRET, { //"this._id" is for user.id for payload
    expiresIn: "15d",
  });
};

//This will be used to compare password we get in the DB with the user enter password

schema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};


//This method is used to generate random token.

schema.methods.getResetToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex"); //This will provide random token.

  this.resetPasswordToken = crypto
    .createHash("sha256") //This is algorithm to make crypto provided random token 'hashed'.
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

export const User = mongoose.model("User", schema);