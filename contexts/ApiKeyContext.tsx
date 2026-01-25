import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";

const API_KEY_STORAGE_KEY = "google_maps_api_key";

interface ApiKeyContextType {
    apiKey: string | null;
    hasKey: boolean;
    isLoading: boolean;
    setApiKey: (key: string) => Promise<void>;
    deleteApiKey: () => Promise<void>;
}

const ApiKeyContext = createContext<ApiKeyContextType>({
    apiKey: null,
    hasKey: false,
    isLoading: true,
    setApiKey: async () => {},
    deleteApiKey: async () => {},
});

export const useApiKey = () => useContext(ApiKeyContext);

export const ApiKeyProvider = ({ children }: { children: ReactNode }) => {
    const [apiKey, setApiKeyState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadApiKey();
    }, []);

    const loadApiKey = async () => {
        try {
            const storedKey = await SecureStore.getItemAsync(API_KEY_STORAGE_KEY);
            setApiKeyState(storedKey);
        } catch (error) {
            console.error("Failed to load API key:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const setApiKey = async (key: string) => {
        try {
            await SecureStore.setItemAsync(API_KEY_STORAGE_KEY, key);
            setApiKeyState(key);
        } catch (error) {
            console.error("Failed to save API key:", error);
            throw error;
        }
    };

    const deleteApiKey = async () => {
        try {
            await SecureStore.deleteItemAsync(API_KEY_STORAGE_KEY);
            setApiKeyState(null);
        } catch (error) {
            console.error("Failed to delete API key:", error);
            throw error;
        }
    };

    return (
        <ApiKeyContext.Provider
            value={{
                apiKey,
                hasKey: apiKey !== null,
                isLoading,
                setApiKey,
                deleteApiKey,
            }}
        >
            {children}
        </ApiKeyContext.Provider>
    );
};
