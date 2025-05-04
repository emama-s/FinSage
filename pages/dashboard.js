import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Alert, Button, CircularProgress, Container, Dialog, DialogTitle, DialogContent, DialogActions, Divider, IconButton, Snackbar, Stack, Typography, TextField, Paper, List, ListItem, ListItemText, ListItemSecondaryAction, Grid, Card, CardContent, Box, MenuItem } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import NavBar from '../components/navbar';
import ReceiptRow from '../components/receiptRow';
import ExpenseDialog from '../components/expenseDialog';
import { useAuth } from '../supabase/auth';
import { createExpense, getExpenses, createCategory, getCategories, updateCategory, deleteCategory, updateExpense, deleteExpense } from '../supabase/db';
import styles from '../styles/dashboard.module.scss';

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
  const [newExpense, setNewExpense] = useState({ amount: '', description: '', category_id: '' });
  const [newCategory, setNewCategory] = useState({ name: '' });
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteExpenseConfirmation, setDeleteExpenseConfirmation] = useState(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [expensesData, categoriesData] = await Promise.all([
        getExpenses(user.id),
        getCategories(user.id)
      ]);
      setExpenses(expensesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const expense = {
        ...newExpense,
        user_id: user.id,
        amount: parseFloat(newExpense.amount),
        created_at: new Date().toISOString()
      };
      await createExpense(expense);
      setNewExpense({ amount: '', description: '', category_id: '' });
      loadData();
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const handleAddCategory = async () => {
    try {
      const category = {
        ...newCategory,
        user_id: user.id
      };
      await createCategory(category);
      setNewCategory({ name: '' });
      setOpenCategoryDialog(false);
      loadData();
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleUpdateCategory = async () => {
    try {
      await updateCategory(editingCategory.id, { name: editingCategory.name });
      setEditingCategory(null);
      loadData();
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await deleteCategory(id);
      setSnackbar({ open: true, message: 'Category deleted successfully', severity: 'success' });
      setDeleteConfirmation(null);
      loadData();
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
      
      const updates = {
        amount: amount,
        description: editingExpense.description.trim(),
        category_id: editingExpense.category_id
      };
      
      await updateExpense(editingExpense.id, updates);
      setSnackbar({ open: true, message: 'Expense updated successfully', severity: 'success' });
      setEditingExpense(null);
      loadData();
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
      
      await deleteExpense(id);
      setSnackbar({ open: true, message: 'Expense deleted successfully', severity: 'success' });
      setDeleteExpenseConfirmation(null);
      loadData();
    } catch (error) {
      console.error('Error deleting expense:', error);
      setSnackbar({ open: true, message: error.message || 'Failed to delete expense', severity: 'error' });
    }
  };

  if (!user) return null;

  return (
    <div>
      <Head>
        <title>Expense Tracker</title>
      </Head>

      <NavBar />
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
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
                    label="Category"
                    value={newExpense.category_id}
                    onChange={(e) => setNewExpense({ ...newExpense, category_id: e.target.value })}
                    margin="normal"
                    required
                    SelectProps={{
                      native: true,
                    }}
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </TextField>
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
                        secondary={categories.find(c => c.id === expense.category_id)?.name}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => setEditingExpense(expense)}
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
      </Container>
    </div>
  );
}