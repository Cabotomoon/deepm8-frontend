/**
 * LLM Service for DeepM8 Coach Engine
 * Provides AI-powered chess analysis and coaching via secure backend API
 * Token is stored securely on the backend - NEVER exposed to frontend
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

class LLMService {
  // 🔒 Backend API URL - Token is stored securely on the server
  private backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  private defaultModel = 'gpt-4o-mini'; // Cost-effective OpenAI model
  private systemPrompt = `Eres un entrenador profesional de ajedrez llamado DeepM8 Coach Engine.
Tu objetivo es ayudar a los jugadores a mejorar su juego mediante análisis detallados,
explicaciones claras y consejos estratégicos. Sé conciso, didáctico y alentador.`;

  /**
   * Service is always ready - backend handles authentication
   */
  isReady(): boolean {
    return true;
  }

  /**
   * Send a chat message and get AI response via secure backend
   * @param messages - Array of chat messages (conversation history)
   * @param model - OpenAI model to use (default: gpt-4o-mini)
   * @param temperature - Creativity level 0-1 (default: 0.7)
   */
  async chat(
    messages: ChatMessage[],
    model: string = this.defaultModel,
    temperature: number = 0.7
  ): Promise<LLMResponse> {
    try {
      console.log('🤖 Sending request to backend API:', {
        backendUrl: this.backendUrl,
        model,
        messageCount: messages.length,
        temperature
      });

      // Add system prompt if not already present
      const fullMessages = messages[0]?.role === 'system'
        ? messages
        : [{ role: 'system' as const, content: this.systemPrompt }, ...messages];

      // Get SeaVerse token from localStorage
      const token = localStorage.getItem('seaverse_token');

      if (!token) {
        throw new Error('No authentication token found. Please log in to SeaVerse.');
      }

      // Call secure backend API with authentication
      const response = await fetch(`${this.backendUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: fullMessages,
          model,
          temperature,
          maxTokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      console.log('✅ Backend API response received:', {
        contentLength: data.content?.length || 0,
        model: data.model,
        usage: data.usage
      });

      return {
        content: data.content,
        model: data.model,
        usage: data.usage
      };
    } catch (error) {
      console.error('❌ Error calling backend API:', error);

      // Provide user-friendly error messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('No se puede conectar con el servidor backend. Verifica que el servidor esté ejecutándose.');
      }

      throw new Error(`Failed to get AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze a chess position using AI
   * @param fen - FEN notation of the position
   * @param moveHistory - Array of moves in algebraic notation
   */
  async analyzePosition(fen: string, moveHistory: string[]): Promise<string> {
    const userMessage = `Analiza esta posición de ajedrez:

FEN: ${fen}
Historial de jugadas: ${moveHistory.join(', ')}

Proporciona:
1. Evaluación de la posición (quién está mejor y por qué)
2. Ideas principales para ambos bandos
3. Una recomendación de jugada con explicación breve`;

    const response = await this.chat([
      { role: 'user', content: userMessage }
    ]);

    return response.content;
  }

  /**
   * Get post-game analysis
   * @param result - Game result ('white' | 'black' | 'draw')
   * @param moveHistory - Array of moves in algebraic notation
   * @param playerColor - Player's color
   */
  async analyzeGame(
    result: 'white' | 'black' | 'draw',
    moveHistory: string[],
    playerColor: 'white' | 'black'
  ): Promise<string> {
    const outcome = result === 'draw' ? 'tablas' :
                    result === playerColor ? 'victoria' : 'derrota';

    const userMessage = `Analiza esta partida de ajedrez que terminó en ${outcome}:

Jugador: ${playerColor === 'white' ? 'Blancas' : 'Negras'}
Resultado: ${outcome}
Jugadas: ${moveHistory.join(', ')}

Proporciona:
1. Resumen del juego (apertura, medio juego, final)
2. Momentos clave y errores críticos
3. 3 consejos específicos para mejorar`;

    const response = await this.chat([
      { role: 'user', content: userMessage }
    ]);

    return response.content;
  }

  /**
   * Get opening suggestions based on player preferences
   * @param color - Player's color preference
   * @param style - Playing style (aggressive, defensive, balanced)
   */
  async suggestOpening(
    color: 'white' | 'black',
    style: 'aggressive' | 'defensive' | 'balanced' = 'balanced'
  ): Promise<string> {
    const userMessage = `Recomienda una apertura de ajedrez para jugar con ${color === 'white' ? 'blancas' : 'negras'}.
Estilo preferido: ${style === 'aggressive' ? 'agresivo' : style === 'defensive' ? 'defensivo' : 'equilibrado'}

Incluye:
1. Nombre de la apertura
2. Primeras 3-5 jugadas
3. Ideas principales y objetivos
4. Por qué es adecuada para este estilo`;

    const response = await this.chat([
      { role: 'user', content: userMessage }
    ]);

    return response.content;
  }

  /**
   * Ask a general chess question
   * @param question - User's question
   */
  async askQuestion(question: string): Promise<string> {
    const response = await this.chat([
      { role: 'user', content: question }
    ]);

    return response.content;
  }
}

// Export singleton instance
export const llmService = new LLMService();
