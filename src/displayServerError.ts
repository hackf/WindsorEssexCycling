import L from 'leaflet';
import { isPositionError, ServerErrors } from './routeMachine';

function createErrorMessage(
  markers: L.LatLng[],
  error: ServerErrors | null,
  map: L.Map,
): HTMLElement {
  const messageContainer = L.DomUtil.create('div');
  if (error == null) {
    messageContainer.textContent = 'An unexpected error has occured. Please try again later.';
  } else if (isPositionError(error)) {
    const message = document.createTextNode(error.message);
    messageContainer.appendChild(message);
    messageContainer.appendChild(L.DomUtil.create('br'));
    const first = document.createTextNode('Click ');
    const link = L.DomUtil.create('a');
    link.setAttribute('alt', `Center on marker ${error.markerIndex}.`)
    link.textContent = 'here';
    link.addEventListener('click', function (event: MouseEvent) {
      event.preventDefault();
      event.stopPropagation();

      map.flyTo(markers[error.markerIndex], 15);
    });
    const last = document.createTextNode(` to center the map on marker ${error.markerIndex + 1}`);
    messageContainer.appendChild(first);
    messageContainer.appendChild(link);
    messageContainer.appendChild(last);
  } else {
    messageContainer.textContent = error.message;
  }
  return messageContainer;
}

export function displayServerError(map: L.Map) {
  let control: L.Control | null = null;

  return {
    removeErrorFromMap() {
      if (control) {
        map.removeControl(control);
      }
    },
    addErrorToMap(markers: L.LatLng[], error: ServerErrors | null) {
      if (control) {
        map.removeControl(control);
      }

      const Control = L.Control.extend({
        onAdd(_map: L.Map) {
          const containerDiv = L.DomUtil.create('div');
          containerDiv.classList.add('leaflet-control', 'server-error');
          containerDiv.appendChild(createErrorMessage(markers, error, map));
          return containerDiv;
        },
        onRemove(_map: L.Map) {
          // No external resources to clean up
        },
      });
      control = new Control({ position: 'topright' });
      map.addControl(control);
    },
  };
}
