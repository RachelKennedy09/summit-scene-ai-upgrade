import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";

import Event from "../models/Event.js";
import User from "../models/User.js";

const PASSWORD = "TestPassword123!";
const SEED_EMAIL_DOMAIN = "business-seed.summitscene.test";

function addDays(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function dateString(daysFromToday) {
  return addDays(daysFromToday).toISOString().slice(0, 10);
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

const businessUsers = [
  {
    name: "Three Sisters Taproom",
    email: `taproom@${SEED_EMAIL_DOMAIN}`,
    avatarKey: "m3_light_brownhair",
    town: "Canmore",
    lookingFor: "Taproom, live music, trivia, and community nights",
    bio: "A relaxed Canmore taproom hosting music, trivia, pop-ups, and watch parties.",
    website: "https://example.com/three-sisters-taproom",
    instagram: "@threesisterstaproom",
    socialAccounts: [
      {
        provider: "instagram",
        handle: "@threesisterstaproom",
        verified: true,
      },
      {
        provider: "website",
        url: "https://example.com/three-sisters-taproom",
        verified: true,
      },
    ],
  },
  {
    name: "Banff Maker Market",
    email: `market@${SEED_EMAIL_DOMAIN}`,
    avatarKey: "w5_light_blondehair",
    town: "Banff",
    lookingFor: "Local market and artisan events",
    bio: "Small markets featuring Rockies makers, artists, food vendors, and community fundraisers.",
    website: "https://example.com/banff-maker-market",
    instagram: "@banffmakermarket",
  },
  {
    name: "Lake Louise Lodge Social",
    email: `lodge@${SEED_EMAIL_DOMAIN}`,
    avatarKey: "w6_brown_longblack",
    town: "Lake Louise",
    lookingFor: "Lodge events, ski hill socials, and visitor activities",
    bio: "Social programming for Lake Louise visitors, staff, and locals.",
    website: "https://example.com/lake-louise-lodge-social",
    instagram: "@lakelouisesocial",
  },
  {
    name: "Bow Valley Wellness Studio",
    email: `wellness@${SEED_EMAIL_DOMAIN}`,
    avatarKey: "w1_light_orangehair",
    town: "Banff",
    lookingFor: "Yoga, wellness workshops, and beginner-friendly movement",
    bio: "Quiet wellness classes and workshops for locals, visitors, and seasonal workers.",
    website: "https://example.com/bow-valley-wellness",
    instagram: "@bowvalleywellness",
  },
  {
    name: "Canmore Arts Room",
    email: `arts@${SEED_EMAIL_DOMAIN}`,
    avatarKey: "w7_fair_orangehair",
    town: "Canmore",
    lookingFor: "Art nights, workshops, and creative community events",
    bio: "Creative evenings for anyone who wants to make something without pressure.",
    website: "https://example.com/canmore-arts-room",
    instagram: "@canmoreartsroom",
  },
  {
    name: "Summit Outdoor Club",
    email: `outdoors@${SEED_EMAIL_DOMAIN}`,
    avatarKey: "m7_dark_browncurly",
    town: "Banff",
    lookingFor: "Guided outdoor community events and beginner-friendly skills nights",
    bio: "Outdoor meetups, learning nights, and accessible mountain community events.",
    website: "https://example.com/summit-outdoor-club",
    instagram: "@summitoutdoorclub",
  },
];

const eventSeeds = [
  {
    host: "Banff Maker Market",
    title: "Saturday Rockies Maker Market",
    category: "Markets",
    town: "Banff",
    date: dateString(2),
    time: "10:00 AM",
    endTime: "3:00 PM",
    locationName: "Banff Community Hall",
    address: "110 Bear Street, Banff, AB",
    latitude: 51.1784,
    longitude: -115.5708,
    imageUrl:
      "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=80",
    description:
      "A weekend market with local makers, small food vendors, art prints, candles, and giftable Rockies goods.",
  },
  {
    host: "Bow Valley Wellness Studio",
    title: "Morning Mobility and Yoga",
    category: "Wellness",
    town: "Banff",
    date: dateString(1),
    time: "8:00 AM",
    endTime: "9:00 AM",
    locationName: "Bow Valley Wellness Studio",
    address: "211 Bear Street, Banff, AB",
    latitude: 51.1771,
    longitude: -115.5722,
    imageUrl:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
    description:
      "A beginner-friendly morning class focused on mobility, easy breath work, and feeling better before work or a day outside.",
  },
  {
    host: "Three Sisters Taproom",
    title: "Friday Live Music: Local Acoustic Night",
    category: "Live Music",
    town: "Canmore",
    date: dateString(5),
    time: "8:00 PM",
    endTime: "10:30 PM",
    locationName: "Three Sisters Taproom",
    address: "837 Main Street, Canmore, AB",
    latitude: 51.0896,
    longitude: -115.3593,
    imageUrl:
      "https://images.unsplash.com/photo-1501612780327-45045538702b?auto=format&fit=crop&w=1200&q=80",
    description:
      "Local acoustic sets, relaxed seating, and an easy night for people who want music without a full concert crowd.",
  },
  {
    host: "Three Sisters Taproom",
    title: "Karaoke Night at the Taproom",
    category: "Karaoke",
    town: "Canmore",
    date: dateString(3),
    time: "9:00 PM",
    endTime: "12:00 AM",
    locationName: "Three Sisters Taproom",
    address: "837 Main Street, Canmore, AB",
    latitude: 51.0896,
    longitude: -115.3593,
    imageUrl:
      "https://images.unsplash.com/photo-1527289333746-f1025cd5b1ac?auto=format&fit=crop&w=1200&q=80",
    description:
      "A low-pressure karaoke night with classics, group songs, and a friendly host for first-timers.",
  },
  {
    host: "Canmore Arts Room",
    title: "Intro to Watercolour Mountains",
    category: "Workshop",
    town: "Canmore",
    date: dateString(6),
    time: "6:30 PM",
    endTime: "8:30 PM",
    locationName: "Canmore Arts Room",
    address: "702 8 Street, Canmore, AB",
    latitude: 51.0891,
    longitude: -115.3581,
    imageUrl:
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80",
    description:
      "A guided beginner workshop where guests paint simple mountain shapes and take home a finished piece.",
  },
  {
    host: "Banff Maker Market",
    title: "Family Craft Morning",
    category: "Family",
    town: "Banff",
    date: dateString(8),
    time: "10:30 AM",
    endTime: "12:00 PM",
    locationName: "Banff Public Library",
    address: "101 Bear Street, Banff, AB",
    latitude: 51.1789,
    longitude: -115.5713,
    imageUrl:
      "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=1200&q=80",
    description:
      "A casual family craft session with simple supplies, friendly helpers, and drop-in style participation.",
  },
  {
    host: "Banff Maker Market",
    title: "Local Retail Pop-Up: Gear and Gifts",
    category: "Retail",
    town: "Banff",
    date: dateString(9),
    time: "12:00 PM",
    endTime: "5:00 PM",
    locationName: "Bear Street Pop-Up Space",
    address: "215 Bear Street, Banff, AB",
    latitude: 51.1773,
    longitude: -115.5725,
    imageUrl:
      "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=80",
    description:
      "A retail pop-up with local outdoor accessories, handmade goods, and small mountain-town brands.",
  },
  {
    host: "Summit Outdoor Club",
    title: "Beginner Trail Safety Night",
    category: "Outdoors",
    town: "Banff",
    date: dateString(4),
    time: "6:00 PM",
    endTime: "7:30 PM",
    locationName: "Fenlands Recreation Centre",
    address: "100 Mt Norquay Road, Banff, AB",
    latitude: 51.1834,
    longitude: -115.5791,
    imageUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    description:
      "A practical intro to trail etiquette, weather checks, layers, and planning beginner-friendly outings.",
  },
  {
    host: "Three Sisters Taproom",
    title: "Taco and Local Pint Night",
    category: "Happy Hour",
    town: "Canmore",
    date: dateString(1),
    time: "5:00 PM",
    endTime: "8:00 PM",
    locationName: "Three Sisters Taproom",
    address: "837 Main Street, Canmore, AB",
    latitude: 51.0896,
    longitude: -115.3593,
    imageUrl:
      "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?auto=format&fit=crop&w=1200&q=80",
    description:
      "A casual food and drink night built for after-work hangs, small groups, and people new to town.",
  },
  {
    host: "Three Sisters Taproom",
    title: "Seasonal Burger Special",
    category: "Specials",
    town: "Canmore",
    date: dateString(8),
    time: "4:00 PM",
    endTime: "7:00 PM",
    locationName: "Three Sisters Taproom",
    address: "837 Main Street, Canmore, AB",
    latitude: 51.0896,
    longitude: -115.3593,
    imageUrl:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80",
    description:
      "A rotating food special for locals, seasonal workers, and anyone looking for an easy early evening plan.",
  },
  {
    host: "Banff Maker Market",
    title: "Food Truck Friday",
    category: "Food Trucks",
    town: "Banff",
    date: dateString(5),
    time: "11:30 AM",
    endTime: "2:30 PM",
    locationName: "Bear Street Pop-Up Space",
    address: "215 Bear Street, Banff, AB",
    latitude: 51.1773,
    longitude: -115.5725,
    imageUrl:
      "https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?auto=format&fit=crop&w=1200&q=80",
    description:
      "A lunchtime food truck meetup with rotating vendors and quick outdoor seating.",
  },
  {
    host: "Banff Maker Market",
    title: "Local Vendor Showcase",
    category: "Vendors",
    town: "Banff",
    date: dateString(15),
    time: "1:00 PM",
    endTime: "5:00 PM",
    locationName: "Banff Community Hall",
    address: "110 Bear Street, Banff, AB",
    latitude: 51.1784,
    longitude: -115.5708,
    imageUrl:
      "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=80",
    description:
      "A vendor showcase with local makers, service providers, pop-ups, and community tables.",
  },
  {
    host: "Lake Louise Lodge Social",
    title: "Seasonal Worker Networking Mixer",
    category: "Networking",
    town: "Lake Louise",
    date: dateString(7),
    time: "7:00 PM",
    endTime: "9:00 PM",
    locationName: "Lake Louise Lodge Lounge",
    address: "111 Lake Louise Drive, Lake Louise, AB",
    latitude: 51.4254,
    longitude: -116.1773,
    imageUrl:
      "https://images.unsplash.com/photo-1515169067865-5387ec356754?auto=format&fit=crop&w=1200&q=80",
    description:
      "A relaxed mixer for seasonal workers, newcomers, and people looking to build a local circle.",
  },
  {
    host: "Banff Maker Market",
    title: "Community Soup Fundraiser",
    category: "Fundraiser",
    town: "Banff",
    date: dateString(10),
    time: "4:00 PM",
    endTime: "7:00 PM",
    locationName: "Banff Community Hall",
    address: "110 Bear Street, Banff, AB",
    latitude: 51.1784,
    longitude: -115.5708,
    imageUrl:
      "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80",
    description:
      "A pay-what-you-can soup night supporting local community programming and newcomer resources.",
  },
  {
    host: "Lake Louise Lodge Social",
    title: "Holiday Staff Social and Cookie Swap",
    category: "Seasonal/Holiday Special",
    town: "Lake Louise",
    date: dateString(12),
    time: "6:30 PM",
    endTime: "9:30 PM",
    locationName: "Lake Louise Lodge Lounge",
    address: "111 Lake Louise Drive, Lake Louise, AB",
    latitude: 51.4254,
    longitude: -116.1773,
    imageUrl:
      "https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=1200&q=80",
    description:
      "A holiday-style social with snacks, a cookie swap, and easy conversation prompts for people new to the area.",
  },
  {
    host: "Three Sisters Taproom",
    title: "Late Night Social",
    category: "Nightlife",
    town: "Canmore",
    date: dateString(2),
    time: "10:00 PM",
    endTime: "1:00 AM",
    locationName: "Three Sisters Taproom",
    address: "837 Main Street, Canmore, AB",
    latitude: 51.0896,
    longitude: -115.3593,
    imageUrl:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
    description:
      "A late-night social with music, low lights, and space for groups to meet before heading out.",
  },
  {
    host: "Three Sisters Taproom",
    title: "Playoff Watch Party",
    category: "Sports/Watch Party",
    town: "Canmore",
    date: dateString(11),
    time: "6:00 PM",
    endTime: "10:00 PM",
    locationName: "Three Sisters Taproom",
    address: "837 Main Street, Canmore, AB",
    latitude: 51.0896,
    longitude: -115.3593,
    imageUrl:
      "https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=1200&q=80",
    description:
      "Big-screen game night with reserved communal tables for people who want to watch with a group.",
  },
  {
    host: "Lake Louise Lodge Social",
    title: "New to Lake Louise Info Session",
    category: "Community Info Session",
    town: "Lake Louise",
    date: dateString(3),
    time: "5:30 PM",
    endTime: "7:00 PM",
    locationName: "Lake Louise Visitor Centre",
    address: "201 Village Road, Lake Louise, AB",
    latitude: 51.4251,
    longitude: -116.1789,
    imageUrl:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
    description:
      "A practical session for newcomers covering transport, groceries, staff resources, and how to meet people locally.",
  },
  {
    host: "Canmore Arts Room",
    title: "Community Collage Night",
    category: "Art",
    town: "Canmore",
    date: dateString(13),
    time: "6:30 PM",
    endTime: "8:30 PM",
    locationName: "Canmore Arts Room",
    address: "702 8 Street, Canmore, AB",
    latitude: 51.0891,
    longitude: -115.3581,
    imageUrl:
      "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1200&q=80",
    description:
      "A no-pressure collage night with shared materials, music, and tables set up for solo or group creating.",
  },
  {
    host: "Canmore Arts Room",
    title: "Monthly Mountain Book Club",
    category: "Book Club",
    town: "Canmore",
    date: dateString(14),
    time: "7:00 PM",
    endTime: "8:30 PM",
    scheduleType: "recurring",
    recurrence: {
      frequency: "selected_weekdays",
      weekdays: ["Wednesday"],
      untilDate: dateString(120),
    },
    locationName: "Canmore Arts Room",
    address: "702 8 Street, Canmore, AB",
    latitude: 51.0891,
    longitude: -115.3581,
    imageUrl:
      "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=1200&q=80",
    description:
      "A monthly book club with approachable picks, discussion prompts, and a friendly setup for first-timers.",
  },
  {
    host: "Lake Louise Lodge Social",
    title: "First Chair Social",
    category: "Ski Hill Events",
    town: "Lake Louise",
    date: dateString(4),
    time: "8:15 AM",
    endTime: "9:00 AM",
    locationName: "Lake Louise Ski Resort Base",
    address: "1 Whitehorn Road, Lake Louise, AB",
    latitude: 51.4404,
    longitude: -116.1623,
    imageUrl:
      "https://images.unsplash.com/photo-1551524559-8af4e6624178?auto=format&fit=crop&w=1200&q=80",
    description:
      "Meet at the base for a quick coffee and chairlift meetup before heading out for the morning.",
  },
  {
    host: "Summit Outdoor Club",
    title: "Disc Golf Drop-In",
    category: "Disc Golf",
    town: "Canmore",
    date: dateString(6),
    time: "5:30 PM",
    endTime: "7:30 PM",
    locationName: "Canmore Nordic Centre Disc Golf Area",
    address: "1988 Olympic Way, Canmore, AB",
    latitude: 51.0903,
    longitude: -115.3944,
    imageUrl:
      "https://images.unsplash.com/photo-1551969014-7d2c4cddf0b6?auto=format&fit=crop&w=1200&q=80",
    description:
      "A beginner-friendly disc golf drop-in with casual groups and basic tips for anyone new to the course.",
  },
  {
    host: "Summit Outdoor Club",
    title: "All-Day Volunteer Trail Clean-Up",
    category: "Other",
    town: "Banff",
    date: dateString(16),
    isAllDay: true,
    locationName: "Central Park Banff",
    address: "Central Park, Banff, AB",
    latitude: 51.1748,
    longitude: -115.5718,
    imageUrl:
      "https://images.unsplash.com/photo-1527525443983-6e60c75fff46?auto=format&fit=crop&w=1200&q=80",
    description:
      "An all-day volunteer cleanup with flexible shifts, supplies provided, and a casual thank-you meetup after.",
  },
];

async function upsertBusinessUsers() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const usersByName = new Map();

  for (const userData of businessUsers) {
    const user = await User.findOneAndUpdate(
      { email: userData.email },
      {
        $set: {
          ...userData,
          passwordHash,
          role: "business",
          businessVerificationStatus: "verified",
          businessVerificationRequestedAt: hoursAgo(240),
          businessVerifiedAt: hoursAgo(168),
          userType: "local",
          languages: ["English"],
          interests: [],
          skillLevel: {},
          blockedUsers: [],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    usersByName.set(user.name, user);
  }

  return usersByName;
}

async function seedEvents(usersByName) {
  const events = [];

  for (const seed of eventSeeds) {
    const host = usersByName.get(seed.host);
    if (!host) {
      throw new Error(`Missing business seed user: ${seed.host}`);
    }

    const { host: _hostName, ...eventFields } = seed;
    const timeSlots = eventFields.isAllDay
      ? []
      : [
          {
            startTime: eventFields.time,
            endTime: eventFields.endTime,
          },
        ].filter((slot) => slot.startTime);

    const event = await Event.create({
      scheduleType: "single",
      isAllDay: false,
      ...eventFields,
      time: eventFields.isAllDay ? undefined : eventFields.time,
      endTime: eventFields.isAllDay ? undefined : eventFields.endTime,
      timeSlots,
      location: eventFields.locationName || eventFields.address,
      createdBy: host._id,
      createdAt: hoursAgo(Math.floor(Math.random() * 72) + 2),
    });

    events.push(event);
  }

  return events;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required.");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const deletedEvents = await Event.deleteMany({});
  const usersByName = await upsertBusinessUsers();
  const events = await seedEvents(usersByName);

  console.log("Business event seed complete.");
  console.log(`Deleted Event documents: ${deletedEvents.deletedCount}`);
  console.log(`Verified business users ready: ${usersByName.size}`);
  console.log(`Events created: ${events.length}`);
}

main()
  .catch((error) => {
    console.error("Business event seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
