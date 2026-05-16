import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";

import BuddyPost from "../models/BuddyPost.js";
import CommunityPost from "../models/CommunityPost.js";
import Event from "../models/Event.js";
import User from "../models/User.js";

const PASSWORD = "TestPassword123!";
const SEED_EMAIL_DOMAIN = "community-seed.summitscene.test";
const SEED_EMAIL_PATTERN = new RegExp(`@${SEED_EMAIL_DOMAIN.replaceAll(".", "\\.")}$`);

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

const seedUsers = [
  {
    name: "Maya Chen",
    email: `maya@${SEED_EMAIL_DOMAIN}`,
    avatarKey: null,
    profileImageUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
    town: "Banff",
    userType: "seasonal",
    originallyFrom: "Taiwan",
    languages: ["English", "Mandarin"],
    interests: ["Hiking", "Karaoke", "Coffee", "New in Town"],
    bio: "New to Banff for the season and trying to say yes to more plans.",
    socialAccounts: [
      { provider: "instagram", handle: "@maya_in_banff", verified: false },
    ],
  },
  {
    name: "Samir Patel",
    email: `samir@${SEED_EMAIL_DOMAIN}`,
    avatarKey: null,
    profileImageUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
    town: "Canmore",
    userType: "local",
    originallyFrom: "Calgary",
    languages: ["English", "Hindi"],
    interests: ["Mountain Biking", "Comedy", "Live Music"],
    bio: "Usually up for low-key plans after work.",
  },
  {
    name: "Lucia Romero",
    email: `lucia@${SEED_EMAIL_DOMAIN}`,
    avatarKey: null,
    profileImageUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
    town: "Lake Louise",
    userType: "seasonal",
    originallyFrom: "Chile",
    languages: ["Spanish", "English"],
    interests: ["Skiing", "Snowshoeing", "Local Clubs"],
    bio: "Here for the winter and always looking for mountain friends.",
  },
  {
    name: "Noah Brooks",
    email: `noah@${SEED_EMAIL_DOMAIN}`,
    avatarKey: null,
    profileImageUrl:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80",
    town: "Banff",
    userType: "visitor",
    originallyFrom: "Auckland",
    languages: ["English"],
    interests: ["Pub Nights", "Restaurant Specials", "Live Music"],
    bio: "Visiting for a few weeks and keen to join easy social plans.",
  },
  {
    name: "Avery Morgan",
    email: `avery@${SEED_EMAIL_DOMAIN}`,
    avatarKey: null,
    profileImageUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80",
    town: "Canmore",
    userType: "local",
    originallyFrom: "Edmonton",
    languages: ["English", "French"],
    interests: ["Art Shows", "Local Clubs", "Photography Walks", "Craft Markets"],
    bio: "I like relaxed plans, creative nights, and welcoming new people.",
  },
  {
    name: "Theo Nguyen",
    email: `theo@${SEED_EMAIL_DOMAIN}`,
    avatarKey: null,
    profileImageUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
    town: "Banff",
    userType: "seasonal",
    originallyFrom: "Vietnam",
    languages: ["English", "Vietnamese"],
    interests: ["Makers Markets", "Food Trucks", "Comedy"],
    bio: "Working in town and trying to find a steady group of friends.",
  },
];

