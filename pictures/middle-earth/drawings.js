import { W,H,poly,circle,ellipse,ring,stroke,blob,rng,shape,rect,line,oval,star,sky,stars,clouds,mountains,water,tree,fir,figure,horse,arch,tower,city,ship } from './craft.js';
import { looks } from './materials.js';
const base=(d,id)=>sky(d,looks[id].sky[0],looks[id].sky[2]);

export function creation(g,m,d){
  base(d,'creation');stars(d,33,230,1750);
  const cx=1800,cy=950;
  for(let j=0;j<13;j++){
    const p=[],rad=110+j*72;
    for(let i=0;i<=110;i++){const a=i/110*Math.PI*1.76-j*.16;p.push([cx+Math.cos(a)*rad*1.75,cy+Math.sin(a)*rad*.72]);}
    line(d,p,j<4?5:9,j%3?'silver':'gold',undefined,1.5);
  }
  for(let j=0;j<7;j++){const p=[];for(let i=0;i<=60;i++){const x=i/60*W,y=1270-j*105+Math.sin(i*.075+j*.26)*200;p.push([x,y]);}line(d,p,13,'water',undefined,4);}
  star(d,1800,740,115,'silver');star(d,1800,740,38,'light');
  for(let i=0;i<9;i++)star(d,1800+Math.cos(i*.83)*630,740+Math.sin(i*.83)*300,15,'gold');
}

export function trees(g,m,d){
  base(d,'trees');stars(d,8,65,750);clouds(d,20,'mist',7,550);
  mountains(d,37,1050,360,'mountain',1470);
  d.fill(blob([[-100,1400],[700,1170],[1510,1360],[2470,1100],[3700,1420],[3700,2200],[-100,2200]]),'land');
  water(d,1430,9,'water',1800);
  tree(d,1130,1510,1.38,22,'silver',-.12);tree(d,2460,1490,1.37,41,'gold',.12);
  for(let i=0;i<48;i++){const r=rng(400+i);oval(d,450+r()*2690,1430+r()*480,5+r()*9,3+r()*5,i%2?'silver':'goldleaf');}
  line(d,[[100,1900],[700,1640],[1350,1530]],24,'stone',undefined,5);
  figure(d,1670,1440,.48,{robe:'white',hood:false});figure(d,1740,1460,.4,{robe:'robe',hood:false});
  star(d,1100,570,28,'light');star(d,2460,570,31,'gold');star(d,1800,450,15,'silver');
}

export function crown(g,m,d){
  base(d,'crown');stars(d,54,95,1250);mountains(d,53,970,560,'rock',H);
  for(let x=50;x<3600;x+=230)line(d,[[x,2000],[x+40,1100],[x+Math.sin(x)*90,700]],12,'shadow',undefined,2);
  shape(d,'M 620 1600 L 810 680 L 1090 1070 L 1380 380 L 1650 970 L 1810 500 L 2000 970 L 2260 410 L 2520 1100 L 2770 690 L 2960 1600 Z','ink');
  shape(d,'M 660 1510 Q 1790 1230 2900 1510 L 2940 1650 Q 1820 1360 620 1670 Z','leather');
  for(const [x,y,r] of [[1160,1280,124],[1800,1150,145],[2440,1280,124]]){
    d.fill(ring(x,y,r+7,r+27),'gold');d.fill(poly([[x,y-r],[x+r*.8,y-r*.36],[x+r*.84,y+r*.3],[x,y+r],[x-r*.82,y+r*.32],[x-r*.8,y-r*.36]]),'silver');
    star(d,x,y,r*.6,'light');line(d,[[x-r*.8,y-r*.36],[x,y],[x+r*.84,y+r*.3]],3,'white');
  }
  figure(d,1530,1730,.92,{robe:'robe',hood:false,arms:'raise'});figure(d,1700,1750,.83,{robe:'leather',hood:false,sword:true});
  line(d,[[1530,1540],[1370,1500],[1200,1390]],5,'gold',undefined,1);
  for(let i=0;i<9;i++)star(d,1200-i*74,1390-i*120,5+i*.65,'silver',4);
}

