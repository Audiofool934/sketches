import {W,H} from "./drawing.js";
import {DOOR,LAMP,shireRegions,drawShire} from "./shire-art.js";
export const config={
  panel:{w:W,h:H},res:2,background:"sky",
  camera:{keys:[[28.5,1520,890,2820],[30.4,1520,890,2790],[32.5,1390,870,2370],[36,1220,860,1740]],tilt:[[28.5,3],[32.5,5],[36,8]],yaw:[[28.5,-1],[36,-3]],aperture:.019,drift:.002},
  light:{key:{az:128,el:18,color:[.63,.75,1],power:.95},fill:{az:-40,el:36,color:[.50,.61,.86],power:.38},sky:[.075,.12,.18],ground:[.025,.03,.02],exposure:.55,grout:"#615e55",wet:[.3,1.35],points:[{x:LAMP[0],y:LAMP[1],z:270,color:"#ffc272",power:.46,flicker:.04},{x:758,y:810,z:120,color:"#efba75",power:.09},{x:1582,y:825,z:120,color:"#efba75",power:.11}]},
  rims:[{figures:["figure"],light:LAMP,warm:"rim",width:3,min:.25}],
  sinopia:{groups:[["sky","cloud"],["hill","grass","far","leaf"],["door","join","gold"],["stone"]]}
};
export const regions=()=>shireRegions(true);
export const draw=(g,m,D)=>drawShire(g,m,D,true);
export const events={ignite:[{regions:["lamp","window"],at:29.35,from:LAMP,speed:1250,jitter:.03}]};
