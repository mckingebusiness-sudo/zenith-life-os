-- 1. Alter habits table
ALTER TABLE habits
ADD COLUMN motivational_message text,
ADD COLUMN auto_complete_rule text;

-- 2. Create daily_moods table
CREATE TABLE daily_moods (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date_local date NOT NULL,
    mood_score integer CHECK (mood_score >= 1 AND mood_score <= 5) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(user_id, date_local)
);

-- 3. Create habit_rewards table
CREATE TABLE habit_rewards (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    habit_id uuid REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    required_streak integer NOT NULL,
    reward_text text NOT NULL,
    is_claimed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Enable RLS
ALTER TABLE daily_moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_rewards ENABLE ROW LEVEL SECURITY;

-- 5. Add RLS Policies for daily_moods
CREATE POLICY "Users can manage their own daily moods"
ON daily_moods
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Add RLS Policies for habit_rewards
CREATE POLICY "Users can manage their own habit rewards"
ON habit_rewards
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
