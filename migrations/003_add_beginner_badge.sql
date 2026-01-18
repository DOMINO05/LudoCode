-- Add Beginner Coder badge
INSERT INTO public.badges (name, description, icon_path, criteria_type, criteria_value)
SELECT 'Kezdő Kódoló', 'Sikeresen megoldottad az első feladatodat!', '🚀', 'SUBMISSIONS', 1
WHERE NOT EXISTS (
    SELECT 1 FROM public.badges WHERE name = 'Kezdő Kódoló'
);

-- Ensure SUBMISSIONS type is handled (handled by code update, this is just data)
