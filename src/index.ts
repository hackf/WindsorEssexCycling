import L, { LeafletMouseEvent } from 'leaflet';
import { interpret } from 'xstate';
import { markersMachine } from './markersMachine';
import { routesMachine } from './routeMachine';

import '@bagage/leaflet.restoreview';
import 'leaflet-fullhash';
import 'leaflet-easybutton';

import tingle from 'tingle.js';

import './../node_modules/leaflet-easybutton/src/easy-button.css';
import './../node_modules/leaflet/dist/leaflet.css';
import './../node_modules/tingle.js/dist/tingle.css';

import './legend.css';
import './styles.css';

const VERSION = 'v0.1'; // TODO: Bump when pushing new version in production

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

function isLocalStorageAvailable() {
  try {
    const storageTest = '__storage_test__';
    window.localStorage.setItem(storageTest, storageTest);
    window.localStorage.removeItem(storageTest);
    return true;
  } catch (e) {
    console.warn('Your browser blocks access to localStorage');
    return false;
  }
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
  // ============
  // Handle modal
  // ============
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

  // ==========
  // Handle map
  // ==========
  // Available tiles definition
  const cyclosm = L.tileLayer(
    'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    {
      attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
      minZoom: 0,
      maxZoom: 20,
    }
  );

  // Interpret the machine, and add a listener for whenever a transition occurs.
  const service = interpret(markersMachine);
  const routeService = interpret(routesMachine);

  function addMarker(e: LeafletMouseEvent) {
    service.send({ type: 'ADD_ON_CLICK', payload: e.latlng });
  }

  const map = new L.Map('map', {
    zoomControl: true,
    //layers: [cyclosm],
    layers: [cyclosm],
  });

  // Set up routing / edit / help / legend buttons
  L.easyButton(
    'fa-route',
    function () {
      window.open(
        'http://brouter.de/brouter-web/' + window.location.hash,
        '_blank'
      );
    },
    'Create an itinerary with BRouter'
  ).addTo(map);
  L.easyButton(
    'fa-edit',
    function () {
      window.open(
        'https://www.openstreetmap.org/edit' + window.location.hash,
        '_blank'
      );
    },
    'Edit the map'
  ).addTo(map);

  L.easyButton(
    'fa-question',
    function () {
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
    'Legend'
  ).addTo(map);

  L.easyButton(
    'fa-info',
    function () {
      modal.open();
    },
    'About'
  ).addTo(map);

  const markers = L.layerGroup();
  let buttons: L.Control[] = [];

  service.onTransition((state) => {
    buttons.forEach((button) => map.removeControl(button));
    buttons = [];

    const dragButton = L.easyButton(
      'fa-up-down-left-right',
      function () {
        if (state.matches('drag')) {
          service.send({ type: 'GO_TO_IDLE' });
        } else {
          service.send({ type: 'DRAG_MARKER' });
        }
      },
      'Drag Marker'
    );
    buttons.push(dragButton);

    const addButton = L.easyButton(
      'fa-add',
      function () {
        if (state.matches('add')) {
          service.send({ type: 'GO_TO_IDLE' });
        } else {
          service.send({ type: 'ADD_MARKER' });
        }
      },
      'Add Marker'
    );
    buttons.push(addButton);

    const removeButton = L.easyButton(
      'fa-remove',
      function () {
        if (state.matches('delete')) {
          service.send({ type: 'GO_TO_IDLE' });
        } else {
          service.send({ type: 'DELETE_MARKER' });
        }
      },
      'Delete Marker'
    );
    buttons.push(removeButton);

    buttons.forEach((button) => button.addTo(map));

    if (state.changed) {
      map.removeLayer(markers);
      markers.clearLayers();

      state.context.markers
        .map((markerData, idx) => {
          const marker: L.Marker = state.matches('drag')
            ? L.marker(markerData, { draggable: true })
            : L.marker(markerData);

          if (state.matches('drag')) {
            marker.addOneTimeEventListener('dragend', (e) => {
              service.send({
                type: 'DROP',
                idx,
                payload: e.target.getLatLng(),
              });
            });
          } else if (state.matches('delete')) {
            marker.addOneTimeEventListener('click', () =>
              service.send({ type: 'DELETE_ON_CLICK', idx })
            );
          }
          return marker;
        })
        .forEach((marker) => {
          markers.addLayer(marker);
        });

      map.addLayer(markers);

      if (state.matches('add')) {
        map.addOneTimeEventListener('click', addMarker);
      }

      // Only request a route while in the idle state
      // This fixes the flickering (route being removed and added) when the
      // state transitions. Realisically, the route should only be fetched after
      // changes to the markers which means the machine should be in the idle state
      if (state.matches('idle') && state.context.markers.length >= 2) {
        routeService.send({ type: 'FETCH', payload: state.context.markers });
      }

      if (state.context.markers.length < 2) {
        routeService.send({ type: 'CLEAR_ROUTES' });
      }
    }
  });

  let route: L.Polyline = L.polyline([]);

  routeService.onTransition((state) => {
    map.removeLayer(route);
    route = state.context.route
      ? L.polyline(state.context.route, { color: 'red' })
      : L.polyline([]);
    map.addLayer(route);
  });

  // Start the service
  service.start();
  routeService.start();

  map.attributionControl.setPrefix(
    '<a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a> | <a href="https://github.com/cyclosm/cyclosm-cartocss-style/releases" title="CyclOSM - Open Bicycle render">CyclOSM</a> ' +
      VERSION
  );

  if (!map.restoreView()) {
    // Default view on Essex County, ON.
    map.setView([42.1659, -82.6633], 11);
  }

  // Set up hash plugin
  const allMapLayers = {
    cyclosm: cyclosm,
  };
  L.hash(map, allMapLayers);

  // Add a scale
  L.control.scale().addTo(map);

  // =============
  // Handle legend
  // =============
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
