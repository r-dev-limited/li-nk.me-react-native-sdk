const { device, element, by, expect } = require('detox');

async function runWithPasteboardRetries(fn, attempts = 3) {
    let lastError;
    // We aggressively try to dismiss dialogs before each attempt if needed
    for (let i = 0; i < attempts; i++) {
        // This call to allowPasteIfNeeded is now redundant with ensureAppReady,
        // but keeping it for now as it's part of the retry logic for specific actions.
        // If ensureAppReady is called before every action, this might be removed.
        // For now, it acts as a quick check before a specific action.
        await allowPasteIfNeeded(500);
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    throw lastError;
}

const expectedLinkId =
    process.env.LINKME_EXPECTED_LINK_ID ||
    process.env.EXPO_PUBLIC_LINKME_EXPECTED_LINK_ID ||
    null;
const expoDevClientUrl = process.env.LINKME_EXPO_DEV_CLIENT_URL || null;
const expoDevLaunchDelay = Number(process.env.LINKME_EXPO_LAUNCH_DELAY_MS || '3000');

async function delay(ms) {
    if (ms <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, ms));
}

async function launchLinkMeApp(options) {
    const finalOptions = { ...options };
    const shouldOpenDevClientUrl = Boolean(expoDevClientUrl) && finalOptions.newInstance !== false;
    if (shouldOpenDevClientUrl) {
        delete finalOptions.url;
    }
    await device.launchApp(finalOptions);
    if (shouldOpenDevClientUrl) {
        await delay(expoDevLaunchDelay);
        await device.openURL({ url: expoDevClientUrl });
    }
}

// Combined startup handler to deal with race conditions between System Dialogs and Expo Dialogs
async function ensureAppReady() {
    const deadline = Date.now() + 120000; // 120s total startup timeout (increased)
    console.log('[e2e] Waiting for app to be ready...');

    // Disable synchronization for the entire startup phase to prevent hangs
    // when system dialogs or overlays block the main thread/run loop.
    await device.disableSynchronization();

    try {
        let iteration = 0;
        while (Date.now() < deadline) {
            iteration++;
            // Log every 5 iterations to avoid spam, but prove we are alive
            if (iteration % 5 === 0) console.log(`[e2e] Startup Loop Iteration ${iteration}...`);

            // 1. Check if we are already ready
            try {
                // With sync disabled, this checks 'instantaneously'
                await expect(element(by.id('sdk-status'))).toHaveText('Ready');

                // If we get here, SDK is ready. Now check if Home is visible (cleared of dialogs)
                try {
                    await expect(element(by.id('home-title'))).toBeVisible();
                    console.log('[e2e] Home screen is visible and SDK is ready.');
                    return; // Success!
                } catch {
                    // SDK ready but Home not visible? Might be covered by a dialog.
                    // Fall through to dialog handling
                }
            } catch {
                // SDK not ready yet
            }

            // 2. Handle System Dialogs (Paste, etc)
            const settings = ['Allow Paste', 'Allow', 'Paste', 'OK'];
            let handledSystem = false;
            for (const label of settings) {
                try {
                    // Try exact label
                    await element(by.label(label)).atIndex(0).tap();
                    console.log(`[e2e] Tapped "${label}" (label) on system dialog`);
                    handledSystem = true;
                    break;
                } catch (e) {
                    try {
                        // Try by text as fallback
                        await element(by.text(label)).atIndex(0).tap();
                        console.log(`[e2e] Tapped "${label}" (text) on system dialog`);
                        handledSystem = true;
                        break;
                    } catch (e2) { /* ignore */ }
                }
            }

            if (handledSystem) {
                // Wait a moment for animation
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            // 3. Handle Expo Dev Client "Continue" Dialog OR Dev Menu "X"
            // We use simple tap here. Since sync is disabled, it won't hang.
            const expoButtons = ['Continue', 'Close', 'X'];
            let handledExpo = false;
            for (const btnName of expoButtons) {
                try {
                    await element(by.text(btnName)).atIndex(0).tap();
                    console.log(`[e2e] Tapped Expo button: "${btnName}"`);
                    handledExpo = true;
                    break;
                } catch {
                    try {
                        await element(by.label(btnName)).atIndex(0).tap();
                        console.log(`[e2e] Tapped Expo button: "${btnName}" (label)`);
                        handledExpo = true;
                        break;
                    } catch { /* ignore */ }
                }
            }

            if (handledExpo) {
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            // 4. Wait a bit before next poll
            await new Promise(r => setTimeout(r, 1000));
        }

        throw new Error('[e2e] Timeout waiting for app to be ready (Home screen + SDK Ready)');
    } finally {
        // ALWAYS re-enable synchronization before returning (success or fail)
        await device.enableSynchronization();
    }
}

async function expectHomeReady() {
    await ensureAppReady();

    // Final content verification
    if (expectedLinkId) {
        await runWithPasteboardRetries(() =>
            expect(element(by.id('latest-link-id'))).toHaveText(expectedLinkId),
        );
    }
}

describe('LinkMe Expo example', () => {
    beforeAll(async () => {
        await launchLinkMeApp({
            delete: true,
            newInstance: true,
            permissions: { userTracking: 'YES', clipboard: 'YES' },
        });
        // We do NOT disable synchronization globally because we want to wait for React to be idle.
        // However, animations or timers in Expo might occasionally require it.
        // await device.disableSynchronization(); 
        await expectHomeReady();
    });

    beforeEach(async () => {
        await launchLinkMeApp({
            newInstance: false,
        });
        // await device.disableSynchronization();
        await expectHomeReady();
    });

    it('renders the home screen payload summary', async () => {
        await runWithPasteboardRetries(() => expect(element(by.id('home-title'))).toBeVisible());
        await runWithPasteboardRetries(() => expect(element(by.id('latest-payload'))).toBeVisible());
    });

    it('navigates to the profile screen and back', async () => {
        await runWithPasteboardRetries(() => element(by.id('button-go-profile')).tap());
        await runWithPasteboardRetries(() => expect(element(by.id('profile-title'))).toBeVisible());
        await runWithPasteboardRetries(() => element(by.id('button-profile-back-home')).tap());
        await runWithPasteboardRetries(() => expect(element(by.id('home-title'))).toBeVisible());
        if (expectedLinkId) {
            await runWithPasteboardRetries(() =>
                expect(element(by.id('latest-link-id'))).toHaveText(expectedLinkId),
            );
        }
    });

    it('navigates to the settings screen and back', async () => {
        await runWithPasteboardRetries(() => element(by.id('button-go-settings')).tap());
        await runWithPasteboardRetries(() => expect(element(by.id('settings-title'))).toBeVisible());
        await runWithPasteboardRetries(() => element(by.id('button-settings-back-home')).tap());
        await runWithPasteboardRetries(() => expect(element(by.id('home-title'))).toBeVisible());
        if (expectedLinkId) {
            await runWithPasteboardRetries(() =>
                expect(element(by.id('latest-link-id'))).toHaveText(expectedLinkId),
            );
        }
    });
});
