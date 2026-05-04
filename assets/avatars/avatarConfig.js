// assets/avatars/avatarConfig.js
// Central registry for all pre-made avatar images.
// - Keys (e.g. "m3_light_brownhair") are stored in MongoDB.
// - Values are local PNG files bundled with the Expo app.

export const AVATARS = {
  // ----------------------- MEN / NEUTRAL MASC ------------------------------
  m1_tan_blackhair: require("./avatar_m1_tan_blackhair.png"),
  m2_dark_blackhair: require("./avatar_m2_dark_blackhair.png"),
  m3_light_brownhair: require("./avatar_m3_light_brownhair.png"),
  m4_brown_blondehair: require("./avatar_m4_brown_blondehair.png"),
  m5_light_redhair: require("./avatar_m5_light_redhair.png"),
  m6_medium_browncurly: require("./avatar_m6_medium_browncurly.png"),
  m7_dark_browncurly: require("./avatar_m7_dark_browncurly.png"),
  m8_light_blackhair: require("./avatar_m8_light_blackhair.png"),
  m9_tan_redlong: require("./avatar_m9_tan_redlong.png"),

  // ----------------------- WOMEN / NEUTRAL FEM ------------------------------

  w1_light_orangehair: require("./avatar_w1_light_orangehair.png"),
  w2_tan_longbrown: require("./avatar_w2_tan_longbrown.png"),
  w3_dark_blackpony: require("./avatar_w3_dark_blackpony.png"),
  w4_medium_longauburn: require("./avatar_w4_medium_longauburn.png"),
  w5_light_blondehair: require("./avatar_w5_light_blondehair.png"),
  w6_brown_longblack: require("./avatar_w6_brown_longblack.png"),
  w7_fair_orangehair: require("./avatar_w7_fair_orangehair.png"),
  w8_dark_shortcurly: require("./avatar_w8_dark_shortcurly.png"),

  // ----------------------- BUSINESS / ORGANIZER ------------------------------
  business_food_drink: require("./business_food_drink.png"),
  business_music_nightlife: require("./business_music_nightlife.png"),
  business_outdoor_adventure: require("./business_outdoor_adventure.png"),
  business_wellness: require("./business_wellness.png"),
  business_market_shop: require("./business_market_shop.png"),
  business_art_culture: require("./business_art_culture.png"),
  business_ski_snow: require("./business_ski_snow.png"),
  business_stay_lodging: require("./business_stay_lodging.png"),
  business_community: require("./business_community.png"),
  business_general: require("./business_general.png"),
};

// Smaller sources for the register/edit-profile picker so the grid can render
// without decoding every 1024x1024 avatar at once.
export const AVATAR_PICKER_SOURCES = {
  m1_tan_blackhair: require("./thumbs/avatar_m1_tan_blackhair.png"),
  m2_dark_blackhair: require("./thumbs/avatar_m2_dark_blackhair.png"),
  m3_light_brownhair: require("./thumbs/avatar_m3_light_brownhair.png"),
  m4_brown_blondehair: require("./thumbs/avatar_m4_brown_blondehair.png"),
  m5_light_redhair: require("./thumbs/avatar_m5_light_redhair.png"),
  m6_medium_browncurly: require("./thumbs/avatar_m6_medium_browncurly.png"),
  m7_dark_browncurly: require("./thumbs/avatar_m7_dark_browncurly.png"),
  m8_light_blackhair: require("./thumbs/avatar_m8_light_blackhair.png"),
  m9_tan_redlong: require("./thumbs/avatar_m9_tan_redlong.png"),
  w1_light_orangehair: require("./thumbs/avatar_w1_light_orangehair.png"),
  w2_tan_longbrown: require("./thumbs/avatar_w2_tan_longbrown.png"),
  w3_dark_blackpony: require("./thumbs/avatar_w3_dark_blackpony.png"),
  w4_medium_longauburn: require("./thumbs/avatar_w4_medium_longauburn.png"),
  w5_light_blondehair: require("./thumbs/avatar_w5_light_blondehair.png"),
  w6_brown_longblack: require("./thumbs/avatar_w6_brown_longblack.png"),
  w7_fair_orangehair: require("./thumbs/avatar_w7_fair_orangehair.png"),
  w8_dark_shortcurly: require("./thumbs/avatar_w8_dark_shortcurly.png"),
  business_food_drink: require("./thumbs/business_food_drink.png"),
  business_music_nightlife: require("./thumbs/business_music_nightlife.png"),
  business_outdoor_adventure: require("./thumbs/business_outdoor_adventure.png"),
  business_wellness: require("./thumbs/business_wellness.png"),
  business_market_shop: require("./thumbs/business_market_shop.png"),
  business_art_culture: require("./thumbs/business_art_culture.png"),
  business_ski_snow: require("./thumbs/business_ski_snow.png"),
  business_stay_lodging: require("./thumbs/business_stay_lodging.png"),
  business_community: require("./thumbs/business_community.png"),
  business_general: require("./thumbs/business_general.png"),
};

// For UI pickers: creates an array like
// ["m1_tan_blackhair", "m2_dark_blackhair", ..., "w8_dark_shortcurly"]

export const PERSONAL_AVATAR_KEYS = [
  "m1_tan_blackhair",
  "m2_dark_blackhair",
  "m3_light_brownhair",
  "m4_brown_blondehair",
  "m5_light_redhair",
  "m6_medium_browncurly",
  "m7_dark_browncurly",
  "m8_light_blackhair",
  "m9_tan_redlong",
  "w1_light_orangehair",
  "w2_tan_longbrown",
  "w3_dark_blackpony",
  "w4_medium_longauburn",
  "w5_light_blondehair",
  "w6_brown_longblack",
  "w7_fair_orangehair",
  "w8_dark_shortcurly",
];

export const BUSINESS_AVATAR_KEYS = [
  "business_food_drink",
  "business_music_nightlife",
  "business_outdoor_adventure",
  "business_wellness",
  "business_market_shop",
  "business_art_culture",
  "business_ski_snow",
  "business_stay_lodging",
  "business_community",
  "business_general",
];

export const BUSINESS_AVATAR_LABELS = {
  business_food_drink: "Food & drink",
  business_music_nightlife: "Music",
  business_outdoor_adventure: "Outdoor",
  business_wellness: "Wellness",
  business_market_shop: "Markets",
  business_art_culture: "Arts",
  business_ski_snow: "Ski hill",
  business_stay_lodging: "Lodging",
  business_community: "Community",
  business_general: "General",
};

export const AVATAR_KEYS = PERSONAL_AVATAR_KEYS;
