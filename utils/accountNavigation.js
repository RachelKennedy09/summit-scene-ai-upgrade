// Carry the guest's intent through signup and profile setup using serializable routes.
export function accountDestination(user, pendingEventAction) {
  if (user?.onboardingCompleted === false) {
    return [{ name: "tabs" }, { name: "MemberProfile", params: { onboarding: true } }];
  }
  return pendingEventAction
    ? [{ name: "tabs" }, { name: "EventDetail", params: { eventId: pendingEventAction.eventId } }]
    : [{ name: "tabs" }];
}

export function shouldClearSession(status, contentType = "") {
  // A proxy's HTML error page is not an authentication decision from our API.
  return status === 401 && contentType.includes("application/json");
}
