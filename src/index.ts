import L, {LeafletMouseEvent} from 'leaflet';
import { interpret } from 'xstate';
import {markersMachine} from './machines';

import '@bagage/leaflet.restoreview';
import 'leaflet-fullhash';
import 'leaflet-easybutton';

import tingle from 'tingle.js';

import './../node_modules/leaflet-easybutton/src/easy-button.css';
import './../node_modules/leaflet/dist/leaflet.css';
import './../node_modules/tingle.js/dist/tingle.css';

import './legend.css';
import './styles.css';

if (process.env.NODE_ENV === 'production') {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
}

const VERSION = 'v0.1'; // TODO: Bump when pushing new version in production

function checkQuerySelector(parent: Element | Document, selector: string): Element {
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

  function addMarker(e: LeafletMouseEvent) {
    console.log("addMarker db was called");
    service.send({ type: 'ON_CLICK', payload: e.latlng });
  }

  const map = new L.Map('map', {
    zoomControl: true,
    //layers: [cyclosm],
    layers: [cyclosm],
  });

  const markers = L.layerGroup();

  service.onTransition((state) => {
    console.log(state.value, state.context);
    if (state.changed) {
      map.removeLayer(markers);
      markers.clearLayers();
      markers.addLayer(state.context.markers.map((markerData, idx) => {
        const marker = L.marker(markerData);
        if (state.matches('delete')) {
          marker.addOneTimeEventListener('click', (e) => {
            service.send({ type: 'ON_CLICK', idx });
          });
        }
        return marker;
      }));
      map.addLayer(markers);

      if (state.matches('add')){
        map.addOneTimeEventListener('click', addMarker);
      }
    }
  });

  // Start the service
  service.start();

  L.easyButton(
    'fa-add',
    function () {
      service.send({ type: 'ADD_MARKER' });
    },
    'Add Marker'
  ).addTo(map);

  L.easyButton(
    'fa-remove',
    function () {
      service.send({ type: 'DELETE_MARKER' });
    },
    'Delete Marker'
  ).addTo(map);

  // function addMarker(e: LeafletMouseEvent) {
  //   var marker = L.marker(e.latlng, {
  //     draggable: true
  //   }).addTo(map);
  // }

  // map.on('click', addMarker);

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

      modal.setContent(checkQuerySelector(document, '#legend .iframe').innerHTML);
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
      (checkQuerySelector(document, '#map') as HTMLElement).style.right = '300px';
      (checkQuerySelector(document, '#legend .iframe') as HTMLElement).style.display = 'initial';
      (checkQuerySelector(document, '#legend') as HTMLElement).style.width = '300px';
      (checkQuerySelector(document, '#legend button') as HTMLElement).innerText = '❯';
    } else {
      (checkQuerySelector(document, '#map') as HTMLElement).style.right = '42px';
      (checkQuerySelector(document, '#legend .iframe') as HTMLElement).style.display = 'none';
      (checkQuerySelector(document, '#legend') as HTMLElement).style.width = '42px';
      (checkQuerySelector(document, '#legend button') as HTMLElement).innerText = '❮';
    }
  }

  handleResize();

  window.addEventListener('resize', handleResize);

  (checkQuerySelector(document, '#legend button') as HTMLElement)
    .addEventListener('click', function (event: MouseEvent) {
      event.preventDefault();

      if ((checkQuerySelector(document, '#legend button') as HTMLElement).innerText == '❮') {
        if (hasLocalStorage) {
          window.localStorage.isLegendOpen = JSON.stringify(true);
        }
        (checkQuerySelector(document, '#map') as HTMLElement).style.right = '300px';
        (checkQuerySelector(document, '#legend .iframe') as HTMLElement).style.display = 'initial';
        (checkQuerySelector(document, '#legend') as HTMLElement).style.width = '300px';
        (checkQuerySelector(document, '#legend button') as HTMLElement).innerText = '❯';
      } else {
        if (hasLocalStorage) {
          window.localStorage.isLegendOpen = JSON.stringify(false);
        }
        (checkQuerySelector(document, '#map') as HTMLElement).style.right = '42px';
        (checkQuerySelector(document, '#legend .iframe') as HTMLElement).style.display = 'none';
        (checkQuerySelector(document, '#legend') as HTMLElement).style.width = '42px';
        (checkQuerySelector(document, '#legend button') as HTMLElement).innerText = '❮';
      }
      map.invalidateSize();
    });
});
