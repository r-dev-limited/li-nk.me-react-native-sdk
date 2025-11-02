import { useLayoutEffect } from 'react';
import { useRouter } from 'expo-router';

export const options = {
    headerShown: false,
};

export default function LinkMeFallback() {
    const router = useRouter();

    useLayoutEffect(() => {
        router.replace('/');
    }, [router]);

    return null;
}
