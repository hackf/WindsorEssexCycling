import { createMachine, assign } from 'xstate';

export const markersMachine = createMachine({
    id: "markers-machine",
    context: {
        markers: [],
    },
    initial: "drag",
    states: {
      drag: {
        on: {
          ADD_MARKER: [
            {
              cond: (context) => {
                return context.markers.length < 2;
              },
              target: "add",
            },
            {},
          ],
          DELETE_MARKER: [
            {
              cond: (context) => {
                return context.markers.length > 0;
              },
              target: "delete",
            },
            {},
          ],
        },
      },
      add: {
        on: {
          ON_CLICK: {
            target: "add_marker",
          },
        },
      },
      add_marker: {
        entry: assign({
            markers: (context, event) => [...context.markers, event.payload]
        }),
        always: {
          target: "drag",
        },
      },
      delete: {
        on: {
          ON_CLICK: {
            target: "delete_marker",
          },
        },
      },
      delete_marker: {
        entry: assign({
          markers: (context, event) => {
            return context.filter((_, idx) => event.idx === idx);
          }
        }),
        always: {
          target: "drag",
        },
      },
    },
  }
);
