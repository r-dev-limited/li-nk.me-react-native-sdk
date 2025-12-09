import { Button, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
    claimDeferredIfAvailable,
    getInitialLink,
    onLink,
    setAdvertisingConsent,
    setReady,
    track,
    LinkMePayload,
} from '@li-nk.me/react-native-sdk';
import { useEffect, useState } from 'react';

export default function Index() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [latest, setLatest] = useState<LinkMePayload | null>(null);

    useEffect(() => {
        if (params?.linkId) {
            console.log('[LinkMe Example] Received params via navigation', params);
            setLatest(params as any);
        }
    }, [JSON.stringify(params)]);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const initial = await getInitialLink();
                if (active && initial) {
                    console.log('[LinkMe Example] Initial payload on home screen', initial);
                    setLatest(initial);
                }
            } catch (error) {
                console.warn('[LinkMe Example] Failed to read initial link', error);
            }
        })();

        const subscription = onLink((payload: LinkMePayload) => {
            console.log('[LinkMe Example] onLink update on home screen', payload);
            setLatest(payload);
        });

        return () => {
            active = false;
            subscription.remove();
        };
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title} testID="home-title">
                    LinkMe React Native (Expo Router) Example
                </Text>
                <Text style={styles.status} testID="home-status">
                    Status: Ready
                </Text>
                <Text style={styles.section}>Latest Link Payload:</Text>
                <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Link ID</Text>
                    <Text style={styles.metaValue} testID="latest-link-id">
                        {latest?.linkId ?? 'none'}
                    </Text>
                </View>
                <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Path</Text>
                    <Text style={styles.metaValue} testID="latest-link-path">
                        {latest?.path ?? 'none'}
                    </Text>
                </View>
                <View style={styles.debugBox}>
                    <Text style={styles.debugText} testID="latest-payload">
                        {latest ? JSON.stringify(latest, null, 2) : 'None'}
                    </Text>
                </View>

                {latest?.utm && Object.keys(latest.utm).length > 0 && (
                    <View style={[styles.debugBox, { borderColor: '#2196F3', backgroundColor: '#E3F2FD' }]}>
                        <Text style={[styles.debugTitle, { color: '#1976D2' }]}>UTM Inspector</Text>
                        {Object.entries(latest.utm).map(([key, value]) => (
                            <View key={key} style={styles.paramRow}>
                                <Text style={styles.paramKey}>{key}:</Text>
                                <Text style={styles.paramValue}>{String(value)}</Text>
                            </View>
                        ))}
                    </View>
                )}
                <View style={styles.row}>
                    <Button
                        title="Accept Consent"
                        onPress={async () => {
                            await setAdvertisingConsent(true);
                            await setReady();
                        }}
                        testID="button-accept-consent"
                    />
                    <View style={{ width: 12 }} />
                    <Button
                        title="Claim Deferred"
                        onPress={async () => {
                            console.log('[LinkMe Example] Manual claimDeferred tapped');
                            const p = await claimDeferredIfAvailable();
                            if (p) {
                                console.log('[LinkMe Example] Manual claimDeferred resolved payload', p);
                                setLatest(p);
                                if (p.path) {
                                    const targetPath = p.path.startsWith('/') ? p.path : `/${p.path}`;
                                    router.push(targetPath as any);
                                }
                            }
                        }}
                        testID="button-claim-deferred"
                    />
                </View>
                <View style={styles.row}>
                    <Button
                        title="Track Open"
                        onPress={() => track('open', { screen: 'home' })}
                        testID="button-track-open"
                    />
                </View>
                <View style={styles.row}>
                    <Button
                        title="Go to Profile"
                        onPress={() => router.push('/profile')}
                        testID="button-go-profile"
                    />
                    <View style={{ width: 12 }} />
                    <Button
                        title="Go to Settings"
                        onPress={() => router.push('/settings')}
                        testID="button-go-settings"
                    />
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
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    metaLabel: { fontSize: 12, fontWeight: '600' },
    metaValue: { fontSize: 12, fontFamily: 'Menlo' },
    help: { color: '#666', fontSize: 12, marginTop: 16 },
    debugBox: {
        padding: 12,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        marginVertical: 8,
    },
    debugTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    debugText: {
        fontSize: 12,
        fontFamily: 'Menlo',
    },
    paramRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    paramKey: {
        fontSize: 12,
        fontWeight: '600',
        marginRight: 8,
        minWidth: 80,
    },
    paramValue: {
        fontSize: 12,
        flex: 1,
    },
});
