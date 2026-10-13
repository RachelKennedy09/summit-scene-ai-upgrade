const POPULAR_PLACES = [
  {
    town: "Banff",
    name: "Fairmont Banff Springs",
    aliases: ["banff springs", "fairmont", "castle", "rundle bar"],
    address: "405 Spray Ave, Banff, AB",
    latitude: 51.1646,
    longitude: -115.5613,
  },
  {
    town: "Banff",
    name: "Banff Centre for Arts and Creativity",
    aliases: ["banff centre", "banff center", "rolston recital hall", "jenny belzberg theatre"],
    address: "107 Tunnel Mountain Dr, Banff, AB",
    latitude: 51.1716,
    longitude: -115.5612,
  },
  {
    town: "Banff",
    name: "Rose & Crown Banff",
    aliases: ["rose and crown", "rose crown"],
    address: "202 Banff Ave, Banff, AB",
    latitude: 51.1774,
    longitude: -115.5712,
  },
  {
    town: "Banff",
    name: "Banff Avenue Brewing Co.",
    aliases: ["banff ave brewing", "banff avenue brewing", "banff brewing"],
    address: "110 Banff Ave, Banff, AB",
    latitude: 51.1753,
    longitude: -115.5718,
  },
  {
    town: "Banff",
    name: "High Rollers",
    aliases: ["high rollers banff", "highrollers"],
    address: "110 Banff Ave, Banff, AB",
    latitude: 51.1753,
    longitude: -115.5718,
  },
  {
    town: "Banff",
    name: "Wild Bill's Legendary Saloon",
    aliases: ["wild bills", "wild bill's", "wild bill"],
    address: "201 Banff Ave, Banff, AB",
    latitude: 51.1769,
    longitude: -115.5714,
  },
  {
    town: "Banff",
    name: "The Fenlands Banff Recreation Centre",
    aliases: ["fenlands", "banff recreation centre"],
    address: "100 Norquay Rd, Banff, AB",
    latitude: 51.1816,
    longitude: -115.5792,
  },
  {
    town: "Banff",
    name: "Cave and Basin National Historic Site",
    aliases: ["cave basin", "cave and basin"],
    address: "311 Cave Ave, Banff, AB",
    latitude: 51.1697,
    longitude: -115.5906,
  },
  {
    town: "Banff",
    name: "Whyte Museum of the Canadian Rockies",
    aliases: ["whyte museum"],
    address: "111 Bear St, Banff, AB",
    latitude: 51.1756,
    longitude: -115.5741,
  },
  {
    town: "Banff",
    name: "Cascade of Time Garden",
    aliases: ["cascade gardens", "cascade garden"],
    address: "101 Mountain Ave, Banff, AB",
    latitude: 51.1706,
    longitude: -115.5722,
  },
  {
    town: "Banff",
    name: "Banff Gondola",
    aliases: ["sulphur mountain gondola", "gondola"],
    address: "100 Mountain Ave, Banff, AB",
    latitude: 51.1487,
    longitude: -115.5557,
  },
  {
    town: "Banff",
    name: "Banff Sunshine Village",
    aliases: ["sunshine village", "sunshine ski resort", "banff sunshine"],
    address: "1 Sunshine Access Rd, Banff, AB",
    latitude: 51.1152,
    longitude: -115.7638,
  },
  {
    town: "Canmore",
    name: "artsPlace",
    aliases: ["arts place", "art place"],
    address: "950 8 Ave, Canmore, AB",
    latitude: 51.0897,
    longitude: -115.3597,
  },
  {
    town: "Canmore",
    name: "Canmore Brewing Company",
    aliases: ["canmore brewing", "canmore brewery", "canmore brew co"],
    address: "1460 Railway Ave, Canmore, AB",
    latitude: 51.0914,
    longitude: -115.3461,
  },
  {
    town: "Canmore",
    name: "Elevation Place",
    aliases: ["elevation place canmore"],
    address: "700 Railway Ave, Canmore, AB",
    latitude: 51.0894,
    longitude: -115.3578,
  },
  {
    town: "Canmore",
    name: "Canmore Nordic Centre",
    aliases: ["nordic centre", "canmore nordic center"],
    address: "1988 Olympic Way, Canmore, AB",
    latitude: 51.0907,
    longitude: -115.3837,
  },
  {
    town: "Canmore",
    name: "Carter-Ryan Theatre",
    aliases: ["carter ryan", "carter-ryan"],
    address: "705 Main St, Canmore, AB",
    latitude: 51.0891,
    longitude: -115.3599,
  },
  {
    town: "Canmore",
    name: "The Drake Pub",
    aliases: ["drake pub", "the drake"],
    address: "909 Railway Ave, Canmore, AB",
    latitude: 51.0901,
    longitude: -115.3562,
  },
  {
    town: "Canmore",
    name: "Tavern 1883",
    aliases: ["tavern"],
    address: "709 9 St, Canmore, AB",
    latitude: 51.0884,
    longitude: -115.3597,
  },
  {
    town: "Canmore",
    name: "Communitea Cafe",
    aliases: ["communitea", "communitea cafe"],
    address: "117-1001 6 Ave, Canmore, AB",
    latitude: 51.0877,
    longitude: -115.3551,
  },
  {
    town: "Canmore",
    name: "Canmore Legion",
    aliases: ["three sisters legion", "stand easy", "the stand easy"],
    address: "834 7 St, Canmore, AB",
    latitude: 51.0886,
    longitude: -115.3574,
  },
  {
    town: "Lake Louise",
    name: "Fairmont Chateau Lake Louise",
    aliases: ["chateau lake louise", "fairmont chateau"],
    address: "111 Lake Louise Dr, Lake Louise, AB",
    latitude: 51.4166,
    longitude: -116.2127,
  },
  {
    town: "Lake Louise",
    name: "Lake Louise Ski Resort",
    aliases: ["ski louise", "lake louise resort", "whitehorn"],
    address: "1 Whitehorn Rd, Lake Louise, AB",
    latitude: 51.4419,
    longitude: -116.1608,
  },
  {
    town: "Lake Louise",
    name: "Lake Louise Visitor Centre",
    aliases: ["visitor centre", "visitor center"],
    address: "201 Village Rd, Lake Louise, AB",
    latitude: 51.4259,
    longitude: -116.1790,
  },
  {
    town: "Lake Louise",
    name: "Lake Louise Inn",
    aliases: ["lake louise inn"],
    address: "210 Village Rd, Lake Louise, AB",
    latitude: 51.4255,
    longitude: -116.1784,
  },
  {
    town: "Lake Louise",
    name: "Post Hotel & Spa",
    aliases: ["post hotel", "post hotel lake louise"],
    address: "200 Pipestone Rd, Lake Louise, AB",
    latitude: 51.4252,
    longitude: -116.1796,
  },
  {
    town: "Lake Louise",
    name: "Moraine Lake Lodge",
    aliases: ["moraine lake", "moraine lodge"],
    address: "Moraine Lake Rd, Lake Louise, AB",
    latitude: 51.3272,
    longitude: -116.1818,
  },
];

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenScore(query, text) {
  const queryTokens = normalize(query).split(" ").filter(Boolean);
  const textValue = normalize(text);
  if (!queryTokens.length || !textValue) return 0;

  return queryTokens.reduce((score, token) => {
    if (textValue === token) return score + 8;
    if (textValue.startsWith(token)) return score + 6;
    if (textValue.includes(token)) return score + 3;
    return score;
  }, 0);
}

