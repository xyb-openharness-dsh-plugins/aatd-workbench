/* AATD 0003 · 试验收藏与跟踪落库（INSPECTOR E8 收尾）
 *
 * 只增不改：新增表不碰 0001/0002。收藏只存本机 {trial_key, saved_on, state}，
 * state 三态：'following'（在跟）/ 'to_ask'（准备问）/ 'archived'（已归档）——不画进度、不判读。
 * UNIQUE(profile_key, trial_key)：同一条登记只收藏一次，重复收藏=改 state。
 */
CREATE TABLE saved_trials (
  id INTEGER PRIMARY KEY,
  profile_key TEXT NOT NULL,
  trial_key TEXT NOT NULL,
  saved_on TEXT,
  state TEXT DEFAULT 'following',
  in_use INTEGER DEFAULT 1,
  created_at TEXT,
  UNIQUE(profile_key, trial_key)
);
CREATE INDEX idx_saved_trials_profile ON saved_trials (profile_key, in_use);
