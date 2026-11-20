import * as T from '../../dist/vendor/three.module.min.js';
import {createArchitecture} from '../../dist/architecture.js';
import {topics} from '../../dist/content.js';
import {nodes,STOPS,buildGraph,walkRoute} from '../../dist/summit.js';
import {walkingObstacles} from '../../dist/navigation.js';
const mesh=(g,geo,col,x,y,z,sx=1,sy=1,sz=1)=>{let m=new T.Mesh(geo,new T.MeshBasicMaterial());m.position.set(x,y,z);m.scale.set(sx,sy,sz);g.add(m);return m};
const box=(g,x,y,z,w,h,d,col)=>mesh(g,new T.BoxGeometry(1,1,1),col,x,y+h/2,z,w,h,d);
const tree=(g,x,z,scale=1)=>{mesh(g,new T.CylinderGeometry(.035,.05,1,5),'',x,.55*scale,z,1,scale,1);mesh(g,new T.ConeGeometry(1,1,5),'',x,scale,z,.3*scale,.68*scale,.3*scale);mesh(g,new T.ConeGeometry(1,1,5),'',x,1.3*scale,z,.23*scale,.6*scale,.23*scale);};
const arch=createArchitecture({mesh,box,tree}),centers=nodes(topics),models=new Map();
for(const [id,c] of centers){let g=new T.Group(),t=topics.find(t=>t.id===id)||{kind:id==='university'?'university':STOPS[id]?.kind};g.position.set(c.x,c.y||0,c.z);arch.build(g,t);models.set(id,g);g.updateMatrixWorld(true);c.obstacles=walkingObstacles(g,c.y||0);}

// Include the fork's extra notice-board posts, which world.js adds outside createArchitecture.
const fork=models.get('fork'),board=new T.Group();board.position.set(-.5,-.06,-.62);board.rotation.y=-.12;board.scale.setScalar(1.15);fork.add(board);for(const x of [-.32,.32])box(board,x,.27,0,.06,.78,.06);box(board,0,.62,0,.74,.42,.05);const post=new T.Group();post.position.set(.1,0,.35);fork.add(post);box(post,0,.27,0,.05,.72,.05);centers.get('fork').obstacles=walkingObstacles(fork,0);
for(const [id,c]of centers)if(STOPS[id]?.ledge)c.obstacles=[];
const graph=buildGraph(centers);
export {centers,graph,arch,models};
