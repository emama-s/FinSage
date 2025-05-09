import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
} from '@mui/material'
import { useAuth } from '../supabase/auth'
import { createExpense, updateExpense } from '../supabase/db'
import { predictCategory } from '../utils/aiCategory'
import { supabase } from '../utils/supabaseClient'

export default function ExpenseDialog({ open, onClose, expense = null }) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    amount: expense?.amount || '',
    description: expense?.description || '',
    category_id: expense?.category_id || '',
    date: expense?.date || new Date().toISOString().split('T')[0],
  })
  const [categories, setCategories] = useState([])
  const [autoCategorization, setAutoCategorization] = useState(true)
  const [showCategoryAlert, setShowCategoryAlert] = useState(false)

  useEffect(() => {
    if (open) {
      fetchCategories()
      fetchUserSettings()
    }
  }, [open])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })

      if (error) throw error
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchUserSettings = async () => {
    const { data, error } = await supabase
      .from('user_settings')
      .select('auto_categorization')
      .eq('user_id', user.id)
      .single()

    if (data) {
      setAutoCategorization(data.auto_categorization)
    }
  }

  const handleDescriptionChange = async (e) => {
    const newDescription = e.target.value
    setFormData({ ...formData, description: newDescription })
    
    if (autoCategorization && newDescription) {
      const predictedCategory = await predictCategory(newDescription, categories.map(c => c.name))
      // Fuzzy, case-insensitive match
      const matchingCategory = categories.find(c =>
        c.name.toLowerCase().includes(predictedCategory.toLowerCase()) ||
        predictedCategory.toLowerCase().includes(c.name.toLowerCase())
      )
      if (matchingCategory) {
        setFormData(prev => ({ ...prev, category_id: matchingCategory.id }))
        setShowCategoryAlert(true)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const expenseData = {
        ...formData,
        user_id: user.id,
        amount: parseFloat(formData.amount),
      }

      if (expense) {
        await updateExpense(expense.id, expenseData)
      } else {
        await createExpense(expenseData)
      }
      onClose(true)
    } catch (error) {
      console.error('Error saving expense:', error)
      onClose(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>{expense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Amount"
            type="number"
            fullWidth
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            value={formData.description}
            onChange={handleDescriptionChange}
            required
          />
          {showCategoryAlert && (
            <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
              Category automatically set to: {categories.find(c => c.id === formData.category_id)?.name}
            </Alert>
          )}
          <FormControl fullWidth margin="dense">
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category_id}
              label="Category"
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              required
            >
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Date"
            type="date"
            fullWidth
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            InputLabelProps={{
              shrink: true,
            }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => onClose(false)}>Cancel</Button>
          <Button type="submit" variant="contained">
            {expense ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}