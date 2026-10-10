import { destinations } from './data.js';
import { translate } from './i18n.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const appBase = new URL('.',import.meta.url).pathname;
const localUrl = url => url.startsWith('/')&&!url.startsWith(appBase)?appBase+url.slice(1):url;
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const readLocal = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const writeLocal = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
const nowMonth = Number(new Intl.DateTimeFormat('en', {timeZone:'Asia/Bangkok',month:'numeric'}).format(new Date()));
const state = { lang:readLocal('vacasia-language','en') === 'vi' ? 'vi' : 'en', theme:readLocal('vacasia-theme-v2','light')==='dark'?'dark':'light', user:null, favorites:[], bookings:[], preferences:readLocal('vacasia-preferences',null), online:true, cloudReady:true, syncWarning:null, connectionError:null, authBusy:false, syncBusy:false, category:'all', compare:[], menu:false };
const defaults = {budget:100,days:5,group:'couple',month:nowMonth,interests:['culture','food']};
let modalState = null;
let focusBeforeModal = null;
let pendingAction = null;
let bookingDraft = null;
let bookingStep = 1;
let confirmedBooking = null;
let confirmedBookingOwner = null;
let toastTimer;
let cloudApi = null;
let firebaseConfigured = false;
let accountEpoch = 0;
let authIntent = 0;
let authAttemptUserId;
let authAttemptBaselineId = null;
let logoutBusy = false;
let syncRequest = 0;
let authObserver = null;
const t = (key, args) => translate(key, state.lang, args);
const localized = value => typeof value === 'object' ? value[state.lang] ?? value.en : value;
const money = amount => new Intl.NumberFormat(state.lang === 'vi' ? 'vi-VN' : 'en-US',{style:'currency',currency:'USD',maximumFractionDigits:Number.isInteger(amount) ? 0 : 2}).format(amount);
const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const futureDate = days => { const date = new Date(`${today()}T12:00:00Z`); date.setUTCDate(date.getUTCDate()+days); return date.toISOString().slice(0,10); };
const maxDate = () => { const date = new Date(`${today()}T12:00:00Z`); date.setUTCFullYear(date.getUTCFullYear()+2); return date.toISOString().slice(0,10); };
const dateLabel = date => new Intl.DateTimeFormat(state.lang === 'vi' ? 'vi-VN' : 'en-US',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
const monthLabel = month => new Intl.DateTimeFormat(state.lang === 'vi' ? 'vi-VN' : 'en-US',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2026,month-1,1)));
const seasonLabel = destination => destination.bestMonths.length===12?t('yearRound'):destination.bestMonths.map(month=>new Intl.DateTimeFormat(state.lang==='vi'?'vi-VN':'en-US',{month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2026,month-1,1)))).join(', ');
const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase();
const categories = ['all','beach','culture','city','nature','adventure'];
const interests = ['culture','beach','city','nature','adventure','food','family','wellness'];
const paths = {
  moon:'<path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l1 1m14 14 1 1M4 20l1-1M19 5l1-1"/>',
  leaf:'<path d="M4 16C4 7 11 5 20 3c-1 10-5 16-12 15M4 21 16 8"/>',
  arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>', chevron:'<path d="m9 5 7 7-7 7"/>',
  pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  heart:'<path d="m12 21-8-8C-2 7 7 0 12 7c5-7 14 0 8 6Z"/>',
  search:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/>',
  globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  check:'<path d="m5 12 4 4L19 6"/>', spark:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
  beach:'<path d="M3 12c2-9 16-9 18 0H3ZM12 12v9m-4 0h8m-4-19v3"/><path d="M7 12c0-4 2-7 5-7s5 3 5 7"/>',
  culture:'<path d="m3 8 9-5 9 5H3ZM5 10v8m5-8v8m4-8v8m5-8v8M3 21h18M4 18h16"/>',
  city:'<path d="M3 21V9h7v12m0 0V3h10v18H3Zm12-14h2m-2 4h2m-2 4h2M6 13h1m-1 4h1"/>',
  nature:'<path d="m2 20 7-13 5 8 4-6 4 11H2ZM7 11l2 2 2-2"/><circle cx="17" cy="4" r="2"/>',
  adventure:'<path d="m3 21 9-18 9 18H3ZM9 9l3 3 3-3M12 3v-1"/>',
  food:'<path d="M5 3v6c0 3 5 3 5 0V3M7.5 3v18M19 3c-5 0-5 11 0 11V3Zm0 11v7"/>',
  family:'<circle cx="8" cy="7" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2 21v-4a6 6 0 0 1 12 0v4m0-7a5 5 0 0 1 8 4v3"/>',
  wellness:'<path d="M12 21C4 17 1 11 3 7c5-1 8 3 9 8 1-5 4-9 9-8 2 4-1 10-9 14Zm0-6c-4-4-4-8 0-13 4 5 4 9 0 13Z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>', calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2"/>',
  ticket:'<path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4V5Zm12 0v3m0 3v2m0 3v3"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>', close:'<path d="m6 6 12 12M18 6 6 18"/>', menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>', download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>', external:'<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>', wallet:'<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 6V3h15v3m0 6h3v5h-3a2.5 2.5 0 0 1 0-5Z"/>', all:'<path d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z"/>'
};
const icon = name => `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name] ?? paths.spark}</svg>`;
const brand = () => `<a class="brand" href="/" data-nav aria-label="VacAsia">${icon('leaf')}<span>VacAsia<span class="brand-dot">.</span></span></a>`;
const navLink = (href,label,active) => `<a href="/${href}" data-nav class="${active?'active':''}" ${active?'aria-current="page"':''}>${label}</a>`;
const find = id => destinations.find(item => item.id === id);
const route = () => {
  const page = location.pathname.split('/').pop()?.replace('.html','') ?? '';
  if (['','index','VAmain'].includes(page)) return 'home';
  if (['transaction','history','tickets'].includes(page)) return 'tickets';
  if (['login','register','profile'].includes(page)) return 'home';
  if (page === 'contact') return 'about';
  return ['search','plan','favorites','destination','booking','about'].includes(page) ? page : 'not-found';
};
function header() {
  const current = route();
  return `<div id="account-status">${accountStatus()}</div><header class="topbar"><div class="container topbar-inner">${brand()}<nav class="navigation ${state.menu?'open':''}" id="navigation" aria-label="${t('menu')}">${navLink('search.html',t('discover'),['home','search','destination'].includes(current))}${navLink('plan.html',t('plan'),current==='plan')}${navLink('favorites.html',`${t('saved')}${state.favorites.length?`<span class="nav-count">${state.favorites.length}</span>`:''}`,current==='favorites')}${navLink('history.html',t('tickets'),current==='tickets')}</nav><div class="header-actions"><button class="language-button" data-action="language" aria-label="${t('switchLanguage')}" title="${t('switchLanguage')}">${icon('globe')}<span class="${state.lang==='en'?'':'alternate'}">EN</span><span class="alternate">/</span><span class="${state.lang==='vi'?'':'alternate'}">VI</span></button>${state.user?`<button class="avatar" data-action="account" aria-label="${t('account')}" title="${escape(state.user.name)}">${escape(state.user.name.split(/\s+/).map(word=>word[0]).slice(0,2).join('').toUpperCase())}</button>`:`<button class="btn outline" data-action="auth">${t('signIn')}</button>`}<button class="icon-button menu-toggle" data-action="menu" aria-label="${t('menu')}" aria-expanded="${state.menu}" aria-controls="navigation">${icon('menu')}</button></div></div></header>`;
}
function syncRetryButton() { return `<button class="btn outline small" data-action="retry-sync" ${state.syncBusy?'disabled':''}>${t(state.syncBusy?'loading':'retrySync')}</button>`; }
function accountStatus() {
  if(state.user&&!state.cloudReady)return `<div class="sync-banner" role="status"><div><strong>${t('cloudSyncPendingTitle')}</strong><p>${errorMessage(state.syncWarning)} ${t('cloudSyncPendingBody')}</p></div>${syncRetryButton()}</div>`;
  if(!state.online)return `<div class="offline-banner" role="status">${errorMessage(state.connectionError??{code:'offline'})} <button class="text-link" data-action="retry-sync" ${state.syncBusy?'disabled':''}>${t(state.syncBusy?'loading':'retryConnection')}</button></div>`;
  if(state.user&&state.syncWarning?.stage==='auth_profile')return `<div class="sync-banner profile-sync-note" role="status"><p>${t('profileSyncPending')}</p></div>`;
  return '';
}
function refreshAccountStatus() { if($('#account-status'))$('#account-status').innerHTML=accountStatus(); }
function footer() {
  return `<footer class="footer"><div class="container"><div class="footer-top"><div>${brand()}<p>${t('footerBody')}</p></div><div class="footer-links">${navLink('about.html',t('about'))}${navLink('about.html#faq',t('faq'))}${navLink('plan.html',t('preferences'))}${navLink('history.html',t('tickets'))}</div></div><div class="footer-bottom"><span>${t('copyright',{year:2026})}</span><span>${t('footerNote')}</span></div></div></footer>`;
}
function photo(destination, className='', eager=false) {
  return `<img src="${escape(destination.image)}" alt="${escape(localized(destination.name))}, ${escape(localized(destination.country))}" ${className?`class="${className}"`:''} loading="${eager?'eager':'lazy'}" decoding="async" width="800" height="600">`;
}
function pageHead(eyebrow,title,body,extra='') {
  return `<div class="page-head"><p class="eyebrow">${icon('spark')}${t(eyebrow)}</p><h1>${t(title)}</h1><p class="subtext">${t(body)}</p>${extra}</div>`;
}
function rank(destination, preferences=state.preferences) {
  if (!preferences) return 0;
  let score = preferences.interests.reduce((total,interest)=>total+(destination.tags.includes(interest)||destination.category===interest?12:0),0);
  score += destination.dailyBudget<=preferences.budget?10:Math.max(-12,-(destination.dailyBudget-preferences.budget)/10);
  if (destination.bestMonths.includes(Number(preferences.month))) score += 8;
  if (preferences.group==='family'&&destination.tags.includes('family')) score += 6;
  score += Math.max(0,5-Math.abs(Number(preferences.days)-Number(destination.duration)));
  return score;
}
function reason(destination) {
  const preference = state.preferences;
  if (!preference) return t('curatedMatch');
  const interest = preference.interests.find(value=>destination.tags.includes(value)||destination.category===value);
  if (interest) return t('interestMatch',{interest:t(interest).toLowerCase()});
  if(destination.bestMonths.includes(Number(preference.month))) return t('seasonMatch');
  if(destination.dailyBudget<=preference.budget) return t('budgetMatch');
  return t('curatedMatch');
}
function card(destination, personalized=false, compare=false) {
  const saved = state.favorites.includes(destination.id);
  const name = localized(destination.name);
  return `<article class="destination-card"><div class="card-image"><a href="/destination.html?id=${destination.id}" data-nav aria-label="${t('details')} ${escape(name)}">${photo(destination)}</a>${compare?`<label class="compare-select"><input type="checkbox" name="compare" data-compare="${destination.id}" ${state.compare.includes(destination.id)?'checked':''}>${t('selectCompare')}</label>`:''}<button class="save-button ${saved?'saved':''}" data-action="save" data-id="${destination.id}" aria-label="${escape(t(saved?'unsavePlace':'savePlace',{name}))}" aria-pressed="${saved}">${icon('heart')}</button><span class="card-category">${t(destination.category)}</span></div><div class="card-body"><p class="card-country">${icon('pin')}${escape(localized(destination.country))}</p><div class="card-title-row"><h3><a href="/destination.html?id=${destination.id}" data-nav>${escape(name)}</a></h3></div><p class="card-description">${escape(localized(destination.description))}</p>${personalized?`<p class="match-reason">${icon('spark')}${reason(destination)}</p>`:''}<div class="card-bottom"><span>${t('from')} <strong>${money(destination.dailyBudget)}</strong> ${t('perDay')}</span><a class="text-link" href="/destination.html?id=${destination.id}" data-nav>${t('details')}${icon('arrow')}</a></div></div></article>`;
}
function monthOptions(selected=0,includeAny=true) {
  return `${includeAny?`<option value="0">${t('anyMonth')}</option>`:''}${Array.from({length:12},(_,index)=>`<option value="${index+1}" ${Number(selected)===index+1?'selected':''}>${monthLabel(index+1)}</option>`).join('')}`;
}
function styleOptions(selected='all') {
  return categories.map(category=>`<option value="${category}" ${selected===category?'selected':''}>${t(category==='all'?'anyStyle':category)}</option>`).join('');
}
function budgetOptions(selected='0') {
  return `<option value="0">${t('anyBudget')}</option>${[50,100,150,250].map(amount=>`<option value="${amount}" ${Number(selected)===amount?'selected':''}>${t('under',{amount:money(amount)})}</option>`).join('')}`;
}
function homePage() {
  const featured = find('kyoto') ?? destinations[0];
  const imagePlace = find('bali') ?? destinations[1];
  const selected = destinations.filter(destination=>state.category==='all'||destination.category===state.category||destination.tags.includes(state.category)).slice(0,6);
  return `<div class="container"><section class="hero"><div class="hero-copy"><p class="eyebrow">${icon('spark')}${t('tagline')}</p><h1>${t('heroTitle')}</h1><p class="subtext">${t('heroBody')}</p><div class="hero-actions"><a class="btn coral" href="/search.html" data-nav>${t('explore')}${icon('arrow')}</a><a class="text-link" href="#how-it-works">${t('howWorks')}</a></div><div class="hero-footnote"><span class="line"></span>${t('madeFor')}</div></div><div class="hero-image">${photo(featured,'',true)}<div class="hero-stamp"><span>${t('beyond')}</span>${icon('leaf')}<span>${t('ordinary')}</span></div><div class="hero-caption"><div><span>${t('featuredMood')}</span><strong>${t('featuredPlace')}</strong></div><a href="/destination.html?id=${featured.id}" data-nav aria-label="${t('details')} ${escape(localized(featured.name))}">${icon('arrow')}</a></div></div></section><form class="search-panel" id="hero-search"><div class="search-field"><label for="hero-query">${icon('pin')}${t('where')}</label><input id="hero-query" name="q" type="search" placeholder="${t('wherePlaceholder')}" maxlength="100"></div><div class="search-field"><label for="hero-style">${icon('leaf')}${t('travelStyle')}</label><select name="style" id="hero-style">${styleOptions()}</select></div><div class="search-field"><label for="hero-budget">${icon('wallet')}${t('budget')}</label><select id="hero-budget" name="budget">${budgetOptions()}</select></div><button class="btn" type="submit">${icon('search')}${t('search')}</button></form><div class="trust-row"><span>${icon('check')}${t('curated')}</span><span>${icon('spark')}${t('personal')}</span><span>${icon('globe')}${t('twoLanguages')}</span></div><section class="section"><div class="section-heading"><div><p class="eyebrow">${t('placesEyebrow')}</p><h2>${t('placesTitle')}</h2><p class="subtext">${t('placesBody')}</p></div><a class="text-link" href="/search.html" data-nav>${t('viewAll')}${icon('arrow')}</a></div><div class="category-strip" role="group" aria-label="${t('travelStyle')}">${categories.map(category=>`<button class="category-chip ${state.category===category?'active':''}" data-action="category" data-category="${category}" aria-pressed="${state.category===category}">${icon(category)}${t(category)}</button>`).join('')}</div><div class="destination-grid">${selected.map(destination=>card(destination)).join('')}</div><p class="result-note">${t('estimateNote')}</p><div class="editorial-banner"><div class="editorial-copy"><p class="eyebrow">${t('bannerEyebrow')}</p><h2>${t('bannerTitle')}</h2><p class="subtext">${t('bannerBody')}</p><a class="btn" href="/plan.html" data-nav>${t('buildPlan')}${icon('arrow')}</a></div>${photo(imagePlace,'editorial-image')}</div></section><section class="section steps-section" id="how-it-works"><p class="eyebrow">${t('howEyebrow')}</p><h2>${t('howTitle')}</h2><div class="steps-grid">${[1,2,3].map(step=>`<div class="step"><span class="step-number">0${step}</span><h3>${t(`step${step}`)}</h3><p>${t(`step${step}Body`)}</p></div>`).join('')}</div></section></div>`;
}
function filtersFromUrl() {
  const params=new URLSearchParams(location.search);
  return {q:params.get('q')??'',style:params.get('style')??'all',country:params.get('country')??'',budget:Number(params.get('budget')??0),month:Number(params.get('month')??0),sort:params.get('sort')??'recommended',matches:params.get('matches')==='1'};
}
function searchPage() {
  const filters=filtersFromUrl();
  const countries=[...new Map(destinations.map(destination=>[destination.countryCode,destination.country])).entries()].sort((a,b)=>localized(a[1]).localeCompare(localized(b[1])));
  const query=normalize(filters.q.trim());
  const result=destinations.filter(destination=>(!query||normalize([destination.name.en,destination.name.vi,destination.country.en,destination.country.vi,destination.description.en,destination.description.vi,...destination.tags.flatMap(tag=>[translate(tag,'en'),translate(tag,'vi')])].join(' ')).includes(query))&&(filters.style==='all'||destination.category===filters.style||destination.tags.includes(filters.style))&&(!filters.country||destination.countryCode===filters.country)&&(!filters.budget||destination.dailyBudget<=filters.budget)&&(!filters.month||destination.bestMonths.includes(filters.month)));
  result.sort((a,b)=>filters.sort==='low'?a.dailyBudget-b.dailyBudget:filters.sort==='high'?b.dailyBudget-a.dailyBudget:filters.sort==='name'?localized(a.name).localeCompare(localized(b.name)):rank(b)-rank(a));
  const personalized=filters.matches&&Boolean(state.preferences);
  return `<div class="container">${pageHead('searchEyebrow',personalized?'matchesTitle':'searchTitle',personalized?'matchesBody':'searchBody',personalized?`<a class="text-link" href="/plan.html" data-nav>${t('editPreferences')}${icon('arrow')}</a>`:'')}<section class="search-layout section"><aside class="filter-sidebar"><h3>${icon('search')} ${t('filters')}</h3><form id="search-filters"><div class="filter-fields"><label class="wide">${t('keyword')}<input type="search" name="q" value="${escape(filters.q)}" placeholder="${t('wherePlaceholder')}" maxlength="100"></label><label>${t('country')}<select name="country"><option value="">${t('anyCountry')}</option>${countries.map(([code,country])=>`<option value="${code}" ${filters.country===code?'selected':''}>${escape(localized(country))}</option>`).join('')}</select></label><label>${t('travelStyle')}<select name="style">${styleOptions(filters.style)}</select></label><label>${t('budget')}<select name="budget">${budgetOptions(filters.budget)}</select></label><label>${t('month')}<select name="month">${monthOptions(filters.month)}</select></label></div><button type="submit" class="btn small">${t('search')}${icon('arrow')}</button><button type="button" class="text-link" data-action="reset-filters">${t('clearFilters')}</button></form></aside><div><div class="results-header"><span id="result-count" aria-live="polite">${t('resultCount',{count:result.length})}</span><label><span class="sr-only">${t('sort')}</span><select id="result-sort" name="sort" aria-label="${t('sort')}">${[['recommended','recommended'],['low','lowPrice'],['high','highPrice'],['name','alphabetical']].map(([value,key])=>`<option value="${value}" ${filters.sort===value?'selected':''}>${t(key)}</option>`).join('')}</select></label></div><div class="destination-grid">${result.length?result.map(destination=>card(destination,personalized)).join(''):emptyState('search','noResults','noResultsBody',`<button class="btn" data-action="reset-filters">${t('clearFilters')}</button>`)}</div><p class="result-note">${t('estimateNote')}</p>${personalized?`<p class="result-note">${t('matchingNote')}</p>`:''}</div></section></div>`;
}
function emptyState(symbol,title,body,button='') { return `<div class="empty-state">${icon(symbol)}<h2>${t(title)}</h2><p>${t(body)}</p>${button}</div>`; }
function planPage() {
  const preferences=state.preferences??defaults;
  return `<div class="container">${pageHead('planEyebrow','planTitle','planBody')}<section class="section planner-layout"><div class="panel"><h2>${t('planFormTitle')}</h2><form id="preferences-form"><div class="form-section"><h3>${t('interests')}</h3><p class="helper">${t('interestsHelp')}</p><div class="choice-grid">${interests.map(interest=>`<label class="choice"><input type="checkbox" name="interests" value="${interest}" ${preferences.interests.includes(interest)?'checked':''}>${icon(interest)}${t(interest)}</label>`).join('')}</div></div><div class="form-section"><h3>${t('travelingWith')}</h3><div class="choice-grid">${['solo','couple','family','friends'].map(group=>`<label class="choice"><input type="radio" name="group" value="${group}" ${preferences.group===group?'checked':''}>${t(group)}</label>`).join('')}</div></div><div class="form-section"><label for="daily-budget">${t('dailyBudgetLabel')}</label><div class="range-label"><span>${money(30)}</span><strong id="budget-output">${money(preferences.budget)}</strong><span>${money(300)}+</span></div><input type="range" id="daily-budget" name="budget" min="30" max="300" step="5" value="${preferences.budget}"><p class="helper">${t('longBudgetNote')}</p></div><div class="form-section form-grid"><label>${t('tripLength')}<select name="days">${[2,3,4,5,7,10,14,21,30].map(days=>`<option value="${days}" ${Number(preferences.days)===days?'selected':''}>${t('days',{count:days})}</option>`).join('')}</select></label><label>${t('monthLabel')}<select name="month">${monthOptions(preferences.month,false)}</select></label></div><div class="error-text form-error" id="preferences-error" role="alert"></div><button class="btn" type="submit">${t('planSave')}${icon('arrow')}</button><p class="helper">${t(state.user?(state.cloudReady?'planAccount':'planPending'):'planGuest')}</p></form></div><aside class="planner-aside">${photo(find('ha-long-bay')??destinations[0])}<div class="aside-copy"><p class="eyebrow">${t('madeFor')}</p><h2>${t('planAsideTitle')}</h2><p>${t('planAsideBody')}</p><div class="aside-rule"></div><div class="mini-stat"><span>${t('countries')}<br><strong>${new Set(destinations.map(item=>item.countryCode)).size}</strong></span><span>${t('curatedPlaces')}<br><strong>${destinations.length}</strong></span></div></div></aside></section></div>`;
}
function savedPage() {
  const selected=destinations.filter(destination=>state.favorites.includes(destination.id));
  const body= !state.user?emptyState('heart','accountNeeded','authSavedBody',`<button class="btn" data-action="auth">${t('signIn')}${icon('arrow')}</button>`):!state.cloudReady&&!selected.length?emptyState('heart','travelDataPending','travelDataPendingBody',syncRetryButton()):!selected.length?emptyState('heart','savedEmpty','savedEmptyBody',`<a class="btn" href="/search.html" data-nav>${t('explore')}${icon('arrow')}</a>`):`<div class="compare-bar"><span>${t('compareHelp')} · ${t('selected',{count:state.compare.length})}</span><button class="btn small" data-action="compare" ${state.compare.length<2?'disabled':''}>${t('compare')}${icon('arrow')}</button></div><div class="destination-grid">${selected.map(destination=>card(destination,false,true)).join('')}</div><p class="result-note">${t('estimateNote')}</p>`;
  return `<div class="container">${pageHead('savedEyebrow','savedTitle','savedBody')}<section class="section">${body}</section></div>`;
}
function destinationPage() {
  const destination=find(new URLSearchParams(location.search).get('id'));
  if(!destination) return notFoundPage();
  const saved=state.favorites.includes(destination.id);
  const map=`https://www.openstreetmap.org/?mlat=${destination.coordinates.lat}&mlon=${destination.coordinates.lng}#map=13/${destination.coordinates.lat}/${destination.coordinates.lng}`;
  return `<div class="container"><div class="page-head"><div class="breadcrumbs"><a href="/search.html" data-nav>${t('discover')}</a>${icon('chevron')}<span>${escape(localized(destination.country))}</span>${icon('chevron')}<span>${escape(localized(destination.name))}</span></div><p class="eyebrow">${t('detailEyebrow')}</p><h1>${escape(localized(destination.name))}</h1><p class="subtext">${icon('pin')} ${escape(localized(destination.country))}</p></div><section class="detail-layout section"><div>${photo(destination,'detail-hero',true)}<p class="detail-intro">${escape(localized(destination.description))}</p><div class="detail-tags">${destination.tags.map(tag=>`<span class="pill">${icon(tag)}${t(tag)}</span>`).join('')}</div><div class="detail-section"><h2>${t('highlights')}</h2><div class="highlights">${localized(destination.highlights).map(highlight=>`<div class="highlight">${icon('check')}<span>${escape(highlight)}</span></div>`).join('')}</div></div><div class="detail-section"><h2>${t('practical')}</h2><div class="facts-grid"><div class="fact">${icon('wallet')}<small>${t('estimated')}</small><strong>${money(destination.dailyBudget)} ${t('perDay')}</strong></div><div class="fact">${icon('calendar')}<small>${t('bestSeason')}</small><strong>${seasonLabel(destination)}</strong></div><div class="fact">${icon('clock')}<small>${t('suggestedStay')}</small><strong>${t('days',{count:destination.duration})}</strong></div></div><p class="subtext">${escape(localized(destination.season))}</p><div class="source-links"><a class="text-link" href="${map}" target="_blank" rel="noopener noreferrer">${t('map')}${icon('external')}</a><a class="text-link" href="${escape(destination.officialUrl)}" target="_blank" rel="noopener noreferrer">${t('tourism')}${icon('external')}</a></div><p class="helper">${t('detailNote')}</p></div><div class="detail-section"><h2>${t('taste')}</h2><p class="subtext">${t('foodBody')}</p><div class="detail-tags">${localized(destination.food).map(food=>`<span class="pill">${icon('food')}${escape(food)}</span>`).join('')}</div></div></div><aside class="booking-sidebar"><div class="panel"><p class="eyebrow">${t('demoTicket')}</p><div class="price">${money(destination.ticketPrice)} <small>${t('perAdult')}</small></div><p>${t('passDescription')}</p><a class="btn" href="/booking.html?id=${destination.id}" data-nav>${t('bookExperience')}${icon('arrow')}</a><button class="btn outline" data-action="save" data-id="${destination.id}" aria-pressed="${saved}">${icon('heart')}${t(saved?'savedAlready':'saveForLater')}</button><div class="booking-note">${icon('info')}<span>${t('demoNoticeBody')}</span></div></div></aside></section></div>`;
}
function initBooking() {
  const selected=find(new URLSearchParams(location.search).get('id'))??destinations[0];
  if(!bookingDraft||bookingDraft.destinationId!==selected.id) {
    bookingDraft={destinationId:selected.id,date:futureDate(14),adults:2,children:0,notes:''};bookingStep=1;confirmedBooking=null;
  }
}
function bookingPrice() {
  const destination=find(bookingDraft.destinationId);
  return Math.round((destination.ticketPrice*Number(bookingDraft.adults)+Math.round(destination.ticketPrice*.6*100)/100*Number(bookingDraft.children))*100)/100;
}
function summaryLines() {
  const destination=find(bookingDraft.destinationId);
  return `<div class="summary-line"><span>${t('adultLine',{count:bookingDraft.adults,price:money(destination.ticketPrice)})}</span><span>${money(destination.ticketPrice*Number(bookingDraft.adults))}</span></div>${Number(bookingDraft.children)?`<div class="summary-line"><span>${t('childLine',{count:bookingDraft.children,price:money(Math.round(destination.ticketPrice*.6*100)/100)})}</span><span>${money(Math.round(destination.ticketPrice*.6*100)/100*Number(bookingDraft.children))}</span></div>`:''}<div class="summary-line"><span>${t('serviceFee')}</span><span>${t('free')}</span></div><div class="summary-line total"><span>${t('total')}</span><strong>${money(bookingPrice())}</strong></div>`;
}
function demoNotice() {return `<div class="notice">${icon('info')}<div><strong>${t('demoNotice')}</strong><p>${t('demoNoticeBody')}</p></div></div>`;}
function bookingPage() {
  initBooking();
  if(confirmedBooking&&state.user?.id===confirmedBookingOwner) return confirmationPage(confirmedBooking);
  const destination=find(bookingDraft.destinationId);
  const form=bookingStep===1?`<form id="booking-form" novalidate><div class="form-grid"><label class="span-2">${t('destination')}<select name="destinationId">${destinations.map(item=>`<option value="${item.id}" ${item.id===destination.id?'selected':''}>${escape(localized(item.name))}, ${escape(localized(item.country))}</option>`).join('')}</select></label><label class="span-2">${t('date')}<input type="date" name="date" value="${bookingDraft.date}" min="${today()}" max="${maxDate()}" required></label><label>${t('adults')}<input type="number" name="adults" min="1" max="12" step="1" value="${bookingDraft.adults}" required></label><label>${t('children')}<input type="number" name="children" min="0" max="12" step="1" value="${bookingDraft.children}" required></label><p class="helper span-2">${t('childrenHelp')} ${t('qtyHelp')}</p><label class="span-2">${t('notes')}<textarea name="notes" maxlength="500" placeholder="${t('notesPlaceholder')}">${escape(bookingDraft.notes)}</textarea></label></div><div id="booking-error" class="error-text form-error" role="alert"></div><div class="form-actions"><span></span><button class="btn" type="submit">${t('nextReview')}${icon('arrow')}</button></div></form>`:`<form id="checkout-form" novalidate><div class="stack"><div><h3>${escape(localized(destination.name))}, ${escape(localized(destination.country))}</h3><div class="summary-line"><span>${t('date')}</span><strong>${dateLabel(bookingDraft.date)}</strong></div><div class="summary-line"><span>${t('travelerCount',{count:Number(bookingDraft.adults)+Number(bookingDraft.children)})}</span><strong>${money(bookingPrice())}</strong></div>${bookingDraft.notes?`<p class="helper">${t('notes')}: ${escape(bookingDraft.notes)}</p>`:''}</div>${demoNotice()}<label class="choice"><input name="demoAgreement" type="checkbox" required>${t('demoAgreement')}</label>${!state.user?`<p class="helper">${t('bookingAuth')}</p>`:''}<div id="booking-error" class="error-text" role="alert"></div><div class="form-actions"><button class="btn outline" type="button" data-action="booking-back">${t('back')}</button><button class="btn" type="submit">${t('confirmDemo')}${icon('check')}</button></div></div></form>`;
  return `<div class="container">${pageHead('bookingEyebrow','bookingTitle','bookingBody')}<section class="section booking-layout"><div class="panel"><div class="checkout-step"><span class="${bookingStep===1?'active':''}">01 · ${t('tripDetails')}</span>${icon('chevron')}<span class="${bookingStep===2?'active':''}">02 · ${t('review')}</span></div>${form}</div><aside class="booking-summary">${photo(destination,'',true)}<div class="summary-body"><p class="eyebrow">${t('demoTicket')}</p><h3>${escape(localized(destination.name))}</h3><div id="summary-lines">${summaryLines()}</div><p class="helper">${t('demoNotice')}</p></div></aside></section></div>`;
}
function confirmationPage(booking) {
  const destination=find(booking.destinationId);
  return `<div class="container"><section class="section confirmation"><div class="success-mark">${icon('check')}</div><p class="eyebrow flex">${t('confirmation')}</p><h1>${t('demoComplete')}</h1><p>${t('demoCompleteBody')}</p><div class="panel"><span class="pill">${icon('ticket')}${t('demoStatus')}</span><div class="summary-line"><span>${t('reference')}</span><strong>${escape(booking.id)}</strong></div><div class="summary-line"><span>${t('destination')}</span><strong>${escape(localized(destination.name))}</strong></div><div class="summary-line"><span>${t('date')}</span><strong>${dateLabel(booking.date)}</strong></div><div class="summary-line"><span>${t('travelerCount',{count:booking.adults+booking.children})}</span><strong>${money(booking.total)}</strong></div>${demoNotice()}</div><div class="flex"><button class="btn" data-action="receipt" data-id="${booking.id}">${icon('download')}${t('downloadReceipt')}</button><a class="btn outline" href="/history.html" data-nav>${t('viewTickets')}${icon('arrow')}</a></div></section></div>`;
}
function ticketsPage() {
  const body=!state.user?emptyState('ticket','accountNeeded','bookingAuth',`<button class="btn" data-action="auth">${t('signIn')}${icon('arrow')}</button>`):!state.cloudReady&&!state.bookings.length?emptyState('ticket','travelDataPending','travelDataPendingBody',syncRetryButton()):!state.bookings.length?emptyState('ticket','ticketsEmpty','ticketsEmptyBody',`<a class="btn" href="/search.html" data-nav>${t('explore')}${icon('arrow')}</a>`):`<div class="booking-list">${[...state.bookings].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(booking=>{const destination=find(booking.destinationId);if(!destination)return '';return `<article class="booking-row">${photo(destination)}<div><span class="pill ${booking.status==='cancelled'?'badge-cancelled':''}">${t(booking.status==='cancelled'?'cancelled':'demoStatus')}</span><h3><a href="/destination.html?id=${destination.id}" data-nav>${escape(localized(destination.name))}</a></h3><div class="meta"><span>${dateLabel(booking.date)}</span><span>${t('travelerCount',{count:booking.adults+booking.children})}</span></div><small class="subtext">${escape(booking.id)}</small></div><div><div class="booking-total">${money(booking.total)}</div><div class="row-actions"><button class="btn outline small" data-action="receipt" data-id="${booking.id}">${icon('download')}${t('downloadReceipt')}</button>${booking.status!=='cancelled'?`<button class="text-link" data-action="cancel" data-id="${booking.id}">${t('cancelBooking')}</button>`:''}</div></div></article>`;}).join('')}</div><div class="booking-note">${icon('info')}${t('noCharge')}</div>`;
  return `<div class="container">${pageHead('ticketsEyebrow','ticketsTitle','ticketsBody')}<section class="section">${body}</section></div>`;
}
function aboutPage() {
  return `<div class="container">${pageHead('aboutEyebrow','aboutTitle','aboutIntro')}<section class="section info-layout"><div class="prose"><p>${t('aboutSecond')}</p><h2>${t('faqTitle')}</h2><div id="faq">${[1,2,3,4].map(number=>`<details class="faq"><summary>${t(`faq${number}`)}</summary><p>${t(`faq${number}Body`)}</p></details>`).join('')}</div><p class="helper">${t('sourceNote')}</p></div><div class="planner-aside">${photo(find('hoi-an')??destinations[0])}<div class="aside-copy"><h2>${t('planAsideTitle')}</h2><p>${t('planAsideBody')}</p><a class="btn coral" href="/plan.html" data-nav>${t('buildPlan')}${icon('arrow')}</a></div></div></section></div>`;
}
function notFoundPage() {return `<section class="container section">${emptyState('pin','notFound','notFoundBody',`<a class="btn" href="/search.html" data-nav>${t('explore')}</a>`)}</section>`;}
function render() {
  document.documentElement.lang=state.lang;
  document.documentElement.dataset.theme=state.theme;
  const titles={home:'tagline',search:'discover',plan:'plan',favorites:'saved',destination:'destination',booking:'bookExperience',tickets:'tickets',about:'about'};
  const page=route();
  document.title=`VacAsia — ${t(titles[page]??'discover')}`;
  $('.skip-link').textContent=t('skip');
  const pages={home:homePage,search:searchPage,plan:planPage,favorites:savedPage,destination:destinationPage,booking:bookingPage,tickets:ticketsPage,about:aboutPage};
  $('#app').innerHTML=`${header()}<main id="main" tabindex="-1">${(pages[page]??notFoundPage)()}</main>${footer()}<button class="theme-toggle" data-action="theme" aria-label="${t(state.theme==='light'?'darkMode':'lightMode')}" title="${t(state.theme==='light'?'darkMode':'lightMode')}">${icon(state.theme==='light'?'moon':'sun')}</button>`;
  $$('a[data-nav]').forEach(link=>link.setAttribute('href',localUrl(link.getAttribute('href'))));
  $$('img').forEach(img=>{img.setAttribute('src',localUrl(img.getAttribute('src')));img.addEventListener('error',()=>{if(!img.src.endsWith('/assets/fallback.svg'))img.src=localUrl('/assets/fallback.svg');},{once:true});});
}
function navigate(url,replace=false) {
  pendingAction=null;
  closeModal();
  state.menu=false;
  const target=new URL(localUrl(url),location.href);
  if(target.pathname.endsWith('/booking.html')&&route()!=='booking') {bookingDraft=null;confirmedBooking=null;bookingStep=1;}
  history[replace?'replaceState':'pushState']({},'',target.pathname+target.search+target.hash);
  render();
  if(target.hash) $(target.hash)?.scrollIntoView();
  else window.scrollTo({top:0,behavior:'instant'});
  $('#main').focus({preventScroll:true});
}
function changeAccount(user) {
  const previousId=state.user?.id??null;
  const nextId=user?.id??null;
  if(previousId===nextId)return false;
  accountEpoch++;syncRequest++;
  state.user=user??null;state.favorites=[];state.bookings=[];state.compare=[];
  state.preferences=user?null:readLocal('vacasia-preferences',null);
  state.cloudReady=!user;state.syncWarning=user?{code:'sync_pending'}:null;state.syncBusy=false;
  confirmedBooking=null;confirmedBookingOwner=null;
  // A guest's checkout can continue after signing in. A signed-in account's draft is private to that account.
  if(previousId){bookingDraft=null;bookingStep=1;pendingAction=null;}
  return true;
}
function onFirebaseAuthChange({user}) {
  if((state.user?.id??null)===(user?.id??null))return;
  if(state.authBusy){
    if(authAttemptUserId===undefined&&user)authAttemptUserId=user.id;
    else if(authAttemptUserId!==undefined&&authAttemptUserId!==(user?.id??null))authIntent++;
  }else if(!logoutBusy||user)authIntent++;
  changeAccount(user);
  if(state.authBusy){render();return;}
  closeModal();render();
  if(user)void retrySync(true);
}
async function api(path,body,method='POST') {
  if(logoutBusy&&path!=='/api/logout')throw {code:'auth_changed'};
  const epoch=accountEpoch,intent=authIntent;
  const changesAuth=['/api/register','/api/login','/api/google','/api/logout'].includes(path);
  const stillCurrent=()=>epoch===accountEpoch&&intent===authIntent;
  const checkResponse=()=>{if(!changesAuth&&!stillCurrent())throw {code:'auth_changed'};};
  if(cloudApi){try{const expectedUserId=path==='/api/session'||['/api/register','/api/login','/api/google'].includes(path)?undefined:state.user?.id;const result=await cloudApi(path,body,method,expectedUserId);checkResponse();if(stillCurrent()){state.online=true;state.connectionError=null;}return result;}catch(error){if(!changesAuth&&!stillCurrent())throw {code:'auth_changed'};if(stillCurrent()&&error.code==='auth_required'){applySession({user:null,favorites:[],bookings:[]});closeModal();render();}else if(stillCurrent()&&state.user&&error.code?.startsWith('store_')){state.cloudReady=false;state.syncWarning=error;refreshAccountStatus();}throw error;}}
  let response;
  try {response=await fetch(localUrl(path),{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});} catch {checkResponse();throw {code:'offline'};}
  let result;
  try {result=await response.json();} catch {checkResponse();throw {code:path==='/api/session'&&response.status!==500?'backend_missing':'errorGeneric'};}
  checkResponse();
  if(!response.ok) {if(response.status===401&&result.code==='auth_required'){applySession({user:null,favorites:[],bookings:[]});closeModal();render();}throw result;}
  state.online=true;
  return result;
}
function applySession(session) {
  const sameUser=Boolean(session.user&&state.user?.id===session.user.id);
  changeAccount(session.user);
  state.user=session.user??null;
  state.cloudReady=session.cloudReady!==false;
  state.syncWarning=session.syncWarning??(state.cloudReady?null:{code:'store_unavailable'});
  if(state.cloudReady||!sameUser){state.favorites=session.favorites??[];state.bookings=session.bookings??[];}
  state.compare=[];
  if(session.user){if(state.cloudReady||!sameUser)state.preferences=session.preferences??null;}
  else state.preferences=readLocal('vacasia-preferences',null);
}
function showToast(message) {
  clearTimeout(toastTimer);const toast=$('#toast');toast.textContent=message;toast.classList.add('visible');toastTimer=setTimeout(()=>toast.classList.remove('visible'),3600);
}
function errorMessage(error) {
  const codes=['invalid_input','invalid_credentials','email_exists','auth_required','auth_changed','sync_pending','rate_limited','invalid_date','invalid_quantity','invalid_destination','offline','firebase_setup','auth_disabled','auth_domain','auth_config','auth_cancelled','auth_provider_conflict','auth_unsupported','auth_popup_blocked','auth_profile','store_permission','store_unavailable','store_setup','store_quota'];
  return t(codes.includes(error?.code)?error.code:'errorGeneric');
}
function requireAccount(action) {
  if(state.user){if(!state.cloudReady){pendingAction=action;showToast(t('cloudSyncPendingTitle'));return;}return action();}
  pendingAction=action;openModal({type:'auth',tab:'login'});
}
function setAuthBusy(busy) {
  state.authBusy=busy;
  $$('#auth-form button,.auth-tabs button,[data-action="google-auth"]').forEach(button=>button.disabled=busy);
}
function finishAuthAttempt() {
  setAuthBusy(false);authAttemptUserId=undefined;
  if(state.user&&state.user.id!==authAttemptBaselineId&&modalState?.type==='auth'){closeModal();render();}
  if(state.user&&!state.cloudReady&&state.syncWarning?.code==='sync_pending')void retrySync(true);
}
async function finishSignIn(session,successKey,guestPreferences,intent) {
  if(intent!==authIntent||authAttemptUserId!==undefined&&session.user&&session.user.id!==authAttemptUserId)throw {code:'auth_changed'};
  if(session.redirecting){showToast(t('googleRedirecting'));return;}
  const continuation=pendingAction;
  applySession(session);
  const epoch=accountEpoch;
  if(guestPreferences&&!session.preferences&&state.cloudReady){
    try{const result=await api('/api/preferences',guestPreferences,'PUT');state.preferences=result.preferences;}catch(error){if(error.code==='auth_changed')throw error;}
  }
  if(epoch!==accountEpoch||intent!==authIntent)throw {code:'auth_changed'};
  closeModal();render();
  if(!state.cloudReady){pendingAction=continuation;showToast(t('signedInSyncPending'));return;}
  showToast(t(successKey));
  if(continuation)await continuation();
}
async function retrySync(automatic=false) {
  if(state.syncBusy)return;
  const request=++syncRequest,epoch=accountEpoch,intent=authIntent;
  state.syncBusy=true;refreshAccountStatus();
  const retryButtons=$$('[data-action="retry-sync"]');retryButtons.forEach(button=>button.disabled=true);
  try{
    const session=await api('/api/session',undefined,'GET');
    if(epoch!==accountEpoch||intent!==authIntent)throw {code:'auth_changed'};
    applySession(session);state.online=true;state.connectionError=null;
    const continuation=state.user&&state.cloudReady?pendingAction:null;
    if(continuation)pendingAction=null;
    render();if(modalState)renderModal(false);
    if(!automatic||!state.cloudReady)showToast(t(state.cloudReady?'syncRestored':'signedInSyncPending'));
    if(continuation)await continuation();
  }catch(error){if(error.code==='auth_changed')return;if(epoch===accountEpoch&&intent===authIntent){state.connectionError=error;state.online=false;refreshAccountStatus();showToast(errorMessage(error));}}
  finally{if(request===syncRequest){state.syncBusy=false;refreshAccountStatus();$$('[data-action="retry-sync"]').forEach(button=>{button.disabled=false;button.textContent=t(state.user?'retrySync':'retryConnection');});}}
}
async function savePlace(id) {
  return requireAccount(async()=>{
    const saved=!state.favorites.includes(id);
    try {const result=await api('/api/favorites',{destinationId:id,saved},'PUT');state.favorites=result.favorites;state.compare=state.compare.filter(item=>state.favorites.includes(item));render();showToast(t(saved?'placeSaved':'placeRemoved'));} catch(error){if(error.code==='auth_changed')return;render();showToast(errorMessage(error));}
  });
}
function modalContents() {
  if(!modalState)return '';
  const close=`<button class="icon-button close-modal" data-action="close-modal" aria-label="${t('close')}">${icon('close')}</button>`;
  if(modalState.type==='auth') {
    const register=modalState.tab==='register';
    return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">${close}${brand()}<h2 id="modal-title">${t('authTitle')}</h2><p class="subtext">${t('authBody')}</p>${firebaseConfigured?`<button class="btn google-button" data-action="google-auth" ${state.authBusy?'disabled':''}><svg aria-hidden="true" viewBox="0 0 48 48"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.7-.4-4.1H24v7.8h11.1a9.4 9.4 0 0 1-4.1 6.2v5h6.7c3.9-3.6 5.9-8.8 5.9-14.9Z"/><path fill="#34A853" d="M24 44c5.6 0 10.3-1.9 13.7-5.1L31 33.9a12.5 12.5 0 0 1-18.6-6.5H5.5v5.2A20.7 20.7 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.4 27.4a12.4 12.4 0 0 1 0-7.8v-5.2H5.5a20 20 0 0 0 0 18.2l6.9-5.2Z"/><path fill="#EA4335" d="M24 11a11.1 11.1 0 0 1 7.9 3.1l5.9-5.9A19.8 19.8 0 0 0 24 3 20.7 20.7 0 0 0 5.5 14.4l6.9 5.2A12.3 12.3 0 0 1 24 11Z"/></svg>${t('continueGoogle')}</button><div class="auth-divider"><span>${t('continueEmail')}</span></div>`:''}<div class="auth-tabs" role="tablist"><button role="tab" aria-selected="${!register}" data-action="auth-tab" data-tab="login" class="${register?'':'active'}" ${state.authBusy?'disabled':''}>${t('signIn')}</button><button role="tab" aria-selected="${register}" data-action="auth-tab" data-tab="register" class="${register?'active':''}" ${state.authBusy?'disabled':''}>${t('signUp')}</button></div><form id="auth-form" class="auth-form" novalidate>${register?`<label>${t('fullName')}<input type="text" name="name" autocomplete="name" minlength="2" maxlength="60" placeholder="${t('nameHint')}" required></label>`:''}<label>${t('email')}<input type="email" name="email" autocomplete="email" maxlength="254" placeholder="${t('emailHint')}" required></label><label>${t('password')}<input type="password" name="password" autocomplete="${register?'new-password':'current-password'}" minlength="8" maxlength="128" required>${register?`<span class="helper">${t('passwordHint')}</span>`:''}</label><div class="error-text" id="auth-error" role="alert"></div><button type="submit" class="btn" ${state.authBusy?'disabled':''}>${t(register?'signUp':'signIn')}${icon('arrow')}</button></form><p class="helper">${t('authFootnote')}</p></div>`;
  }
  if(modalState.type==='account')return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">${close}<h2 id="modal-title">${t('profileTitle')}</h2><p class="subtext">${escape(t('memberEmail',{email:state.user.email}))}</p>${!state.cloudReady?`<div class="sync-message" role="status"><strong>${t('cloudSyncPendingTitle')}</strong><p>${errorMessage(state.syncWarning)} ${t('cloudSyncPendingBody')}</p>${syncRetryButton()}</div>`:''}<div class="account-menu"><form id="profile-form" class="auth-form" novalidate><label>${t('fullName')}<input name="name" value="${escape(state.user.name)}" minlength="2" maxlength="60" required autocomplete="name"></label><div class="error-text" id="profile-error" role="alert"></div><button class="btn" type="submit" ${!state.cloudReady?'disabled':''}>${t('updateProfile')}</button></form><a class="btn outline" href="/history.html" data-nav>${icon('ticket')}${t('tickets')}</a><button class="text-link" data-action="logout">${t('signOut')}</button></div></div>`;
  if(modalState.type==='compare') {
    const selected=state.compare.map(find).filter(Boolean);
    return `<div class="modal compare-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">${close}<h2 id="modal-title">${t('compareTitle')}</h2><p class="subtext">${t('estimateNote')}</p><div class="compare-scroll"><table class="compare-table"><thead><tr><th></th>${selected.map(destination=>`<th>${escape(localized(destination.name))}${photo(destination)}<small>${escape(localized(destination.country))}</small></th>`).join('')}</tr></thead><tbody>${[['estimated',destination=>money(destination.dailyBudget)+' '+t('perDay')],['bestFor',destination=>destination.tags.map(tag=>t(tag)).join(', ')],['bestSeason',destination=>seasonLabel(destination)],['suggestedStay',destination=>t('compareDays',{count:destination.duration})],['demoTicket',destination=>money(destination.ticketPrice)+' '+t('perAdult')]].map(([key,value])=>`<tr><td>${t(key)}</td>${selected.map(destination=>`<td>${value(destination)}</td>`).join('')}</tr>`).join('')}<tr><td></td>${selected.map(destination=>`<td><a class="btn small" href="/destination.html?id=${destination.id}" data-nav>${t('details')}${icon('arrow')}</a></td>`).join('')}</tr></tbody></table></div></div>`;
  }
  if(modalState.type==='cancel') {
    const booking=state.bookings.find(item=>item.id===modalState.id);
    return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">${close}<h2 id="modal-title">${t('cancelTitle')}</h2><p class="subtext">${escape(t('cancelBody',{name:localized(find(booking.destinationId).name)}))}</p><div class="form-actions"><button class="btn outline" data-action="close-modal">${t('keepBooking')}</button><button class="btn coral" data-action="confirm-cancel" data-id="${booking.id}">${t('cancelBooking')}</button></div><div class="error-text form-error" id="cancel-error" role="alert"></div></div>`;
  }
  return '';
}
function renderModal(focus=true) {
  $('#modal-root').innerHTML=modalState?`<div class="modal-backdrop">${modalContents()}</div>`:'';
  $$('#modal-root a[data-nav]').forEach(link=>link.setAttribute('href',localUrl(link.getAttribute('href'))));
  $$('#modal-root img').forEach(img=>img.setAttribute('src',localUrl(img.getAttribute('src'))));
  document.body.classList.toggle('modal-open',Boolean(modalState));
  $('#app').inert=Boolean(modalState);
  if(focus) setTimeout(()=>$('.modal input, .modal button')?.focus(),0);
}
function openModal(configuration) {focusBeforeModal=document.activeElement;modalState=configuration;renderModal();}
function closeModal() {
  if(!modalState)return;
  modalState=null;renderModal(false);pendingAction=null;
  if(focusBeforeModal?.isConnected)focusBeforeModal.focus();
}
function formSnapshots() {
  return $$('form').map(form=>({id:form.id,values:[...form.elements].filter(element=>element.name&&element.type!=='password').map(element=>({name:element.name,value:element.value,checked:element.checked,type:element.type}))}));
}
function restoreForms(snapshots) {
  for(const snapshot of snapshots) {
    const form=document.getElementById(snapshot.id);if(!form)continue;
    for(const item of snapshot.values) {
      for(const element of [...form.elements].filter(element=>element.name===item.name)) {
        if(item.type==='checkbox'||item.type==='radio') {if(element.value===item.value)element.checked=item.checked;}
        else element.value=item.value;
      }
    }
  }
  if($('#daily-budget'))$('#budget-output').textContent=money(Number($('#daily-budget').value));
}
function changeLanguage() {
  const snapshots=formSnapshots();state.lang=state.lang==='en'?'vi':'en';writeLocal('vacasia-language',state.lang);render();renderModal(false);restoreForms(snapshots);
}
function downloadReceipt(id) {
  if(!state.user)return;
  const booking=state.bookings.find(item=>item.id===id)??(confirmedBookingOwner===state.user.id&&confirmedBooking?.id===id?confirmedBooking:null);if(!booking)return;
  const destination=find(booking.destinationId);
  const lines=[t('receiptTitle'),'='.repeat(45),t('noCharge'),'',`${t('reference')}: ${booking.id}`,`${t('destination')}: ${localized(destination.name)}, ${localized(destination.country)}`,`${t('date')}: ${dateLabel(booking.date)}`,`${t('adults')}: ${booking.adults}`,`${t('children')}: ${booking.children}`,`${t('total')}: ${money(booking.total)}`,`${t(booking.status==='cancelled'?'cancelled':'demoStatus')}`,booking.notes?`${t('notes')}: ${booking.notes}`:'','',t('demoNoticeBody')];
  const url=URL.createObjectURL(new Blob(['\uFEFF'+lines.join('\n')],{type:'text/plain;charset=utf-8'}));const anchor=document.createElement('a');anchor.href=url;anchor.download=`VacAsia-demo-${booking.id}.txt`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function updateSearch(form,sort=null) {
  const values=new FormData(form);const params=new URLSearchParams();for(const [key,value] of values)if(value&&value!=='0'&&value!=='all')params.set(key,value);
  const current=filtersFromUrl();if(current.matches)params.set('matches','1');if((sort??current.sort)!=='recommended')params.set('sort',sort??current.sort);
  navigate(`/search.html?${params}`);
}
async function submitWithBusy(form,operation,errorTarget) {
  if(!form)return;
  const button=$('[type="submit"]',form);const old=button?.innerHTML;if(button){button.disabled=true;button.textContent=t('loading');}
  if($(errorTarget))$(errorTarget).textContent='';
  try{await operation();}catch(error){if(error.code==='auth_changed')return;if($(errorTarget))$(errorTarget).textContent=errorMessage(error);else showToast(errorMessage(error));}
  finally{if(button?.isConnected){button.disabled=false;button.innerHTML=old;}}
}
document.addEventListener('click',async event=>{
  const link=event.target.closest('a[data-nav]');
  if(link&&event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();navigate(link.getAttribute('href'));return;}
  if(event.target.classList.contains('modal-backdrop')) {closeModal();return;}
  const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
  const {action,id}=button.dataset;
  if(action==='language')changeLanguage();
  else if(action==='theme'){state.theme=state.theme==='light'?'dark':'light';writeLocal('vacasia-theme-v2',state.theme);document.documentElement.dataset.theme=state.theme;button.innerHTML=icon(state.theme==='light'?'moon':'sun');button.setAttribute('aria-label',t(state.theme==='light'?'darkMode':'lightMode'));button.setAttribute('title',t(state.theme==='light'?'darkMode':'lightMode'));}
  else if(action==='menu'){state.menu=!state.menu;$('#navigation').classList.toggle('open',state.menu);button.setAttribute('aria-expanded',state.menu);}
  else if(action==='auth')openModal({type:'auth',tab:'login'});
  else if(action==='account')openModal({type:'account'});
  else if(action==='close-modal')closeModal();
  else if(action==='auth-tab'){modalState.tab=button.dataset.tab;renderModal();}
  else if(action==='google-auth'){
    if(!firebaseConfigured||state.authBusy)return;
    const guestPreferences=!state.user?state.preferences:null;
    const intent=++authIntent;authAttemptUserId=undefined;authAttemptBaselineId=state.user?.id??null;
    const old=button.innerHTML;setAuthBusy(true);button.textContent=t('loading');
    if($('#auth-error'))$('#auth-error').textContent='';
    try{await finishSignIn(await api('/api/google',{language:state.lang}),'signedIn',guestPreferences,intent);}catch(error){if(!['auth_cancelled','auth_changed'].includes(error.code)){if($('#auth-error'))$('#auth-error').textContent=errorMessage(error);else showToast(errorMessage(error));}}
    finally{finishAuthAttempt();if(button.isConnected)button.innerHTML=old;}
  }
  else if(action==='retry-sync')await retrySync();
  else if(action==='save')await savePlace(id);
  else if(action==='category'){state.category=button.dataset.category;render();$(`[data-category="${state.category}"]`)?.focus({preventScroll:true});}
  else if(action==='reset-filters')navigate('/search.html');
  else if(action==='compare')openModal({type:'compare'});
  else if(action==='booking-back'){pendingAction=null;bookingStep=1;render();}
  else if(action==='receipt')downloadReceipt(id);
  else if(action==='cancel')openModal({type:'cancel',id});
  else if(action==='confirm-cancel'){
    button.disabled=true;
    try{const result=await api(`/api/bookings/${encodeURIComponent(id)}`,undefined,'DELETE');state.bookings=result.bookings;closeModal();render();showToast(t('bookingCancelled'));}catch(error){if(error.code!=='auth_changed'&&$('#cancel-error'))$('#cancel-error').textContent=errorMessage(error);if(button.isConnected)button.disabled=false;}
  }
  else if(action==='logout'){
    if(logoutBusy)return;
    const intent=++authIntent;logoutBusy=true;button.disabled=true;
    try{await api('/api/logout',{});if(intent!==authIntent)throw {code:'auth_changed'};applySession({user:null,favorites:[],bookings:[]});closeModal();render();showToast(t('signedOut'));}catch(error){if(error.code!=='auth_changed')showToast(errorMessage(error));if(button.isConnected)button.disabled=false;}
    finally{logoutBusy=false;if(state.user&&!state.cloudReady&&state.syncWarning?.code==='sync_pending')void retrySync(true);}
  }
});
document.addEventListener('submit',async event=>{
  const form=event.target;if(!form.id)return;event.preventDefault();
  const values=new FormData(form);
  if(form.id==='hero-search'){const params=new URLSearchParams(values);navigate(`/search.html?${params}`);}
  else if(form.id==='search-filters')updateSearch(form);
  else if(form.id==='auth-form'){
    if(state.authBusy)return;
    const register=modalState.tab==='register';
    if(register&&(String(values.get('name')).trim().length<2||String(values.get('name')).trim().length>60)){$('#auth-error').textContent=t('invalidName');return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values.get('email')))){$('#auth-error').textContent=t('invalidEmail');return;}
    if(String(values.get('password')).length<8||String(values.get('password')).length>128){$('#auth-error').textContent=t('invalidPassword');return;}
    const intent=++authIntent;authAttemptUserId=undefined;authAttemptBaselineId=state.user?.id??null;setAuthBusy(true);
    try{await submitWithBusy(form,async()=>{const guestPreferences=!state.user?state.preferences:null;const session=await api(register?'/api/register':'/api/login',Object.fromEntries(values));await finishSignIn(session,register?'registered':'signedIn',guestPreferences,intent);},'#auth-error');}finally{finishAuthAttempt();}
  }
  else if(form.id==='profile-form'){
    if(String(values.get('name')).trim().length<2||String(values.get('name')).trim().length>60){$('#profile-error').textContent=t('invalidName');return;}
    if(!state.cloudReady){$('#profile-error').textContent=errorMessage(state.syncWarning);return;}
    await submitWithBusy(form,async()=>{const result=await api('/api/profile',{name:values.get('name')});state.user=result.user;state.syncWarning=result.syncWarning??null;closeModal();render();showToast(t('profileSaved'));},'#profile-error');
  }
  else if(form.id==='preferences-form'){
    if(state.user&&!state.cloudReady){$('#preferences-error').textContent=errorMessage(state.syncWarning);return;}
    if(!values.getAll('interests').length){$('#preferences-error').textContent=t('interestsRequired');return;}
    const preferences={budget:Number(values.get('budget')),days:Number(values.get('days')),group:values.get('group'),month:Number(values.get('month')),interests:values.getAll('interests')};
    await submitWithBusy(form,async()=>{if(state.user)await api('/api/preferences',preferences,'PUT');state.preferences=preferences;if(!state.user)writeLocal('vacasia-preferences',preferences);navigate('/search.html?matches=1');showToast(t('planSaved'));},'#preferences-error');
  }
  else if(form.id==='booking-form'){
    bookingDraft={destinationId:values.get('destinationId'),date:values.get('date'),adults:Number(values.get('adults')),children:Number(values.get('children')),notes:values.get('notes').trim()};
    if(!Number.isInteger(bookingDraft.adults)||!Number.isInteger(bookingDraft.children)||bookingDraft.adults<1||bookingDraft.adults>12||bookingDraft.children<0||bookingDraft.children>12||bookingDraft.adults+bookingDraft.children>20){$('#booking-error').textContent=t('invalid_quantity');return;}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(bookingDraft.date)||bookingDraft.date<today()||bookingDraft.date>maxDate()){ $('#booking-error').textContent=t('wrongDate');return;}
    bookingStep=2;render();$('#main').focus({preventScroll:true});
  }
  else if(form.id==='checkout-form'){
    if(!values.get('demoAgreement')){$('#booking-error').textContent=t('acknowledgeRequired');return;}
    const complete=async()=>{await submitWithBusy($('#checkout-form'),async()=>{const result=await api('/api/bookings',bookingDraft);state.bookings=result.bookings;confirmedBooking=result.booking;confirmedBookingOwner=state.user.id;render();window.scrollTo({top:0,behavior:'instant'});$('#main').focus({preventScroll:true});},'#booking-error');};
    requireAccount(complete);
  }
});
document.addEventListener('input',event=>{
  const input=event.target;
  if(input.id==='daily-budget')$('#budget-output').textContent=money(Number(input.value));
  if(input.closest('#booking-form')&&['date','adults','children','notes'].includes(input.name)){
    bookingDraft[input.name]=['adults','children'].includes(input.name)?Number(input.value):input.value;
    $('#summary-lines').innerHTML=summaryLines();
  }
});
document.addEventListener('change',event=>{
  const input=event.target;
  if(input.id==='result-sort')updateSearch($('#search-filters'),input.value);
  else if(input.closest('#search-filters')&&input.tagName==='SELECT')updateSearch($('#search-filters'));
  else if(input.dataset.compare){
    if(input.checked&&state.compare.length>=3){input.checked=false;showToast(t('compareMax'));return;}
    state.compare=input.checked?[...state.compare,input.dataset.compare]:state.compare.filter(id=>id!==input.dataset.compare);render();
  }
  else if(input.name==='destinationId'&&input.closest('#booking-form')){
    pendingAction=null;bookingDraft.destinationId=input.value;history.replaceState({},'',localUrl(`/booking.html?id=${input.value}`));render();
  }
});
document.addEventListener('keydown',event=>{
  if(!modalState)return;
  if(event.key==='Escape'){event.preventDefault();closeModal();return;}
  if(event.key==='Tab'){
    const focusable=$$('.modal a[href],.modal button:not(:disabled),.modal input,.modal select,.modal textarea').filter(element=>element.offsetParent!==null);
    const first=focusable[0],last=focusable.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
});
window.addEventListener('popstate',()=>{pendingAction=null;closeModal();state.menu=false;render();});
window.addEventListener('storage',event=>{if(event.key==='vacasia-language'){state.lang=readLocal('vacasia-language','en')==='vi'?'vi':'en';render();renderModal(false);}});
render();
const {siteConfig}=await import('./siteConfig.js');
try{
  if(siteConfig.backend==='firebase'){const {firebaseApi}=await import('./firebaseAdapter.js');cloudApi=firebaseApi;firebaseConfigured=Boolean(siteConfig.firebase?.apiKey&&siteConfig.firebase?.authDomain&&siteConfig.firebase?.projectId);}
  applySession(await api('/api/session',undefined,'GET'));state.online=true;
}catch(error){
  if(siteConfig.backend==='auto'&&['backend_missing','not_found'].includes(error.code)){
    try{const {firebaseApi}=await import('./firebaseAdapter.js');cloudApi=firebaseApi;firebaseConfigured=Boolean(siteConfig.firebase?.apiKey&&siteConfig.firebase?.authDomain&&siteConfig.firebase?.projectId);applySession(await api('/api/session',undefined,'GET'));state.online=true;}catch(cloudError){state.online=false;state.connectionError=cloudError;}
  }else{state.online=false;state.connectionError=error;}
}
if(cloudApi){
  try{const {subscribeFirebaseAuth}=await import('./firebaseAdapter.js');if(subscribeFirebaseAuth)authObserver=await subscribeFirebaseAuth(onFirebaseAuthChange);}catch(error){if(error.code!=='auth_changed'){state.online=false;state.connectionError=error;}}
}
render();
if(modalState)renderModal(false);
const initialPage=location.pathname.split('/').pop();
if(initialPage==='login.html'||initialPage==='register.html')openModal({type:'auth',tab:initialPage==='register.html'?'register':'login'});
if(initialPage==='profile.html'){if(state.user)openModal({type:'account'});else openModal({type:'auth',tab:'login'});}
