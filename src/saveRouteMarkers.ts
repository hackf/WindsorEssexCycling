import { LatLngTuple, LatLng } from 'leaflet';

import { isLocalStorageAvailable } from './localStorage';

const ROUTE_MARKERS_KEY = 'WEC-route-markers-key';

interface RouteMarkers {
  markers: LatLngTuple[];
}

export function restoreRouteMarkers(): LatLng[] {
  const hasLocalStorage = isLocalStorageAvailable();

  if (!hasLocalStorage) {
    console.warn('Local storage not availabe. Cannot restore saved route markers.');
    return [];
  }

  const savedRouteMarkers = window.localStorage.getItem(ROUTE_MARKERS_KEY);

  if (savedRouteMarkers) {
    try {
      const routeMarkers: RouteMarkers = JSON.parse(savedRouteMarkers);
      return routeMarkers.markers.map(([lat, lng]) => new LatLng(lat, lng));
    } catch (err) {
      console.error(err);
    } 
  }

  return []
}

export function saveRouteMarkers(markers: LatLng[]) {
  const hasLocalStorage = isLocalStorageAvailable();

  if (!hasLocalStorage) {
    console.warn('Local storage not availabe. Cannot save route markers.');
    return;
  }

  const routeMarkers: RouteMarkers = {
    markers: markers.map((latLng) => [latLng.lat, latLng.lng] as LatLngTuple),
  }

  window.localStorage.setItem(ROUTE_MARKERS_KEY, JSON.stringify(routeMarkers));
}