export function numenor(g,m,d){
  base(d,'numenor');clouds(d,30,'mist',12,820);
  d.fill(poly([[100,1480],[670,930],[1320,610],[2140,630],[2990,1240],[3600,1500],[3600,2020],[0,2020]]),'rock');
  city(d,1740,1350,1.9,32);
  for(const x of [870,1120,2450,2780])tower(d,x,1420,92,440,'stone');
  water(d,1550,12,'water',1800);ship(d,1000,1710,.62);ship(d,2600,1770,.44);
  for(let j=0;j<5;j++)line(d,[[0,1660+j*78],[620,1610+j*70],[1430,1690+j*61],[2250,1680+j*75],[3600,1750+j*66]],8,'foam');
  star(d,1800,230,25,'silver');
}
export function greatWave(g,m,d){
  shape(d,'M -100 2030 L -100 1320 C 220 620 540 530 1030 720 C 1410 900 1670 1360 2380 1500 C 2950 1610 3330 1430 3700 1580 L 3700 2130 Z','water');
  line(d,[[-100,1320],[240,850],[700,710],[1030,880],[860,1080]],24,'silver',undefined,7);
  for(let j=0;j<6;j++)line(d,[[-80,1550+j*70],[370,1010+j*35],[820,980+j*25],[1390,1520+j*35],[2720,1660+j*46]],12,'foam',undefined,4);
}

export function forge(g,m,d){
  base(d,'forge');clouds(d,30,'shadow',10,850);mountains(d,43,1390,570,'rock');
  for(const x of [390,3200]){tower(d,x,1530,210,970,'ink',false);for(let i=-2;i<=2;i++)d.fill(poly([[x+i*45-24,610],[x+i*45,360-Math.abs(i)*60],[x+i*45+24,610]]),'ink');}
  const band=new Path2D();band.ellipse(1800,910,620,440,-.12,0,Math.PI*2);band.ellipse(1800,875,439,272,-.12,Math.PI*2,0,true);d.fill(band,'gold',d.linear(1250,500,2380,1410,[[0,'#f0d48d'],[.22,'#ad7935'],[.48,'#755026'],[.8,'#d5a956'],[1,'#f0d48d']]));
  const rim=[];for(let i=0;i<=70;i++){const a=.22+i/70*Math.PI*.94;rim.push([1800+Math.cos(a)*603,910+Math.sin(a)*420]);}line(d,rim,13,'flame');
  line(d,[[1100,1520],[1500,1460],[1890,1500],[2300,1460],[2700,1540]],16,'red');
  for(let i=0;i<11;i++){const x=980+i*167;line(d,[[x,1890],[x+40,1700]],9,'wood');}
  line(d,[[1720,1830],[1940,1560]],27,'silver',undefined,3);line(d,[[1710,1830],[1770,1880]],12,'gold');
  d.fill(poly([[1960,1530],[2040,1420],[2010,1520],[1970,1580]]),'silver');
}

export function alliance(g,m,d){
  base(d,'forge');mountains(d,28,1130,620,'rock');
  for(const x of [600,3150]){tower(d,x,1390,180,760,'ink',false);for(let i=-2;i<=2;i++)d.fill(poly([[x+i*35-20,680],[x+i*35,440-Math.abs(i)*40],[x+i*35+20,680]]),'ink');}
  d.fill(blob([[-100,1680],[500,1520],[1370,1610],[2160,1510],[3700,1700],[3700,2200],[-100,2200]]),'shadow');
  for(let i=0;i<39;i++){const x=260+i*82,y=1650+Math.sin(i*.7)*40;figure(d,x,y,.48,{robe:i%3?'rider':'white',hood:false});line(d,[[x,y-20],[x+20,y-223]],4,'silver');}
  figure(d,1140,1900,2.4,{robe:'rider',hood:false,sword:true,arms:'raise'});
  oval(d,950,1690,110,165,'stone');oval(d,950,1690,87,140,'banner');star(d,950,1690,75,'silver',7);
  shape(d,'M 2140 1920 L 2200 1230 L 2320 980 L 2520 1000 L 2670 1280 L 2830 1920 Z','ink');
  for(let i=-2;i<=2;i++)d.fill(poly([[2410+i*52-25,1080],[2410+i*52,780-Math.abs(i)*30],[2410+i*52+24,1080]]),'leather');
  line(d,[[2520,1200],[2740,1360],[2880,1240]],110,'ink',undefined,70);
  line(d,[[2840,1480],[2910,920]],18,'wood');star(d,2910,900,115,'leather',8);
  line(d,[[2260,1220],[2100,1400],[1980,1520]],80,'ink',undefined,38);
  line(d,[[1620,1870],[1860,1580]],34,'silver',undefined,5);line(d,[[1600,1840],[1650,1890]],17,'gold');
  d.fill(poly([[1890,1540],[1990,1430],[1970,1540],[1900,1600]]),'silver');
  d.fill(ring(2040,1490,24,35),'gold');
}

