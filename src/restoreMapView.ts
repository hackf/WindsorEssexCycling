import L, { LatLngTuple } from 'leaflet';

import { isLocalStorageAvailable } from './localStorage';

interface MapView {
  lat: number;
  lng: number;
  zoom: number;
}

const SAVE_MAP_VIEW_KEY = 'WEC-saved-map-view';

export function restoreMapView(map: L.Map, latlng: LatLngTuple, zoom: number) {
  const hasLocalStorage = isLocalStorageAvailable();

  if (!hasLocalStorage) {
    console.warn('Local storage not availabe. Cannot restore or save view.');
    return;
  }

  const savedMapView = window.localStorage.getItem(SAVE_MAP_VIEW_KEY);

  map.addEventListener('moveend', () => {
    const newMapView: MapView = {
      lat: map.getCenter().lat,
      lng: map.getCenter().lng,
      zoom: map.getZoom(),
    }

    window.localStorage.setItem(SAVE_MAP_VIEW_KEY, JSON.stringify(newMapView));
  });

  if (savedMapView) {
    try {
      const mapView: MapView = JSON.parse(savedMapView);
      map.setView([mapView.lat, mapView.lng], mapView.zoom);
      return;
    } catch (err) {
      console.error(err);
    } 
  }

  map.setView(latlng, zoom);
}
