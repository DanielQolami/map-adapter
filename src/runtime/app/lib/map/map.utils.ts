import { DEFAULT_CLUSTER_OPTIONS } from "./map.constants";
import type { MapClusterOptions, MapMarker } from "../../types/map.types";

function normalizeMapClusterOptions(
  cluster?: MapClusterOptions,
): Required<MapClusterOptions> {
  return {
    ...DEFAULT_CLUSTER_OPTIONS,
    ...cluster,
  };
}

function getMapClusterSignature(cluster: Required<MapClusterOptions>) {
  return [
    cluster.enabled ? 1 : 0,
    cluster.distance,
    cluster.maxZoom,
    cluster.spiderfyOnMaxZoom ? 1 : 0,
    cluster.showCoverageOnHover ? 1 : 0,
  ].join(":");
}

function getMapMarkerSignature(markers: readonly MapMarker[]) {
  return markers
    .map((marker) => {
      return [
        marker.id,
        marker.coords.lat,
        marker.coords.lng,
        marker.icon ?? "",
        marker.title,
        marker.description ?? "",
        marker.url ?? "",
      ].join("\u001F");
    })
    .join("\u001E");
}

function findMarkerById(
  markers: readonly MapMarker[],
  markerId: MapMarker["id"],
) {
  return markers.find((marker) => marker.id === markerId) ?? null;
}

export {
  findMarkerById,
  getMapClusterSignature,
  getMapMarkerSignature,
  normalizeMapClusterOptions,
};
