import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type RefObject,
  type ReactNode,
} from 'react';

interface AnalysisContextValue {
  analysisOpen: boolean;
  analysisLoading: boolean;
  analysisError: string;
  analysisResult: string;
  analysisHasData: boolean;
  setAnalysisOpen: (open: boolean) => void;
  setAnalysisLoading: (loading: boolean) => void;
  setAnalysisError: (error: string) => void;
  setAnalysisResult: (result: string) => void;
  toggleAnalysis: () => void;
  closeAnalysis: () => void;
  abortAnalysis: () => void;
  analysisAbortRef: RefObject<AbortController | null>;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

interface AnalysisProviderProps {
  children: ReactNode;
  analysisHasData: boolean;
}

export function AnalysisContextProvider({
  children,
  analysisHasData,
}: AnalysisProviderProps) {
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const analysisAbortRef = useRef<AbortController | null>(null);

  const toggleAnalysis = useCallback(() => {
    setAnalysisOpen((prev) => !prev);
  }, []);

  const closeAnalysis = useCallback(() => {
    setAnalysisOpen(false);
  }, []);

  const abortAnalysis = useCallback(() => {
    analysisAbortRef.current?.abort();
    analysisAbortRef.current = null;
    setAnalysisLoading(false);
  }, []);

  return (
    <AnalysisContext.Provider
      value={{
        analysisOpen,
        analysisLoading,
        analysisError,
        analysisResult,
        analysisHasData,
        setAnalysisOpen,
        setAnalysisLoading,
        setAnalysisError,
        setAnalysisResult,
        toggleAnalysis,
        closeAnalysis,
        abortAnalysis,
        analysisAbortRef,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysisContext(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext);
  if (!ctx) {
    throw new Error(
      'useAnalysisContext must be used inside AnalysisContextProvider',
    );
  }
  return ctx;
}
