import { View, Text, StyleSheet, Button } from 'react-native';
import { useRouter } from 'expo-router';

export default function Settings() {
    const router = useRouter();
    return (
        <View style={styles.container}>
            <Text style={styles.title} testID="settings-title">
                Settings Page
            </Text>
            <Text style={styles.text}>This page was navigated to via deep link or button press.</Text>
            <Button
                title="Back to Home"
                onPress={() => router.replace('/')}
                testID="button-settings-back-home"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    title: { fontSize: 24, fontWeight: '600', marginBottom: 12 },
    text: { fontSize: 16, color: '#666', textAlign: 'center' },
});