const postSeeds = [
  {
    user: "Maya Chen",
    type: "hiking",
    category: "Hiking",
    communityType: "local-plan",
    activityText:
      "Hiking Tunnel Mountain tomorrow morning.\nLooking for 1-2 people to join at a casual pace.",
    date: dateString(1),
    time: "9:00 AM",
    town: "Banff",
    skillLevel: "casual",
    groupSizePreference: "small-group",
    createdAt: hoursAgo(2),
  },
  {
    user: "Noah Brooks",
    eventTitle: "Karaoke Night at the Taproom",
    type: "event",
    category: "Karaoke",
    communityType: "local-plan",
    activityText:
      "Karaoke at High Rollers tonight.\nWould be great to meet a few people before heading over.",
    date: dateString(0),
    time: "8:30 PM",
    town: "Banff",
    groupSizePreference: "small-group",
    createdAt: hoursAgo(1),
  },
  {
    user: "Lucia Romero",
    eventTitle: "First Chair Social",
    type: "skiing",
    category: "Skiing",
    communityType: "local-plan",
    activityText:
      "Lake Louise blue runs this Saturday.\nLooking for experienced but relaxed ski or snowboard buddies.",
    date: dateString(5),
    time: "10:00 AM",
    town: "Lake Louise",
    skillLevel: "experienced",
    groupSizePreference: "small-group",
    createdAt: hoursAgo(6),
  },
  {
    user: "Samir Patel",
    type: "discgolf",
    category: "Hiking",
    communityType: "local-plan",
    activityText:
      "Disc golf at the Canmore course after work.\nHappy to play with casual or experienced players.",
    date: dateString(2),
    time: "5:45 PM",
    town: "Canmore",
    skillLevel: "casual",
    groupSizePreference: "any",
    createdAt: hoursAgo(4),
  },
  {
    user: "Avery Morgan",
    type: "walking",
    category: "Wellness Retreats",
    communityType: "local-plan",
    activityText:
      "Easy Sunday river walk in Canmore.\nBeginner-friendly and mostly just a chance to chat.",
    date: dateString(6),
    time: "11:00 AM",
    town: "Canmore",
    skillLevel: "beginner",
    groupSizePreference: "any",
    createdAt: hoursAgo(11),
  },
  {
    user: "Maya Chen",
    type: "general",
    category: "Other",
    communityType: "new-in-town",
    activityText:
      "New to Banff this week.\nI like hikes, coffee, karaoke, and meeting people who are also figuring town out.",
    date: dateString(0),
    time: "6:00 PM",
    town: "Banff",
    groupSizePreference: "any",
    createdAt: hoursAgo(3),
  },
  {
    user: "Theo Nguyen",
    type: "general",
    category: "Restaurant Specials",
    communityType: "new-in-town",
    activityText:
      "Seasonal worker in Banff looking for after-work food plans.\nOpen to casual dinners, trivia, or coffee.",
    date: dateString(0),
    time: "7:00 PM",
    town: "Banff",
    groupSizePreference: "small-group",
    createdAt: hoursAgo(8),
  },
  {
    user: "Avery Morgan",
    type: "bookclub",
    category: "Local Clubs",
    communityType: "group",
    activityText:
      "Starting a monthly cozy book club in Canmore.\nFirst meetup will be low pressure, tea-friendly, and beginner-friendly.",
    date: dateString(9),
    time: "7:00 PM",
    town: "Canmore",
    groupSizePreference: "small-group",
    scheduleType: "recurring",
    recurrence: {
      frequency: "monthly",
      weekday: "Wednesday",
      untilDate: dateString(120),
    },
    createdAt: hoursAgo(20),
  },
  {
    user: "Samir Patel",
    type: "trivia",
    category: "Pub Nights",
    communityType: "group",
    activityText:
      "Trivia team needs two more people.\nNo need to be a trivia genius, just show up and have fun.",
    date: dateString(3),
    time: "7:30 PM",
    town: "Canmore",
    groupSizePreference: "small-group",
    scheduleType: "recurring",
    recurrence: {
      frequency: "weekly",
      weekday: "Thursday",
      untilDate: dateString(90),
    },
    createdAt: hoursAgo(15),
  },
  {
    user: "Noah Brooks",
    eventTitle: "Friday Live Music: Local Acoustic Night",
    type: "event",
    category: "Live Music",
    communityType: "local-plan",
    activityText:
      "Live music at the pub Friday night.\nLooking for people to meet up before the show.",
    date: dateString(4),
    time: "9:00 PM",
    town: "Banff",
    groupSizePreference: "small-group",
    createdAt: hoursAgo(30),
  },
  {
    user: "Avery Morgan",
    type: "art",
    category: "Art Shows",
    communityType: "group",
    activityText:
      "Casual sketch night for people who miss making art.\nBring a notebook, no experience needed.",
    date: dateString(8),
    time: "6:30 PM",
    town: "Canmore",
    groupSizePreference: "any",
    scheduleType: "recurring",
    recurrence: {
      frequency: "biweekly",
      weekday: "Tuesday",
      untilDate: dateString(100),
    },
    createdAt: hoursAgo(26),
  },
  {
    user: "Lucia Romero",
    type: "general",
    category: "Community Gatherings",
    communityType: "update",
    activityText:
      "Heads up for Lake Louise newcomers.\nStaff housing info night is happening this week, good chance to ask practical questions.",
    date: dateString(2),
    time: "6:00 PM",
    town: "Lake Louise",
    groupSizePreference: "any",
    createdAt: hoursAgo(5),
  },
  {
    user: "Theo Nguyen",
    type: "shopping",
    category: "Makers Markets",
    communityType: "local-plan",
    activityText:
      "Thrift and gear shopping in Banff this weekend.\nLooking for one or two people who want to browse and grab coffee after.",
    date: dateString(7),
    time: "1:00 PM",
    town: "Banff",
    groupSizePreference: "small-group",
    createdAt: hoursAgo(18),
  },
  {
    user: "Avery Morgan",
    type: "notice",
    category: "Garage Sale",
    communityType: "notice",
    activityText:
      "Garage sale near downtown Canmore this Saturday.\nKitchen items, a small desk, winter layers, and a few beginner hiking pieces.",
    date: dateString(4),
    time: "9:00 AM",
    town: "Canmore",
    groupSizePreference: "any",
    createdAt: hoursAgo(3),
  },
  {
    user: "Samir Patel",
    type: "notice",
    category: "Gear Sale / Swap",
    communityType: "notice",
    activityText:
      "Gear swap table after work.\nBringing extra gloves, microspikes, and a daypack. Open to trades or low-cost buys.",
    date: dateString(2),
    time: "6:00 PM",
    town: "Banff",
    groupSizePreference: "any",
    createdAt: hoursAgo(9),
  },
  {
    user: "Lucia Romero",
    type: "notice",
    category: "Lost & Found",
    communityType: "notice",
    activityText:
      "Found a black toque near the Lake Louise staff bus stop.\nReply with the logo on the front and I can get it back to you.",
    date: dateString(0),
    time: "4:30 PM",
    town: "Lake Louise",
    groupSizePreference: "any",
    createdAt: hoursAgo(1),
  },
  {
    user: "Maya Chen",
    type: "bingo",
    category: "Pub Nights",
    communityType: "local-plan",
    activityText:
      "Bingo night after dinner.\nI have never been and would rather not show up solo.",
    date: dateString(3),
    time: "7:00 PM",
    town: "Banff",
    groupSizePreference: "small-group",
    createdAt: hoursAgo(10),
  },
];

