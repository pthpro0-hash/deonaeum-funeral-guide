// 배포 설정. 알림 서버 주소와 운영자 정보가 모두 채워져야 "매달 알림 받기"가 화면에 나온다.
// 알림 서버: worker/ (Cloudflare Workers). 운영자 정보는 개인정보처리방침에 공개된다.
export const PUSH_API = ""; // 예: "https://deonaeum-life-note.계정이름.workers.dev"
export const OPERATOR = null; // 예: { name: "더나음", ceo: "홍길동", contact: "help@example.com", officer: "홍길동 (help@example.com)" }
export const PRIVACY_DATE = "2026-11-06"; // 개인정보처리방침 시행일

export const pushReady = () => !!(PUSH_API && OPERATOR);
