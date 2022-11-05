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
    markersHaveChanged: 'ADD_ON_CLICK' | 'DELETE_ON_CLICK' | 'DROP';
    markersHaveNotChanged:
      | 'ADD_MARKER'
      | 'ADD_ON_CLICK'
      | 'DELETE_MARKER'
      | 'DRAG_MARKER'
      | 'GO_TO_IDLE';
    update_marker_latlng: 'DROP';
  };
  eventsCausingServices: {};
  eventsCausingGuards: {
    greaterThanZero: 'DELETE_MARKER' | 'DRAG_MARKER';
    noMoreThanNMarkers: 'ADD_MARKER' | 'ADD_ON_CLICK';
    onlyOneMoreMarker: 'ADD_ON_CLICK';
  };
  eventsCausingDelays: {};
  matchesStates: 'add' | 'delete' | 'drag' | 'idle';
  tags: never;
}
