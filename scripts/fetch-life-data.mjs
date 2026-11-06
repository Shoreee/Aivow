// Refresh public demo-area points from the same OpenFreeMap/OSM tiles used by Life.
import fs from 'node:fs/promises';
import {VectorTile} from '@mapbox/vector-tile';
import {PbfReader} from 'pbf';
const tilejson=await (await fetch('https://tiles.openfreemap.org/planet')).json();
const points=[],paths=[];const coords=[];for(let x=13720;x<=13721;x++)for(let y=6693;y<=6695;y++)coords.push([x,y]);
await Promise.all(coords.map(async([x,y])=>{
 const r=await fetch(tilejson.tiles[0].replace('{z}','14').replace('{x}',x).replace('{y}',y),{signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error(`Tile ${r.status}`);
 const tile=new VectorTile(new PbfReader(new Uint8Array(await r.arrayBuffer())));
 for(const name of ['poi','transportation']){
  const layer=tile.layers[name];if(!layer)continue;
  for(let i=0;i<layer.length;i++){
   const f=layer.feature(i),p=f.properties,g=f.toGeoJSON(x,y,14).geometry;
   if(name==='poi'&&g.type==='Point'&&(p.name||p['name:en'])){
    const [lng,lat]=g.coordinates;if(lng<121.465||lng>121.487||lat<31.211||lat>31.243)continue;
    const tags=`${p.class} ${p.subclass}`;let kind;if(/cafe|coffee/.test(tags))kind='cafe';else if(/book|librar/.test(tags))kind='bookshop';else if(/park|garden/.test(tags))kind='park';else if(/museum|gallery|attraction|monument/.test(tags))kind='culture';if(!kind)continue;
    points.push({id:`osm-${f.id||`${x}-${y}-${i}`}`,name:String(p['name:zh']||p.name||p['name:en']),nameEn:String(p['name:en']||p['name:latin']||p.name),kind,lng,lat});
   }
   if(name==='transportation'&&g.type==='LineString'&&/path|footway|pedestrian/.test(`${p.class} ${p.subclass}`)){
    const line=g.coordinates.filter(([lng,lat])=>lng>=121.469&&lng<=121.477&&lat>=31.213&&lat<=31.220);
    if(line.length>=2&&line.length<=60)paths.push(line.map(c=>c.map(v=>Number(v.toFixed(7)))));
   }
  }
 }
}));
const distance=p=>(p.lng-121.474)**2+(p.lat-31.219)**2;
const unique=[...new Map(points.map(p=>[`${p.name}-${p.lng.toFixed(4)}`,p])).values()].sort((a,b)=>distance(a)-distance(b));
paths.sort((a,b)=>distance({lng:a[0][0],lat:a[0][1]})-distance({lng:b[0][0],lat:b[0][1]}));
// Keep map legible while retaining several categories and real walking geometry.
const selected=['park','bookshop','culture','cafe'].flatMap(kind=>unique.filter(p=>p.kind===kind).slice(0,kind==='cafe'?12:8));
const output={source:'OpenFreeMap / OpenMapTiles / OpenStreetMap',tileVersion:tilejson.tiles[0].split('/')[4],fetchedAt:new Date().toISOString(),points:selected,paths:paths.slice(0,18)};
await fs.writeFile('public/maps/life-data.json',JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({points:selected.length,paths:output.paths.length,names:selected.slice(0,12).map(p=>p.name)}));
