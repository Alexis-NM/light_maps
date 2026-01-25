import React from "react";
import { View, StyleSheet, FlatList, Pressable, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import ContentContainer from "@/components/ContentContainer";
import { StyledText } from "@/components/StyledText";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { useHaptic } from "@/contexts/HapticContext";
import { useMap, SavedPlace } from "@/contexts/MapContext";
import { n } from "@/utils/scaling";
import { t } from "@/i18n";

export default function SavedScreen() {
    const router = useRouter();
    const { invertColors } = useInvertColors();
    const { triggerHaptic } = useHaptic();
    const { savedPlaces, removePlace, setMapCenter, webViewRef, selectLocation } = useMap();

    const textColor = invertColors ? "#000000" : "#FFFFFF";
    const borderColor = invertColors ? "#E0E0E0" : "#333333";

    const handleSelectPlace = (place: SavedPlace) => {
        triggerHaptic();

        // Navigate to map and center on selected location
        setMapCenter({ latitude: place.latitude, longitude: place.longitude }, 16);
        selectLocation(
            { latitude: place.latitude, longitude: place.longitude },
            place.address
        );

        // Update map WebView
        webViewRef.current?.injectJavaScript(
            `goToPlace(${place.latitude}, ${place.longitude}, "${place.name.replace(/"/g, '\\"')}"); true;`
        );

        // Navigate to map tab
        router.push("/(tabs)");
    };

    const handleDeletePlace = (place: SavedPlace) => {
        triggerHaptic();
        Alert.alert(
            t("deletePlaceTitle"),
            t("deletePlaceMessage"),
            [
                { text: t("cancel"), style: "cancel" },
                {
                    text: t("delete"),
                    style: "destructive",
                    onPress: () => removePlace(place.id),
                },
            ]
        );
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const renderPlace = ({ item }: { item: SavedPlace }) => (
        <Pressable
            style={[styles.placeItem, { borderBottomColor: borderColor }]}
            onPress={() => handleSelectPlace(item)}
            onLongPress={() => handleDeletePlace(item)}
        >
            <View style={styles.placeIcon}>
                <MaterialIcons name="bookmark" size={n(18)} color={textColor} />
            </View>
            <View style={styles.placeContent}>
                <StyledText style={styles.placeName} numberOfLines={1}>
                    {item.name}
                </StyledText>
                <StyledText style={styles.placeAddress} numberOfLines={2}>
                    {item.address}
                </StyledText>
                <StyledText style={styles.placeDate}>
                    {t("savedOn")} {formatDate(item.createdAt)}
                </StyledText>
            </View>
            <Pressable
                onPress={() => handleDeletePlace(item)}
                style={styles.deleteButton}
                hitSlop={n(8)}
            >
                <MaterialIcons name="delete-outline" size={n(18)} color={textColor + "60"} />
            </Pressable>
        </Pressable>
    );

    return (
        <ContentContainer headerTitle={t("savedPlaces")} hideBackButton>
            <View style={styles.container}>
                {savedPlaces.length > 0 ? (
                    <FlatList
                        data={savedPlaces}
                        renderItem={renderPlace}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                    />
                ) : (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="bookmark-border" size={n(48)} color={textColor + "30"} />
                        <StyledText style={[styles.emptyTitle, { color: textColor }]}>
                            {t("noSavedPlaces")}
                        </StyledText>
                        <StyledText style={[styles.emptyText, { color: textColor + "60" }]}>
                            {t("noSavedPlacesDesc")}
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
    listContent: {
        paddingHorizontal: n(12),
    },
    placeItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: n(12),
        borderBottomWidth: 1,
    },
    placeIcon: {
        width: n(36),
        height: n(36),
        borderRadius: n(18),
        backgroundColor: "rgba(128, 128, 128, 0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    placeContent: {
        flex: 1,
        marginLeft: n(10),
        marginRight: n(6),
    },
    placeName: {
        fontSize: n(16),
        fontWeight: "500",
    },
    placeAddress: {
        fontSize: n(14),
        opacity: 0.6,
        marginTop: n(2),
    },
    placeDate: {
        fontSize: n(12),
        opacity: 0.4,
        marginTop: n(3),
    },
    deleteButton: {
        padding: n(6),
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: n(24),
        paddingBottom: n(80),
    },
    emptyTitle: {
        fontSize: n(20),
        fontWeight: "600",
        marginTop: n(12),
    },
    emptyText: {
        fontSize: n(16),
        textAlign: "center",
        marginTop: n(6),
        lineHeight: n(22),
    },
});
