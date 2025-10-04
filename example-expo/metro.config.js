const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Ensure Metro watches the workspace root (where the local SDK lives)
config.watchFolders = [workspaceRoot];

// Prefer resolving modules from the app's own node_modules to avoid duplicates
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

// Force React and React Native to resolve from the app
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};

// Avoid picking modules from the SDK's nested node_modules (e.g., react-native)
const escapePathForRegex = (p) => p.replace(/[\\/]/g, '[\\/]');
const sdkNodeModules = path.join(workspaceRoot, 'node_modules');
const blockListPatterns = [
  `^${escapePathForRegex(sdkNodeModules)}[\\/].*`,
  `^${escapePathForRegex(path.join(sdkNodeModules, 'react-native'))}[\\/].*`,
  `^${escapePathForRegex(path.join(sdkNodeModules, '@react-native'))}[\\/].*`,
  `^${escapePathForRegex(path.join(sdkNodeModules, 'react'))}[\\/].*`,
];
config.resolver.blockList = new RegExp(blockListPatterns.join('|'));

// Avoid walking up the directory tree for node_modules
config.resolver.disableHierarchicalLookup = true;

// Enable resolving symlinked packages (local "file:" deps)
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
