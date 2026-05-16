// test/api.test.js
// Basic integration tests for SummitScene backend
// Uses Mocha + Chai + Supertest
import { expect } from "chai";
import request from "supertest";
import app from "../index.js";

// Generate unique values so we don't clash if tests run multiple times.
const testRunId = Date.now();
const testName = `Test User ${testRunId}`;
const pendingBusinessName = `Pending Business ${testRunId}`;
const blockerName = `Blocker User ${testRunId}`;
const blockedName = `Blocked User ${testRunId}`;
const testEmail = `testuser_${testRunId}@example.com`;
const businessEmail = `business_${testRunId}@example.com`;
const testPassword = "TestPassword123!";
const originalAdminEmails = process.env.ADMIN_EMAILS || "";
let authToken = null;
let pendingBusinessToken = null;
let pendingBusinessUserId = null;

describe("SummitScene API", function () {
  // give a bit more time for DB connections on first run
  this.timeout(10000);

  /* -----------------------------------------
   * AUTH TESTS
   * --------------------------------------- */

  it("should register a new user (local role) at /api/auth/register", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: testName,
      email: testEmail,
      password: testPassword,
      role: "local",
      town: "Banff",
      userType: "seasonal",
      originallyFrom: "Melbourne",
      languages: ["English", "Spanish"],
      interests: ["hiking", "live music"],
    });

    expect(res.status).to.be.oneOf([200, 201]);
    expect(res.body).to.be.an("object");
    expect(res.body.user).to.include({
      town: "Banff",
      userType: "seasonal",
      originallyFrom: "Melbourne",
      businessVerificationStatus: "none",
    });
    expect(res.body.user.languages).to.deep.equal(["English", "Spanish"]);
    expect(res.body.user.interests).to.deep.equal(["hiking", "live music"]);
  });

  it("should reject duplicate public names at /api/auth/register", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: testName.toUpperCase(),
      email: `duplicate_name_${testRunId}@example.com`,
      password: testPassword,
      role: "local",
      town: "Banff",
    });

    expect(res.status).to.equal(409);
    expect(res.body.message).to.match(/public name is already taken/i);
  });

  it("should reject duplicate emails at /api/auth/register", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: `Duplicate Email ${testRunId}`,
      email: testEmail.toUpperCase(),
      password: testPassword,
      role: "local",
      town: "Banff",
    });

    expect(res.status).to.equal(409);
    expect(res.body.message).to.match(/email is already registered/i);
  });

  it("should log in the user and return a JWT at /api/auth/login", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testEmail,
      password: testPassword,
    });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("token");
    expect(res.body.token).to.be.a("string");

    authToken = res.body.token;
  });

  it("should save and retrieve upgraded social profile fields", async () => {
    const updateRes = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        town: "Canmore",
        userType: "local",
        originallyFrom: "Calgary",
        languages: ["English", "French"],
        interests: ["skiing", "trail running", "coffee"],
        profileImageUrl: "https://example.com/social-profile.jpg",
        socialAccounts: [
          {
            provider: "instagram",
            handle: "@summit_test",
            profileImageUrl: "https://example.com/social-profile.jpg",
          },
          {
            provider: "linkedin",
            url: "https://linkedin.com/in/summit-test",
          },
        ],
      });

    expect(updateRes.status).to.equal(200);
    expect(updateRes.body.user).to.include({
      town: "Canmore",
      userType: "local",
      originallyFrom: "Calgary",
      profileImageUrl: "https://example.com/social-profile.jpg",
    });
    expect(updateRes.body.user.languages).to.deep.equal(["English", "French"]);
    expect(updateRes.body.user.interests).to.deep.equal([
      "skiing",
      "trail running",
      "coffee",
    ]);
    const updatedInstagram = updateRes.body.user.socialAccounts.find(
      (account) => account.provider === "instagram"
    );
    expect(updatedInstagram).to.include({
      handle: "@summit_test",
      profileImageUrl: "https://example.com/social-profile.jpg",
      verified: false,
    });

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${authToken}`);

    expect(meRes.status).to.equal(200);
    expect(meRes.body.user).to.include({
      town: "Canmore",
      userType: "local",
      originallyFrom: "Calgary",
      profileImageUrl: "https://example.com/social-profile.jpg",
    });
    expect(meRes.body.user.languages).to.deep.equal(["English", "French"]);
    expect(meRes.body.user.interests).to.deep.equal([
      "skiing",
      "trail running",
      "coffee",
    ]);
    const retrievedInstagram = meRes.body.user.socialAccounts.find(
      (account) => account.provider === "instagram"
    );
    expect(retrievedInstagram).to.include({
      handle: "@summit_test",
      profileImageUrl: "https://example.com/social-profile.jpg",
      verified: false,
    });
  });

  it("should mark safety tips as seen", async () => {
    const res = await request(app)
      .patch("/api/users/me/safety-tips-seen")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).to.equal(200);
    expect(res.body.user).to.include({
      hasSeenSafetyTips: true,
    });
  });

  it("should delete the logged-in account and invalidate future session restore", async () => {
    const deleteEmail = `delete_me_${testRunId}@example.com`;
    const registerRes = await request(app).post("/api/auth/register").send({
      name: `Delete Me ${testRunId}`,
      email: deleteEmail,
      password: testPassword,
      role: "local",
      town: "Banff",
    });

    expect(registerRes.status).to.be.oneOf([200, 201]);
    expect(registerRes.body.token).to.be.a("string");

    const deleteRes = await request(app)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${registerRes.body.token}`);

    expect(deleteRes.status).to.equal(200);
    expect(deleteRes.body.message).to.match(/account deleted/i);

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${registerRes.body.token}`);

    expect(meRes.status).to.equal(404);
  });

  /* -----------------------------------------
   * EVENTS TESTS
   * --------------------------------------- */

  it("should fetch events at GET /api/events", async () => {
    const res = await request(app).get("/api/events");

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array");
  });

  it("should let an authenticated user toggle event attendance", async () => {
    const eventsRes = await request(app).get("/api/events");
    expect(eventsRes.status).to.equal(200);
    expect(eventsRes.body).to.be.an("array").that.is.not.empty;

    const eventId = eventsRes.body[0]._id;
    const goingRes = await request(app)
      .post(`/api/events/${eventId}/attendance`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(goingRes.status).to.equal(200);
    expect(goingRes.body).to.include({
      isGoing: true,
    });
    expect(goingRes.body.attendeesCount).to.be.at.least(1);
    expect(
      goingRes.body.event.attendees.some(
        (attendee) => attendee.name === testName
      )
    ).to.equal(true);

    const notGoingRes = await request(app)
      .post(`/api/events/${eventId}/attendance`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(notGoingRes.status).to.equal(200);
    expect(notGoingRes.body).to.include({
      isGoing: false,
    });
  });

  it("should save event preferences and return reminder notifications", async () => {
    const eventsRes = await request(app).get("/api/events");
    expect(eventsRes.status).to.equal(200);
    expect(eventsRes.body).to.be.an("array").that.is.not.empty;

    const eventId = eventsRes.body[0]._id;

    const saveRes = await request(app)
      .patch(`/api/event-preferences/${eventId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        saved: true,
        savedReminderEnabled: true,
        reminderTime: "3h",
      });

    expect(saveRes.status).to.equal(200);
    expect(saveRes.body).to.include({
      saved: true,
      savedReminderEnabled: true,
      reminderTime: "3h",
    });

    const listRes = await request(app)
      .get("/api/event-preferences")
      .set("Authorization", `Bearer ${authToken}`);

    expect(listRes.status).to.equal(200);
    expect(listRes.body).to.be.an("array");
    expect(listRes.body.some((preference) => preference.saved)).to.equal(true);

    const notificationsRes = await request(app)
      .get("/api/event-preferences/notifications")
      .set("Authorization", `Bearer ${authToken}`);

    expect(notificationsRes.status).to.equal(200);
    expect(notificationsRes.body).to.be.an("array");
    expect(
      notificationsRes.body.some(
        (notification) =>
          notification.type === "event-reminder" &&
          notification.reminderTime === "3h"
      )
    ).to.equal(true);
  });

  it("should hide event attendees from users they blocked or were blocked by", async () => {
    const blockerEmail = `blocker_${Date.now()}@example.com`;
    const blockedEmail = `blocked_${Date.now()}@example.com`;

    const blockerRegister = await request(app).post("/api/auth/register").send({
      name: blockerName,
      email: blockerEmail,
      password: testPassword,
      role: "local",
      town: "Banff",
    });
    const blockedRegister = await request(app).post("/api/auth/register").send({
      name: blockedName,
      email: blockedEmail,
      password: testPassword,
      role: "local",
      town: "Canmore",
    });

    const blockerToken = blockerRegister.body.token;
    const blockedToken = blockedRegister.body.token;
    const blockerId = blockerRegister.body.user._id;

    const eventsRes = await request(app).get("/api/events");
    const eventId = eventsRes.body[0]._id;

    await request(app)
      .post(`/api/events/${eventId}/attendance`)
      .set("Authorization", `Bearer ${blockerToken}`);

    await request(app)
      .post(`/api/users/${blockedRegister.body.user._id}/block`)
      .set("Authorization", `Bearer ${blockerToken}`);

    const blockedViewRes = await request(app)
      .get(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${blockedToken}`);

    expect(blockedViewRes.status).to.equal(200);
    expect(
      blockedViewRes.body.attendees.some((attendee) => attendee._id === blockerId)
    ).to.equal(false);

    await request(app)
      .post(`/api/events/${eventId}/attendance`)
      .set("Authorization", `Bearer ${blockerToken}`);
  });

  it("should put new business profiles into pending verification", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: pendingBusinessName,
      email: businessEmail,
      password: testPassword,
      role: "business",
      town: "Banff",
      lookingFor: "Live music venue",
      website: "https://example.com",
    });

    expect(res.status).to.be.oneOf([200, 201]);
    expect(res.body).to.have.property("token");
    expect(res.body.user).to.include({
      role: "business",
      businessVerificationStatus: "pending",
    });

    pendingBusinessToken = res.body.token;
    pendingBusinessUserId = res.body.user._id;
  });

  it("should NOT allow a pending business profile to create an event", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${pendingBusinessToken}`)
      .send({
        title: "Pending Business Event",
        description: "This should fail until verified.",
        town: "Banff",
        category: "Festivals",
        date: "2026-12-31",
        time: "18:00",
      });

    expect(res.status).to.equal(403);
    expect(res.body.message).to.match(/verified business/i);
  });

  it("should let an admin approve a pending business profile", async () => {
    process.env.ADMIN_EMAILS = "";

    const nonAdminRes = await request(app)
      .get("/api/users/admin/business-requests")
      .set("Authorization", `Bearer ${authToken}`);

    expect(nonAdminRes.status).to.equal(403);

    process.env.ADMIN_EMAILS = testEmail;

    const listRes = await request(app)
      .get("/api/users/admin/business-requests")
      .set("Authorization", `Bearer ${authToken}`);

    expect(listRes.status).to.equal(200);
    expect(
      listRes.body.some((requestUser) => requestUser._id === pendingBusinessUserId)
    ).to.equal(true);

    const approveRes = await request(app)
      .patch(`/api/users/admin/business-requests/${pendingBusinessUserId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ status: "verified" });

    expect(approveRes.status).to.equal(200);
    expect(approveRes.body.user).to.include({
      role: "business",
      businessVerificationStatus: "verified",
    });

    const eventRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${pendingBusinessToken}`)
      .send({
        title: "Approved Business Event",
        description: "This should work after admin approval.",
        town: "Banff",
        category: "Festivals",
        date: "2026-12-31",
        time: "18:00",
        address: "100 Banff Avenue, Banff, AB",
      });

    expect(eventRes.status).to.equal(201);
    process.env.ADMIN_EMAILS = originalAdminEmails;
  });

  it("should allow a pending business profile to switch back to local", async () => {
    const res = await request(app)
      .patch("/api/users/revert-to-local")
      .set("Authorization", `Bearer ${pendingBusinessToken}`);

    expect(res.status).to.equal(200);
    expect(res.body.user).to.include({
      role: "local",
      businessVerificationStatus: "none",
    });
  });

  // API requires a BUSINESS user for creating events,
  // this test simply checks that a LOCAL user is blocked.
  // That still proves the middleware is working.
  it("should NOT allow a local user to create an event (403 or 401)", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        title: "Test Event",
        description: "This should fail for local user",
        town: "Banff",
        category: "Live Music",
        date: "2025-12-31",
        time: "18:00",
      });

    expect(res.status).to.be.oneOf([401, 403]);
  });

  it("should allow an admin local account to create an official event", async () => {
    process.env.ADMIN_EMAILS = testEmail;

    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        title: "Admin Test Event",
        description: "Admins can test the business posting side.",
        town: "Banff",
        category: "Live Music",
        date: "2026-12-30",
        time: "18:00",
        address: "100 Banff Avenue, Banff, AB",
      });

    expect(res.status).to.equal(201);
    expect(res.body).to.include({
      title: "Admin Test Event",
      town: "Banff",
    });

    process.env.ADMIN_EMAILS = originalAdminEmails;
  });

  it("should filter events by a main category group", async () => {
    const res = await request(app).get(
      "/api/events?category=All%20Music%20%26%20Nightlife"
    );

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array");
    expect(
      res.body.every((event) =>
        [
          "Live Music",
          "DJs",
          "Open Mic",
          "Karaoke",
          "Dance Nights",
          "Festivals",
          "Concerts",
          "Pub Nights",
          "After Parties",
          "Comedy",
        ].includes(event.category)
      )
    ).to.equal(true);
  });

  /* -----------------------------------------
   * COMMUNITY TESTS
   * --------------------------------------- */

  it("should fetch community posts at GET /api/community", async () => {
    const res = await request(app)
      .get("/api/community")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array");
  });

  it("should allow an authenticated user to create a community post", async () => {
    const res = await request(app)
      .post("/api/community")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "highwayconditions",
        town: "Banff",
        body: "Testing conditions on Highway 1.",
        title: "Highway check",
        targetDate: "2025-12-31",
      });

    expect(res.status).to.be.oneOf([200, 201]);
    expect(res.body).to.be.an("object");

  });

  /* -----------------------------------------
   * BUDDY POST TESTS
   * --------------------------------------- */

  it("should save and retrieve a buddy post", async () => {
    const createRes = await request(app)
      .post("/api/buddy-posts")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "hiking",
        category: "Hiking",
        communityType: "local-plan",
        activityText: "Looking for someone to hike Tunnel Mountain after work.",
        date: "2026-05-15",
        time: "17:30",
        town: "Banff",
        skillLevel: "casual",
        groupSizePreference: "small-group",
      });

    expect(createRes.status).to.equal(201);
    expect(createRes.body).to.include({
      type: "hiking",
      category: "Hiking",
      communityType: "local-plan",
      activityText: "Looking for someone to hike Tunnel Mountain after work.",
      date: "2026-05-15",
      time: "17:30",
      town: "Banff",
      skillLevel: "casual",
      groupSizePreference: "small-group",
      status: "open",
    });
    expect(createRes.body.createdBy).to.include({
      name: testName,
      town: "Canmore",
      userType: "local",
      originallyFrom: "Calgary",
    });
    expect(createRes.body.eventId).to.equal(undefined);

    const listRes = await request(app)
      .get("/api/buddy-posts?category=Hiking&town=Banff")
      .set("Authorization", `Bearer ${authToken}`);

    expect(listRes.status).to.equal(200);
    expect(listRes.body).to.be.an("array");
    const listedPost = listRes.body.find(
      (post) => post._id === createRes.body._id
    );
    expect(listedPost).to.include({
      type: "hiking",
      category: "Hiking",
      communityType: "local-plan",
      town: "Banff",
      groupSizePreference: "small-group",
    });

    const languageDateRes = await request(app)
      .get("/api/buddy-posts?language=french&date=2026-05-15")
      .set("Authorization", `Bearer ${authToken}`);

    expect(languageDateRes.status).to.equal(200);
    expect(languageDateRes.body).to.be.an("array");
    expect(
      languageDateRes.body.some((post) => post._id === createRes.body._id)
    ).to.equal(true);

    const discGolfRes = await request(app)
      .post("/api/buddy-posts")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "hiking",
        category: "Climbing",
        activityText: "Looking for a climbing partner after work.",
        date: "2026-05-16",
        time: "18:00",
        town: "Canmore",
        skillLevel: "beginner",
        groupSizePreference: "any",
      });

    expect(discGolfRes.status).to.equal(201);
    expect(discGolfRes.body).to.include({
      type: "hiking",
      category: "Climbing",
      skillLevel: "beginner",
      groupSizePreference: "any",
    });

    const recurringRes = await request(app)
      .post("/api/buddy-posts")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "general",
        category: "Local Clubs",
        communityType: "group",
        activityText: "Starting a casual monthly book club.",
        date: "2026-05-20",
        time: "19:00",
        town: "Canmore",
        groupSizePreference: "small-group",
        scheduleType: "recurring",
        recurrence: {
          frequency: "monthly",
          weekday: "Wednesday",
          untilDate: "2026-09-30",
        },
      });

    expect(recurringRes.status).to.equal(201);
    expect(recurringRes.body).to.include({
      type: "general",
      category: "Local Clubs",
      communityType: "group",
      scheduleType: "recurring",
    });
    expect(recurringRes.body.recurrence).to.include({
      frequency: "monthly",
      weekday: "Wednesday",
      untilDate: "2026-09-30",
    });

    const detailRes = await request(app)
      .get(`/api/buddy-posts/${createRes.body._id}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(detailRes.status).to.equal(200);
    expect(detailRes.body).to.include({
      _id: createRes.body._id,
      type: "hiking",
      category: "Hiking",
      activityText: "Looking for someone to hike Tunnel Mountain after work.",
    });

    const karaokeRes = await request(app)
      .post("/api/buddy-posts")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "event",
        category: "Karaoke",
        communityType: "local-plan",
        activityText: "Anyone want to go to karaoke night?",
        date: "2026-05-22",
        time: "21:00",
        town: "Banff",
        groupSizePreference: "small-group",
      });

    expect(karaokeRes.status).to.equal(201);
    expect(karaokeRes.body).to.include({
      type: "event",
      category: "Karaoke",
      communityType: "local-plan",
      town: "Banff",
    });

    const newInTownRes = await request(app)
      .post("/api/buddy-posts")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "general",
        category: "Cultural Events",
        communityType: "new-in-town",
        activityText: "New in town and looking to meet people for easy walks.",
        date: "2026-05-23",
        town: "Canmore",
        groupSizePreference: "any",
      });

    expect(newInTownRes.status).to.equal(201);
    expect(newInTownRes.body).to.include({
      type: "general",
      communityType: "new-in-town",
      category: "Cultural Events",
    });

    const newInTownListRes = await request(app)
      .get("/api/buddy-posts?communityType=new-in-town")
      .set("Authorization", `Bearer ${authToken}`);

    expect(newInTownListRes.status).to.equal(200);
    expect(
      newInTownListRes.body.some((post) => post._id === newInTownRes.body._id)
    ).to.equal(true);

    const expiredPlanRes = await request(app)
      .post("/api/buddy-posts")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "event",
        category: "Live Music",
        communityType: "local-plan",
        activityText: "Old plan that should not stay in the live feed.",
        date: "2020-01-01",
        time: "19:00",
        town: "Banff",
        groupSizePreference: "small-group",
      });

    expect(expiredPlanRes.status).to.equal(201);

    const liveFeedRes = await request(app)
      .get("/api/buddy-posts?communityType=local-plan")
      .set("Authorization", `Bearer ${authToken}`);

    expect(liveFeedRes.status).to.equal(200);
    expect(
      liveFeedRes.body.some((post) => post._id === expiredPlanRes.body._id)
    ).to.equal(false);

    const includeExpiredRes = await request(app)
      .get("/api/buddy-posts?communityType=local-plan&includeExpired=true")
      .set("Authorization", `Bearer ${authToken}`);

    expect(includeExpiredRes.status).to.equal(200);
    expect(
      includeExpiredRes.body.some((post) => post._id === expiredPlanRes.body._id)
    ).to.equal(true);

    const karaokeListRes = await request(app)
      .get("/api/buddy-posts?category=Karaoke")
      .set("Authorization", `Bearer ${authToken}`);

    expect(karaokeListRes.status).to.equal(200);
    expect(
      karaokeListRes.body.some((post) => post._id === karaokeRes.body._id)
    ).to.equal(true);

    const otherUserPostRes = await request(app)
      .post("/api/buddy-posts")
      .set("Authorization", `Bearer ${pendingBusinessToken}`)
      .send({
        type: "walking",
        category: "Hiking",
        communityType: "local-plan",
        activityText: "Easy public walk by the river.",
        date: "2026-06-01",
        time: "10:00",
        town: "Canmore",
        groupSizePreference: "small-group",
      });

    expect(otherUserPostRes.status).to.equal(201);

    const blockRes = await request(app)
      .post(`/api/users/${otherUserPostRes.body.createdBy._id}/block`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(blockRes.status).to.equal(200);
    expect(blockRes.body.user.blockedUsers).to.include(
      otherUserPostRes.body.createdBy._id
    );

    const blockedFeedRes = await request(app)
      .get("/api/buddy-posts?town=Canmore")
      .set("Authorization", `Bearer ${authToken}`);

    expect(blockedFeedRes.status).to.equal(200);
    expect(
      blockedFeedRes.body.some((post) => post._id === otherUserPostRes.body._id)
    ).to.equal(false);

    const blockedUsersRes = await request(app)
      .get("/api/users/me/blocked-users")
      .set("Authorization", `Bearer ${authToken}`);

    expect(blockedUsersRes.status).to.equal(200);
    expect(
      blockedUsersRes.body.blockedUsers.some(
        (blockedUser) => blockedUser._id === otherUserPostRes.body.createdBy._id
      )
    ).to.equal(true);

    const unblockRes = await request(app)
      .delete(`/api/users/${otherUserPostRes.body.createdBy._id}/block`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(unblockRes.status).to.equal(200);
    expect(unblockRes.body.user.blockedUsers).to.not.include(
      otherUserPostRes.body.createdBy._id
    );

    const interestRes = await request(app)
      .post(`/api/buddy-posts/${createRes.body._id}/interested`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(interestRes.status).to.equal(200);
    expect(interestRes.body.interestedUsers).to.be.an("array").with.length(1);
    expect(interestRes.body.interestedUsers[0]).to.include({
      name: testName,
    });

    const replyRes = await request(app)
      .post(`/api/buddy-posts/${createRes.body._id}/replies`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        text: "I am interested. What time are you thinking?",
      });

    expect(replyRes.status).to.equal(201);
    expect(replyRes.body.replies).to.be.an("array").with.length(1);
    expect(replyRes.body.replies[0]).to.include({
      text: "I am interested. What time are you thinking?",
    });
    expect(replyRes.body.replies[0].createdBy).to.include({
      name: testName,
    });

    const updateReplyRes = await request(app)
      .patch(
        `/api/buddy-posts/${createRes.body._id}/replies/${replyRes.body.replies[0]._id}`
      )
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        text: "Updated reply text.",
      });

    expect(updateReplyRes.status).to.equal(200);
    expect(updateReplyRes.body.replies[0]).to.include({
      text: "Updated reply text.",
    });

    const reportPostRes = await request(app)
      .post("/api/reports")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        targetType: "buddyPost",
        targetId: createRes.body._id,
        reason: "unsafe",
        details: "Test safety report.",
      });

    expect(reportPostRes.status).to.equal(201);
    expect(reportPostRes.body.report).to.include({
      targetType: "buddyPost",
      reason: "unsafe",
      status: "open",
    });

    const reportReplyRes = await request(app)
      .post("/api/reports")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        targetType: "buddyReply",
        targetId: replyRes.body.replies[0]._id,
        parentType: "buddyPost",
        parentId: createRes.body._id,
        reason: "harassment",
      });

    expect(reportReplyRes.status).to.equal(201);
    expect(reportReplyRes.body.report).to.include({
      targetType: "buddyReply",
      parentType: "buddyPost",
      reason: "harassment",
    });

    process.env.ADMIN_EMAILS = "";

    const nonAdminReportsRes = await request(app)
      .get("/api/reports")
      .set("Authorization", `Bearer ${authToken}`);

    expect(nonAdminReportsRes.status).to.equal(403);

    process.env.ADMIN_EMAILS = testEmail;

    const adminReportsRes = await request(app)
      .get("/api/reports")
      .set("Authorization", `Bearer ${authToken}`);

    expect(adminReportsRes.status).to.equal(200);
    expect(adminReportsRes.body).to.be.an("array").that.is.not.empty;

    const reviewedReportRes = await request(app)
      .patch(`/api/reports/${adminReportsRes.body[0]._id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        status: "reviewed",
        actionTaken: "other",
        moderatorNote: "Reviewed in integration test.",
      });

    expect(reviewedReportRes.status).to.equal(200);
    expect(reviewedReportRes.body).to.include({
      status: "reviewed",
      actionTaken: "other",
      moderatorNote: "Reviewed in integration test.",
    });

    process.env.ADMIN_EMAILS = originalAdminEmails;

    const deleteReplyRes = await request(app)
      .delete(
        `/api/buddy-posts/${createRes.body._id}/replies/${replyRes.body.replies[0]._id}`
      )
      .set("Authorization", `Bearer ${authToken}`);

    expect(deleteReplyRes.status).to.equal(200);
    expect(deleteReplyRes.body.replies).to.be.an("array").with.length(0);
  });
});
