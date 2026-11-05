// 해시 라우터. 화면마다 render(root, params) 를 가진 모듈을 부른다.
import * as home from "./views/home.js";
import * as after from "./views/after.js";
import * as before from "./views/before.js";
import * as sangjo from "./views/sangjo.js";
import * as about from "./views/about.js";
import * as note from "./views/note.js?v=20261106p";
import * as help from "./views/help.js";
import * as privacy from "./views/privacy.js";
import { syncNav } from "./nav.js";
import { get } from "./store.js";
import { bindMore, bindSave } from "./ui.js";

const ROUTES = [
  [/^\/$/, home.render],
  [/^\/after\/start$/, after.renderStart],
  [/^\/after(?:\/(\w+))?$/, after.render],
  [/^\/before$/, before.renderMenu],
  [/^\/before\/halls$/, before.renderHalls],
  [/^\/before\/rites$/, before.renderRites],
  [/^\/before\/sangjo$/, sangjo.renderList],
  [/^\/before\/sangjo\/(s\d+)$/, sangjo.renderDetail],
  [/^\/note(?:\/(\w+))?$/, note.render],
  [/^\/plan(?:\/(\w+))?$/, note.redirectOld],
  [/^\/about$/, about.render],
  [/^\/help$/, help.render],
  [/^\/privacy$/, privacy.render],
];

const root = document.getElementById("app");
const nav = document.getElementById("gnav");
bindSave(root);
bindMore(root);

async function route() {
  const path = location.hash.replace(/^#/, "") || "/";
  const hit = ROUTES.find(([re]) => re.test(path));
  const [re, fn] = hit || ROUTES[0];
  const params = path.match(re)?.slice(1) || [];
  syncNav(nav, path, get("started", false));
  root.innerHTML = `<div class="loading">불러오는 중…</div>`;
  try {
    await fn(root, ...params);
  } catch (err) {
    console.error(err);
    root.innerHTML = `<div class="loading">화면을 여는 중 문제가 생겼습니다. 새로고침해 주세요.<br><a href="#/">처음으로</a></div>`;
  }
  window.scrollTo(0, 0);
  document.title = (root.querySelector("h1, h2")?.textContent?.trim() || "") + (path === "/" ? "" : " · ") + "더나음 장례안내";
  if (path === "/") document.title = "더나음 장례안내";
}

window.addEventListener("hashchange", route);
route();
