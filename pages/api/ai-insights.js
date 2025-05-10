export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { financialData } = req.body;
  console.log('Received financialData:', financialData);
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not set' });
  }

  // Math-based calculations
  const monthlyIncome = financialData.monthlyIncome;
  const totalExpenses = financialData.totalExpenses;
  const expenseRatio = totalExpenses / (monthlyIncome || 1);
  const suggestedSavings = monthlyIncome * 0.2;
  const healthScore = Math.round(Math.max(0, Math.min(100, 100 - (expenseRatio * 50))) * 100) / 100;

  // Build the prompt for Gemini
  const prompt = `You are a financial advisor AI. Analyze the following financial data and provide only actionable suggestions in JSON format. Do NOT include suggestedSavings or healthScore.\n\n{
  "suggestions": [
    {
      "type": "warning|alert|info",
      "message": string
    }
  ]
}\n\nFinancial Data:\n${JSON.stringify(financialData, null, 2)}\n\nConsider: category-wise spending, recurring expenses, budget adherence, savings rate, and spending trends.\n\nRespond ONLY with the JSON object.`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ]
  };

  const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro:generateContent?key=${API_KEY}`;

  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.log('Gemini API error:', await response.text());
      return res.status(500).json({ error: 'Gemini API error', details: await response.text() });
    }

    const data = await response.json();
    let text = '';
    try {
      text = data.candidates[0].content.parts[0].text;
      console.log('Gemini raw response:', text);
    } catch (e) {
      text = '';
      console.log('Gemini response parsing error:', e);
    }
    let suggestions = [];
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const aiData = JSON.parse(jsonMatch[0]);
        if (Array.isArray(aiData.suggestions)) {
          suggestions = aiData.suggestions;
        }
      }
    } catch (e) {
      console.log('Gemini JSON parse error:', e);
    }
    if (!suggestions.length) {
      suggestions = [{
        type: 'warning',
        message: 'AI did not return any suggestions. Please review your financial data.'
      }];
    }
    console.log('Returning:', { suggestedSavings, healthScore, suggestions });
    return res.status(200).json({
      suggestedSavings,
      healthScore,
      suggestions
    });
  } catch (error) {
    console.error('AI error:', error);
    if (error && error.stack) {
      console.error('AI error stack:', error.stack);
    }
    console.log('Returning (error fallback):', { suggestedSavings, healthScore, suggestions: [{ type: 'warning', message: 'Unable to generate AI suggestions. Using basic calculations.' }] });
    return res.status(200).json({
      suggestedSavings,
      healthScore,
      suggestions: [{
        type: 'warning',
        message: 'Unable to generate AI suggestions. Using basic calculations.'
      }]
    });
  }
} 