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