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

  // ----------------------- WOMEN / NEUTRAL FEM ------------------------------

  w1_light_orangehair: require("./avatar_w1_light_orangehair.png"),
  w2_tan_longbrown: require("./avatar_w2_tan_longbrown.png"),
  w3_dark_blackpony: require("./avatar_w3_dark_blackpony.png"),
  w4_medium_longauburn: require("./avatar_w4_medium_longauburn.png"),
  w5_light_blondehair: require("./avatar_w5_light_blondehair.png"),
  w6_brown_longblack: require("./avatar_w6_brown_longblack.png"),
  w7_fair_orangehair: require("./avatar_w7_fair_orangehair.png"),
  w8_dark_shortcurly: require("./avatar_w8_dark_shortcurly.png"),
};

// For UI pickers: creates an array like
// ["m1_tan_blackhair", "m2_dark_blackhair", ..., "w8_dark_shortcurly"]

export const AVATAR_KEYS = Object.keys(AVATARS);
