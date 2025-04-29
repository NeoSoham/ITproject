// backend/config/mongodb.js
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("MONGO_URI not defined in environment");
    }

    // No need for useNewUrlParser or useUnifiedTopology in Mongoose 6+
    await mongoose.connect(uri);

    console.log("MongoDB connected");
  } catch (err) {
    console.error("DB connection error:", err);
    process.exit(1);
  }
};

export default connectDB;
