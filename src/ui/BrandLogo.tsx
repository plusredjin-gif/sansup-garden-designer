/** 더하기나무 로고 (https://www.plustree.net/ 헤더 이미지, public/brand/plustree_logo.png 137×71) */
export const APP_TITLE = "산숲정원디자이너";
export default function BrandLogo({ height = 28 }: { height?: number }) {
  return <img className="brand-logo" src="/brand/plustree_logo.png" alt="더하기나무" height={height} style={{ height, width: "auto" }} />;
}
