
import React from 'react';
import { useKeywordReplacement } from '@/contexts/KeywordReplacementContext';

interface SystemTextProps {
  children: string;
}

export const SystemText: React.FC<SystemTextProps> = ({ children }) => {
  const { replaceSystem } = useKeywordReplacement();
  return <>{replaceSystem(children)}</>;
};

export const UserText: React.FC<SystemTextProps> = ({ children }) => {
  const { replaceUser } = useKeywordReplacement();
  return <>{replaceUser(children)}</>;
};
