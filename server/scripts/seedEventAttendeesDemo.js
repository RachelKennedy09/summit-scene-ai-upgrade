import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";

import Event from "../models/Event.js";
import User from "../models/User.js";

const PASSWORD = "TestPassword123!";
const DEMO_EMAIL_DOMAIN = "attendee-demo.summitscene.test";
const TARGET_EVENT_TITLE = "Taco and Local Pint Night";

const attendees = [
  ["Maya Chen", "w2_tan_longbrown", "Banff", "seasonal", "Taiwan", ["English", "Mandarin"]],
  ["Samir Patel", "m1_tan_blackhair", "Canmore", "local", "Calgary", ["English", "Hindi"]],
  ["Lucia Romero", "w4_medium_longauburn", "Lake Louise", "seasonal", "Chile", ["Spanish", "English"]],
  ["Noah Brooks", "m6_medium_browncurly", "Banff", "visitor", "Auckland", ["English"]],
  ["Avery Morgan", "w8_dark_shortcurly", "Canmore", "local", "Edmonton", ["English", "French"]],
  ["Theo Nguyen", "m8_light_blackhair", "Banff", "seasonal", "Vietnam", ["English", "Vietnamese"]],
  ["Ella Thompson", "w5_light_blondehair", "Banff", "seasonal", "Toronto", ["English"]],
  ["Jonas Meyer", "m3_light_brownhair", "Canmore", "visitor", "Germany", ["German", "English"]],
  ["Priya Singh", "w3_dark_blackpony", "Banff", "local", "Vancouver", ["English", "Punjabi"]],
  ["Mateo Silva", "m9_tan_redlong", "Lake Louise", "seasonal", "Brazil", ["Portuguese", "English"]],
  ["Sophie Laurent", "w7_fair_orangehair", "Canmore", "visitor", "France", ["French", "English"]],
  ["Ben Carter", "m5_light_redhair", "Banff", "local", "Ottawa", ["English"]],
  ["Nina Okafor", "w6_brown_longblack", "Canmore", "seasonal", "Nigeria", ["English"]],
  ["Kai Wilson", "m2_dark_blackhair", "Banff", "seasonal", "Australia", ["English"]],
  ["Isla Park", "w1_light_orangehair", "Lake Louise", "local", "Kelowna", ["English", "Korean"]],
  ["Owen Fraser", "m4_brown_blondehair", "Canmore", "visitor", "Scotland", ["English"]],
  ["Camila Torres", "w2_tan_longbrown", "Banff", "seasonal", "Mexico", ["Spanish", "English"]],
  ["Leo Martin", "m7_dark_browncurly", "Canmore", "local", "Montreal", ["French", "English"]],
  ["Hannah Green", "w5_light_blondehair", "Banff", "visitor", "London", ["English"]],
  ["Ravi Kapoor", "m1_tan_blackhair", "Lake Louise", "seasonal", "India", ["English", "Hindi"]],
  ["Mei Tan", "w3_dark_blackpony", "Canmore", "seasonal", "Singapore", ["English", "Mandarin"]],
  ["Alex Rivera", "m8_light_blackhair", "Banff", "local", "Calgary", ["English", "Spanish"]],
];

function emailForName(name) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@${DEMO_EMAIL_DOMAIN}`;
}

async function upsertAttendees() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const users = [];

  for (const [name, avatarKey, town, userType, originallyFrom, languages] of attendees) {
    const user = await User.findOneAndUpdate(
      { email: emailForName(name) },
      {
        $set: {
          name,
          email: emailForName(name),
          passwordHash,
          role: "local",
          businessVerificationStatus: "none",
          avatarKey,
          town,
          userType,
          originallyFrom,
          languages,
          interests: ["Find local events", "Meet people through activities"],
          skillLevel: {},
          bio: `Demo attendee for testing larger event attendance lists.`,
          socialAccounts: [],
          blockedUsers: [],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    users.push(user);
  }

  return users;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required.");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const event =
    (await Event.findOne({ title: TARGET_EVENT_TITLE })) ||
    (await Event.findOne().sort({ date: 1, createdAt: -1 }));

  if (!event) {
    throw new Error("No event found. Run npm run seed:events first.");
  }

  const users = await upsertAttendees();
  event.attendees = users.map((user) => user._id);
  await event.save();

  console.log("Event attendee demo seeded.");
  console.log(`Event: ${event.title}`);
  console.log(`Attendees attached: ${users.length}`);
  console.log("Open this event detail screen to see the preview and View all modal.");
}

main()
  .catch((error) => {
    console.error("Event attendee demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
