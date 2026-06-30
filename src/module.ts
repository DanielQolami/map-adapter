import {
  addComponent,
  addImportsDir,
  defineNuxtModule,
  createResolver,
} from "@nuxt/kit";
import { defu } from "defu";

// Module options TypeScript interface definition
// export interface ModuleOptions {}

/**
 * Dependencies that are expensive to discover lazily during development.
 * Pre-bundling them keeps the map adapters plug-and-play across projects.
 */
const MAP_OPTIMIZE_DEPS = [
  "ol/Map.js",
  "ol/View.js",
  "ol/Overlay.js",
  "ol/layer/Tile.js",
  "ol/layer/Vector.js",
  "ol/source/Cluster.js",
  "ol/source/XYZ.js",
  "ol/source/Vector.js",
  "ol/Feature.js",
  "ol/geom/Point.js",
  "ol/extent.js",
  "ol/style.js",
  "ol/proj.js",
  "ol/Observable.js",

  "leaflet",
  "leaflet.markercluster",

  "@iconify/utils",
] as const;

// export default defineNuxtModule<ModuleOptions>({
export default defineNuxtModule({
  meta: {
    name: "@daniel-qolami/map-adapter",
    configKey: "mapAdapter",
    compatibility: {
      nuxt: ">=4.4.0",
    },
  },
  moduleDependencies: {
    "@nuxt/ui": {
      version: ">=4.9.0",
    },
    "@nuxtjs/leaflet": {
      version: ">=1.3.0",
    },
    "@vueuse/nuxt": {
      version: ">=14.3.0",
    },
    /* ol: {
      version: ">=10.9.0",
    }, */
  },
  // Default configuration options of the Nuxt module
  defaults: {},
  hooks: {},
  /**
   * Register public components/types and tune Vite for the supported map providers.
   */
  setup(_options, nuxt) {
    const resolver = createResolver(import.meta.url);

    // We can inject our CSS file which includes Tailwind's directives
    nuxt.options.css.push(resolver.resolve("./runtime/app/assets/main.css"));

    const viteOptions = (nuxt.options.vite = defu(nuxt.options.vite || {}, {
      optimizeDeps: {
        include: [],
      },
    }));
    const optimizeDeps = viteOptions.optimizeDeps ?? { include: [] };
    const include = [...(optimizeDeps.include || [])] as string[];
    const nuxtOptionsWithLeaflet = nuxt.options as typeof nuxt.options & {
      leaflet?: {
        markerCluster?: boolean;
      };
    };

    for (const dependency of MAP_OPTIMIZE_DEPS) {
      if (!include.includes(dependency)) {
        include.push(dependency);
      }
    }

    optimizeDeps.include = include;

    // Marker clustering is enabled here so consuming projects do not need to remember it in
    // their root `nuxt.config.ts` when they copy this module.
    nuxtOptionsWithLeaflet.leaflet = defu(
      nuxtOptionsWithLeaflet.leaflet || {},
      {
        markerCluster: true,
      },
    );

    // export component
    addComponent({
      name: "MapAdapter",
      filePath: resolver.resolve("runtime/app/components/MapAdapter.vue"),
    });

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    // export types
    addImportsDir(resolver.resolve("./runtime/app/types"));
  },
});
