import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from '@/locales/en.json';
import esTranslations from '@/locales/es.json';
import frTranslations from '@/locales/fr.json';
import hiTranslations from '@/locales/hi.json';

i18n
    // Detect user language
    .use(LanguageDetector)
    // Pass the i18n instance to react-i18next
    .use(initReactI18next)
    // Initialize i18next
    .init({
        resources: {
            en: {
                translation: enTranslations,
            },
            es: {
                translation: esTranslations,
            },
            fr: {
                translation: frTranslations,
            },
            hi: {
                translation: hiTranslations,
            },
        },
        fallbackLng: 'en',
        debug: import.meta.env.DEV,

        interpolation: {
            escapeValue: false, // React already escapes by default
        },

        detection: {
            // Order of detection
            order: ['localStorage', 'navigator'],
            // Cache user language
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng',
        },
    });

export default i18n;
