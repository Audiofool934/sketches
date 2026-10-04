// Shared drawing vocabulary, in millimetres on a physical mosaic wall.
// Each fill becomes irregular tesserae in the inherited stone cutter.
import { poly, circle, ellipse, ring, stroke, blob } from '../../engine/paint.js';
import { rng } from '../../engine/util.js';
export { poly, circle, ellipse, ring, stroke, blob, rng };
export const W=3600, H=2020;

export function shape(d,h,region,color) { d.fill(new Path2D(h),region,color); }
export function rect(d,x,y,w,h,reg,color) { d.fill(poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]),reg,color); }
export function line(d,pts,w,reg,color,end=w) { d.fill(stroke(pts,w,end,8),reg,color); }
export function oval(d,x,y,rx,ry,reg,color) { d.fill(ellipse(x,y,rx,ry),reg,color); }
export function star(d,x,y,r=35,reg='silver',points=8) {
  const p=[];for(let i=0;i<points*2;i++){const a=i*Math.PI/points-Math.PI/2,k=i%2?.2:1;p.push([x+Math.cos(a)*r*k,y+Math.sin(a)*r*k]);}d.fill(poly(p),reg);
}
export function sky(d,top,bottom,h=H) { rect(d,0,0,W,h,'sky',d.linear(0,0,0,h,[[0,top],[1,bottom]])); }
export function stars(d,seed=12,n=100,ymax=900) { const r=rng(seed);for(let i=0;i<n;i++){const x=110+r()*(W-220),y=90+r()*ymax;star(d,x,y,2+r()*7,i%5?'silver':'gold',4);} }
export function clouds(d,seed=7,reg='mist',n=10,ymax=850) {
  const r=rng(seed);for(let i=0;i<n;i++){const x=r()*W,y=150+r()*ymax,w=160+r()*690;d.fill(blob([[x-w,y],[x-w*.4,y-18-r()*30],[x+w*.4,y-10],[x+w,y+5],[x+w*.3,y+23],[x-w*.5,y+16]]),reg);}
}
export function mountains(d,seed,y,amplitude,reg='rock',base=H) {
  const r=rng(seed),p=[[-100,base],[-100,y]];
  for(let x=-100;x<W+220;){x+=80+r()*220;p.push([x,y-amplitude*(.18+.82*r())]);}
  p.push([W+100,base]);d.fill(poly(p),reg);
  for(let i=2;i<p.length-2;i++){
    const [x,yy]=p[i],left=p[i-1],right=p[i+1];
    if(yy>=left[1]||yy>=right[1])continue;
    const drop=Math.min(left[1]-yy,right[1]-yy);
    d.fill(poly([[x,yy],[x+22,yy+drop*.52],[x+90,y+100],[right[0],right[1]]]),'rocklit');
    if(reg==='mountain'&&amplitude>400){
      const cap=Math.min(90,drop*.3),xl=x+(left[0]-x)*cap/(left[1]-yy),xr=x+(right[0]-x)*cap/(right[1]-yy);
      d.fill(poly([[x,yy],[xr,yy+cap],[x+12,yy+cap*.64],[x-6,yy+cap*.91],[xl,yy+cap]]),'snow');
    }
  }
}
export function water(d,y,seed=41,reg='water',reflect=1800) {
  rect(d,0,y,W,H-y,reg);const r=rng(seed);
  for(let i=0;i<160;i++){const v=r(),yy=y+Math.pow(v,1.4)*(H-y),x=r()*W,len=12+v*170;line(d,[[x,yy],[x+len,yy-1]],2+v*5,'foam');}
  if(reflect!==null)for(let i=0;i<38;i++){const v=i/38,yy=y+12+v*v*(H-y-25),hw=12+v*150,x=reflect+Math.sin(i*1.67)*hw*.4;line(d,[[x-hw,yy],[x+hw,yy]],3+v*9,i%4?'silver':'gold');}
}
export function tree(d,x,y,s=1,seed=4,kind='green',lean=0) {
  const r=rng(seed),leaf=kind==='gold'?'goldleaf':kind==='silver'?'silver':kind==='white'?'white':'leaf';
  const branch=(px,py,len,a,w,depth)=>{
    const ex=px+Math.cos(a)*len,ey=py+Math.sin(a)*len;
    line(d,[[px,py],[px+Math.cos(a-.15)*len*.45,py+Math.sin(a-.15)*len*.45],[ex,ey]],w,kind==='white'?'white':'trunk',undefined,w*.58);
    if(depth>0){branch(ex,ey,len*(.65+.12*r()),a-.35-.25*r(),w*.6,depth-1);branch(ex,ey,len*(.59+.15*r()),a+.37+.22*r(),w*.61,depth-1);}
    if(depth<2&&kind!=='bare')for(let i=0;i<5;i++){const xx=ex+(r()-.5)*100*s,yy=ey+(r()-.5)*55*s;d.fill(ellipse(xx,yy,(10+13*r())*s,(5+8*r())*s,(r()-.5)*2),leaf);}
  };
  branch(x,y,330*s,-Math.PI/2+lean,55*s,5);
  for(let i=0;i<5;i++)line(d,[[x,y-50*s],[x+(i-2)*45*s,y+15*s],[x+(i-2)*95*s,y+35*s]],20*s,'trunk',undefined,2*s);
}
export function fir(d,x,y,h,reg='pine') {
  line(d,[[x,y],[x,y-h]],h*.026,reg);
  for(let i=0;i<9;i++){const v=i/9,yy=y-h+v*h;d.fill(poly([[x,yy-h*.14],[x-h*(.06+v*.22),yy+h*.17],[x+h*(.06+v*.22),yy+h*.17]]),reg);}
}
export function figure(d,x,y,s=1,{robe='ink',face='skin',staff=false,sword=false,hood=true,pack=false,arms='rest',hat=false}={}) {
  const P=(a,b)=>[x+a*s,y+b*s];
  d.fill(poly([P(-28,-155),P(17,-160),P(42,-45),P(29,-16),P(-42,-18)]),robe);
  line(d,[P(-16,-35),P(-23,0)],12*s,'ink');line(d,[P(15,-35),P(32,0)],12*s,'ink');
  oval(d,x-3*s,y-181*s,24*s,29*s,hood?robe:face);
  if(hood)oval(d,x+6*s,y-181*s,11*s,17*s,face);
  else {
    d.fill(blob([P(-27,-184),P(-25,-204),P(-3,-215),P(14,-204),P(5,-197),P(-13,-194),P(-12,-171),P(-25,-166)]),'leather');
    d.fill(poly([P(16,-187),P(27,-175),P(15,-174)]),face);
    oval(d,x+10*s,y-187*s,2.6*s,2*s,'ink');
    line(d,[P(9,-162),P(17,-165)],2*s,'leather');
  }
  if(hat)d.fill(poly([P(-46,-200),P(22,-255),P(35,-198)]),robe);
  if(pack)oval(d,x-32*s,y-120*s,24*s,35*s,'leather');
  if(arms==='raise')line(d,[P(17,-145),P(54,-180),P(66,-231)],14*s,robe);
  else line(d,[P(18,-145),P(40,-95)],14*s,robe);
  if(staff){line(d,[P(54,0),P(62,-230)],5*s,'wood');star(d,x+62*s,y-239*s,12*s,'light',4);}
  if(sword){line(d,[P(40,-98),P(82,-241)],7*s,'silver');line(d,[P(61,-137),P(87,-130)],6*s,'gold');}
  line(d,[P(-21,-147),P(-29,-38)],3*s,'rim');
}
export function horse(d,x,y,s=1,{rider=true,banner=false,reg='horse',facing=1}={}) {
  const P=(a,b)=>[x+a*s*facing,y+b*s];
  d.fill(blob([P(-98,-81),P(-46,-132),P(23,-136),P(50,-193),P(82,-216),P(110,-180),P(100,-155),P(69,-154),P(69,-74),P(18,-46),P(-65,-57)]),reg);
  for(const pts of [[[-57,-65],[-78,-15],[-104,0]],[[-25,-58],[-5,-15],[20,0]],[[42,-66],[75,-37],[111,-52]],[[64,-87],[110,-85],[130,-55]]])line(d,pts.map(p=>P(...p)),12*s,reg,undefined,8*s);
  line(d,[P(-88,-107),P(-140,-65),P(-160,-90)],16*s,reg,undefined,3*s);
  line(d,[P(62,-192),P(24,-130)],10*s,'rim');
  if(rider){figure(d,x-10*s*facing,y-110*s,.67*s,{robe:'rider',hood:false});line(d,[P(-8,-218),P(31,-123)],5*s,'gold');}
  if(banner){line(d,[P(-18,-115),P(-5,-430)],5*s,'wood');d.fill(poly([P(-5,-427),P(117,-408),P(65,-368),P(-8,-368)]),'banner');}
}
export function arch(d,x,y,w,h,reg='stone',inner='ink',thick=35) {
  thick=Math.min(thick,w*.4);
  const p=new Path2D();p.moveTo(x-w/2,y);p.lineTo(x-w/2,y-h+w/2);p.arc(x,y-h+w/2,w/2,Math.PI,0);p.lineTo(x+w/2,y);p.closePath();d.fill(p,reg);
  const q=new Path2D();q.moveTo(x-w/2+thick,y);q.lineTo(x-w/2+thick,y-h+w/2);q.arc(x,y-h+w/2,w/2-thick,Math.PI,0);q.lineTo(x+w/2-thick,y);q.closePath();d.fill(q,inner);
}
export function tower(d,x,y,w,h,reg='stone',roof=true) {
  d.fill(poly([[x-w/2,y],[x-w*.42,y-h],[x+w*.42,y-h],[x+w/2,y]]),reg,d.linear(x-w/2,y,x+w/2,y,[[0,'#ded0ab'],[.4,'#b7a482'],[1,'#75644f']]));
  rect(d,x-w*.4,y-h,w*.25,h,'stonelit');
  if(roof)d.fill(poly([[x-w*.57,y-h],[x,y-h-w*.85],[x+w*.57,y-h]]),'roof');
  for(let yy=y-h+45;yy<y-20;yy+=86){arch(d,x+w*.17,yy,w*.18,36,'stone','ink',3);line(d,[[x-w*.4,yy+10],[x+w*.43,yy+10]],2,'rocklit');}
}
export function city(d,x,y,s=1,seed=18) {
  const r=rng(seed);
  for(let row=0;row<4;row++){const yy=y-row*120*s,half=(520-row*100)*s;
    const wall=new Path2D();wall.moveTo(x-half,yy-62*s);wall.quadraticCurveTo(x,yy+20*s,x+half,yy-62*s);wall.lineTo(x+half,yy+34*s);wall.quadraticCurveTo(x,yy+116*s,x-half,yy+34*s);wall.closePath();
    d.fill(wall,'stone',d.linear(x-half,yy,x+half,yy,[[0,'#75644f'],[.42,'#ded0ab'],[1,'#8c775a']]));
    for(let k=0;k<9-row;k++){const xx=x-half+(k+.5)*half*2/(9-row);tower(d,xx,yy,(33+20*r())*s,(90+90*r())*s,'stone',k%3!==1);}
    for(let k=0;k<22-row*4;k++){const u=(k+.5)/(22-row*4),xx=x-half+2*half*u,archY=yy+24*s+Math.sin(u*Math.PI)*36*s;arch(d,xx,archY,16*s,33*s,'stone','ink',3*s);}
    line(d,[[x-half,yy-63*s],[x,yy-23*s],[x+half,yy-63*s]],7*s,'silver');
  }
  tower(d,x+40*s,y-370*s,100*s,340*s);
}
export function ship(d,x,y,s=1,reg='wood') {
  d.fill(blob([[x-170*s,y-40*s],[x-50*s,y],[x+120*s,y-15*s],[x+210*s,y-110*s],[x+130*s,y-45*s],[x-140*s,y-20*s]]),reg);
  line(d,[[x+25*s,y-35*s],[x+25*s,y-310*s]],6*s,'gold');
  d.fill(blob([[x+32*s,y-290*s],[x+150*s,y-230*s],[x+160*s,y-110*s],[x+33*s,y-80*s],[x+58*s,y-180*s]]),'sail');
  d.fill(blob([[x+14*s,y-277*s],[x-92*s,y-190*s],[x-118*s,y-110*s],[x+13*s,y-88*s],[x-2*s,y-175*s]]),'sail');
  line(d,[[x-139*s,y-20*s],[x+72*s,y-6*s],[x+156*s,y-61*s]],4*s,'gold');
}
