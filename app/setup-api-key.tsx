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

export default function SetupApiKeyScreen() {
    const router = useRouter();
    const { invertColors } = useInvertColors();
    const { setApiKey, hasKey } = useApiKey();
    const [inputKey, setInputKey] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const textColor = invertColors ? "#000000" : "#FFFFFF";
    const inputBg = invertColors ? "#F0F0F0" : "#1A1A1A";
    const borderColor = invertColors ? "#E0E0E0" : "#333333";

    const validateApiKey = (key: string): boolean => {
        // Google API keys start with "AIza" and are 39 characters
        return key.startsWith("AIza") && key.length >= 39;
    };

    const handleSave = async () => {
        const trimmedKey = inputKey.trim();

        if (!validateApiKey(trimmedKey)) {
            Alert.alert(t("error"), t("invalidApiKey"));
            return;
        }

        setIsLoading(true);
        try {
            await setApiKey(trimmedKey);
            if (hasKey) {
                // Editing existing key, go back
                router.back();
            } else {
                // First time setup, go to main app
                router.replace("/(tabs)");
            }
        } catch {
            Alert.alert(t("error"), "Failed to save API key");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ContentContainer
            headerTitle={t("setupApiKey")}
            hideBackButton={!hasKey}
        >
            <View style={styles.container}>
                <StyledText style={[styles.description, { color: textColor + "80" }]}>
                    {t("enterApiKey")}
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
                    placeholder={t("apiKeyPlaceholder")}
                    placeholderTextColor={textColor + "50"}
                    value={inputKey}
                    onChangeText={setInputKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    secureTextEntry={false}
                />

                <View style={styles.buttonContainer}>
                    <StyledButton
                        text={isLoading ? t("loading") : t("saveApiKey")}
                        onPress={handleSave}
                        disabled={!inputKey.trim() || isLoading}
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
        marginBottom: n(16),
        lineHeight: n(20),
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