export function shire(g,m,d){
  base(d,'shire');clouds(d,6,'mist',12,550);mountains(d,17,1050,270,'meadow',H);
  d.fill(blob([[-100,1400],[480,990],[1020,980],[1670,1080],[2350,1310],[3600,1170],[3700,2100],[-100,2100]]),'land');
  shape(d,'M 1800 940 C 1550 1150 1820 1300 1450 1450 C 1170 1570 970 1840 1700 2080 L 2310 2080 C 1350 1760 1600 1570 1780 1470 C 2160 1260 1700 1090 1950 960 Z','stone');
  d.fill(blob([[390,1370],[490,880],[900,650],[1350,750],[1740,1350]]),'meadow');
  oval(d,1070,1240,304,306,'stone');oval(d,1070,1230,260,270,'robe');
  for(let x=855;x<1290;x+=48)line(d,[[x,1020],[x,1420]],3,'ink');
  d.fill(circle(1200,1235,23),'gold');
  for(const x of [610,1510]){oval(d,x,1180,94,91,'stone');oval(d,x,1180,66,65,'flame');line(d,[[x-62,1180],[x+62,1180]],7,'wood');line(d,[[x,1117],[x,1245]],7,'wood');}
  rect(d,1230,652,93,180,'stone');rect(d,1217,640,120,28,'wood');
  tree(d,2790,1450,1.14,71,'green',-.1);tree(d,580,1570,.53,82,'green',.18);
  for(let i=0;i<26;i++){const x=215+i*46;line(d,[[x,1610],[x,1500]],9,'wood');}line(d,[[180,1530],[1420,1570]],9,'wood');
  const r=rng(55);for(let i=0;i<220;i++){const x=r()*W,y=1530+r()*H*.24;star(d,x,y,2+r()*4,i%3?'white':'gold',5);}
  shape(d,'M 2950 1230 C 2670 1520 2810 1640 3340 2020 L 3600 2020 L 3600 1730 C 3130 1550 3180 1400 3250 1230 Z','water');
}
export function shireTravellers(g,m,d){figure(d,2050,1460,.53,{robe:'robe',pack:true});figure(d,2140,1480,.5,{robe:'leather',pack:true});}

export function fellowship(g,m,d){
  base(d,'fellowship');clouds(d,7,'mist',12,660);mountains(d,59,980,650,'mountain',H);
  d.fill(poly([[0,920],[460,560],[1070,930],[850,1580],[0,1660]]),'rock');
  d.fill(poly([[2490,1000],[3040,500],[3600,970],[3600,1730],[2640,1570]]),'rock');
  city(d,2850,1240,.58,17);
  for(const [x,y,len] of [[790,960,610],[2640,1130,400],[2990,1170,330]]){line(d,[[x,y],[x-38,y+len*.3],[x+12,y+len]],24,'silver',undefined,38);for(let i=0;i<5;i++)line(d,[[x-8+i*4,y],[x-38+i*5,y+len*.3],[x+i*4,y+len]],3,'white');}
  for(let x=40;x<1000;x+=155)fir(d,x,1520+Math.sin(x)*40,360,'pine');
  d.fill(blob([[-100,1890],[480,1680],[910,1570],[1560,1670],[2260,1490],[2850,1540],[3700,1430],[3700,2130],[-100,2130]]),'shadow');
  line(d,[[0,1860],[850,1580],[1560,1660],[2250,1490],[3600,1420]],17,'rim');
}
export const fellowshipPeople=Array.from({length:9},(_,i)=>({name:`traveller-${i}`,at:73.0+i*.35,dur:.65,from:[-1,0],draw(g,m,d){
  const x=1030+i*174,y=1620-i*17;figure(d,x,y,i===0?.91:i<3?.82:i===3?.59:.51,{robe:i===0?'white':i<4?'rider':'robe',hood:i!==1,hat:i===0,staff:i===0,sword:i===1,pack:i>3});
  if(i===2)line(d,[[x-30,y-40],[x-48,y-202],[x+6,y-119]],5,'wood');
}}));

