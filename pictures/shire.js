import {W,H} from "./drawing.js";
import {DOOR,LAMP,shireRegions,drawShire} from "./shire-art.js";
export const config={
  panel:{w:W,h:H},res:2,background:"sky",
  camera:{keys:[[0,1100,800,450],[1.5,1110,798,620],[3.7,1490,880,2730],[5.1,1560,880,2760],[6.6,1110,800,1040],[8.2,1110,800,1040]],tilt:[[0,34],[1.5,28],[3.7,3],[5.1,3],[6.6,12]],yaw:[[0,-11],[3.7,-1],[6.6,4]],aperture:.025,drift:.002},
  light:{key:{az:[[0,115],[6.6,137]],el:24,color:[1,.90,.70],power:2.3},fill:{az:-65,el:40,color:[.63,.79,.87],power:.6},sky:[.18,.24,.24],ground:[.055,.065,.03],exposure:.45,grout:"#716851",wet:[.35,1.3],points:[{x:[[0,900],[2,1180],[5,1500]],y:670,z:120,color:"#ffcd7d",power:.05}]},
  build:{origin:DOOR,start:-5,end:-1,speeds:{gold:3,door:2,sky:.65},rise:.12,ease:.25},
  rims:[{figures:["figure"],dir:[-1,-1],warm:"rim",width:3,min:.3}],
  sinopia:{groups:[["sky","cloud"],["hill","grass","far","leaf"],["door","join","gold"],["stone"]]}
};
export const regions=()=>shireRegions(false);
export const draw=(g,m,D)=>drawShire(g,m,D,false);
