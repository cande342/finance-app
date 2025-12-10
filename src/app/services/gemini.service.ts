import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private readonly STORAGE_KEY = 'user_gemini_api_key';

  constructor() {}

  setApiKey(key: string) {
    localStorage.setItem(this.STORAGE_KEY, key.trim());
  }

  hasKey(): boolean {
    return !!localStorage.getItem(this.STORAGE_KEY);
  }

  removeKey() {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  async analyzeFinances(income: number, expenses: number, categories: any, history: any[]) {
    const apiKey = localStorage.getItem(this.STORAGE_KEY);
    if (!apiKey) throw new Error('MISSING_API_KEY');

    const MODEL_ID = 'gemini-2.5-flash'; 
    const MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent`;

    const balance = income - expenses;
    const savingsRate = income > 0 ? ((balance / income) * 100).toFixed(1) : '0';

    const topCategories = Object.entries(categories)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 3)
      .map(([k, v]) => `${k}: $${v}`)
      .join(', ');

    const prompt = `
      Eres un asesor financiero experto y conciso.
      Datos del usuario:
      - Ingresos: $${income}
      - Gastos: $${expenses}
      - Balance: $${balance}
      - Tasa de ahorro: ${savingsRate}%
      - Gastos principales: ${topCategories}

      Tu tarea: Generar un análisis y un consejo.
      Formato de respuesta: JSON exacto con las claves "analysis" y "tip".
    `;

    try {
      console.log(`📡 Conectando con ${MODEL_ID}...`);
      
      const response = await fetch(`${MODEL_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        console.error('🔥 Error Google:', errData);
        
        // Manejo de errores comunes
        if (response.status === 404) throw new Error(`MODEL_NOT_FOUND: ${MODEL_ID}`);
        if (response.status === 400) throw new Error('INVALID_API_KEY_OR_REQUEST');
        if (response.status === 429) throw new Error('QUOTA_EXCEEDED');
        throw new Error(`API_ERROR_${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Busca el primer '{' y el último '}' para ignorar cualquier texto basura
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');

      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error('INVALID_JSON_FORMAT_RECEIVED');
      }

      const cleanJsonString = text.substring(firstBrace, lastBrace + 1);
      return JSON.parse(cleanJsonString);

    } catch (error) {
      console.error('❌ Error en GeminiService:', error);
      throw error;
    }
  }
}