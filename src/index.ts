import L, { LeafletMouseEvent, LatLngTuple } from 'leaflet';
import { interpret } from 'xstate';
import tingle from 'tingle.js';

import { markersMachine } from './markersMachine';
import { routesMachine } from './routeMachine';

import { createButtonGroup } from './buttonControl';
import { divIconFactory } from './divIconFactory';
import { isLocalStorageAvailable } from './localStorage';

import './../node_modules/leaflet/dist/leaflet.css';
import './../node_modules/tingle.js/dist/tingle.css';

import './legend.css';
import './styles.css';
import { restoreMapView } from './restoreMapView';
import { restoreRouteMarkers, saveRouteMarkers } from './saveRouteMarkers';

const VERSION = 'v0.2'; // TODO: Bump when pushing new version in production

function checkQuerySelector(
  parent: Element | Document,
  selector: string
): Element {
  const element = parent.querySelector(selector);
  if (element == null) {
    console.error('Parent: ', parent);
    console.error('Selector: ', selector);
    throw new Error(`"${selector}" did not match any elements on parent.`);
  }
  return element;
}

const hasLocalStorage = isLocalStorageAvailable();

function shouldShowModalOnStartup() {
  if (!hasLocalStorage) {
    return true;
  }
  if (window.localStorage['lastModalShown'] !== VERSION) {
    return true;
  }
  return false;
}

