import { useState } from "react";
import { Search, MapPin } from "lucide-react";
import { searchAddress, hasKey, type SearchResult } from "../lib/vworld";

type Props = { onPick: (r: SearchResult, query: string) => void; onClose: () => void };

export default function SearchPopover({ onPick, onClose }: Props) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SearchResult[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true); setErr("");
    try { setItems(await searchAddress(q || " ")); }
    catch { setErr("검색에 실패했어요. 키나 인터넷을 확인해 주세요."); }
    finally { setBusy(false); }
  }
  return (
    <div className="popover" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <form onSubmit={run} className="search-row">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="도로명 또는 지번 (예: 판교로 242)" />
        <button className="btn primary" disabled={busy} title="검색 (Enter)"><Search size={16} /></button>
      </form>
      {!hasKey() && <p className="hint">목업 모드: 키가 없어서 <b>데모 장소 목록</b>만 검색돼요.</p>}
      {err && <p className="hint err">{err}</p>}
      {items && (
        <ul className="results">
          {items.length === 0 && <li className="empty">결과 없음</li>}
          {items.map((r, i) => (
            <li key={i}><button onClick={() => onPick(r, q)}>
              <MapPin size={14} /> <span><b>{r.title}</b>{r.road && r.road !== r.title && <small>{r.road}</small>}{r.parcel && <small>지번 {r.parcel}</small>}
              {r.source === "demo" && <em className="demo">데모</em>}</span>
            </button></li>
          ))}
        </ul>
      )}
    </div>
  );
}
