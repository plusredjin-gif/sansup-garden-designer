import { useState } from "react";
import { LogIn, Play, ShieldCheck, FolderLock, ServerOff, Undo2, UserX } from "lucide-react";
import Mascot, { type MascotPose } from "./Mascot";
import BrandLogo, { APP_TITLE } from "./BrandLogo";
import { hasGoogleClient, signIn, useAuth } from "../cloud/googleAuth";

type Props = { onEnter: () => void };

const FEATURES: { title: string; text: string; img: string; pose?: MascotPose }[] = [
  { title: "지도 검색 · 위성", text: "주소·지번으로 찾아가 브이월드 위성 위에서 바로 설계해요.", img: "search", pose: "point" },
  { title: "구역 · 존 그리기", text: "다각형·사각형·원·자유곡선·곡선으로 텃밭, 연못, Zone 0~5를 그려요. 면적은 자동 계산.", img: "zones", pose: "good" },
  { title: "분석 도구", text: "해 방향, 10년 기후·강수, 바람장미, 경사·물길, 섹터까지 한 화면에서.", img: "analysis" },
  { title: "식물 길드 60종", text: "실제 자료 기반 60종 식물과 9개 길드. 추정값은 '추정' 표시로 솔직하게.", img: "guild", pose: "flower" },
  { title: "물흐름 · 그늘", text: "물흐름 화살표를 그리고, 북향 보정한 해·그늘 부채로 배치를 가늠해요.", img: "water" },
  { title: "고해상도 사진 배경", text: "드론·항공 사진을 올려 2점 정렬로 맞추고 0.5 m 축척까지 확대.", img: "photo", pose: "cheer" },
  { title: "PNG · PDF 내보내기", text: "그린 도면을 출처 표기와 함께 이미지·A4 PDF로 저장해요.", img: "export" },
];

export default function Landing({ onEnter }: Props) {
  const { session } = useAuth();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function google() {
    if (!hasGoogleClient()) { setMsg("setup"); return; }
    setBusy(true); setMsg(null);
    try { await signIn(); onEnter(); }
    catch (e) { setMsg(`구글 로그인이 끝나지 않았어요: ${(e as Error).message}`); }
    finally { setBusy(false); }
  }

  return (
    <div className="lp">
      <header className="lp-head">
        <a className="lp-brand" href="/" aria-label={`${APP_TITLE} 처음으로`}><BrandLogo height={30} /><span>{APP_TITLE}</span></a>
        <nav className="lp-nav"><a href="#features">기능</a><a href="#login">로그인 안내</a>
          {session ? <button className="lp-btn sm" onClick={onEnter}>작업 화면으로</button> : <button className="lp-btn sm" onClick={google} disabled={busy}>로그인</button>}
        </nav>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-text">
            <Mascot pose="wave" size={120} className="lp-hero-mascot" alt="손 흔드는 캐릭터" />
            <h1>{APP_TITLE}</h1>
            <p className="lp-lead">위성지도 위에 우리 땅의 숲정원을 그리고, 해·바람·물·식물 길드까지 한 번에 설계하는 퍼머컬처 도구.</p>
            <div className="lp-cta">
              {session
                ? <button className="lp-btn primary" onClick={onEnter}><Play size={18} /> {session.user.email} 로 계속하기</button>
                : <button className="lp-btn primary" onClick={google} disabled={busy}><LogIn size={18} /> {busy ? "구글 동의 화면 여는 중…" : "구글로 시작하기"}</button>}
              <button className="lp-btn ghost" onClick={onEnter}>로그인 없이 써보기</button>
            </div>
            {msg === "setup" && (
              <div className="lp-setup" role="alert">
                <b>구글 로그인 설정이 아직 안 됐어요.</b> 관리자가 구글 클라우드 콘솔에서 OAuth 클라이언트 ID를 만들고
                <code>VITE_GOOGLE_CLIENT_ID</code> 로 넣어야 해요 (안내: <code>docs/구글로그인_설정.md</code>).
                지금은 <button className="linklike" onClick={onEnter}>로그인 없이 써보기</button>로 이 브라우저에 저장하며 쓸 수 있어요.
              </div>
            )}
            {msg && msg !== "setup" && <div className="lp-setup" role="alert">{msg}</div>}
            <p className="lp-small">회원가입 없음 · 파일은 내 구글 드라이브에 · 로그인 없이도 이 브라우저에 자동저장</p>
          </div>
          <div className="lp-hero-shot"><img src="/landing/hero.jpg" alt="작업 화면: 위성지도 위 구역·나무·길드 배치" width={1200} height={771} /></div>
        </section>

        <section className="lp-features" id="features">
          <h2>할 수 있는 일</h2>
          <div className="lp-grid">
            {FEATURES.map((f) => (
              <article className="lp-card" key={f.title}>
                <div className="lp-card-img"><img src={`/landing/${f.img}.jpg`} alt={`${f.title} 화면`} loading="lazy" width={1200} height={771} />
                  {f.pose && <Mascot pose={f.pose} size={64} className="lp-card-mascot" />}</div>
                <h3>{f.title}</h3><p>{f.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-login" id="login">
          <div>
            <h2>로그인은 이렇게 돼요</h2>
            <ul>
              <li><UserX size={20} /><span><b>회원가입이 없어요.</b> 구글 계정으로 한 번 동의하면 바로 작업 화면으로 가요.</span></li>
              <li><FolderLock size={20} /><span><b>파일은 내 구글 드라이브에.</b> 드라이브에 ‘정원설계’ 폴더를 만들어 .garden.json 과 배경 사진을 저장해요.</span></li>
              <li><ShieldCheck size={20} /><span><b>이 앱이 만든 파일만 봐요.</b> 드라이브 권한은 <code>drive.file</code> 범위라 다른 파일은 열람·수정할 수 없어요.</span></li>
              <li><ServerOff size={20} /><span><b>우리 서버에는 아무것도 저장하지 않아요.</b> 도면·사진·토큰은 내 브라우저와 내 드라이브에만 있어요.</span></li>
              <li><Undo2 size={20} /><span><b>언제든 끊을 수 있어요.</b> 로그아웃하거나 구글 계정 설정 → 보안 → ‘타사 앱 액세스’에서 권한을 취소하면 돼요.</span></li>
            </ul>
          </div>
          <Mascot pose="wink" size={160} className="lp-login-mascot" alt="윙크하는 캐릭터" />
        </section>
      </main>

      <footer className="lp-foot">
        <span>{APP_TITLE}</span>
        <a href="https://www.plustree.net/" target="_blank" rel="noopener">by <BrandLogo height={22} /> 더하기나무</a>
        <span className="lp-small">지도: 브이월드(국토교통부)</span>
      </footer>
    </div>
  );
}
