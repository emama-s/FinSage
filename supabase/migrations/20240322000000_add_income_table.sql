-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own income" ON income;
DROP POLICY IF EXISTS "Users can insert their own income" ON income;
DROP POLICY IF EXISTS "Users can update their own income" ON income;
DROP POLICY IF EXISTS "Users can delete their own income" ON income;

-- Drop and recreate the income table
DROP TABLE IF EXISTS income;
CREATE TABLE income (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    source TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'yearly')),
    date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create trigger for updated_at
CREATE TRIGGER update_income_updated_at
    BEFORE UPDATE ON income
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE income ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for income
CREATE POLICY "Users can view their own income"
    ON income FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own income"
    ON income FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own income"
    ON income FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own income"
    ON income FOR DELETE
    USING (auth.uid() = user_id); 