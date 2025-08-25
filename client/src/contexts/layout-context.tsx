import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type LayoutType = 'sidebar' | 'topnav';

interface LayoutContextType {
  layoutType: LayoutType;
  setLayoutType: (type: LayoutType) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}

interface LayoutProviderProps {
  children: ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const [layoutType, setLayoutType] = useState<LayoutType>(() => {
    const saved = localStorage.getItem('stacklens-layout-type');
    return (saved as LayoutType) || 'topnav';
  });

  useEffect(() => {
    localStorage.setItem('stacklens-layout-type', layoutType);
  }, [layoutType]);

  return (
    <LayoutContext.Provider value={{ layoutType, setLayoutType }}>
      {children}
    </LayoutContext.Provider>
  );
}