import { circle, ellipse, poly, ring, stroke, blob } from "../engine/paint.js";
import { rng } from "../engine/util.js";
import { W,H,GOLD,path,rect,traveller,clouds } from "./drawing.js";

export const DOOR=[1110,800];
export const LAMP=[1420,770];

export function shireRegions(dusk=false){
  return [
    {name:"sky",size:13,mode:"sky",mat:"glass",tray:dusk?["#131c32","#26384d","#435065","#787a7b","#c4ad8c"]:["#5c858d","#8aaca9","#b4c6b7","#dbd5b6","#e8dbb2"]},
    {name:"cloud",size:10,mode:"sky",mat:"limestone",tray:dusk?["#837c78","#ad9584","#d3b79a"]:["#c3cbb9","#e7dfbd","#f0e5c7"]},
    {name:"far",size:14,mode:"contour",mat:"glass",tray:["#445948","#60715a","#819176","#abb394"]},
    {name:"hill",size:12,mode:"contour",mat:"glass",tray:["#233e2b","#39533a","#52693f","#6b7e47","#899254","#a6a45f"]},
    {name:"grass",size:9,mode:"contour",mat:"glass",tray:["#203a28","#3a542f","#59723b","#849149","#abb263"]},
    {name:"leaf",size:6,mode:"contour",mat:"glass",tray:["#1c342a","#2c4934","#46633b","#69824b","#93a65a"]},
    {name:"bark",size:6.5,mode:"flow",angle:Math.PI/2,mat:"terracotta",tray:["#251e15","#493c27","#695537","#8d7550"]},
    {name:"stone",size:9,mode:"contour",mat:"limestone",tray:["#786b50","#a7956e","#cbb78e","#e6d8ad"]},
    {name:"road",size:10,mode:"contour",mat:"limestone",tray:["#756446","#9a834a","#b49e69","#d2bd8b"]},
    {name:"door",size:6.5,mode:"flow",angle:Math.PI/2,mat:"glass",tray:["#10352a","#205341","#326f4a","#579061","#789a60"]},
    {name:"join",size:3,mode:"flow",angle:Math.PI/2,thin:true,mat:"basalt",tray:["#10261e","#193a2b"]},
    {name:"gold",size:4,mode:"contour",mat:"gold",tray:GOLD},
    {name:"dark",size:5,mode:"contour",mat:"basalt",tray:["#111918","#1b231e","#293129"]},
    {name:"window",size:4,mode:"radial",center:[780,805],mat:dusk?"emit":"glass",emit:dusk?1.1:0,tray:dusk?["#b97532","#daaa5e","#f5d996"]:["#57777b","#91a09a","#c7c5a8"]},
    {name:"flower",size:3.5,mode:"radial",center:[680,1130],mat:"marble",tray:["#ccc9ab","#eeead3","#f9f2d5"]},
    {name:"figure",size:4,mode:"contour",mat:"glass",tray:["#17271f","#23392a","#365035","#556542"]},
    {name:"rim",size:3,mode:"contour",thin:true,mat:"gold",tray:GOLD},
    {name:"lamp",size:3,mode:"radial",center:LAMP,mat:"emit",emit:dusk?2.2:.1,tray:["#bf8037","#e4b263","#f5dba2"]}
  ];
}

