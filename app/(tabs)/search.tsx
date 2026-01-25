import React, { useState, useCallback } from "react";
import { View, StyleSheet, TextInput, FlatList, Pressable, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import ContentContainer from "@/components/ContentContainer";
import { StyledText } from "@/components/StyledText";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { useHaptic } from "@/contexts/HapticContext";
import { useMap, SearchResult } from "@/contexts/MapContext";
import { useApiKey } from "@/contexts/ApiKeyContext";
import { n } from "@/utils/scaling";
import { t } from "@/i18n";

export default function SearchScreen() {
    const router = useRouter();
    const { invertColors } = useInvertColors();
    const { triggerHaptic } = useHaptic();
    const { setMapCenter, webViewRef, selectLocation } = useMap();
    const { apiKey } = useApiKey();

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const textColor = invertColors ? "#000000" : "#FFFFFF";
    const inputBg = invertColors ? "#F0F0F0" : "#1A1A1A";
    const borderColor = invertColors ? "#E0E0E0" : "#333333";

    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;

        setIsSearching(true);
        setError(null);

        try {
            const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;

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
    }, [query, apiKey]);

    const handleSelectResult = (result: SearchResult) => {
        triggerHaptic();
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

    const renderResult = ({ item }: { item: SearchResult }) => (
        <Pressable
            style={[styles.resultItem, { borderBottomColor: borderColor }]}
            onPress={() => handleSelectResult(item)}
        >
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
                        onChangeText={setQuery}
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

                {/* Results list */}
                {results.length > 0 && (
                    <FlatList
                        data={results}
                        renderItem={renderResult}
                        keyExtractor={(item) => item.placeId}
                        style={styles.resultsList}
                        showsVerticalScrollIndicator={true}
                    />
                )}

                {/* Empty state */}
                {!isSearching && results.length === 0 && !error && (
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
        paddingVertical: n(12),
        borderBottomWidth: 1,
    },
    resultContent: {
        gap: n(2),
    },
    resultName: {
        fontSize: n(16),
    },
    resultAddress: {
        fontSize: n(14),
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
