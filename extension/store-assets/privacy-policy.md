# Privacy Policy for SelectChatGPT

**Last Updated: January 2026**

## Overview

SelectChatGPT ("we", "our", or "the extension") is a Chrome browser extension that helps users selectively share ChatGPT conversations. This privacy policy explains how we handle your data.

## Data Collection

### What We Collect

**Analytics Data (Optional)**
- Page views on ChatGPT share pages
- Feature usage (share button clicks, export types)
- Error events for debugging

This data is collected anonymously via Google Analytics 4 and contains no personally identifiable information.

### What We Do NOT Collect
- Your ChatGPT conversations or message content
- Your OpenAI account information
- Your browsing history outside of ChatGPT share pages
- Any personally identifiable information

## Data Processing

### Local Processing
- Message selection and filtering happens entirely in your browser
- PDF generation is performed locally
- Image export is processed locally

### Server Communication
When you create a share link, selected message data is sent to our server (selectchatgpt.jiun.dev) to generate a shareable URL. This data:
- Contains only the messages you explicitly selected
- Is stored to enable link sharing functionality
- Is not used for any other purpose

## Permissions

### Why We Need Each Permission

| Permission | Purpose |
|------------|---------|
| `activeTab` | Access current ChatGPT share page to display message selection UI |
| `storage` | Save your export preferences (style, margins, etc.) locally |
| `clipboardWrite` | Copy share links and markdown to your clipboard |
| `host_permissions` (chatgpt.com, chat.openai.com) | Only activate on ChatGPT share pages |

## Third-Party Services

### Google Analytics 4
We use Google Analytics to understand how the extension is used. This helps us improve features and fix bugs. Analytics data is:
- Anonymous (no user identification)
- Aggregated (we only see trends, not individual usage)
- Optional (you can disable analytics in your browser)

[Google Privacy Policy](https://policies.google.com/privacy)

## Data Security

- All communication with our server uses HTTPS encryption
- We do not store your data longer than necessary
- Share links can be accessed by anyone with the URL

## Your Rights

You can:
- Uninstall the extension at any time
- Clear local storage data in Chrome settings
- Request deletion of shared content by contacting us

## Children's Privacy

This extension is not directed at children under 13. We do not knowingly collect data from children.

## Changes to This Policy

We may update this privacy policy. Changes will be posted with a new "Last Updated" date.

## Contact

For privacy concerns or questions:
- GitHub Issues: https://github.com/jiwonMe/select-chatgpt/issues
- Email: privacy@jiun.dev

---

By using SelectChatGPT, you agree to this privacy policy.
