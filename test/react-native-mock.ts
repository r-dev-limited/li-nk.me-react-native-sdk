export const Platform = { OS: 'android', Version: 35 };
export const NativeModules: Record<string, unknown> = {};
export const Linking = {
  addEventListener: () => ({ remove: () => undefined }),
  removeEventListener: () => undefined,
  getInitialURL: async () => null,
  openURL: async () => true,
};