export function moria(g,m,d){
  base(d,'moria');
  for(let j=0;j<9;j++){const w=3280-j*296,h=1770-j*114;arch(d,1800,1940-j*45,w,h,j%2?'rock':'shadow','ink',78);}
  for(const x of [520,900,2700,3080]){rect(d,x-90,400,180,1560,'rock');rect(d,x-80,400,24,1560,'rocklit');rect(d,x-125,490,250,50,'stone');}
  arch(d,1800,1690,1020,1360,'silver','ink',15);
  for(const side of [-1,1]){
    const x=1800+side*380;line(d,[[x,1540],[x,960],[x-side*65,800]],10,'silver');
    for(let i=0;i<5;i++){const y=970+i*100;line(d,[[x,y],[x+side*90,y-100],[x+side*113,y-165]],7,'silver');line(d,[[x,y+18],[x-side*85,y-55],[x-side*95,y-115]],7,'silver');}
  }
  star(d,1800,630,63,'silver');for(let i=0;i<7;i++)star(d,1650+i*50,490+Math.abs(i-3)*13,10,'silver');
  shape(d,'M 0 1820 L 1170 1630 L 1780 1740 L 2340 1600 L 3600 1740 L 3600 1860 L 2330 1710 L 1800 1830 L 1150 1730 L 0 1930 Z','stone');
  for(let i=0;i<8;i++)figure(d,1040+i*48,1740+i*4,.26,{robe:'robe'});
  figure(d,1850,1790,.69,{robe:'white',staff:true,arms:'raise',hat:true});
  for(let i=0;i<9;i++)line(d,[[80+i*420,2000],[450+i*320,1790]],7,'rocklit');
}
export function balrog(g,m,d){
  shape(d,'M 2150 1490 L 2040 1400 L 2110 1170 L 1990 1050 L 2220 1120 L 2260 870 L 2370 1010 L 2480 820 L 2530 1070 L 2690 930 L 2640 1190 L 2800 1130 L 2710 1450 L 2820 1650 L 2140 1630 Z','red');
  shape(d,'M 2230 1200 C 1870 1120 1790 860 1560 670 C 1880 720 2170 860 2320 1060 L 2480 1050 C 2750 730 3020 700 3340 670 C 3070 880 2980 1140 2570 1270 Z','shadow');
  line(d,[[1580,690],[1920,900],[2250,1210]],8,'red');line(d,[[3330,680],[2900,910],[2540,1230]],9,'red');
  shape(d,'M 2120 1620 C 2170 1450 2160 1260 2240 1160 L 2250 1040 L 2380 1000 L 2500 1080 L 2540 1210 C 2670 1330 2690 1530 2820 1630 Z','ink');
  line(d,[[2290,1080],[2160,910],[1980,950],[2110,1120]],38,'leather',undefined,9);
  line(d,[[2400,1060],[2520,890],[2700,900],[2560,1120]],38,'leather',undefined,9);
  line(d,[[2200,1260],[2030,1380],[1830,1310]],52,'ink',undefined,25);
  line(d,[[2520,1270],[2670,1220],[2820,1070]],54,'ink',undefined,22);
  line(d,[[2820,1060],[3080,1150],[3230,1430],[3120,1630],[2690,1700],[1960,1590]],12,'flame',undefined,3);
  for(let i=0;i<6;i++){
    const x=2160+i*94,y=1600+Math.sin(i)*24,h=210+Math.sin(i*1.9)*95;
    d.fill(poly([[x-24,y],[x-38,y-h*.5],[x-10,y-h*.31],[x+5,y-h],[x+33,y-h*.58],[x+18,y-h*.32],[x+42,y]]),'red');
    line(d,[[x-15,y-12],[x+3,y-h*.29],[x-7,y-h*.6],[x+5,y-h*.82]],7,'flame',undefined,2);
  }
  line(d,[[2238,1165],[2210,1240],[2250,1320],[2240,1460]],7,'flame',undefined,3);
  line(d,[[2480,1090],[2515,1210],[2580,1340],[2620,1530]],7,'flame',undefined,3);
  line(d,[[2280,1110],[2310,1102]],9,'flame');line(d,[[2380,1102],[2410,1110]],9,'flame');
}

