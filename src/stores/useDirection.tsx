import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useTranslation } from "react-i18next";

type Dir = "rtl" | "ltr";

interface DirectionContextType {
  dir: Dir;
  toggleDir: () => void;
}

const DirectionContext = createContext<DirectionContextType>({
  dir: "rtl",
  toggleDir: () => {},
});

export function DirectionProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [dir, setDir] = useState<Dir>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("zenith-dir") as Dir) || "rtl";
    }
    return "rtl";
  });

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = dir === "rtl" ? "ar" : "en";
    localStorage.setItem("zenith-dir", dir);
    
    // Sync i18next
    const newLang = dir === "rtl" ? "ar" : "en";
    if (i18n.language !== newLang) {
      i18n.changeLanguage(newLang);
    }
  }, [dir, i18n]);

  const toggleDir = useCallback(() => {
    setDir((d) => (d === "rtl" ? "ltr" : "rtl"));
  }, []);

  return (
    <DirectionContext.Provider value={{ dir, toggleDir }}>
      {children}
    </DirectionContext.Provider>
  );
}

export function useDirection() {
  return useContext(DirectionContext);
}
