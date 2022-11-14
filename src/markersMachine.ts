import { LatLng } from 'leaflet';
import { createMachine, assign } from 'xstate';

interface MarkerContext {
  markers: LatLng[];
  max: number;
  markersChanged: boolean;
}

type MarkerEvents =
  | { type: 'ADD_MARKER' }
  | { type: 'DELETE_MARKER' }
  | { type: 'DRAG_MARKER' }
  | { type: 'GO_TO_IDLE' }
  | { type: 'DELETE_ON_CLICK'; idx: number }
  | { type: 'ADD_ON_CLICK'; payload: LatLng }
  | { type: 'DROP'; idx: number; payload: LatLng };

export const markersMachine = createMachine(
  {
    id: 'markers-machine',
    strict: true,
    predictableActionArguments: true,
    // XState Typegen
    // See: https://xstate.js.org/docs/guides/typescript.html#typegen
    tsTypes: {} as import('./markersMachine.typegen').Typegen0,
    schema: {
      context: {} as MarkerContext,
      events: {} as MarkerEvents,
    },
    context: {
      markers: [],
      max: 5,
      markersChanged: false,
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          ADD_MARKER: [
            {
              cond: 'noMoreThanNMarkers',
              target: 'add',
              actions: 'markersHaveNotChanged',
            },
            {
              actions: 'markersHaveNotChanged',
            },
          ],
          DELETE_MARKER: [
            {
              cond: 'greaterThanZero',
              target: 'delete',
              actions: 'markersHaveNotChanged',
            },
            {
              actions: 'markersHaveNotChanged',
            },
          ],
          DRAG_MARKER: [
            {
              cond: 'greaterThanZero',
              target: 'drag',
              actions: 'markersHaveNotChanged',
            },
          ],
        },
      },
      drag: {
        on: {
          DROP: {
            target: 'drag',
            actions: ['update_marker_latlng', 'markersHaveChanged'],
          },
          GO_TO_IDLE: {
            target: 'idle',
            actions: 'markersHaveNotChanged',
          },
          ADD_MARKER: {
            cond: 'noMoreThanNMarkers',
            target: 'add',
            actions: 'markersHaveNotChanged',
          },
          DELETE_MARKER: {
            cond: 'greaterThanZero',
            target: 'delete',
            actions: 'markersHaveNotChanged',
          },
        },
      },
      add: {
        on: {
          ADD_ON_CLICK: [
            {
              target: 'idle',
              cond: 'onlyOneMoreMarker',
              actions: ['add_marker', 'markersHaveChanged'],
            },
            {
              target: 'add',
              cond: 'noMoreThanNMarkers',
              actions: ['add_marker', 'markersHaveChanged'],
            },
            {
              target: 'idle',
              actions: 'markersHaveNotChanged',
            }
          ],
          GO_TO_IDLE: {
            target: 'idle',
            actions: 'markersHaveNotChanged',
          },
          DELETE_MARKER: {
            cond: 'greaterThanZero',
            target: 'delete',
            actions: 'markersHaveNotChanged',
          },
          DRAG_MARKER: {
            cond: 'greaterThanZero',
            target: 'drag',
            actions: 'markersHaveNotChanged',
          },
        },
      },
      delete: {
        on: {
          DELETE_ON_CLICK: [
            {
              target: 'idle',
              cond: 'lastMarker',
              actions: ['delete_marker', 'markersHaveChanged'],
            },
            {
              target: 'delete',
              actions: ['delete_marker', 'markersHaveChanged'],
            },
          ],
          GO_TO_IDLE: {
            target: 'idle',
            actions: 'markersHaveNotChanged',
          },
          DRAG_MARKER: {
            target: 'drag',
            actions: 'markersHaveNotChanged',
          },
          ADD_MARKER: {
            cond: 'noMoreThanNMarkers',
            target: 'add',
            actions: 'markersHaveNotChanged',
          },
        },
      },
    },
  },
  {
    guards: {
      onlyOneMoreMarker: (context) => {
        return context.markers.length == context.max - 1;
      },
      lastMarker: (context) => {
        return context.markers.length - 1 == 0;
      },
      noMoreThanNMarkers: (context) => {
        return context.markers.length < context.max;
      },
      greaterThanZero: (context) => {
        return context.markers.length > 0;
      },
    },
    actions: {
      markersHaveChanged: assign({ markersChanged: (_context) => true }),
      markersHaveNotChanged: assign({ markersChanged: (_context) => false }),
      delete_marker: assign({
        markers: (context, event) => {
          return context.markers.filter((_, idx) => event.idx !== idx);
        },
      }),
      add_marker: assign({
        markers: (context, event) => {
          return [...context.markers, event.payload];
        },
      }),
      update_marker_latlng: assign({
        markers: (context, event) => [
          ...context.markers.slice(0, event.idx),
          event.payload,
          ...context.markers.slice(event.idx + 1),
        ],
      }),
    },
  }
);
