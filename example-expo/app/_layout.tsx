import { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import {
    configure,
    getInitialLink,
    onLink,
    claimDeferredIfAvailable,
    track,
    LinkMePayload,
} from '@li-nk.me/react-native-sdk';
import { useRouter } from 'expo-router';

export default function RootLayout() {
    const router = useRouter();
    const unsubRef = useRef<{ remove: () => void } | null>(null);
    const initializedRef = useRef(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Prevent double initialization in React strict mode
        if (initializedRef.current) return;
        initializedRef.current = true;

        console.log('[LinkMe Example] Initializing LinkMe SDK');

        (async () => {
            try {
                // Step 1: Configure the SDK
                const baseUrl = 'https://e0qcsxfc.li-nk.me';
                const appId = 'e0qcsxfc';
                const appKey = 'ak_nMqCl4QwFSVvjC5VrrAvTH0ziWH06WLhua6EtCvFO6o';

                await configure({
                    baseUrl,
                    appId,
                    appKey,
                    sendDeviceInfo: true,
                    includeVendorId: true,
                    includeAdvertisingId: false,
                });

                console.log('[LinkMe Example] SDK configured');

                // Step 2: Add listener for payloads
                unsubRef.current = onLink((payload: LinkMePayload) => {
                    console.log('[LinkMe Example] Received payload:', payload);

                    // Example: Map to Firebase Analytics
                    /*
                    if (payload.utm) {
                        analytics().logEvent('campaign_details', {
                            source: payload.utm.source,
                            medium: payload.utm.medium,
                            campaign: payload.utm.campaign,
                            term: payload.utm.term,
                            content: payload.utm.content,
                        });
                    }
                    */

                    if (payload.path) {
                        const targetPath = payload.path.startsWith('/') ? payload.path : `/${payload.path}`;
                        console.log('[LinkMe Example] Navigating to:', targetPath);
                        router.replace(targetPath as any);
                    }
                });

                console.log('[LinkMe Example] Listener registered');

                // Step 3: Get initial link
                const initial = await getInitialLink();
                console.log('[LinkMe Example] Initial link:', initial);

                if (initial?.path) {
                    const targetPath = initial.path.startsWith('/') ? initial.path : `/${initial.path}`;
                    console.log('[LinkMe Example] Navigating to initial path:', targetPath);
                    router.replace(targetPath as any);
                } else {
                    // Step 4: If no initial link, check for deferred link
                    console.log('[LinkMe Example] No initial link, checking deferred');
                    const deferred = await claimDeferredIfAvailable();
                    console.log('[LinkMe Example] Deferred link:', deferred);

                    if (deferred?.path) {
                        const targetPath = deferred.path.startsWith('/') ? deferred.path : `/${deferred.path}`;
                        console.log('[LinkMe Example] Navigating to deferred path:', targetPath);
                        router.replace(targetPath as any);
                    }
                }

                // Step 5: Track app open
                await track('open');
                console.log('[LinkMe Example] Initialization complete');
            } catch (error) {
                console.error('[LinkMe Example] Initialization error:', error);
            } finally {
                setIsReady(true);
            }
        })();

        return () => {
            console.log('[LinkMe Example] Cleanup');
            unsubRef.current?.remove();
        };
    }, []);

    if (!isReady) {
        return null;
    }

    return (
        <Stack
            screenOptions={{
                headerShown: true,
            }}
        >
            <Stack.Screen name="index" options={{ title: 'Home' }} />
            <Stack.Screen name="profile" options={{ title: 'Profile' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Stack>
    );
}
