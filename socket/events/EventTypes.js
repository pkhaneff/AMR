const AMR_EVENTS = {
  TASK_QUEUED: 'amr:task:queued',
  TASK_ASSIGNED: 'amr:task:assigned',
  TASK_STARTED: 'amr:task:started',
  TASK_PROGRESS: 'amr:task:progress',
  TASK_COMPLETED: 'amr:task:completed',
  TASK_FAILED: 'amr:task:failed',
  STATUS_UPDATE: 'amr:status:update',
  LOCATION_UPDATE: 'amr:location:update',
  BATTERY_UPDATE: 'amr:battery:update',

  // Node Block Events
  NODE_BLOCKED: 'amr:node:blocked',
  NODE_UNBLOCKED: 'amr:node:unblocked',

  // Cargo Events
  CARGO_LOADED: 'amr:cargo:loaded',
  CARGO_UNLOADED: 'amr:cargo:unloaded',

  // U-Turn Events
  UTURN_STARTED: 'amr:uturn:started',
  UTURN_COMPLETED: 'amr:uturn:completed',
  UTURN_FAILED: 'amr:uturn:failed',

  // Re-route Events
  REROUTE_STARTED: 'amr:reroute:started',
  REROUTE_SUCCESS: 'amr:reroute:success',
  REROUTE_FAILED: 'amr:reroute:failed',

  // AMR Status Events
  AMR_OFFLINE: 'amr:offline',

  // Movement Events
  AMR_MOVING: 'amr:moving',
  AMR_ARRIVED: 'amr:arrived',
};

module.exports = {
  AMR_EVENTS,
};
