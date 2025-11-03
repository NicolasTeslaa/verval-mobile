import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n, { type LanguageDetectorAsyncModule, type Resource } from "i18next";
import { initReactI18next } from "react-i18next";

const STORAGE_KEY = "i18n:lang";

// tipa o resources de forma explícita
const resources = {
  pt: {
    common: require("./pt/common.json"),
    auth: require("./pt/auth.json"),
    index: require("./pt/index.json"),
  },
  en: {
    common: require("./en/common.json"),
    auth: require("./en/auth.json"),
    index: require("./en/index.json"),
  },
} satisfies Resource;

// detector assíncrono tipado
const languageDetector: LanguageDetectorAsyncModule = {
  type: "languageDetector",
  async: true,
  detect: (cb) => {
    // não retornar Promise aqui!
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          cb?.(saved);
          return;
        }
      } catch {}
      const sys = Localization.getLocales?.()[0]?.languageTag || "pt-BR";
      cb?.(sys);
    })();
  },
  init: () => {},
  cacheUserLanguage: async (lng) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lng);
    } catch {}
  },
};


i18n
  .use(languageDetector) // se quiser “desestressar” a tipagem: .use(languageDetector as any)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "pt",
    ns: ["common", "auth", "index"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    // i18next 23+ usa "v4"; pode remover esta linha também
    compatibilityJSON: "v4",
  });

export default i18n;

export async function setLanguage(lng: string) {
  await i18n.changeLanguage(lng);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lng);
  } catch {}
}
