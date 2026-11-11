'use strict';
// 구글 지도만 사용(API 키 없음). 2026-11-11 Claude.
// - 사이트 안 전체 동선: maps.google.com/maps?saddr=..&daddr=A+to:B&output=embed 를 iframe으로 사용(키 없이 다중 경유 경로 표시 확인, 11곳 시험).
//   비공식 형식이라 구글이 바꾸면 안 보일 수 있다. 그때도 아래 공식 Maps URL 버튼은 동작한다.
// - 구글맵 앱 열기: 공식 Maps URL(api=1). 모바일 브라우저는 경유지 3개까지라 한 링크에 최대 5곳씩 나눈다.
// - 대중교통은 여러 경유지 경로를 지원하지 않아 전체 동선은 자동차 경로로 보여준다. 실제 이동은 구간별 길찾기 사용.
const EMBED_MAX_STOPS=12,APP_MAX_STOPS=5;

function placeQuery(s){return s.name+' '+s.address+' Hong Kong';}
// 순서를 유지한 채 앞 묶음의 마지막 장소가 다음 묶음의 출발점이 되도록 고르게 나눈다.
function splitRoute(stops,maxStops){
 if(stops.length<2)return [];
 const edges=stops.length-1,parts=Math.ceil(edges/(maxStops-1)),out=[];let start=0;
 for(let p=0;p<parts;p++){const len=Math.ceil((edges-start)/(parts-p));out.push({from:start,to:start+len,stops:stops.slice(start,start+len+1)});start+=len;}
 return out;
}
function overviewMode(){return state.mode==='walking'?'walking':'driving';}
function routeEmbedUrl(stops){
 const p={saddr:placeQuery(stops[0]),daddr:stops.slice(1).map(placeQuery).join(' to:'),output:'embed'};
 if(overviewMode()==='walking')p.dirflg='w';
 return 'https://maps.google.com/maps?'+new URLSearchParams(p);
}
function routeAppUrl(stops){
 const p={api:'1',origin:placeQuery(stops[0]),destination:placeQuery(stops.at(-1)),travelmode:overviewMode()};
 if(stops.length>2)p.waypoints=stops.slice(1,-1).map(placeQuery).join('|');
 return 'https://www.google.com/maps/dir/?'+new URLSearchParams(p);
}
let routePart=0;
function renderRouteMap(stops){
 const box=$('routeOverview');if(!box)return;
 const embedParts=splitRoute(stops,EMBED_MAX_STOPS),appParts=splitRoute(stops,APP_MAX_STOPS);
 $('routeTabs').replaceChildren();$('routeApps').replaceChildren();
 if(!embedParts.length){box.hidden=true;return;}
 box.hidden=false;
 if(routePart>=embedParts.length)routePart=0;
 if(embedParts.length>1)embedParts.forEach((part,i)=>{const b=button(`${part.from+1}→${part.to+1}번`,()=>{routePart=i;renderRouteMap(stops);});if(i===routePart)b.className='active';$('routeTabs').append(b);});
 const part=embedParts[routePart],url=routeEmbedUrl(part.stops);
 if($('routeFrame').dataset.src!==url){$('routeFrame').src=url;$('routeFrame').dataset.src=url;}
 const letters=part.stops.map((s,i)=>`${String.fromCharCode(65+i)}=${part.from+i+1}`).join(' · ');
 $('routeLegend').textContent=`지도의 알파벳이 방문 번호예요: ${letters}`;
 for(const p of appParts)$('routeApps').append(link(appParts.length>1?`${p.from+1}→${p.to+1}번 구글맵에서 열기 ↗`:'전체 동선 구글맵에서 열기 ↗',routeAppUrl(p.stops),'route-app'));
 $('routeModeNote').textContent=state.mode==='transit'?'대중교통은 여러 곳을 잇는 경로를 지원하지 않아 전체 동선은 자동차 경로로 보여줘요. 실제 이동은 아래 구간별 길찾기를 쓰세요.':state.mode==='walking'?'전체 동선을 도보 경로로 보여줘요.':'전체 동선을 자동차 경로로 보여줘요.';
}
