import type * as Leaflet from "leaflet";
import * as L from "leaflet";
import {
  type ShallowRef,
  computed,
  nextTick,
  shallowRef,
  watch,
  onUnmounted,
} from "vue";
import { useDebounceFn } from "#imports";
import { MAP_TILE_THEMES } from "../../../map.constants";
import {
  getMapMarkerIconUri,
  normalizeMarkerIconName,
} from "../../../map-icon.utils";
import {
  findMarkerById,
  getMapClusterSignature,
  getMapMarkerSignature,
  normalizeMapClusterOptions,
} from "../../../map.utils";
import type { MapMarker } from "../../../../../types/map.types";
import type { MapAdapterProps } from "../../../map-adapter.types";
import {
  buildLeafletClusterHtml,
  buildLeafletMarkerIconHtml,
} from "../utils/leaflet-markup.utils";
import { ensureLeafletMarkerClusterPlugin } from "../utils/leaflet-marker-cluster.utils";

type ClusterMarkerInput = {
  lat: number;
  lng: number;
  name?: string;
  options?: Leaflet.MarkerOptions;
  popup?: string;
};

type LeafletMapRef = {
  leafletObject?: Leaflet.Map;
};

type ResolvedLeafletProps = MapAdapterProps & {
  cluster: NonNullable<MapAdapterProps["cluster"]>;
  markers: readonly MapMarker[];
  theme: NonNullable<MapAdapterProps["theme"]>;
  zoom: NonNullable<MapAdapterProps["zoom"]>;
};

type UseLeafletMapOptions = {
  emit: (event: "marker-click", marker: MapMarker) => void;
  mapRef: Readonly<ShallowRef<LeafletMapRef | null>>;
  mapRootRef: Readonly<ShallowRef<HTMLDivElement | null>>;
  popupContainerRef: Readonly<ShallowRef<HTMLDivElement | null>>;
  props: ResolvedLeafletProps;
};

