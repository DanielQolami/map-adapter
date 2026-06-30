<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useTextDirection } from "#imports";
import { DEFAULT_CLUSTER_OPTIONS } from "../../map.constants";
import { useOpenLayersMap } from "./composables/useOpenLayersMap";
import type { MapAdapterEmits, MapAdapterProps } from "../../map-adapter.types";

import "ol/ol.css";

const props = withDefaults(defineProps<MapAdapterProps>(), {
  cluster: () => ({ ...DEFAULT_CLUSTER_OPTIONS }),
  markers: () => [],
  theme: "gta",
  zoom: 13,
});
const emit = defineEmits<MapAdapterEmits>();

const dir = useTextDirection(); // Ref<'ltr' | 'rtl' | 'auto'>

const mapContainerRef = useTemplateRef<HTMLDivElement>("map-container-ref");
const popupContainerRef = useTemplateRef<HTMLDivElement>("popup-container-ref");

const { activeMarker } = useOpenLayersMap({
  emit,
  mapContainerRef,
  popupContainerRef,
  props,
});
</script>

<template>
  <div class="relative size-full" dir="ltr">
    <div ref="map-container-ref" class="size-full" />

    <div
      v-show="activeMarker"
      ref="popup-container-ref"
      :dir="dir"
      class="min-w-44 rounded-lg border border-muted bg-default p-3 text-highlighted shadow-xl"
    >
      <slot name="popup" :marker="activeMarker">
        <div class="space-y-2">
          <div>
            <h3 class="mb-1 text-sm font-bold">
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
            {{ activeMarker.urlLabel || "View more" }}
          </a>
        </div>
      </slot>
    </div>
  </div>
</template>
