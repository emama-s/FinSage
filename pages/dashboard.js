import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Alert, Button, CircularProgress, Container, Dialog, DialogTitle, DialogContent, DialogActions, Divider, IconButton, Snackbar, Stack, Typography, TextField, Paper, List, ListItem, ListItemText, ListItemSecondaryAction, Grid, Card, CardContent, Box, MenuItem, Tabs, Tab } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import NavBar from '../components/navbar';
import ReceiptRow from '../components/receiptRow';
import ExpenseDialog from '../components/expenseDialog';
import { useAuth } from '../supabase/auth';
import { createExpense, getExpenses, createCategory, getCategories, updateCategory, deleteCategory, updateExpense, deleteExpense } from '../supabase/db';
import styles from '../styles/dashboard.module.scss';
import BudgetInsights from '../components/BudgetInsights';
import { supabase } from '../utils/supabaseClient';
import { predictCategory } from '../utils/aiCategory';

const ADD_SUCCESS = "Receipt was successfully added!";
const ADD_ERROR = "Receipt was not successfully added!";
const EDIT_SUCCESS = "Receipt was successfully updated!";
const EDIT_ERROR = "Receipt was not successfully updated!";
const DELETE_SUCCESS = "Receipt successfully deleted!";
const DELETE_ERROR = "Receipt not successfully deleted!";

// Enum to represent different states of receipts
export const RECEIPTS_ENUM = Object.freeze({
  none: 0,
  add: 1,
  edit: 2,
  delete: 3,
});

const SUCCESS_MAP = {
  [RECEIPTS_ENUM.add]: ADD_SUCCESS,
  [RECEIPTS_ENUM.edit]: EDIT_SUCCESS,
  [RECEIPTS_ENUM.delete]: DELETE_SUCCESS
}

const ERROR_MAP = {
  [RECEIPTS_ENUM.add]: ADD_ERROR,
  [RECEIPTS_ENUM.edit]: EDIT_ERROR,
  [RECEIPTS_ENUM.delete]: DELETE_ERROR
}