export function lorien(g,m,d){
  base(d,'lorien');stars(d,8,75,1100);mountains(d,12,1300,380,'meadow');
  for(const [x,y,s,se] of [[180,1730,1.8,13],[3250,1820,1.8,22],[760,1350,.84,53],[2840,1330,.9,58],[1700,1300,.5,61]])tree(d,x,y,s,se,'gold');
  shape(d,'M 0 1770 C 880 1460 1600 1500 2060 1760 C 2610 1570 3100 1550 3600 1710 L 3600 2100 L 0 2100 Z','land');
  oval(d,1650,1700,330,70,'stone');rect(d,1565,1710,170,200,'stone');oval(d,1650,1680,300,53,'silver');oval(d,1650,1680,268,41,'water');
  figure(d,2010,1770,1.5,{robe:'white',hood:false,arms:'raise'});figure(d,1260,1830,.75,{robe:'robe',hood:false});
  star(d,2110,1390,24,'light');line(d,[[2095,1405],[2090,1440],[2130,1440],[2125,1405]],5,'silver');
  const r=rng(991);for(let i=0;i<100;i++){const x=900+r()*1800,y=820+r()*1020;d.fill(ellipse(x,y,8+r()*9,3+r()*4,r()*2),'goldleaf');}
}

function king(d,x,y,s=1,flip=1){
  const P=(a,b)=>[x+a*s*flip,y+b*s];
  d.fill(poly([P(-180,0),P(-146,-720),P(-116,-1110),P(118,-1110),P(149,-680),P(205,0)]),'stone');
  d.fill(poly([P(-125,-950),P(-78,-380),P(-94,-20),P(-40,-20),P(-37,-530)]),'stonelit');
  d.fill(poly([P(-72,-820),P(0,-210),P(40,-30),P(88,-40),P(20,-640)]),'rocklit');
  oval(d,x,y-1180*s,84*s,106*s,'stonelit');
  d.fill(poly([P(-88,-1250),P(-105,-1360),P(-60,-1330),P(0,-1390),P(55,-1330),P(108,-1360),P(89,-1250)]),'stone');
  line(d,[P(-115,-1030),P(-260,-970),P(-320,-1190)],95*s,'stone');
  d.fill(poly([P(-376,-1190),P(-365,-1390),P(-337,-1410),P(-321,-1260),P(-303,-1410),P(-280,-1390),P(-279,-1180)]),'stonelit');
  line(d,[P(118,-1040),P(235,-780),P(244,-415)],92*s,'stone');
  line(d,[P(237,-795),P(229,-173)],20*s,'silver');
}
export function argonath(g,m,d){
  base(d,'argonath');clouds(d,21,'mist',8,470);mountains(d,4,930,550,'mountain');
  water(d,1270,8,'water',1850);
  d.fill(poly([[0,0],[450,0],[740,340],[1170,1990],[0,2090]]),'rock');d.fill(poly([[3600,0],[3160,0],[2890,340],[2440,1990],[3600,2090]]),'rock');
  king(d,1010,1920,1.06,1);king(d,2630,1920,1.06,-1);
  ship(d,1860,1740,.43,'wood');
  for(let i=0;i<4;i++)figure(d,1790+i*22,1720,.16,{robe:'robe'});
  line(d,[[1830,1850],[1880,1930],[1890,2020]],17,'silver',undefined,4);
  shape(d,'M 320 1880 Q 410 1810 500 1850 L 565 1820 L 592 1860 Q 451 1940 368 1928 Z','gold');
  line(d,[[502,1845],[518,1880]],8,'ink');
}

export function fangorn(g,m,d){
  base(d,'fangorn');
  for(let i=0;i<13;i++){const x=110+i*275,y=1630+Math.sin(i)*80;tree(d,x,y,.76,i+340,i%3?'bare':'green',Math.sin(i)*.2);}
  d.fill(blob([[-60,1730],[550,1620],[1330,1710],[2110,1610],[3010,1710],[3700,1560],[3700,2200],[-60,2200]]),'land');
  for(const [x,y,s,seed] of [[1050,1780,1.65,778],[2580,1840,1.43,837]]){
    tree(d,x,y,s,seed,'green');
    line(d,[[x-70,y-580],[x-210,y-360],[x-350,y-490]],70,'trunk',undefined,28);
    line(d,[[x+60,y-630],[x+245,y-650],[x+330,y-880]],66,'trunk',undefined,25);
    oval(d,x-35,y-770,15,10,'gold');oval(d,x+45,y-770,15,10,'gold');
    line(d,[[x-42,y-700],[x,y-680],[x+48,y-706]],9,'ink');
    line(d,[[x-25,y-330],[x-95,y-40],[x-220,y+30]],77,'trunk',undefined,30);
    line(d,[[x+26,y-315],[x+130,y-70],[x+228,y+15]],75,'trunk',undefined,31);
  }
  figure(d,1770,1800,.52,{robe:'robe',hood:false});figure(d,1860,1810,.5,{robe:'leather',hood:false});
  const r=rng(103);for(let i=0;i<150;i++){const x=r()*W,y=1770+r()*250;oval(d,x,y,4+r()*9,3+r()*4,'leaf');}
}

