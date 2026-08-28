import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";
import User from "../models/User.js";
import { getAdminEmails } from "../utils/adminAccess.js";

try {
  await connectDB();

  const adminEmails = getAdminEmails();
  const adminUsers = await User.find({
    $or: [
      { isAdmin: true },
      { email: { $in: adminEmails } },
    ],
  }).select("_id email isAdmin");

  const adminIds = adminUsers.map((user) => user._id);
  const result = adminIds.length
    ? await AnalyticsEvent.deleteMany({ userId: { $in: adminIds } })
    : { deletedCount: 0 };

  console.log(
    JSON.stringify(
      {
        adminUsersChecked: adminUsers.length,
        deletedAnalyticsEvents: result.deletedCount,
      },
      null,
      2
    )
  );
} catch (error) {
  console.error("Admin analytics cleanup failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
