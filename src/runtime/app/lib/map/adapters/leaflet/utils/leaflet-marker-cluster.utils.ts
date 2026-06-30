import type * as Leaflet from "leaflet";

type LeafletRuntimeModule = typeof import("leaflet");
type LeafletClusterRuntime = LeafletRuntimeModule & {
  markerClusterGroup?: (options?: Leaflet.MarkerClusterGroupOptions) => Leaflet.MarkerClusterGroup;
};

let leafletRuntimePromise: Promise<LeafletClusterRuntime> | null = null;
let markerClusterImportPromise: Promise<unknown> | null = null;

async function loadLeafletRuntime() {
  if (!leafletRuntimePromise) {
    leafletRuntimePromise = import("leaflet") as Promise<LeafletClusterRuntime>;
  }

  return leafletRuntimePromise;
}

async function ensureLeafletMarkerClusterPlugin() {
  if (!import.meta.client) return;

  const leafletWindow = window as Window & {
    L?: LeafletClusterRuntime;
  };

  leafletWindow.L ??= await loadLeafletRuntime();

  if (!markerClusterImportPromise) {
    markerClusterImportPromise = import("leaflet.markercluster");
  }

  await markerClusterImportPromise;

  if (!leafletWindow.L?.markerClusterGroup) {
    throw new TypeError(
      "Leaflet MarkerCluster plugin failed to register on the global Leaflet instance.",
    );
  }

  return leafletWindow.L;
}

export { ensureLeafletMarkerClusterPlugin };
