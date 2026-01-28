DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'challenge_period') THEN
        CREATE TYPE challenge_period AS ENUM ('DAILY', 'WEEKLY');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'challenge_action') THEN
        CREATE TYPE challenge_action AS ENUM ('SOLVE_QUESTION', 'PLAY_QUIZ', 'CUSTOMIZE_AVATAR', 'RESOLVE_MISTAKE', 'STREAK', 'EARN_GEMS');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS challenge_templates (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    period challenge_period NOT NULL,
    action_type challenge_action NOT NULL,
    goal_value int NOT NULL,
    reward_xp int NOT NULL,
    reward_gems int NOT NULL,
    description_template text NOT NULL
);

CREATE TABLE IF NOT EXISTS user_challenges (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    template_id uuid REFERENCES challenge_templates(id),
    action_type challenge_action NOT NULL,
    goal_value int NOT NULL,
    current_value int DEFAULT 0,
    reward_xp int NOT NULL,
    reward_gems int NOT NULL,
    description text NOT NULL,
    is_completed boolean DEFAULT false,
    is_claimed boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz NOT NULL
);

-- Seed Templates (Check duplicates by description)
INSERT INTO challenge_templates (period, action_type, goal_value, reward_xp, reward_gems, description_template)
SELECT 'DAILY', 'SOLVE_QUESTION', 5, 50, 5, 'Oldj meg helyesen 5 feladatot' WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE description_template = 'Oldj meg helyesen 5 feladatot');

INSERT INTO challenge_templates (period, action_type, goal_value, reward_xp, reward_gems, description_template)
SELECT 'DAILY', 'PLAY_QUIZ', 1, 30, 2, 'Vegyél részt egy kvízben' WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE description_template = 'Vegyél részt egy kvízben');

INSERT INTO challenge_templates (period, action_type, goal_value, reward_xp, reward_gems, description_template)
SELECT 'DAILY', 'CUSTOMIZE_AVATAR', 1, 10, 0, 'Módosítsd a karaktered kinézetét' WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE description_template = 'Módosítsd a karaktered kinézetét');

INSERT INTO challenge_templates (period, action_type, goal_value, reward_xp, reward_gems, description_template)
SELECT 'DAILY', 'RESOLVE_MISTAKE', 3, 40, 5, 'Javíts ki 3 korábbi hibát' WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE description_template = 'Javíts ki 3 korábbi hibát');

INSERT INTO challenge_templates (period, action_type, goal_value, reward_xp, reward_gems, description_template)
SELECT 'DAILY', 'EARN_GEMS', 5, 20, 1, 'Gyűjts 5 Gemet' WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE description_template = 'Gyűjts 5 Gemet');

INSERT INTO challenge_templates (period, action_type, goal_value, reward_xp, reward_gems, description_template)
SELECT 'WEEKLY', 'STREAK', 4, 100, 20, 'Érj el 4 napos Streak-et' WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE description_template = 'Érj el 4 napos Streak-et');

INSERT INTO challenge_templates (period, action_type, goal_value, reward_xp, reward_gems, description_template)
SELECT 'WEEKLY', 'EARN_GEMS', 20, 80, 10, 'Gyűjts össze 20 Gemet' WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE description_template = 'Gyűjts össze 20 Gemet');

INSERT INTO challenge_templates (period, action_type, goal_value, reward_xp, reward_gems, description_template)
SELECT 'WEEKLY', 'SOLVE_QUESTION', 15, 150, 10, 'Oldj meg 15 feladatot a héten' WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE description_template = 'Oldj meg 15 feladatot a héten');

INSERT INTO challenge_templates (period, action_type, goal_value, reward_xp, reward_gems, description_template)
SELECT 'WEEKLY', 'EARN_GEMS', 50, 200, 25, 'Gyűjts 50 Gemet a héten' WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE description_template = 'Gyűjts 50 Gemet a héten');

INSERT INTO challenge_templates (period, action_type, goal_value, reward_xp, reward_gems, description_template)
SELECT 'WEEKLY', 'RESOLVE_MISTAKE', 10, 100, 15, 'Javíts ki 10 hibát a héten' WHERE NOT EXISTS (SELECT 1 FROM challenge_templates WHERE description_template = 'Javíts ki 10 hibát a héten');
>>>>
