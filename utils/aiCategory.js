export const predictCategory = async (expenseTitle, categoryNames) => {
  const response = await fetch('/api/zeroShotCategory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: expenseTitle, labels: categoryNames }),
  });
  if (!response.ok) {
    return 'Other';
  }
  const data = await response.json();
  return data.category || 'Other';
};

export const getCategoryColor = (category) => {
  const colors = {
    'Food & Dining': '#FF6B6B',
    'Transportation': '#4ECDC4',
    'Shopping': '#FFD93D',
    'Entertainment': '#95E1D3',
    'Utilities': '#6C5CE7',
    'Health': '#FF8B94',
    'Travel': '#A8E6CF',
    'Education': '#FFB6B9',
    'Other': '#B2B2B2'
  };
  return colors[category] || colors['Other'];
}; 