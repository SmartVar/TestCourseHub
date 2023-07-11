import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../utils/errorHandler.js";
import { User } from "../modals/User.js";
import { sendToken } from "../utils/sendToken.js";
import { sendEmail } from "../utils/sendEmail.js";
import crypto from "crypto";
import { Course } from "../modals/Course.js";
import cloudinary from "cloudinary";
import getDataUri from "../utils/dataUri.js";
import { Stats } from "../modals/Stats.js";

//Register User

export const register = catchAsyncError(async (req, res, next) => {
  
  const { name, email, password } = req.body;
  const file = req.file;

    //Error handling 
  if (!name || !email || !password || !file)
    return next(new ErrorHandler("Please enter all field", 400));

  let user = await User.findOne({ email }); //If email found, than it will show that user already exists. "let is used as we can change user afterwards"

  if (user) return next(new ErrorHandler("User Already Exist", 409)); //This will execute if user exists.

  const fileUri = getDataUri(file);
  const mycloud = await cloudinary.v2.uploader.upload(fileUri.content);

  user = await User.create({
    name,
    email,
    password,
    avatar: {
      public_id: mycloud.public_id,
      url: mycloud.secure_url,
    },
  });

  sendToken(res, user, "Registered Successfully", 201);
});

//Login User

export const login = catchAsyncError(async (req, res, next) => {
    const { email, password } = req.body;
  
    if (!email || !password)
      return next(new ErrorHandler("Please enter all field", 400));
  
    const user = await User.findOne({ email }).select("+password"); //This will get the user eamil and password only one. "select" keyword is used as in schema the password is default selected as "none".
  
    if (!user) return next(new ErrorHandler("Incorrect Email or Password", 401)); //This will check whether User is available/exists or not.
  
    const isMatch = await user.comparePassword(password); //This will check/compare password of the user using 'comparePassword method.
  
    if (!isMatch)
      return next(new ErrorHandler("Incorrect Email or Password", 401));
  
    sendToken(res, user, `Welcome back, ${user.name}`, 200);
  });

  //Logout User

  export const logout = catchAsyncError(async (req, res, next) => {
    res
      .status(200)
      .cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
        secure: true,
        sameSite: "none",
      })                            //we just need to empty cookies for logout.
      .json({
        success: true,
        message: "Logged Out Successfully",
      });
  });
  

    //Get my Profile
  export const getMyProfile = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id); //The id is find using user id of logged in user.

  res.status(200).json({
    success: true,
    user,
  });                                           //User is provided to the user.
});

//Change Password

