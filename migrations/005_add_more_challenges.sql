-- Add more challenge templates
INSERT INTO challenge_templates (period, action_type, goal_value, reward_xp, reward_gems, description_template) VALUES
('DAILY', 'EARN_GEMS', 5, 20, 1, 'Gyűjts 5 Gemet'),
('WEEKLY', 'SOLVE_QUESTION', 15, 150, 10, 'Oldj meg 15 feladatot a héten'),
('WEEKLY', 'EARN_GEMS', 50, 200, 25, 'Gyűjts 50 Gemet a héten'),
('WEEKLY', 'RESOLVE_MISTAKE', 10, 100, 15, 'Javíts ki 10 hibát a héten')
ON CONFLICT DO NOTHING;
