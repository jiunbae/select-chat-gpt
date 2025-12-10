// Re-export from common package
export {
  type ExportStyle,
  getChatGPTStyle,
  getCleanDocumentStyle,
  getExportStyle,
  createMessageElement,
  createExportableElement,
} from '@selectchatgpt/common/export';

// The common package's ExportMessage is compatible with our ChatMessage (minus index)
// So we can use it directly with our types