function matchedTokenCount(query, values) {
  const queryTokens = normalize(query).split(" ").filter(Boolean);
  const normalizedValues = values.map((value) => normalize(value));

  return queryTokens.filter((token) =>
    normalizedValues.some((value) => value.includes(token))
  ).length;
}

function scorePlace(place, normalizedQuery, town) {
  const normalizedTown = normalize(town);
  const haystacks = [place.name, place.address, ...(place.aliases || [])];
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const exactAlias = haystacks.some((value) => normalize(value) === normalizedQuery);
  const startsWithAlias = haystacks.some((value) => normalize(value).startsWith(normalizedQuery));
  const containsAlias = haystacks.some((value) => normalize(value).includes(normalizedQuery));
  const tokenMatch = haystacks.reduce(
    (score, value) => Math.max(score, tokenScore(normalizedQuery, value)),
    0
  );
  const townBoost = !normalizedTown || normalize(place.town) === normalizedTown ? 8 : 0;

  if (exactAlias) return 100 + townBoost;
  if (startsWithAlias) return 70 + townBoost + tokenMatch;
  if (containsAlias) return 45 + townBoost + tokenMatch;
  if (queryTokens.length > 1 && matchedTokenCount(normalizedQuery, haystacks) < queryTokens.length) {
    return 0;
  }
  return tokenMatch > 0 ? tokenMatch + townBoost : 0;
}

export function getPopularPlaceSuggestions(query, town, limit = 5) {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < 2) return [];

  const normalizedTown = normalize(town);
  const scoredPlaces = POPULAR_PLACES
    .map((place) => ({
      ...place,
      score: scorePlace(place, normalizedQuery, town),
    }))
    .filter((place) => place.score > 0);
  const townMatches = normalizedTown
    ? scoredPlaces.filter((place) => normalize(place.town) === normalizedTown)
    : [];

  return (townMatches.length ? townMatches : scoredPlaces)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((place) => ({
      id: `popular:${place.town}:${place.name}`,
      name: place.name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      town: place.town,
      isPopularPlace: true,
    }));
}

export function mergePlaceSuggestions(...suggestionGroups) {
  const seen = new Set();
  const merged = [];

  suggestionGroups.flat().filter(Boolean).forEach((suggestion) => {
    const key = [
      String(suggestion.name || "").toLowerCase(),
      String(suggestion.address || "").toLowerCase(),
      Number(suggestion.latitude || 0).toFixed(4),
      Number(suggestion.longitude || 0).toFixed(4),
    ].join("|");

    if (seen.has(key)) return;
    seen.add(key);
    merged.push(suggestion);
  });

  return merged;
}
