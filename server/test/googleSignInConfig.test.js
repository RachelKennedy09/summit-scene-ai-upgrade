import { expect } from "chai";
import { configureGoogleSignIn } from "../../utils/googleSignInConfig.js";

describe("Google native sign-in configuration", () => {
  it("does not invoke native iOS configuration without an iOS client ID", async () => {
    let called = false;
    let failure;
    try {
      await configureGoogleSignIn({ platform: "ios", webClientId: "web-client", googleSignIn: { configure() { called = true; } } });
    } catch (error) { failure = error; }
    expect(called).to.equal(false);
    expect(failure.message).to.include("iPhone is not configured");
  });
  it("passes the distinct Web and iOS client IDs to the native SDK", async () => {
    let received;
    await configureGoogleSignIn({ platform: "ios", webClientId: "web-client", iosClientId: "ios-client", googleSignIn: { configure(options) { received = options; } } });
    expect(received).to.deep.equal({ webClientId: "web-client", iosClientId: "ios-client", offlineAccess: false });
  });
  it("allows Android configuration without an iOS client ID", async () => {
    let called = false;
    await configureGoogleSignIn({ platform: "android", webClientId: "web-client", googleSignIn: { configure() { called = true; } } });
    expect(called).to.equal(true);
  });
  it("awaits native configuration so its rejection reaches the sign-in error handler", async () => {
    let failure;
    try {
      await configureGoogleSignIn({ platform: "ios", webClientId: "web-client", iosClientId: "ios-client", googleSignIn: { configure: async () => { throw new Error("Native setup failed"); } } });
    } catch (error) { failure = error; }
    expect(failure.message).to.equal("Native setup failed");
  });
});
