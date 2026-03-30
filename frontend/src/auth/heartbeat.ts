export interface HeartbeatDeps {
  isAuthenticated: () => boolean;
  postHeartbeat: () => Promise<void>;
  onError: (error: unknown) => void;
}

export interface HeartbeatController {
  start: () => void;
  stop: () => void;
}

export function createHeartbeat(deps: HeartbeatDeps): HeartbeatController {
  let heartbeatTimer: number | null = null;

  const stop = (): void => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const start = (): void => {
    stop();

    heartbeatTimer = window.setInterval(async () => {
      if (!deps.isAuthenticated()) {
        stop();
        return;
      }

      try {
        await deps.postHeartbeat();
      } catch (error) {
        deps.onError(error);
      }
    }, 60000);
  };

  return {
    start,
    stop,
  };
}
