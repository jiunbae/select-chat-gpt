/**
 * Parser Registry
 *
 * Manages registration and selection of chat parsers.
 * Automatically selects the appropriate parser based on URL pattern matching.
 */

import { IChatParser, ParseResult, UnsupportedPlatformError } from './index.js'
import { ChatGPTParser } from './chatgpt.parser.js'
import { ClaudeParser } from './claude.parser.js'
import { GeminiParser } from './gemini.parser.js'

export class ParserRegistry {
  private parsers: IChatParser[] = []
  private static instance: ParserRegistry | null = null

  constructor() {
    // Register default parsers
    this.register(new ChatGPTParser())
    this.register(new ClaudeParser())
    this.register(new GeminiParser())
  }

  /**
   * Get the singleton instance of ParserRegistry
   */
  static getInstance(): ParserRegistry {
    if (!ParserRegistry.instance) {
      ParserRegistry.instance = new ParserRegistry()
    }
    return ParserRegistry.instance
  }

  /**
   * Register a new parser
   * @param parser The parser to register
   */
  register(parser: IChatParser): void {
    // Avoid duplicate registration
    const existing = this.parsers.find((p) => p.platform === parser.platform)
    if (!existing) {
      this.parsers.push(parser)
    }
  }

  /**
   * Unregister a parser by platform
   * @param platform The platform identifier
   */
  unregister(platform: string): void {
    this.parsers = this.parsers.filter((p) => p.platform !== platform)
  }

  /**
   * Get a parser that can handle the given URL
   * @param url The URL to find a parser for
   * @returns The matching parser, or null if none found
   */
  getParser(url: string): IChatParser | null {
    for (const parser of this.parsers) {
      if (parser.canParse(url)) {
        return parser
      }
    }
    return null
  }

  /**
   * Check if any registered parser can handle the given URL
   * @param url The URL to check
   * @returns true if a parser is available
   */
  canParse(url: string): boolean {
    return this.getParser(url) !== null
  }

  /**
   * Parse a conversation from the given URL
   * Automatically selects the appropriate parser based on URL
   * @param url The URL to parse
   * @returns The parsed conversation
   * @throws UnsupportedPlatformError if no parser can handle the URL
   */
  async parse(url: string): Promise<ParseResult> {
    const parser = this.getParser(url)
    if (!parser) {
      throw new UnsupportedPlatformError(url)
    }
    return parser.parse(url)
  }

  /**
   * Get all registered parsers
   * @returns Array of registered parsers
   */
  getParsers(): readonly IChatParser[] {
    return this.parsers
  }

  /**
   * Get supported URL patterns as a human-readable list
   * Dynamically collects patterns from all registered parsers
   * @returns Array of supported URL patterns
   */
  getSupportedPatterns(): string[] {
    return this.parsers.flatMap((parser) => parser.getSupportedPatterns())
  }

  /**
   * Get supported platforms
   * @returns Array of platform identifiers
   */
  getSupportedPlatforms(): string[] {
    return this.parsers.map((p) => p.platform)
  }
}
