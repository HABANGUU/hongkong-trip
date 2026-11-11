'use strict';
// 구글맵 링크만으로 장소 추가. 2026-11-11 Claude.
// - 긴 링크(google.com/maps/place/이름/...!3d위도!4d경도)는 이름·좌표를 읽는다.
// - 앱 '공유 → 복사' 내용(이름/주소/링크가 섞인 글)도 링크 밖 글에서 이름·주소를 읽는다.
// - 짧은 링크(maps.app.goo.gl)는 정적 사이트에서 펼칠 수 없어(CORS) 이름을 알 수 없다.
//   이름 없이도 저장되지만 동선 지도·길찾기에서는 빠지고, 카드에 이름을 적어 달라는 안내가 붙는다.
const UNNAMED='구글맵 장소';

function parseGoogleLink(text){
 const raw=String(text||'').trim(),out={url:'',name:'',address:'',latlng:'',short:false};
 if(!raw)return out;
 const m=raw.match(/https?:\/\/[^\s<>"]+/);
 if(m){out.url=m[0].replace(/[),.]+$/,'');}
 if(out.url&&safeMapUrl(out.url)){
  const u=new URL(out.url);
  out.short=/goo\.gl$/.test(u.hostname);
  const dec=v=>{try{return decodeURIComponent(v.replace(/\+/g,' ')).trim();}catch{return v.replace(/\+/g,' ').trim();}};
  const place=u.pathname.match(/\/maps\/place\/([^/]+)/);
  if(place&&!/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(dec(place[1])))out.name=dec(place[1]);
  const pin=out.url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const q=u.searchParams.get('q')||u.searchParams.get('query')||u.searchParams.get('destination')||'';
  const qll=q.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  if(pin)out.latlng=Number(pin[1])+','+Number(pin[2]);
  else if(qll)out.latlng=Number(qll[1])+','+Number(qll[2]);
  else if(q&&!out.name)out.name=q.trim();
  if(!out.latlng&&!out.name){const at=out.url.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);if(at)out.latlng=Number(at[1])+','+Number(at[2]);}
 }
 // 링크 밖의 글: 첫 줄 = 이름, 둘째 줄 = 주소. 한 줄이면 ' · ' 또는 첫 쉼표로 나눈다.
 const lines=raw.replace(m?m[0]:'','').split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!/^https?:/.test(x));
 if(lines.length){
  let name=lines[0],address=lines[1]||'';
  if(!address){const sep=name.match(/^(.+?)\s*[·•|]\s*(.+)$/)||name.match(/^([^,]+),\s*(.+)$/);if(sep){name=sep[1];address=sep[2];}}
  out.name=name.slice(0,120);if(address)out.address=address.slice(0,250);
 }
 return out;
}
function linkInfoText(p){
 if(!p.url)return p.name?'링크는 없지만 이름으로 저장할 수 있어요.':'';
 if(!safeMapUrl(p.url))return '구글맵 링크가 아니에요. 구글맵 앱의 공유 → 링크 복사로 받은 주소를 넣어주세요.';
 if(p.name)return `읽은 장소: ${p.name}${p.address?' · '+p.address:''}`;
 if(p.short)return '짧은 링크라 장소 이름을 읽을 수 없어요. 그대로 저장해도 되지만, 아래 ‘장소 이름’을 적어주면 동선 지도와 길찾기에도 들어가요.';
 return p.latlng?'링크에서 위치를 읽었어요. 이름을 적어주면 더 알아보기 쉬워요.':'링크를 읽었어요. 장소 이름을 적어주면 동선에 들어가요.';
}
// 저장 직전 app.js가 호출. false면 저장 중단.
function applyLink(s){
 const p=parseGoogleLink($('linkPaste').value);
 if(p.url&&!safeMapUrl(p.url)){toast('구글맵 링크만 넣을 수 있어요.');return false;}
 s.url=p.url;
 if(!s.name)s.name=p.name;
 if(!s.address)s.address=p.address;
 if(p.latlng)s.latlng=p.latlng;
 if(!s.name&&!s.url){toast('구글맵 링크나 장소 이름을 넣어주세요.');$('linkPaste').focus();return false;}
 if(!s.name){s.name=UNNAMED;s.unnamed=true;}
 return true;
}
let linkAuto={name:'',address:''};
function resetLinkInput(s){$('linkPaste').value=s?.url||'';$('linkInfo').textContent='';linkAuto={name:'',address:''};}
$('linkPaste').oninput=()=>{
 const p=parseGoogleLink($('linkPaste').value);
 $('linkInfo').textContent=linkInfoText(p);
 // 비어 있거나 직전에 링크로 채운 칸만 바꿔 사용자가 직접 적은 내용을 덮지 않는다.
 for(const k of ['name','address']){const cur=String($(k).value).trim();if(!cur||cur===linkAuto[k]){$(k).value=p[k];linkAuto[k]=p[k];}}
};
