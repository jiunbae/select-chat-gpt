# Chrome Web Store - 개인 정보 보호 관행 입력 내용

## 1. 단일 목적 설명 (Single Purpose Description)

**English:**
```
SelectChatGPT allows users to select specific messages from ChatGPT shared conversations and export them as shareable links, Markdown, PNG images, or PDF documents.
```

**한국어:**
```
SelectChatGPT는 사용자가 ChatGPT 공유 대화에서 특정 메시지를 선택하여 공유 링크, 마크다운, PNG 이미지 또는 PDF 문서로 내보낼 수 있게 해줍니다.
```

---

## 2. 원격 코드 사용 이유 (Remote Code Justification)

**English:**
```
This extension does NOT use any remote code. All JavaScript code is bundled within the extension package. The only external communication is:
1. API calls to our server (selectchatgpt.jiun.dev) to create share links
2. Google Analytics for anonymous usage statistics

No code is fetched or executed from remote servers.
```

**한국어:**
```
이 확장 프로그램은 원격 코드를 사용하지 않습니다. 모든 JavaScript 코드는 확장 프로그램 패키지 내에 번들로 포함되어 있습니다. 유일한 외부 통신은:
1. 공유 링크 생성을 위한 서버(selectchatgpt.jiun.dev) API 호출
2. 익명 사용 통계를 위한 Google Analytics

원격 서버에서 코드를 가져오거나 실행하지 않습니다.
```

---

## 3. 호스트 권한 사용 이유 (Host Permissions Justification)

**Hosts:** `https://chatgpt.com/*`, `https://chat.openai.com/*`

**English:**
```
Host permissions for chatgpt.com and chat.openai.com are required to:
1. Detect when users visit ChatGPT shared conversation pages (URLs containing /share/)
2. Inject the message selection UI (checkboxes) into the conversation
3. Read selected message content to generate share links or export files

The extension ONLY activates on shared conversation pages (/share/*), not on regular ChatGPT chat pages. No data is collected from normal ChatGPT usage.
```

**한국어:**
```
chatgpt.com 및 chat.openai.com에 대한 호스트 권한이 필요한 이유:
1. 사용자가 ChatGPT 공유 대화 페이지(/share/ 포함 URL) 방문 시 감지
2. 대화에 메시지 선택 UI(체크박스) 삽입
3. 선택된 메시지 내용을 읽어 공유 링크 생성 또는 파일 내보내기

확장 프로그램은 공유 대화 페이지(/share/*)에서만 활성화되며, 일반 ChatGPT 채팅 페이지에서는 작동하지 않습니다. 일반 ChatGPT 사용에서는 데이터를 수집하지 않습니다.
```

---

## 4. activeTab 권한 사용 이유

**English:**
```
The activeTab permission is used to access the current ChatGPT shared conversation page when the user clicks the extension icon. This allows the extension to:
1. Display the popup with usage instructions
2. Communicate with the content script on the active tab
3. Only access the page when explicitly activated by user action

This permission ensures the extension cannot access tabs without user interaction.
```

**한국어:**
```
activeTab 권한은 사용자가 확장 프로그램 아이콘을 클릭할 때 현재 ChatGPT 공유 대화 페이지에 접근하기 위해 사용됩니다:
1. 사용 방법이 포함된 팝업 표시
2. 활성 탭의 콘텐츠 스크립트와 통신
3. 사용자 행동으로 명시적으로 활성화될 때만 페이지 접근

이 권한은 사용자 상호작용 없이 탭에 접근할 수 없도록 보장합니다.
```

---

## 5. clipboardWrite 권한 사용 이유

**English:**
```
The clipboardWrite permission is used to copy content to the user's clipboard:
1. Copy generated share links after creation
2. Copy selected messages as Markdown format
3. Copy share URLs for easy pasting

This is a core feature that allows users to quickly share their selected conversations. The clipboard is only written when the user explicitly clicks "Copy" or "Create Share Link" buttons.
```

**한국어:**
```
clipboardWrite 권한은 사용자의 클립보드에 콘텐츠를 복사하기 위해 사용됩니다:
1. 생성된 공유 링크 복사
2. 선택된 메시지를 마크다운 형식으로 복사
3. 쉬운 붙여넣기를 위한 공유 URL 복사

이것은 사용자가 선택한 대화를 빠르게 공유할 수 있게 해주는 핵심 기능입니다. 클립보드는 사용자가 명시적으로 "복사" 또는 "공유 링크 생성" 버튼을 클릭할 때만 기록됩니다.
```

---

## 6. storage 권한 사용 이유

**English:**
```
The storage permission is used to save user preferences locally:
1. Export settings (PDF page size, margins, font size)
2. Style preferences (ChatGPT style vs Clean style)
3. Header/footer options for PDF export
4. Last used export format

All data is stored locally on the user's device using Chrome's storage API. No user preferences are sent to external servers. This improves user experience by remembering their preferred settings.
```

**한국어:**
```
storage 권한은 사용자 환경설정을 로컬에 저장하기 위해 사용됩니다:
1. 내보내기 설정 (PDF 페이지 크기, 여백, 글꼴 크기)
2. 스타일 환경설정 (ChatGPT 스타일 vs 깔끔한 스타일)
3. PDF 내보내기용 머리글/바닥글 옵션
4. 마지막으로 사용한 내보내기 형식

모든 데이터는 Chrome의 storage API를 사용하여 사용자 기기에 로컬로 저장됩니다. 사용자 환경설정은 외부 서버로 전송되지 않습니다. 이는 사용자가 선호하는 설정을 기억하여 사용자 경험을 향상시킵니다.
```

---

## 7. 데이터 사용 인증 체크리스트

Chrome Web Store에서 체크해야 할 항목:

- [x] 이 확장 프로그램은 개인 식별 정보를 수집하지 않습니다
- [x] 이 확장 프로그램은 사용자 데이터를 판매하지 않습니다
- [x] 이 확장 프로그램은 관련 없는 목적으로 데이터를 사용하지 않습니다
- [x] 이 확장 프로그램은 신용도 판단에 데이터를 사용하지 않습니다

---

## 빠른 복사용 (영문)

### Single Purpose:
```
SelectChatGPT allows users to select specific messages from ChatGPT shared conversations and export them as shareable links, Markdown, PNG images, or PDF documents.
```

### Remote Code:
```
This extension does NOT use any remote code. All JavaScript code is bundled within the extension package. External communication is limited to API calls for creating share links and Google Analytics for anonymous usage statistics.
```

### Host Permissions:
```
Required to detect ChatGPT shared conversation pages (/share/*), inject message selection UI (checkboxes), and read selected messages for export. Only activates on shared pages, not regular chat.
```

### activeTab:
```
Used to access the current ChatGPT shared page when user clicks the extension icon, enabling popup display and content script communication. Only activates on explicit user action.
```

### clipboardWrite:
```
Enables copying share links and Markdown content to clipboard when user clicks Copy buttons. Core sharing feature that only writes to clipboard on explicit user action.
```

### storage:
```
Saves user export preferences locally (PDF settings, style options, margins). All data stored on user's device only, never sent to external servers.
```
