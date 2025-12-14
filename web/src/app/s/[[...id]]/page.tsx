import { SharePageCSR } from './SharePageCSR';

// Optional catch-all route - /s/ 와 /s/[id] 모두 처리
// Static Export에서 /s/ 경로에 대한 정적 페이지 생성
// 클라이언트에서 URL을 파싱하여 ID를 추출
export function generateStaticParams() {
  // 빈 배열을 반환하면 /s/ 경로에 대한 페이지만 생성
  // Nginx SPA fallback으로 /s/[id] 경로도 이 페이지로 처리됨
  return [{ id: [] }];
}

export default function SharePage() {
  return <SharePageCSR />;
}
