import { resolveMapThemePalette } from "../../../map.constants";
import type { MapTheme } from "../../../../../types/map.types";

function buildLeafletMarkerIconHtml(iconUri: string) {
  return `
    <div class="base-map-marker-shell">
      <img src="${iconUri}" alt="" class="base-map-marker-image" />
    </div>
  `;
}

function buildLeafletClusterHtml(count: number, theme: MapTheme) {
  const palette = resolveMapThemePalette(theme);

  return `
    <div
      class="base-map-cluster"
      style="background:${palette.clusterBg};border-color:${palette.clusterRing};color:${palette.clusterText}"
    >
      <span>${count}</span>
    </div>
  `;
}

export { buildLeafletClusterHtml, buildLeafletMarkerIconHtml };
