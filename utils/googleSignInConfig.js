// Configure only on a deliberate Google sign-in tap, inside its error handler.
// Native configure() may reject asynchronously, even before signIn() runs.
export async function configureGoogleSignIn({ googleSignIn, platform, webClientId, iosClientId }) {
  if (!webClientId) throw new Error("Google sign-in is not configured yet. Please use email or Apple sign-in.");
  if (platform === "ios" && !iosClientId) {
    throw new Error("Google sign-in for iPhone is not configured yet. Please use email or Apple sign-in.");
  }
  if (!googleSignIn) throw new Error("Google sign-in requires a development or store build.");
  await googleSignIn.configure({ webClientId, ...(iosClientId ? { iosClientId } : {}), offlineAccess: false });
}
