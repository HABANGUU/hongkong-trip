'use strict';
// OSM은 홍콩을 countrycodes=hk로 묶지 않아 결과가 비므로 홍콩 영역 viewbox로 제한한다(2026-11-11 확인).
// 장소 편집창의 위치 입력 도우미: 이름 검색(OSM Nominatim), 구글맵 링크·좌표 붙여넣기, 지도 탭, 내 위치.
const HK_CENTER=[22.284,114.16];
let pickerMap,pickerMarker,lastSearchAt=0;

function round6(v){return Math.round(v*1e6)/1e6;}
function validPair(lat,lng){
 if(!Number.isFinite(lat)||!Number.isFinite(lng))return null;
 // 경도·위도 순서로 붙여넣은 경우(114.1, 22.2) 바로잡는다.
 if(Math.abs(lat)>90&&Math.abs(lng)<=90)[lat,lng]=[lng,lat];
 if(Math.abs(lat)>90||Math.abs(lng)>180)return null;
 return [round6(lat),round6(lng)];
}
function isShortMapLink(t){return /(^|\/\/)(maps\.app\.goo\.gl|goo\.gl\/maps)\//i.test(String(t||'').trim());}
// 구글맵 링크(핀 !3d!4d, 화면 중심 @, q/query/ll 파라미터), "22.28, 114.15", 22.28N 114.15E, 도분초 형식을 읽는다.
function parseCoords(text){
 let t=String(text||'').trim();if(!t)return null;
 try{t=decodeURIComponent(t.replace(/\+/g,' '));}catch{}
 const n='(-?\\d{1,3}(?:\\.\\d+)?)';
 const patterns=[
  new RegExp('!3d'+n+'!4d'+n),
  new RegExp('@'+n+','+n),
  new RegExp('[?&](?:q|query|ll|sll|destination|center|daddr)=(?:loc:)?\\s*'+n+'\\s*,\\s*'+n),
  new RegExp('^\\(?\\s*'+n+'\\s*[,\\s]\\s*'+n+'\\s*\\)?$')
 ];
 for(const p of patterns){const m=t.match(p);if(m)return validPair(Number(m[1]),Number(m[2]));}
 const dms=t.match(/(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:\.\d+)?)\s*(?:["″]|'')?\s*([NS])[\s,]+(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:\.\d+)?)\s*(?:["″]|'')?\s*([EW])/i);
 if(dms){const v=(d,m,s,h)=>(Number(d)+Number(m)/60+Number(s)/3600)*(/[SW]/i.test(h)?-1:1);return validPair(v(dms[1],dms[2],dms[3],dms[4]),v(dms[5],dms[6],dms[7],dms[8]));}
 const deg=t.match(/(\d{1,3}(?:\.\d+)?)\s*°?\s*([NS])[\s,]+(\d{1,3}(?:\.\d+)?)\s*°?\s*([EW])/i);
 if(deg)return validPair(Number(deg[1])*(/S/i.test(deg[2])?-1:1),Number(deg[3])*(/W/i.test(deg[4])?-1:1));
 return null;
}
function inHongKong([lat,lng]){return lat>22.13&&lat<22.57&&lng>113.82&&lng<114.45;}
function pickerStatus(text){$('pickerStatus').textContent=text;}

function setCoords(coords,source){
 $('lat').value=coords[0];$('lng').value=coords[1];
 if(pickerMap){
  if(!pickerMarker)pickerMarker=L.marker(coords,{draggable:true}).addTo(pickerMap).on('dragend',()=>{const p=pickerMarker.getLatLng();setCoords([round6(p.lat),round6(p.lng)],'핀을 옮겼어요');});
  else pickerMarker.setLatLng(coords);
  if(!/핀|지도/.test(source))pickerMap.setView(coords,Math.max(pickerMap.getZoom(),17));
 }
 pickerStatus(`${source} · ${coords[0]}, ${coords[1]}`+(inHongKong(coords)?'':' · 홍콩 밖 위치예요. 맞는지 확인해주세요.'));
 $('clearCoords').hidden=false;
}
function clearCoords(){
 $('lat').value='';$('lng').value='';
 if(pickerMarker&&pickerMap){pickerMap.removeLayer(pickerMarker);pickerMarker=null;}
 $('clearCoords').hidden=true;
 pickerStatus('위치가 없어요. 이름으로 찾거나, 링크·좌표를 붙여넣거나, 지도를 눌러주세요.');
}
function currentFormCoords(){const lat=String($('lat').value).trim(),lng=String($('lng').value).trim();return lat&&lng?validPair(Number(lat),Number(lng)):null;}

function initPickerMap(){
 if(typeof L==='undefined'){$('pickerMap').hidden=true;return;}
 if(!pickerMap){
  pickerMap=L.map('pickerMap',{scrollWheelZoom:false}).setView(HK_CENTER,12);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(pickerMap);
  pickerMap.on('click',e=>setCoords([round6(e.latlng.lat),round6(e.latlng.lng)],'지도에서 찍었어요'));
 }
 // 대화상자가 열린 뒤 크기를 다시 계산해야 지도 타일이 제대로 채워진다.
 setTimeout(()=>{pickerMap.invalidateSize();const c=currentFormCoords();if(c)pickerMap.setView(c,17);else pickerMap.setView(HK_CENTER,12);},60);
}
function resetPicker(){
 $('coordPaste').value='';$('placeResults').replaceChildren();$('placeResults').hidden=true;
 if(pickerMarker&&pickerMap){pickerMap.removeLayer(pickerMarker);pickerMarker=null;}
 const c=currentFormCoords();
 if(c){$('clearCoords').hidden=false;pickerStatus(`저장된 위치 · ${c[0]}, ${c[1]} · 바꾸려면 지도를 누르거나 핀을 끌어 옮기세요.`);}
 else clearCoords();
 initPickerMap();
 if(c&&pickerMap)setCoordsQuiet(c);
}
function setCoordsQuiet(c){pickerMarker=L.marker(c,{draggable:true}).addTo(pickerMap).on('dragend',()=>{const p=pickerMarker.getLatLng();setCoords([round6(p.lat),round6(p.lng)],'핀을 옮겼어요');});}

