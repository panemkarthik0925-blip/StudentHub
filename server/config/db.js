import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    await mongoose.connect(uri, {
  serverSelectionTimeoutMS: 15000,
  autoSelectFamily: false,
});
    console.log("MongoDB connected successfully");
  } catch (error) {
  console.error("MongoDB connection failed:", error.message);

  if (error.reason?.servers) {
    for (const [address, server] of error.reason.servers) {
      console.error(
        "Server:",
        address,
        "| Error:",
        server.error?.message || "No detailed error available"
      );
    }
  }

  process.exit(1);
}
};

export default connectDB;