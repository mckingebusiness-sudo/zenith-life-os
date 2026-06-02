import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

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
  const [dir, setDir] = useState<Dir>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("zenith-dir") as Dir) || "rtl";
    }
    return "rtl";
  });

  useEffect(() => {
    document.documentElement.dir = dir;
    localStorage.setItem("zenith-dir", dir);
  }, [dir]);

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
