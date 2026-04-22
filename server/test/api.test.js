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
    });

    expect(res.status).to.be.oneOf([200, 201]);
    expect(res.body).to.be.an("object");
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
});
