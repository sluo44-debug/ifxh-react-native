// Tiny in-app pub/sub so list screens and preview panels can coordinate refreshes
// without threading callbacks through every component.

const listeners = new Set();

export function emitOrdersChanged(reason = "unknown") {
  try {
    listeners.forEach((fn) => {
      try {
        fn({ reason, ts: Date.now() });
      } catch (e) {
        // ignore listener errors
      }
    });
  } catch (e) {
    // ignore emit errors
  }
}

export function subscribeOrdersChanged(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
