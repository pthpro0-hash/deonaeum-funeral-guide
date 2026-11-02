// 거리 계산과 위치 기준점.
import { get } from "./store.js";

export function km(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLon = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// 기준점: GPS 좌표 > 고른 지역의 대표 좌표
export function origin(regions, regionKey = "here") {
  const here = get(regionKey, null);
  if (!here) return null;
  if (here.lat != null) return { point: [here.lat, here.lon], sido: here.sido, sigungu: here.sigungu };
  const c = regions.centers[`${here.sido} ${here.sigungu}`];
  return { point: c || null, sido: here.sido, sigungu: here.sigungu };
}

// 좌표 있는 곳은 거리순. 좌표가 없으면 같은 시군구(약 10km)·같은 시도(약 60km)로 어림해 끼워 넣는다.
const TIER_KM = [10, 60, 1000];
export function rank(items, org) {
  return items
    .map((f) => {
      const d = org?.point && f.lat != null ? km(org.point, [f.lat, f.lon]) : null;
      const near = org ? (f.sido === org.sido && f.sigungu === org.sigungu ? 0 : f.sido === org.sido ? 1 : 2) : 2;
      return { f, d, near, key: d ?? TIER_KM[near] };
    })
    .sort((a, b) => a.key - b.key);
}

export function locate() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("이 브라우저는 위치 확인을 지원하지 않습니다."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve([+p.coords.latitude.toFixed(4), +p.coords.longitude.toFixed(4)]),
      () => reject(new Error("위치를 확인하지 못했습니다. 지역을 직접 골라 주세요.")),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  });
}

// 가장 가까운 대표 좌표로 시도·시군구를 추정
export function nearestRegion(point, regions) {
  let best = null;
  for (const [k, c] of Object.entries(regions.centers)) {
    const d = km(point, c);
    if (!best || d < best.d) best = { k, d };
  }
  if (!best) return {};
  const [sido, ...rest] = best.k.split(" ");
  return { sido, sigungu: rest.join(" ") };
}
