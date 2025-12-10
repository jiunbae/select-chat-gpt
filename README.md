# SelectChatGPT

ChatGPT 공유 대화에서 특정 메시지만 선택하여 새로운 공유 링크를 생성하는 크롬 확장 프로그램

## 기능

- **메시지 선택**: ChatGPT 공유 페이지에서 원하는 메시지만 체크박스로 선택
- **Shift 클릭 범위 선택**: 여러 메시지를 한 번에 선택
- **새 공유 링크 생성**: 선택한 메시지만 포함된 새로운 공유 URL 생성
- **마크다운 내보내기**: 선택한 대화를 마크다운 형식으로 복사/다운로드
- **ChatGPT 스타일 렌더링**: 공유 페이지에서 원본과 유사한 UI로 표시

## 프로젝트 구조

```
select-chat-gpt/
├── extension/          # 크롬 확장 프로그램 (Plasmo + React)
├── server/             # 백엔드 API 서버 (Express + MongoDB)
└── web/                # 공유 페이지 프론트엔드 (Next.js)
```

## 시작하기

### 필수 요구사항

- Node.js 18+
- Docker & Docker Compose (MongoDB 실행용)
- pnpm

### 빠른 시작 (Docker 사용)

```bash
# 1. 저장소 클론
git clone https://github.com/selectchatgpt/select-chat-gpt.git
cd select-chat-gpt

# 2. 의존성 설치
pnpm install

# 3. 환경 변수 설정
cp server/.env.example server/.env

# 4. MongoDB 시작 (Docker)
pnpm docker:db

# 5. 개발 서버 실행
pnpm dev:server  # 터미널 1
pnpm dev:web     # 터미널 2
pnpm dev:ext     # 터미널 3
```

### Docker로 전체 서비스 실행 (프로덕션)

```bash
# 전체 빌드 및 실행 (MongoDB + Server + Web)
pnpm docker:up

# 로그 확인
pnpm docker:logs

# 중지
pnpm docker:down
```

### pnpm 명령어

| 명령어 | 설명 |
|--------|------|
| `pnpm install` | 모든 의존성 설치 |
| `pnpm dev` | 모든 서비스 동시 실행 |
| `pnpm dev:server` | 백엔드 서버만 실행 |
| `pnpm dev:web` | 웹 프론트엔드만 실행 |
| `pnpm dev:ext` | 크롬 확장만 실행 |
| `pnpm docker:db` | MongoDB만 Docker로 실행 |
| `pnpm docker:up` | 전체 서비스 Docker로 실행 |
| `pnpm docker:down` | Docker 서비스 중지 |
| `pnpm docker:build:registry` | Private Registry용 이미지 빌드 |
| `pnpm docker:push` | Private Registry에 이미지 Push |
| `pnpm docker:release` | 빌드 + Push 한 번에 실행 |
| `pnpm build` | 전체 빌드 |

### 환경 변수

**server/.env**
```bash
PORT=3001
MONGODB_URI=mongodb://localhost:27017/selectchatgpt
CORS_ORIGIN=http://localhost:3000,chrome-extension://
SHARE_BASE_URL=http://localhost:3000/s
```

**web/.env.local** (선택사항)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 확장 프로그램 설치 (개발 모드)

1. Chrome에서 `chrome://extensions` 열기
2. "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `extension/build/chrome-mv3-dev` 폴더 선택

## 사용 방법

1. ChatGPT 공유 링크 열기 (예: `https://chatgpt.com/share/xxx`)
2. 각 메시지 옆의 체크박스 클릭하여 선택
3. 하단 플로팅 바에서 "Create Share Link" 클릭
4. 생성된 링크 복사 및 공유

## 기술 스택

### 확장 프로그램
- Plasmo (Manifest V3)
- React + TypeScript
- Tailwind CSS
- Turndown (HTML → Markdown)

### 백엔드
- Node.js + Express
- MongoDB + Mongoose
- DOMPurify (XSS 방지)

### 프론트엔드
- Next.js 15
- React 19
- Tailwind CSS
- React Markdown

## K3s 배포

### 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│  Tailscale Network                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  NAS (Synology)              VMM K3s Cluster           │
│  ├── registry.jiun.dev       ├── selectchatgpt.jiun.dev│
│  └── Docker Registry         ├── api.selectchatgpt...  │
│                              ├── MongoDB                │
│                              ├── Server                 │
│                              └── Web                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### K8s 매니페스트 구조

```
k8s/
├── namespace.yaml
├── ingress.yaml
├── cert-manager/
│   ├── clusterissuer.yaml
│   └── certificate.yaml
├── mongodb/
│   ├── pvc.yaml
│   ├── deployment.yaml
│   └── service.yaml
├── server/
│   ├── configmap.yaml
│   ├── deployment.yaml
│   └── service.yaml
└── web/
    ├── configmap.yaml
    ├── deployment.yaml
    └── service.yaml
```

### 최초 배포

```bash
# 1. Private Registry에 이미지 Push
pnpm docker:release

# 2. K3s에서 매니페스트 적용
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/mongodb/
kubectl apply -f k8s/server/
kubectl apply -f k8s/web/
kubectl apply -f k8s/cert-manager/
kubectl apply -f k8s/ingress.yaml

# 3. 상태 확인
kubectl get pods -n selectchatgpt
```

### 업데이트 배포

코드 변경 후 업데이트:

```bash
# 1. 이미지 빌드 & Push
pnpm docker:release

# 2. K3s에서 재배포
kubectl rollout restart deployment/server -n selectchatgpt
kubectl rollout restart deployment/web -n selectchatgpt

# 3. 상태 확인
kubectl get pods -n selectchatgpt -w
```

### 로그 확인

```bash
# 전체 로그
kubectl logs -n selectchatgpt -l app=server -f
kubectl logs -n selectchatgpt -l app=web -f

# 특정 Pod 로그
kubectl logs -n selectchatgpt <pod-name>
```

### 유용한 명령어

| 명령어 | 설명 |
|--------|------|
| `kubectl get pods -n selectchatgpt` | Pod 상태 확인 |
| `kubectl get svc -n selectchatgpt` | 서비스 확인 |
| `kubectl get ingress -n selectchatgpt` | Ingress 확인 |
| `kubectl describe pod <name> -n selectchatgpt` | Pod 상세 정보 |
| `kubectl exec -it <pod> -n selectchatgpt -- sh` | Pod 접속 |

## 라이선스

MIT License