function useLeafletMap({
  emit,
  mapRef,
  mapRootRef,
  popupContainerRef,
  props,
}: UseLeafletMapOptions) {
  const activeMarker = shallowRef<MapMarker | null>(null);
  const mapInstance = shallowRef<Leaflet.Map | null>(null);
  const markerLayer = shallowRef<Leaflet.LayerGroup | null>(null);
  const popupInstance = shallowRef<Leaflet.Popup | null>(null);

  let resizeObserver: ResizeObserver | null = null;
  let resizeFrame = 0;
  let markerSyncToken = 0;

  const clusterOptions = computed(() =>
    normalizeMapClusterOptions(props.cluster),
  );
  const clusterSignature = computed(() =>
    getMapClusterSignature(clusterOptions.value),
  );
  const markerSignature = computed(() => getMapMarkerSignature(props.markers));
  const tileTheme = computed(() => MAP_TILE_THEMES[props.theme]);

  const scheduleLayerRefresh = useDebounceFn(
    () => {
      void recreateMarkerLayer();
    },
    0,
    { maxWait: 16 },
  );

  function closePopup() {
    activeMarker.value = null;
    popupInstance.value?.remove();
  }

  function syncActiveMarker() {
    if (!activeMarker.value) return;

    activeMarker.value = findMarkerById(props.markers, activeMarker.value.id);

    if (!activeMarker.value) {
      popupInstance.value?.remove();
    }
  }

  function resolveLeafletMap() {
    return mapRef.value?.leafletObject ?? mapInstance.value;
  }

  function destroyMarkerLayer(
    layer: Leaflet.LayerGroup | null = markerLayer.value,
  ) {
    if (!layer) return;

    layer.clearLayers();
    mapInstance.value?.removeLayer(layer);

    if (layer === markerLayer.value) {
      markerLayer.value = null;
    }
  }

  function scheduleSizeInvalidation() {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      mapInstance.value?.invalidateSize(false);
    });
  }

  function syncMapView([lat, lng, zoom]: readonly [number, number, number]) {
    const map = mapInstance.value;

    if (!map) return;

    const center = map.getCenter();

    if (center.lat === lat && center.lng === lng && map.getZoom() === zoom) {
      return;
    }

    map.setView([lat, lng], zoom, { animate: false });
  }

  async function createMarkerOptions(
    markerData: MapMarker,
  ): Promise<Leaflet.MarkerOptions> {
    const iconUri = await getMapMarkerIconUri(
      normalizeMarkerIconName(markerData.icon),
      props.theme,
    );

    return {
      icon: L.divIcon({
        className: "base-map-marker-icon",
        html: buildLeafletMarkerIconHtml(iconUri),
        iconAnchor: [16, 16],
        iconSize: [32, 32],
        popupAnchor: [0, -20],
      }),
      keyboard: true,
      riseOnHover: true,
      title: markerData.title,
    };
  }

  function bindMarkerInteraction(
    leafletMarker: Leaflet.Marker,
    markerData: MapMarker,
  ) {
    leafletMarker.off("click");

    leafletMarker.on("click", async () => {
      activeMarker.value = markerData;
      emit("marker-click", markerData);

      await nextTick();

      if (
        !mapInstance.value
        || !popupContainerRef.value
        || !popupInstance.value
      )
        return;

      popupInstance.value
        .setLatLng([markerData.coords.lat, markerData.coords.lng])
        .setContent(popupContainerRef.value)
        .openOn(mapInstance.value);
    });
  }

  async function createLeafletMarker(markerData: MapMarker) {
    const leafletMarker = L.marker(
      [markerData.coords.lat, markerData.coords.lng],
      await createMarkerOptions(markerData),
    );

    bindMarkerInteraction(leafletMarker, markerData);

    return leafletMarker;
  }

  async function createClusterLayer(map: Leaflet.Map, syncToken: number) {
    const leafletRuntime = await ensureLeafletMarkerClusterPlugin();

    if (!leafletRuntime) return null;

    const clusterMarkers = await Promise.all<ClusterMarkerInput>(
      props.markers.map(async (markerData) => ({
        lat: markerData.coords.lat,
        lng: markerData.coords.lng,
        name: markerData.title,
        options: await createMarkerOptions(markerData),
      })),
    );

    if (syncToken !== markerSyncToken || map !== mapInstance.value) return null;

    const markerCluster = leafletRuntime.markerClusterGroup?.({
      chunkedLoading: true,
      disableClusteringAtZoom: clusterOptions.value.maxZoom,
      iconCreateFunction: (cluster: { getChildCount(): number }) => {
        return L.divIcon({
          className: "base-map-cluster-icon",
          html: buildLeafletClusterHtml(cluster.getChildCount(), props.theme),
          iconAnchor: [24, 24],
          iconSize: [48, 48],
        });
      },
      maxClusterRadius: clusterOptions.value.distance,
      removeOutsideVisibleBounds: true,
      showCoverageOnHover: clusterOptions.value.showCoverageOnHover,
      spiderfyOnMaxZoom: clusterOptions.value.spiderfyOnMaxZoom,
    });

    if (!markerCluster) {
      throw new TypeError("Leaflet MarkerCluster factory is unavailable.");
    }

    const markers: Leaflet.Marker[] = clusterMarkers.map((location) => {
      const leafletMarker = L.marker([location.lat, location.lng], {
        title: location.name,
        ...location.options,
      });

      if (location.popup) {
        const popupRoot = L.DomUtil.create("div", "popup");
        popupRoot.innerHTML = location.popup;
        leafletMarker.bindPopup(popupRoot);
      }

      markerCluster.addLayer(leafletMarker);
      return leafletMarker;
    });

    map.addLayer(markerCluster);

    if (syncToken !== markerSyncToken || map !== mapInstance.value) {
      map.removeLayer(markerCluster);
      return null;
    }

    markers.forEach((leafletMarker, index) => {
      const markerData = props.markers[index];

      if (markerData) {
        bindMarkerInteraction(leafletMarker, markerData);
      }
    });

    return markerCluster;
  }

  async function createFeatureGroup(syncToken: number) {
    const nextFeatureGroup = L.featureGroup();
    const leafletMarkers = await Promise.all(
      props.markers.map((markerData) => createLeafletMarker(markerData)),
    );

    if (syncToken !== markerSyncToken) return null;

    leafletMarkers.forEach((leafletMarker) =>
      nextFeatureGroup.addLayer(leafletMarker),
    );

    return nextFeatureGroup;
  }

  async function recreateMarkerLayer() {
    const map = mapInstance.value;

    if (!map) return;

    const syncToken = ++markerSyncToken;

    destroyMarkerLayer();
    closePopup();

    const nextLayer = clusterOptions.value.enabled
      ? await createClusterLayer(map, syncToken)
      : await createFeatureGroup(syncToken);

    if (
      syncToken !== markerSyncToken
      || map !== mapInstance.value
      || !nextLayer
    ) {
      if (nextLayer) {
        nextLayer.clearLayers();
        map.removeLayer(nextLayer);
      }

      return;
    }

    markerLayer.value = nextLayer;

    if (!clusterOptions.value.enabled) {
      markerLayer.value.addTo(map);
    }
  }

  function initResizeObserver() {
    if (!mapRootRef.value) return;

    resizeObserver = new ResizeObserver(() => {
      scheduleSizeInvalidation();
    });
    resizeObserver.observe(mapRootRef.value);
  }

  function initPopup() {
    if (!mapInstance.value || popupInstance.value) return;

    popupInstance.value = L.popup([0, 0], {
      autoClose: true,
      className: "base-map-leaflet-popup",
      closeButton: false,
      closeOnClick: false,
      maxWidth: 280,
      minWidth: 176,
      offset: [0, -18],
    });

    mapInstance.value.on("popupclose", () => {
      activeMarker.value = null;
    });
  }

  function onMapReady() {
    const map = resolveLeafletMap();

    if (!map || map === mapInstance.value) return;

    mapInstance.value = map;

    initPopup();
    initResizeObserver();
    syncMapView([props.center.lat, props.center.lng, props.zoom]);
    void recreateMarkerLayer();
  }

  watch(
    markerSignature,
    () => {
      syncActiveMarker();
      scheduleLayerRefresh();
    },
    { flush: "post" },
  );

  watch(
    () => props.theme,
    () => {
      scheduleLayerRefresh();
    },
  );

  watch(
    () => [props.center.lat, props.center.lng, props.zoom] as const,
    syncMapView,
  );
  watch(clusterSignature, () => scheduleLayerRefresh());

  onUnmounted(() => {
    if (resizeObserver) resizeObserver.disconnect();
    if (resizeFrame) window.cancelAnimationFrame(resizeFrame);

    popupInstance.value?.remove();
    popupInstance.value = null;
    destroyMarkerLayer();
    mapInstance.value = null;
  });

  return {
    activeMarker,
    onMapReady,
    tileTheme,
  };
}

export { useLeafletMap };
