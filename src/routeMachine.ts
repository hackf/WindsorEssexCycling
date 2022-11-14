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
  // To use a custom profile, eg "trekking_we", the profile name needs to have
  // the prefix of "custom_", otherwise brouter won't know it's custom
  // See: https://github.com/abrensch/brouter/blob/master/brouter-server/src/main/java/btools/server/request/ProfileUploadHandler.java#L24
  // Also: https://github.com/abrensch/brouter/blob/master/brouter-server/src/main/java/btools/server/request/ServerHandler.java#L51
  params.set('profile', 'custom_trekking_we');
  params.set('format', 'geojson');
  const url = new URL(`${brouterEndpoint}/brouter?${params.toString()}`);
  const response = await fetch(url.toString(), { signal });

  if (!response.ok) {
    throw new Error(`${response.statusText} -- ${await response.text()}`);
  }

  const data = (await response.json()) as FeatureCollection;
  const feature = data.features[0];

  if (!isLineString(feature)) {
    throw new Error('Error: Did not recieve a LineString feature');
  }

  return feature;
};

interface ServerError {
  message: string;
}

interface PositionError extends ServerError {
  markerIndex: number;
}

export type ServerErrors = ServerError | PositionError;

export function isPositionError(error: ServerErrors): error is PositionError {
  return 'markerIndex' in error;
}

interface RoutesContext {
  markers: LatLng[];
  route: LatLngTuple[] | null;
  controller: AbortController | null;
  rawError: Error | null;
  error: ServerErrors | null;
}

type RoutesEvents =
  | { type: 'FETCH'; payload: LatLng[] }
  | { type: 'RETRY' }
  | { type: 'CLEAR_ROUTES' };

type RoutesService = {
  getRoute: { data: Feature<LineString, GeoJsonProperties> };
};

const markerPositionErrorRegExp = new RegExp(
  /^([\w\s]+) -- ([\w]+)-(position[\w\s]+)/
);
const markerIndexRegExp = new RegExp(/^via([0-9]+)/);

function parseErrorPosition(
  position: string,
  markerCount: number
): number | null {
  if (position === 'from') {
    return 0;
  } else if (position === 'to') {
    return markerCount - 1;
  }

  const result = markerIndexRegExp.exec(position);
  if (!result) {
    return null;
  }

  const [_, viaPosition] = result;
  return Number(viaPosition);
}

export const routesMachine = createMachine(
  {
    id: 'routes-machine',
    strict: true,
    predictableActionArguments: true,
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
      rawError: null,
      error: null,
    },
    initial: 'idle',
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
        entry: ['parseError'],
        exit: ['clearError'],
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
      setError: assign({ rawError: (_context, event) => event.data as Error }),
      clearError: assign({
        error: (_context) => null,
        rawError: (_context) => null,
      }),
      parseError: assign({
        error: (context) => {
          if (!context.rawError) {
            return null;
          }
          const error = markerPositionErrorRegExp.exec(
            context.rawError.message
          );
          if (!error) {
            return { message: context.rawError.message.trim() };
          }
          const position = error[2];
          const markerIndex = parseErrorPosition(
            position,
            context.markers.length
          );
          if (markerIndex == null) {
            return { message: context.rawError.message.trim() };
          }
          return {
            message: `Unable to locate possible route near marker number ${
              markerIndex + 1
            }. Please move marker closer to a known road or path.`,
            markerIndex,
          };
        },
      }),
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
