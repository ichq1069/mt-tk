
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode, type FC } from 'react';
import { api } from '@/db/api';
import { KeywordReplacement } from '@/types';

interface KeywordReplacementContextType {
  replaceSystem: (text: string) => string;
  replaceUser: (text: string) => string;
  replacements: KeywordReplacement[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const KeywordReplacementContext = createContext<KeywordReplacementContextType | undefined>(undefined);

export const KeywordReplacementProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [replacements, setReplacements] = useState<KeywordReplacement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReplacements = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.getKeywordReplacements();
      if (data) {
        setReplacements(data.filter((r: any) => r.is_active));
      }
    } catch (e) {
      console.error('Failed to fetch replacements:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReplacements();
  }, [fetchReplacements]);

  const replaceSystem = useCallback((text: string) => {
    if (!text) return text;
    let result = text;
    replacements
      .filter(r => r.type === 'system')
      .forEach(rule => {
        const regex = new RegExp(rule.original_word, 'g');
        result = result.replace(regex, rule.replacement_word);
      });
    return result;
  }, [replacements]);

  const replaceUser = useCallback((text: string) => {
    if (!text) return text;
    let result = text;
    replacements
      .filter(r => r.type === 'user')
      .forEach(rule => {
        const regex = new RegExp(rule.original_word, 'g');
        result = result.replace(regex, rule.replacement_word);
      });
    return result;
  }, [replacements]);

  return (
    <KeywordReplacementContext.Provider value={{ replaceSystem, replaceUser, replacements, loading, refresh: fetchReplacements }}>
      {children}
    </KeywordReplacementContext.Provider>
  );
};

export const useKeywordReplacement = () => {
  const context = useContext(KeywordReplacementContext);
  if (context === undefined) {
    throw new Error('useKeywordReplacement must be used within a KeywordReplacementProvider');
  }
  return context;
};