export const changePassword = catchAsyncError(async (req, res, next) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword)
      return next(new ErrorHandler("Please enter all field", 400));
  
    const user = await User.findById(req.user._id).select("+password");
  
    const isMatch = await user.comparePassword(oldPassword);
  
    if (!isMatch) return next(new ErrorHandler("Incorrect Old Password", 400));
  
    user.password = newPassword;
  
    await user.save(); //Every time user get saved the password will get hashed.
  
    res.status(200).json({
      success: true,
      message: "Password Changed Successfully",
    });
  });


  //Update Profile
  export const updateProfile = catchAsyncError(async (req, res, next) => {
    const { name, email } = req.body;
  
    const user = await User.findById(req.user._id);
  
    if (name) user.name = name;
    if (email) user.email = email;
  
    await user.save();
  
    res.status(200).json({
      success: true,
      message: "Profile Updated Successfully",
    });
  });


  //Update Profile Picture

  export const updateprofilepicture = catchAsyncError(async (req, res, next) => {
    const file = req.file;
  
    const user = await User.findById(req.user._id);
  
    const fileUri = getDataUri(file);
    const mycloud = await cloudinary.v2.uploader.upload(fileUri.content);
  
    await cloudinary.v2.uploader.destroy(user.avatar.public_id); //This will destroy if already uploaded avatar.
  
    user.avatar = {
      public_id: mycloud.public_id,
      url: mycloud.secure_url,
    };
  
    await user.save();
  
    res.status(200).json({
      success: true,
      message: "Profile Picture Updated Successfully",
    });
  });

  //Forget Password

  export const forgetPassword = catchAsyncError(async (req, res, next) => {
    const { email } = req.body;
  
    const user = await User.findOne({ email });
  
    if (!user) return next(new ErrorHandler("User not found", 400));
  
    const resetToken = await user.getResetToken(); //This will store random hashed token from getResetToken function.+
  
    await user.save();
  
    const url = `${process.env.FRONTEND_URL}/resetpassword/${resetToken}`; //This will generate the url for resetpassword.
  
    const message = `Click on the link to reset your password. ${url}. If you have not request then please ignore.`;
  
    // Send token via email
    await sendEmail(user.email, "CourseHub Reset Password", message);
  
    res.status(200).json({
      success: true,
      message: `Reset Token has been sent to ${user.email}`,
    });
  });


  // Reset Password
  export const resetPassword = catchAsyncError(async (req, res, next) => {
    const { token } = req.params; //Confirm that the 'id' initialise in routes after ":" will be taken during destructuring.
  
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
  
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: {
        $gt: Date.now(),
      },
    });
  
    if (!user)
      return next(new ErrorHandler("Token is invalid or has been expired", 401));
  
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
  
    await user.save();
  
    res.status(200).json({
      success: true,
      message: "Password Changed Successfully",
    });
  });


  // Add to Playlist
  export const addToPlaylist = catchAsyncError(async (req, res, next) => {
    const user = await User.findById(req.user._id); //This will give user id of login user
  
    const course = await Course.findById(req.body.id); //This will give all courses of the logged in user
  
    if (!course) return next(new ErrorHandler("Invalid Course Id", 404));
  
    // The below code is added to eliminate the duplicate entry of courses in the playlist.
    
    const itemExist = user.playlist.find((item) => {
      if (item.course.toString() === course._id.toString()) return true;
    }); // This will search whether the course we find above is already present in the playlist arrary.
  
    if (itemExist) return next(new ErrorHandler("Item Already Exist", 409));
  
    //This will store the course and poster in the playlist array defined in the user modal
    user.playlist.push({
      course: course._id,
      poster: course.poster.url,
    });
  
    await user.save();
  
    res.status(200).json({
      success: true,
      message: "Added to playlist",
    });
  });


  // Remove from Playlist
  export const removeFromPlaylist = catchAsyncError(async (req, res, next) => {
    const user = await User.findById(req.user._id);
    const course = await Course.findById(req.query.id); //Note that here id has been taken from user 'query' not from body.
    if (!course) return next(new ErrorHandler("Invalid Course Id", 404));
  
    // The below code will give all the course id which are not matched with the user defined id and don't have to delete.
    const newPlaylist = user.playlist.filter((item) => {
      if (item.course.toString() !== course._id.toString()) return item;
    });
  
    user.playlist = newPlaylist; //The new playlist we get from above code will be saved in the user playlist.
    await user.save();
    res.status(200).json({
      success: true,
      message: "Removed From Playlist",
    });
  });

  // Admin Controllers - Get All Users

export const getAllUsers = catchAsyncError(async (req, res, next) => {
  const users = await User.find({});

  res.status(200).json({
    success: true,
    users,
  });
});

// Admin Controllers - Update User Role

export const updateUserRole = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) return next(new ErrorHandler("User not found", 404));

  if (user.role === "user") user.role = "admin";
  else user.role = "user";

  await user.save();

  res.status(200).json({
    success: true,
    message: "Role Updated",
  });
});

// Admin Controllers - Delete User Role
export const deleteUser = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) return next(new ErrorHandler("User not found", 404));

  await cloudinary.v2.uploader.destroy(user.avatar.public_id);

  // Cancel Subscription

  await user.remove();

  res.status(200).json({
    success: true,
    message: "User Deleted Successfully",
  });
});

// Delete my Profile

export const deleteMyProfile = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  await cloudinary.v2.uploader.destroy(user.avatar.public_id);

  // Cancel Subscription

  await user.remove();

  res
    .status(200)
    .cookie("token", null, {
      expires: new Date(Date.now()),
    }) // This will help to logout the user immediately with delete of user profile and expiring the cookie.
    .json({
      success: true,
      message: "User Deleted Successfully",
    });
});

//This will call everytime when any changes occurs in the users collection. Mainly occurs when stats update. 
User.watch().on("change", async () => {
  const stats = await Stats.find({}).sort({ createdAt: "desc" }).limit(1); //This will store the last/latest value in the 'stats' object.

  const subscription = await User.find({ "subscription.status": "active" });
  stats[0].users = await User.countDocuments();
  stats[0].subscription = subscription.length;
  stats[0].createdAt = new Date(Date.now());

  await stats[0].save();
});