function cleanMessage(message) {
  return typeof message === "string" ? message.trim() : "";
}

export function toUserFriendlyErrorMessage(message, fallbackMessage) {
  const normalized = cleanMessage(message);
  const fallback =
    cleanMessage(fallbackMessage) || "Something went wrong. Please try again.";

  if (!normalized) {
    return fallback;
  }

  const lower = normalized.toLowerCase();

  if (
    lower.includes("network request failed") ||
    lower.includes("failed to fetch")
  ) {
    return "We couldn't reach the server. Check your connection and try again.";
  }

  if (
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("aborted")
  ) {
    return "That request took too long. Please try again.";
  }

  if (
    lower.includes("unauthorized") ||
    lower.includes("jwt") ||
    lower.includes("session expired")
  ) {
    return "Your session has expired. Please log in again.";
  }

  if (lower.includes("not logged in") || lower.includes("must be logged in")) {
    return "Please log in again to continue.";
  }

  if (
    lower.includes("failed to fetch events") ||
    lower.includes("events request")
  ) {
    return "We couldn't load events right now. Please try again.";
  }

  if (
    lower.includes("failed to fetch my events") ||
    lower.includes("my events request")
  ) {
    return "We couldn't load your events right now. Please try again.";
  }

  if (
    lower.includes("failed to create event") ||
    lower.includes("create event request")
  ) {
    return "We couldn't publish your event. Please try again.";
  }

  if (
    lower.includes("failed to update event") ||
    lower.includes("update event request")
  ) {
    return "We couldn't save your event changes. Please try again.";
  }

  if (
    lower.includes("failed to delete event") ||
    lower.includes("delete event request")
  ) {
    return "We couldn't delete this event right now. Please try again.";
  }

  if (
    lower.includes("failed to load posts") ||
    lower.includes("community posts request")
  ) {
    return "We couldn't load community posts right now. Please try again.";
  }

  if (
    lower.includes("failed to create post") ||
    lower.includes("create post request")
  ) {
    return "We couldn't share your post right now. Please try again.";
  }

  if (
    lower.includes("failed to update post") ||
    lower.includes("update post request")
  ) {
    return "We couldn't save your post changes. Please try again.";
  }

  if (
    lower.includes("failed to delete post") ||
    lower.includes("delete post request")
  ) {
    return "We couldn't delete this post right now. Please try again.";
  }

  if (
    lower.includes("failed to send reply") ||
    lower.includes("reply request")
  ) {
    return "We couldn't send your reply right now. Please try again.";
  }

  if (
    lower.includes("failed to update like") ||
    lower.includes("like request")
  ) {
    return "We couldn't update your like right now. Please try again.";
  }

  if (
    lower.includes("failed to load address suggestions") ||
    lower.includes("address suggestions timed out") ||
    lower.includes("autocomplete failed")
  ) {
    return "We couldn't load address suggestions right now. Please try again.";
  }

  if (
    lower.includes("address lookup timed out") ||
    lower.includes("geocoding failed")
  ) {
    return "We couldn't verify that address right now. Please try again.";
  }

  return normalized;
}

export function toUserFriendlyError(error, fallbackMessage) {
  return new Error(
    toUserFriendlyErrorMessage(error?.message || error, fallbackMessage)
  );
}
