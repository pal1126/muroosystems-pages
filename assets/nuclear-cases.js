import {normalize} from './search-engine.js';
const form=document.getElementById('case-filter');
const query=document.getElementById('case-query');
const kind=document.getElementById('case-kind');
const field=document.getElementById('case-field');
const stage=document.getElementById('case-stage');
const count=document.getElementById('case-count');
const empty=document.getElementById('case-empty');
const legacyFields=JSON.parse(field.dataset.legacyFields||'{}');
const more=document.getElementById('case-more');
const cards=[...document.querySelectorAll('.nuclear-case')];
const indexed=cards.map(card=>({card,text:normalize(card.textContent),fields:card.dataset.fields.split(' ')}));
const pageSize = 12;
const languageLinks = [...document.querySelectorAll('a[hreflang]')];
let limit = pageSize, timer;
function restore(){
  const params=new URLSearchParams(location.search);
  const page = Number(params.get('page'));
  limit = Number.isSafeInteger(page) && page > 0
    ? Math.min(page, Math.ceil(cards.length / pageSize)) * pageSize : pageSize;
  query.value=(params.get('q')||'').slice(0,200);
  for(const [el,fallback] of [[kind,'project'],[field,''],[stage,'']]){
    const original=params.get(el.name)||fallback;
    const value=el===field?(legacyFields[original]??original):original;
    el.value=[...el.options].some(o=>o.value===value)?value:fallback;
  }
}
function writeFilters(url){
  for(const el of [query,kind,field,stage]){
    const value=el.value.trim();
    if(value && !(el===kind && value==='project'))url.searchParams.set(el.name,value);
    else url.searchParams.delete(el.name);
  }
  if (limit > pageSize) url.searchParams.set('page', String(limit / pageSize));
  else url.searchParams.delete('page');
}
function syncLanguageLinks(hash = location.hash) {
  for (const link of languageLinks) {
    const url = new URL(link.href);
    writeFilters(url);
    url.hash = hash;
    link.href = url.href;
  }
}
function persist(push=false){
  const url=new URL(location.href);url.hash='';
  writeFilters(url);
  const destination=url.pathname+url.search;
  if(destination!==location.pathname+location.search+location.hash)history[push?'pushState':'replaceState'](null,'',destination);
}
function render(){
  const terms=normalize(query.value).split(' ').filter(Boolean);
  const matching=indexed.filter(row=>(kind.value==='all'||row.card.dataset.kind===kind.value)
    &&(!field.value||row.fields.includes(field.value))&&(!stage.value||row.card.dataset.stage===stage.value)
    &&terms.every(term=>row.text.includes(term)));
  limit = Math.min(limit, Math.max(pageSize, Math.ceil(matching.length / pageSize) * pageSize));
  syncLanguageLinks();
  const visible=new Set(matching.slice(0,limit).map(row=>row.card));
  for(const card of cards)card.hidden=!visible.has(card);
  const p=matching.filter(row=>row.card.dataset.kind==='project').length;
  count.textContent=`${matching.length}件（${Math.min(limit,matching.length)}件を表示） — 公式プロジェクト ${p}件／補足資料 ${matching.length-p}件`;
  empty.hidden=matching.length>0;more.hidden=matching.length<=limit;
  return matching;
}
function apply(push=false){limit=pageSize;persist(push);render();}
function revealHash(){
  const card=cards.find(el=>'#'+el.id===location.hash);
  if(!card)return false;
  query.value='';kind.value='all';field.value='';stage.value='';limit=Math.ceil((cards.indexOf(card)+1)/12)*12;
  render();card.querySelector('details').open=true;card.scrollIntoView({block:'start'});card.focus({preventScroll:true});return true;
}
form.addEventListener('submit',event=>{event.preventDefault();clearTimeout(timer);apply(true);});
query.addEventListener('input',()=>{clearTimeout(timer);limit=pageSize;syncLanguageLinks('');timer=setTimeout(()=>apply(),160);});
for(const el of [kind,field,stage])el.addEventListener('change',()=>{clearTimeout(timer);apply(true);});
document.getElementById('case-reset').addEventListener('click',()=>{clearTimeout(timer);query.value='';kind.value='project';field.value='';stage.value='';apply(true);query.focus();});
more.addEventListener('click',()=>{const previous=limit;limit+=pageSize;const rows=render();persist(true);rows[previous]?.card.focus();});
window.addEventListener('popstate',()=>{clearTimeout(timer);restore();if(!revealHash())render();});
window.addEventListener('hashchange',revealHash);
restore();if(!revealHash())render();
