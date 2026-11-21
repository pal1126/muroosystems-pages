import {prepareIndex, searchIndex, normalize} from './search-engine.js';

const form = document.getElementById('site-search-form');
const query = document.getElementById('site-query');
const category = document.getElementById('site-category');
const results = document.getElementById('site-search-results');
const status = document.getElementById('site-search-status');
const empty = document.getElementById('site-search-empty');
const more = document.getElementById('site-search-more');
const retry = document.getElementById('site-search-retry');
const labels = {business:'Business & Technology',products:'Products & services',projects:'Projects',company:'Company & careers',news:'News'};
const pageSize = 12;
let index = null, matches = [], page = 1, timer;

let compositionBase = null;
function searchText() {
  return compositionBase ?? query.value;
}

function restore() {
  compositionBase = null;
  const params = new URLSearchParams(location.search);
  const requested = Number(params.get('page'));
  page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  query.value = (params.get('q') || '').slice(0, 200);
  const selected = params.get('category') || '';
  category.value = [...category.options].some(option => option.value === selected) ? selected : '';
  syncLanguageLinks();
}
function writeState(url) {
  for (const [key, value] of [['q', searchText().trim()], ['category', category.value], ['page', page > 1 ? String(page) : '']]) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
}
function syncLanguageLinks() {
  for (const link of document.querySelectorAll('a[hreflang]')) {
    const destination = new URL(link.href);
    if (destination.origin !== location.origin) continue;
    writeState(destination);
    link.href = destination.href;
  }
}
function persist(push = false) {
  syncLanguageLinks();
  const url = new URL(location.href);
  writeState(url);
  const destination = url.pathname + url.search;
  if (destination !== location.pathname + location.search) history[push ? 'pushState' : 'replaceState'](null,'',destination);
}
function snippet(row) {
  const terms = normalize(searchText()).split(' ').filter(Boolean);
  if (!terms.length || terms.some(term => normalize([row.title,row.aliases,row.description].join(' ')).includes(term))) return row.description;
  const folded = normalize(row.body);
  const positions = terms.map(term => folded.indexOf(term)).filter(position => position >= 0);
  if (!positions.length) return row.description;
  const start = Math.max(0, Math.min(...positions)-35);
  return (start ? '…' : '') + row.body.slice(start, start+150) + (row.body.length > start+150 ? '…' : '');
}
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent=text;
  if (className) node.className=className;
  return node;
}
function render(start = 0) {
  if (!index) return;
  const limit = page * pageSize;
  const fragment = document.createDocumentFragment();
  for (const row of matches.slice(start,limit)) {
    const item=element('li', '', 'site-search-result');
    const meta=element('p',labels[row.category] + (row.prtimes ? ' · PR TIMES' : ''),'search-result-meta');
    if (row.date) {const time=element('time',row.date.slice(0,10));time.dateTime=row.date;meta.append(' · ',time);}
    const heading=element('h2'); const anchor=element('a',row.title);anchor.href=row.url;heading.append(anchor);
    item.append(meta,heading,element('p',snippet(row),'search-result-snippet'));fragment.append(item);
  }
  if (start) results.append(fragment);
  else results.replaceChildren(fragment);
  empty.hidden=matches.length>0;
  more.hidden=matches.length<=limit;
  status.textContent=`${matches.length} results${matches.length ? ` (${Math.min(matches.length,limit)} shown)` : ''}`;
}
const recovery = element('button');
recovery.type = 'button';
const recoveryRow = element('p');
recoveryRow.append(recovery);
empty.querySelector('a').before(recoveryRow);

function updateRecovery() {
  if (matches.length) return;
  const count = category.value ? searchIndex(index, searchText()).length : 0;
  recovery.dataset.action = count ? 'broaden' : 'edit';
  recovery.textContent = count ? `Show matches in all categories (${count})` : 'Edit keyword';
}
recovery.addEventListener('click', () => {
  if (recovery.dataset.action === 'broaden') {
    category.value = '';
    applyFilters(true);
    results.querySelector('a')?.focus();
  } else {
    query.focus();
    query.select();
  }
});

