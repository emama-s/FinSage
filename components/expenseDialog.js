import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
} from '@mui/material'
import { useAuth } from '../supabase/auth'
import { createExpense, updateExpense } from '../supabase/db'

export default function ExpenseDialog({ open, onClose, expense = null }) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    amount: expense?.amount || '',
    description: expense?.description || '',
    category_id: expense?.category_id || '',
    date: expense?.date || new Date().toISOString().split('T')[0],
  })

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
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />
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