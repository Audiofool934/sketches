import { W,H } from './craft.js';
import { regionsFor } from './materials.js';
import { drawings,greatWave,shireTravellers,fellowshipPeople,beaconFires,fallingRing,departingShip,balrog } from './drawings.js';

// Source-specific phrase anchors. Every key is in the original recording's seconds.
export const clock=[
  ['creation',0,7.5],['trees',7.5,21],['crown',21,34.5],['forge',34.5,46],
  ['numenor',46,54.8],['alliance',54.8,62.3],['shire',62.3,71],['fellowship',71,83],['moria',83,94],
  ['lorien',94,108.5],['argonath',108.5,121],['fangorn',121,132],['rohan',132,146],
  ['beacons',146,158.5],['courage',158.5,170.5],['burden',170.5,182.5],
  ['unmaking',182.5,190.5],['renewal',190.5,198.5],['havens',198.5,206.307]
];

const cameras={
  creation:[[0,1800,740,200],[1.7,1800,740,370],[3.4,1800,850,1450],[6.1,1800,990,3100],[7.5,1800,950,3250]],
  trees:[[7.5,1780,1010,3120],[11,1780,990,3090],[14.5,2320,790,1880],[17.5,1620,930,2550],[21,1800,1150,1980]],
  crown:[[21,1800,1150,1980],[24.2,1800,1110,2510],[27,1790,1070,3200],[30.3,1500,1290,2260],[34.5,1780,980,3100]],
  numenor:[[46,1800,1000,3220],[48,1770,1040,2900],[50,1580,1150,2580],[52,1440,1270,2550],[54.8,1800,1000,3020]],
  forge:[[34.5,1800,950,2850],[37.8,1800,880,1990],[41.5,1820,910,2370],[44,1830,1350,2620],[46,1800,1420,1850]],
  alliance:[[54.8,1800,1150,3130],[57.3,1800,1210,3020],[59.1,1820,1490,2350],[62.3,2020,1490,1780]],
  shire:[[62.3,1200,1235,510],[63.4,1190,1235,720],[64.3,1450,1210,2340],[67,1770,1060,3130],[71,2080,1290,2490]],
  fellowship:[[71,1820,1060,3040],[74.5,1830,1050,3040],[77.5,1810,1450,2140],[80,1700,1400,2480],[83,1800,1070,3100]],
  moria:[[83,1800,1050,3070],[86,1800,1180,2870],[89,2060,1340,2760],[91.6,2150,1390,2450],[94,1800,1130,2900]],
  lorien:[[94,1770,1010,3010],[97,1760,1020,3010],[100,1900,1450,2020],[103.5,2120,1400,1070],[108.5,1790,1390,2390]],
  argonath:[[108.5,1800,1060,3100],[112,1800,1030,3050],[115,1780,1230,2580],[118.4,1820,1600,1860],[121,1830,1470,2300]],
  fangorn:[[121,1820,1100,3010],[124,1810,1100,3010],[127,1090,1180,2090],[130,1760,1440,2430],[132,1800,1100,3000]],
  rohan:[[132,1770,1190,3100],[136,1770,1200,3100],[139,1430,1390,2680],[143.3,1720,1260,3070],[146,1840,1050,3120]],
  beacons:[[146,1500,1100,3030],[149.55,1480,1050,2790],[152,2070,1050,2470],[155.2,2780,1260,1970],[158.5,2430,1260,2260]],
  courage:[[158.5,1900,1100,3150],[161.2,1900,1120,3150],[163.4,1830,1270,2790],[166.5,1800,1360,2670],[170.5,1810,1260,2850]],
  burden:[[170.5,1800,1070,3110],[173,1790,1110,3110],[175.7,1490,1430,1510],[178.6,1460,1400,1340],[182.5,1800,1150,2830]],
  unmaking:[[182.5,1820,730,1190],[184.7,1820,840,1560],[186.8,1820,1160,2540],[189,1820,1290,2750],[190.5,1800,1100,2920]],
  renewal:[[190.5,1800,1130,2760],[193,1800,1140,2850],[195.5,1850,950,2900],[198.5,1930,1000,3010]],
  havens:[[198.5,1900,1060,3060],[201,1950,1050,3160],[203.5,1950,1020,3200],[206.307,1960,1000,3210]]
};
const warm=new Set(['trees','forge','shire','lorien','rohan','courage','unmaking','renewal']);
const dark=new Set(['creation','crown','moria','burden','unmaking']);
export function scene(id){
  const [,start,end]=clock.find(x=>x[0]===id),sun=warm.has(id),isDark=dark.has(id);
  const mid=(start+end)/2;
  const config={panel:{w:W,h:H},res:2,background:'sky',
    build:{origin:[1800,740],start:-.1,end:5.0,speeds:{light:6,silver:3,gold:2.5,sky:.7},rise:.1,ease:.3},
    camera:{keys:cameras[id],tilt:[[start,3],[mid,6],[end,3]],yaw:[[start,-.7],[end,.7]],drift:.002,aperture:.024},
    light:{key:{az:[[start,118],[mid,102],[end,89]],el:[[start,24],[mid,31],[end,27]],color:sun?[1,.83,.62]:[.7,.84,1],power:[[start,1.9],[mid,2.4],[end,2.0]]},
      fill:{az:-75,el:45,color:sun?[.57,.7,.78]:[.65,.75,.87],power:.6},sky:isDark?[.13,.16,.21]:[.2,.23,.23],ground:[.06,.065,.07],exposure:isDark?.45:.25,
      grout:isDark?'#242733':'#4e514b',wet:[.36,1.2],points:[]},
    ripple:{dir:[1,.2],wavelength:185,speed:43},
    rims:[{figures:['ink','robe','rider','horse','leather'],dir:[-1,-.8],width:4.0,warm:'rim',cool:'silver',min:.3}],
    sinopia:{groups:[['sky','mist'],['land','meadow','water','foam','mountain','rock','rocklit','snow'],['ink','robe','rider','horse','leather','skin'],['gold','silver','white','light','flame']]}
  };
  const point=(x,y,color,power,z=400)=>({x,y,z,color,power});
  if(id==='creation'){
    config.build.end=5.2;config.build.stages=[{reach:125,end:1.6},{end:5.2}];
    config.camera.tilt=[[0,19],[2,14],[5.5,3],[7.5,3]];
    config.light.points=[point(1800,740,'#c9d9ec',[[0,.01],[1.2,.085],[3,.14],[7.5,.04]],220)];
  }
  if(id==='trees')config.light.points=[point(1130,790,'#b4d7e5',.22,470),point(2460,790,'#f1cd78',.29,470)];
  if(id==='crown')config.light.points=[point(1800,1150,'#9dbddd',[[21,.08],[25,.13],[30,.18],[34.5,.08]],450)];
  if(id==='numenor')config.light.key.power=[[46,2.3],[48,2.6],[51,1.4],[54.8,1.2]];
  if(id==='forge')config.light.points=[point(1800,1390,'#f3a95a',[[34.5,.1],[39,.3],[43,.35],[46,.12]],550)];
  if(id==='shire')config.light.points=[point(1070,1230,'#ffd593',.14,350)];
  if(id==='moria')config.light.points=[point(1430,1510,'#b5d2ed',[[83,.04],[88,.18],[91,.24],[94,.02]],300),point(2380,1400,'#e4a46b',[[83,0],[88.2,0],[89.4,.25],[92,.32],[94,.01]],480)];
  if(id==='lorien')config.light.points=[point(2110,1390,'#d2e6ec',[[94,.06],[100,.09],[103.5,.16],[108.5,.08]],350)];
  if(id==='rohan'){config.light.key.power=[[132,1.0],[136,1.3],[139,2.1],[143.3,3.1],[146,2.4]];config.light.exposure=[[132,.25],[140,.4],[146,.4]];}
  if(id==='beacons')config.light.points=[[490,1390,147.15],[1050,1130,148.6],[1600,990,149.55],[2500,850,153.45]].map(([x,y,at])=>({...point(x,y,'#ffd090',.20,380),on:[at,end+2,.35],flicker:.07}));
  if(id==='burden')config.light.points=[point(1700,850,'#d99873',.18,600),point(1490,1500,'#d6e9ed',[[170.5,.035],[175.7,.13],[178.6,.18],[182.5,.12]],300)];
  if(id==='unmaking')config.light.points=[point(1800,1490,'#ffc17b',[[182.5,.14],[185.5,.3],[188,.65],[190.5,.22]],600)];
  if(id==='havens')config.light.key.power=[[198.5,2.2],[202,2.0],[206.307,1.5]];
  const arrivals=id==='numenor'?[{name:'great-wave',at:51.0,dur:2.5,from:[-1,0],draw:greatWave}]:id==='shire'?[{name:'travellers',at:66.45,dur:1.2,from:[-1,0],draw:shireTravellers}]:id==='fellowship'?fellowshipPeople:id==='beacons'?beaconFires:[];
  if(id==='unmaking')arrivals.push({name:'falling-ring',at:182.3,dur:.35,drop:.1,retainBackground:true,lift:.023,draw:fallingRing});
  if(id==='havens')arrivals.push({name:'last-ship',at:198.4,dur:.7,drop:.1,retainBackground:true,lift:.012,draw:departingShip});
  if(id==='moria')arrivals.push({name:'balrog',at:88.3,dur:1.1,from:[0,1],draw:balrog});
  const events={};
  if(id==='courage')events.dissolve=[{regions:['ink'],within:[1630,100,3600,1550],times:[166.55,167.4,168.5],dur:2.0,speed:.19}];
  if(id==='unmaking')events.dissolve=[{regions:['gold'],times:[188.5,188.7,188.9],dur:.7,speed:.08}];
  if(id==='moria')events.dissolve=[{regions:['white'],times:[92.15],dur:.8,speed:.12}];
  return {config,regions:()=>regionsFor(id),draw:drawings[id],arrivals,events};
}
