import Feature from "ol/Feature.js";
import Point from "ol/geom/Point.js";
import { fromLonLat } from "ol/proj.js";
import {
  getMapMarkerIconUri,
  normalizeMarkerIconName,
} from "../../../map-icon.utils";
import type { MapMarker, MapTheme } from "../../../../../types/map.types";

async function createOpenLayersMarkerFeature(
  markerData: MapMarker,
  theme: MapTheme,
) {
  const iconUri = await getMapMarkerIconUri(
    normalizeMarkerIconName(markerData.icon),
    theme,
  );

  return new Feature({
    geometry: new Point(
      fromLonLat([markerData.coords.lng, markerData.coords.lat]),
    ),
    iconUri,
    markerData,
  });
}

export { createOpenLayersMarkerFeature };
