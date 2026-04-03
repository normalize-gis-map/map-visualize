# 🌊 Flood Warning GIS Platform

A modern web-based GIS platform for monitoring, visualizing, and simulating flood risk areas using 2D, 2.5D, and 3D maps.

Built with a scalable frontend architecture using Next.js, TypeScript, and modern geospatial libraries.

---

## ✨ Features

- 🗺️ Interactive **2D map** for flood visualization
- 🧱 **2.5D extrusion map** for depth-based visualization
- 🌍 **3D map (Cesium)** for simulation and terrain exploration
- 📊 Flood summary dashboard (areas, severity, max depth)
- 🔍 Tooltip inspection (depth, severity, location)
- ⚡ Real-time ready architecture (API-based)
- 🎛️ Map mode switch (2D / 2.5D / 3D)

---

## 🧠 Tech Stack

### Core

- Next.js (App Router)
- TypeScript
- Tailwind CSS

### State & Data

- Zustand
- Zod
- GeoJSON

### Mapping

- MapLibre GL JS (2D / 2.5D)
- CesiumJS (3D visualization)

### Tooling

- ESLint
- Prettier
- pnpm

### Deployment

- Vercel

---

## 📁 Project Structure

```bash
src/
  app/
    (dashboard)/
    api/
  components/
    map/
    flood/
  features/
    flood/
      hooks/
      store/
      types/
      selectors/
      utils/
  lib/
    constants/
    schemas/
  services/
  data/
    geojson/
```
