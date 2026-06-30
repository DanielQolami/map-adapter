import {
  type ShallowRef,
  computed,
  nextTick,
  shallowRef,
  watch,
  onMounted,
  onUnmounted,
} from "vue";
import { useDebounceFn } from "#imports";
import type { EventsKey } from "ol/events";
import { unByKey } from "ol/Observable.js";
import OlMap from "ol/Map.js";
import View from "ol/View.js";
import Overlay from "ol/Overlay.js";
import type BaseEvent from "ol/events/Event.js";
import type MapBrowserEvent from "ol/MapBrowserEvent.js";
import TileLayer from "ol/layer/Tile.js";
import VectorLayer from "ol/layer/Vector.js";
import XYZ from "ol/source/XYZ.js";
import Cluster from "ol/source/Cluster.js";
import VectorSource from "ol/source/Vector.js";
import type Feature from "ol/Feature.js";
import type Point from "ol/geom/Point.js";
import { createEmpty, extend } from "ol/extent.js";
import { fromLonLat } from "ol/proj.js";
import type { Style } from "ol/style.js";
import { MAP_TILE_THEMES } from "../../../map.constants";
import {
  findMarkerById,
  getMapClusterSignature,
  getMapMarkerSignature,
  normalizeMapClusterOptions,
} from "../../../map.utils";
import type {
  MapClusterOptions,
  MapMarker,
} from "../../../../../types/map.types";
import type { MapAdapterProps } from "../../../map-adapter.types";
import { createOpenLayersMarkerFeature } from "../utils/open-layers-feature.utils";
import { getOpenLayersFeatureStyle } from "../utils/open-layers-style.utils";

type ResolvedOpenLayersProps = MapAdapterProps & {
  cluster: NonNullable<MapAdapterProps["cluster"]>;
  markers: readonly MapMarker[];
  theme: NonNullable<MapAdapterProps["theme"]>;
  zoom: NonNullable<MapAdapterProps["zoom"]>;
};

type UseOpenLayersMapOptions = {
  emit: (event: "marker-click", marker: MapMarker) => void;
  mapContainerRef: Readonly<ShallowRef<HTMLDivElement | null>>;
  popupContainerRef: Readonly<ShallowRef<HTMLDivElement | null>>;
  props: ResolvedOpenLayersProps;
};

