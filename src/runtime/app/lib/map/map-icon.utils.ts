import { getIconData, iconToSVG, replaceIDs } from "@iconify/utils";
import { DEFAULT_MAP_ICON, resolveMapMarkerColors } from "./map.constants";
import type { MapTheme } from "../../types/map.types";

type IconifyCollection = {
  aliases?: Record<string, unknown>;
  icons: Record<string, unknown>;
  prefix: string;
};

type RenderedIcon = {
  body: string;
  viewBox: string;
};

const DEFAULT_INNER_ICON_BODY =
  "<path d=\"M12 3.75a8.25 8.25 0 1 0 0 16.5A8.25 8.25 0 0 0 12 3.75Zm0 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 10.5c-1.72 0-3.26-.76-4.3-1.95a.75.75 0 0 1 .57-1.24h7.46a.75.75 0 0 1 .57 1.24A5.72 5.72 0 0 1 12 17.25Z\" fill=\"currentColor\"/>";

const iconCollectionLoaders = {
  "lucide": async () =>
    (await import("@iconify-json/lucide/icons.json"))
      .default as IconifyCollection,
  "simple-icons": async () =>
    (await import("@iconify-json/simple-icons/icons.json"))
      .default as IconifyCollection,
} as const;

type SupportedIconPrefix = keyof typeof iconCollectionLoaders;

const supportedPrefixes = Object.keys(iconCollectionLoaders).sort(
  (left, right) => {
    return right.length - left.length;
  },
) as SupportedIconPrefix[];

const collectionCache = new Map<string, Promise<IconifyCollection>>();
const renderedIconCache = new Map<string, Promise<RenderedIcon | null>>();
const markerUriCache = new Map<string, Promise<string>>();

function normalizeMarkerIconName(iconName?: string) {
  if (typeof iconName !== "string") return DEFAULT_MAP_ICON;

  return parseIconName(iconName) ? iconName : DEFAULT_MAP_ICON;
}

function parseIconName(iconName: string) {
  if (!iconName.startsWith("i-")) return null;

  const normalized = iconName.slice(2);
  const prefix = supportedPrefixes.find((candidate) =>
    normalized.startsWith(`${candidate}-`),
  );

  if (!prefix) return null;

  return {
    name: normalized.slice(prefix.length + 1),
    prefix,
  };
}

async function loadCollection(prefix: SupportedIconPrefix) {
  let cachedCollection = collectionCache.get(prefix);

  if (!cachedCollection) {
    const collectionPromise = iconCollectionLoaders[prefix]();

    collectionCache.set(prefix, collectionPromise);
    cachedCollection = collectionPromise;
  }

  return cachedCollection;
}

async function renderInnerIcon(iconName: string) {
  const normalizedIconName = normalizeMarkerIconName(iconName);
  let cachedIcon = renderedIconCache.get(normalizedIconName);

  if (!cachedIcon) {
    cachedIcon = (async () => {
      const parsedIcon = parseIconName(normalizedIconName);

      if (!parsedIcon) {
        return null;
      }

      const collection = await loadCollection(parsedIcon.prefix);
      const iconData = getIconData(collection as never, parsedIcon.name);

      if (!iconData) {
        return null;
      }

      const renderedIcon = iconToSVG(iconData);
      const viewBox = renderedIcon.attributes.viewBox ?? "0 0 24 24";

      return {
        body: replaceIDs(renderedIcon.body),
        viewBox,
      } satisfies RenderedIcon;
    })();

    renderedIconCache.set(normalizedIconName, cachedIcon);
  }

  return cachedIcon;
}

function buildMarkerSvg(
  body: string,
  viewBox: string,
  colors: { body: string; glyph: string },
) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
      <defs>
        <filter id="shadow" x="0" y="0" width="32" height="32" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="${colors.body}" flood-opacity="0.35" />
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <circle cx="16" cy="16" r="13" fill="${colors.body}" />
        <svg
          x="8"
          y="8"
          width="16"
          height="16"
          viewBox="${viewBox}"
          preserveAspectRatio="xMidYMid meet"
          style="color:${colors.glyph}"
        >
          ${body}
        </svg>
      </g>
    </svg>
  `;
}

async function getMapMarkerIconUri(
  iconName: string | undefined,
  theme: MapTheme = "gta",
) {
  void theme;

  const normalizedIconName = normalizeMarkerIconName(iconName);
  const markerColors = resolveMapMarkerColors();
  const cacheKey = `${normalizedIconName}:${markerColors.body}:${markerColors.glyph}`;

  let cachedUri = markerUriCache.get(cacheKey);

  if (!cachedUri) {
    cachedUri = renderInnerIcon(normalizedIconName).then((renderedIcon) => {
      const markerSvg = buildMarkerSvg(
        renderedIcon?.body ?? DEFAULT_INNER_ICON_BODY,
        renderedIcon?.viewBox ?? "0 0 24 24",
        markerColors,
      );

      return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markerSvg)}`;
    });
    markerUriCache.set(cacheKey, cachedUri);
  }

  return cachedUri;
}

export { getMapMarkerIconUri, normalizeMarkerIconName };
