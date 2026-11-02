// 상단 고정 메뉴. 메뉴 자체는 index.html 에 있고, 여기서는 지금 화면에 해당하는 칸만 표시한다.
export const NAV = [
  { key: "after", prefix: "/after" },
  { key: "before", prefix: "/before" },
  { key: "plan", prefix: "/plan" },
  { key: "help", prefix: "/help" },
];

export function navKey(path) {
  return NAV.find((n) => path === n.prefix || path.startsWith(n.prefix + "/"))?.key ?? null;
}

export function syncNav(nav, path, started) {
  const cur = navKey(path);
  for (const a of nav.querySelectorAll("a[data-nav]")) {
    if (a.dataset.nav === cur) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  // 처음이면 몇 가지 질문부터, 이미 시작했으면 바로 할 일로
  const after = nav.querySelector('a[data-nav="after"]');
  if (after) after.href = started ? "#/after/h0" : "#/after/start";
}
