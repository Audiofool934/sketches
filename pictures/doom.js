import {circle,ellipse,poly,stroke} from "../engine/paint.js";
import {rng} from "../engine/util.js";
import {W,H,GOLD,path,rect,traveller} from "./drawing.js";

const CRATER=[2150,600];
export const config={
  panel:{w:W,h:H},res:2,background:"sky",
  camera:{keys:[[19.1,1630,900,2840],[21,1630,900,2820],[23.2,1640,930,2700],[25,1780,850,2290],[27,2040,720,1710],[28.5,2150,650,1330],[30.2,2150,650,1330]],tilt:[[19.1,3],[23.2,5],[27,10],[28.5,14]],yaw:[[19.1,0],[27,-4],[28.5,-5]],aperture:.027,drift:.003},
  light:{key:{az:130,el:21,color:[1,.64,.47],power:[[19.1,1.9],[25,2.1],[27,2.4],[28.5,1.7]]},fill:{az:-45,el:38,color:[.45,.50,.65],power:.48},sky:[.13,.08,.10],ground:[.03,.018,.015],exposure:.65,grout:"#4c4542",wet:[.35,1.4],points:[{x:CRATER[0],y:CRATER[1],z:280,color:"#ffac65",power:[[19.1,.3],[23,.45],[25,.6],[26.5,.95],[28.5,.6]],flicker:.18},{x:1740,y:1180,z:230,color:"#fb9952",power:.45,flicker:.16}],flashes:[{t:26.3,power:.3,decay:.25},{t:27.35,power:.5,decay:.3}],flashColor:[1,.6,.32]},
  rims:[{figures:["figure"],light:[1740,1180],warm:"rim",width:4,min:.18}],
  sinopia:{groups:[["sky","smoke"],["mountain","slope"],["lava","fire"],["ridge"]]}
};
export const regions=()=>[
  {name:"sky",size:15,mode:"sky",mat:"glass",tray:["#101019","#26202a","#473039","#724137","#9c5940"]},
  {name:"smoke",size:12,mode:"contour",mat:"basalt",tray:["#100f15","#1c1920","#30252a","#503335"]},
  {name:"far",size:16,mode:"contour",mat:"basalt",tray:["#33252b","#513d43","#735554"]},
  {name:"mountain",size:14,mode:"flow",angle:1.0,mat:"basalt",tray:["#111117","#24212a","#3c3037","#563b3c","#754740"]},
  {name:"slope",size:12,mode:"flow",angle:2.1,mat:"terracotta",tray:["#231c21","#443037","#694039","#8b4e3d"]},
  {name:"lava",size:5,mode:"contour",mat:["gold","emit","emit"],emit:[0,.25,.7],tray:["#bf7039","#e59547","#f4c276"]},
  {name:"fire",size:4,mode:"contour",mat:"emit",emit:.85,tray:["#d76a30","#eca452","#f6d38a"]},
  {name:"ridge",size:14,mode:"rubble",mat:"basalt",tray:["#0b0b10","#171821","#25232d","#39313a"]},
  {name:"figure",size:4,mode:"contour",mat:"basalt",tray:["#101316","#26282a","#42433d"]},
  {name:"rim",size:3.2,mode:"contour",thin:true,mat:"gold",tray:GOLD}
];
export function draw(g,m,D){
  const R=rng(617);
  D.fill(rect(0,0,W,H),"sky",D.linear(0,0,0,1350,[[0,"#101019"],[.34,"#473039"],[.8,"#9c5940"],[1,"#724137"]]));
  for(let i=0;i<9;i++){
    const y=140+i*78;
    D.fill(path(`M0 ${y}Q800 ${y+40} 1500 ${y-55}T3200 ${y-24}L3200 ${y+13}Q2000 ${y+18} 1300 ${y-10}T0 ${y+43}Z`),"smoke",i%2?"#30252a":"#503335");
  }
  D.fill(poly([[0,1050],[250,810],[490,958],[820,710],[1210,1030],[1400,875],[1710,1090],[2000,930],[2440,770],[2840,930],[3200,810],[3200,1800],[0,1800]]),"far","#513d43");
  D.fill(path("M860 1510L1190 1300L1480 1060L1770 862L1970 650L2080 588Q2150 627 2240 582L2350 719L2600 976L2910 1235L3200 1430V1800H860Z"),"mountain",D.linear(1300,600,2750,1600,[[0,"#563b3c"],[.35,"#3c3037"],[1,"#111117"]]));
  D.fill(poly([[2180,620],[2060,890],[2160,1100],[2050,1330],[2180,1550],[2610,1740],[3200,1770],[2750,1250],[2380,950]]),"slope","#443037");
  for(let k=0;k<14;k++){
    const x=1810+k*55;
    const points=[[2150+(x-2150)*.22,645],[x,950],[x+(x-2150)*.7,1260],[x+(x-2150)*1.65,1580]];
    D.fill(stroke(points,4,15),"slope",k%2?"#231c21":"#694039");
  }
  D.fill(ellipse(2150,600,93,19,-.08),"fire","#f6d38a");
  const river=[[2165,621],[2140,755],[2075,865],[2130,976],[1990,1100],[1920,1280],[1670,1390],[1530,1660],[1080,1800]];
  D.fill(stroke(river,19,75,15),"lava",D.linear(2150,600,1350,1800,[[0,"#f4c276"],[.5,"#e59547"],[1,"#bf7039"]]));
  for(const p of [ [[2100,820],[1930,980],[1780,1090],[1800,1250]], [[2030,1090],[2160,1230],[2440,1320],[2550,1480]], [[1680,1410],[1640,1530],[1370,1640]] ])D.fill(stroke(p,8,18,12),"lava","#e59547");
  // Rising smoke curls over the crater, leaving the fire as a small intense source.
  D.fill(path("M2072 582Q1950 460 2170 376Q2360 303 2220 189Q2110 101 2290 0H2840Q2570 174 2660 277Q2730 419 2400 451Q2260 466 2225 581Z"),"smoke",D.linear(2200,0,2200,630,[[0,"#100f15"],[.75,"#30252a"],[1,"#503335"]]));
  for(let k=0;k<38;k++){
    const y=240+R()*360,x=2120+(R()-.5)*(610-y)*.45;
    D.fill(ellipse(x,y,2+R()*3,5+R()*6,.2),"fire",R()>.6?"#f6d38a":"#d76a30");
  }
  D.fill(path("M0 1420L250 1340L430 1382L702 1235L960 1320L1130 1395L1315 1500L1510 1560L1600 1800H0Z"),"ridge",D.linear(0,1250,0,1800,[[0,"#39313a"],[.55,"#171821"],[1,"#0b0b10"]]));
  traveller(D,930,1374,125,{region:"figure",color:"#26282a",staff:true});
  traveller(D,1060,1433,118,{region:"figure",color:"#42433d",pack:true});
}
export const events={ignite:[{regions:["lava","fire"],at:20.2,from:CRATER,speed:1100,jitter:.07}]};
