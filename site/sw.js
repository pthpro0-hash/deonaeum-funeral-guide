// 매달 알림만 맡는 서비스 워커. 화면 파일을 저장(캐시)하지 않는다 — 늘 최신 사이트를 받게.
// 서버는 내용 없는 푸시만 보내므로 알림 문구는 여기 고정한다.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  e.waitUntil(self.registration.showNotification("나의 인생 노트", {
    body: "이번 달 지킴이 안내를 보낼 때예요. 눌러서 안내를 보내 주세요.",
    tag: "life-note-monthly",
    lang: "ko",
    icon: "icons/icon-192.png",
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL("./#/note/notice", self.registration.scope).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const w = wins.find((c) => c.url.startsWith(self.registration.scope));
    if (w) { await w.navigate(url).catch(() => {}); return w.focus(); }
    return self.clients.openWindow(url);
  })());
});
