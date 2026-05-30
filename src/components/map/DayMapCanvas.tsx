'use client';

import { useEffect, useRef } from 'react';
import maplibregl, {
  type Map as MlMap,
  type Marker,
  type GeoJSONSource,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Supercluster from 'supercluster';
import './day-map.css';
import type {
  DayMapPoint,
  ScheduledMapPoint,
  FoodWishMapPoint,
  ActivityWishMapPoint,
} from '@/lib/trips/dayMapPoints';
import { buildStyleUrl, type MapTheme } from '@/lib/map/style';
import { createMarkerElement } from './markers/createMarkerElement';
import { createClusterElement } from './markers/createClusterElement';

interface DayMapCanvasProps {
  points: DayMapPoint[];
  theme: MapTheme;
  onSelectPoint: (point: DayMapPoint) => void;
}

const FIT_PADDING = 64;
const SINGLE_POINT_ZOOM = 14;
const ROUTE_SOURCE_ID = 'dm-route';
const ROUTE_LAYER_ID = 'dm-route-line';
// Pixel radius within which wishlist pins collapse into a "+N" cluster.
const CLUSTER_RADIUS = 48;
const CLUSTER_MAX_ZOOM = 18;

type WishPoint = FoodWishMapPoint | ActivityWishMapPoint;
type WishProps = { point: WishPoint };

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function isAnchor(point: DayMapPoint): boolean {
  return point.kind === 'lodging' || point.kind === 'scheduled';
}

function isWish(point: DayMapPoint): point is WishPoint {
  return point.kind === 'foodWish' || point.kind === 'activityWish';
}

/** Resolves a CSS color expression (e.g. `var(--kind-activity)`) to an rgb()
 *  string MapLibre's color parser accepts. Mixing the token with itself `in
 *  srgb` forces the computed value into sRGB, so getComputedStyle serializes it
 *  as `rgb()` rather than a wide-gamut `lab()`/`oklch()` MapLibre would reject. */
function resolveColor(expression: string): string {
  const probe = document.createElement('span');
  probe.style.color = `color-mix(in srgb, ${expression}, ${expression})`;
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  // Bail to a sane default if color-mix yielded nothing parseable.
  return resolved.startsWith('rgb') ? resolved : '#3b82f6';
}

function fitToPoints(map: MlMap, points: DayMapPoint[]): void {
  const animate = !prefersReducedMotion();
  if (points.length === 1) {
    map.easeTo({
      center: [points[0].lng, points[0].lat],
      zoom: SINGLE_POINT_ZOOM,
      animate,
    });
    return;
  }
  const bounds = new maplibregl.LngLatBounds();
  for (const p of points) bounds.extend([p.lng, p.lat]);
  map.fitBounds(bounds, { padding: FIT_PADDING, maxZoom: 15, animate });
}

/** Time-ordered LineString through the day's scheduled stops (the route). */
function routeFeatureCollection(
  points: DayMapPoint[],
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  const coordinates = points
    .filter((p): p is ScheduledMapPoint => p.kind === 'scheduled')
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((p) => [p.lng, p.lat]);

  return {
    type: 'FeatureCollection',
    features:
      coordinates.length >= 2
        ? [
            {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates },
            },
          ]
        : [],
  };
}

/**
 * Imperative MapLibre wrapper. Kept renderer-only: it draws the basemap, the
 * day's route line, and the markers (clustering wishlist pins into "+N" pills),
 * and reports marker clicks upward. All trip state, popovers and the "add to
 * day" flow live in the React layer (DayMap).
 *
 * Loaded via `dynamic(..., { ssr: false })` so maplibre-gl never enters the
 * first-load bundle.
 */
