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
  <div>
    Nuxt module playground!

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
  </div>
</template>
