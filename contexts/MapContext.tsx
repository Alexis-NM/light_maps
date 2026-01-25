import React, { createContext, useContext, useState, useCallback, useRef, ReactNode, useEffect } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import GetLocation from "react-native-get-location";
import { WebView } from "react-native-webview";

const LOCATION_ENABLED_KEY = "@maps_location_enabled";

export interface MapLocation {
    latitude: number;
    longitude: number;
}

export interface SavedPlace {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    createdAt: number;
}

export interface SearchResult {
    placeId: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
}

interface MapContextType {
    // Location state
    userLocation: MapLocation | null;
    isLoadingLocation: boolean;
    locationEnabled: boolean;

    // Map state
    mapCenter: MapLocation;
    mapZoom: number;
    selectedLocation: MapLocation | null;
    selectedAddress: string | null;

    // Saved places
    savedPlaces: SavedPlace[];

    // Search
    searchResults: SearchResult[];
    isSearching: boolean;
    searchQuery: string;

    // WebView ref
    webViewRef: React.RefObject<WebView | null>;

    // Actions
    setMapCenter: (location: MapLocation, zoom?: number) => void;
    selectLocation: (location: MapLocation, address?: string) => void;
    clearSelection: () => void;
    savePlace: (place: Omit<SavedPlace, "id" | "createdAt">) => void;
    removePlace: (id: string) => void;
    clearAllPlaces: () => void;
    setSearchQuery: (query: string) => void;
    setSearchResults: (results: SearchResult[]) => void;
    goToUserLocation: () => void;
    setUserLocation: (location: MapLocation) => void;
    setIsLoadingLocation: (loading: boolean) => void;
    setLocationEnabled: (enabled: boolean) => Promise<void>;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export function MapProvider({ children }: { children: ReactNode }) {
    // Location state
    const [userLocation, setUserLocationState] = useState<MapLocation | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [locationEnabled, setLocationEnabledState] = useState(true);

    // Load location preference on mount
    useEffect(() => {
        AsyncStorage.getItem(LOCATION_ENABLED_KEY).then((value) => {
            if (value !== null) {
                setLocationEnabledState(value === "true");
            }
        });
    }, []);

    // Map state
    const [mapCenter, _setMapCenterState] = useState<MapLocation>({ latitude: 48.8566, longitude: 2.3522 });
    const [mapZoom, _setMapZoom] = useState(13);
    const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
    const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

    // Saved places (in memory, could be persisted to AsyncStorage)
    const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);

    // Search
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, _setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // WebView ref for controlling the map
    const webViewRef = useRef<WebView>(null);

    const setUserLocation = useCallback((location: MapLocation) => {
        setUserLocationState(location);
    }, []);

    const setMapCenter = useCallback((location: MapLocation, zoom?: number) => {
        // Only use JS injection - don't update React state to avoid WebView reload
        webViewRef.current?.injectJavaScript(
            `setCenter(${location.latitude}, ${location.longitude}, ${zoom || "null"}); true;`
        );
    }, []);

    const selectLocation = useCallback((location: MapLocation, address?: string) => {
        setSelectedLocation(location);
        setSelectedAddress(address || null);
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedLocation(null);
        setSelectedAddress(null);
    }, []);

    const savePlace = useCallback((place: Omit<SavedPlace, "id" | "createdAt">) => {
        const newPlace: SavedPlace = {
            ...place,
            id: Date.now().toString(),
            createdAt: Date.now(),
        };
        setSavedPlaces((prev) => [newPlace, ...prev]);
    }, []);

    const removePlace = useCallback((id: string) => {
        setSavedPlaces((prev) => prev.filter((p) => p.id !== id));
    }, []);

    const clearAllPlaces = useCallback(() => {
        setSavedPlaces([]);
    }, []);

    const updateLocationOnMap = useCallback((coords: MapLocation) => {
        setUserLocationState(coords);
        setMapCenter(coords, 15);
        webViewRef.current?.injectJavaScript(
            `setUserLocation(${coords.latitude}, ${coords.longitude}); true;`
        );
        setIsLoadingLocation(false);
    }, [setMapCenter]);

    const setLocationEnabled = useCallback(async (enabled: boolean) => {
        setLocationEnabledState(enabled);
        await AsyncStorage.setItem(LOCATION_ENABLED_KEY, enabled.toString());
    }, []);

    const goToUserLocation = useCallback(async () => {
        if (!locationEnabled) {
            return;
        }

        setIsLoadingLocation(true);

        try {
            if (Platform.OS === "android") {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: "Location Permission",
                        message: "Maps needs access to your location to show your position on the map.",
                        buttonNeutral: "Ask Me Later",
                        buttonNegative: "Cancel",
                        buttonPositive: "OK",
                    }
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    setIsLoadingLocation(false);
                    return;
                }
            }

            // Use react-native-get-location (simpler, direct Android API)
            const location = await GetLocation.getCurrentPosition({
                enableHighAccuracy: false,
                timeout: 60000,
            });

            updateLocationOnMap({
                latitude: location.latitude,
                longitude: location.longitude,
            });
        } catch {
            setIsLoadingLocation(false);
        }
    }, [updateLocationOnMap, locationEnabled]);

    const value: MapContextType = {
        userLocation,
        isLoadingLocation,
        locationEnabled,
        mapCenter,
        mapZoom,
        selectedLocation,
        selectedAddress,
        savedPlaces,
        searchResults,
        isSearching,
        searchQuery,
        webViewRef,
        setMapCenter,
        selectLocation,
        clearSelection,
        savePlace,
        removePlace,
        clearAllPlaces,
        setSearchQuery,
        setSearchResults,
        goToUserLocation,
        setUserLocation,
        setIsLoadingLocation,
        setLocationEnabled,
    };

    return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMap() {
    const context = useContext(MapContext);
    if (context === undefined) {
        throw new Error("useMap must be used within a MapProvider");
    }
    return context;
}