export function DayMapCanvas({
  points,
  theme,
  onSelectPoint,
}: DayMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const clusterIndexRef = useRef<Supercluster<WishProps> | null>(null);
  const readyRef = useRef(false);
  // Latest props read by viewport handlers without forcing map re-init.
  const onSelectRef = useRef(onSelectPoint);
  const pointsRef = useRef(points);

  // Keep the imperative handlers reading the latest callback (synced post-render
  // so we never write a ref during render).
  useEffect(() => {
    onSelectRef.current = onSelectPoint;
  }, [onSelectPoint]);

  // Rebuild the wishlist cluster index from the current points.
  function buildIndex(): void {
    const wishes = pointsRef.current.filter(isWish);
    const index = new Supercluster<WishProps>({
      radius: CLUSTER_RADIUS,
      maxZoom: CLUSTER_MAX_ZOOM,
    });
    index.load(
      wishes.map((p) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
        properties: { point: p },
      })),
    );
    clusterIndexRef.current = index;
  }

  // Reconcile markers for the current viewport: anchors render individually,
  // wishlist pins are clustered into "+N" pills via the supercluster index.
  function renderMarkers(): void {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    type Spec =
      | { type: 'marker'; point: DayMapPoint }
      | {
          type: 'cluster';
          clusterId: number;
          count: number;
          lng: number;
          lat: number;
        };
    const desired = new Map<string, Spec>();

    for (const p of pointsRef.current) {
      if (isAnchor(p)) desired.set(p.id, { type: 'marker', point: p });
    }

    const index = clusterIndexRef.current;
    if (index) {
      const b = map.getBounds();
      const bbox: [number, number, number, number] = [
        b.getWest(),
        b.getSouth(),
        b.getEast(),
        b.getNorth(),
      ];
      const zoom = Math.round(map.getZoom());
      for (const feature of index.getClusters(bbox, zoom)) {
        const props = feature.properties;
        if ('cluster' in props && props.cluster) {
          const [lng, lat] = feature.geometry.coordinates;
          // Key on count too so a cluster whose size changes is re-created.
          const id = `cluster-${props.cluster_id}-${props.point_count}`;
          desired.set(id, {
            type: 'cluster',
            clusterId: props.cluster_id,
            count: props.point_count,
            lng,
            lat,
          });
        } else {
          const point = (props as WishProps).point;
          desired.set(point.id, { type: 'marker', point });
        }
      }
    }

    // Remove markers no longer present.
    for (const [id, marker] of markersRef.current) {
      if (!desired.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    // Add newly desired markers.
    for (const [id, spec] of desired) {
      if (markersRef.current.has(id)) continue;

      let el: HTMLButtonElement;
      let lngLat: [number, number];
      if (spec.type === 'cluster') {
        el = createClusterElement(spec.count);
        lngLat = [spec.lng, spec.lat];
        const { clusterId, lng, lat } = spec;
        el.addEventListener('click', () => {
          const idx = clusterIndexRef.current;
          if (!idx) return;
          const expansionZoom = idx.getClusterExpansionZoom(clusterId);
          map.easeTo({
            center: [lng, lat],
            zoom: expansionZoom,
            animate: !prefersReducedMotion(),
          });
        });
      } else {
        const point = spec.point;
        el = createMarkerElement(point);
        lngLat = [point.lng, point.lat];
        el.addEventListener('click', () => onSelectRef.current(point));
      }

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(lngLat)
        .addTo(map);
      markersRef.current.set(id, marker);
    }
  }

  // Init map once per theme (basemap style change re-creates the map).
  useEffect(() => {
    const styleUrl = buildStyleUrl(theme);
    if (!containerRef.current || !styleUrl) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [0, 20],
      zoom: 1,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }));
    mapRef.current = map;

    const markers = markersRef.current;
    const handleViewportChange = () => renderMarkers();

    // MapLibre doesn't auto-resize when its container changes (e.g. expanding
    // to full screen, or a window resize), so keep the canvas in sync. Coalesce
    // bursts into a single resize per frame.
    let resizeFrame = 0;
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => map.resize());
    });
    resizeObserver.observe(containerRef.current);

    map.once('load', () => {
      readyRef.current = true;

      map.addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: routeFeatureCollection(pointsRef.current),
      });
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': resolveColor('var(--kind-activity)'),
          'line-width': 3,
          'line-opacity': 0.55,
        },
      });

      buildIndex();
      renderMarkers();
      // Re-cluster whenever the viewport settles (covers pan and zoom).
      map.on('moveend', handleViewportChange);
      if (pointsRef.current.length > 0) fitToPoints(map, pointsRef.current);
    });

    return () => {
      readyRef.current = false;
      cancelAnimationFrame(resizeFrame);
      resizeObserver.disconnect();
      map.off('moveend', handleViewportChange);
      markers.forEach((m) => m.remove());
      markers.clear();
      map.remove();
      mapRef.current = null;
      clusterIndexRef.current = null;
    };
  }, [theme]);

  // Rebuild index + route + markers and refit when the points change.
  useEffect(() => {
    pointsRef.current = points;
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    const source = map.getSource(ROUTE_SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(routeFeatureCollection(points));

    buildIndex();
    renderMarkers();
    if (points.length > 0) fitToPoints(map, points);
  }, [points]);

  return <div ref={containerRef} className="h-full w-full" />;
}
