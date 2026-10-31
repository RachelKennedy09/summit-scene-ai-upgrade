import { expect } from "chai";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "@babel/core";
import * as schedule from "../../utils/eventSchedule.js";
import * as categories from "../../constants/eventCategories.js";
import * as eventCategory from "../../utils/eventCategory.js";

// Exercise the actual screen's hooks and button handlers without a native runtime.
// The small host below batches state updates and runs effects when dependencies change.
function mountHome(fetchEvents) {
  const slots = [];
  let cursor = 0, dirty = true, tree;
  let pendingEffects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    Fragment: "Fragment",
    useState(initial) {
      const i = cursor++;
      if (!slots[i]) slots[i] = { value: initial };
      return [slots[i].value, value => {
        const next = typeof value === "function" ? value(slots[i].value) : value;
        if (!Object.is(next, slots[i].value)) { slots[i].value = next; dirty = true; }
      }];
    },
    useRef(value) { const i = cursor++; return slots[i] ||= { current: value }; },
    useMemo(factory, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) slots[i] = { value: factory(), deps };
      return slots[i].value;
    },
    useCallback(callback, deps) { return react.useMemo(() => callback, deps); },
    useEffect(effect, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) {
        const cleanup = slots[i]?.cleanup;
        slots[i] = { deps };
        pendingEffects.push(() => { cleanup?.(); slots[i].cleanup = effect(); });
      }
    },
  };
  const theme = { text: "black", textMuted: "grey", accent: "green", border: "grey", card: "white" };
  const navigation = { navigate() {} };
  const imports = {
    react: { ...react, default: react },
    "react-native": { ...Object.fromEntries(["View", "Text", "Image", "FlatList", "ActivityIndicator", "RefreshControl", "Pressable", "ScrollView"].map(name => [name, name])), StyleSheet: { create: value => value } },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "@react-navigation/native": { useIsFocused: () => true, useNavigation: () => navigation },
    "@expo/vector-icons": { Ionicons: "Ionicons" },
    "../../context/AuthContext": { useAuth: () => ({ user: null }) },
    "../../context/ThemeContext": { useTheme: () => ({ theme }) },
    "../../services/eventsApi": { fetchEvents },
    "../../services/analyticsApi": { trackAnalytics() {} },
    "../../theme/colors": { colors: {} },
    "../../utils/eventSchedule": schedule,
    "../../utils/eventCategory.js": eventCategory,
    "../../utils/eventImages": { getEventImageSource: () => null },
    "../../constants/eventCategories": categories,
  };
  const source = readFileSync(new URL("../../screens/hub/HubScreen.js", import.meta.url), "utf8");
  const { code } = transformSync(source, { configFile: false, babelrc: false, plugins: ["@babel/plugin-transform-react-jsx", "@babel/plugin-transform-modules-commonjs"] });
  const exports = {};
  runInNewContext(code, { exports, require: name => ({ __esModule: true, ...(imports[name] || { default: name }) }), console, setTimeout, clearTimeout });
  function render() {
    for (let count = 0; dirty; count++) {
      if (count > 30) throw new Error("Home render did not settle");
      dirty = false; cursor = 0;
      tree = exports.default({ route: { params: {} } });
      const effects = pendingEffects; pendingEffects = [];
      effects.forEach(effect => effect());
    }
  }
  function nodes(node) {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap(value => nodes(value));
    return [node, ...["children", "ListHeaderComponent", "ListFooterComponent", "ListEmptyComponent"].flatMap(key => nodes(node.props?.[key]))];
  }
  function text(node) {
    if (typeof node === "string") return node;
    if (Array.isArray(node)) return node.map(text).join("");
    return text(node?.props?.children || []);
  }
  return {
    async settle() { for (let i = 0; i < 15; i++) { render(); await Promise.resolve(); } render(); },
    click(label) {
      const button = nodes(tree).find(node => node.type === "Pressable" && text(node).trim() === label);
      expect(button, `button ${label}`).to.exist;
      button.props.onPress();
    },
    list() { return nodes(tree).find(node => node.type === "FlatList"); },
    text() { return nodes(tree).filter(node => node.type === "Text").map(text).join(" "); },
  };
}

describe("Home event browser transitions", () => {
  function api({ fail = false } = {}) {
    const requests = [];
    return { requests, fetch: async options => {
      requests.push(options);
      if (fail && options.limit === 20) throw new Error("Offline");
      return options.page ? { events: [], page: 1, totalCount: 0, hasMore: false } : [];
    } };
  }
  it("opens See all today with unchanged default filters without switching tabs", async () => {
    const backend = api();
    const home = mountHome(backend.fetch);
    await home.settle();
    const initialLoads = backend.requests.filter(request => request.limit === 20).length;
    home.click("See all today");
    await home.settle();
    expect(backend.requests.filter(request => request.limit === 20)).to.have.length(initialLoads + 1);
    expect(home.list()).to.exist;
    expect(home.text()).to.include("Browse Events").and.not.include("Loading events...");
  });
  it("can return home and reopen the same list repeatedly", async () => {
    const home = mountHome(api().fetch);
    await home.settle();
    for (let i = 0; i < 3; i++) {
      home.click("See all today"); await home.settle();
      expect(home.list()).to.exist;
      home.click("Back to Today"); await home.settle();
      expect(home.text()).to.include("See all today");
    }
  });
  it("shows a retry action after failure instead of leaving the browser loading", async () => {
    const home = mountHome(api({ fail: true }).fetch);
    await home.settle();
    home.click("See all today"); await home.settle();
    expect(home.text()).to.include("Try again").and.not.include("Loading events...");
  });
});
