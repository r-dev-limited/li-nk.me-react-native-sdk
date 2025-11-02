import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import {
    configure,
    getInitialLink,
    onLink,
    claimDeferredIfAvailable,
    track,
    LinkMePayload,
} from '@linkme/react-native-sdk';
import { useRouter } from 'expo-router';

export default function RootLayout() {
    const router = useRouter();
    const unsubRef = useRef<{ remove: () => void } | null>(null);
    const initializedRef = useRef(false);

    useEffect(() => {
        // Prevent double initialization in React strict mode
        if (initializedRef.current) return;
        initializedRef.current = true;

        console.log('[LinkMe Example] Initializing LinkMe SDK');

        (async () => {
            try {
                // Step 1: Configure the SDK
                const baseUrl = 'https://0jk2u2h9.li-nk.me';
                const appId = '0jk2u2h9';
                const appKey = 'ak_CgJwMBftYHC_7_WU8i-zIQb4a3OXZ4yqazp87iF2uus';

                await configure({
                    baseUrl,
                    appId,
                    appKey,
                    enablePasteboard: false,
                    sendDeviceInfo: true,
                    includeVendorId: true,
                    includeAdvertisingId: false,
                });

                console.log('[LinkMe Example] SDK configured');

                // Step 2: Add listener for payloads
                unsubRef.current = onLink((payload: LinkMePayload) => {
                    console.log('[LinkMe Example] Received payload:', payload);

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
            }
        })();

        return () => {
            console.log('[LinkMe Example] Cleanup');
            unsubRef.current?.remove();
        };
    }, []);

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
