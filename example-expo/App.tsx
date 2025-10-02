import React, { useEffect, useRef, useState } from 'react';
import { Button, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
    configure,
    getInitialLink,
    onLink,
    claimDeferredIfAvailable,
    setAdvertisingConsent,
    track,
    setReady,
    LinkMePayload,
} from '@linkme/react-native-sdk';

export default function App() {
    const [status, setStatus] = useState('Configuring…');
    const [initial, setInitial] = useState<LinkMePayload | null>(null);
    const [latest, setLatest] = useState<LinkMePayload | null>(null);
    const unsubRef = useRef<{ remove: () => void } | null>(null);

    useEffect(() => {
        (async () => {
            unsubRef.current = onLink((p) => setLatest(p));
            await configure({
                baseUrl: 'https://li-nk.me',
                appId: 'demo-app',
                appKey: 'LKDEMO-0001-TESTKEY',
            });
            const init = await getInitialLink();
            setInitial(init);
            setStatus('Ready');
        })();
        return () => {
            unsubRef.current?.remove();
        };
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>LinkMe React Native (Expo) Example</Text>
                <Text>Status: {status}</Text>
                <Text>Initial: {JSON.stringify(initial) || 'none'}</Text>
                <Text>Latest: {JSON.stringify(latest) || 'none'}</Text>
                <View style={styles.row}>
                    <Button
                        title="Accept Consent"
                        onPress={async () => {
                            await setAdvertisingConsent(true);
                            await setReady();
                            setStatus('Consent granted, ready');
                        }}
                    />
                    <View style={{ width: 12 }} />
                    <Button
                        title="Claim Deferred"
                        onPress={async () => {
                            const p = await claimDeferredIfAvailable();
                            if (p) setLatest(p);
                        }}
                    />
                </View>
                <View style={styles.row}>
                    <Button title="Track Open" onPress={() => track('open', { screen: 'home' })} />
                </View>
                <Text style={styles.help}>
                    Configure your App Links and Associated Domains, then open an URL pointing to your app to test deep links.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 16, gap: 12 },
    title: { fontSize: 18, fontWeight: '600' },
    row: { flexDirection: 'row', alignItems: 'center' },
    help: { color: '#666' },
});
