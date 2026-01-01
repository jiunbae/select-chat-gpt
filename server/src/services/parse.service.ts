/**
 * Parse Service
 *
 * Provides high-level API for parsing conversations from multiple platforms.
 * Uses ParserRegistry to automatically select the appropriate parser based on URL.
 *
 * Supported platforms:
 * - ChatGPT (chatgpt.com, chat.openai.com)
 * - Claude (claude.ai)
 * - Gemini (gemini.google.com, g.co)
 */

import { createShare, CreateShareInput, ShareOutput } from './share.service.js'
import {
  ParseResult,
  ParsedMessage,
  ParserRegistry,
  ConversationNotFoundError,
  NoMessagesFoundError,
  InvalidUrlError,
  UnsupportedPlatformError
} from './parsers/index.js'

// Re-export types and errors for backward compatibility
export {
  ParseResult,
  ParsedMessage,
  ConversationNotFoundError,
  NoMessagesFoundError,
  InvalidUrlError,
  UnsupportedPlatformError
}

// Get the singleton registry instance
const registry = ParserRegistry.getInstance()

/**
 * Check if a URL is supported by any registered parser
 * @param url The URL to check
 * @returns true if the URL can be parsed
 */
export function isValidShareUrl(url: string): boolean {
  return registry.canParse(url)
}

/**
 * Check if a URL is a valid ChatGPT share URL (legacy compatibility)
 * @param url The URL to check
 * @returns true if it's a ChatGPT share URL
 * @deprecated Use isValidShareUrl() instead
 */
export function isValidChatGPTShareUrl(url: string): boolean {
  const chatgptPatterns = [
    /^https:\/\/chatgpt\.com\/share\/[a-zA-Z0-9-]+$/,
    /^https:\/\/chat\.openai\.com\/share\/[a-zA-Z0-9-]+$/
  ]
  return chatgptPatterns.some((pattern) => pattern.test(url))
}

/**
 * Fetch and parse a conversation from a supported URL
 * @param url The URL to fetch and parse
 * @returns The parsed conversation result
 * @throws UnsupportedPlatformError if URL is not supported
 * @throws ConversationNotFoundError if conversation doesn't exist
 * @throws NoMessagesFoundError if no messages could be extracted
 */
export async function fetchAndParseConversation(url: string): Promise<ParseResult> {
  return registry.parse(url)
}

/**
 * Fetch and parse a ChatGPT conversation (legacy compatibility)
 * @param url The URL to fetch and parse
 * @returns The parsed conversation result
 * @deprecated Use fetchAndParseConversation() instead
 */
export async function fetchAndParseChatGPT(url: string): Promise<ParseResult> {
  return fetchAndParseConversation(url)
}

/**
 * Parse a conversation and create a share
 * @param url The URL to parse
 * @returns The created share output
 */
export async function parseAndCreateShare(url: string): Promise<ShareOutput> {
  const parsed = await fetchAndParseConversation(url)

  const input: CreateShareInput = {
    title: parsed.title,
    sourceUrl: parsed.sourceUrl,
    messages: parsed.messages
  }

  return createShare(input)
}

/**
 * Get list of supported URL patterns
 * @returns Array of supported URL patterns as strings
 */
export function getSupportedPatterns(): string[] {
  return registry.getSupportedPatterns()
}

/**
 * Get list of supported platforms
 * @returns Array of platform identifiers
 */
export function getSupportedPlatforms(): string[] {
  return registry.getSupportedPlatforms()
}

/**
 * Get the parser registry for advanced use cases
 * @returns The ParserRegistry instance
 */
export function getParserRegistry(): ParserRegistry {
  return registry
}
