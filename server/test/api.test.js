// test/api.test.js
// Basic integration tests for SummitScene backend
// Uses Mocha + Chai + Supertest
import { expect } from "chai";
import request from "supertest";
import app from "../index.js";

// Generate a unique email so we don't clash if tests run multiple times
const testEmail = `testuser_${Date.now()}@example.com`;
const testPassword = "TestPassword123!";
let authToken = null;

describe("SummitScene API", function () {
  // give a bit more time for DB connections on first run
  this.timeout(10000);

  /* -----------------------------------------
   * AUTH TESTS
   * --------------------------------------- */

  it("should register a new user (local role) at /api/auth/register", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: testEmail,
      password: testPassword,
      role: "local",
      town: "Banff",
      userType: "seasonal",
      languages: ["English", "Spanish"],
      interests: ["hiking", "live music"],
      skillLevel: {
        hiking: "casual",
        skiing: "beginner",
      },
      lookingFor: "Event buddies and hiking buddies",
    });

    expect(res.status).to.be.oneOf([200, 201]);
    expect(res.body).to.be.an("object");
    expect(res.body.user).to.include({
      town: "Banff",
      userType: "seasonal",
      lookingFor: "Event buddies and hiking buddies",
    });
    expect(res.body.user.languages).to.deep.equal(["English", "Spanish"]);
    expect(res.body.user.interests).to.deep.equal(["hiking", "live music"]);
    expect(res.body.user.skillLevel).to.include({
      hiking: "casual",
      skiing: "beginner",
    });
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
        languages: ["English", "French"],
        interests: ["skiing", "trail running", "coffee"],
        skillLevel: {
          hiking: "experienced",
          skiing: "casual",
        },
        socialAccounts: [
          {
            provider: "instagram",
            handle: "@summit_test",
          },
          {
            provider: "linkedin",
            url: "https://linkedin.com/in/summit-test",
          },
        ],
        lookingFor: "Hiking buddies, ski days, and people to go to events with",
      });

    expect(updateRes.status).to.equal(200);
    expect(updateRes.body.user).to.include({
      town: "Canmore",
      userType: "local",
      lookingFor: "Hiking buddies, ski days, and people to go to events with",
    });
    expect(updateRes.body.user.languages).to.deep.equal(["English", "French"]);
    expect(updateRes.body.user.interests).to.deep.equal([
      "skiing",
      "trail running",
      "coffee",
    ]);
    expect(updateRes.body.user.skillLevel).to.include({
      hiking: "experienced",
      skiing: "casual",
    });
    const updatedInstagram = updateRes.body.user.socialAccounts.find(
      (account) => account.provider === "instagram"
    );
    expect(updatedInstagram).to.include({
      handle: "@summit_test",
      verified: false,
    });

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${authToken}`);

    expect(meRes.status).to.equal(200);
    expect(meRes.body.user).to.include({
      town: "Canmore",
      userType: "local",
      lookingFor: "Hiking buddies, ski days, and people to go to events with",
    });
    expect(meRes.body.user.languages).to.deep.equal(["English", "French"]);
    expect(meRes.body.user.interests).to.deep.equal([
      "skiing",
      "trail running",
      "coffee",
    ]);
    expect(meRes.body.user.skillLevel).to.include({
      hiking: "experienced",
      skiing: "casual",
    });
    const retrievedInstagram = meRes.body.user.socialAccounts.find(
      (account) => account.provider === "instagram"
    );
    expect(retrievedInstagram).to.include({
      handle: "@summit_test",
      verified: false,
    });
  });

  /* -----------------------------------------
   * EVENTS TESTS
   * --------------------------------------- */

  it("should fetch events at GET /api/events", async () => {
    const res = await request(app).get("/api/events");

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array");
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
        category: "Music",
        date: "2025-12-31",
        time: "18:00",
      });

    expect(res.status).to.be.oneOf([401, 403]);
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
      activityText: "Looking for someone to hike Tunnel Mountain after work.",
      date: "2026-05-15",
      time: "17:30",
      town: "Banff",
      skillLevel: "casual",
      groupSizePreference: "small-group",
      status: "open",
    });
    expect(createRes.body.createdBy).to.include({
      name: "Test User",
      town: "Canmore",
      userType: "local",
    });
    expect(createRes.body.eventId).to.equal(undefined);

    const listRes = await request(app)
      .get("/api/buddy-posts?type=hiking&town=Banff")
      .set("Authorization", `Bearer ${authToken}`);

    expect(listRes.status).to.equal(200);
    expect(listRes.body).to.be.an("array");
    const listedPost = listRes.body.find(
      (post) => post._id === createRes.body._id
    );
    expect(listedPost).to.include({
      type: "hiking",
      town: "Banff",
      groupSizePreference: "small-group",
    });

    const detailRes = await request(app)
      .get(`/api/buddy-posts/${createRes.body._id}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(detailRes.status).to.equal(200);
    expect(detailRes.body).to.include({
      _id: createRes.body._id,
      type: "hiking",
      activityText: "Looking for someone to hike Tunnel Mountain after work.",
    });
  });
});
