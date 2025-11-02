import { useEffect, useState } from 'react';
import { Button, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
    claimDeferredIfAvailable,
    setAdvertisingConsent,
    setReady,
    track,
    LinkMePayload,
} from '@linkme/react-native-sdk';

export default function Index() {
    const router = useRouter();
    const [latest, setLatest] = useState<LinkMePayload | null>(null);

    useEffect(() => {
        (async () => {
            const deferred = await claimDeferredIfAvailable();
            if (deferred) {
                setLatest(deferred);
                if (deferred.path) {
                    router.replace(deferred.path as any);
                }
            }
        })();
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>LinkMe React Native (Expo Router) Example</Text>
                <Text style={styles.status}>Status: Ready</Text>
                <Text style={styles.section}>Latest Link: {JSON.stringify(latest) || 'none'}</Text>
                <View style={styles.row}>
                    <Button
                        title="Accept Consent"
                        onPress={async () => {
                            await setAdvertisingConsent(true);
                            await setReady();
                        }}
                    />
                    <View style={{ width: 12 }} />
                    <Button
                        title="Claim Deferred"
                        onPress={async () => {
                            const p = await claimDeferredIfAvailable();
                            if (p) {
                                setLatest(p);
                                if (p.path) {
                                    router.push(p.path as any);
                                }
                            }
                        }}
                    />
                </View>
                <View style={styles.row}>
                    <Button title="Track Open" onPress={() => track('open', { screen: 'home' })} />
                </View>
                <View style={styles.row}>
                    <Button title="Go to Profile" onPress={() => router.push('/profile')} />
                    <View style={{ width: 12 }} />
                    <Button title="Go to Settings" onPress={() => router.push('/settings')} />
                </View>
                <Text style={styles.help}>
                    Configure your App Links and Associated Domains, then open an URL pointing to your app to test deep links.
                    {'\n\n'}
                    Deep links will automatically navigate to the route specified in the link's path parameter.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 16, gap: 12 },
    title: { fontSize: 18, fontWeight: '600' },
    status: { fontSize: 16, fontWeight: '500' },
    section: { fontSize: 14 },
    row: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
    help: { color: '#666', fontSize: 12, marginTop: 16 },
});
