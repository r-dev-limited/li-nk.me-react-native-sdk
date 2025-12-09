const path = require('node:path');

function resolveDeviceConfig() {
    const deviceName = process.env.IOS_DEVICE || process.env.DEVICE_ID;
    if (!deviceName) {
        return { type: 'iPhone 15' };
    }
    if (deviceName.includes('-')) {
        return { id: deviceName };
    }
    return { type: deviceName };
}

const iosReleaseBinary = path.join(
    'ios',
    'build',
    'Build',
    'Products',
    'Release-iphonesimulator',
    'LinkMeRNExample.app',
);

const iosDebugBinary = path.join(
    'ios',
    'build',
    'Build',
    'Products',
    'Debug-iphonesimulator',
    'LinkMeRNExample.app',
);

function createXcodeBuildCommand(configuration) {
    return [
        'xcodebuild',
        ...(process.env.LINKME_XCODE_VERBOSE === '1' ? [] : ['-quiet']),
        '-workspace ios/LinkMeRNExample.xcworkspace',
        '-scheme LinkMeRNExample',
        '-configuration',
        configuration,
        '-sdk iphonesimulator',
        '-derivedDataPath ios/build',
    ].join(' ');
}

module.exports = {
    logger: {
        level: process.env.DETOX_LOG_LEVEL || 'trace',
        showDate: true,
    },
    artifacts: {
        rootDir: path.join('artifacts', process.env.DETOX_CONFIGURATION || 'ios.debug'),
        plugins: {
            log: {
                enabled: true,
                keepOnlyFailedTestsArtifacts: false,
            },
            screenshot: {
                shouldTakeAutomaticSnapshots: 'failing',
            },
            video: {
                enabled: false,
            },
        },
    },
    testRunner: {
        args: {
            config: 'e2e/jest.config.js',
            _: ['e2e'],
        },
    },
    apps: {
        'example.ios.release': {
            type: 'ios.app',
            binaryPath: iosReleaseBinary,
            build: createXcodeBuildCommand('Release'),
        },
        'example.ios.debug': {
            type: 'ios.app',
            binaryPath: iosDebugBinary,
            build: createXcodeBuildCommand('Debug'),
        },
    },
    devices: {
        simulator: {
            type: 'ios.simulator',
            device: resolveDeviceConfig(),
        },
    },
    configurations: {
        'ios.debug': {
            device: 'simulator',
            app: 'example.ios.debug',
        },
        'ios.release': {
            device: 'simulator',
            app: 'example.ios.release',
        },
    },
};
