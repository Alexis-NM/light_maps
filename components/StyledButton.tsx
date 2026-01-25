import React from "react";
import { StyleSheet } from "react-native";
import { StyledText } from "./StyledText";
import { HapticPressable } from "./HapticPressable";
import { n } from "@/utils/scaling";

interface ButtonProps {
    text: string;
    onPress?: () => void;
    underline?: boolean;
    disabled?: boolean;
}

export function StyledButton({ text, onPress, underline = false, disabled = false }: ButtonProps) {
    return (
        <HapticPressable
            style={[styles.button, disabled && styles.disabled]}
            onPress={disabled ? undefined : onPress}
        >
            <StyledText
                style={[styles.buttonText, underline && styles.underline, disabled && styles.disabledText]}
                numberOfLines={1}
            >
                {text}
            </StyledText>
        </HapticPressable>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "flex-start",
    },
    buttonText: {
        fontSize: n(30),
    },
    underline: {
        textDecorationLine: "underline",
    },
    disabled: {
        opacity: 0.4,
    },
    disabledText: {
        opacity: 0.6,
    },
});
