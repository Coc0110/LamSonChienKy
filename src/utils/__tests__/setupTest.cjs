globalThis.window = {
  requestAnimationFrame: (cb) => setTimeout(cb, 16),
  cancelAnimationFrame: (id) => clearTimeout(id),
  devicePixelRatio: 1,
  screen: { deviceXDPI: 1, logicalXDPI: 1 },
};
globalThis.document = {
  createElement: () => ({ style: {} }),
  documentElement: { style: {} },
};
globalThis.navigator = { userAgent: 'node', platform: 'Win32' };
