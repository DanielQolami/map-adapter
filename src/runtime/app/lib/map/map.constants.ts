import type {
  MapClusterOptions,
  MapTheme,
  MapThemePalette,
  MapTileThemeConfig,
} from "../../types/map.types.ts";

/** Fallback icon used whenever an invalid or unsupported icon is provided. */
const DEFAULT_MAP_ICON = "i-lucide-pin-map";

/** Shared generated marker colors sourced from Nuxt UI theme variables. */
const MARKER_BODY_COLOR = "var(--ui-primary)";
const MARKER_GLYPH_COLOR = "var(--ui-border-inverted)";

/** Default cluster behaviour shared by all map providers. */
const DEFAULT_CLUSTER_OPTIONS: Required<MapClusterOptions> = {
  enabled: true,
  distance: 56,
  maxZoom: 18,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
};

/** Tile configuration normalized for Leaflet and OpenLayers. */
const MAP_TILE_THEMES: Record<MapTheme, MapTileThemeConfig> = {
  gta: {
    attribution:
      "&copy; Stadia Maps &copy; Stamen Design &copy; OpenMapTiles &copy; OpenStreetMap contributors",
    leafletUrl: "https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png",
    openLayersUrl: "https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png",
  },
  standard: {
    attribution: "&copy; OpenStreetMap contributors",
    leafletUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    openLayersUrl: "https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c"],
  },
};

const MAP_THEME_PALETTES: Record<MapTheme, MapThemePalette> = {
  gta: {
    clusterBg: "var(--ui-primary)",
    clusterRing: "var(--ui-border-inverted)",
    clusterText: "var(--ui-border-inverted)",
  },
  standard: {
    clusterBg: "var(--ui-primary)",
    clusterRing: "var(--ui-border-inverted)",
    clusterText: "var(--ui-border-inverted)",
  },
};

const resolvedColorCache = new Map<string, string>();
const resolvedPaletteCache = new Map<string, MapThemePalette>();
const resolvedMarkerColorCache = new Map<string, { body: string; glyph: string }>();

function getCssResolutionScope() {
  if (!import.meta.client) return "server";

  const root = document.documentElement;

  return [
    root.className,
    root.getAttribute("data-theme") ?? "",
    root.getAttribute("style") ?? "",
  ].join("|");
}

function resolveCssColor(color: string, fallback: string) {
  if (!import.meta.client) return fallback;

  const cacheKey = `${getCssResolutionScope()}:${color}:${fallback}`;
  const cachedColor = resolvedColorCache.get(cacheKey);

  if (cachedColor) {
    return cachedColor;
  }

  const colorProbe = document.createElement("span");

  colorProbe.style.color = color;
  colorProbe.style.display = "none";

  document.body.append(colorProbe);

  const resolvedColor = getComputedStyle(colorProbe).color.trim();

  colorProbe.remove();

  const nextColor = resolvedColor || fallback;

  resolvedColorCache.set(cacheKey, nextColor);

  return nextColor;
}

function resolveMapThemePalette(theme: MapTheme): MapThemePalette {
  const cacheKey = `${getCssResolutionScope()}:${theme}`;
  const cachedPalette = resolvedPaletteCache.get(cacheKey);

  if (cachedPalette) {
    return cachedPalette;
  }

  const palette = MAP_THEME_PALETTES[theme];
  const resolvedPalette = {
    clusterBg: resolveCssColor(palette.clusterBg, theme === "standard" ? "#ff637e" : "#111827"),
    clusterRing: resolveCssColor(palette.clusterRing, theme === "standard" ? "#ffffff" : "#e5e7eb"),
    clusterText: resolveCssColor(palette.clusterText, "#ffffff"),
  };

  resolvedPaletteCache.set(cacheKey, resolvedPalette);

  return resolvedPalette;
}

function resolveMapMarkerColors() {
  const cacheKey = getCssResolutionScope();
  const cachedColors = resolvedMarkerColorCache.get(cacheKey);

  if (cachedColors) {
    return cachedColors;
  }

  const resolvedColors = {
    body: resolveCssColor(MARKER_BODY_COLOR, "#ff637e"),
    glyph: resolveCssColor(MARKER_GLYPH_COLOR, "#ffffff"),
  };

  resolvedMarkerColorCache.set(cacheKey, resolvedColors);

  return resolvedColors;
}

export {
  DEFAULT_CLUSTER_OPTIONS,
  DEFAULT_MAP_ICON,
  MAP_THEME_PALETTES,
  MAP_TILE_THEMES,
  MARKER_BODY_COLOR,
  MARKER_GLYPH_COLOR,
  resolveMapMarkerColors,
  resolveMapThemePalette,
};
