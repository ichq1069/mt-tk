import React, { useEffect, useRef } from 'react';
import Player from 'xgplayer';
import 'xgplayer/dist/index.min.css';

interface XGPlayerProps {
  config: any;
  className?: string;
  getInstance?: (player: Player) => void;
}

export default function XGPlayer({ config, className, getInstance, ...rest }: XGPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<Player | null>(null);

  useEffect(() => {
    if (!playerRef.current) return;

    // 过滤掉 undefined 的配置，防止播放器校验报错
    const sanitizedConfig = { ...config };
    Object.keys(sanitizedConfig).forEach(key => {
      if (sanitizedConfig[key] === undefined) {
        delete sanitizedConfig[key];
      }
    });

    const player = new Player({
      el: playerRef.current,
      ...sanitizedConfig,
    });

    playerInstanceRef.current = player;

    if (getInstance && typeof getInstance === 'function') {
      getInstance(player);
    }

    return () => {
      if (player && player.destroy) {
        player.destroy();
      }
    };
  }, []);

  // 响应 autoplay 变化
  useEffect(() => {
    if (playerInstanceRef.current) {
      if (config.autoplay) {
        playerInstanceRef.current.play();
      } else {
        playerInstanceRef.current.pause();
      }
    }
  }, [config.autoplay]);
  // 响应 muted 变化
  useEffect(() => {
    if (playerInstanceRef.current) {
      playerInstanceRef.current.muted = !!config.muted;
    }
  }, [config.muted]);


  return <div ref={playerRef} className={className} {...rest}></div>;
}
