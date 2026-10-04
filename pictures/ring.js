import {ellipse,poly,ring,stroke} from "../engine/paint.js";
import {W,H,GOLD,path,rect} from "./drawing.js";

const C=[1600,670];
export const config={
  panel:{w:W,h:H},res:2,background:"ground",
  camera:{keys:[[6.6,1600,670,1460],[8.1,1600,670,1730],[9.7,1610,673,1480],[11.2,1580,630,1280],[12,1600,575,1240],[13.6,1600,575,1240]],tilt:[[6.6,12],[8.1,19],[11,27],[12,10]],yaw:[[6.6,4],[8.1,5],[11,-6],[12,0]],aperture:.031,drift:.002},
  light:{key:{az:[[6.6,105],[9,145],[12,180]],el:27,color:[.73,.80,1],power:1.5},fill:{az:-50,el:40,color:[.52,.58,.78],power:.35},sky:[.06,.075,.13],ground:[.018,.018,.023],exposure:.7,grout:"#5b5750",wet:[.5,1.7],points:[{x:[[6.6,1170],[9,1420],[12,1810]],y:[[6.6,420],[12,400]],z:240,color:"#ffb76b",power:.40,flicker:.09},{x:2020,y:850,z:220,color:"#f9dba0",power:.22}]},
  sinopia:{groups:[["ground","cloth"],["gold","edge","shade"]]}
};
export const regions=()=>[
  {name:"ground",size:11,mode:"contour",mat:"glass",tray:["#050912","#090f1b","#101a2a","#172237","#202e46"]},
  {name:"cloth",size:8,mode:"flow",angle:.3,mat:"glass",tray:["#111b2c","#1b2940","#263955","#3b4b65"]},
  {name:"gold",size:4.8,mode:"radial",center:C,mat:"gold",tray:GOLD},
  {name:"edge",size:3.1,mode:"radial",center:C,mat:"gold",tray:["#b38d42","#d9b25e","#efd38d","#f5dfaa"]},
  {name:"shade",size:4.2,mode:"radial",center:C,mat:"gold",tray:["#493214","#72521f","#98722b","#b89446"]},
  {name:"shadow",size:9,mode:"contour",mat:"basalt",tray:["#030609","#070b10","#101522"]}
];
export function draw(g,m,D){
  D.fill(rect(0,0,W,H),"ground",D.radial(1600,660,100,1400,[[0,"#202e46"],[.6,"#101a2a"],[1,"#050912"]]));
  // Diagonal folded cloth gives the gold a quiet, tactile dark setting.
  for(let i=0;i<7;i++){
    const y=280+i*175;
    D.fill(path(`M0 ${y}Q800 ${y-105} 1500 ${y+65}T3200 ${y+120}L3200 ${y+160}Q2100 ${y+155} 1400 ${y+104}T0 ${y+32}Z`),"cloth",i%2?"#1b2940":"#111b2c");
  }
  D.fill(ellipse(1620,757,419,261,-.09),"shadow","#030609");
  // An oblique gold band with an inner wall and a visible lower thickness.
  D.fill(ellipse(1600,698,413,290,-.13),"shade",D.linear(1200,450,1980,930,[[0,"#98722b"],[.6,"#72521f"],[1,"#493214"]]));
  D.fill(ellipse(1600,653,413,272,-.13),"gold",D.linear(1280,410,1880,890,[[0,"#efd38d"],[.24,"#d9b25e"],[.5,"#8a6a2e"],[.72,"#d9b25e"],[1,"#b38d42"]]));
  D.fill(ellipse(1600,634,320,190,-.13),"shade",D.linear(1320,410,1800,760,[[0,"#493214"],[.5,"#98722b"],[1,"#b89446"]]));
  D.fill(ellipse(1603,612,301,155,-.13),"ground","#101a2a");
  const outer=new Path2D();outer.ellipse(1600,652,407,266,-.13,Math.PI*.88,Math.PI*1.92);
  D.line(outer,7,"edge","#efd38d");
  const inner=new Path2D();inner.ellipse(1600,637,320,190,-.13,0,Math.PI*.94);
  D.line(inner,5,"edge","#d9b25e");
  // No invented writing: the stone and the reflected fire carry this close-up.
}
