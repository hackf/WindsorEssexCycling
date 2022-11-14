// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true;
  internalEvents: {
    'done.invoke.getRoute': {
      type: 'done.invoke.getRoute';
      data: unknown;
      __tip: 'See the XState TS docs to learn how to strongly type this.';
    };
    'error.platform.getRoute': {
      type: 'error.platform.getRoute';
      data: unknown;
    };
    'xstate.init': { type: 'xstate.init' };
    'xstate.stop': { type: 'xstate.stop' };
  };
  invokeSrcNameMap: {
    getRoute: 'done.invoke.getRoute';
  };
  missingImplementations: {
    actions: never;
    services: never;
    guards: never;
    delays: never;
  };
  eventsCausingActions: {
    abortFetch: 'CLEAR_ROUTES' | 'FETCH';
    clearError: 'CLEAR_ROUTES' | 'FETCH' | 'xstate.stop';
    clearRoute: 'CLEAR_ROUTES' | 'FETCH' | 'xstate.stop';
    createAbortController: 'FETCH';
    parseError: 'error.platform.getRoute';
    setError: 'error.platform.getRoute';
    setMarkers: 'FETCH';
    setRoute: 'done.invoke.getRoute';
  };
  eventsCausingServices: {
    getRoute: 'FETCH';
  };
  eventsCausingGuards: {};
  eventsCausingDelays: {};
  matchesStates: 'failure' | 'idle' | 'loading';
  tags: never;
}
