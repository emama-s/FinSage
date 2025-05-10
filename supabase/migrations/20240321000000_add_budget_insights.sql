-- Create income table
CREATE TABLE IF NOT EXISTS income (
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

-- Create budget_limits table
CREATE TABLE IF NOT EXISTS budget_limits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    limit_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(user_id, category)
);

-- Create triggers for updated_at
CREATE TRIGGER update_income_updated_at
    BEFORE UPDATE ON income
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_limits_updated_at
    BEFORE UPDATE ON budget_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_limits ENABLE ROW LEVEL SECURITY;

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

-- Create RLS policies for budget_limits
CREATE POLICY "Users can view their own budget limits"
    ON budget_limits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget limits"
    ON budget_limits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget limits"
    ON budget_limits FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget limits"
    ON budget_limits FOR DELETE
    USING (auth.uid() = user_id); 