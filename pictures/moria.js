import {circle,ellipse,poly,stroke} from "../engine/paint.js";
import {rng} from "../engine/util.js";
import {W,H,SILVER,GOLD,path,rect,star,arch,traveller} from "./drawing.js";

const GATE=[1600,1120];
export const config={
  panel:{w:W,h:H},res:2,background:"cliff",
  camera:{keys:[[12,1600,680,1450],[13.6,1610,880,2700],[15.4,1620,900,2660],[17.3,1660,840,2300],[19.1,1740,810,2170],[21,1740,810,2170]],tilt:[[12,10],[13.6,3],[17.3,6],[19.1,9]],yaw:[[12,0],[17.3,2],[19.1,4]],aperture:.022,drift:.002},
  light:{key:{az:132,el:[[12,17],[19.1,25]],color:[.66,.83,1],power:[[12,1.5],[15,2.0],[19.1,2.15]]},fill:{az:-70,el:38,color:[.35,.55,.72],power:.48},sky:[.05,.11,.18],ground:[.016,.025,.035],exposure:.65,grout:"#5b6470",wet:[.75,1.5],points:[{x:1630,y:480,z:250,color:"#b7dceb",power:[[12,.05],[14.4,.12],[16.2,.23],[19.1,.20]]},{x:1520,y:1150,z:100,color:"#eac47c",power:.045,flicker:.025}]},
  ripple:{dir:[1,.05],wavelength:210,speed:85},
  rims:[{figures:["figure"],light:[1452,1160],warm:"gold",width:3,min:.2}],
  sinopia:{groups:[["cliff","face","seam"],["door"],["silver","star"],["water","reflection"]]}
};
export const regions=()=>[
  {name:"cliff",size:15,mode:"flow",angle:Math.PI/2,mat:"basalt",tray:["#0c1923","#132431","#1c3443","#294454","#415b68"]},
  {name:"face",size:13,mode:"flow",angle:1.35,mat:"glass",tray:["#182c38","#2b4555","#3f5a69","#587380"]},
  {name:"seam",size:6,mode:"contour",mat:"basalt",tray:["#080f16","#12202b"]},
  {name:"door",size:11,mode:"contour",mat:"glass",tray:["#050d15","#0c1a26","#132938","#1c3745"]},
  {name:"silver",size:3.3,mode:"contour",thin:true,mat:["silver","silver","emit"],emit:[0,0,.35],tray:["#8fabb8","#b7c9d0","#e2e9e6"]},
  {name:"star",size:3.2,mode:"radial",center:[1600,450],mat:"silver",tray:SILVER},
  {name:"water",size:14,mode:"ground",mat:"glass",ripple:.13,tray:["#07141d","#102532","#1a3a4a","#285366"]},
  {name:"reflection",size:7,mode:"ground",mat:"silver",ripple:.16,tray:["#355364","#567482","#8fabb8"]},
  {name:"ledge",size:13,mode:"contour",mat:"basalt",tray:["#0f1c25","#243440","#3b4e59","#5b6870"]},
  {name:"figure",size:4,mode:"contour",mat:"glass",tray:["#111b22","#24353c","#526169","#7d8885"]},
  {name:"gold",size:3,mode:"contour",thin:true,mat:"gold",tray:GOLD},
  {name:"lamp",size:2.5,mode:"radial",center:[1452,1160],mat:"emit",emit:1.4,tray:["#d5b878","#efe0ac"]}
];
export function draw(g,m,D){
  D.fill(rect(0,0,W,H),"cliff",D.linear(0,0,2400,1800,[[0,"#0c1923"],[.4,"#294454"],[1,"#132431"]]));
  const R=rng(501);
  for(let i=0;i<18;i++){
    const x=i*205-200,w=95+R()*110;
    D.fill(poly([[x,0],[x+w,0],[x+w+45,500],[x+w-12,900],[x+w+80,1330],[x-15,1340],[x+30,740]]),"face",["#182c38","#2b4555","#3f5a69"][i%3]);
    D.fill(stroke([[x,0],[x+27,400],[x-13,690],[x+18,1050],[x-40,1440]],9,3),"seam","#080f16");
  }
  D.fill(path("M0 1280Q700 1180 1200 1325Q2000 1200 3200 1390V1800H0Z"),"water",D.linear(0,1270,0,1800,[[0,"#285366"],[.45,"#102532"],[1,"#07141d"]]));
  const gate=arch(1600,1120,750,905);gate.closePath();
  D.fill(gate,"door",D.linear(1220,210,1960,1120,[[0,"#132938"],[.6,"#0c1a26"],[1,"#050d15"]]));
  D.line(arch(1600,1120,744,900),7,"silver","#b7c9d0");
  D.line(arch(1600,1107,690,859),4,"silver","#8fabb8");
  D.line(path("M1600 705V1120"),3,"seam","#080f16");
  // Crown, seven stars, the anvil, and two silver trees evoke the West-gate.
  D.fill(star(1600,515,49),"star","#e2e9e6");
  for(let k=0;k<7;k++){
    const a=Math.PI+(k/6)*Math.PI;
    D.fill(star(1600+Math.cos(a)*180,588+Math.sin(a)*185,12),"star","#b7c9d0");
  }
  D.line(path("M1514 629L1528 679H1672L1686 629L1639 655L1600 608L1561 655Z"),6,"silver","#b7c9d0");
  D.fill(poly([[1520,782],[1680,782],[1650,803],[1620,808],[1620,847],[1655,865],[1545,865],[1579,847],[1579,808],[1550,803]]),"silver","#b7c9d0");
  D.line(path("M1582 753L1650 700M1626 707L1645 690L1668 713L1649 732"),8,"silver","#b7c9d0");
  for(const side of [-1,1]){
    const x=1600+side*246;
    D.line(path(`M${x} 1054Q${x-side*19} 911 ${x} 745Q${x+side*10} 709 ${x+side*28} 687`),6,"silver","#b7c9d0");
    for(let i=0;i<5;i++){
      const y=823+i*43,dx=72-i*7;
      for(const dir of [-1,1]){
        D.line(path(`M${x} ${y+40}Q${x+dir*dx*.7} ${y+6} ${x+dir*dx} ${y-33}`),4,"silver","#b7c9d0");
        D.line(path(`M${x+dir*dx*.68} ${y-2}L${x+dir*(dx+13)} ${y-2}`),3,"silver","#8fabb8");
      }
    }
    D.line(path(`M${x-34} 1067Q${x} 1027 ${x+34} 1067`),5,"silver","#8fabb8");
  }
  // Reflections fragment into different rows of silver stones.
  for(let i=0;i<42;i++){
    const y=1340+i*10,x=1600+(R()-.5)*(130+i*15),len=12+R()*(40+i*1.7);
    D.fill(stroke([[x-len,y],[x+len,y+3]],3+R()*3,2),"reflection","#567482");
  }
  D.fill(path("M260 1530L700 1385L975 1240L1200 1150L1560 1127L1860 1180L2080 1280L2610 1440L3200 1630V1800H2790L2170 1508L1800 1340L1430 1280L1030 1344L700 1490L390 1660Z"),"ledge",D.linear(0,1100,0,1750,[[0,"#5b6870"],[.5,"#243440"],[1,"#0f1c25"]]));
  traveller(D,1470,1300,172,{region:"figure",color:"#7d8885",staff:true});
  D.fill(poly([[1452,1150],[1472,1097],[1492,1150]]),"figure","#7d8885");
  D.fill(circle(1520,1150,7),"lamp","#efe0ac");
  traveller(D,1354,1320,101,{color:"#24353c",pack:true});
  traveller(D,1260,1338,94,{color:"#526169",staff:true});
}
export const events={ignite:[{regions:["silver"],at:14.4,from:[1600,430],speed:430,jitter:.04}]};
