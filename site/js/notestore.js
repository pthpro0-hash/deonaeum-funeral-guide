// 인생 노트 저장. 고칠 때마다 "마지막으로 다듬은 날"을 함께 남긴다.
import { get, set } from "./store.js";

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function noteSet(key, value) {
  set(key, value);
  if (key !== "note.profile") set("note.profile", { ...get("note.profile", {}), updated: today() });
}
