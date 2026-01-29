import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";

const API_KEY_STORAGE_KEY = "google_maps_api_key";
const MAP_ID_STORAGE_KEY = "google_maps_map_id";

interface ApiKeyContextType {
    apiKey: string | null;
    mapId: string | null;
    hasKey: boolean;
    hasMapId: boolean;
    isLoading: boolean;
    setApiKey: (key: string) => Promise<void>;
    deleteApiKey: () => Promise<void>;
    setMapId: (id: string) => Promise<void>;
    deleteMapId: () => Promise<void>;
}

const ApiKeyContext = createContext<ApiKeyContextType>({
    apiKey: null,
    mapId: null,
    hasKey: false,
    hasMapId: false,
    isLoading: true,
    setApiKey: async () => {},
    deleteApiKey: async () => {},
    setMapId: async () => {},
    deleteMapId: async () => {},
});

export const useApiKey = () => useContext(ApiKeyContext);

export const ApiKeyProvider = ({ children }: { children: ReactNode }) => {
    const [apiKey, setApiKeyState] = useState<string | null>(null);
    const [mapId, setMapIdState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const [storedKey, storedMapId] = await Promise.all([
                SecureStore.getItemAsync(API_KEY_STORAGE_KEY),
                SecureStore.getItemAsync(MAP_ID_STORAGE_KEY),
            ]);
            setApiKeyState(storedKey);
            setMapIdState(storedMapId);
        } catch (error) {
            console.error("Failed to load settings:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const setApiKey = useCallback(async (key: string) => {
        try {
            await SecureStore.setItemAsync(API_KEY_STORAGE_KEY, key);
            setApiKeyState(key);
        } catch (error) {
            console.error("Failed to save API key:", error);
            throw error;
        }
    }, []);

    const deleteApiKey = useCallback(async () => {
        try {
            await SecureStore.deleteItemAsync(API_KEY_STORAGE_KEY);
            setApiKeyState(null);
        } catch (error) {
            console.error("Failed to delete API key:", error);
            throw error;
        }
    }, []);

    const setMapId = useCallback(async (id: string) => {
        try {
            await SecureStore.setItemAsync(MAP_ID_STORAGE_KEY, id);
            setMapIdState(id);
        } catch (error) {
            console.error("Failed to save Map ID:", error);
            throw error;
        }
    }, []);

    const deleteMapId = useCallback(async () => {
        try {
            await SecureStore.deleteItemAsync(MAP_ID_STORAGE_KEY);
            setMapIdState(null);
        } catch (error) {
            console.error("Failed to delete Map ID:", error);
            throw error;
        }
    }, []);

    const value = useMemo(() => ({
        apiKey,
        mapId,
        hasKey: apiKey !== null,
        hasMapId: mapId !== null,
        isLoading,
        setApiKey,
        deleteApiKey,
        setMapId,
        deleteMapId,
    }), [apiKey, mapId, isLoading, setApiKey, deleteApiKey, setMapId, deleteMapId]);

    return (
        <ApiKeyContext.Provider value={value}>
            {children}
        </ApiKeyContext.Provider>
    );
};
