import {readFileSync, writeFileSync} from 'node:fs';
const file=JSON.parse(readFileSync('../shots/stage3-roundtrip.garden.json','utf8'));
function mini(id,label){
 const f=file.features.find(f=>f.id===id), ring=f.geometry.coordinates[0];
 const xs=ring.map(c=>c[0]),ys=ring.map(c=>-c[1]);
 const minX=Math.min(...xs),minY=Math.min(...ys),w=Math.max(...xs)-minX,h=Math.max(...ys)-minY;
 const scale=150/Math.max(w,h);
 const points=ring.map(([x,y])=>`${30+(x-minX)*scale},${30+(-y-minY)*scale}`).join(' ');
 return `<figure><svg role="img" aria-label="${label}" width="220" height="220" viewBox="0 0 220 220"><polygon points="${points}" fill="#35624c" stroke="#b9efbe" stroke-width="2"/></svg><figcaption>${label} · ${f.props.areaM2}㎡</figcaption></figure>`;
}
let html=readFileSync('../shots/19_stage3_controls_preview.html','utf8');
const shapes=['circle','freehand','smooth'].map((id,i)=>mini(id,['원형 구역 (반경 12m)','자유곡선 구역','매끄러운 곡선 텃밭'][i])).join('');
html=html.replace('<div style="display:grid;', `<div style="display:flex;gap:12px">${shapes}</div><div style="display:grid;`);
writeFileSync('../shots/19_stage3_local_preview.html',html);
console.log('Static SVG + React controls preview: shots/19_stage3_local_preview.html');
