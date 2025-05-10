import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
} from '@mui/material';
import { supabase } from '../utils/supabaseClient';
import { useUserSettings } from '../contexts/UserSettingsContext';
import { getCategoryColor } from '../utils/aiCategory';

const BudgetDashboard = ({ userId, onSettingsChange }) => {
  const [budgetData, setBudgetData] = useState({});
  const [loading, setLoading] = useState(true);
  const userSettings = useUserSettings();
  if (!userSettings) {
    return <div>Loading user settings...</div>;
  }
  const { settings, updateSetting } = userSettings;

  useEffect(() => {
    fetchBudgetData();
  }, [userId]);

  const fetchBudgetData = async () => {
    setLoading(true);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .gte('date', thirtyDaysAgo.toISOString());

    if (error) {
      console.error('Error fetching expenses:', error);
      return;
    }

    // Calculate average spending per category
    const categoryTotals = {};
    const categoryCounts = {};

    expenses.forEach(expense => {
      const category = expense.category || 'Other';
      categoryTotals[category] = (categoryTotals[category] || 0) + expense.amount;
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const averages = {};
    Object.keys(categoryTotals).forEach(category => {
      averages[category] = categoryTotals[category] / categoryCounts[category];
    });

    setBudgetData(averages);
    setLoading(false);
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
      <Grid container spacing={3}>
        {Object.entries(budgetData).map(([category, average]) => (
          <Grid item xs={12} sm={6} md={4} key={category}>
            <Card
              sx={{
                borderLeft: 6,
                borderColor: getCategoryColor(category),
              }}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {category}
                </Typography>
                <Typography variant="h4" color="primary">
                  ${average.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Average daily spend
                </Typography>
                <Typography variant="h5" sx={{ mt: 2 }}>
                  ${(average * 30).toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Suggested monthly budget
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default BudgetDashboard; 