document.addEventListener('DOMContentLoaded', function () {
  const modal = new tingle.modal({
    footer: false,
    closeMethods: ['overlay', 'button', 'escape'],
    closeLabel: 'Go to map',
  });

  modal.setContent(checkQuerySelector(document, '#modal-content').innerHTML);

  if (shouldShowModalOnStartup()) {
    modal.open();

    if (hasLocalStorage) {
      window.localStorage['lastModalShown'] = VERSION;
    }
  }

  const cyclosm = L.tileLayer(
    'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    {
      attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
      minZoom: 0,
      maxZoom: 20,
    }
  );

  const map = new L.Map('map', {
    zoomControl: true,
    layers: [cyclosm],
  });

  const { update: updateMarkerControls } = createButtonGroup(map, [
    {
      id: 'drag',
      icon: 'fa-up-down-left-right',
      altText: 'Drag Marker',
    },
    {
      id: 'add',
      icon: 'fa-location-dot',
      altText: 'Add Marker',
    },
    {
      id: 'delete',
      icon: 'fa-trash',
      altText: 'Delete Marker',
    },
  ]);

  createButtonGroup(map, [
    {
      id: 'question',
      icon: 'fa-question',
      onClickFn() {
        const modal = new tingle.modal({
          footer: false,
          closeMethods: ['overlay', 'button', 'escape'],
          closeLabel: 'Go to map',
        });

        modal.setContent(
          checkQuerySelector(document, '#legend .iframe').innerHTML
        );
        modal.open();
      },
      altText: 'Legend',
    },
    {
      id: 'info',
      icon: 'fa-info',
      onClickFn() {
        modal.open();
      },
      altText: 'About',
    },
  ]);

  const savedMarkers = restoreRouteMarkers();
  const markerService = interpret(
    markersMachine.withContext({
      markers: savedMarkers,
      max: 5,
      markersChanged: savedMarkers.length > 0,
    })
  );
  const routeService = interpret(routesMachine);

  function markerLayerController(map: L.Map) {
    const markerGroup = L.layerGroup();
    return {
      addMarkersToMap(markers: L.Marker[]) {
        map.removeLayer(markerGroup);
        markerGroup.clearLayers();

        for (const marker of markers) {
          markerGroup.addLayer(marker);
        }
        map.addLayer(markerGroup);
      },
    };
  }

  const { addMarkersToMap } = markerLayerController(map);

  markerService.onTransition((state) => {
    updateMarkerControls([
      {
        id: 'drag',
        onClickFn(event: MouseEvent) {
          event.preventDefault();
          event.stopPropagation();

          if (state.matches('drag')) {
            markerService.send({ type: 'GO_TO_IDLE' });
          } else {
            markerService.send({ type: 'DRAG_MARKER' });
          }
        },
        state: state.matches('drag')
          ? 'active'
          : state.context.markers.length == 0
          ? 'disabled'
          : 'normal',
      },
      {
        id: 'add',
        onClickFn(event: MouseEvent) {
          // Need to prevent the Event from bubbling to the map element
          // otherwise the map will also handle the Event which will place
          // a marker directly under the add button
          event.preventDefault();
          event.stopPropagation();

          if (state.matches('add')) {
            markerService.send({ type: 'GO_TO_IDLE' });
          } else {
            markerService.send({ type: 'ADD_MARKER' });
          }
        },
        state: state.matches('add')
          ? 'active'
          : state.context.markers.length == state.context.max
          ? 'disabled'
          : 'normal',
      },
      {
        id: 'delete',
        onClickFn(event: MouseEvent) {
          event.preventDefault();
          event.stopPropagation();

          if (state.matches('delete')) {
            markerService.send({ type: 'GO_TO_IDLE' });
          } else {
            markerService.send({ type: 'DELETE_MARKER' });
          }
        },
        state: state.matches('delete')
          ? 'active'
          : state.context.markers.length == 0
          ? 'disabled'
          : 'normal',
      },
    ]);

    // events array will be empty on the first transtion
    // Since there could be saved markers the code needs to
    // run so that those markers are added to the map
    if (state.changed || state.events.length === 0) {
      addMarkersToMap(
        state.context.markers.map((markerData, idx, markers) => {
          const icon =
            idx == 0
              ? divIconFactory(idx + 1, '#00ff00')
              : idx + 1 == markers.length
              ? divIconFactory(idx + 1, '#0000ff')
              : divIconFactory(idx + 1, '#ff0000');

          const marker: L.Marker = state.matches('drag')
            ? L.marker(markerData, { draggable: true, icon })
            : L.marker(markerData, { icon });

          if (state.matches('drag')) {
            marker.addOneTimeEventListener('dragend', (e) => {
              markerService.send({
                type: 'DROP',
                idx,
                payload: e.target.getLatLng(),
              });
            });
          } else if (state.matches('delete')) {
            marker.addOneTimeEventListener('click', () =>
              markerService.send({ type: 'DELETE_ON_CLICK', idx })
            );
          }
          return marker;
        })
      );

      if (state.matches('add')) {
        map.addOneTimeEventListener('click', (e: LeafletMouseEvent) => {
          markerService.send({ type: 'ADD_ON_CLICK', payload: e.latlng });
        });
      } else {
        map.removeEventListener('click');
      }

      // Only request a route while in the idle state
      // This fixes the flickering (route being removed and added) when the
      // state transitions. Realisically, the route should only be fetched after
      // changes to the markers which means the machine should be in the idle state
      if (state.context.markersChanged && state.context.markers.length >= 2) {
        routeService.send({ type: 'FETCH', payload: state.context.markers });
      }

      if (state.context.markers.length < 2) {
        routeService.send({ type: 'CLEAR_ROUTES' });
      }

      if (state.context.markersChanged) {
        saveRouteMarkers(state.context.markers);
      }
    }
  });

  function routeLayerController(map: L.Map) {
    let routeLine: L.Polyline = L.polyline([]);
    return {
      addRouteToMap(route: L.LatLngTuple[] | null, isLoading: boolean) {
        map.removeLayer(routeLine);
        if (isLoading && route) {
          routeLine = L.polyline(route, { color: 'blue' });
          map.addLayer(routeLine);
        } else if (route) {
          routeLine = L.polyline(route, { color: 'red' });
          map.addLayer(routeLine);
        }
      },
    };
  }

  const { addRouteToMap } = routeLayerController(map);

  routeService.onTransition((state) => {
    const isLoading = state.matches('loading');
    const route = isLoading
      ? state.context.markers.map(
          (latlng) => [latlng.lat, latlng.lng] as LatLngTuple
        )
      : state.context.route;
    addRouteToMap(route, isLoading);
  });

  markerService.start();
  routeService.start();

  map.attributionControl.setPrefix(
    '<a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a> | <a href="https://github.com/cyclosm/cyclosm-cartocss-style/releases" title="CyclOSM - Open Bicycle render">CyclOSM</a>'
  );

  restoreMapView(map, [42.1659, -82.6633], 11);

  // Scale control in the bottom left
  L.control.scale().addTo(map);

  function handleResize() {
    let shouldLegendOpen = true;

    if (screen.width > 800) {
      shouldLegendOpen = true;
    }

    if (hasLocalStorage && window.localStorage.isLegendOpen !== undefined) {
      shouldLegendOpen = JSON.parse(window.localStorage.isLegendOpen);
    }

    if (shouldLegendOpen) {
      (checkQuerySelector(document, '#map') as HTMLElement).style.right =
        '300px';
      (
        checkQuerySelector(document, '#legend .iframe') as HTMLElement
      ).style.display = 'initial';
      (checkQuerySelector(document, '#legend') as HTMLElement).style.width =
        '300px';
      (
        checkQuerySelector(document, '#legend button') as HTMLElement
      ).innerText = '❯';
    } else {
      (checkQuerySelector(document, '#map') as HTMLElement).style.right =
        '42px';
      (
        checkQuerySelector(document, '#legend .iframe') as HTMLElement
      ).style.display = 'none';
      (checkQuerySelector(document, '#legend') as HTMLElement).style.width =
        '42px';
      (
        checkQuerySelector(document, '#legend button') as HTMLElement
      ).innerText = '❮';
    }
  }

  handleResize();

  window.addEventListener('resize', handleResize);

  (
    checkQuerySelector(document, '#legend button') as HTMLElement
  ).addEventListener('click', function (event: MouseEvent) {
    event.preventDefault();

    if (
      (checkQuerySelector(document, '#legend button') as HTMLElement)
        .innerText == '❮'
    ) {
      if (hasLocalStorage) {
        window.localStorage.isLegendOpen = JSON.stringify(true);
      }
      (checkQuerySelector(document, '#map') as HTMLElement).style.right =
        '300px';
      (
        checkQuerySelector(document, '#legend .iframe') as HTMLElement
      ).style.display = 'initial';
      (checkQuerySelector(document, '#legend') as HTMLElement).style.width =
        '300px';
      (
        checkQuerySelector(document, '#legend button') as HTMLElement
      ).innerText = '❯';
    } else {
      if (hasLocalStorage) {
        window.localStorage.isLegendOpen = JSON.stringify(false);
      }
      (checkQuerySelector(document, '#map') as HTMLElement).style.right =
        '42px';
      (
        checkQuerySelector(document, '#legend .iframe') as HTMLElement
      ).style.display = 'none';
      (checkQuerySelector(document, '#legend') as HTMLElement).style.width =
        '42px';
      (
        checkQuerySelector(document, '#legend button') as HTMLElement
      ).innerText = '❮';
    }
    map.invalidateSize();
  });
});
