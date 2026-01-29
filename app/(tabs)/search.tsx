import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, TextInput, FlatList, Pressable, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ContentContainer from "@/components/ContentContainer";
import { StyledText } from "@/components/StyledText";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { useHaptic } from "@/contexts/HapticContext";
import { useMap, SearchResult } from "@/contexts/MapContext";
import { useApiKey } from "@/contexts/ApiKeyContext";
import { n } from "@/utils/scaling";
import { t } from "@/i18n";

const HISTORY_KEY = "search_history";
const MAX_HISTORY = 10;

interface AutocompleteResult {
    placeId: string;
    name: string;
    address: string;
}

export default function SearchScreen() {
    const router = useRouter();
    const { invertColors } = useInvertColors();
    const { triggerHaptic } = useHaptic();
    const { setMapCenter, webViewRef, selectLocation, userLocation } = useMap();
    const { apiKey } = useApiKey();

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
    const [history, setHistory] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const textColor = invertColors ? "#000000" : "#FFFFFF";
    const inputBg = invertColors ? "#F0F0F0" : "#1A1A1A";
    const borderColor = invertColors ? "#E0E0E0" : "#333333";

    // Load history on mount
    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const stored = await AsyncStorage.getItem(HISTORY_KEY);
            if (stored) {
                setHistory(JSON.parse(stored));
            }
        } catch (err) {
            console.error("Failed to load history:", err);
        }
    };

    const saveToHistory = async (result: SearchResult) => {
        try {
            // Remove duplicate if exists
            const filtered = history.filter(h => h.placeId !== result.placeId);
            // Add to beginning, limit to MAX_HISTORY
            const newHistory = [result, ...filtered].slice(0, MAX_HISTORY);
            setHistory(newHistory);
            await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
        } catch (err) {
            console.error("Failed to save history:", err);
        }
    };

    const removeFromHistory = async (placeId: string) => {
        triggerHaptic();
        try {
            const newHistory = history.filter(h => h.placeId !== placeId);
            setHistory(newHistory);
            await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
        } catch (err) {
            console.error("Failed to remove from history:", err);
        }
    };

    // Autocomplete as user types
    const fetchAutocomplete = useCallback(async (input: string) => {
        if (!input.trim() || input.length < 2) {
            setSuggestions([]);
            return;
        }

        try {
            let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}`;

            // Bias results to user location if available
            if (userLocation) {
                url += `&location=${userLocation.latitude},${userLocation.longitude}&radius=50000`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.status === "OK" && data.predictions) {
                const autoResults: AutocompleteResult[] = data.predictions.slice(0, 5).map((p: any) => ({
                    placeId: p.place_id,
                    name: p.structured_formatting?.main_text || p.description.split(",")[0],
                    address: p.structured_formatting?.secondary_text || p.description,
                }));
                setSuggestions(autoResults);
            } else {
                setSuggestions([]);
            }
        } catch (err) {
            console.error("Autocomplete error:", err);
            setSuggestions([]);
        }
    }, [apiKey, userLocation]);

    // Debounced autocomplete
    const handleQueryChange = (text: string) => {
        setQuery(text);
        setError(null);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (text.trim()) {
            debounceRef.current = setTimeout(() => {
                fetchAutocomplete(text);
            }, 300);
        } else {
            setSuggestions([]);
            setResults([]);
        }
    };

    // Get place details from placeId
    const getPlaceDetails = async (placeId: string): Promise<SearchResult | null> => {
        try {
            const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=place_id,name,formatted_address,geometry&key=${apiKey}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.status === "OK" && data.result) {
                return {
                    placeId: data.result.place_id,
                    name: data.result.name,
                    address: data.result.formatted_address,
                    latitude: data.result.geometry.location.lat,
                    longitude: data.result.geometry.location.lng,
                };
            }
        } catch (err) {
            console.error("Place details error:", err);
        }
        return null;
    };

    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;

        setIsSearching(true);
        setError(null);
        setSuggestions([]);

        try {
            let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;

            if (userLocation) {
                url += `&location=${userLocation.latitude},${userLocation.longitude}&radius=50000`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.status === "OK" && data.results) {
                const searchResults: SearchResult[] = data.results.slice(0, 15).map((place: any) => ({
                    placeId: place.place_id,
                    name: place.name,
                    address: place.formatted_address,
                    latitude: place.geometry.location.lat,
                    longitude: place.geometry.location.lng,
                }));
                setResults(searchResults);
            } else if (data.status === "ZERO_RESULTS") {
                setResults([]);
                setError(t("noResults"));
            } else {
                setError(data.error_message || "Search failed");
            }
        } catch (err) {
            setError(t("networkError"));
            console.error("Search error:", err);
        } finally {
            setIsSearching(false);
        }
    }, [query, apiKey, userLocation]);

    const handleSelectResult = async (result: SearchResult) => {
        triggerHaptic();
        await saveToHistory(result);
        setMapCenter({ latitude: result.latitude, longitude: result.longitude }, 16);
        selectLocation(
            { latitude: result.latitude, longitude: result.longitude },
            result.address
        );
        webViewRef.current?.injectJavaScript(
            `goToPlace(${result.latitude}, ${result.longitude}, "${result.name.replace(/"/g, '\\"')}"); true;`
        );
        router.push("/(tabs)");
    };

    const handleSelectSuggestion = async (suggestion: AutocompleteResult) => {
        triggerHaptic();
        setIsSearching(true);

        const details = await getPlaceDetails(suggestion.placeId);
        if (details) {
            await saveToHistory(details);
            setMapCenter({ latitude: details.latitude, longitude: details.longitude }, 16);
            selectLocation(
                { latitude: details.latitude, longitude: details.longitude },
                details.address
            );
            webViewRef.current?.injectJavaScript(
                `goToPlace(${details.latitude}, ${details.longitude}, "${details.name.replace(/"/g, '\\"')}"); true;`
            );
            router.push("/(tabs)");
        }
        setIsSearching(false);
    };

    const handleSelectHistory = (item: SearchResult) => {
        triggerHaptic();
        setMapCenter({ latitude: item.latitude, longitude: item.longitude }, 16);
        selectLocation(
            { latitude: item.latitude, longitude: item.longitude },
            item.address
        );
        webViewRef.current?.injectJavaScript(
            `goToPlace(${item.latitude}, ${item.longitude}, "${item.name.replace(/"/g, '\\"')}"); true;`
        );
        router.push("/(tabs)");
    };

    const renderSuggestion = ({ item }: { item: AutocompleteResult }) => (
        <Pressable
            style={[styles.resultItem, { borderBottomColor: borderColor }]}
            onPress={() => handleSelectSuggestion(item)}
        >
            <MaterialIcons name="search" size={n(18)} color={textColor + "40"} style={styles.itemIcon} />
            <View style={styles.resultContent}>
                <StyledText style={styles.resultName} numberOfLines={1}>
                    {item.name}
                </StyledText>
                <StyledText style={[styles.resultAddress, { color: textColor + "60" }]} numberOfLines={1}>
                    {item.address}
                </StyledText>
            </View>
        </Pressable>
    );

    const renderResult = ({ item }: { item: SearchResult }) => (
        <Pressable
            style={[styles.resultItem, { borderBottomColor: borderColor }]}
            onPress={() => handleSelectResult(item)}
        >
            <MaterialIcons name="place" size={n(18)} color={textColor + "40"} style={styles.itemIcon} />
            <View style={styles.resultContent}>
                <StyledText style={styles.resultName} numberOfLines={1}>
                    {item.name}
                </StyledText>
                <StyledText style={[styles.resultAddress, { color: textColor + "60" }]} numberOfLines={1}>
                    {item.address}
                </StyledText>
            </View>
        </Pressable>
    );

    const renderHistoryItem = ({ item }: { item: SearchResult }) => (
        <Pressable
            style={[styles.resultItem, { borderBottomColor: borderColor }]}
            onPress={() => handleSelectHistory(item)}
        >
            <MaterialIcons name="history" size={n(18)} color={textColor + "40"} style={styles.itemIcon} />
            <View style={styles.resultContent}>
                <StyledText style={styles.resultName} numberOfLines={1}>
                    {item.name}
                </StyledText>
                <StyledText style={[styles.resultAddress, { color: textColor + "60" }]} numberOfLines={1}>
                    {item.address}
                </StyledText>
            </View>
            <Pressable
                onPress={() => removeFromHistory(item.placeId)}
                style={styles.deleteButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <MaterialIcons name="close" size={n(16)} color={textColor + "40"} />
            </Pressable>
        </Pressable>
    );

    // Determine what to show
    const showSuggestions = query.length > 0 && suggestions.length > 0 && results.length === 0;
    const showResults = results.length > 0;
    const showHistory = query.length === 0 && history.length > 0 && results.length === 0;
    const showEmpty = !isSearching && query.length === 0 && history.length === 0 && results.length === 0;

    return (
        <ContentContainer headerTitle={t("search")} hideBackButton>
            <View style={styles.container}>
                {/* Search input with integrated button */}
                <View style={[styles.searchRow, { backgroundColor: inputBg }]}>
                    <TextInput
                        style={[styles.searchInput, { color: textColor }]}
                        placeholder={t("searchPlaceholder")}
                        placeholderTextColor={textColor + "50"}
                        value={query}
                        onChangeText={handleQueryChange}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {query.length > 0 && !isSearching && (
                        <Pressable
                            onPress={() => {
                                setQuery("");
                                setResults([]);
                                setSuggestions([]);
                                setError(null);
                            }}
                            style={styles.clearButton}
                        >
                            <MaterialIcons name="close" size={n(18)} color={textColor + "60"} />
                        </Pressable>
                    )}
                    <Pressable
                        onPress={handleSearch}
                        disabled={!query.trim() || isSearching}
                        style={[
                            styles.searchButton,
                            { backgroundColor: query.trim() ? textColor : textColor + "20" }
                        ]}
                    >
                        {isSearching ? (
                            <ActivityIndicator size="small" color={invertColors ? "#FFFFFF" : "#000000"} />
                        ) : (
                            <MaterialIcons
                                name="search"
                                size={n(20)}
                                color={invertColors ? "#FFFFFF" : "#000000"}
                            />
                        )}
                    </Pressable>
                </View>

                {/* Error message */}
                {error && (
                    <View style={styles.errorContainer}>
                        <StyledText style={styles.errorText}>{error}</StyledText>
                    </View>
                )}

                {/* Autocomplete suggestions */}
                {showSuggestions && (
                    <FlatList
                        data={suggestions}
                        renderItem={renderSuggestion}
                        keyExtractor={(item) => item.placeId}
                        style={styles.resultsList}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    />
                )}

                {/* Search results */}
                {showResults && (
                    <FlatList
                        data={results}
                        renderItem={renderResult}
                        keyExtractor={(item) => item.placeId}
                        style={styles.resultsList}
                        showsVerticalScrollIndicator={true}
                    />
                )}

                {/* History */}
                {showHistory && (
                    <View style={styles.historyContainer}>
                        <StyledText style={[styles.sectionTitle, { color: textColor + "60" }]}>
                            {t("recentSearches")}
                        </StyledText>
                        <FlatList
                            data={history}
                            renderItem={renderHistoryItem}
                            keyExtractor={(item) => item.placeId}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                )}

                {/* Empty state */}
                {showEmpty && (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="place" size={n(40)} color={textColor + "20"} />
                        <StyledText style={[styles.emptyText, { color: textColor + "50" }]}>
                            {t("searchEmpty")}
                        </StyledText>
                    </View>
                )}
            </View>
        </ContentContainer>
    );
}

