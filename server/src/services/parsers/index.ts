/**
 * Chat Parser Interface
 *
 * Defines the contract for platform-specific chat parsers.
 * Each parser is responsible for:
 * 1. Detecting if it can handle a given URL
 * 2. Fetching and parsing the conversation HTML
 */

export interface ParsedMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  html: string
}

export interface ParseResult {
  title: string
  sourceUrl: string
  messages: ParsedMessage[]
  platform: 'chatgpt' | 'claude' | 'gemini'
}

export interface IChatParser {
  /**
   * Platform identifier
   */
  readonly platform: 'chatgpt' | 'claude' | 'gemini'

  /**
   * Check if this parser can handle the given URL
   * @param url The URL to check
   * @returns true if this parser can parse the URL
   */
  canParse(url: string): boolean

  /**
   * Fetch and parse a conversation from the given URL
   * @param url The URL to fetch and parse
   * @returns The parsed conversation result
   */
  parse(url: string): Promise<ParseResult>
}

// Custom error types for better error handling
export class ConversationNotFoundError extends Error {
  constructor(message = 'Conversation not found') {
    super(message)
    this.name = 'ConversationNotFoundError'
  }
}

export class NoMessagesFoundError extends Error {
  constructor(message = 'No messages found in the conversation') {
    super(message)
    this.name = 'NoMessagesFoundError'
  }
}

export class InvalidUrlError extends Error {
  constructor(message = 'Invalid share URL') {
    super(message)
    this.name = 'InvalidUrlError'
  }
}

export class UnsupportedPlatformError extends Error {
  constructor(url: string) {
    super(`No parser available for URL: ${url}`)
    this.name = 'UnsupportedPlatformError'
  }
}

// Re-export parsers
export { ChatGPTParser } from './chatgpt.parser.js'
export { ClaudeParser } from './claude.parser.js'
export { GeminiParser } from './gemini.parser.js'
export { ParserRegistry } from './registry.js'
