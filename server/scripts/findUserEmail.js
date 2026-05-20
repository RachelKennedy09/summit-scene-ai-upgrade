import dotenv from "dotenv";
import mongoose from "mongoose";

import User from "../models/User.js";

dotenv.config();

const query = String(process.argv[2] || "").trim().toLowerCase();

if (!query) {
  console.error("Usage: node scripts/findUserEmail.js <email-or-search-text>");
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);

const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exactUser = await User.findOne({ email: query })
  .select("_id email name role")
  .lean();
const matches = await User.find({
  email: { $regex: escaped, $options: "i" },
})
  .select("_id email name role")
  .lean();

console.log(
  JSON.stringify(
    {
      exactFound: Boolean(exactUser),
      exactUser,
      matches,
    },
    null,
    2
  )
);

await mongoose.disconnect();
