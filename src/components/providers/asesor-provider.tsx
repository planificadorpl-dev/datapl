"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type AsesorContextType = {
  currentAsesor: string;
  setCurrentAsesor: (asesor: string) => void;
  isAdminAuthenticated: boolean;
  setIsAdminAuthenticated: (auth: boolean) => void;
};

const AsesorContext = createContext<AsesorContextType>({
  currentAsesor: "",
  setCurrentAsesor: () => {},
  isAdminAuthenticated: false,
  setIsAdminAuthenticated: () => {},
});

export function AsesorProvider({ children }: { children: React.ReactNode }) {
  const [currentAsesor, setCurrentAsesorState] = useState("");
  const [isAdminAuthenticated, setIsAdminAuthenticatedState] = useState(false);

  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem("current_asesor");
    if (stored) {
      setCurrentAsesorState(stored);
    }
    
    // Admin auth uses session storage to expire when browser closes, or localStorage. We'll use localStorage for now
    const adminAuth = localStorage.getItem("admin_auth");
    if (adminAuth === "true") {
      setIsAdminAuthenticatedState(true);
    }
  }, []);

  const setCurrentAsesor = (asesor: string) => {
    setCurrentAsesorState(asesor);
    localStorage.setItem("current_asesor", asesor);
  };

  const setIsAdminAuthenticated = (auth: boolean) => {
    setIsAdminAuthenticatedState(auth);
    if (auth) {
      localStorage.setItem("admin_auth", "true");
    } else {
      localStorage.removeItem("admin_auth");
    }
  };

  return (
    <AsesorContext.Provider value={{ currentAsesor, setCurrentAsesor, isAdminAuthenticated, setIsAdminAuthenticated }}>
      {children}
    </AsesorContext.Provider>
  );
}

export const useAsesor = () => useContext(AsesorContext);
