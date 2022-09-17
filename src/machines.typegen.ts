// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true;
  internalEvents: {
    'xstate.init': { type: 'xstate.init' };
  };
  invokeSrcNameMap: {};
  missingImplementations: {
    actions: never;
    services: never;
    guards: never;
    delays: never;
  };
  eventsCausingActions: {
    add_marker: 'ADD_ON_CLICK';
    delete_marker: 'DELETE_ON_CLICK';
    update_marker_latlng: 'DROP';
  };
  eventsCausingServices: {};
  eventsCausingGuards: {};
  eventsCausingDelays: {};
  matchesStates: 'add' | 'delete' | 'drag' | 'idle';
  tags: never;
}
