import { createContext, useContext } from "react";
import * as Localization from "expo-localization";
import { translations, Language, TranslationKey } from "./translations";

// Get device language, fallback to English
function getDeviceLanguage(): Language {
    const locale = Localization.getLocales()[0];
    const langCode = locale?.languageCode?.toLowerCase() || "en";

    // Check if we support this language
    if (langCode in translations) {
        return langCode as Language;
    }

    // Fallback to English
    return "en";
}

export const deviceLanguage = getDeviceLanguage();

// Simple translation function
export function t(key: TranslationKey): string {
    return translations[deviceLanguage][key] || translations.en[key] || key;
}

// Get all translations for current language
export function getTranslations() {
    return translations[deviceLanguage];
}

// Export for use in components
export { translations, Language, TranslationKey };
