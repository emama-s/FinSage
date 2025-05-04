import { supabase } from './client'

export const createExpense = async (expense) => {
  const { data, error } = await supabase
    .from('expenses')
    .insert([expense])
    .select()
  
  if (error) throw error
  return data[0]
}

export const updateExpense = async (id, updates) => {
  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select()
  
  if (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
  
  if (!data || data.length === 0) {
    throw new Error('Expense not found');
  }
  
  return data[0];
}

export const getExpenses = async (userId) => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const createCategory = async (category) => {
  const { data, error } = await supabase
    .from('categories')
    .insert([category])
    .select()
  
  if (error) throw error
  return data[0]
}

export const getCategories = async (userId) => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true })
  
  if (error) throw error
  return data
}

export const updateCategory = async (id, updates) => {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
  
  if (error) throw error
  return data[0]
}

export const deleteCategory = async (id) => {
  try {
    // First, check if there are any expenses using this category
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('id')
      .eq('category_id', id)
      .limit(1);

    if (expensesError) {
      console.error('Error checking expenses:', expensesError);
      throw new Error('Failed to check category usage');
    }

    if (expenses && expenses.length > 0) {
      throw new Error('Cannot delete category: It is being used by existing expenses');
    }

    // If no expenses are using the category, proceed with deletion
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  } catch (error) {
    console.error('Delete category error:', error);
    throw error;
  }
}

export const deleteExpense = async (id) => {
  const { data, error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .select()
  
  if (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
  
  if (!data || data.length === 0) {
    throw new Error('Expense not found');
  }
  
  return data[0];
} 