export function rohan(g,m,d){
  base(d,'rohan');clouds(d,43,'mist',15,1100);mountains(d,24,1180,650,'mountain');
  d.fill(poly([[0,1400],[650,1180],[1790,1380],[2530,1210],[3600,1310],[3600,2020],[0,2020]]),'land');
  d.fill(poly([[2150,1390],[2150,1000],[2640,900],[3330,1080],[3330,1490]]),'stone');
  for(let x=2150;x<3310;x+=44)rect(d,x,990+(x-2150)*.04,23,34,'stone');
  arch(d,2640,1350,130,260,'stonelit','ink',20);tower(d,2820,1100,120,320,'stone',false);
  for(let i=0;i<22;i++){const x=230+i*134,y=1420+Math.sin(i*.54)*100;horse(d,x,y,.37,{rider:true,reg:i%3?'horse':'white'});}
  horse(d,1170,1780,1.5,{rider:true,banner:true,reg:'horse'});horse(d,2030,1840,1.23,{rider:true,reg:'white'});horse(d,510,1910,.92,{rider:true});
  for(let i=0;i<25;i++){const x=i*163;line(d,[[x,1300],[x-180,2020]],1.5,'silver');}
}

export function beacons(g,m,d){
  base(d,'beacons');clouds(d,99,'mist',12,800);
  mountains(d,15,980,580,'mountain',H);mountains(d,77,1450,570,'rock',H);mountains(d,90,1800,460,'shadow',H);
  const sites=[[490,1390],[1050,1130],[1600,990],[2070,900],[2500,850]];
  for(const [x,y] of sites){rect(d,x-32,y,64,28,'stone');line(d,[[x-27,y],[x+27,y-18]],7,'wood');}
  city(d,2960,1540,.65,77);
  for(let i=0;i<13;i++)fir(d,120+i*265,1960,200+i%3*80);
}
export const beaconFires=[[490,1390,147.15],[1050,1130,148.6],[1600,990,149.55],[2070,900,151.55],[2500,850,153.45]].map(([x,y,at],i)=>({name:`beacon-${i}`,at,dur:.28,from:[0,-1],draw(g,m,d){
  d.fill(blob([[x-30,y],[x-44,y-36],[x-19,y-101],[x+1,y-156],[x+18,y-84],[x+42,y-34],[x+27,y]]),'flame');
  star(d,x,y-72,18,'gold',4);
}}));

export function courage(g,m,d){
  base(d,'courage');clouds(d,28,'mist',13,900);mountains(d,4,1170,280,'mountain');
  d.fill(blob([[-100,1770],[800,1370],[1610,1560],[2260,1380],[3700,1450],[3700,2150],[-100,2150]]),'land');
  for(let i=0;i<31;i++){const x=65+i*117,y=1430+Math.sin(i*.7)*80;line(d,[[x,y],[x+35,y-250]],4,'wood');d.fill(poly([[x+35,y-250],[x+104,y-235],[x+67,y-185],[x+25,y-190]]),i%3?'banner':'red');}
  shape(d,'M 2670 1140 C 2220 800 2050 430 1750 440 C 2080 440 2120 730 2410 690 C 2120 520 2040 210 1630 140 C 2280 60 2550 490 2720 830 C 2920 460 3260 220 3610 260 C 3300 410 3200 730 3000 950 C 3180 770 3400 740 3640 820 C 3320 970 3230 1210 2870 1310 Z','ink');
  line(d,[[1780,460],[2380,700],[2690,1120]],9,'rocklit');line(d,[[2700,850],[3080,500],[3500,310]],8,'rocklit');
  d.fill(blob([[2530,1540],[2620,1200],[2650,1010],[2780,970],[2870,1260],[2930,1560]]),'ink');
  for(let i=-2;i<=2;i++)d.fill(poly([[2725+i*25-11,1000],[2725+i*25,920-Math.abs(i)*9],[2725+i*25+12,1000]]),'silver');
  line(d,[[2660,1160],[2440,1370]],18,'silver');
  figure(d,1580,1810,2.27,{robe:'rider',hood:false,sword:true,arms:'raise'});
  // A bright, wind-swept fall of hair makes the heroine readable at the wide scale.
  d.fill(blob([[1500,1335],[1490,1360],[1520,1410],[1490,1500],[1565,1480],[1588,1380]]),'goldleaf');
  oval(d,1450,1640,97,140,'stone');oval(d,1450,1640,79,122,'banner');star(d,1450,1640,49,'silver',4);
  figure(d,2280,1790,.82,{robe:'robe',hood:false,sword:true});
}

