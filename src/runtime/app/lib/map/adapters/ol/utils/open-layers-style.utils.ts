import type Feature from "ol/Feature.js";
import {
  Circle as CircleStyle,
  Fill,
  Icon,
  Stroke,
  Style,
  Text,
} from "ol/style.js";
import { resolveMapThemePalette } from "../../../map.constants";
import type { MapTheme } from "../../../../../types/map.types";

function getOpenLayersFeatureStyle(
  feature: Feature,
  theme: MapTheme,
  styleCache: Map<string, Style>,
) {
  const clusterFeatures = (feature.get("features") as
    | Feature[]
    | undefined) ?? [feature];

  if (clusterFeatures.length > 1) {
    const cacheKey = `${theme}:cluster:${clusterFeatures.length}`;
    const cachedStyle = styleCache.get(cacheKey);

    if (cachedStyle) return cachedStyle;

    const palette = resolveMapThemePalette(theme);
    const style = new Style({
      image: new CircleStyle({
        fill: new Fill({ color: palette.clusterBg }),
        radius: 22,
        stroke: new Stroke({
          color: palette.clusterRing,
          width: 3,
        }),
      }),
      text: new Text({
        fill: new Fill({ color: palette.clusterText }),
        font: "700 13px Inter, sans-serif",
        text: String(clusterFeatures.length),
      }),
    });

    styleCache.set(cacheKey, style);
    return style;
  }

  const sourceFeature = clusterFeatures[0];

  if (!sourceFeature) return undefined;

  const iconUri = sourceFeature.get("iconUri") as string | undefined;
  const cacheKey = `${theme}:marker:${iconUri}`;
  const cachedStyle = styleCache.get(cacheKey);

  if (cachedStyle) return cachedStyle;

  const style = new Style({
    image: new Icon({
      anchor: [0.5, 0.5],
      src: iconUri,
    }),
  });

  styleCache.set(cacheKey, style);
  return style;
}

export { getOpenLayersFeatureStyle };
