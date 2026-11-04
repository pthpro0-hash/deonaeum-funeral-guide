// 영정사진 만들기. 사진은 이 기기 안에서만 자르고 꾸미며, 서버로 보내지 않는다.
// 결과는 8×10인치(20×25cm) 300dpi = 2400×3000 픽셀. 사진관 인화 규격과 비율이 같다.

export const OUT_W = 2400;
export const OUT_H = 3000;
export const ASPECT = OUT_W / OUT_H; // 4:5
export const MAX_ZOOM = 4;

export const FRAMES = [
  { id: "none", label: "액자 없음" },
  { id: "frame", label: "검은 액자" },
  { id: "ribbon", label: "액자 + 근조 리본" },
];

export const DEFAULTS = { zoom: 1, cx: 0.5, cy: 0.42, mono: true, bright: 0, frame: "ribbon" };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// 원본에서 잘라 낼 영역. 4:5 비율 중 가장 큰 영역을 기준으로 zoom만큼 좁히고, 중심(cx, cy: 0~1)을 옮긴다.
export function cropRect(iw, ih, { zoom = 1, cx = 0.5, cy = 0.5 } = {}) {
  const z = clamp(zoom, 1, MAX_ZOOM);
  const [bw, bh] = iw / ih > ASPECT ? [ih * ASPECT, ih] : [iw, iw / ASPECT];
  const sw = bw / z, sh = bh / z;
  const sx = clamp(cx * iw - sw / 2, 0, iw - sw);
  const sy = clamp(cy * ih - sh / 2, 0, ih - sh);
  return { sx, sy, sw, sh, cx: (sx + sw / 2) / iw, cy: (sy + sh / 2) / ih };
}

// 사진이 들어갈 자리(액자 안쪽). 액자 두께는 폭의 6%.
export function photoBox(W, H, frame) {
  if (frame === "none") return { x: 0, y: 0, w: W, h: H };
  const t = Math.round(W * 0.06);
  return { x: t, y: t, w: W - 2 * t, h: H - 2 * t };
}

// 인쇄했을 때 선명한지: 잘라 낸 원본 높이를 10인치로 나눈 dpi로 본다.
export function printQuality(sh) {
  const dpi = sh / 10;
  if (dpi >= 200) return { level: "good", text: "8×10인치로 인화해도 선명합니다." };
  if (dpi >= 120) return { level: "ok", text: "인화할 수 있지만, 더 큰 원본 사진이 있으면 더 선명합니다." };
  return { level: "low", text: "사진이 작아 인화하면 흐릿할 수 있습니다. 원본 파일(카메라·휴대폰 앨범의 원래 사진)을 쓰세요." };
}

// 밝기(-30~30)와 흑백을 픽셀에 직접 적용한다. ctx.filter가 없는 브라우저도 같은 결과가 나오게.
export function tone(data, { mono, bright }) {
  const k = 1 + bright / 100;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] * k, g = data[i + 1] * k, b = data[i + 2] * k;
    if (mono) {
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      r = g = b = y;
    }
    data[i] = r > 255 ? 255 : r;
    data[i + 1] = g > 255 ? 255 : g;
    data[i + 2] = b > 255 ? 255 : b;
  }
  return data;
}

// 캔버스에 영정사진 한 장을 그린다. src는 Image 또는 ImageBitmap.
export function draw(ctx, src, st, W, H) {
  const iw = src.width, ih = src.height;
  const c = cropRect(iw, ih, st);
  const box = photoBox(W, H, st.frame);
  ctx.save();
  ctx.fillStyle = "#141210";
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, c.sx, c.sy, c.sw, c.sh, box.x, box.y, box.w, box.h);
  if (st.mono || st.bright) {
    const img = ctx.getImageData(box.x, box.y, box.w, box.h);
    tone(img.data, st);
    ctx.putImageData(img, box.x, box.y);
  }
  if (st.frame !== "none") {
    // 액자 안쪽의 가는 금속선
    const lw = Math.max(1, Math.round(W * 0.004));
    ctx.strokeStyle = "#8c8273";
    ctx.lineWidth = lw;
    ctx.strokeRect(box.x - lw / 2, box.y - lw / 2, box.w + lw, box.h + lw);
  }
  if (st.frame === "ribbon") ribbon(ctx, box);
  ctx.restore();
  return c;
}

// 근조 리본: 사진 위쪽 두 모서리를 비스듬히 가로지르는 검은 띠
function ribbon(ctx, box) {
  const band = box.w * 0.075, reach = box.w * 0.26;
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.fillStyle = "#0e0d0c";
  for (const side of [0, 1]) {
    const x0 = side ? box.x + box.w : box.x;
    const dir = side ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(x0 + dir * reach, box.y);
    ctx.lineTo(x0 + dir * (reach + band * Math.SQRT2), box.y);
    ctx.lineTo(x0, box.y + reach + band * Math.SQRT2);
    ctx.lineTo(x0, box.y + reach);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// 파일 → 그릴 수 있는 이미지. 휴대폰 사진의 회전 정보(EXIF)를 따른다.
export async function decode(blob) {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(blob, { imageOrientation: "from-image" }); } catch { /* 아래로 */ }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}
