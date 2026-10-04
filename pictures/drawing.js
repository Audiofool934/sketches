import { circle, ellipse, poly, stroke } from "../engine/paint.js";

export const W = 3200;
export const H = 1800;
export const GOLD = ["#8a6a2e", "#b38d42", "#d9b25e", "#efd38d"];
export const SILVER = ["#627785", "#8fabb8", "#b7c9d0", "#e2e9e6"];
export const path = (s) => new Path2D(s);
export const rect = (x, y, w, h) => poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]);

// Small travellers are shaped as cloaks, heads, packs, feet and walking sticks.
// Their physical size in the landscape matters more than facial detail.
export function traveller(D, x, y, h, options = {}) {
  const {region="figure", color="#17231e", face=1, staff=false, pack=false} = options;
  const pt=(a,b)=>[x+face*a*h,y+b*h];
  D.fill(ellipse(...pt(0,-0.84),h*.10,h*.12),region,color);
  const cloak = [pt(-.02,-.75),pt(.12,-.61),pt(.19,-.10),pt(-.17,-.16),pt(-.12,-.59)];
  D.fill(poly(cloak),region,color);
  D.fill(stroke([pt(-.02,-.16),pt(-.11,-.03),pt(-.20,0)],h*.075,h*.035),region,color);
  D.fill(stroke([pt(.085,-.17),pt(.16,-.025),pt(.27,0)],h*.07,h*.04),region,color);
  if(pack)D.fill(ellipse(...pt(-.13,-.57),h*.12,h*.17),region,color);
  D.fill(stroke([pt(.10,-.62),pt(.22,-.45),pt(.32,-.48)],h*.065,h*.04),region,color);
  if(staff)D.fill(stroke([pt(.36,-.87),pt(.31,-.01)],h*.025,h*.03),region,color);
}

export function star(cx,cy,r,points=8) {
  const ps=[];
  for(let k=0;k<points*2;k++){
    const a=-Math.PI/2+k*Math.PI/points;
    const v=k%2?r*.25:r;
    ps.push([cx+Math.cos(a)*v,cy+Math.sin(a)*v]);
  }
  return poly(ps);
}

export function arch(cx, base, width, height) {
  const p=new Path2D();
  p.moveTo(cx-width/2,base);
  p.lineTo(cx-width/2,base-height+width/2);
  p.arc(cx,base-height+width/2,width/2,Math.PI,Math.PI*2);
  p.lineTo(cx+width/2,base);
  return p;
}

export function clouds(D, bands, region, color) {
  for(const [x,y,w,h] of bands){
    D.fill(path(`M${x-w/2} ${y} C${x-w*.18} ${y-h},${x+w*.12} ${y-h*.8},${x+w/2} ${y} C${x+w*.1} ${y+h*.25},${x-w*.2} ${y+h*.15},${x-w/2} ${y}Z`),region,color);
  }
}
