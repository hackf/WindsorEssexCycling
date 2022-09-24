import { LatLng } from 'leaflet';
import { createMachine, assign } from 'xstate';

interface MarkerContext {
  markers: LatLng[];
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
    predictableActionArguments: true,
    id: 'markers-machine',
    // XState Typegen
    // See: https://xstate.js.org/docs/guides/typescript.html#typegen
    tsTypes: {} as import('./machines.typegen').Typegen0,
    schema: {
      context: {} as MarkerContext,
      events: {} as MarkerEvents,
    },
    context: {
      markers: [],
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          ADD_MARKER: [
            {
              cond: (context) => {
                return context.markers.length < 2;
              },
              target: 'add',
            },
            {},
          ],
          DELETE_MARKER: [
            {
              cond: (context) => {
                return context.markers.length > 0;
              },
              target: 'delete',
            },
            {},
          ],
          DRAG_MARKER: [
            {
              target: 'drag',
            },
          ],
        },
      },
      drag: {
        on: {
          DROP: {
            actions: 'update_marker_latlng',
            target: 'idle',
          },
          GO_TO_IDLE: {
            target: 'idle'
          },
          ADD_MARKER: {
            target: 'add'
          },
          DELETE_MARKER: {
            target: 'delete'
          },
        },
      },
      add: {
        on: {
          ADD_ON_CLICK: {
            target: 'idle',
            actions: 'add_marker',
          },
          GO_TO_IDLE: {
            target: 'idle'
          },
          DELETE_MARKER: {
            target: 'delete'
          },
          DRAG_MARKER : {
            target: 'drag'
          },
        },
      },
      delete: {
        on: {
          DELETE_ON_CLICK: {
            target: 'idle',
            actions: 'delete_marker',
          },
          GO_TO_IDLE: {
            target: 'idle'
          },
          DRAG_MARKER : {
            target: 'drag'
          },
          ADD_MARKER: {
            target: 'add'
          },
        },
      },
    },
  },
  {
    actions: {
      delete_marker: assign({
        markers: (context: MarkerContext, event) => {
          return context.markers.filter((_, idx) => event.idx !== idx);
        },
      }),
      add_marker: assign({
        markers: (context: MarkerContext, event) => {
          return [...context.markers, event.payload];
        },
      }),
      update_marker_latlng: assign({
        markers: (context: MarkerContext, event) => [
          // Remove the LatLng with the same index. This will be the state of the marker that was just
          // dragged then dropped. Then we add it back in with the new LatLng object.
          ...context.markers.filter((_marker, idx) => event.idx !== idx),
          event.payload,
        ],
      }),
    },
  }
);