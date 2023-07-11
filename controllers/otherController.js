import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../utils/errorHandler.js";
import { sendEmail } from "../utils/sendEmail.js";
import { Stats } from "../modals/Stats.js";


// Contact Form
export const contact = catchAsyncError(async (req, res, next) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message)
    return next(new ErrorHandler("All fields are mandatory", 400));

  const to = process.env.MY_MAIL;
  const subject = "Contact from CourseHub";
  const text = `I am ${name} and my Email is ${email}. \n${message}`;

  await sendEmail(to, subject, text);

  res.status(200).json({
    success: true,
    message: "Your Message Has Been Sent.",
  });
});

// Course Request
export const courseRequest = catchAsyncError(async (req, res, next) => {
    const { name, email, course } = req.body;
    if (!name || !email || !course)
      return next(new ErrorHandler("All fields are mandatory", 400));
  
    const to = process.env.MY_MAIL;
    const subject = "Requesting for a course on CourseHub";
    const text = `I am ${name} and my Email is ${email}. \n${course}`;
  
    await sendEmail(to, subject, text);
  
    res.status(200).json({
      success: true,
      message: "Your Request Has Been Sent.",
    });
  });
  

  // Get Dashboard Stats
  export const getDashboardStats = catchAsyncError(async (req, res, next) => {
    const stats = await Stats.find({}).sort({ createdAt: "desc" }).limit(12);//This will find stats and sort it as per descending order i.e. last month/latest month above by limiting the count upto 12
  
    const statsData = []; //This is the empty array created to store the data from the above find array.

  //This will push all the data from stats object to statsData in the first place using unshift operation.  
  for (let i = 0; i < stats.length; i++) {
    statsData.unshift(stats[i]);
  }

  const requiredSize = 12 - stats.length; //This will give required size of the stats array function. It will be eg- 12-3=9.

  //This will be use to push the objects information upto the size received from 'requiredsize' object. Inorder to maintain the array lenght upto 12.
  for (let i = 0; i < requiredSize; i++) {
    statsData.unshift({
      users: 0,
      subscription: 0,
      views: 0,
    });
  }

  //This will give the count of the users, subscription and views of the last index element
  const usersCount = statsData[11].users;
  const subscriptionCount = statsData[11].subscription;
  const viewsCount = statsData[11].views;

  //To get the percentage value stored in the variables.
  let usersPercentage = 0,
    viewsPercentage = 0,
    subscriptionPercentage = 0;
  
    //To get the profit value stored in the variables.
    let usersProfit = true,
    viewsProfit = true,
    subscriptionProfit = true;

  if (statsData[10].users === 0) usersPercentage = usersCount * 100; //If 2nd last month users are '0'/'zero' than value will not be compared.
  if (statsData[10].views === 0) viewsPercentage = viewsCount * 100;//If 2nd last month views are '0'/'zero' than value will not be compared.
  if (statsData[10].subscription === 0) subscriptionPercentage = subscriptionCount * 100; //If 2nd last month subscription are '0'/'zero' than value will not be compared.
  else {

    // Below query eg. if last value=20 & 2nd last value=15 than % profit = (20-15)/15 *100
    const difference = {
      users: statsData[11].users - statsData[10].users,
      views: statsData[11].views - statsData[10].views,
      subscription: statsData[11].subscription - statsData[10].subscription,
    };

    usersPercentage = (difference.users / statsData[10].users) * 100;
    viewsPercentage = (difference.views / statsData[10].views) * 100;
    subscriptionPercentage = (difference.subscription / statsData[10].subscription) * 100;
    
    if (usersPercentage < 0) usersProfit = false;
    if (viewsPercentage < 0) viewsProfit = false;
    if (subscriptionPercentage < 0) subscriptionProfit = false;
  }

  res.status(200).json({
    success: true,
    stats: statsData,
    usersCount,
    subscriptionCount,
    viewsCount,
    subscriptionPercentage,
    viewsPercentage,
    usersPercentage,
    subscriptionProfit,
    viewsProfit,
    usersProfit,
  });
});
