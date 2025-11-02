import { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import {
    configure,
    getInitialLink,
    onLink,
    claimDeferredIfAvailable,
    setAdvertisingConsent,
    setReady,
    LinkMePayload,
} from '@linkme/react-native-sdk';
import { useRouter } from 'expo-router';

export default function RootLayout() {
    const router = useRouter();
    const [status, setStatus] = useState('Configuring…');
    const unsubRef = useRef<{ remove: () => void } | null>(null);

    useEffect(() => {
        (async () => {
            unsubRef.current = onLink((payload: LinkMePayload) => {
                if (payload.path) {
                    router.push(payload.path as any);
                }
            });

            await configure({
                baseUrl: 'https://li-nk.me',
                appId: '0jk2u2h9',
                appKey: 'ak_CgJwMBftYHC_7_WU8i-zIQb4a3OXZ4yqazp87iF2uus',
            });

            const initial = await getInitialLink();
            if (initial?.path) {
                router.replace(initial.path as any);
            }

            setStatus('Ready');
        })();

        return () => {
            unsubRef.current?.remove();
        };
    }, []);

    return (
        <Stack>
            <Stack.Screen name="index" options={{ title: 'Home' }} />
            <Stack.Screen name="profile" options={{ title: 'Profile' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Stack>
    );
}
