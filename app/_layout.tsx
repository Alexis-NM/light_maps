import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { HapticProvider } from "../contexts/HapticContext";
import { useFonts } from "expo-font";
import { setStatusBarHidden } from "expo-status-bar";
import {
    InvertColorsProvider,
    useInvertColors,
} from "@/contexts/InvertColorsContext";
import { DisplayModeProvider } from "@/contexts/DisplayModeContext";
import { MapProvider } from "@/contexts/MapContext";
import { ApiKeyProvider, useApiKey } from "@/contexts/ApiKeyContext";
import * as SystemUI from "expo-system-ui";
import * as NavigationBar from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';


function RootNavigation() {
    const { invertColors } = useInvertColors();
    const { hasKey, isLoading } = useApiKey();
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        SystemUI.setBackgroundColorAsync(invertColors ? "white" : "black");
        NavigationBar.setVisibilityAsync("hidden");
    }, [invertColors]);

    // Redirect to setup if no API key
    useEffect(() => {
        if (isLoading) return;

        const inSetup = segments[0] === "setup-api-key";

        if (!hasKey && !inSetup) {
            router.replace("/setup-api-key");
        }
    }, [hasKey, isLoading, segments, router]);

    // Don't render until we know if there's an API key
    if (isLoading) {
        return null;
    }

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: "none",
                contentStyle: {
                    backgroundColor: invertColors ? "white" : "black",
                },
            }}
        >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="setup-api-key" />
            <Stack.Screen name="settings/customise" />
            <Stack.Screen name="settings/customise-interface" />
            <Stack.Screen name="settings/display-mode" />
            <Stack.Screen name="confirm" />
        </Stack>
    );
}

export default function RootLayout() {
    const [fontsLoaded, fontError] = useFonts({
        "PublicSans": require("../assets/fonts/PublicSans-Regular.ttf"),
        "PublicSans-Regular": require("../assets/fonts/PublicSans-Regular.ttf"),
    });

    useEffect(() => {
        setStatusBarHidden(true, "none");
    }, []);

    useEffect(() => {
        if (fontsLoaded || fontError) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded, fontError]);

    if (!fontsLoaded && !fontError) {
        return null;
    }

    return (
        <ApiKeyProvider>
            <InvertColorsProvider>
                <DisplayModeProvider>
                    <HapticProvider>
                        <MapProvider>
                            <RootNavigation />
                        </MapProvider>
                    </HapticProvider>
                </DisplayModeProvider>
            </InvertColorsProvider>
        </ApiKeyProvider>
    );
}
