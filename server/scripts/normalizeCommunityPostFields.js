import "dotenv/config";
import mongoose from "mongoose";

import BuddyPost from "../models/BuddyPost.js";

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required.");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const normalized = await BuddyPost.updateMany(
    { communityType: { $in: ["new-in-town", "notice", "update"] } },
    { $unset: { category: "" } }
  );

  const counts = await BuddyPost.aggregate([
    {
      $group: {
        _id: "$communityType",
        count: { $sum: 1 },
        withCategory: {
          $sum: {
            $cond: [{ $ifNull: ["$category", false] }, 1, 0],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  console.log(
    JSON.stringify(
      {
        modified: normalized.modifiedCount,
        counts,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Community post normalization failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
