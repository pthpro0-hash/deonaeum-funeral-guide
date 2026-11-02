"""공식 파일을 data/raw/ 로 내려받는다. 인증키가 필요 없는 경로만 쓴다."""
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

from .sources import DATASETS, FTC

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
UA = {"User-Agent": "Mozilla/5.0 (deonaeum-funeral-guide data collector)"}


def fetch_datago(pk: str, out: Path, session: requests.Session) -> dict:
    page = session.get(f"https://www.data.go.kr/data/{pk}/fileData.do", timeout=60)
    page.raise_for_status()
    m = re.search(r"fn_fileDataDown\('(\d+)',\s*'([^']+)'", page.text)
    if not m:
        raise RuntimeError(f"{pk}: 다운로드 정보를 찾지 못함")
    title = re.search(r"<title>([^<|]+)", page.text)
    base = re.search(r"_(\d{8})", title.group(1) if title else "")
    r = session.post(
        "https://www.data.go.kr/tcs/dss/selectFileDataDownload.do",
        data={"publicDataDetailPk": m.group(2), "publicDataPk": pk, "atchFileId": "",
              "fileDetailSn": "1", "publicDataTyCode": "PR0051"},
        headers={"X-Requested-With": "XMLHttpRequest"}, timeout=60)
    r.raise_for_status()
    info = r.json()
    if not info.get("atchFileId"):
        raise RuntimeError(f"{pk}: atchFileId 없음")
    f = session.get("https://www.data.go.kr/cmm/cmm/fileDownload.do",
                    params={"atchFileId": info["atchFileId"], "fileDetailSn": info["fileDetailSn"]}, timeout=120)
    f.raise_for_status()
    if f.content[:1] == b"<":
        raise RuntimeError(f"{pk}: 파일 대신 HTML이 왔음 (다운로드 제한 가능성)")
    out.write_bytes(f.content)
    d = base.group(1) if base else None
    return {"base_date": f"{d[:4]}-{d[4:6]}-{d[6:]}" if d else None}


def fetch_ftc(out: Path, session: requests.Session) -> dict:
    r = session.get(FTC["download"], timeout=180)
    r.raise_for_status()
    if r.content[:4] != bytes.fromhex("D0CF11E0"):
        raise RuntimeError("공정위 파일이 XLS 형식이 아님")
    out.write_bytes(r.content)
    return {"base_date": datetime.now().strftime("%Y-%m-%d")}


def main() -> dict:
    RAW.mkdir(parents=True, exist_ok=True)
    s = requests.Session()
    s.headers.update(UA)
    meta = {}
    for key, ds in DATASETS.items():
        meta[key] = fetch_datago(ds["pk"], RAW / f"{key}.csv", s)
        time.sleep(1)
    meta["sangjo"] = fetch_ftc(RAW / "ftc.xls", s)
    stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    for v in meta.values():
        v["fetched_at"] = stamp
    (RAW / "fetch-meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return meta


if __name__ == "__main__":
    print(json.dumps(main(), ensure_ascii=False, indent=2))