async function upsertSeedUsers() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const usersByName = new Map();

  for (const userData of seedUsers) {
    const user = await User.findOneAndUpdate(
      { email: userData.email },
      {
        $set: {
          ...userData,
          passwordHash,
          role: "local",
          businessVerificationStatus: "none",
          hasSeenSafetyTips: true,
          blockedUsers: [],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    usersByName.set(user.name, user);
  }

  return usersByName;
}

async function seedPosts(usersByName) {
  const createdPosts = [];
  const eventsByTitle = new Map(
    (await Event.find({ title: { $in: postSeeds.map((post) => post.eventTitle).filter(Boolean) } }))
      .map((event) => [event.title, event])
  );

  for (const postData of postSeeds) {
    const user = usersByName.get(postData.user);
    if (!user) {
      throw new Error(`Missing seed user: ${postData.user}`);
    }

    const { user: _userName, eventTitle, ...postFields } = postData;
    const linkedEvent = eventTitle ? eventsByTitle.get(eventTitle) : null;
    const post = await BuddyPost.create({
      ...postFields,
      ...(linkedEvent ? { eventId: linkedEvent._id } : {}),
      scheduleType: postFields.scheduleType || "single",
      createdBy: user._id,
      interestedUsers: [],
      replies: [],
      status: "open",
      updatedAt: postFields.createdAt,
    });

    createdPosts.push(post);
  }

  return createdPosts;
}

async function addSocialSignals(posts, usersByName) {
  const byText = (text) =>
    posts.find((post) => post.activityText.toLowerCase().includes(text));

  const tunnel = byText("tunnel mountain");
  const karaoke = byText("karaoke");
  const bookClub = byText("book club");

  if (tunnel) {
    tunnel.interestedUsers = [
      usersByName.get("Samir Patel")._id,
      usersByName.get("Noah Brooks")._id,
    ];
    tunnel.replies.push({
      text: "I am free tomorrow morning and happy with a casual pace.",
      createdBy: usersByName.get("Samir Patel")._id,
      createdAt: hoursAgo(1),
    });
    await tunnel.save();
  }

  if (karaoke) {
    karaoke.interestedUsers = [
      usersByName.get("Maya Chen")._id,
      usersByName.get("Theo Nguyen")._id,
    ];
    karaoke.replies.push({
      text: "I would join. Meeting somewhere public first sounds good.",
      createdBy: usersByName.get("Maya Chen")._id,
      createdAt: hoursAgo(0.5),
    });
    await karaoke.save();
  }

  if (bookClub) {
    bookClub.interestedUsers = [
      usersByName.get("Lucia Romero")._id,
      usersByName.get("Theo Nguyen")._id,
    ];
    bookClub.replies.push({
      text: "I am interested if the first book is not too intense.",
      createdBy: usersByName.get("Lucia Romero")._id,
      createdAt: hoursAgo(7),
    });
    await bookClub.save();
  }
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required.");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const [deletedBuddyPosts, deletedCommunityPosts] = await Promise.all([
    BuddyPost.deleteMany({}),
    CommunityPost.deleteMany({}),
  ]);
  const deletedSeedUsers = await User.deleteMany({ email: SEED_EMAIL_PATTERN });

  const usersByName = await upsertSeedUsers();
  const posts = await seedPosts(usersByName);
  await addSocialSignals(posts, usersByName);

  console.log("Community seed complete.");
  console.log(`Deleted BuddyPost documents: ${deletedBuddyPosts.deletedCount}`);
  console.log(
    `Deleted legacy CommunityPost documents: ${deletedCommunityPosts.deletedCount}`
  );
  console.log(`Deleted old community seed users: ${deletedSeedUsers.deletedCount}`);
  console.log(`Seed users ready: ${usersByName.size}`);
  console.log(`Buddy posts created: ${posts.length}`);
}

main()
  .catch((error) => {
    console.error("Community seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