export default function Dashboard() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newExpense, setNewExpense] = useState({ 
    amount: '', 
    description: '', 
    category_id: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [newCategory, setNewCategory] = useState({ name: '' });
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteExpenseConfirmation, setDeleteExpenseConfirmation] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [autoCategorization, setAutoCategorization] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    fetchExpenses();
    fetchCategories();
    fetchUserSettings();
  }, [user]);

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching expenses:', error);
      return;
    }

    setExpenses(data);
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }

      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchUserSettings = async () => {
    const { data, error } = await supabase
      .from('user_settings')
      .select('auto_categorization')
      .eq('user_id', user.id)
      .single();
    if (data) {
      setAutoCategorization(data.auto_categorization);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      if (!newExpense.amount || !newExpense.description) {
        setSnackbar({
          open: true,
          message: 'Please fill in amount and description',
          severity: 'error'
        });
        return;
      }

      // Try to predict category if not provided
      let categoryId = newExpense.category_id;
      if (!categoryId && newExpense.description) {
        const predictedCategory = await predictCategory(newExpense.description, categories.map(c => c.name));
        if (predictedCategory) {
          // Fuzzy, case-insensitive match
          const matchingCategory = categories.find(c =>
            c.name.toLowerCase().includes(predictedCategory.toLowerCase()) ||
            predictedCategory.toLowerCase().includes(c.name.toLowerCase())
          );
          if (matchingCategory) {
            categoryId = matchingCategory.id;
          }
        }
      }

      const { data, error } = await supabase
        .from('expenses')
        .insert([{
          amount: parseFloat(newExpense.amount),
          description: newExpense.description.trim(),
          category_id: categoryId || null,
          user_id: user.id,
          date: newExpense.date
        }])
        .select()
        .single();

      if (error) throw error;

      setExpenses(prev => [data, ...prev]);
      setNewExpense({ amount: '', description: '', category_id: '', date: new Date().toISOString().split('T')[0] });
      setSnackbar({
        open: true,
        message: 'Expense added successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error adding expense:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to add expense',
        severity: 'error'
      });
    }
  };

  const handleAddCategory = async () => {
    try {
      if (!newCategory.name.trim()) {
        setSnackbar({
          open: true,
          message: 'Please enter a category name',
          severity: 'error'
        });
        return;
      }

      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: newCategory.name.trim(),
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      setCategories(prev => [...prev, data]);
      setNewCategory({ name: '' });
      setOpenCategoryDialog(false);
      setSnackbar({
        open: true,
        message: 'Category added successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error adding category:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to add category',
        severity: 'error'
      });
    }
  };

  const handleUpdateCategory = async () => {
    try {
      if (!editingCategory?.name?.trim()) {
        setSnackbar({
          open: true,
          message: 'Please enter a category name',
          severity: 'error'
        });
        return;
      }

      const { data, error } = await supabase
        .from('categories')
        .update({ name: editingCategory.name.trim() })
        .eq('id', editingCategory.id)
        .select()
        .single();

      if (error) throw error;

      setCategories(prev => 
        prev.map(cat => cat.id === editingCategory.id ? data : cat)
      );
      setEditingCategory(null);
      setSnackbar({
        open: true,
        message: 'Category updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating category:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to update category',
        severity: 'error'
      });
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      // First check if there are any expenses using this category
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('id')
        .eq('category_id', id)
        .limit(1);

      if (expensesError) throw expensesError;

      if (expenses && expenses.length > 0) {
        setSnackbar({
          open: true,
          message: 'Cannot delete category: It is being used by existing expenses',
          severity: 'error'
        });
        setDeleteConfirmation(null);
        return;
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCategories(prev => prev.filter(cat => cat.id !== id));
      setDeleteConfirmation(null);
      setSnackbar({
        open: true,
        message: 'Category deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to delete category',
        severity: 'error'
      });
    }
  };

  const handleUpdateExpense = async () => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      if (!editingExpense?.id) {
        throw new Error('No expense ID provided');
      }
      
      // Validate amount
      const amount = parseFloat(editingExpense.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount greater than 0');
      }
      
      // Validate description
      if (!editingExpense.description?.trim()) {
        throw new Error('Please enter a description');
      }
      
      // Validate category
      if (!editingExpense.category_id) {
        throw new Error('Please select a category');
      }

      // Validate date
      if (!editingExpense.date) {
        throw new Error('Please select a date');
      }
      
      const { data, error } = await supabase
        .from('expenses')
        .update({
          amount: amount,
          description: editingExpense.description.trim(),
          category_id: editingExpense.category_id,
          date: editingExpense.date,
          user_id: user.id
        })
        .eq('id', editingExpense.id)
        .select()
        .single();
      
      if (error) throw error;
      
      setExpenses(prev => 
        prev.map(exp => exp.id === editingExpense.id ? data : exp)
      );
      setSnackbar({ open: true, message: 'Expense updated successfully', severity: 'success' });
      setEditingExpense(null);
    } catch (error) {
      console.error('Error updating expense:', error);
      setSnackbar({ 
        open: true, 
        message: error.message || 'Failed to update expense',
        severity: 'error' 
      });
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setExpenses(prev => prev.filter(exp => exp.id !== id));
      setSnackbar({ open: true, message: 'Expense deleted successfully', severity: 'success' });
      setDeleteExpenseConfirmation(null);
    } catch (error) {
      console.error('Error deleting expense:', error);
      setSnackbar({ 
        open: true, 
        message: error.message || 'Failed to delete expense', 
        severity: 'error' 
      });
    }
  };

  const handleDialogClose = (success) => {
    setOpenDialog(false);
    setSelectedExpense(null);
    if (success) {
      fetchExpenses();
    }
  };

  const handleEditExpense = (expense) => {
    setSelectedExpense(expense);
    setOpenDialog(true);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Add this function to re-fetch user settings
  const handleSettingsChange = () => {
    fetchUserSettings();
  };

  if (!user) return null;

  return (
    <div>
      <Head>
        <title>FinSage - Dashboard</title>
        <meta name="description" content="Track your expenses with FinSage" />
      </Head>

      <NavBar />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Expenses" />
            <Tab label="Budget Insights" />
          </Tabs>
        </Box>

        {tabValue === 0 ? (
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Your Expenses
            </Typography>
            <Grid container spacing={3}>
              {/* Expense Form */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Add Expense
                  </Typography>
                  <form onSubmit={handleAddExpense}>
                    <TextField
                      fullWidth
                      label="Amount"
                      type="number"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      margin="normal"
                      required
                    />
                    <TextField
                      fullWidth
                      label="Description"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                      margin="normal"
                      required
                    />
                    <TextField
                      fullWidth
                      select
                      label="Category (Optional)"
                      value={newExpense.category_id}
                      onChange={(e) => setNewExpense({ ...newExpense, category_id: e.target.value })}
                      margin="normal"
                    >
                      {autoCategorization && (
                        <MenuItem value="">Auto-categorize</MenuItem>
                      )}
                      {categories.map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          {category.name}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      fullWidth
                      label="Date"
                      type="date"
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                      margin="normal"
                      required
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                    <Button
                      fullWidth
                      variant="contained"
                      type="submit"
                      sx={{ mt: 2 }}
                    >
                      Add Expense
                    </Button>
                  </form>
                </Paper>
              </Grid>

              {/* Categories */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Categories</Typography>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => setOpenCategoryDialog(true)}
                    >
                      Add Category
                    </Button>
                  </Box>
                  <List>
                    {categories.map((category) => (
                      <ListItem
                        key={category.id}
                        secondaryAction={
                          <>
                            <IconButton
                              edge="end"
                              onClick={() => setEditingCategory(category)}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              edge="end"
                              onClick={() => setDeleteConfirmation(category.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </>
                        }
                      >
                        <ListItemText primary={category.name} />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Grid>

              {/* Recent Expenses */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Recent Expenses
                  </Typography>
                  <List>
                    {expenses.map((expense) => (
                      <ListItem key={expense.id}>
                        <ListItemText
                          primary={`$${expense.amount} - ${expense.description}`}
                          secondary={
                            <>
                              {new Date(expense.date).toLocaleDateString()} - {categories.find(c => c.id === expense.category_id)?.name || 'Uncategorized'}
                            </>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => handleEditExpense(expense)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => setDeleteExpenseConfirmation(expense.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        ) : (
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Budget Insights
            </Typography>
            <BudgetInsights userId={user.id} />
          </Box>
        )}
      </Container>

      <ExpenseDialog
        open={openDialog}
        onClose={handleDialogClose}
        expense={selectedExpense}
      />

      {/* Category Dialog */}
      <Dialog open={openCategoryDialog} onClose={() => setOpenCategoryDialog(false)}>
        <DialogTitle>Add Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            value={newCategory.name}
            onChange={(e) => setNewCategory({ name: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCategoryDialog(false)}>Cancel</Button>
          <Button onClick={handleAddCategory} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onClose={() => setEditingCategory(null)}>
        <DialogTitle>Edit Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            value={editingCategory?.name || ''}
            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingCategory(null)}>Cancel</Button>
          <Button onClick={handleUpdateCategory} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmation} onClose={() => setDeleteConfirmation(null)}>
        <DialogTitle>Delete Category</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this category? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmation(null)}>Cancel</Button>
          <Button onClick={() => handleDeleteCategory(deleteConfirmation)} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={!!editingExpense} onClose={() => setEditingExpense(null)}>
        <DialogTitle>Edit Expense</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Amount"
            type="number"
            fullWidth
            value={editingExpense?.amount || ''}
            onChange={(e) => setEditingExpense({ ...editingExpense, amount: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            value={editingExpense?.description || ''}
            onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Category"
            select
            fullWidth
            value={editingExpense?.category_id || ''}
            onChange={(e) => setEditingExpense({ ...editingExpense, category_id: e.target.value })}
          >
            {categories.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                {category.name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingExpense(null)}>Cancel</Button>
          <Button onClick={handleUpdateExpense} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Expense Confirmation Dialog */}
      <Dialog open={!!deleteExpenseConfirmation} onClose={() => setDeleteExpenseConfirmation(null)}>
        <DialogTitle>Delete Expense</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this expense? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteExpenseConfirmation(null)}>Cancel</Button>
          <Button onClick={() => handleDeleteExpense(deleteExpenseConfirmation)} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}