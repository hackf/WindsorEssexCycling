import { createMachine, assign } from 'xstate';
import { LatLng, Polyline } from 'leaflet';
import { GeoJsonObject } from 'geojson';

function roundToNearestThousand(n: number) {
  return Math.round(n * 10000) / 10000;
}

const fetchRoute = (markers: LatLng[], signal: AbortSignal): Promise<GeoJsonObject> => {
  const params = new URLSearchParams();
  params.set(
    'lonlats',
    markers
      .map(
        (marker) =>
          `${roundToNearestThousand(marker.lng)},${roundToNearestThousand(
            marker.lat
          )}`
      )
      .join('|')
  );
  params.set('alternativeidx', '0');
  params.set('profile', 'trekking');
  params.set('format', 'geojson');
  const url = new URL(`http://127.0.0.1:17777/brouter?${params.toString()}`);
  return fetch(url.toString(), { signal }).then((response) => response.json() as Promise<GeoJsonObject>);
};

interface RoutesContext {
  markers: LatLng[];
  route: Polyline | null;
  controller: AbortController | null;
  error: undefined;
}

type RoutesEvents = { type: 'FETCH'; payload: LatLng[] } | { type: 'RETRY' };

export const routesMachine = createMachine(
  {
    id: 'routes-machine',
    initial: 'idle',
    tsTypes: {} as import('./routemachine.typegen').Typegen0,
    schema: {
      context: {} as RoutesContext,
      events: {} as RoutesEvents,
    },
    context: {
      markers: [],
      route: null,
      controller: null,
      error: undefined,
    },
    states: {
      idle: {
        exit: ['clearRoute'],
        on: {
          FETCH: {
            target: 'loading',
            actions: ['setMarkers'],
          },
        },
      },
      loading: {
        entry: ['createAbortController'],
        on: {
          FETCH: {
            target: 'loading',
            actions: ['abortFetch', 'setMarkers'],
          },
        },
        invoke: {
          id: 'getRoute',
          src: (context: RoutesContext & { controller: AbortController }) =>
            fetchRoute(context.markers, context.controller.signal),
          onDone: {
            target: 'idle',
            actions: assign({
              route: (_context, event) => {
                const geojson = event.data;
                const lnglats = geojson.features[0].geometry.coordinates;
                return lnglats.map(([lng, lat]: [number, number]) => [
                  lat,
                  lng,
                ]);
              },
            }),
          },
          onError: {
            target: 'failure',
            actions: assign({ error: (_context, event) => event.data }),
          },
        },
      },
      failure: {
        on: {
          RETRY: { target: 'loading' },
        },
      },
    },
  },
  {
    actions: {
      createAbortController: assign({
        controller: () => {
          return new AbortController();
        },
      }),
      abortFetch: (context) => {
        if (context.controller) {
          context.controller.abort();
        }
      },
      setMarkers: assign({
        markers: (_context, event) => {
          return [...event.payload];
        },
      }),
      clearRoute: assign({
        route: () => [],
      }),
    },
  }
);
