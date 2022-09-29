import { createMachine, assign } from 'xstate';
import { LatLng } from 'leaflet';

function roundToNearestThousand(n: number) {
    return Math.round(n * 10000) / 10000;
}

const fetchRoute = (markers: LatLng[])=> {
    const params = new URLSearchParams();
    params.set(
        'lonlats', 
        markers.map(
        marker => `${roundToNearestThousand(marker.lng)},${roundToNearestThousand(marker.lat)}`).join('|')
    );
    params.set('alternativeidx', '0');
    params.set('profile', 'trekking');
    params.set('format', 'geojson');
    const url = new URL(`http://127.0.0.1:17777/brouter?${params.toString()}`);
    return fetch(url.toString()).then((response) => response.json());
}

export const routesMachine = createMachine({
  id: 'routes-machine',
  initial: 'idle',
  context: {
    markers: [],
    route: [],
    error: undefined
  },
  states: {
    idle: {
      on: {
        FETCH: { 
          target: 'loading',
        //   actions: <populate markers>
        }
      }
    },
    loading: {
      invoke: {
        id: 'getRoute',
        src: (context, event) => fetchRoute(context.markers),
        onDone: {
          target: 'success',
          actions: assign({ route: (context, event) => {
            const geojson = event.data;
            const lnglats = geojson.features[0].geometry.coordinates;
            return lnglats.map(([lng, lat]: [number, number]) => [lat, lng]);
          }})
        },
        onError: {
          target: 'failure',
          actions: assign({ error: (context, event) => event.data })
        }
      }
    },
    success: {},
    failure: {
      on: {
        RETRY: { target: 'loading' }
      }
    }
  }
});