function filter() {
  if (!index) return;
  matches = searchIndex(index, searchText(),category.value);
  page = Math.min(page, Math.max(1, Math.ceil(matches.length / pageSize)));
  updateRecovery();
  render();
  persist();
}
function applyFilters(push) {
  page = 1;
  persist(push);
  filter();
}
function focusVisitedResult() {
  const href = history.state?.visitedSearchResult;
  if (!href || !index) return;
  const link = Array.from(results.querySelectorAll('h2 a')).find(item => item.href === href);
  if (link) {
    link.focus({preventScroll: true});
    link.scrollIntoView({block: 'nearest', behavior: 'instant'});
  }
}
results.addEventListener('click', event => {
  const link = event.target.closest('h2 a');
  if (!link || event.defaultPrevented || event.button !== 0 ||
      event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  history.replaceState({...history.state, visitedSearchResult: link.href}, '');
});
window.addEventListener('pageshow', event => {
  if (event.persisted) focusVisitedResult();
});
async function load(isRetry = false) {
  if (results.getAttribute('aria-busy') === 'true') return;
  results.setAttribute('aria-busy', 'true');
  retry.setAttribute('aria-disabled', 'true');
  more.hidden = true;
  status.textContent='Preparing search…';retry.hidden = !isRetry;empty.hidden=true;
  try {
    const response=await fetch('/muroosystems-pages/assets/site-search-en.json');
    if (!response.ok) throw new Error('Index unavailable');
    const rows=await response.json();
    if (!Array.isArray(rows)) throw new Error('Invalid index');
    index=prepareIndex(rows);filter();
    const continueFromRetry = isRetry && document.activeElement === retry;
    retry.hidden = true;
    if (continueFromRetry) {
      (results.querySelector('h2 a') || recovery).focus();
    } else if (!isRetry && performance.getEntriesByType('navigation')[0]?.type === 'back_forward') {
      focusVisitedResult();
    }
  } catch {
    status.textContent='Search results could not be loaded. Try again or browse the page list below.';retry.hidden=false;
  } finally {
    results.removeAttribute('aria-busy');
    retry.removeAttribute('aria-disabled');
  }
}
function scheduleSearch() {
  page = 1;
  syncLanguageLinks();
  clearTimeout(timer);
  timer = setTimeout(() => {
    timer = undefined;
    applyFilters(false);
  }, 160);
}
query.addEventListener('compositionstart', () => {
  compositionBase = query.value;
  clearTimeout(timer);
  timer = undefined;
});
query.addEventListener('compositionend', () => {
  compositionBase = null;
  scheduleSearch();
});
query.addEventListener('input', event => {
  if (compositionBase === null && !event.isComposing) scheduleSearch();
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (compositionBase !== null) return;
  clearTimeout(timer);
  applyFilters(true);
});
category.addEventListener('change',()=>{clearTimeout(timer);applyFilters(true);});
document.getElementById('site-reset').addEventListener('click',()=>{clearTimeout(timer);query.value='';category.value='';applyFilters(true);query.focus();});
document.querySelectorAll('[data-query]').forEach(button=>button.addEventListener('click',()=>{clearTimeout(timer);query.value=button.dataset.query;category.value='';applyFilters(true);query.focus();}));
more.addEventListener('click',()=>{
  if (timer) { clearTimeout(timer);timer=undefined;filter(); }
  const prior = results.children.length;
  if (prior >= matches.length) return;
  page++;
  persist(true);
  render(prior);
  results.children[prior]?.querySelector('a')?.focus();
});
retry.addEventListener('click', () => load(true));
window.addEventListener('popstate',()=>{clearTimeout(timer);restore();filter();focusVisitedResult();});
restore();load();
