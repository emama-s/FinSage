-- Add date column to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;

-- Update existing expenses to have today's date if date is null
UPDATE expenses SET date = CURRENT_DATE WHERE date IS NULL;

-- Make date column required
ALTER TABLE expenses ALTER COLUMN date SET NOT NULL; 