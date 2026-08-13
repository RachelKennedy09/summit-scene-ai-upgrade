// test/api.test.js
// Basic integration tests for SummitScene backend
// Uses Mocha + Chai + Supertest
import { expect } from "chai";
import request from "supertest";
import app from "../index.js";
import ImportCandidate from "../models/ImportCandidate.js";
import { getAdminEmails, isAdminEmail } from "../utils/adminAccess.js";
import { cleanupGeneratedTestData } from "../utils/generatedTestDataCleanup.js";
import { getCategoryTagGroupsForCategories } from "../../constants/eventCategories.js";

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
let emailVerificationToken = null;
let sharedTestEventId = null;

function formatTestDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function ensureSharedTestEvent() {
  if (sharedTestEventId) return sharedTestEventId;

  process.env.ADMIN_EMAILS = testEmail;
  try {
    const createRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        title: `Shared Test Event ${testRunId}`,
        description: "Shared event for attendance and reminder integration tests.",
        town: "Banff",
        category: "Live Music",
        date: "2026-12-30",
        time: "18:00",
        locationName: "Banff Test Venue",
        address: "100 Banff Avenue, Banff, AB",
        importedBySummitScene: true,
      });

    expect(createRes.status).to.equal(201);
    sharedTestEventId = createRes.body._id;
    return sharedTestEventId;
  } finally {
    process.env.ADMIN_EMAILS = originalAdminEmails;
  }
}

