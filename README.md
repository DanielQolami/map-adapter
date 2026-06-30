<!--
Get your module up and running quickly.

Find and replace all on all files (CMD+SHIFT+F):
- Name: Map Adapter
- Package name: @daniel-qolami/map-adapter
- Description: A Map component that acts as an adapter
-->

# Map Adapter

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Reusable local Nuxt 4 map module for this workspace.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)
- GitHub: https://github.com/DanielQolami/map-adapter
- npm: https://www.npmjs.com/package/@daniel-qolami/map-adapter

## What it is

This module exports a `MapAdapter` component that acts as an adapter facade for using **Leaflet** and **OpenLayers** behind a common API, so the app shell stays provider-agnostic.

## Features

- ⛰ Keep map-specific code isolated from the app shell
- 🚠 Expose a clean `BaseMap` component to pages and features
- 🌲 Support multiple rendering providers behind one public facade (`MapAdapter`)
- 🔧 Keep provider-only implementation details under the module library layer

## Goals

- keep map-specific code isolated from the app shell
- expose a clean `BaseMap` component to pages and features
- support multiple rendering providers behind one public facade
- keep provider-only implementation details under the module library layer

## External packages used by this module

- `@nuxtjs/leaflet` → Leaflet runtime integration
- `leaflet` and `leaflet.markercluster` → map rendering and marker clustering
- `ol` → OpenLayers adapter support
- `@iconify/utils` → marker/icon normalization helpers
- `@vueuse/nuxt` → browser-friendly composables used by runtime pieces
- `defu` → safe Nuxt/Vite option merging

## Public surface

### Components

- `MapAdapter` (provider facade / adapter component)

### Types

Public contracts live in the module at `runtime/app/types/map.types.ts` and are surfaced through the app DX shim:

```ts
import type { MapMarker } from "#imports";
```

## Internal structure

- `runtime/app/components` → public auto-registered components
- `runtime/app/types` → public shared contracts used by the app
- `runtime/app/lib/map` → internal map implementation details

Key internals:

- `lib/map/map.constants.ts` → normalized defaults and theme config
- `lib/map/map.utils.ts` → marker/cluster normalization helpers
- `lib/map/map-icon.utils.ts` → Iconify-to-marker asset generation
- `lib/map/adapters/leaflet` → Leaflet renderer
- `lib/map/adapters/ol` → OpenLayers renderer
- `lib/map/map-adapter.types.ts` → Component types (props, emits, slots)

## Quick Setup

Install the module to your Nuxt application with one command:

```bash
pnpm add @daniel-qolami/map-adapter
```

add it manually in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ["@daniel-qolami/map-adapter"],
});
```

Then use `MapAdapter` in your pages/components as provided by the module.

## Example usage (suggested)

Use the adapter facade as the provider-agnostic entry point:

```vue
<script setup lang="ts">
const mapCenter = { lat: 34.0522, lng: -118.2437 }; // Los Angeles (GTA V vibe)

const pointsOfInterest: MapMarker[] = [
  {
    id: 1,
    coords: { lat: 34.0522, lng: -118.2437 },
    icon: "i-lucide-coffee",
    title: "Bean Machine",
    description: "Best coffee in LS",
  },
  {
    id: 2,
    coords: { lat: 34.053, lng: -118.24 },
    icon: "i-lucide-utensils",
    title: "Burger Shot",
    description: "Bleeder burger meal",
  },
];

function handleMarkerClick(marker: MapMarker) {
  console.info("Clicked:", marker.title);
}
</script>

<template>
  <div class="my-40 h-200 px-16">
    <MapAdapter
      provider="leaflet"
      theme="standard"
      :center="mapCenter"
      :markers="pointsOfInterest"
      :zoom="14"
      @marker-click="handleMarkerClick"
    />
  </div>
</template>
```

(Refer to the module’s runtime components for the exact props/slots.)

## Contribution

<details>
  <summary>Local development</summary>

```bash
# Install dependencies
npm i
// or
pnpm i

# Generate type stubs
npm run dev:prepare
// or
pnpm dev:prepare

# Develop with the playground
npm run dev
// or
pnpm dev

# Build the playground
npm run dev:build
// or
pnpm dev:build

# Run ESLint
npm run lint
// or
pnpm lint

# Run Vitest
npm run test
npm run test:watch
// or
pnpm test
pnpm test:watch

# Release new version
npm run release
// or
pnpm release
```

</details>

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@daniel-qolami/map-adapter/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/@daniel-qolami/map-adapter
[npm-downloads-src]: https://img.shields.io/npm/dm/@daniel-qolami/map-adapter.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/@daniel-qolami/map-adapter
[license-src]: https://img.shields.io/npm/l/@daniel-qolami/map-adapter.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/@daniel-qolami/map-adapter
[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt
[nuxt-href]: https://nuxt.com
