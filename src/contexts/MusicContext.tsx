import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode, type FC } from 'react';
import { useConfig } from './ConfigContext';
import { toast } from 'sonner';

interface MusicItem {
  id: string;
  title: string;
  url: string;
  artist?: string;
}

interface MusicContextType {
  isMusicPlaying: boolean;
  setIsMusicPlaying: (playing: boolean) => void;
  currentMusicIndex: number;
  setCurrentMusicIndex: (index: number) => void;
  nextMusic: () => void;
  prevMusic: () => void;
  currentMusic: MusicItem | null;
  musicList: MusicItem[];
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { config } = useConfig();
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [currentMusicIndex, setCurrentMusicIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const musicList = (config?.bg_music_list || []) as MusicItem[];
  const currentMusic = musicList[currentMusicIndex] || null;

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = () => {
        nextMusic();
      };
      audioRef.current.onerror = () => {
        const error = audioRef.current?.error;
        const src = audioRef.current?.src;
        console.warn('[Music] 加载失败:', {
          src,
          code: error?.code,
          message: error?.message
        });
        
        // 如果播放列表中有多个，则尝试下一首
        if (musicList.length > 1) {
          nextMusic();
        } else {
          setIsMusicPlaying(false);
          // 只有在用户主动尝试播放时才报错，避免页面加载时静默报错干扰
          if (audioRef.current?.src) {
            toast.error('背景音乐加载失败，请检查链接是否有效', {
              description: src?.substring(0, 50) + '...'
            });
          }
        }
      };
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 优化背景音乐与视频播放声音冲突问题
  useEffect(() => {
    const handleOtherPlay = (e: Event) => {
      // 如果播放的不是背景音乐本身，则暂停背景音乐
      if (e.target instanceof HTMLVideoElement || (e.target instanceof HTMLAudioElement && e.target !== audioRef.current)) {
        if (isMusicPlaying) {
          setIsMusicPlaying(false);
          // 可以选择记录状态，以便视频结束后恢复，但通常暂停即可
        }
      }
    };

    // 捕获阶段监听 play 事件，因为某些事件可能不冒泡
    document.addEventListener('play', handleOtherPlay, true);
    return () => {
      document.removeEventListener('play', handleOtherPlay, true);
    };
  }, [isMusicPlaying]);

  // Handle music changes
  useEffect(() => {
    if (!audioRef.current || !currentMusic?.url) return;

    if (audioRef.current.src !== currentMusic.url) {
      audioRef.current.src = currentMusic.url;
      if (isMusicPlaying) {
        audioRef.current.play().catch(err => {
          console.warn('[Music] Playback failed:', err);
          setIsMusicPlaying(false);
        });
      }
    }
  }, [currentMusic?.url]);

  // Handle play/pause
  useEffect(() => {
    if (!audioRef.current) return;

    if (isMusicPlaying) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch(err => {
          console.warn('[Music] Playback failed:', err);
          setIsMusicPlaying(false);
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isMusicPlaying]);

  // Handle volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = config?.bg_music_volume ?? 0.5;
    }
  }, [config?.bg_music_volume]);

  const nextMusic = useCallback(() => {
    if (musicList.length <= 1) return;
    
    let nextIndex;
    if (config?.bg_music_play_mode === 'random') {
      nextIndex = Math.floor(Math.random() * musicList.length);
      if (nextIndex === currentMusicIndex) nextIndex = (currentMusicIndex + 1) % musicList.length;
    } else {
      nextIndex = (currentMusicIndex + 1) % musicList.length;
    }
    setCurrentMusicIndex(nextIndex);
  }, [musicList, config?.bg_music_play_mode, currentMusicIndex]);

  const prevMusic = useCallback(() => {
    if (musicList.length <= 1) return;
    const nextIndex = (currentMusicIndex - 1 + musicList.length) % musicList.length;
    setCurrentMusicIndex(nextIndex);
  }, [musicList, currentMusicIndex]);

  return (
    <MusicContext.Provider value={{
      isMusicPlaying,
      setIsMusicPlaying,
      currentMusicIndex,
      setCurrentMusicIndex,
      nextMusic,
      prevMusic,
      currentMusic,
      musicList
    }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};