export function burden(g,m,d){
  base(d,'burden');stars(d,8,30,780);clouds(d,1,'shadow',11,1100);
  d.fill(poly([[500,1510],[1560,470],[1750,580],[1900,510],[2550,1490],[3550,1710],[3600,2050],[0,2050]]),'rock');
  line(d,[[1540,590],[1610,730],[1550,870],[1770,1040],[1640,1280],[2000,1540]],33,'red',undefined,80);
  line(d,[[1640,590],[1680,750],[1640,890],[1840,1080]],10,'flame',undefined,30);
  d.fill(blob([[-100,2040],[600,1650],[1240,1430],[1900,1630],[2450,1430],[3700,1770],[3700,2120],[-100,2120]]),'shadow');
  line(d,[[0,2010],[600,1640],[1240,1420],[1900,1620],[2450,1420],[3600,1730]],13,'rim');
  // Sam leans into the ascent while keeping Frodo above the ash.
  line(d,[[1400,1580],[1350,1660],[1340,1717]],36,'leather');
  line(d,[[1490,1580],[1560,1670],[1550,1727]],34,'leather');
  oval(d,1327,1722,32,16,'skin');oval(d,1540,1734,34,16,'skin');
  shape(d,'M 1340 1430 Q 1390 1360 1480 1390 L 1530 1530 L 1580 1620 L 1490 1640 L 1430 1570 L 1360 1620 L 1310 1560 Z','leather');
  shape(d,'M 1395 1420 Q 1435 1440 1440 1520 L 1415 1600 L 1385 1570 Z','stone');
  line(d,[[1490,1440],[1520,1540],[1550,1600]],7,'wood');
  oval(d,1325,1490,42,70,'wood');
  // Sam's profile stays visible to the left of the carried cloak.
  shape(d,'M 1368 1360 Q 1320 1345 1310 1302 Q 1306 1264 1343 1254 Q 1390 1248 1396 1281 L 1412 1300 L 1398 1310 L 1391 1340 L 1368 1348 Z','skin');
  shape(d,'M 1311 1319 Q 1277 1289 1305 1254 Q 1338 1228 1370 1244 Q 1398 1245 1399 1274 L 1373 1266 L 1351 1280 L 1329 1277 L 1329 1314 Z','leather');
  for(const [x,y] of [[1308,1257],[1329,1244],[1351,1247],[1371,1254]])oval(d,x,y,12,11,'wood');
  line(d,[[1368,1285],[1384,1288]],4,'ink');line(d,[[1381,1326],[1393,1322]],3,'leather');
  // Frodo lies across Sam's back, his head and open hand falling forward.
  shape(d,'M 1400 1340 Q 1480 1272 1570 1310 Q 1610 1320 1655 1390 L 1710 1440 L 1690 1480 L 1570 1435 L 1498 1375 L 1430 1403 Z','robe');
  line(d,[[1510,1322],[1568,1350],[1605,1410],[1675,1443]],8,'rider');
  line(d,[[1533,1354],[1540,1400],[1490,1470]],24,'robe',undefined,19);
  oval(d,1480,1485,17,23,'skin');line(d,[[1472,1485],[1467,1510]],4,'skin');
  line(d,[[1590,1415],[1660,1487],[1730,1495]],27,'leather');
  line(d,[[1628,1401],[1710,1435],[1762,1437]],26,'leather');
  oval(d,1743,1501,26,15,'skin');oval(d,1776,1442,26,15,'skin');
  shape(d,'M 1435 1338 Q 1396 1333 1390 1295 Q 1388 1262 1420 1250 Q 1462 1244 1477 1278 L 1484 1302 L 1468 1309 L 1458 1332 Z','skin');
  shape(d,'M 1392 1311 Q 1367 1281 1387 1254 Q 1411 1232 1441 1240 Q 1477 1244 1480 1277 L 1462 1265 L 1440 1270 L 1423 1266 L 1410 1282 L 1417 1308 Z','leather');
  for(const [x,y] of [[1392,1255],[1412,1245],[1437,1248],[1457,1260]])oval(d,x,y,10,10,'leather');
  line(d,[[1446,1291],[1461,1297]],4,'ink');line(d,[[1451,1320],[1462,1317]],3,'leather');
  // Both supporting hands grip the legs and cloak, making the action legible.
  line(d,[[1340,1430],[1390,1485],[1520,1430]],31,'leather');oval(d,1531,1420,19,17,'skin');
  line(d,[[1470,1420],[1550,1480],[1638,1440]],29,'leather');oval(d,1646,1431,18,15,'skin');
  star(d,1920,310,24,'silver');star(d,1490,1500,18,'light');d.fill(ring(1530,1380,12,19),'gold');
}

