import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translations
import en from './locales/en.json'
import es from './locales/es.json'
import th from './locales/th.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'
import pt from './locales/pt.json'

export const languages = {
  en: 'English',
  es: 'Español',
  th: 'ไทย',
  ja: '日本語',
  ko: '한국어',
  pt: 'Português'
}

const resources = {
  en: { translation: en },
  es: { translation: es },
  th: { translation: th },
  ja: { translation: ja },
  ko: { translation: ko },
  pt: { translation: pt }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false // React already does escaping
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
    }
  })

export default i18n 