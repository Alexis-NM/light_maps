import React, { useState } from "react";
import { View, StyleSheet, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import ContentContainer from "@/components/ContentContainer";
import { StyledText } from "@/components/StyledText";
import { StyledButton } from "@/components/StyledButton";
import { useInvertColors } from "@/contexts/InvertColorsContext";
import { useApiKey } from "@/contexts/ApiKeyContext";
import { n } from "@/utils/scaling";
import { t } from "@/i18n";

export default function SetupMapIdScreen() {
    const router = useRouter();
    const { invertColors } = useInvertColors();
    const { setMapId } = useApiKey();
    const [inputId, setInputId] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const textColor = invertColors ? "#000000" : "#FFFFFF";
    const inputBg = invertColors ? "#F0F0F0" : "#1A1A1A";
    const borderColor = invertColors ? "#E0E0E0" : "#333333";

    const handleSave = async () => {
        const trimmedId = inputId.trim();

        if (!trimmedId) {
            return;
        }

        setIsLoading(true);
        try {
            await setMapId(trimmedId);
            router.back();
        } catch {
            Alert.alert(t("error"), "Failed to save Map ID");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ContentContainer headerTitle={t("mapId")}>
            <View style={styles.container}>
                <StyledText style={[styles.description, { color: textColor + "80" }]}>
                    {t("mapIdDescription")}
                </StyledText>

                <StyledText style={[styles.help, { color: textColor + "60" }]}>
                    {t("mapIdHelp")}
                </StyledText>

                <TextInput
                    style={[
                        styles.input,
                        {
                            color: textColor,
                            backgroundColor: inputBg,
                            borderColor: borderColor,
                        },
                    ]}
                    placeholder={t("mapIdPlaceholder")}
                    placeholderTextColor={textColor + "50"}
                    value={inputId}
                    onChangeText={setInputId}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                />

                <View style={styles.buttonContainer}>
                    <StyledButton
                        text={isLoading ? t("loading") : t("saveApiKey")}
                        onPress={handleSave}
                        disabled={!inputId.trim() || isLoading}
                        underline={true}
                    />
                </View>
            </View>
        </ContentContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: n(12),
    },
    description: {
        fontSize: n(14),
        marginBottom: n(8),
        lineHeight: n(20),
    },
    help: {
        fontSize: n(12),
        marginBottom: n(16),
        lineHeight: n(18),
    },
    input: {
        fontSize: n(16),
        paddingVertical: n(12),
        paddingHorizontal: n(14),
        borderRadius: n(8),
        borderWidth: 1,
        fontFamily: "PublicSans",
    },
    buttonContainer: {
        marginTop: n(24),
        alignItems: "center",
    },
});