export function unmaking(g,m,d){
  base(d,'unmaking');clouds(d,44,'shadow',10,960);
  d.fill(poly([[0,0],[600,0],[1150,1040],[1700,1240],[2480,1110],[3230,0],[3600,0],[3600,2020],[0,2020]]),'rock');
  d.fill(ellipse(1800,1500,830,400),'water');
  for(let j=0;j<12;j++){const p=[];for(let i=0;i<90;i++){const a=i/90*Math.PI*2;p.push([1800+Math.cos(a)*(730-j*52),1500+Math.sin(a)*(320-j*19)]);}line(d,p,11,j%3?'red':'flame');}
  d.fill(poly([[0,1600],[520,1330],[1250,1430],[1530,1300],[1530,1370],[1280,1510],[520,1430],[0,1740]]),'shadow');
  figure(d,1130,1440,.58,{robe:'robe',hood:false});figure(d,1250,1440,.6,{robe:'leather',hood:false});
}
export function fallingRing(g,m,d){const p=new Path2D();p.ellipse(1820,730,174,218,.26,0,Math.PI*2);p.ellipse(1820,730,123,166,.26,Math.PI*2,0,true);d.fill(p,'gold');}

export function renewal(g,m,d){
  base(d,'renewal');clouds(d,29,'mist',9,590);mountains(d,92,1020,430,'mountain');
  for(const [x,y,s] of [[380,1270,.63],[3200,1260,.65]])city(d,x,y,s,73);
  rect(d,0,1470,W,550,'stone');
  for(let y=1520;y<H;y+=82)line(d,[[0,y],[W,y]],4,'rocklit');
  for(let i=-8;i<=8;i++)line(d,[[1800+i*62,1470],[1800+i*280,H]],5,'rocklit');
  oval(d,1800,1610,550,130,'stonelit');oval(d,1800,1600,488,104,'water');
  tree(d,1800,1560,1.68,231,'white');
  for(const x of [900,1100,2500,2700])figure(d,x,1730,.79,{robe:x<1600?'robe':'white',hood:false});
  figure(d,1560,1830,1.05,{robe:'white',hood:false});figure(d,2100,1830,.98,{robe:'robe',hood:false});
  for(let i=0;i<9;i++)star(d,900+i*225,1830+Math.sin(i)*40,9,'gold',5);
}

export function havens(g,m,d){
  base(d,'havens');clouds(d,11,'mist',9,850);
  water(d,1110,38,'water',2130);
  d.fill(poly([[0,840],[390,960],[550,1370],[840,1670],[1030,2020],[0,2020]]),'rock');
  for(const [x,y,w,h] of [[260,1170,120,670],[485,1260,120,750],[685,1450,110,610]])tower(d,x,y,w,h,'stone');
  d.fill(poly([[0,1660],[460,1520],[1140,1670],[1060,1760],[460,1660],[0,1810]]),'stone');
  for(let i=0;i<12;i++)arch(d,100+i*82,1720+i*4,42,77,'stonelit','ink',8);
  for(let i=0;i<7;i++)line(d,[[2010-i*8,1490+i*33],[2270+i*25,1505+i*32],[2500+i*55,1530+i*31]],6,'silver',undefined,1);
  figure(d,910,1710,.61,{robe:'robe',hood:false});figure(d,825,1690,.49,{robe:'leather',hood:false});
  star(d,2130,480,38,'silver');star(d,2130,480,13,'light');
  tree(d,150,1850,.87,352,'green',.25);
}
export function departingShip(g,m,d){ship({...d,fill:(p,r,c)=>d.fill(p,['wood','sail','gold'].includes(r)?'ship'+r:r,c)},2210,1430,1.15);}

export const drawings={creation,trees,crown,numenor,forge,alliance,shire,fellowship,moria,lorien,argonath,fangorn,rohan,beacons,courage,burden,unmaking,renewal,havens};
