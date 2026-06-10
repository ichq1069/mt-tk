ALTER TABLE easter_egg_configs ADD COLUMN max_wins_per_user INTEGER DEFAULT 1;
COMMENT ON COLUMN easter_egg_configs.max_wins_per_user IS '每个用户最多可以中奖该彩蛋的次数';