function shortName(r){return r.name||String(r.display_name||'').split(',')[0];}
function showResults(results){
 const box=$('placeResults');box.replaceChildren();box.hidden=false;
 if(!results.length){box.append(el('p','hint','검색 결과가 없어요. 영어 이름이나 거리 이름으로 다시 찾거나, 지도를 눌러 직접 찍어주세요.'));return;}
 for(const r of results){
  const b=button('',()=>{
   setCoords(validPair(Number(r.lat),Number(r.lon)),`‘${shortName(r)}’ 위치로 정했어요`);
   if(!$('name').value.trim())$('name').value=shortName(r);
   if(!$('address').value.trim()){const parts=String(r.display_name||'').split(',').map(x=>x.trim());if(parts.length>1&&parts[0]===shortName(r))parts.shift();$('address').value=parts.slice(0,4).join(', ');}
   box.hidden=true;
  });
  b.className='place-result';b.append(el('strong','',shortName(r)),el('span','',r.display_name||''));box.append(b);
 }
}
async function searchPlace(){
 const name=$('name').value.trim(),address=$('address').value.trim();
 if(!name&&!address){toast('장소 이름이나 주소를 먼저 적어주세요.');$('name').focus();return;}
 const wait=1100-(Date.now()-lastSearchAt);if(wait>0)await new Promise(r=>setTimeout(r,wait));
 $('findPlace').disabled=true;pickerStatus('찾는 중...');
 const queries=[...new Set([[name,address].filter(Boolean).join(' '),address,name].filter(Boolean))];
 try{
  for(const q of queries){
   lastSearchAt=Date.now();
   const res=await fetch('https://nominatim.openstreetmap.org/search?'+new URLSearchParams({format:'jsonv2',limit:'6',viewbox:'113.82,22.57,114.45,22.13',bounded:'1','accept-language':'ko,en',q}));
   if(!res.ok)throw Error('검색 서버 응답 '+res.status);
   const results=(await res.json()).filter(r=>validPair(Number(r.lat),Number(r.lon)));
   if(results.length||q===queries.at(-1)){showResults(results);pickerStatus(results.length?'맞는 장소를 눌러 고르세요. 결과가 없거나 다르면 지도를 눌러 직접 찍어도 돼요.':'검색 결과가 없어요.');return;}
   await new Promise(r=>setTimeout(r,1100));
  }
 }catch(e){pickerStatus('검색하지 못했어요('+e.message+'). 구글맵 좌표를 붙여넣거나 지도를 눌러주세요.');}
 finally{$('findPlace').disabled=false;}
}
function useMyLocation(){
 if(!navigator.geolocation){toast('이 브라우저는 위치 확인을 지원하지 않아요.');return;}
 $('myLocation').disabled=true;pickerStatus('현재 위치를 확인하는 중...');
 navigator.geolocation.getCurrentPosition(
  p=>{$('myLocation').disabled=false;setCoords([round6(p.coords.latitude),round6(p.coords.longitude)],`지금 내 위치(오차 약 ${Math.round(p.coords.accuracy)}m)`);},
  e=>{$('myLocation').disabled=false;pickerStatus(e.code===1?'위치 권한이 거부됐어요. 브라우저 설정에서 허용하거나 다른 방법을 써주세요.':'현재 위치를 확인하지 못했어요. 다시 시도해주세요.');},
  {enableHighAccuracy:true,timeout:15000,maximumAge:30000}
 );
}
function readPasted(text,quietIfNone){
 const c=parseCoords(text);
 if(c){setCoords(c,'붙여넣은 좌표를 읽었어요');return true;}
 if(isShortMapLink(text))pickerStatus('짧은 공유 링크(maps.app.goo.gl)에는 좌표가 없어요. 구글맵에서 장소를 길게 눌러 나오는 숫자 좌표를 복사해 붙여넣거나 ‘이름으로 찾기’를 써주세요.');
 else if(!quietIfNone&&String(text).trim())pickerStatus('좌표를 찾지 못했어요. 예: 22.2826, 114.1536');
 return false;
}

$('findPlace').onclick=searchPlace;
$('myLocation').onclick=useMyLocation;
$('clearCoords').onclick=clearCoords;
$('coordPaste').oninput=()=>readPasted($('coordPaste').value,false);
$('url').oninput=()=>{if(parseCoords($('url').value)||isShortMapLink($('url').value))readPasted($('url').value,true);};
$('lat').oninput=$('lng').oninput=()=>{const c=currentFormCoords();if(c&&pickerMap){if(pickerMarker)pickerMarker.setLatLng(c);else setCoordsQuiet(c);pickerMap.setView(c,Math.max(pickerMap.getZoom(),16));$('clearCoords').hidden=false;}};

// app.js의 편집창 열기에 위치 도우미 초기화를 덧붙인다.
const openEditorBase=openEditor;
openEditor=function(s){openEditorBase(s);resetPicker();};