// LPIII: 1080 × 1240 (aspect ratio ~0.87:1)
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: n(8),
        paddingLeft: n(12),
        paddingVertical: n(3),
    },
    searchInput: {
        flex: 1,
        fontSize: n(16),
        paddingVertical: n(8),
        fontFamily: "PublicSans",
    },
    clearButton: {
        padding: n(6),
    },
    searchButton: {
        padding: n(8),
        borderRadius: n(6),
        marginRight: n(4),
        marginVertical: n(3),
    },
    errorContainer: {
        marginTop: n(10),
        padding: n(8),
        backgroundColor: "#FF6B6B15",
        borderRadius: n(6),
    },
    errorText: {
        fontSize: n(13),
        color: "#FF6B6B",
        textAlign: "center",
    },
    resultsList: {
        marginTop: n(10),
        flex: 1,
    },
    resultItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: n(12),
        borderBottomWidth: 1,
    },
    itemIcon: {
        marginRight: n(12),
    },
    resultContent: {
        flex: 1,
        gap: n(2),
    },
    resultName: {
        fontSize: n(16),
    },
    resultAddress: {
        fontSize: n(14),
    },
    deleteButton: {
        padding: n(8),
    },
    historyContainer: {
        flex: 1,
        marginTop: n(16),
    },
    sectionTitle: {
        fontSize: n(13),
        fontWeight: "600",
        textTransform: "uppercase",
        marginBottom: n(8),
        letterSpacing: 1,
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: n(10),
    },
    emptyText: {
        fontSize: n(14),
        textAlign: "center",
        paddingHorizontal: n(20),
    },
});
