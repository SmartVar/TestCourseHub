import express from "express";
import { config } from "dotenv";
import ErrorMiddleware from './middlewares/Error.js';
import cookieParser from "cookie-parser";

config({
    path: "./config/config.env", // Using config to call port in the server
  });                                                       

  const app = express(); // Creating a Server

//Using Middlewares

// 'express.json' and 'express.urlencoded' is required inorder to get access from 'req.body'
 
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(cookieParser()); //This is used to destructure the cookie token get from the login user cookie.


// Importing & Using Routes
import course from "./routes/courseRoutes.js";
import user from "./routes/userRoutes.js";
import payment from "./routes/paymentRoutes.js";
import other from "./routes/otherRoutes.js";

app.use("/api/v1", course);
app.use("/api/v1", user);
app.use("/api/v1", payment);
app.use("/api/v1", other);

export default app;

// The error handler middleware may be used in the last after all middle wars //

app.use(ErrorMiddleware);