describe("SummitScene API", function () {
  // give a bit more time for DB connections on first run
  this.timeout(10000);

  before(async () => {
    await cleanupGeneratedTestData();
  });

  after(async () => {
    process.env.ADMIN_EMAILS = originalAdminEmails;
    await cleanupGeneratedTestData();
  });

  it("should include only the main account in default admin access", () => {
    expect(getAdminEmails()).to.include("hello@summitscene.ca");
    expect(getAdminEmails()).to.not.include("reviewer@summitscene.ca");
    expect(isAdminEmail("Hello@SummitScene.ca")).to.equal(true);
    expect(isAdminEmail("Reviewer@SummitScene.ca")).to.equal(false);
  });

  it("should return app version requirements", async () => {
    const res = await request(app).get("/api/app-version");

    expect(res.status).to.equal(200);
    expect(res.body).to.include.keys([
      "minimumSupportedVersion",
      "latestVersion",
      "iosStoreUrl",
      "androidStoreUrl",
      "optionalUpdateMessage",
      "message",
    ]);
    expect(res.body.minimumSupportedVersion).to.be.a("string");
  });

  it("should show all category tag groups when Other is selected", () => {
    const groups = getCategoryTagGroupsForCategories(["Other"]);
    const groupTitles = groups.map((group) => group.title);

    expect(groupTitles).to.include("Community");
    expect(groupTitles).to.include("Outdoors & Sports");
    expect(groupTitles).to.not.include("Other");
    expect(groups.some((group) => group.options.includes("Youth Events"))).to.equal(true);
  });

  /* -----------------------------------------
   * AUTH TESTS
   * --------------------------------------- */

  it("should register a new user (local role) at /api/auth/register", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: testName,
      email: testEmail,
      password: testPassword,
      role: "local",
      acceptedAgeTerms: true,
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
    expect(res.body.emailVerificationToken).to.be.a("string");
    emailVerificationToken = res.body.emailVerificationToken;
  });

  it("should verify a registered user's email", async () => {
    const res = await request(app).post("/api/auth/verify-email").send({
      token: emailVerificationToken,
    });

    expect(res.status).to.equal(200);
    expect(res.body.user).to.include({
      emailVerified: true,
    });
  });

  it("should allow duplicate public names at /api/auth/register", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: testName.toUpperCase(),
      email: `duplicate_name_${testRunId}@example.com`,
      password: testPassword,
      role: "local",
      acceptedAgeTerms: true,
      town: "Banff",
    });

    expect(res.status).to.be.oneOf([200, 201]);
    expect(res.body.user.name).to.equal(testName.toUpperCase());
  });

  it("should reject duplicate emails at /api/auth/register", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: `Duplicate Email ${testRunId}`,
      email: testEmail.toUpperCase(),
      password: testPassword,
      role: "local",
      acceptedAgeTerms: true,
      town: "Banff",
    });

    expect(res.status).to.equal(409);
    expect(res.body.message).to.match(/email is already registered/i);
  });

  it("should reject weak passwords at /api/auth/register", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: `Weak Password ${testRunId}`,
      email: `weak_password_${testRunId}@example.com`,
      password: "password1",
      role: "local",
      acceptedAgeTerms: true,
      town: "Banff",
    });

    expect(res.status).to.equal(400);
    expect(res.body.message).to.match(/at least 10 characters/i);
  });

  it("should require 18+ agreement at /api/auth/register", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: `Missing Age Agreement ${testRunId}`,
      email: `missing_age_${testRunId}@example.com`,
      password: testPassword,
      role: "local",
      town: "Banff",
    });

    expect(res.status).to.equal(400);
    expect(res.body.message).to.match(/at least 18/i);
  });

  it("should report email availability before signup continues", async () => {
    const takenRes = await request(app)
      .get("/api/auth/email-availability")
      .query({ email: testEmail.toUpperCase() });

    expect(takenRes.status).to.equal(200);
    expect(takenRes.body).to.deep.equal({ available: false });

    const availableRes = await request(app)
      .get("/api/auth/email-availability")
      .query({ email: `available_${testRunId}@example.com` });

    expect(availableRes.status).to.equal(200);
    expect(availableRes.body).to.deep.equal({ available: true });
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

  it("should request and complete a password reset", async () => {
    const resetEmail = `reset_${testRunId}@example.com`;
    const resetPassword = "ResetPassword123!";
    const newPassword = "NewResetPassword123!";

    const registerRes = await request(app).post("/api/auth/register").send({
      name: `Reset User ${testRunId}`,
      email: resetEmail,
      password: resetPassword,
      role: "local",
      acceptedAgeTerms: true,
      town: "Banff",
    });

    expect(registerRes.status).to.be.oneOf([200, 201]);

    const forgotRes = await request(app).post("/api/auth/forgot-password").send({
      email: resetEmail,
    });

    expect(forgotRes.status).to.equal(200);
    expect(forgotRes.body.passwordResetToken).to.be.a("string");

    const resetRes = await request(app).post("/api/auth/reset-password").send({
      token: forgotRes.body.passwordResetToken,
      password: newPassword,
    });

    expect(resetRes.status).to.equal(200);

    const oldLoginRes = await request(app).post("/api/auth/login").send({
      email: resetEmail,
      password: resetPassword,
    });
    expect(oldLoginRes.status).to.equal(401);

    const newLoginRes = await request(app).post("/api/auth/login").send({
      email: resetEmail,
      password: newPassword,
    });
    expect(newLoginRes.status).to.equal(200);
  });

  it("should confirm a pending email change", async () => {
    const changeEmail = `change_${testRunId}@example.com`;
    const changedEmail = `changed_${testRunId}@example.com`;

    const registerRes = await request(app).post("/api/auth/register").send({
      name: `Change Email User ${testRunId}`,
      email: changeEmail,
      password: testPassword,
      role: "local",
      acceptedAgeTerms: true,
      town: "Banff",
    });

    expect(registerRes.status).to.be.oneOf([200, 201]);

    const requestChangeRes = await request(app)
      .post("/api/auth/request-email-change")
      .set("Authorization", `Bearer ${registerRes.body.token}`)
      .send({
        newEmail: changedEmail,
        currentPassword: testPassword,
      });

    expect(requestChangeRes.status).to.equal(200);
    expect(requestChangeRes.body.user).to.include({
      pendingEmail: changedEmail,
    });
    expect(requestChangeRes.body.emailChangeToken).to.be.a("string");

    const confirmRes = await request(app)
      .post("/api/auth/confirm-email-change")
      .send({
        token: requestChangeRes.body.emailChangeToken,
      });

    expect(confirmRes.status).to.equal(200);
    expect(confirmRes.body.user).to.include({
      email: changedEmail,
      emailVerified: true,
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      email: changedEmail,
      password: testPassword,
    });
    expect(loginRes.status).to.equal(200);
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
            provider: "facebook",
            url: "https://facebook.com/summittest",
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
      acceptedAgeTerms: true,
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

    expect(meRes.status).to.equal(401);
  });

  /* -----------------------------------------
   * EVENTS TESTS
   * --------------------------------------- */

  it("should fetch events at GET /api/events", async () => {
    const res = await request(app).get("/api/events");

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array");
  });

  it("should only return tomorrow events for the Tomorrow date filter", async () => {
    process.env.ADMIN_EMAILS = testEmail;
    const tomorrowTitle = `Tomorrow Filter Event ${testRunId}`;
    const laterTitle = `Later Filter Event ${testRunId}`;

    try {
      const tomorrowRes = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: tomorrowTitle,
          description: "Should appear in Tomorrow only.",
          town: "Banff",
          category: "Live Music",
          date: formatTestDate(1),
          time: "8:30 PM",
          address: "100 Banff Avenue, Banff, AB",
        });

      const laterRes = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: laterTitle,
          description: "Should not appear in Tomorrow.",
          town: "Banff",
          category: "Live Music",
          date: formatTestDate(2),
          time: "8:30 PM",
          address: "100 Banff Avenue, Banff, AB",
        });

      expect(tomorrowRes.status).to.equal(201);
      expect(laterRes.status).to.equal(201);

      const filterRes = await request(app).get(
        "/api/events?dateFilter=Tomorrow"
      );
      const titles = filterRes.body.map((event) => event.title);

      expect(filterRes.status).to.equal(200);
      expect(titles).to.include(tomorrowTitle);
      expect(titles).to.not.include(laterTitle);
    } finally {
      process.env.ADMIN_EMAILS = originalAdminEmails;
    }
  });

  it("should let an authenticated user toggle event attendance", async () => {
    const eventId = await ensureSharedTestEvent();
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
    const eventId = await ensureSharedTestEvent();

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
      acceptedAgeTerms: true,
      town: "Banff",
    });
    const blockedRegister = await request(app).post("/api/auth/register").send({
      name: blockedName,
      email: blockedEmail,
      password: testPassword,
      role: "local",
      acceptedAgeTerms: true,
      town: "Canmore",
    });

    const blockerToken = blockerRegister.body.token;
    const blockedToken = blockedRegister.body.token;
    const blockerId = blockerRegister.body.user._id;

    const eventId = await ensureSharedTestEvent();

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
      acceptedAgeTerms: true,
      town: "Banff",
      lookingFor: "Live music venue",
      bio: "A real local venue hosting live music and community events.",
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

  it("should accept business profile categories without the old category text field", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: `Category Business ${testRunId}`,
      email: `business_categories_${testRunId}@example.com`,
      password: testPassword,
      role: "business",
      acceptedAgeTerms: true,
      town: "Canmore",
      interests: ["Food & Drink", "Restaurant Specials"],
      businessVibeTags: ["Social", "Other"],
      bio: "A real local business using selected categories and tags.",
      website: "https://example.com",
    });

    expect(res.status).to.be.oneOf([200, 201]);
    expect(res.body.user).to.include({
      role: "business",
      businessVerificationStatus: "pending",
      town: "Canmore",
    });
    expect(res.body.user.interests).to.include("Food & Drink");
    expect(res.body.user.interests).to.include("Restaurant Specials");
  });

  it("should accept multiple business profile towns", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: `Multi Town Business ${testRunId}`,
      email: `multi_town_business_${testRunId}@example.com`,
      password: testPassword,
      role: "business",
      acceptedAgeTerms: true,
      town: "Banff",
      towns: ["Banff", "Canmore", "Lake Louise"],
      interests: ["Food & Drink"],
      bio: "A real local business serving multiple mountain towns.",
      website: "https://example.com",
    });

    expect(res.status).to.be.oneOf([200, 201]);
    expect(res.body.user.town).to.equal("Banff");
    expect(res.body.user.towns).to.deep.equal([
      "Banff",
      "Canmore",
      "Lake Louise",
    ]);
  });

  it("should return a clear validation error for overly long business descriptions", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: `Long Bio Business ${testRunId}`,
      email: `long_bio_business_${testRunId}@example.com`,
      password: testPassword,
      role: "business",
      acceptedAgeTerms: true,
      town: "Banff",
      interests: ["Food & Drink"],
      bio: "A".repeat(301),
      website: "https://example.com",
    });

    expect(res.status).to.equal(400);
    expect(res.body.message).to.be.a("string");
    expect(res.body.message).to.not.equal("Server error during registration.");
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
        locationName: "Banff Test Venue",
        address: "100 Banff Avenue, Banff, AB",
        importedBySummitScene: true,
      });

    expect(res.status).to.equal(201);
    expect(res.body).to.include({
      title: "Admin Test Event",
      town: "Banff",
      locationName: "Banff Test Venue",
      importedBySummitScene: true,
    });

    process.env.ADMIN_EMAILS = originalAdminEmails;
  });

  it("should infer imported host display for admin-created venue events", async () => {
    process.env.ADMIN_EMAILS = testEmail;

    try {
      const createRes = await request(app)
        .post("/api/events")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Admin Venue Host Event",
          description: "An admin-added event with a public venue host.",
          town: "Banff",
          category: "Live Music",
          date: "2026-12-30",
          time: "18:00",
          locationName: "The Boss Kitchen and Bar",
          address: "100 Banff Avenue, Banff, AB",
          importedBySummitScene: false,
        });

      expect(createRes.status).to.equal(201);
      expect(createRes.body.importedBySummitScene).to.not.equal(true);

      const detailRes = await request(app).get(`/api/events/${createRes.body._id}`);

      expect(detailRes.status).to.equal(200);
      expect(detailRes.body).to.include({
        locationName: "The Boss Kitchen and Bar",
        importedBySummitScene: true,
      });
    } finally {
      process.env.ADMIN_EMAILS = originalAdminEmails;
    }
  });

  it("should allow an admin to mark a business event as imported", async () => {
    const businessRes = await request(app).post("/api/auth/register").send({
      name: `Import Source Business ${testRunId}`,
      email: `import_source_${testRunId}@example.com`,
      password: testPassword,
      role: "business",
      acceptedAgeTerms: true,
      town: "Banff",
      lookingFor: "Local venue",
      bio: "A local venue with real events for visitors and residents.",
      website: "https://example.com",
    });

    expect(businessRes.status).to.be.oneOf([200, 201]);

    try {
      process.env.ADMIN_EMAILS = testEmail;

      const approveRes = await request(app)
        .patch(`/api/users/admin/business-requests/${businessRes.body.user._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ status: "verified" });

      expect(approveRes.status).to.equal(200);
    } finally {
      process.env.ADMIN_EMAILS = originalAdminEmails;
    }

    const createRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${businessRes.body.token}`)
      .send({
        title: "Business-owned Event",
        description: "A verified business posted this event.",
        town: "Banff",
        category: "Live Music",
        date: "2026-12-31",
        time: "19:00",
        address: "101 Banff Avenue, Banff, AB",
      });

    expect(createRes.status).to.equal(201);
    expect(createRes.body.importedBySummitScene).to.not.equal(true);

    try {
      process.env.ADMIN_EMAILS = testEmail;

      const updateRes = await request(app)
        .put(`/api/events/${createRes.body._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          locationName: "Banff Music Hall",
          importedBySummitScene: true,
        });

      expect(updateRes.status).to.equal(200);
      expect(updateRes.body).to.include({
        locationName: "Banff Music Hall",
        importedBySummitScene: true,
      });
    } finally {
      process.env.ADMIN_EMAILS = originalAdminEmails;
    }
  });

  it("should let an admin approve an import candidate into an event", async () => {
    process.env.ADMIN_EMAILS = testEmail;
    try {
      const candidate = await ImportCandidate.create({
        title: `Imported Candidate ${testRunId}`,
        description: "Candidate approval flow test.",
        town: "Banff",
        category: "Live Music",
        categories: ["Live Music"],
        venue: "Candidate Venue",
        address: "100 Banff Avenue, Banff, AB",
        startDate: "2026-12-31",
        startTime: "7:00 PM",
        sourceUrl: `https://example.com/imported-${testRunId}`,
        sourceName: "Example Import Source",
        confidenceScore: 95,
      });

      const res = await request(app)
        .post(`/api/event-import/candidates/${candidate._id}/approve`)
        .set("Authorization", `Bearer ${authToken}`)
        .send();

      expect(res.status).to.equal(201);
      expect(res.body.candidate.status).to.equal("approved");
      expect(res.body.event).to.include({
        title: `Imported Candidate ${testRunId}`,
        importedBySummitScene: true,
        sourceUrl: `https://example.com/imported-${testRunId}`,
      });
    } finally {
      process.env.ADMIN_EMAILS = originalAdminEmails;
    }
  });

  it("should return admin dashboard stats", async () => {
    process.env.ADMIN_EMAILS = "";

    const nonAdminRes = await request(app)
      .get("/api/users/admin/dashboard-stats")
      .set("Authorization", `Bearer ${authToken}`);

    expect(nonAdminRes.status).to.equal(403);

    process.env.ADMIN_EMAILS = testEmail;

    const res = await request(app)
      .get("/api/users/admin/dashboard-stats")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.include.keys([
      "totalUsers",
      "totalDatabaseUsers",
      "generatedTestUsers",
      "newUsersThisWeek",
      "activeUsersThisWeek",
      "totalBusinesses",
      "newBusinessesThisMonth",
      "totalEventsPosted",
      "eventsPostedThisWeek",
      "totalCommunityPosts",
      "replies",
      "likes",
      "locations",
      "openReports",
      "pendingBusinesses",
    ]);
    expect(res.body.totalUsers).to.be.a("number");
    expect(res.body.totalDatabaseUsers).to.be.a("number");
    expect(res.body.generatedTestUsers).to.be.a("number");
    expect(res.body.locations).to.include.keys([
      "banffUsers",
      "canmoreUsers",
      "lakeLouiseUsers",
    ]);

    process.env.ADMIN_EMAILS = originalAdminEmails;
  });

  it("should create an event with multiple searchable categories", async () => {
    process.env.ADMIN_EMAILS = testEmail;
    const title = `Multi Category Event ${testRunId}`;

    const createRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        title,
        description: "A class and sports meetup that should be found by each category.",
        town: "Canmore",
        category: "Wellness",
        categories: ["Wellness", "Tours & Experiences", "Outdoors & Sports"],
        categoryTags: [
          "Strength Training",
          "Sober Events",
          "Yoga Retreats",
          "Basketball",
          "Senior Events",
          "Youth Events",
        ],
        vibeTags: ["Sober-friendly", "Beginner-friendly"],
        duration: "3 hours",
        priceRange: "$60-$90",
        bookingUrl: "https://example.com/book-yoga-retreat",
        date: "2026-12-29",
        time: "18:00",
        address: "100 Banff Avenue, Banff, AB",
        latitude: 51.1762,
        longitude: -115.5708,
      });

    expect(createRes.status).to.equal(201);
    expect(createRes.body.category).to.equal("Wellness");
    expect(createRes.body.categories).to.deep.equal([
      "Wellness",
      "Tours & Experiences",
      "Outdoors & Sports",
    ]);
    expect(createRes.body.categoryTags).to.deep.equal([
      "Strength Training",
      "Sober Events",
      "Yoga Retreats",
      "Basketball",
      "Senior Events",
      "Youth Events",
    ]);
    expect(createRes.body.vibeTags).to.deep.equal([
      "Sober-friendly",
      "Beginner-friendly",
    ]);
    expect(createRes.body.duration).to.equal("3 hours");
    expect(createRes.body.priceRange).to.equal("$60-$90");
    expect(createRes.body.bookingUrl).to.equal(
      "https://example.com/book-yoga-retreat"
    );

    const filterRes = await request(app).get(
      "/api/events?category=Sober%20Events"
    );

    expect(filterRes.status).to.equal(200);
    expect(filterRes.body.some((event) => event.title === title)).to.equal(true);

    const sportsFilterRes = await request(app).get(
      "/api/events?category=Basketball"
    );

    expect(sportsFilterRes.status).to.equal(200);
    expect(sportsFilterRes.body.some((event) => event.title === title)).to.equal(
      true
    );

    const youthFilterRes = await request(app).get(
      "/api/events?category=Youth%20Events"
    );

    expect(youthFilterRes.status).to.equal(200);
    expect(youthFilterRes.body.some((event) => event.title === title)).to.equal(
      true
    );

    const seniorSearchRes = await request(app).get(
      "/api/events?search=senior"
    );

    expect(seniorSearchRes.status).to.equal(200);
    expect(seniorSearchRes.body.some((event) => event.title === title)).to.equal(
      true
    );

    const vibeSearchRes = await request(app).get(
      "/api/events?search=Sober-friendly"
    );

    expect(vibeSearchRes.status).to.equal(200);
    expect(vibeSearchRes.body.some((event) => event.title === title)).to.equal(
      true
    );

    const priceSearchRes = await request(app).get("/api/events?search=90");

    expect(priceSearchRes.status).to.equal(200);
    expect(priceSearchRes.body.some((event) => event.title === title)).to.equal(
      true
    );

    const partialPhraseSearchRes = await request(app).get(
      "/api/events?search=mountain%20basketball"
    );

    expect(partialPhraseSearchRes.status).to.equal(200);
    expect(
      partialPhraseSearchRes.body.some((event) => event.title === title)
    ).to.equal(true);

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
          "Music & Nightlife",
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

  it("should only show community-tagged events in the community event feed", async () => {
    process.env.ADMIN_EMAILS = testEmail;

    const regularTitle = `Regular Tour ${testRunId}`;
    const communityTitle = `Community Meal ${testRunId}`;
    const audienceOnlyTitle = `Community Focused Audience ${testRunId}`;

    const regularRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        title: regularTitle,
        description: "A visitor-friendly food tour that is not a community event.",
        town: "Banff",
        category: "Tours & Experiences",
        categories: ["Tours & Experiences"],
        categoryTags: ["Food Tours", "Visitor Experiences"],
        audience: "Visitors welcome, local-focused",
        date: "2099-07-01",
        time: "12:00",
        address: "100 Banff Avenue, Banff, AB",
      });

    expect(regularRes.status).to.equal(201);

    const communityRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        title: communityTitle,
        description: "A free meal for local support.",
        town: "Banff",
        category: "Community",
        categories: ["Community"],
        categoryTags: ["Free community meal"],
        audience: "Everyone welcome",
        date: "2099-07-02",
        time: "17:00",
        address: "100 Banff Avenue, Banff, AB",
      });

    expect(communityRes.status).to.equal(201);

    const audienceOnlyRes = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        title: audienceOnlyTitle,
        description: "An event explicitly marked community-focused.",
        town: "Canmore",
        category: "Food & Drink",
        categories: ["Food & Drink"],
        categoryTags: ["Coffee"],
        audience: "Community-focused",
        date: "2099-07-03",
        time: "10:00",
        address: "100 Banff Avenue, Banff, AB",
      });

    expect(audienceOnlyRes.status).to.equal(201);

    const feedRes = await request(app).get("/api/events?communityOnly=true");

    expect(feedRes.status).to.equal(200);
    expect(feedRes.body.some((event) => event.title === regularTitle)).to.equal(
      false
    );
    expect(feedRes.body.some((event) => event.title === communityTitle)).to.equal(
      true
    );
    expect(
      feedRes.body.some((event) => event.title === audienceOnlyTitle)
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

  it("should save and retrieve a buddy post", async function () {
    this.timeout(20000);
    const createRes = await request(app)
      .post("/api/buddy-posts")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "hiking",
        category: "Hiking",
        communityType: "local-plan",
        activityText: "Looking for someone to hike Tunnel Mountain after work.",
        imageUrl: "data:image/png;base64,dGVzdC1jb25uZWN0LXBob3Rv",
        date: "2099-06-15",
        time: "17:30",
        town: "Banff",
        skillLevel: "casual",
        groupSizePreference: "small-group",
      });

    expect(createRes.status).to.equal(201);
    expect(createRes.body).to.include({
      type: "hiking",
      category: "Outdoors & Sports",
      communityType: "local-plan",
      activityText: "Looking for someone to hike Tunnel Mountain after work.",
      imageUrl: "data:image/png;base64,dGVzdC1jb25uZWN0LXBob3Rv",
      date: "2099-06-15",
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
      .get("/api/buddy-posts?category=Hiking&town=Banff&includeExpired=true")
      .set("Authorization", `Bearer ${authToken}`);

    expect(listRes.status).to.equal(200);
    expect(listRes.body).to.be.an("array");
    const listedPost = listRes.body.find(
      (post) => post._id === createRes.body._id
    );
    expect(listedPost).to.include({
      type: "hiking",
      category: "Outdoors & Sports",
      communityType: "local-plan",
      town: "Banff",
      imageUrl: "data:image/png;base64,dGVzdC1jb25uZWN0LXBob3Rv",
      groupSizePreference: "small-group",
    });

    const languageDateRes = await request(app)
      .get("/api/buddy-posts?language=french&date=2099-06-15&includeExpired=true")
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
        date: "2099-06-16",
        time: "18:00",
        town: "Canmore",
        skillLevel: "beginner",
        groupSizePreference: "any",
      });

    expect(discGolfRes.status).to.equal(201);
    expect(discGolfRes.body).to.include({
      type: "hiking",
      category: "Outdoors & Sports",
      skillLevel: "beginner",
      groupSizePreference: "any",
    });

    const sportsRes = await request(app)
      .post("/api/buddy-posts")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "sports",
        category: "Soccer",
        categoryTags: ["Soccer", "Rugby"],
        activityText: "Looking for people for a casual field sports meetup.",
        date: "2099-06-17",
        time: "18:30",
        town: "Canmore",
        groupSizePreference: "any",
      });

    expect(sportsRes.status).to.equal(201);
    expect(sportsRes.body).to.include({
      type: "sports",
      category: "Outdoors & Sports",
      groupSizePreference: "any",
    });
    expect(sportsRes.body.categoryTags).to.deep.equal(["Soccer", "Rugby"]);

    const recurringRes = await request(app)
      .post("/api/buddy-posts")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "general",
        category: "Local Clubs",
        communityType: "group",
        activityText: "Starting a casual monthly book club.",
        date: "2099-06-20",
        time: "19:00",
        town: "Canmore",
        groupSizePreference: "small-group",
        scheduleType: "recurring",
        recurrence: {
          frequency: "monthly",
          weekday: "Wednesday",
          untilDate: "2099-09-30",
        },
      });

    expect(recurringRes.status).to.equal(201);
    expect(recurringRes.body).to.include({
      type: "general",
      category: "Community",
      communityType: "group",
      scheduleType: "recurring",
    });
    expect(recurringRes.body.recurrence).to.include({
      frequency: "monthly",
      weekday: "Wednesday",
      untilDate: "2099-09-30",
    });

    const multiCategoryGroupRes = await request(app)
      .post("/api/buddy-posts")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "general",
        category: "Community",
        categories: ["Community"],
        categoryTags: ["Book Clubs", "Sober Events"],
        communityType: "group",
        activityText: "Starting a sober book club group.",
        date: "2099-06-21",
        time: "18:30",
        town: "Canmore",
        groupSizePreference: "small-group",
        scheduleType: "recurring",
        recurrence: {
          frequency: "monthly",
          weekday: "Thursday",
        },
      });

    expect(multiCategoryGroupRes.status).to.equal(201);
    expect(multiCategoryGroupRes.body.category).to.equal("Community");
    expect(multiCategoryGroupRes.body.categories).to.deep.equal(["Community"]);
    expect(multiCategoryGroupRes.body.categoryTags).to.deep.equal([
      "Book Clubs",
      "Sober Events",
    ]);

    const soberGroupListRes = await request(app)
      .get("/api/buddy-posts?communityType=group&category=Sober%20Events")
      .set("Authorization", `Bearer ${authToken}`);

    expect(soberGroupListRes.status).to.equal(200);
    expect(
      soberGroupListRes.body.some(
        (post) => post._id === multiCategoryGroupRes.body._id
      )
    ).to.equal(true);

    const detailRes = await request(app)
      .get(`/api/buddy-posts/${createRes.body._id}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(detailRes.status).to.equal(200);
    expect(detailRes.body).to.include({
      _id: createRes.body._id,
      type: "hiking",
      category: "Outdoors & Sports",
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
        date: "2099-06-22",
        time: "21:00",
        town: "Banff",
        groupSizePreference: "small-group",
      });

    expect(karaokeRes.status).to.equal(201);
    expect(karaokeRes.body).to.include({
      type: "event",
      category: "Music & Nightlife",
      communityType: "local-plan",
      town: "Banff",
    });

    const multiCategoryPlanRes = await request(app)
      .post("/api/buddy-posts")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "event",
        category: "Food & Drink",
        categories: ["Food & Drink", "Wellness"],
        categoryTags: ["Coffee", "Sober Events"],
        vibeTags: ["Sober-friendly", "Drop-in"],
        communityType: "local-plan",
        activityText: "Anyone want a sober coffee meetup?",
        date: "2099-06-23",
        time: "10:00",
        town: "Canmore",
        groupSizePreference: "small-group",
      });

    expect(multiCategoryPlanRes.status).to.equal(201);
    expect(multiCategoryPlanRes.body.category).to.equal("Food & Drink");
    expect(multiCategoryPlanRes.body.categories).to.deep.equal([
      "Food & Drink",
      "Wellness",
    ]);
    expect(multiCategoryPlanRes.body.categoryTags).to.deep.equal([
      "Coffee",
      "Sober Events",
    ]);
    expect(multiCategoryPlanRes.body.vibeTags).to.deep.equal([
      "Sober-friendly",
      "Drop-in",
    ]);

    const soberPlanListRes = await request(app)
      .get("/api/buddy-posts?category=Sober%20Events")
      .set("Authorization", `Bearer ${authToken}`);

    expect(soberPlanListRes.status).to.equal(200);
    expect(
      soberPlanListRes.body.some(
        (post) => post._id === multiCategoryPlanRes.body._id
      )
    ).to.equal(true);

    const vibePlanListRes = await request(app)
      .get("/api/buddy-posts?search=Drop-in")
      .set("Authorization", `Bearer ${authToken}`);

    expect(vibePlanListRes.status).to.equal(200);
    expect(
      vibePlanListRes.body.some(
        (post) => post._id === multiCategoryPlanRes.body._id
      )
    ).to.equal(true);

    const newInTownRes = await request(app)
      .post("/api/buddy-posts")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "general",
        category: "Cultural Events",
        communityType: "new-in-town",
        activityText: "New in town and looking to meet people for easy walks.",
        date: "2099-06-23",
        town: "Canmore",
        groupSizePreference: "any",
      });

    expect(newInTownRes.status).to.equal(201);
    expect(newInTownRes.body).to.include({
      type: "general",
      communityType: "new-in-town",
    });
    expect(newInTownRes.body).to.not.have.property("category");

    const newInTownListRes = await request(app)
      .get("/api/buddy-posts?communityType=new-in-town")
      .set("Authorization", `Bearer ${authToken}`);

    expect(newInTownListRes.status).to.equal(200);
    expect(
      newInTownListRes.body.some((post) => post._id === newInTownRes.body._id)
    ).to.equal(true);

    const jobExpiryDate = formatTestDate(30);
    const jobApplyByDate = formatTestDate(21);
    process.env.ADMIN_EMAILS = testEmail;
    const jobAdRes = await request(app)
      .post("/api/buddy-posts")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "job",
        category: "Learning",
        communityType: "jobs",
        activityText:
          "Hiring a part-time front desk host in Banff. Evening shifts, local team, email to apply.",
        businessName: "Banff Front Desk Co.",
        locationName: "Downtown Banff",
        applyByDate: jobApplyByDate,
        expiresAt: jobExpiryDate,
        date: jobExpiryDate,
        town: "Banff",
        groupSizePreference: "any",
        importedBySummitScene: true,
      });
    process.env.ADMIN_EMAILS = originalAdminEmails;

    expect(jobAdRes.status).to.equal(201);
    expect(jobAdRes.body).to.include({
      type: "job",
      communityType: "jobs",
      businessName: "Banff Front Desk Co.",
      locationName: "Downtown Banff",
      applyByDate: jobApplyByDate,
      expiresAt: jobExpiryDate,
      importedBySummitScene: true,
    });
    expect(jobAdRes.body).to.not.have.property("category");

    const jobListRes = await request(app)
      .get("/api/buddy-posts?communityType=jobs")
      .set("Authorization", `Bearer ${authToken}`);

    expect(jobListRes.status).to.equal(200);
    expect(jobListRes.body.some((post) => post._id === jobAdRes.body._id)).to.equal(
      true
    );

    process.env.ADMIN_EMAILS = testEmail;
    const updatedJobRes = await request(app)
      .patch(`/api/buddy-posts/${jobAdRes.body._id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "job",
        communityType: "jobs",
        activityText:
          "Updated front desk host ad with morning and evening shifts.",
        businessName: "Updated Banff Front Desk Co.",
        locationName: "Banff Avenue",
        applyByDate: jobApplyByDate,
        expiresAt: jobExpiryDate,
        date: jobExpiryDate,
        town: "Banff",
        groupSizePreference: "any",
        importedBySummitScene: true,
      });
    process.env.ADMIN_EMAILS = originalAdminEmails;

    expect(updatedJobRes.status).to.equal(200);
    expect(updatedJobRes.body).to.include({
      communityType: "jobs",
      activityText:
        "Updated front desk host ad with morning and evening shifts.",
      businessName: "Updated Banff Front Desk Co.",
      locationName: "Banff Avenue",
      importedBySummitScene: true,
    });

    const tooLongJobAdRes = await request(app)
      .post("/api/buddy-posts")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "job",
        communityType: "jobs",
        activityText: "Hiring for a future role.",
        date: formatTestDate(45),
        town: "Banff",
        groupSizePreference: "any",
      });

    expect(tooLongJobAdRes.status).to.equal(400);
    expect(tooLongJobAdRes.body.message).to.equal(
      "Job and volunteer ads can stay open for up to 1 month."
    );

    const nonAdminImportedJobAdRes = await request(app)
      .post("/api/buddy-posts")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "job",
        communityType: "jobs",
        activityText: "Hiring for a regular local role.",
        date: formatTestDate(15),
        town: "Banff",
        groupSizePreference: "any",
        importedBySummitScene: true,
      });

    expect(nonAdminImportedJobAdRes.status).to.equal(201);
    expect(nonAdminImportedJobAdRes.body.importedBySummitScene).to.not.equal(
      true
    );

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
        date: "2099-06-01",
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

    const replyLikeRes = await request(app)
      .post(
        `/api/buddy-posts/${createRes.body._id}/replies/${replyRes.body.replies[0]._id}/likes`
      )
      .set("Authorization", `Bearer ${authToken}`);

    expect(replyLikeRes.status).to.equal(200);
    expect(replyLikeRes.body.replies[0].likes).to.be.an("array").with.length(1);

    const nestedReplyRes = await request(app)
      .post(
        `/api/buddy-posts/${createRes.body._id}/replies/${replyRes.body.replies[0]._id}/replies`
      )
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        text: "That timing works for me.",
      });

    expect(nestedReplyRes.status).to.equal(201);
    expect(nestedReplyRes.body.replies[0].replies).to.be.an("array").with.length(1);
    expect(nestedReplyRes.body.replies[0].replies[0]).to.include({
      text: "That timing works for me.",
    });
    expect(nestedReplyRes.body.replies[0].replies[0].createdBy).to.include({
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
        reason: "scam",
        details: "Test scam report.",
      });

    expect(reportPostRes.status).to.equal(201);
    expect(reportPostRes.body.report).to.include({
      targetType: "buddyPost",
      reason: "scam",
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
        reason: "inappropriate",
      });

    expect(reportReplyRes.status).to.equal(201);
    expect(reportReplyRes.body.report).to.include({
      targetType: "buddyReply",
      parentType: "buddyPost",
      reason: "inappropriate",
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

    const openReportsAfterReviewRes = await request(app)
      .get("/api/reports")
      .set("Authorization", `Bearer ${authToken}`);

    expect(openReportsAfterReviewRes.status).to.equal(200);
    expect(
      openReportsAfterReviewRes.body.some(
        (report) => report._id === reviewedReportRes.body._id
      )
    ).to.equal(false);

    const deleteReportedReplyRes = await request(app)
      .post(`/api/reports/${reportReplyRes.body.report._id}/actions`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(deleteReportedReplyRes.status).to.equal(400);

    const appliedReplyActionRes = await request(app)
      .post(`/api/reports/${reportReplyRes.body.report._id}/actions`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ action: "delete-content" });

    expect(appliedReplyActionRes.status).to.equal(200);
    expect(appliedReplyActionRes.body).to.include({
      status: "reviewed",
      actionTaken: "content_removed",
    });

    const postAfterModerationRes = await request(app)
      .get(`/api/buddy-posts/${createRes.body._id}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(postAfterModerationRes.status).to.equal(200);
    expect(postAfterModerationRes.body.replies).to.be.an("array").with.length(0);

    process.env.ADMIN_EMAILS = originalAdminEmails;
  });
});
