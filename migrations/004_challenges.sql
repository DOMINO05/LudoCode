-- Challenges Tables
CREATE TYPE challenge_period AS ENUM ('DAILY', 'WEEKLY');
CREATE TYPE challenge_action AS ENUM ('SOLVE_QUESTION', 'PLAY_QUIZ', 'CUSTOMIZE_AVATAR', 'RESOLVE_MISTAKE', 'STREAK', 'EARN_GEMS');

CREATE TABLE challenge_templates (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    period challenge_period NOT NULL,
    action_type challenge_action NOT NULL,
    goal_value int NOT NULL,
    reward_xp int NOT NULL,
    reward_gems int NOT NULL,
    description_template text NOT NULL
);

CREATE TABLE user_challenges (
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

-- Seed Templates
INSERT INTO challenge_templates (period, action_type, goal_value, reward_xp, reward_gems, description_template) VALUES
('DAILY', 'SOLVE_QUESTION', 5, 50, 5, 'Oldj meg helyesen 5 feladatot'),
('DAILY', 'PLAY_QUIZ', 1, 30, 2, 'Vegyél részt egy kvízben'),
('DAILY', 'CUSTOMIZE_AVATAR', 1, 10, 0, 'Módosítsd a karaktered kinézetét'),
('DAILY', 'RESOLVE_MISTAKE', 3, 40, 5, 'Javíts ki 3 korábbi hibát'),
('WEEKLY', 'STREAK', 4, 100, 20, 'Érj el 4 napos Streak-et'),
('WEEKLY', 'EARN_GEMS', 20, 80, 10, 'Gyűjts össze 20 Gemet');
