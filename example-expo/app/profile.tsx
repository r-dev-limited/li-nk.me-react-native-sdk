import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function Profile() {
    const router = useRouter();
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Profile Page</Text>
            <Text style={styles.text}>This page was navigated to via deep link or button press.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    title: { fontSize: 24, fontWeight: '600', marginBottom: 12 },
    text: { fontSize: 16, color: '#666', textAlign: 'center' },
});
