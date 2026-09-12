/**
 * Error thrown when an AI provider or the entire provider fallback chain is unavailable.
 */
export class AiUnavailableError extends Error {
  constructor(message: string = "AI service is currently unavailable.") {
    super(message);
    this.name = "AiUnavailableError";
  }
}
