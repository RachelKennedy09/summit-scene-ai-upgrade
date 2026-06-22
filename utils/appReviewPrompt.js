import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";

const STATUS_KEY = "summitScene.appReview.status";
const FIRST_USED_AT_KEY = "summitScene.appReview.firstUsedAt";
const LAST_PROMPT_AT_KEY = "summitScene.appReview.lastPromptAt";
const EVENTS_CREATED_KEY = "summitScene.appReview.eventsCreated";
const CONNECT_ENGAGEMENTS_KEY = "summitScene.appReview.connectEngagements";

const EVENT_PROMPT_THRESHOLD = 5;
const CONNECT_PROMPT_THRESHOLD = 1;
const DAYS_BEFORE_TIME_PROMPT = 14;
const MIN_DAYS_BETWEEN_PROMPTS = 90;

let isPrompting = false;

function daysSince(timestamp) {
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed) || parsed <= 0) return Infinity;
  return (Date.now() - parsed) / (1000 * 60 * 60 * 24);
}

async function incrementStoredNumber(key) {
  const raw = await AsyncStorage.getItem(key);
  const nextValue = Number(raw || 0) + 1;
  await AsyncStorage.setItem(key, String(nextValue));
  return nextValue;
}

async function ensureFirstUsedAt() {
  const existing = await AsyncStorage.getItem(FIRST_USED_AT_KEY);
  if (existing) return existing;

  const now = String(Date.now());
  await AsyncStorage.setItem(FIRST_USED_AT_KEY, now);
  return now;
}

async function requestNativeReview() {
  const hasAction = await StoreReview.hasAction();
  if (!hasAction) return false;

  await StoreReview.requestReview();
  return true;
}

async function maybeRequestReview(reason) {
  if (isPrompting) return false;

  try {
    const [status, lastPromptAt] = await Promise.all([
      AsyncStorage.getItem(STATUS_KEY),
      AsyncStorage.getItem(LAST_PROMPT_AT_KEY),
    ]);

    if (status === "prompted" || status === "never") return false;
    if (daysSince(lastPromptAt) < MIN_DAYS_BETWEEN_PROMPTS) return false;

    isPrompting = true;
    const didRequest = await requestNativeReview();

    if (didRequest) {
      await Promise.all([
        AsyncStorage.setItem(STATUS_KEY, "prompted"),
        AsyncStorage.setItem(LAST_PROMPT_AT_KEY, String(Date.now())),
        AsyncStorage.setItem("summitScene.appReview.lastReason", reason),
      ]);
    }

    return didRequest;
  } catch {
    return false;
  } finally {
    isPrompting = false;
  }
}

export async function initializeAppReviewPrompt() {
  try {
    const firstUsedAt = await ensureFirstUsedAt();

    if (daysSince(firstUsedAt) >= DAYS_BEFORE_TIME_PROMPT) {
      await maybeRequestReview("two_weeks_using_app");
    }
  } catch {
    // Review prompts should never block app usage.
  }
}

export async function recordEventCreatedForReviewPrompt() {
  try {
    await ensureFirstUsedAt();
    const eventsCreated = await incrementStoredNumber(EVENTS_CREATED_KEY);

    if (eventsCreated >= EVENT_PROMPT_THRESHOLD) {
      setTimeout(() => {
        maybeRequestReview("five_events_created");
      }, 1200);
    }
  } catch {
    // Review prompts should never block event posting.
  }
}

export async function recordConnectEngagementForReviewPrompt() {
  try {
    await ensureFirstUsedAt();
    const engagements = await incrementStoredNumber(CONNECT_ENGAGEMENTS_KEY);

    if (engagements >= CONNECT_PROMPT_THRESHOLD) {
      setTimeout(() => {
        maybeRequestReview("connect_engagement");
      }, 1200);
    }
  } catch {
    // Review prompts should never block community actions.
  }
}
