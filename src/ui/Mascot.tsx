/** 사용자 제공 캐릭터 스티커 (public/mascot/*.png). 파일이 없으면 조용히 숨김 */
export type MascotPose = "wave" | "best" | "good" | "point" | "flower" | "cheer" | "wink";
export default function Mascot({ pose, size = 96, className = "", alt = "" }: { pose: MascotPose; size?: number; className?: string; alt?: string }) {
  return (
    <img className={`mascot ${className}`} src={`/mascot/${pose}.png`} width={size} height={size} alt={alt} loading="lazy" decoding="async"
      onError={(e) => { e.currentTarget.style.display = "none"; }} />
  );
}
