import { useEffect } from "react";
import { StyleSheet, View, Alert, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StyledButton } from "@/components/StyledButton";
import ContentContainer from "@/components/ContentContainer";
import { SelectorButton } from "@/components/SelectorButton";
import { Separator } from "@/components/Separator";
import { StyledText } from "@/components/StyledText";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { useMap } from "@/contexts/MapContext";
import { useApiKey } from "@/contexts/ApiKeyContext";
import { n } from "@/utils/scaling";
import { t } from "@/i18n";

export default function SettingsScreen() {
    const params = useLocalSearchParams<{ confirmed?: string; action?: string }>();
    const { invertColors } = useInvertColors();
    const { savedPlaces, clearAllPlaces, locationEnabled, setLocationEnabled } = useMap();
    const { hasKey, deleteApiKey } = useApiKey();

    const textColor = invertColors ? "#000000" : "#FFFFFF";

    useEffect(() => {
        if (params.confirmed === "true") {
            router.setParams({ confirmed: undefined, action: undefined });
            if (params.action === "clearSavedPlaces") {
                clearAllPlaces();
                Alert.alert(t("cleared"), t("clearedMessage"));
            } else if (params.action === "deleteApiKey") {
                deleteApiKey();
            }
        }
    }, [params.confirmed, params.action, clearAllPlaces, deleteApiKey]);

    const handleClearSavedPlaces = () => {
        if (savedPlaces.length === 0) {
            Alert.alert(t("noPlacesToClear"), t("noPlacesToClearMessage"));
            return;
        }
        router.push({
            pathname: "/confirm",
            params: {
                title: t("clearSavedPlacesTitle"),
                message: t("clearSavedPlacesMessage"),
                confirmText: t("clearAll"),
                action: "clearSavedPlaces",
                returnPath: "/(tabs)/settings",
            },
        });
    };

    const handleLocationToggle = (value: boolean) => {
        setLocationEnabled(value);
    };

    return (
        <ContentContainer headerTitle={t("settings")} hideBackButton style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={true}>
                {/* Appearance */}
                <View style={styles.section}>
                    <StyledText style={[styles.sectionTitle, { color: textColor + "80" }]}>
                        {t("appearance")}
                    </StyledText>
                    <SelectorButton
                        label={t("theme")}
                        value={invertColors ? t("light") : t("dark")}
                        href="/settings/customise-interface"
                    />
                </View>

                <Separator />

                {/* Location */}
                <View style={styles.section}>
                    <StyledText style={[styles.sectionTitle, { color: textColor + "80" }]}>
                        {t("location")}
                    </StyledText>
                    <ToggleSwitch
                        label={t("enableLocation")}
                        value={locationEnabled}
                        onValueChange={handleLocationToggle}
                    />
                </View>

                <Separator />

                {/* API Key */}
                <View style={styles.section}>
                    <StyledText style={[styles.sectionTitle, { color: textColor + "80" }]}>
                        {t("apiKey")}
                    </StyledText>
                    {hasKey && (
                        <View style={styles.apiKeyStatus}>
                            <MaterialIcons name="check-circle" size={n(16)} color="#34A853" />
                            <StyledText style={[styles.apiKeyText, { color: textColor }]}>
                                {t("apiKeyConfigured")}
                            </StyledText>
                        </View>
                    )}
                    <View style={styles.apiKeyButtons}>
                        <StyledButton
                            text={t("modifyApiKey")}
                            onPress={() => router.push("/setup-api-key")}
                            underline={true}
                        />
                        {hasKey && (
                            <StyledButton
                                text={t("deleteApiKey")}
                                onPress={() => {
                                    router.push({
                                        pathname: "/confirm",
                                        params: {
                                            title: t("deleteApiKeyTitle"),
                                            message: t("deleteApiKeyConfirm"),
                                            confirmText: t("delete"),
                                            action: "deleteApiKey",
                                            returnPath: "/(tabs)/settings",
                                        },
                                    });
                                }}
                                underline={true}
                            />
                        )}
                    </View>
                </View>

                <Separator />

                {/* Data */}
                <View style={styles.section}>
                    <StyledText style={[styles.sectionTitle, { color: textColor + "80" }]}>
                        {t("data")}
                    </StyledText>
                    <StyledButton
                        text={`${t("clearSavedPlaces")} (${savedPlaces.length})`}
                        onPress={handleClearSavedPlaces}
                        underline={true}
                    />
                </View>

                <Separator />

                {/* About */}
                <View style={styles.section}>
                    <StyledText style={[styles.sectionTitle, { color: textColor + "80" }]}>
                        {t("about")}
                    </StyledText>
                    <View style={styles.aboutInfo}>
                        <StyledText style={[styles.aboutText, { color: textColor }]}>
                            {t("version")}
                        </StyledText>
                        <StyledText style={[styles.aboutSubtext, { color: textColor + "60" }]}>
                            {t("description")}
                        </StyledText>
                    </View>
                </View>
            </ScrollView>
        </ContentContainer>
    );
}

// LPIII: 1080 × 1240 (aspect ratio ~0.87:1)
const styles = StyleSheet.create({
    container: {
        paddingHorizontal: n(12),
    },
    section: {
        marginVertical: n(14),
    },
    sectionTitle: {
        fontSize: n(13),
        fontWeight: "600",
        textTransform: "uppercase",
        marginBottom: n(10),
        letterSpacing: 1,
    },
    aboutInfo: {
        paddingVertical: n(6),
    },
    aboutText: {
        fontSize: n(18),
        fontWeight: "500",
    },
    aboutSubtext: {
        fontSize: n(14),
        marginTop: n(3),
        lineHeight: n(20),
    },
    apiKeyStatus: {
        flexDirection: "row",
        alignItems: "center",
        gap: n(6),
        marginBottom: n(10),
    },
    apiKeyText: {
        fontSize: n(14),
    },
    apiKeyButtons: {
        gap: n(8),
    },
});
