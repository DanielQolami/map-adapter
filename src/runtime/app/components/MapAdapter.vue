<script setup lang="ts">
import {
  type HTMLAttributes,
  computed,
  defineAsyncComponent,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";
import { useElementVisibility } from "#imports";

import { DEFAULT_CLUSTER_OPTIONS } from "../lib/map/map.constants";
import type { MapProvider } from "../types/map.types";
import type {
  MapAdapterProps,
  MapAdapterEmits,
  MapAdapterSlots,
} from "../lib/map/map-adapter.types";

type MapProps = {
  provider?: MapProvider;
  class?: HTMLAttributes["class"];
} & MapAdapterProps;

const props = withDefaults(defineProps<MapProps>(), {
  cluster: () => ({ ...DEFAULT_CLUSTER_OPTIONS }),
  lazy: true,
  markers: () => [],
  provider: "leaflet",
  theme: "gta",
  zoom: 13,
});
const emit = defineEmits<MapAdapterEmits>();
defineSlots<MapAdapterSlots>();

const rootRef = useTemplateRef<HTMLDivElement>("root-ref");

/** Tracks when the placeholder enters the viewport enough to justify loading a map engine. */
const isVisible = useElementVisibility(rootRef, {
  threshold: 0.15,
});
const hasEnteredViewport = shallowRef(false);

/** Lazy provider registry keeps heavy map runtimes out of the initial bundle. */
const MapLeaflet = defineAsyncComponent({
  loader: () => import("../lib/map/adapters/leaflet/MapLeaflet.vue"),
  suspensible: false,
});
const MapOpenLayers = defineAsyncComponent({
  loader: () => import("../lib/map/adapters/ol/MapOpenLayers.vue"),
  suspensible: false,
});

const providerComponents: Record<MapProvider, typeof MapLeaflet> = {
  leaflet: MapLeaflet,
  openlayers: MapOpenLayers,
};

/** Stop observing visibility after the first intersection to avoid extra reactive work. */
const stopVisibilityWatch = watch(
  isVisible,
  (nextValue) => {
    if (!nextValue) return;

    hasEnteredViewport.value = true;
    queueMicrotask(() => stopVisibilityWatch());
  },
  { immediate: true },
);

const shouldRenderMap = computed(() => {
  return !props.lazy || hasEnteredViewport.value;
});

const ActiveProvider = computed(() => {
  return providerComponents[props.provider];
});
</script>

<template>
  <div
    ref="root-ref"
    :class="[
      'relative size-full min-h-100 overflow-hidden rounded-lg bg-default',
      props.class,
    ]"
  >
    <component
      :is="ActiveProvider"
      v-if="shouldRenderMap"
      v-bind="props"
      @marker-click="emit('marker-click', $event)"
    >
      <template v-slot:popup="{ marker }">
        <slot name="popup" :marker="marker" />
      </template>
    </component>

    <div
      v-else
      class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/30 border rounded-lg"
    >
      <div
        class="flex size-14 items-center justify-center rounded-full border border-muted bg-default shadow-sm"
      >
        <UIcon name="i-lucide-map-pinned" class="size-6 text-muted" />
      </div>
      <slot name="offViewMessage">
        <p class="text-sm text-muted">
          Map will load when visible
        </p>
      </slot>
    </div>
  </div>
</template>
