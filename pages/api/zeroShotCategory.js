export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { description, labels } = req.body;
  if (!description || !labels || !Array.isArray(labels) || labels.length === 0) {
    return res.status(400).json({ error: 'Description and labels are required' });
  }

  // Build the prompt for Gemini
  const context = "Available Expense Categories:\n" + labels.map(l => `- ${l}`).join('\n');
  const prompt = `
${context}

Given the description of the expense: "${description}", identify the most appropriate category from the list above. Just return the category name.
  `.trim();

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ]
  };

  const API_KEY = process.env.GEMINI_API_KEY; // Store your Gemini API key in .env.local
  const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

  const response = await fetch(URL, {
    method: 'POST',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    return res.status(500).json({ error: 'Gemini API error', details: await response.text() });
  }

  const data = await response.json();
  try {
    const predicted_category = data.candidates[0].content.parts[0].text.trim();
    return res.status(200).json({ category: predicted_category });
  } catch (e) {
    return res.status(200).json({ category: 'Other' });
  }
}