function useOpenLayersMap({
  emit,
  mapContainerRef,
  popupContainerRef,
  props,
}: UseOpenLayersMapOptions) {
  const activeMarker = shallowRef<MapMarker | null>(null);
  const mapInstance = shallowRef<OlMap | null>(null);
  const baseLayer = shallowRef<TileLayer<XYZ> | null>(null);
  const vectorLayer = shallowRef<VectorLayer | null>(null);
  const vectorSource = shallowRef<VectorSource<Feature<Point>> | null>(null);
  const clusterSource = shallowRef<Cluster<Feature<Point>> | null>(null);
  const popupOverlay = shallowRef<Overlay | null>(null);
  const styleCache = new Map<string, Style>();

  let resizeObserver: ResizeObserver | null = null;
  let resizeFrame = 0;
  let markerSyncToken = 0;
  let currentCursor = "";
  let mapEventKeys: EventsKey[] = [];

  const clusterOptions = computed<Required<MapClusterOptions>>(() =>
    normalizeMapClusterOptions(props.cluster),
  );

  const clusterSignature = computed(() =>
    getMapClusterSignature(clusterOptions.value),
  );
  const markerSignature = computed(() => getMapMarkerSignature(props.markers));

  const scheduleMarkerUpdate = useDebounceFn(
    () => {
      void updateMarkers();
    },
    0,
    { maxWait: 16 },
  );

  function closePopup() {
    popupOverlay.value?.setPosition(undefined);
    activeMarker.value = null;
  }

  function syncActiveMarker() {
    if (!activeMarker.value) return;

    activeMarker.value = findMarkerById(props.markers, activeMarker.value.id);

    if (!activeMarker.value) {
      popupOverlay.value?.setPosition(undefined);
    }
  }

  function initMap() {
    if (mapInstance.value || !mapContainerRef.value || !popupContainerRef.value)
      return;

    vectorSource.value = new VectorSource();
    baseLayer.value = new TileLayer({
      source: new XYZ({
        crossOrigin: "anonymous",
        url: MAP_TILE_THEMES[props.theme].openLayersUrl,
      }),
    });
    vectorLayer.value = new VectorLayer({
      renderBuffer: 120,
      source: vectorSource.value,
      style: (feature) =>
        getOpenLayersFeatureStyle(feature as Feature, props.theme, styleCache),
      updateWhileAnimating: false,
      updateWhileInteracting: false,
    });

    popupOverlay.value = new Overlay({
      element: popupContainerRef.value,
      positioning: "bottom-center",
      stopEvent: true,
      offset: [0, -24],
    });

    mapInstance.value = new OlMap({
      target: mapContainerRef.value,
      layers: [baseLayer.value, vectorLayer.value],
      overlays: [popupOverlay.value],
      view: new View({
        center: fromLonLat([props.center.lng, props.center.lat]),
        zoom: props.zoom,
      }),
    });

    refreshVectorLayerSource();
  }

  function syncMapView([lat, lng, zoom]: readonly [number, number, number]) {
    const view = mapInstance.value?.getView();

    if (!view) return;

    const nextCenter = fromLonLat([lng, lat]);
    const currentCenter = view.getCenter();
    const currentZoom = view.getZoom();

    if (
      currentCenter
      && currentCenter[0] === nextCenter[0]
      && currentCenter[1] === nextCenter[1]
      && currentZoom === zoom
    ) {
      return;
    }

    view.setCenter(nextCenter);
    view.setZoom(zoom);
  }

  function zoomToCluster(features: Feature[]) {
    if (!mapInstance.value) return;

    const extent = createEmpty();
    features.forEach((feature) => {
      const geometry = feature.getGeometry();

      if (geometry) {
        extend(extent, geometry.getExtent());
      }
    });

    mapInstance.value.getView().fit(extent, {
      duration: 250,
      maxZoom: clusterOptions.value.maxZoom,
      padding: [72, 72, 72, 72],
    });
  }

  async function handleMapSingleClick(evt: MapBrowserEvent<PointerEvent>) {
    const map = mapInstance.value;

    if (!map) return;

    const feature = map.forEachFeatureAtPixel(evt.pixel, (featureAtPixel) => {
      return featureAtPixel as Feature;
    });

    if (!feature) {
      closePopup();
      return;
    }

    const features = (feature.get("features") as Feature[] | undefined) ?? [
      feature,
    ];

    if (features.length > 1) {
      zoomToCluster(features);
      return;
    }

    const sourceFeature = features[0];

    if (!sourceFeature) return;

    const markerData = sourceFeature.get("markerData") as MapMarker;
    const coordinates = (sourceFeature.getGeometry() as Point).getCoordinates();

    activeMarker.value = markerData;

    await nextTick();

    popupOverlay.value?.setPosition(coordinates);
    emit("marker-click", markerData);
  }

  function handlePointerMove(evt: MapBrowserEvent<PointerEvent>) {
    const map = mapInstance.value;

    if (!map) return;

    const hit = map.hasFeatureAtPixel(evt.pixel);
    const nextCursor = hit ? "pointer" : "";

    if (mapContainerRef.value && nextCursor !== currentCursor) {
      mapContainerRef.value.style.cursor = nextCursor;
      currentCursor = nextCursor;
    }
  }

  function setupEventListeners() {
    if (!mapInstance.value) return;

    mapEventKeys = [
      mapInstance.value.on("singleclick", (evt: BaseEvent) => {
        void handleMapSingleClick(evt as MapBrowserEvent<PointerEvent>);
      }),
      mapInstance.value.on("pointermove", (evt: BaseEvent) => {
        handlePointerMove(evt as MapBrowserEvent<PointerEvent>);
      }),
    ];
  }

  function initResizeObserver() {
    if (!mapContainerRef.value) return;

    resizeObserver = new ResizeObserver(() => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        mapInstance.value?.updateSize();
      });
    });
    resizeObserver.observe(mapContainerRef.value);
  }

  function refreshVectorLayerSource() {
    if (!vectorLayer.value || !vectorSource.value) return;

    clusterSource.value = clusterOptions.value.enabled
      ? new Cluster({
          distance: clusterOptions.value.distance,
          minDistance: Math.round(clusterOptions.value.distance / 4),
          source: vectorSource.value,
        })
      : null;

    vectorLayer.value.setSource(clusterSource.value ?? vectorSource.value);
  }

  function applyTheme(theme: NonNullable<MapAdapterProps["theme"]>) {
    baseLayer.value?.getSource()?.setUrl(MAP_TILE_THEMES[theme].openLayersUrl);
  }

  async function updateMarkers() {
    if (!vectorSource.value) return;

    const syncToken = ++markerSyncToken;
    const features = await Promise.all(
      props.markers.map((markerData) =>
        createOpenLayersMarkerFeature(markerData, props.theme),
      ),
    );

    if (!vectorSource.value || syncToken !== markerSyncToken) return;

    vectorSource.value.clear(true);
    vectorSource.value.addFeatures(features);

    if (activeMarker.value) {
      const stillExists = props.markers.some(
        (markerData) => markerData.id === activeMarker.value?.id,
      );

      if (!stillExists) {
        closePopup();
      }
    }
  }

  watch(
    markerSignature,
    () => {
      syncActiveMarker();
      scheduleMarkerUpdate();
    },
    { flush: "post" },
  );

  watch(
    () => props.theme,
    (nextTheme) => {
      applyTheme(nextTheme);
      styleCache.clear();
      scheduleMarkerUpdate();
    },
  );

  watch(
    () => [props.center.lat, props.center.lng, props.zoom] as const,
    syncMapView,
  );
  watch(clusterSignature, () => refreshVectorLayerSource());

  onMounted(() => {
    if (!mapContainerRef.value || !popupContainerRef.value) return;

    initMap();
    setupEventListeners();
    initResizeObserver();
    void updateMarkers();
  });

  onUnmounted(() => {
    if (resizeObserver) resizeObserver.disconnect();
    if (resizeFrame) window.cancelAnimationFrame(resizeFrame);

    closePopup();
    unByKey(mapEventKeys);
    mapEventKeys = [];

    if (mapInstance.value) {
      mapInstance.value.setTarget(undefined);
      mapInstance.value = null;
    }

    baseLayer.value = null;
    vectorLayer.value = null;
    vectorSource.value = null;
    clusterSource.value = null;
    popupOverlay.value = null;
    styleCache.clear();
    currentCursor = "";
  });

  return {
    activeMarker,
  };
}

export { useOpenLayersMap };
