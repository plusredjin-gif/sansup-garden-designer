type Props = { zoom: number; lon: number; lat: number; areaM2?: number; mock: boolean; message?: string };
export default function StatusBar({ zoom, lon, lat, areaM2, mock, message }: Props) {
  return (
    <footer className="statusbar">
      <span>면적: {areaM2 != null ? `${areaM2.toLocaleString("ko-KR")} ㎡` : "-"}</span>
      <span>줌 {zoom}</span>
      <span>중심 {lat.toFixed(5)}, {lon.toFixed(5)}</span>
      {message && <span className="msg">{message}</span>}
      <span className="credit">{mock ? "지도: 목업(Esri World Imagery) · 브이월드 키 넣으면 브이월드(국토교통부)" : "지도: 브이월드(국토교통부)"}</span>
    </footer>
  );
}
