export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}
