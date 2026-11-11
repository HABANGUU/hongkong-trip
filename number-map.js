// 홍콩 정부 주소 좌표(건물/지역 대표점), 바 레온은 OpenStreetMap POI.
const itineraryCoordinates=[
 [22.314019580,113.912746930],[22.313755890,114.171623641],
 [22.282607713,114.153615234],[22.283592228,114.154876525],
 [22.284251126,114.152508759],[22.276098234,114.172886422],
 [22.271246590,114.149881591],[22.281769035,114.153068739],
 [22.280734387,114.155595493],[22.2835553,114.1509456],
 [22.313755890,114.171623641]
];
let itineraryMap,numberLayers,mapEntries=[],markerById=new Map();
function coordinatesFor(s){
 if(Array.isArray(s.coordinates)&&s.coordinates.length===2&&s.coordinates.every(Number.isFinite)&&Math.abs(s.coordinates[0])<=90&&Math.abs(s.coordinates[1])<=180)return s.coordinates;
 const i=initialStops.findIndex(x=>x.id===s.id&&x.address===s.address);
 return i<0?null:itineraryCoordinates[i];
}
function fitNumberMap(city=false){
 if(!itineraryMap)return;
 const points=mapEntries.filter(x=>!city||x.coords[1]>114.1).map(x=>x.coords);
 if(points.length)itineraryMap.fitBounds(points,{padding:[45,45],maxZoom:16});
 else itineraryMap.setView([22.284,114.16],13);
}
function focusNumberMap(s){
 const coords=coordinatesFor(s);if(!coords||!itineraryMap)return;
 $('numberMapSection').scrollIntoView({behavior:'smooth',block:'start'});
 itineraryMap.setView(coords,17);markerById.get(s.id)?.openPopup();
}
function renderNumberMap(stops){
 if(!$('numberMap'))return;
 $('mapStops').replaceChildren();
 mapEntries=stops.map((stop,i)=>({stop,number:i+1,coords:coordinatesFor(stop)})).filter(x=>x.coords);
 const missing=stops.length-mapEntries.length;
 $('numberMapStatus').textContent=missing?`${missing}곳은 좌표가 없어 번호 지도에서 제외됐어요. 장소 수정에서 위도·경도를 입력하세요.`:'번호를 누르면 장소와 구글맵 링크를 볼 수 있어요. 가까운 번호는 지도를 확대해 확인하세요.';
 for(const [i,s] of stops.entries()){
  const b=button(`${i+1} ${s.name}`,()=>{showMap(s);focusNumberMap(s);});b.disabled=!coordinatesFor(s);$('mapStops').append(b);
 }
 if(typeof L==='undefined'){$('numberMapStatus').textContent='번호 지도 라이브러리를 불러오지 못했어요. 네트워크 연결 후 새로고침하거나 아래 구글맵을 이용하세요.';return;}
 if(!itineraryMap){
  itineraryMap=L.map('numberMap',{scrollWheelZoom:false}).setView([22.284,114.16],13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(itineraryMap).on('tileerror',()=>{$('numberMapStatus').textContent='배경 지도 일부를 불러오지 못했어요. 번호와 아래 구글맵 링크를 이용해주세요.';});
  numberLayers=L.layerGroup().addTo(itineraryMap);
  $('mapAll').onclick=()=>fitNumberMap(false);$('mapCity').onclick=()=>fitNumberMap(true);
 }
 numberLayers.clearLayers();markerById.clear();
 const groups=new Map();for(const entry of mapEntries){const key=entry.coords.join(',');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(entry);}
 for(const group of groups.values()){
  const label=group.map(x=>x.number).join(' · '),popup=el('div','number-popup');
  for(const {stop,number} of group){popup.append(el('strong','',`${number}. ${stop.name}`),el('p','',stop.address),link('구글맵에서 보기 ↗',mapUrl(stop)));}
  const marker=L.marker(group[0].coords,{title:group.map(x=>`${x.number}. ${x.stop.name}`).join(' / '),icon:L.divIcon({className:'number-marker',html:`<span>${label}</span>`,iconSize:[group.length>1?65:36,36],iconAnchor:[group.length>1?32:18,18]})}).addTo(numberLayers).bindPopup(popup,{maxWidth:210,minWidth:150});
  group.forEach(x=>markerById.set(x.stop.id,marker));
 }
 // 좌표 누락 장소를 건너뛰어 잘못된 경로를 그리지 않고 연속 구간만 연결한다.
 for(let i=1;i<stops.length;i++){const a=coordinatesFor(stops[i-1]),b=coordinatesFor(stops[i]);if(a&&b)L.polyline([a,b],{color:'#b65f39',weight:2,dashArray:'6 8',opacity:.65,interactive:false}).addTo(numberLayers);}
 fitNumberMap(false);
}
