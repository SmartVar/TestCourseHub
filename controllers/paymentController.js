import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { User } from "../modals/User.js";
import ErrorHandler from "../utils/errorHandler.js";
import { instance } from "../server.js";
import crypto from "crypto";
import { Payment } from "../modals/Payment.js";


//Buy Subscription
export const buySubscription = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (user.role === "admin")
    return next(new ErrorHandler("Admin can't buy subscription", 400));

  const plan_id = process.env.PLAN_ID || "plan_MBjIyWPRp9MuhE"; //The plsn idvwill be taken from env or we will pass as stting.

  const subscription = await instance.subscriptions.create({
    plan_id, //The planid is passed.
    customer_notify: 1, //The customer will be notify once after start of subscription.
    total_count: 12, //This is for payment of subscription for 1 time in a year hence value is 12.
  });

  user.subscription.id = subscription.id; //This will save value in subscription id of user modals

  user.subscription.status = subscription.status; //This will save value in subscription status of user modals

  await user.save();

  res.status(201).json({
    success: true,
    subscriptionId: subscription.id,
  });
});


//Payment Verification
export const paymentVerification = catchAsyncError(async (req, res, next) => {
  const { razorpay_signature, razorpay_payment_id, razorpay_subscription_id } =
    req.body;

  const user = await User.findById(req.user._id);

  const subscription_id = user.subscription.id;

  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
    .update(razorpay_payment_id + "|" + subscription_id, "utf-8")
    .digest("hex");

  const isAuthentic = generated_signature === razorpay_signature;

  if (!isAuthentic)
    return res.redirect(`${process.env.FRONTEND_URL}/paymentfail`);

  // database comes here
  await Payment.create({
    razorpay_signature,
    razorpay_payment_id,
    razorpay_subscription_id,
  });

  user.subscription.status = "active";

  await user.save();

  res.redirect(
    `${process.env.FRONTEND_URL}/paymentsuccess?reference=${razorpay_payment_id}`
  );
});


//Get Razor Pay Key
export const getRazorPayKey = catchAsyncError(async (req, res, next) => {
  res.status(200).json({
    success: true,
    key: process.env.RAZORPAY_API_KEY,
  });
});

//Cancel Subscription
export const cancelSubscription = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  const subscriptionId = user.subscription.id;
  let refund = false;

  await instance.subscriptions.cancel(subscriptionId); //This will cancel subcriptionid

  const payment = await Payment.findOne({
    razorpay_subscription_id: subscriptionId,
  });

  //The below codes are for calculation of refund time to subscriber.

  const gap = Date.now() - payment.createdAt; //This will give the gap btw payment done till the date of cancellation of subscription.

  const refundTime = process.env.REFUND_DAYS * 24 * 60 * 60 * 1000; //Refund days calculated in miliseconds.

  if (refundTime > gap) {
    await instance.payments.refund(payment.razorpay_payment_id);
    refund = true;
  }


  await payment.remove();
  user.subscription.id = undefined;
  user.subscription.status = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: refund
      ? "Subscription cancelled, You will receive full refund within 7 days."
      : "Subscription cancelled, No refund initiated as subscription was cancelled after 7 days.",
  });
});
