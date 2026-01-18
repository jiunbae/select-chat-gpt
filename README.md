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

### 빠른 시작

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
pnpm dev
```

## 개발 환경

### 방법 1: 한 번에 실행 (권장)

```bash
pnpm docker:db   # MongoDB 실행
pnpm dev         # Server + Web + Extension 모두 실행 (핫 리로드)
```

### 방법 2: 개별 실행

```bash
pnpm docker:db    # MongoDB 실행
pnpm dev:server   # 터미널 1 - 백엔드 서버
pnpm dev:web      # 터미널 2 - 웹 프론트엔드
pnpm dev:ext      # 터미널 3 - 크롬 확장
```

### 방법 3: Docker로 전체 실행 (로컬 테스트)

```bash
pnpm docker:up    # MongoDB + Server + Web 전부 Docker로 실행
pnpm dev:ext      # Extension만 별도 실행

# 로그 확인
pnpm docker:logs

# 중지
pnpm docker:down
```

### 환경별 API URL

| 환경 | Extension API URL | 설정 파일 |
|------|-------------------|-----------|
| 개발 (`pnpm dev:ext`) | `http://localhost:3001` | `extension/.env.development` |
| 프로덕션 (`pnpm build:ext`) | `https://api.selectchatgpt.im-si.org` | `extension/.env.production` |

### pnpm 명령어

| 명령어 | 설명 |
|--------|------|
| `pnpm install` | 모든 의존성 설치 |
| `pnpm dev` | 모든 서비스 동시 실행 (Server + Web + Extension) |
| `pnpm dev:server` | 백엔드 서버만 실행 |
| `pnpm dev:web` | 웹 프론트엔드만 실행 |
| `pnpm dev:ext` | 크롬 확장만 실행 (개발 모드) |
| `pnpm build` | 전체 빌드 |
| `pnpm build:ext` | 크롬 확장 프로덕션 빌드 |
| `pnpm docker:db` | MongoDB만 Docker로 실행 |
| `pnpm docker:up` | 전체 서비스 Docker로 실행 |
| `pnpm docker:down` | Docker 서비스 중지 |
| `pnpm docker:release` | 이미지 빌드 + Registry Push |

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

## GitOps 배포

### 아키텍처

```
GitHub: select-chat-gpt ──mirror──→ Gitea: select-chat-gpt
                                           │
                                           ↓
                                   Gitea Actions (CI)
                                           │
                                     이미지 빌드/푸시
                                           │
                                           ↓
GitHub: jiunbae/IaC ←──── kustomization.yaml 업데이트 (newTag)
         │
         ↓
   ArgoCD 감시 → K8s 자동 배포
```

### 배포 흐름

1. **코드 Push**: `main` 브랜치에 push
2. **Mirror Sync**: GitHub → Gitea 자동 동기화
3. **CI 빌드**: Gitea Actions가 Docker 이미지 빌드 및 Registry push
4. **매니페스트 업데이트**: CI가 IaC 레포의 `kustomization.yaml` 업데이트
5. **자동 배포**: ArgoCD가 변경 감지 후 K8s에 자동 배포

### 자동 배포 (GitOps)

```bash
# main 브랜치에 push하면 자동 배포
git push origin main

# 배포 상태 확인
kubectl --kubeconfig ~/.kube/jiun-k3s.yaml get application selectchatgpt -n argocd
kubectl --kubeconfig ~/.kube/jiun-k3s.yaml get pods -n selectchatgpt
```

### 수동 동기화

```bash
# ArgoCD 강제 동기화
kubectl --kubeconfig ~/.kube/jiun-k3s.yaml patch application selectchatgpt -n argocd \
  --type merge -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"hard"}}}'
```

### K8s 매니페스트 (IaC 레포)

매니페스트는 [jiunbae/IaC](https://github.com/jiunbae/IaC) 레포에서 관리됩니다:

```
IaC/kubernetes/apps/selectchatgpt/
├── application.yaml      # ArgoCD Application
├── kustomization.yaml    # 이미지 태그 관리
├── namespace.yaml
├── ingress.yaml
├── mongodb/
│   ├── pvc.yaml
│   ├── deployment.yaml
│   └── service.yaml
├── redis/
│   ├── pvc.yaml
│   ├── deployment.yaml
│   └── service.yaml
├── server/
│   ├── configmap.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── service-metrics.yaml
└── web/
    ├── configmap.yaml
    ├── deployment.yaml
    └── service.yaml
```

### CI 필수 Secrets (Gitea)

| Secret | 설명 |
|--------|------|
| `REGISTRY_USERNAME` | Docker Registry 사용자명 |
| `REGISTRY_PASSWORD` | Docker Registry 비밀번호 |
| `IAC_GITHUB_TOKEN` | GitHub IaC 레포 접근 토큰 |
| `NEXT_PUBLIC_API_URL` | API 서버 URL |
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID |
| `NEXT_PUBLIC_ADSENSE_ID` | Google AdSense ID |

### Extension 배포

Extension은 별도로 빌드하여 Chrome 웹 스토어에 업로드합니다:

```bash
# 프로덕션 빌드
pnpm build:ext

# 결과물: extension/build/chrome-mv3-prod/
```

### 로그 확인

```bash
# Pod 로그
kubectl --kubeconfig ~/.kube/jiun-k3s.yaml logs -n selectchatgpt -l app=server -f
kubectl --kubeconfig ~/.kube/jiun-k3s.yaml logs -n selectchatgpt -l app=web -f

# ArgoCD 상태
kubectl --kubeconfig ~/.kube/jiun-k3s.yaml get application selectchatgpt -n argocd -o yaml
```

### 롤백

```bash
# Git revert로 롤백
git revert <commit-hash>
git push origin main

# 또는 ArgoCD에서 이전 리비전으로 롤백
kubectl --kubeconfig ~/.kube/jiun-k3s.yaml patch application selectchatgpt -n argocd \
  --type merge -p '{"spec":{"source":{"targetRevision":"<previous-commit>"}}}'
```

### 유용한 명령어

| 명령어 | 설명 |
|--------|------|
| `kubectl get pods -n selectchatgpt` | Pod 상태 확인 |
| `kubectl get application -n argocd` | ArgoCD 앱 상태 |
| `kubectl describe pod <name> -n selectchatgpt` | Pod 상세 정보 |
| `kubectl exec -it <pod> -n selectchatgpt -- sh` | Pod 접속 |

## 라이선스

MIT License

