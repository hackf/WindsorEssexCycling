import { createMachine, assign } from 'xstate';
import { LatLng, LatLngTuple } from 'leaflet';
import type {
  FeatureCollection,
  Feature,
  LineString,
  GeoJsonProperties,
} from 'geojson';

const brouterEndpoint = import.meta.env.VITE_BROUTER_ENDPOINT;

function roundToNearestThousand(n: number) {
  return Math.round(n * 10000) / 10000;
}

function isLineString<T extends GeoJsonProperties>(
  feature: Feature
): feature is Feature<LineString, T> {
  return (
    feature != null &&
    feature.type === 'Feature' &&
    feature.geometry.type === 'LineString'
  );
}

const fetchRoute = async (markers: LatLng[], signal: AbortSignal) => {
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
  const url = new URL(`${brouterEndpoint}/brouter?${params.toString()}`);
  const response = await fetch(url.toString(), { signal });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const data = (await response.json()) as FeatureCollection;
  const feature = data.features[0];

  if (!isLineString(feature)) {
    throw new Error('Did not recieve a LineString feature');
  }

  return feature;
};

interface RoutesContext {
  markers: LatLng[];
  route: LatLngTuple[] | null;
  controller: AbortController | null;
  error: any;
}

type RoutesEvents =
  | { type: 'FETCH'; payload: LatLng[] }
  | { type: 'RETRY' }
  | { type: 'CLEAR_ROUTES' };

type RoutesService = {
  getRoute: { data: Feature<LineString, GeoJsonProperties> };
};

export const routesMachine = createMachine(
  {
    id: 'routes-machine',
    predictableActionArguments: true,
    initial: 'idle',
    tsTypes: {} as import('./routeMachine.typegen').Typegen0,
    schema: {
      context: {} as RoutesContext,
      events: {} as RoutesEvents,
      services: {} as RoutesService,
    },
    context: {
      markers: [],
      route: null,
      controller: null,
      error: null,
    },
    states: {
      idle: {
        exit: ['clearRoute'],
        on: {
          FETCH: {
            target: 'loading',
            actions: ['setMarkers'],
          },
          CLEAR_ROUTES: {
            target: 'idle',
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
          CLEAR_ROUTES: {
            target: 'idle',
            actions: ['abortFetch'],
          },
        },
        invoke: {
          id: 'getRoute',
          src: 'getRoute',
          onDone: {
            target: 'idle',
            actions: 'setRoute',
          },
          onError: {
            target: 'failure',
            actions: 'setError',
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
    services: {
      getRoute: async (context: RoutesContext) => {
        if (context.controller == null) {
          throw new Error('Abort Controller not set');
        }
        return await fetchRoute(context.markers, context.controller.signal);
      },
    },
    actions: {
      setError: assign({ error: (_context, event) => event.data as Error }),
      setRoute: assign({
        route: (_context, event) => {
          return event.data.geometry.coordinates.map(([lng, lat]) => [
            lat,
            lng,
          ]) as LatLngTuple[];
        },
      }),
      createAbortController: assign({
        controller: (_context) => {
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
        route: (_context) => null,
      }),
    },
  }
);
