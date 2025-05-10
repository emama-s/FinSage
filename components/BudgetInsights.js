import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Button,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Download as DownloadIcon, Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import { supabase } from '../utils/supabaseClient';
import { getCategoryColor } from '../utils/aiCategory';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const BudgetInsights = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState({
    monthlyIncome: 0,
    totalExpenses: 0,
    remainingBudget: 0,
    suggestedSavings: 0,
  });
  const [categoryData, setCategoryData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [budgetLimits, setBudgetLimits] = useState({});
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [healthScore, setHealthScore] = useState(0);
  const [editDialog, setEditDialog] = useState({ open: false, category: null, newLimit: '' });
  const [incomeDialog, setIncomeDialog] = useState({ open: false, amount: '', source: '', frequency: 'monthly' });
  const [incomeSources, setIncomeSources] = useState([]);
  const [editIncomeDialog, setEditIncomeDialog] = useState({ open: false, income: null, amount: '', source: '', frequency: 'monthly' });

  useEffect(() => {
    fetchData();
  }, [userId]);

  const generateFinancialInsights = async (monthlyIncome, categoryTotals, expenses) => {
    try {
      const financialData = {
        monthlyIncome,
        categorySpending: categoryTotals,
        expenses: expenses.map(e => ({
          amount: e.amount,
          category: e.categories?.name || 'Other',
          date: e.date,
          description: e.description
        })),
        budgetLimits: budgetLimits,
        totalExpenses: Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0),
        remainingBudget: monthlyIncome - Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0)
      };

      const res = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ financialData })
      });
      const insights = await res.json();
      return insights;
    } catch (error) {
      console.error('Error in generateFinancialInsights:', error);
      // Fallback calculations
      const totalExpenses = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
      const expenseRatio = totalExpenses / monthlyIncome;
      return {
        suggestedSavings: monthlyIncome * 0.2,
        healthScore: Math.max(0, Math.min(100, 100 - (expenseRatio * 50))),
        suggestions: [{
          type: 'warning',
          message: 'Unable to generate AI insights. Using basic calculations.'
        }]
      };
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all categories for the user
      const { data: allCategories } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId);

      // Fetch income sources and amounts
      const { data: incomeData } = await supabase
        .from('income')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      setIncomeSources(incomeData || []);

      // Calculate total monthly income
      const monthlyIncome = calculateMonthlyIncome(incomeData || []);

      // Fetch expenses for the current month with category information
      const { data: expenses } = await supabase
        .from('expenses')
        .select(`
          *,
          categories (
            id,
            name
          )
        `)
        .eq('user_id', userId)
        .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      // Fetch budget limits
      const { data: limitsData } = await supabase
        .from('budget_limits')
        .select('*')
        .eq('user_id', userId);

      const limits = {};
      limitsData?.forEach(limit => {
        limits[limit.category] = limit.limit_amount;
      });

      setBudgetLimits(limits);

      // Initialize categoryTotals for all categories
      const categoryTotals = {};
      allCategories?.forEach(cat => {
        categoryTotals[cat.name] = 0;
      });
      const dailyTotals = {};

      expenses?.forEach(expense => {
        // Get category name from the joined categories data
        const categoryName = expense.categories?.name || 'Other';
        categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + expense.amount;

        const date = new Date(expense.date).toISOString().split('T')[0];
        dailyTotals[date] = (dailyTotals[date] || 0) + expense.amount;
      });

      // Calculate trend data
      const trendData = Object.entries(dailyTotals).map(([date, amount]) => ({
        date,
        amount,
      }));

      // Calculate summary data
      const totalExpenses = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
      const remainingBudget = monthlyIncome - totalExpenses;

      // Generate AI insights
      const insights = await generateFinancialInsights(monthlyIncome, categoryTotals, expenses);

      setSummaryData({
        monthlyIncome,
        totalExpenses,
        remainingBudget,
        suggestedSavings: insights.suggestedSavings,
      });
      setCategoryData(
        allCategories.map(cat => ({
          category: cat.name,
          amount: categoryTotals[cat.name] || 0,
          limit: limits[cat.name] || 100,
        }))
      );
      setTrendData(trendData);
      setAiSuggestions(insights.suggestions);
      setHealthScore(insights.healthScore);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const calculateMonthlyIncome = (incomeData) => {
    return incomeData.reduce((total, income) => {
      switch (income.frequency) {
        case 'weekly':
          return total + (income.amount * 52 / 12);
        case 'biweekly':
          return total + (income.amount * 26 / 12);
        case 'monthly':
          return total + income.amount;
        case 'yearly':
          return total + (income.amount / 12);
        default:
          return total + income.amount;
      }
    }, 0);
  };

  const handleAddIncome = async () => {
    try {
      // Validate input
      if (!incomeDialog.amount || !incomeDialog.source) {
        console.error('Amount and source are required');
        alert('Please enter both amount and source');
        return;
      }

      const amount = parseFloat(incomeDialog.amount);
      if (isNaN(amount) || amount <= 0) {
        console.error('Invalid amount');
        alert('Please enter a valid amount greater than 0');
        return;
      }

      console.log('Adding income:', {
        user_id: userId,
        amount: amount,
        source: incomeDialog.source,
        frequency: incomeDialog.frequency,
        date: new Date().toISOString().split('T')[0]
      });

      const { data, error } = await supabase
        .from('income')
        .insert({
          user_id: userId,
          amount: amount,
          source: incomeDialog.source,
          frequency: incomeDialog.frequency,
          date: new Date().toISOString().split('T')[0],
          description: `${incomeDialog.source} - ${incomeDialog.frequency} income`
        })
        .select();

      if (error) {
        console.error('Error adding income:', error);
        alert('Failed to add income: ' + error.message);
        return;
      }

      console.log('Income added successfully:', data);

      // Close dialog and refresh data
      setIncomeDialog({ open: false, amount: '', source: '', frequency: 'monthly' });
      await fetchData();
    } catch (error) {
      console.error('Error in handleAddIncome:', error);
      alert('An error occurred while adding income. Please try again.');
    }
  };

  const handleOpenEditDialog = (category) => {
    const currentLimit = budgetLimits[category] || 0;
    setEditDialog({
      open: true,
      category,
      newLimit: currentLimit.toString()
    });
  };

  const handleEditBudgetLimit = async () => {
    try {
      const newLimit = parseFloat(editDialog.newLimit);
      if (isNaN(newLimit) || newLimit <= 0) {
        console.error('Invalid budget limit');
        return;
      }

      // First check if a limit already exists for this category
      const { data: existingLimit } = await supabase
        .from('budget_limits')
        .select('id')
        .eq('user_id', userId)
        .eq('category', editDialog.category)
        .single();

      let error;
      if (existingLimit) {
        // Update existing limit
        const { error: updateError } = await supabase
          .from('budget_limits')
          .update({ limit_amount: newLimit })
          .eq('id', existingLimit.id);
        error = updateError;
      } else {
        // Insert new limit
        const { error: insertError } = await supabase
          .from('budget_limits')
          .insert({
            user_id: userId,
            category: editDialog.category,
            limit_amount: newLimit
          });
        error = insertError;
      }

      if (error) {
        console.error('Database error:', error);
        return;
      }

      // Update local state
      setBudgetLimits(prev => ({
        ...prev,
        [editDialog.category]: newLimit
      }));

      // Update category data
      setCategoryData(prev => 
        prev.map(cat => 
          cat.category === editDialog.category 
            ? { ...cat, limit: newLimit }
            : cat
        )
      );
      
      // Close dialog and refresh data
      setEditDialog({ open: false, category: null, newLimit: '' });
      fetchData();
    } catch (error) {
      console.error('Error updating budget limit:', error);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Budget Insights Report', 20, 20);
    
    // Add summary
    doc.setFontSize(12);
    doc.text('Monthly Summary:', 20, 40);
    doc.text(`Total Income: $${(summaryData.monthlyIncome ?? 0).toFixed(2)}`, 30, 50);
    doc.text(`Total Expenses: $${(summaryData.totalExpenses ?? 0).toFixed(2)}`, 30, 60);
    doc.text(`Remaining Budget: $${(summaryData.remainingBudget ?? 0).toFixed(2)}`, 30, 70);
    doc.text(`Suggested Savings: $${(summaryData.suggestedSavings ?? 0).toFixed(2)}`, 30, 80);
    
    // Add category breakdown
    doc.text('Category Breakdown:', 20, 100);
    let y = 110;
    categoryData.forEach(({ category, amount, limit }) => {
      doc.text(`${category}: $${(amount ?? 0).toFixed(2)} / $${(limit ?? 0).toFixed(2)}`, 30, y);
      y += 10;
    });
    
    // Add AI suggestions
    doc.text('AI Suggestions:', 20, y + 10);
    y += 20;
    aiSuggestions.forEach(suggestion => {
      doc.text(`• ${suggestion.message}`, 30, y);
      y += 10;
    });
    
    doc.save('budget-insights.pdf');
  };

  const handleEditIncome = async () => {
    try {
      // Validate input
      if (!editIncomeDialog.amount || !editIncomeDialog.source) {
        console.error('Amount and source are required');
        alert('Please enter both amount and source');
        return;
      }

      const amount = parseFloat(editIncomeDialog.amount);
      if (isNaN(amount) || amount <= 0) {
        console.error('Invalid amount');
        alert('Please enter a valid amount greater than 0');
        return;
      }

      const { error } = await supabase
        .from('income')
        .update({
          amount: amount,
          source: editIncomeDialog.source,
          frequency: editIncomeDialog.frequency,
          description: `${editIncomeDialog.source} - ${editIncomeDialog.frequency} income`
        })
        .eq('id', editIncomeDialog.income.id);

      if (error) {
        console.error('Error updating income:', error);
        alert('Failed to update income: ' + error.message);
        return;
      }

      // Close dialog and refresh data
      setEditIncomeDialog({ open: false, income: null, amount: '', source: '', frequency: 'monthly' });
      await fetchData();
    } catch (error) {
      console.error('Error in handleEditIncome:', error);
      alert('An error occurred while updating income. Please try again.');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">Monthly Income</Typography>
                <Tooltip title="Add Income Source">
                  <IconButton size="small" onClick={() => setIncomeDialog({ open: true, amount: '', source: '', frequency: 'monthly' })}>
                    <AddIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="h4" color="primary">
                ${(summaryData.monthlyIncome ?? 0).toFixed(2)}
              </Typography>
              {incomeSources.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  {incomeSources.length} income source{incomeSources.length > 1 ? 's' : ''}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Total Expenses</Typography>
              <Typography variant="h4" color="error">
                ${(summaryData.totalExpenses ?? 0).toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Remaining Budget</Typography>
              <Typography variant="h4" color={summaryData.remainingBudget >= 0 ? 'success.main' : 'error.main'}>
                ${(summaryData.remainingBudget ?? 0).toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Suggested Savings</Typography>
              <Typography variant="h4" color="info.main">
                ${(summaryData.suggestedSavings ?? 0).toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Budget vs Actual</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="amount" name="Actual" fill="#8884d8" />
                    <Bar dataKey="limit" name="Budget" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Spending Trend</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="amount" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Category Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {categoryData.map(({ category, amount, limit }) => (
          <Grid item xs={12} sm={6} md={4} key={category}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">{category}</Typography>
                  <Tooltip title="Edit Budget Limit">
                    <IconButton size="small" onClick={() => handleOpenEditDialog(category)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography variant="h4" color="primary">
                  ${(amount ?? 0).toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  of ${(limit ?? 0).toFixed(2)} budget
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(amount / limit) * 100}
                  color={amount > limit ? 'error' : 'primary'}
                  sx={{ mt: 1 }}
                />
                {amount > limit && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Budget exceeded by ${(amount - limit).toFixed(2)}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* AI Suggestions */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">AI Suggestions</Typography>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={exportToPDF}
            >
              Export Report
            </Button>
          </Box>
          <Grid container spacing={2}>
            {(aiSuggestions ?? []).map((suggestion, index) => (
              <Grid item xs={12} key={index}>
                <Alert severity={suggestion.type}>
                  {suggestion.message}
                </Alert>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Financial Health Score */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Financial Health Score</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ position: 'relative', display: 'inline-flex', mr: 2 }}>
              <CircularProgress
                variant="determinate"
                value={healthScore}
                size={60}
                color={healthScore >= 70 ? 'success' : healthScore >= 40 ? 'warning' : 'error'}
              />
              <Box
                sx={{
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="caption" component="div" color="text.secondary">
                  {healthScore}%
                </Typography>
              </Box>
            </Box>
            <Typography variant="body1">
              {healthScore >= 70
                ? 'Great financial health!'
                : healthScore >= 40
                ? 'Room for improvement'
                : 'Needs attention'}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Income Dialog */}
      <Dialog 
        open={incomeDialog.open} 
        onClose={() => setIncomeDialog({ open: false, amount: '', source: '', frequency: 'monthly' })}
      >
        <DialogTitle>Add Income Source</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Amount"
            type="number"
            fullWidth
            value={incomeDialog.amount}
            onChange={(e) => setIncomeDialog(prev => ({ ...prev, amount: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Source"
            fullWidth
            value={incomeDialog.source}
            onChange={(e) => setIncomeDialog(prev => ({ ...prev, source: e.target.value }))}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Frequency</InputLabel>
            <Select
              value={incomeDialog.frequency}
              label="Frequency"
              onChange={(e) => setIncomeDialog(prev => ({ ...prev, frequency: e.target.value }))}
            >
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="biweekly">Bi-weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="yearly">Yearly</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIncomeDialog({ open: false, amount: '', source: '', frequency: 'monthly' })}>Cancel</Button>
          <Button onClick={handleAddIncome} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Budget Limit Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, category: null, newLimit: '' })}>
        <DialogTitle>Edit Budget Limit</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Budget Limit"
            type="number"
            fullWidth
            value={editDialog.newLimit}
            onChange={(e) => setEditDialog(prev => ({ ...prev, newLimit: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, category: null, newLimit: '' })}>Cancel</Button>
          <Button onClick={handleEditBudgetLimit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Income Sources List */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Income Sources</Typography>
          <List>
            {incomeSources.map((income) => (
              <ListItem
                key={income.id}
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={() => setEditIncomeDialog({
                      open: true,
                      income: income,
                      amount: income.amount.toString(),
                      source: income.source,
                      frequency: income.frequency
                    })}
                  >
                    <EditIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={`${income.source} - $${income.amount}`}
                  secondary={`${income.frequency} income`}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Edit Income Dialog */}
      <Dialog
        open={editIncomeDialog.open}
        onClose={() => setEditIncomeDialog({ open: false, income: null, amount: '', source: '', frequency: 'monthly' })}
      >
        <DialogTitle>Edit Income Source</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Amount"
            type="number"
            fullWidth
            value={editIncomeDialog.amount}
            onChange={(e) => setEditIncomeDialog(prev => ({ ...prev, amount: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Source"
            fullWidth
            value={editIncomeDialog.source}
            onChange={(e) => setEditIncomeDialog(prev => ({ ...prev, source: e.target.value }))}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Frequency</InputLabel>
            <Select
              value={editIncomeDialog.frequency}
              label="Frequency"
              onChange={(e) => setEditIncomeDialog(prev => ({ ...prev, frequency: e.target.value }))}
            >
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="biweekly">Bi-weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="yearly">Yearly</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditIncomeDialog({ open: false, income: null, amount: '', source: '', frequency: 'monthly' })}>
            Cancel
          </Button>
          <Button onClick={handleEditIncome} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BudgetInsights; 