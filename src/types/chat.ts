// Chat types for AI booking assistant

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  booking?: BookingResult;
  isLoading?: boolean;
}

export interface BookingResult {
  id: string;
  barber: string;
  date: string;
  time: string;
  services: string[];
  total_price: string;
  total_duration: string;
}

export interface ToolResult {
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface AIChatResponse {
  message: string;
  tool_results?: ToolResult[];
  error?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}
