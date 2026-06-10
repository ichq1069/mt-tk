import { createContext, useContext, useState, useCallback, useRef, type ReactNode, type FC } from 'react';

interface ViewState {
  data: any;
  scrollPos: number;
  timestamp: number;
  extra?: Record<string, any>;
}

interface ViewStateContextType {
  saveViewState: (key: string, state: Omit<ViewState, 'timestamp'>) => void;
  getViewState: (key: string) => ViewState | null;
  clearViewState: (key: string) => void;
  homeScrollTop: number;
  setHomeScrollTop: (top: number) => void;
}

const ViewStateContext = createContext<ViewStateContextType | undefined>(undefined);

export const ViewStateProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const states = useRef<Record<string, ViewState>>({});
  const [homeScrollTop, setHomeScrollTop] = useState(0);

  const saveViewState = useCallback((key: string, state: Omit<ViewState, 'timestamp'>) => {
    states.current[key] = {
      ...state,
      timestamp: Date.now()
    };
  }, []);

  const getViewState = useCallback((key: string) => {
    const state = states.current[key];
    if (!state) return null;

    // 数据有效期 30 分钟，内存缓存足够了
    if (Date.now() - state.timestamp > 30 * 60 * 1000) {
      delete states.current[key];
      return null;
    }

    return state;
  }, []);

  const clearViewState = useCallback((key: string) => {
    delete states.current[key];
  }, []);

  return (
    <ViewStateContext.Provider value={{ saveViewState, getViewState, clearViewState, homeScrollTop, setHomeScrollTop }}>
      {children}
    </ViewStateContext.Provider>
  );
};

export const useViewState = () => {
  const context = useContext(ViewStateContext);
  if (context === undefined) {
    throw new Error('useViewState must be used within a ViewStateProvider');
  }
  return context;
};
