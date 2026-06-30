/** Geographic point expressed in WGS84 coordinates. */
interface Coordinates {
  lat: number;
  lng: number;
}

/** Supported visual themes for the map renderer. */
type MapTheme = "gta" | "standard";

/** Rendering engines supported by the shared map facade. */
type MapProvider = "leaflet" | "openlayers";

/** Shared map marker contract consumed by all adapters. */
interface MapMarker {
  id: string | number;
  coords: Coordinates;
  /**
   *  Iconify icon name
   *
   * @example `i-lucide-coffee`.
   */
  icon?: string;
  title: string;
  description?: string;
  url?: string;
  /**
   * Label to show on the link.
   *
   * @default "View more"
   */
  urlLabel?: string;
  meta?: Record<string, unknown>;
}

/**
 * Cluster behaviour knobs normalized by each provider.
 * Providers may ignore options that are not supported natively.
 */
interface MapClusterOptions {
  enabled?: boolean;
  distance?: number;
  maxZoom?: number;
  spiderfyOnMaxZoom?: boolean;
  showCoverageOnHover?: boolean;
}

/** Slot payload used by provider popup templates. */
interface MapPopupSlotProps {
  marker: MapMarker | null;
}

/** Runtime-safe tile theme configuration shared across providers. */
interface MapTileThemeConfig {
  attribution: string;
  leafletUrl: string;
  openLayersUrl: string;
  subdomains?: string[];
}

/**
 * Static colors used for generated SVG/data URI assets.
 * Runtime CSS variables are preferred elsewhere, but SVG data URIs need concrete values.
 */
interface MapThemePalette {
  clusterBg: string;
  clusterRing: string;
  clusterText: string;
}

export type {
  Coordinates,
  MapClusterOptions,
  MapMarker,
  MapPopupSlotProps,
  MapProvider,
  MapTheme,
  MapThemePalette,
  MapTileThemeConfig,
};
