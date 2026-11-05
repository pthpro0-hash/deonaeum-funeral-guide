// 이 휴대폰에서 매달 알림 켜기·끄기. 서버에는 푸시 구독 주소와 날짜만 보낸다.
import { PUSH_API } from "./config.js";

export const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
export const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
export const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

async function api(path, body) {
  const r = await fetch(PUSH_API + path, body
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    : {});
  if (!r.ok) throw new Error("알림 서버에 연결하지 못했어요. 잠시 뒤 다시 해 주세요.");
  return r.json();
}

const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export async function enablePush(day) {
  if ((await Notification.requestPermission()) !== "granted") {
    throw new Error("알림이 허용되지 않았어요. 휴대폰 설정에서 이 사이트의 알림을 허용해 주세요.");
  }
  const reg = await navigator.serviceWorker.register("sw.js");
  await navigator.serviceWorker.ready;
  const { key } = await api("/vapid");
  const sub = (await reg.pushManager.getSubscription())
    || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64url(key) });
  await api("/subscribe", { endpoint: sub.endpoint, day });
  reg.showNotification("나의 인생 노트", { body: `알림을 켰어요. 매달 ${day}일 오전 9시쯤 알려 드릴게요.`, tag: "life-note-on", lang: "ko", icon: "icons/icon-192.png" });
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await api("/unsubscribe", { endpoint: sub.endpoint });
  await sub.unsubscribe();
}
