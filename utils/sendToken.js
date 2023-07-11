export const sendToken = (res, user, message, statusCode = 200) => {
    const token = user.getJWTToken(); 
    const options = {
      expires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), //Token will expire in 15 days
      httpOnly: true,
    //   secure: true,
      sameSite: "none", //This function cannot be 'true' only 'none'/'lax'/'strict'
    };
  
    res.status(statusCode).cookie("token", token, options).json({
      success: true,
      message,
      user,
    });
  };
  