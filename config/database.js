import mongoose from "mongoose";

export const connectDB = async () => {
  const { connection } = await mongoose.connect(process.env.MONGO_URI); //This is the config variable i.e. MONGO_URI
  console.log(`MongoDB connected with ${connection.host}`);
};