export function drawShire(g,mode,D,dusk=false){
  const R=rng(42);
  D.fill(rect(0,0,W,H),"sky",D.linear(0,0,0,900,dusk?[[0,"#131c32"],[.52,"#566574"],[1,"#c4ad8c"]]:[[0,"#759b9b"],[.54,"#bdccbb"],[1,"#e8dbb2"]]));
  clouds(D,[[480,220,620,48],[2220,260,780,38],[2840,110,400,32]],"cloud",dusk?"#ad9584":"#e7dfbd");
  D.fill(path("M0 640 Q470 400 890 590 T1690 580 T2500 460 T3200 570 L3200 1800H0Z"),"far","#819176");
  D.fill(path("M0 760 Q700 490 1260 740 Q1690 690 2090 710 Q2600 440 3200 690 L3200 1800H0Z"),"far","#60715a");
  D.fill(path("M0 820 C350 580 500 380 1010 410 C1410 230 1670 440 1910 740 Q2280 990 3200 830 V1800H0Z"),"hill",D.linear(0,350,0,1800,[[0,"#899254"],[.35,"#6b7e47"],[.72,"#39533a"],[1,"#233e2b"]]));
  // Strips follow the hillside and make the ground feel cultivated.
  for(let k=0;k<7;k++){
    const y=580+k*61;
    D.line(path(`M${1960+k*30} ${y+215} Q2560 ${y-110},3220 ${y+60}`),8+k*.8,"grass",k%2?"#59723b":"#849149");
  }
  // A road carries the eye from the door into the distance at the right.
  D.fill(path("M990 1010 Q1250 1000 1400 1100 Q1640 1290 1830 1140 Q1970 1040 2190 1000 Q2540 930 2730 770 L2740 787 Q2520 980 2220 1040 Q2040 1100 1960 1240 Q1840 1340 1520 1340 Q1300 1160 1080 1050Z"),"road",D.linear(1000,900,2100,1340,[[0,"#d2bd8b"],[.7,"#b49e69"],[1,"#756446"]]));
  D.fill(path("M1600 1220Q2080 1310 2120 1530Q2125 1680 1910 1800H1430Q1780 1590 1740 1490Q1735 1400 1510 1290Z"),"road",D.linear(1600,1200,2100,1800,[[0,"#b49e69"],[1,"#756446"]]));
  // The oak grows above the house, with a continuous branching silhouette.
  const tx=1500,ty=602;
  D.fill(path("M1457 621 Q1496 508 1458 387 L1518 343 Q1515 455 1557 609Z"),"bark","#493c27");
  for(const p of [[[1505,480],[1340,367],[1180,353]],[[1490,445],[1490,270],[1380,190]],[[1510,410],[1700,320],[1850,276]],[[1530,500],[1710,410],[1930,400]]])D.fill(stroke(p,34,7),"bark","#695537");
  for(let k=0;k<94;k++){
    const a=R()*Math.PI*2,rad=Math.sqrt(R());
    const x=1535+Math.cos(a)*520*rad,y=390+Math.sin(a)*174*rad;
    const v=34+R()*54;
    D.fill(blob([[x-v,y],[x-v*.65,y-v*.7],[x,y-v*.82],[x+v*.8,y-v*.38],[x+v,y+v*.22],[x+v*.1,y+v*.63],[x-v*.75,y+v*.45]]),"leaf",["#2c4934","#46633b","#69824b","#93a65a"][Math.floor(R()*4)]);
  }
  // Chimney behind the round facade.
  D.fill(path("M836 463 L850 272 L924 276 L934 475Z"),"stone","#a7956e");
  D.fill(rect(834,269,104,22),"stone","#786b50");
  for(let k=0;k<5;k++)D.line(path(`M848 ${312+k*30}L926 ${315+k*30}`),3,"bark","#695537");
  // Broad limestone courses around the green door.
  D.fill(ellipse(DOOR[0],DOOR[1],285,285),"stone",D.linear(900,550,1260,1050,[[0,"#e6d8ad"],[.6,"#cbb78e"],[1,"#786b50"]]));
  D.fill(circle(...DOOR,249),"dark","#17211b");
  D.fill(circle(...DOOR,236),"door",D.linear(900,600,1280,1000,[[0,"#789a60"],[.25,"#579061"],[.75,"#205341"],[1,"#10352a"]]));
  for(let dx=-200;dx<=200;dx+=42){
    const len=Math.sqrt(236*236-dx*dx);
    D.line(path(`M${DOOR[0]+dx} ${DOOR[1]-len+7}V${DOOR[1]+len-7}`),3,"join","#193a2b");
  }
  D.fill(ring(...DOOR,226,230),"gold","#8a6a2e");
  D.fill(circle(...DOOR,24),"dark","#111918");
  D.fill(circle(DOOR[0]-3,DOOR[1]-3,18),"gold",D.radial(DOOR[0]-9,DOOR[1]-10,1,27,[[0,"#efd38d"],[.35,"#d9b25e"],[1,"#8a6a2e"]]));
  // Two round windows and a lantern; their warm cores remain small at dusk.
  for(const [x,y,r] of [[758,810,69],[1582,825,73]]){
    D.fill(circle(x,y,r+19),"stone","#cbb78e");
    D.fill(circle(x,y,r+5),"dark","#1b231e");
    D.fill(circle(x,y,r),"window",dusk?"#daaa5e":"#91a09a");
    D.line(path(`M${x-r} ${y}H${x+r}M${x} ${y-r}V${y+r}`),8,"bark","#493c27");
  }
  D.fill(rect(1405,741,32,61),"dark","#111918");
  D.fill(rect(1411,749,20,43),"lamp","#e4b263");
  D.fill(poly([[1400,740],[1421,718],[1442,740]]),"bark","#493c27");
  D.line(path("M1420 719V699Q1460 686 1467 730"),6,"dark","#1b231e");
  // Foreground banks and gardens frame the road without enclosing the picture.
  D.fill(path("M0 1120Q370 993 700 1060Q886 1080 1050 1230Q1310 1430 1390 1800H0Z"),"grass","#3a542f");
  D.fill(path("M2240 1240Q2590 1070 3200 1080V1800H2130Q2340 1550 2240 1240Z"),"grass","#203a28");
  for(let i=0;i<160;i++){
    const x=170+R()*1050,y=1090+R()*650;
    if(y<1110+Math.max(0,x-700)*.22)continue;
    const r=3+R()*6;
    D.fill(stroke([[x,y+18],[x+R()*5,y]],2,1),"grass","#849149");
    for(let j=0;j<5;j++)D.fill(ellipse(x+Math.cos(j*1.256)*r*.65,y+Math.sin(j*1.256)*r*.65,r*.58,r*.4,j*1.256),"flower","#eeead3");
    D.fill(circle(x,y,r*.3),"gold","#d9b25e");
  }
  // Curved gate posts and two tiny figures on the road establish scale.
  for(const [x,y] of [[1885,1150],[2020,1060],[2330,964],[2430,917]])D.fill(rect(x,y-53,10,63),"bark","#695537");
  D.line(path("M1890 1110Q1950 1065 2025 1025"),6,"bark","#8d7550");
  D.line(path("M2335 930Q2380 905 2435 886"),5,"bark","#8d7550");
  if(!dusk){
    traveller(D,1980,1093,97,{face:1,staff:true,color:"#17271f"});
    traveller(D,2088,1060,88,{face:1,pack:true,color:"#365035"});
  }else{
    traveller(D,1322,1080,106,{face:-1,pack:true,color:"#23392a"});
    traveller(D,1423,1140,96,{face:-1,staff:true,color:"#17271f"});
  }
}
