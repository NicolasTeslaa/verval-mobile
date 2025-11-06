import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n, { type LanguageDetectorAsyncModule, type Resource } from "i18next";
import { initReactI18next } from "react-i18next";

const STORAGE_KEY = "i18n:lang";

// 🔹 Registre também o namespace "settings"
const resources = {
  pt: {
    common: require("./pt/common.json"),
    auth: require("./pt/auth.json"),
    index: require("./pt/index.json"),
    lanc: require("./pt/lancamento.json"),
    settings: require("./pt/settings.json"),
  },
  en: {
    common: require("./en/common.json"),
    auth: require("./en/auth.json"),
    index: require("./en/index.json"),
    lanc: require("./en/lancamento.json"),
    settings: require("./en/settings.json"),
  },
} satisfies Resource;

// 🔹 Normaliza "pt-BR"→"pt", "en-US"→"en"
function normalize(lng: string | undefined): "pt" | "en" {
  const tag = (lng || "").toLowerCase();
  if (tag.startsWith("pt")) return "pt";
  return "en";
}

const languageDetector: LanguageDetectorAsyncModule = {
  type: "languageDetector",
  async: true,
  detect: (cb) => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          cb?.(normalize(saved));
          return;
        }
      } catch {}
      const sysTag = Localization.getLocales?.()[0]?.languageTag || "pt-BR";
      cb?.(normalize(sysTag));
    })();
  },
  init: () => {},
  cacheUserLanguage: async (lng) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, normalize(lng));
    } catch {}
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "pt",
    ns: ["common", "auth", "index", "lanc", "settings"], // 🔹 inclui "settings"
    defaultNS: "common",
    interpolation: { escapeValue: false },
    compatibilityJSON: "v4",
  });

export default i18n;

export async function setLanguage(lng: string) {
  const n = normalize(lng);
  await i18n.changeLanguage(n);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, n);
  } catch {}
}
