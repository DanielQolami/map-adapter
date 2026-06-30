<script setup lang="ts">
import { useTemplateRef } from "vue";
import { DEFAULT_CLUSTER_OPTIONS } from "../../map.constants";
import type { MapAdapterEmits, MapAdapterProps } from "../../map-adapter.types";
import type * as Leaflet from "leaflet";
import { useLeafletMap } from "./composables/useLeafletMap";

const props = withDefaults(defineProps<MapAdapterProps>(), {
  cluster: () => ({ ...DEFAULT_CLUSTER_OPTIONS }),
  markers: () => [],
  theme: "gta",
  zoom: 13,
});
const emit = defineEmits<MapAdapterEmits>();

type LeafletMapRef = {
  leafletObject?: Leaflet.Map;
};

const mapRootRef = useTemplateRef<HTMLDivElement>("map-root-ref");
const mapRef = useTemplateRef<LeafletMapRef>("map-ref");
const popupContainerRef = useTemplateRef<HTMLDivElement>("popup-container-ref");

const { activeMarker, onMapReady, tileTheme } = useLeafletMap({
  emit,
  mapRef,
  mapRootRef,
  popupContainerRef,
  props,
});
</script>

<template>
  <div ref="map-root-ref" class="relative size-full">
    <LMap
      ref="map-ref"
      class="size-full"
      :center="[props.center.lat, props.center.lng]"
      :zoom="props.zoom"
      :use-global-leaflet="true"
      :options="{
        attributionControl: true,
        preferCanvas: true,
        zoomControl: true,
      }"
      @ready="onMapReady"
    >
      <LTileLayer
        :url="tileTheme.leafletUrl"
        :attribution="tileTheme.attribution"
        :subdomains="tileTheme.subdomains"
        layer-type="base"
        name="Base layer"
      />
    </LMap>

    <div
      v-show="activeMarker"
      ref="popup-container-ref"
      class="rounded-lg border border-muted bg-default p-3 text-highlighted shadow-xl"
    >
      <slot name="popup" :marker="activeMarker">
        <div class="min-w-44 space-y-2">
          <div class="space-y-2">
            <h3 class="text-sm font-bold">
              {{ activeMarker?.title }}
            </h3>
            <p v-if="activeMarker?.description" class="text-xs text-muted">
              {{ activeMarker?.description }}
            </p>
          </div>

          <a
            v-if="activeMarker?.url"
            :href="activeMarker.url"
            target="_blank"
            rel="noreferrer"
            class="text-xs font-medium text-primary"
          >
            {{ activeMarker.urlLabel || "View More" }}
          </a>
        </div>
      </slot>
    </div>
  </div>
</template>

<style src="./assets/styles.css"></style>
