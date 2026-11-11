'use strict';
const $=id=>document.getElementById(id), KEY='hk-trip-v1';
const initialStops=[
 ['홍콩국제공항','Hong Kong International Airport, Chek Lap Kok','기타','홍콩 여행 시작'],
 ['더시티뷰 · 차이니즈 YMCA 오브 홍콩','The Cityview, 23 Waterloo Road, Yau Ma Tei, Kowloon','숙소','숙소 방문'],
 ['타이청 베이커리','Tai Cheong Bakery, 35 Lyndhurst Terrace, Central','카페','센트럴점 기준'],
 ['미드 레벨 에스컬레이터','Central–Mid-Levels Escalators, Central','관광',''],
 ['카우 키','Kau Kee Restaurant, Gough Street, Central','맛집',''],
 ['마이 컵 오브 티 · 완차이점','My Cup of Tea, 6 Spring Garden Lane, Wan Chai','카페',''],
 ['빅토리아 피크','Victoria Peak, Hong Kong Island','관광',''],
 ['소호','SoHo, Central, Hong Kong Island','관광',''],
 ['란콰이퐁','Lan Kwai Fong, Central','관광',''],
 ['바 레온','Bar Leone, 11-15 Bridges Street, Central','맛집',''],
 ['더시티뷰 · 숙소 복귀','The Cityview, 23 Waterloo Road, Yau Ma Tei, Kowloon','숙소','하루 일정 마무리']
].map(([name,address,category,note],i)=>({id:'nov12-'+i,date:'2026-11-12',name,address,category,note,url:'',time:''}));
let state={version:1,date:'2026-11-12',mode:'transit',stops:initialStops},editId=null,toastTimer;
function validate(v){if(!v||v.version!==1||!/^\d{4}-\d{2}-\d{2}$/.test(v.date)||!['walking','transit','driving'].includes(v.mode)||!Array.isArray(v.stops)||v.stops.length>100)throw Error('일정 형식이 올바르지 않습니다.');v.stops.forEach(s=>{if(!s||typeof s.id!=='string'||typeof s.name!=='string'||!s.name||typeof s.address!=='string')throw Error('장소 정보를 확인해주세요.');for(const k of ['id','name','address','url','time','category','note'])if(typeof s[k]!=='string'||s[k].length>1000)throw Error('장소 정보가 너무 깁니다.');if(s.url&&!safeMapUrl(s.url))throw Error('구글맵 링크만 사용할 수 있습니다.');});return v;}
function safeMapUrl(v){try{const u=new URL(v);return u.protocol==='https:'&&(['maps.app.goo.gl','goo.gl','maps.google.com','www.google.com','google.com'].includes(u.hostname));}catch{return false;}}
function toast(s){$('toast').textContent=s;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',4000);}
function decode(s){return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s),c=>c.charCodeAt(0))));}
function encode(v){return btoa(Array.from(new TextEncoder().encode(JSON.stringify(v)),b=>String.fromCharCode(b)).join(''));}
try{if(location.hash.startsWith('#trip=')){if(location.hash.length>150000)throw Error('공유 링크가 너무 깁니다.');state=validate(decode(location.hash.slice(6)));$('shared').hidden=false;}else{const s=localStorage.getItem(KEY);if(s)state=validate(JSON.parse(s));}}catch(e){toast('일정을 불러오지 못했습니다. '+e.message);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{toast('기기에 저장할 수 없습니다. 공유 링크를 보관해주세요.');}if(location.hash.startsWith('#trip='))history.replaceState(null,'',location.pathname+location.search);render();}
function query(s){return s.name+' '+s.address+' Hong Kong';}
function mapUrl(s){return s.url||'https://www.google.com/maps/search/?'+new URLSearchParams({api:'1',query:query(s)});}
function routeUrl(a,b){return 'https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',origin:query(a),destination:query(b),travelmode:state.mode});}
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function link(text,url,cls){const n=el('a',cls,text);n.href=url;n.target='_blank';n.rel='noopener noreferrer';return n;}
function button(text,fn,label){const b=el('button','',text);b.type='button';b.onclick=fn;if(label)b.setAttribute('aria-label',label);return b;}
function showMap(s){$('mapTitle').textContent=s?s.name:'홍콩 둘러보기';const q=s?query(s):'Hong Kong';$('map').src='https://www.google.com/maps?'+new URLSearchParams({q,output:'embed'});$('mapLink').href=s?mapUrl(s):'https://www.google.com/maps/search/?api=1&query=Hong+Kong';}
function render(){ $('date').value=state.date;$('mode').value=state.mode;const stops=state.stops.filter(s=>s.date===state.date);$('count').textContent=stops.length+'개의 장소';$('stops').replaceChildren();$('routeList').replaceChildren();if(!stops.length){const empty=el('div','empty');empty.append(el('div','symbol','⌁'),el('h3','','첫 번째 목적지는 어디인가요?'),el('p','','가게와 명소를 하나씩 추가하면\n우리의 하루가 순서대로 모여요.'),button('＋ 첫 장소 담기',()=>openEditor()));$('stops').append(empty);}stops.forEach((s,i)=>{const card=el('article','stop'),top=el('div','stop-top'),body=el('div');body.append(el('span','tag',s.category+(s.time?' · '+s.time:'')),el('h3','',s.name));top.append(el('span','num',String(i+1)),body);card.append(top,el('p','address',s.address));if(s.note)card.append(el('p','note',s.note));const actions=el('div','actions');actions.append(button('지도 보기',()=>showMap(s)),link('구글맵 ↗',mapUrl(s)),button('수정',()=>openEditor(s)));const up=button('↑',()=>move(s,-1),'앞으로 이동'),down=button('↓',()=>move(s,1),'뒤로 이동');up.disabled=i===0;down.disabled=i===stops.length-1;actions.append(up,down,button('삭제',()=>{if(confirm(s.name+'을(를) 일정에서 삭제할까요?')){state.stops=state.stops.filter(x=>x.id!==s.id);save();}}));card.append(actions);$('stops').append(card);if(i>0){const route=link(i+' → '+(i+1)+'  '+stops[i-1].name+' → '+s.name+' · 길찾기 ↗',routeUrl(stops[i-1],s),'route-link');$('routeList').append(route);}});showMap(stops[0]);}
function move(s,delta){const day=state.stops.filter(x=>x.date===state.date),other=day[day.indexOf(s)+delta];if(!other)return;const a=state.stops.indexOf(s),b=state.stops.indexOf(other);[state.stops[a],state.stops[b]]=[state.stops[b],state.stops[a]];save();}
function openEditor(s){editId=s?.id||null;$('form').reset();$('editTitle').textContent=s?'장소 수정':'가고 싶은 곳 추가';for(const k of ['name','address','url','time','category','note'])if(s)$(k).value=s[k];$('editor').showModal();$('name').focus();}
$('add').onclick=()=>openEditor();$('close').onclick=()=>$('editor').close();$('date').onchange=()=>{if($('date').value){state.date=$('date').value;save();}};$('mode').onchange=()=>{state.mode=$('mode').value;save();};
$('form').onsubmit=e=>{e.preventDefault();if(state.stops.length>=100&&!editId){toast('장소는 최대 100개까지 담을 수 있습니다.');return;}const s={id:editId||crypto.randomUUID(),date:state.date};for(const k of ['name','address','url','time','category','note'])s[k]=$(k).value.trim();if(!s.name||!s.address){toast('장소 이름과 주소를 입력해주세요.');return;}if(s.url&&!safeMapUrl(s.url)){toast('https로 시작하는 구글맵 링크를 넣어주세요.');return;}if(editId)state.stops[state.stops.findIndex(x=>x.id===editId)]=s;else state.stops.push(s);save();$('editor').close();toast('일정에 저장했어요.');};
$('share').onclick=()=>{$('shareUrl').value=location.origin+location.pathname+'#trip='+encode(state);$('shareDialog').showModal();};$('shareClose').onclick=()=>$('shareDialog').close();$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('shareUrl').value);toast('링크를 복사했어요. 친구에게 보내주세요.');}catch{$('shareUrl').select();toast('링크를 길게 눌러 복사해주세요.');}};render();
