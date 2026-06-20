import "dotenv/config";
import mongoose from "mongoose";

import { cleanupGeneratedTestData } from "../utils/generatedTestDataCleanup.js";

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required.");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const result = await cleanupGeneratedTestData();

  if (!result.matchedUsers) {
    console.log("No generated test users found.");
    return;
  }

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error("Generated test data cleanup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
