import { createContext, useContext, useState, ReactNode } from 'react';
import { ViewType } from '../types/navigation.types';

interface AppContextType {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentView, setCurrentView] = useState<ViewType>('inicio');

  return (
    <AppContext.Provider value={{ currentView, setCurrentView }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp debe usarse dentro de AppProvider');
  return context;
};