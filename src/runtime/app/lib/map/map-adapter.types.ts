import type {
  Coordinates,
  MapMarker,
  MapTheme,
  MapClusterOptions,
} from "../../types/map.types";

/** Public props accepted by the provider-agnostic map wrapper. */
interface MapAdapterProps {
  center: Coordinates;
  zoom?: number;
  markers?: readonly MapMarker[];
  theme?: MapTheme;
  cluster?: MapClusterOptions;
  lazy?: boolean;
}

/** Emits exposed by every provider implementation. */
interface MapAdapterEmits {
  "marker-click": [marker: MapMarker];
}

interface MapAdapterSlots {
  popup(props: { marker: MapMarker | null }): unknown;
  offViewMessage(): unknown;
}

export type { MapAdapterEmits, MapAdapterProps, MapAdapterSlots };
