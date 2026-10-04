const GOLD=['#755026','#976a2e','#ad7935','#d5a956','#f0d48d'];
const SILVER=['#647f90','#96acb8','#b8cbd0','#e0e3d6'];
const STONE=['#75644f','#8c775a','#b7a482','#ded0ab'];
export const looks={
  creation:{sky:['#040b16','#0c2037','#23445b'],land:['#0b1828','#203445','#3b5261'],leaf:['#778c89','#d2ceaa'],water:['#0e2438','#21475a','#477587']},
  trees:{sky:['#102138','#294e5d','#819183'],land:['#183435','#43644e','#8c9b66'],leaf:['#4d704b','#91a569','#d6cc8c'],water:['#153b41','#365f63','#819b91']},
  crown:{sky:['#090c1b','#1c2137','#49364b'],land:['#11131f','#302a39','#6b5361'],leaf:['#4e6171','#8b9b9d'],water:['#162539','#365165','#74879b']},
  numenor:{sky:['#173450','#496985','#a2b6be'],land:['#263d48','#5b7476','#b3b6a0'],leaf:['#334b40','#809176'],water:['#102b43','#265a70','#6b9ba9']},
  forge:{sky:['#100e1b','#372336','#9f573b'],land:['#191721','#4a3036','#935137'],leaf:['#815939','#bf9557'],water:['#271621','#69352b','#c77636']},
  shire:{sky:['#314f64','#83a59d','#d6d6b4'],land:['#244333','#557149','#96a26b'],leaf:['#264c36','#587942','#9fb66c'],water:['#274b4b','#5a8575','#b6b9a0']},
  fellowship:{sky:['#182f49','#567789','#c4cbbb'],land:['#233a46','#586d71','#9daca5'],leaf:['#254a3e','#4e795d','#a1a779'],water:['#244a63','#618da3','#d1d9cb']},
  moria:{sky:['#050d17','#152b40','#3b5465'],land:['#0c1b28','#294151','#547281'],leaf:['#324b5b','#76929d'],water:['#06121d','#1b354b','#4f6e82']},
  lorien:{sky:['#122534','#405b58','#a2aa85'],land:['#1c3c37','#47614c','#9b9d68'],leaf:['#726135','#ad9450','#dfc47d'],water:['#15343a','#486b6a','#a3b7a0']},
  argonath:{sky:['#243d50','#81969b','#d4d3b5'],land:['#273b41','#526a65','#a4ae94'],leaf:['#22443d','#50725b','#a9ad78'],water:['#163b49','#396d78','#91ada4']},
  fangorn:{sky:['#142c2d','#355448','#8c9470'],land:['#172d28','#3c5841','#8a9165'],leaf:['#264b35','#547648','#9aaa63'],water:['#183936','#3c6660','#8ca28b']},
  rohan:{sky:['#1d2c3c','#66787c','#cdc7a1'],land:['#303e37','#687653','#b5ae76'],leaf:['#56603e','#9f9c60'],water:['#283b47','#607478','#b8bca7']},
  beacons:{sky:['#1a304e','#59788d','#c3bdab'],land:['#203447','#4e6879','#a7b4b7'],leaf:['#374c42','#7f8a60'],water:['#293b52','#617e96','#bdc9c5']},
  courage:{sky:['#263345','#697882','#ccbba0'],land:['#383c39','#74765d','#b8ac7d'],leaf:['#5f6843','#a7a16a'],water:['#313b44','#697781','#bcc0ae']},
  burden:{sky:['#100e1c','#37293c','#8e6050'],land:['#171a23','#39333d','#766368'],leaf:['#554442','#a77c60'],water:['#361f26','#874430','#df9851']},
  unmaking:{sky:['#130e17','#44252e','#b36839'],land:['#15151d','#493238','#866455'],leaf:['#6b4442','#b17657'],water:['#51252a','#a84e2e','#efb55d']},
  renewal:{sky:['#39576a','#87a5a8','#ded5ad'],land:['#385548','#7b8f6b','#c0c09b'],leaf:['#77996d','#bed19a','#ebdfb3'],water:['#365f69','#89ada8','#d9d8b9']},
  havens:{sky:['#1a3550','#6e91a2','#d9bd91'],land:['#263e4a','#638081','#acb7a1'],leaf:['#456550','#9caa7c'],water:['#173d55','#447a8d','#a4b8b2']}
};
export function regionsFor(id){const l=looks[id==='alliance'?'forge':id];const r=(name,size,mode,mat,tray,extra={})=>({name,size,mode,mat,tray,...extra});const regions=[
  r('sky',16,'sky','glass',l.sky),r('mist',13,'sky','marble',[l.sky[1],l.sky[2]]),
  r('mountain',14,'contour','marble',l.land),r('rock',12,'rubble','basalt',l.land),r('rocklit',8,'contour','marble',[l.land[1],l.land[2]]),r('snow',7,'contour','marble',SILVER),
  r('land',13,'ground','limestone',l.land),r('meadow',11,'contour','glass',l.leaf),r('water',12,'ground','glass',l.water,{ripple:.06}),r('foam',4,'ground','silver',[l.water[1],l.water[2]],{thin:true,ripple:.05}),
  r('gold',5,'contour','gold',GOLD),r('goldleaf',6,'contour','gold',GOLD),r('silver',4.5,'contour','silver',SILVER),r('white',5,'contour','marble',['#97adb0','#c5d0c4','#ece5d0']),
  r('light',4,'radial','emit',['#8bafbd','#c3d1cd','#efe5bf'],{emit:.55,center:[1800,650]}),r('flame',4,'contour','emit',['#874626','#ba7135','#e7b05c','#ffe1a3'],{emit:.8}),
  r('stone',9,'contour','limestone',STONE),r('stonelit',7,'flow','limestone',['#b1a080','#d2c2a1','#eee1bc'],{angle:Math.PI/2}),r('roof',7,'flow','glass',[l.land[0],l.land[1]]),
  r('ink',6,'contour','basalt',['#090f16','#111d25','#1c2d36']),r('shadow',13,'rubble','basalt',['#080f17','#12212b','#21363d']),r('rim',3.5,'contour','gold',['#65756b','#ad9b6e','#d7c496'],{thin:true}),
  r('trunk',7,'contour','limestone',['#323729','#5e6143','#969573']),r('leaf',7,'contour','glass',l.leaf),r('pine',8,'contour','glass',[l.land[0],l.leaf[0],l.leaf[1]]),
  r('skin',3.5,'contour','terracotta',['#836849','#b29970','#ddc49a']),r('leather',5,'contour','terracotta',['#443725','#6a5334','#a18552']),r('wood',5,'flow','limestone',['#463728','#7c6340','#b69b65']),
  r('sail',5,'flow','marble',['#94a6a0','#c3c9b3','#efe1b8'],{angle:Math.PI/2}),r('robe',5,'contour','glass',['#204438','#44705b','#90a68a']),r('rider',4,'contour','glass',['#283b36','#527255','#afaa76']),
  r('horse',5,'contour','limestone',['#463e34','#7e735c','#b6aa8b']),r('banner',4,'flow','glass',['#164334','#3b7150','#839c6f'],{angle:Math.PI/2}),r('red',5,'contour','terracotta',['#542b2c','#915039','#c98655'])
];
  if(id==='unmaking')regions.find(r=>r.name==='gold').motion={start:185.55,end:188.5,pivot:[1820,730],dx:30,dy:710,scale:.55,angle:.8};
  if(id==='havens')for(const name of ['wood','sail','gold']){
    const reg=regions.find(r=>r.name===name);
    regions.push({...reg,name:'ship'+name,motion:{start:200,end:206.307,pivot:[2210,1430],dx:-140,dy:-110,scale:.76,angle:0}});
  }
  return regions;
}
