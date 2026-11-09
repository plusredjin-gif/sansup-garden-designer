import { useEffect, useState } from "react";
import App from "./App";
import Landing from "./ui/Landing";
import { APP_TITLE } from "./ui/BrandLogo";

/** '/' = 첫 화면, '/app' = 작업 화면 (라우터 라이브러리 없이 history API) */
export default function Root() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const h = () => setPath(location.pathname);
    addEventListener("popstate", h);
    return () => removeEventListener("popstate", h);
  }, []);
  const go = (to: string) => { history.pushState(null, "", to); setPath(to); scrollTo(0, 0); };
  useEffect(() => { if (!path.startsWith("/app")) document.title = `${APP_TITLE} — 퍼머컬처 숲정원 설계`; }, [path]);
  return path.startsWith("/app") ? <App onHome={() => go("/")} /> : <Landing onEnter={() => go("/app")} />;
}
