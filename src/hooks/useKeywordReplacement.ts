
import { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { KeywordReplacement } from '@/types';

export function useKeywordReplacement() {
  const [replacements, setReplacements] = useState<KeywordReplacement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await api.getKeywordReplacements();
      if (data) {
        setReplacements(data.filter((r: any) => r.is_active));
      }
      setLoading(false);
    }
    fetch();
  }, []);

  const replaceSystem = (text: string) => {
    if (!text) return text;
    let result = text;
    replacements
      .filter(r => r.type === 'system')
      .forEach(rule => {
        const regex = new RegExp(rule.original_word, 'g');
        result = result.replace(regex, rule.replacement_word);
      });
    return result;
  };

  const replaceUser = (text: string) => {
    if (!text) return text;
    let result = text;
    replacements
      .filter(r => r.type === 'user')
      .forEach(rule => {
        const regex = new RegExp(rule.original_word, 'g');
        result = result.replace(regex, rule.replacement_word);
      });
    return result;
  };

  return { replaceSystem, replaceUser, loading, replacements };
}
