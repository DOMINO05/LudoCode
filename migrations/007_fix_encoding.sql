SET client_encoding = 'UTF8';

-- Fix Challenge Templates
UPDATE challenge_templates SET description_template = 'Oldj meg helyesen 5 feladatot' WHERE "actionType" = 'SOLVE_QUESTION' AND goal_value = 5;
UPDATE challenge_templates SET description_template = 'Vegyél részt egy kvízben' WHERE "actionType" = 'PLAY_QUIZ' AND goal_value = 1;
UPDATE challenge_templates SET description_template = 'Módosítsd a karaktered kinézetét' WHERE "actionType" = 'CUSTOMIZE_AVATAR' AND goal_value = 1;
UPDATE challenge_templates SET description_template = 'Javíts ki 3 korábbi hibát' WHERE "actionType" = 'RESOLVE_MISTAKE' AND goal_value = 3;
UPDATE challenge_templates SET description_template = 'Gyűjts 5 Gemet' WHERE "actionType" = 'EARN_GEMS' AND goal_value = 5;
UPDATE challenge_templates SET description_template = 'Érj el 4 napos Streak-et' WHERE "actionType" = 'STREAK' AND goal_value = 4;
UPDATE challenge_templates SET description_template = 'Gyűjts össze 20 Gemet' WHERE "actionType" = 'EARN_GEMS' AND goal_value = 20;
UPDATE challenge_templates SET description_template = 'Oldj meg 15 feladatot a héten' WHERE "actionType" = 'SOLVE_QUESTION' AND goal_value = 15;
UPDATE challenge_templates SET description_template = 'Gyűjts 50 Gemet a héten' WHERE "actionType" = 'EARN_GEMS' AND goal_value = 50;
UPDATE challenge_templates SET description_template = 'Javíts ki 10 hibát a héten' WHERE "actionType" = 'RESOLVE_MISTAKE' AND goal_value = 10;

-- Fix User Challenges (Active ones mainly)
UPDATE user_challenges SET description = 'Oldj meg helyesen 5 feladatot' WHERE action_type = 'SOLVE_QUESTION' AND goal_value = 5;
UPDATE user_challenges SET description = 'Vegyél részt egy kvízben' WHERE action_type = 'PLAY_QUIZ' AND goal_value = 1;
UPDATE user_challenges SET description = 'Módosítsd a karaktered kinézetét' WHERE action_type = 'CUSTOMIZE_AVATAR' AND goal_value = 1;
UPDATE user_challenges SET description = 'Javíts ki 3 korábbi hibát' WHERE action_type = 'RESOLVE_MISTAKE' AND goal_value = 3;
UPDATE user_challenges SET description = 'Gyűjts 5 Gemet' WHERE action_type = 'EARN_GEMS' AND goal_value = 5;
UPDATE user_challenges SET description = 'Érj el 4 napos Streak-et' WHERE action_type = 'STREAK' AND goal_value = 4;
UPDATE user_challenges SET description = 'Gyűjts össze 20 Gemet' WHERE action_type = 'EARN_GEMS' AND goal_value = 20;
UPDATE user_challenges SET description = 'Oldj meg 15 feladatot a héten' WHERE action_type = 'SOLVE_QUESTION' AND goal_value = 15;
UPDATE user_challenges SET description = 'Gyűjts 50 Gemet a héten' WHERE action_type = 'EARN_GEMS' AND goal_value = 50;
UPDATE user_challenges SET description = 'Javíts ki 10 hibát a héten' WHERE action_type = 'RESOLVE_MISTAKE' AND goal_value = 10;
