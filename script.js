'use strict';

const firebaseConfig = {
  apiKey: "AIzaSyDYwcPrmPD_joI_q5l2tmt8ZiVl_JybO8A",
  authDomain: "letempsduninstantplanner.firebaseapp.com",
  databaseURL: "https://letempsduninstantplanner-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "letempsduninstantplanner",
  storageBucket: "letempsduninstantplanner.firebasestorage.app",
  messagingSenderId: "346894040415",
  appId: "1:346894040415:web:a4e58c8e8485c6c0750aea"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const DEF_FORMULES=[{id:'f1',emoji:'⏱',name:'Parenthèse 2h'},{id:'f2',emoji:'⏱',name:'Parenthèse 3h'},{id:'f3',emoji:'⏱',name:'Parenthèse 6h'},{id:'f4',emoji:'🌙',name:'Nuit'},{id:'f5',emoji:'💝',name:'Nuit romantique'},{id:'f6',emoji:'💆',name:'Nuit + massage'}];
const DEF_OPTIONS=[{id:'o1',emoji:'💆',name:'Massage'},{id:'o2',emoji:'🛏',name:'Table massage'},{id:'o3',emoji:'🍖',name:'Plancha'},{id:'o4',emoji:'🥂',name:'Champagne'},{id:'o5',emoji:'🌹',name:'Décoration romantique'},{id:'o6',emoji:'📘',name:'Booking'}];
const DEF_STATUTS=[{id:'s1',emoji:'🔸',name:'À préparer',key:'a-preparer'},{id:'s2',emoji:'🔵',name:'Chambre prête',key:'chambre-prete'},{id:'s3',emoji:'🟢',name:'Client arrivé',key:'client-arrive'},{id:'s4',emoji:'✅',name:'Terminé',key:'termine'}];
const DEF_TACHES=[{id:'t1',emoji:'🧹',name:'Ménage'},{id:'t2',emoji:'🛁',name:'Salle de bain propre'},{id:'t3',emoji:'🛏',name:'Lits faits'},{id:'t4',emoji:'🧴',name:"Produits d'accueil"},{id:'t5',emoji:'🌡',name:'Température réglée'}];

let R=[],F=DEF_FORMULES,O=DEF_OPTIONS,S=DEF_STATUTS,T=DEF_TACHES,FERM=[];
let ready=false,view='dashboard';
const TAUX=15;

// ── PROFILS ────────────────────────────────
const PROFILES=[
  {id:'jennifer',name:'Jennifer',emoji:'⭐',role:'gerante'},
  {id:'rachel',name:'Rachel',emoji:'🧴',role:'menage'},
  {id:'milla',name:'Milla',emoji:'🧴',role:'menage'},
  {id:'melanie',name:'Mélanie',emoji:'💆',role:'massage'},
  {id:'colline',name:'Colline',emoji:'💆',role:'massage'},
  {id:'virginie',name:'Virginie',emoji:'💆',role:'massage'},
  {id:'annabelle',name:'Annabelle',emoji:'💆',role:'massage'}
];
const ROLE_VIEWS={
  gerante:['dashboard','new-reservation','massage','all-reservations','calendar','temps-travail','settings'],
  menage:['dashboard','all-reservations','calendar'],
  massage:['dashboard','massage','calendar']
};
const ROLE_DEFAULT={gerante:'dashboard',menage:'dashboard',massage:'dashboard'};
const MASSEUSES=['melanie','colline','virginie','annabelle']; // ids massage (hors gérante)
function labelPerson(id){const p=PROFILES.find(x=>x.id===id);return p?p.name:(id==='jennifer'?'Jennifer':id);}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}
const PROFILE_KEY='ltdi_profile';
let currentProfile=null;
function getProfile(){return PROFILES.find(p=>p.id===currentProfile)||null;}
function defaultView(){const p=getProfile();return p?(ROLE_DEFAULT[p.role]||'dashboard'):'dashboard';}

function applyRole(){
  const p=getProfile();if(!p)return;
  const allowed=ROLE_VIEWS[p.role]||[];
  document.querySelectorAll('.nav-item').forEach(a=>{
    a.style.display=allowed.includes(a.dataset.view)?'':'none';
  });
  const lbl=document.getElementById('current-profile-label');
  if(lbl)lbl.textContent=p.emoji+' '+p.name;
  const menuBtn=document.getElementById('menu-toggle');
  if(menuBtn)menuBtn.style.display=allowed.length>1?'':'none';
  // libellés dynamiques
  const navAll=document.getElementById('all-nav-label');
  if(navAll)navAll.textContent=p.role==='menage'?('Mes réservations — '+p.name):'Toutes les réservations';
  const navMassage=document.querySelector('.nav-item[data-view="massage"] span');
  if(navMassage)navMassage.textContent=p.role==='massage'?'Mes massages':'Massages';
  const navNew=document.querySelector('.nav-item[data-view="new-reservation"] span');
  // masquer bouton "Nouvelle réservation" + filtres/recherche pour non-gérante sur le dashboard
  const dashHeaderBtn=document.querySelector('#view-dashboard .view-header .btn-primary');
  const filtersBar=document.querySelector('#view-dashboard .filters-bar');
  if(dashHeaderBtn)dashHeaderBtn.style.display=p.role==='gerante'?'':'none';
  if(filtersBar)filtersBar.style.display=p.role==='gerante'?'':'none';
  // blocs vue massage (gérante = saisie, staff = consultation)
  const mgBlock=document.getElementById('massage-gerante-block');
  const msBlock=document.getElementById('massage-staff-block');
  if(mgBlock)mgBlock.classList.toggle('hidden',p.role!=='gerante');
  if(msBlock)msBlock.classList.toggle('hidden',p.role!=='massage');
  // bouton fermer chambre réservé à la gérante
  document.querySelectorAll('#btn-fermer-chambre-header,#btn-fermer-chambre-mobile,.cal-fermer-mobile').forEach(el=>{if(el)el.style.display=p.role==='gerante'?'':'none';});
}

function renderProfileOverlay(){
  const groups={gerante:'profile-btns-gerante',menage:'profile-btns-menage',massage:'profile-btns-massage'};
  Object.keys(groups).forEach(role=>{
    const el=document.getElementById(groups[role]);
    if(!el)return;
    el.innerHTML=PROFILES.filter(p=>p.role===role).map(p=>'<button type="button" class="profile-btn" data-profile="'+p.id+'"><span class="profile-btn-emoji">'+p.emoji+'</span>'+x(p.name)+'</button>').join('');
  });
}

function loadProfils(cb){
  db.ref('profils').once('value',function(s){
    const raw=s.val()||{};
    PROFILES.forEach(function(p){ if(raw[p.id]&&raw[p.id].name)p.name=raw[p.id].name; });
    if(cb)cb();
  }).catch(function(){if(cb)cb();});
}

function initProfileGate(){
  const overlay=document.getElementById('profile-overlay');
  const saved=localStorage.getItem(PROFILE_KEY);
  if(saved&&PROFILES.some(p=>p.id===saved)){
    currentProfile=saved;
    startApp();
    return;
  }
  overlay.classList.remove('hidden');
  document.querySelectorAll('.profile-btn').forEach(b=>{
    b.addEventListener('click',()=>{
      currentProfile=b.dataset.profile;
      localStorage.setItem(PROFILE_KEY,currentProfile);
      overlay.classList.add('hidden');
      startApp();
    });
  });
}

function startApp(){
  applyRole();
  init();
}

document.getElementById('btn-switch-profile').addEventListener('click',()=>{
  localStorage.removeItem(PROFILE_KEY);
  location.reload();
});

// utils
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function fd(s){if(!s)return'—';const[y,m,d]=s.split('-');return d+'/'+m+'/'+y;}
function sol(p,a){return Math.max(0,(parseFloat(p)||0)-(parseFloat(a)||0));}
function x(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function sl(k){const s=S.find(i=>i.key===k);return s?s.name:k;}
function bdg(k){return'<span class="badge badge-'+k+'">'+x(sl(k))+'</span>';}
function fn(r){return[r.prenom,r.nom].filter(Boolean).join(' ')||'—';}
function dur(d1,h1,d2,h2){
  if(!d1||!h1||!d2||!h2)return null;
  try{const df=new Date(d2+'T'+h2)-new Date(d1+'T'+h1);if(df<=0)return null;
  const h=Math.floor(df/3600000),m=Math.floor((df%3600000)/60000);
  return h>=24?Math.floor(h/24)+'j'+(h%24?' '+(h%24)+'h':''):m?h+'h'+String(m).padStart(2,'0'):h+'h';}catch{return null;}
}
function ph(s){
  if(!s)return 0;s=s.trim().toLowerCase();
  let m=s.match(/^(\d+)h(\d{0,2})$/);if(m)return+m[1]+(+(m[2]||0)/60);
  m=s.match(/^(\d+):(\d{2})$/);if(m)return+m[1]+(+m[2]/60);
  m=s.match(/^(\d+)$/);if(m)return+m[1];
  const f=parseFloat(s);return isNaN(f)?0:f;
}
function fh(h){const hh=Math.floor(h),mm=Math.round((h-hh)*60);return mm?hh+'h'+String(mm).padStart(2,'0'):hh+'h';}
function fmtHeure(str){
  if(!str)return'';
  var parts=str.split(':');
  var h=parseInt(parts[0])||0,m=parseInt(parts[1])||0;
  if(h===0&&m===0)return'minuit';
  if(h===12&&m===0)return'midi';
  return h+'h'+(m?String(m).padStart(2,'0'):'');
}
function timeToPercent(str){
  // Convert HH:MM to percentage of day (0% = top = midnight, 100% = bottom = 23:59)
  if(!str)return 0;
  var parts=str.split(':');
  var h=parseInt(parts[0])||0,m=parseInt(parts[1])||0;
  return Math.round(((h*60+m)/(24*60))*100);
}
function isBooking(r){
  if(!r.options)return false;
  // Check by option id or by name "Booking"
  var bookingOpt=O.find(function(o){return o.name&&o.name.toLowerCase()==='booking';});
  if(bookingOpt&&r.options[bookingOpt.id])return true;
  // Fallback: check o6
  if(r.options['o6'])return true;
  return false;
}

// toast
const te=document.getElementById('toast');let tt;
function toast(m,t){clearTimeout(tt);te.textContent=m;te.className='toast show '+(t||'');tt=setTimeout(()=>{te.className='toast';},3000);}

// loading
function load(v){document.getElementById('loading-overlay').style.display=v?'flex':'none';}

// firebase
let M=[]; // massages
function init(){
  load(true);
  let n=0;
  function done(){if(++n>=6&&!ready){ready=true;load(false);go(defaultView());live();}}
  db.ref('formules').once('value',s=>{if(!s.val())DEF_FORMULES.forEach(f=>db.ref('formules/'+f.id).set(f));else F=Object.values(s.val());done();});
  db.ref('options').once('value',s=>{if(!s.val())DEF_OPTIONS.forEach(o=>db.ref('options/'+o.id).set(o));else O=Object.values(s.val());done();});
  db.ref('statuts').once('value',s=>{if(!s.val())DEF_STATUTS.forEach(s2=>db.ref('statuts/'+s2.id).set(s2));else S=Object.values(s.val());done();});
  db.ref('taches').once('value',s=>{if(!s.val())DEF_TACHES.forEach(t=>db.ref('taches/'+t.id).set(t));else T=Object.values(s.val());done();});
  db.ref('reservations').once('value',s=>{if(!s.val())samples();else R=Object.entries(s.val()).map(([id,v])=>({...v,id}));done();});
  db.ref('massages').once('value',s=>{M=s.val()?Object.entries(s.val()).map(([id,v])=>({...v,id})):[];done();});
  setTimeout(()=>{if(!ready){ready=true;load(false);go(defaultView());live();}},6000);
}

function live(){
  db.ref('reservations').on('value',s=>{R=s.val()?Object.entries(s.val()).map(([id,v])=>({...v,id})):[];rf();});
  db.ref('formules').on('value',s=>{if(s.val())F=Object.values(s.val());rf();});
  db.ref('options').on('value',s=>{if(s.val())O=Object.values(s.val());rf();});
  db.ref('statuts').on('value',s=>{if(s.val())S=Object.values(s.val());rf();});
  db.ref('taches').on('value',s=>{if(s.val())T=Object.values(s.val());rf();});
  db.ref('massages').on('value',s=>{M=s.val()?Object.entries(s.val()).map(([id,v])=>({...v,id})):[];rf();});
}

function rf(){
  if(view==='dashboard')rDash();
  else if(view==='massage')rMassage();
  else if(view==='all-reservations')rAll();
  else if(view==='calendar')rCal();
  else if(view==='settings')rSettings();
  else if(view==='temps-travail')rTemps();
}

// navigation
const VIEWS=['dashboard','new-reservation','massage','all-reservations','calendar','temps-travail','settings'];
function go(v){
  const p=getProfile();
  if(p&&!(ROLE_VIEWS[p.role]||[]).includes(v))v=defaultView();
  VIEWS.forEach(id=>{const el=document.getElementById('view-'+id);if(el)el.classList.toggle('hidden',id!==v);});
  view=v;
  document.querySelectorAll('.nav-item').forEach(a=>a.classList.toggle('active',a.dataset.view===v));
  if(v==='dashboard')rDash();
  else if(v==='massage')rMassage();
  else if(v==='all-reservations')rAll();
  else if(v==='calendar')rCal();
  else if(v==='settings')rSettings();
  else if(v==='temps-travail')rTemps();
  else if(v==='new-reservation'&&!eid)rForm();
  cSide();
  window.scrollTo(0,0);
}
document.querySelectorAll('[data-view]').forEach(el=>{
  el.addEventListener('click',e=>{e.preventDefault();if(el.dataset.view==='new-reservation')eid=null;go(el.dataset.view);});
});

// sidebar
const sb=document.getElementById('sidebar');
const so=document.createElement('div');so.className='sidebar-overlay';document.body.appendChild(so);
document.getElementById('menu-toggle').addEventListener('click',()=>{sb.classList.toggle('open');so.classList.toggle('show');});
so.addEventListener('click',cSide);
function cSide(){sb.classList.remove('open');so.classList.remove('show');}

// fill status selects
function fStat(){
  [['filter-status','<option value="">Tous les statuts</option>'],
   ['all-filter-status','<option value="">Tous les statuts</option>']
  ].forEach(([id,def])=>{
    const el=document.getElementById(id);if(!el)return;
    const c=el.value;el.innerHTML=def+S.map(s=>'<option value="'+x(s.key)+'">'+x(s.name)+'</option>').join('');el.value=c;
  });
  const ff=document.getElementById('f-statut');if(ff){const c=ff.value;ff.innerHTML=S.map(s=>'<option value="'+x(s.key)+'">'+x(s.name)+'</option>').join('');ff.value=c;}
}

// ── DASHBOARD ─────────────────────────────
document.getElementById('search-input').addEventListener('input',rDash);
document.getElementById('filter-date').addEventListener('change',rDash);
document.getElementById('filter-status').addEventListener('change',rDash);
document.getElementById('btn-clear-filters').addEventListener('click',()=>{
  document.getElementById('search-input').value='';
  document.getElementById('filter-date').value='';
  document.getElementById('filter-status').value='';
  rDash();
});

function rDash(){
  const p=getProfile();
  if(p&&p.role==='massage'){rDashMassage(p.id);return;}
  const pid=(p&&p.role==='menage')?p.id:null;
  fStat();
  const q=document.getElementById('search-input').value.toLowerCase().trim();
  const dt=document.getElementById('filter-date').value;
  const sf=document.getElementById('filter-status').value;
  const base=pid?R.filter(r=>r[pid]):R;
  document.getElementById('stat-total').textContent=base.length;
  document.getElementById('stat-prepare').textContent=base.filter(r=>r.statut===(S[0]||{}).key).length;
  document.getElementById('stat-ready').textContent=base.filter(r=>r.statut===(S[1]||{}).key).length;
  document.getElementById('stat-active').textContent=base.filter(r=>r.statut===(S[2]||{}).key).length;
  let list=[...base].sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0).filter(r=>{
    if(q&&!fn(r).toLowerCase().includes(q)&&!(r.tel||'').includes(q))return false;
    if(dt&&r.date!==dt)return false;
    if(sf&&r.statut!==sf)return false;
    return true;
  });
  const c=document.getElementById('reservation-list');
  if(!list.length){c.innerHTML='<div class="empty-state"><div class="empty-state-icon">🗓</div><p>Aucune réservation trouvée</p></div>';return;}
  c.innerHTML=list.map(r=>{
    const opts=O.filter(o=>r.options&&r.options[o.id]).map(o=>o.emoji).join(' ');
    const badges=(r.rachel?'<span class="rachel-badge">🧴 '+x(labelPerson('rachel'))+'</span>':'')+(r.milla?'<span class="rachel-badge">🧴 '+x(labelPerson('milla'))+'</span>':'');
    return '<div class="resa-row'+((r.rachel||r.milla)?' resa-row-rachel':'')+'">'+ 
      '<div class="resa-row-left">'+
        '<div class="resa-row-name">'+(isBooking(r)?'<span style="color:#1A5F9E;font-weight:700;">':'')+x(fn(r))+(isBooking(r)?'</span>':'')+' <span style="font-size:11px;color:var(--gray-400);">👥 '+(r.nbPersonnes||1)+' pers.</span>'+' '+badges+'</div>'+
        '<div class="resa-row-sub">📅 '+fd(r.date)+' 🕒 '+(r.heure||'—')+(r.tel?' · 📞 '+x(r.tel):'')+' '+x(r.formule)+'</div>'+
      '</div>'+
      '<div class="resa-row-middle">'+
        '<div class="resa-row-options">'+(opts||'—')+' · Solde : <strong>'+sol(r.prix,r.acompte)+' €</strong></div>'+
      '</div>'+
      bdg(r.statut)+
      (p&&p.role==='gerante'?('<div class="resa-row-actions">'+
        '<button class="btn-action edit" data-id="'+r.id+'"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>'+
        '<button class="btn-action del" data-id="'+r.id+'"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>'+
      '</div>'):'')+'</div>';
  }).join('');
  c.querySelectorAll('.btn-action.edit').forEach(b=>b.addEventListener('click',()=>edit(b.dataset.id)));
  c.querySelectorAll('.btn-action.del').forEach(b=>b.addEventListener('click',()=>del(b.dataset.id)));
}

function rDashMassage(pid){
  const p=getProfile();
  const today=new Date().toISOString().split('T')[0];
  const mine=M.filter(m=>m.assignees&&m.assignees[pid]);
  document.getElementById('stat-total').textContent=mine.length;
  document.getElementById('stat-prepare').textContent=mine.filter(m=>m.date>today).length;
  document.getElementById('stat-ready').textContent=mine.filter(m=>m.date===today).length;
  document.getElementById('stat-active').textContent=mine.filter(m=>m.date<today).length;
  const labs=document.querySelectorAll('#view-dashboard .stat-label');
  if(labs.length>=4){labs[0].textContent='Total massages';labs[1].textContent='À venir';labs[2].textContent="Aujourd'hui";labs[3].textContent='Passés';}
  const titleEl=document.querySelector('#view-dashboard .view-header h1');
  if(titleEl)titleEl.textContent='Tableau de bord — '+(p?p.name:'');
  const c=document.getElementById('reservation-list');
  const upcoming=mine.filter(m=>m.date>=today).sort((a,b)=>a.date<b.date?-1:1).slice(0,5);
  if(!upcoming.length){c.innerHTML='<div class="empty-state"><div class="empty-state-icon">💆</div><p>Aucun massage à venir.</p></div>';return;}
  c.innerHTML=upcoming.map(m=>massageStaffCard(m,pid)).join('');
}

// ── FORM ──────────────────────────────────
let eid=null;
const form=document.getElementById('resa-form');

function tInput(id){
  const el=document.getElementById(id);if(!el)return;
  el.addEventListener('input',function(){
    let v=this.value.replace(/\D/g,'').slice(0,4);
    if(v.length>=3)v=v.slice(0,2)+':'+v.slice(2);
    this.value=v;
  });
  el.addEventListener('blur',function(){
    const m=this.value.match(/^(\d{1,2}):?(\d{0,2})$/);
    if(m)this.value=String(Math.min(23,+m[1]||0)).padStart(2,'0')+':'+String(Math.min(59,+m[2]||0)).padStart(2,'0');
  });
}
tInput('f-heure');tInput('f-heure-depart');

document.getElementById('f-prix').addEventListener('input',uSol);
document.getElementById('f-acompte').addEventListener('input',uSol);
function uSol(){document.getElementById('solde-preview').textContent=sol(document.getElementById('f-prix').value,document.getElementById('f-acompte').value)+' €';}

function rForm(){
  eid=null;
  document.getElementById('edit-id').value='';
  document.getElementById('form-title').textContent='Nouvelle réservation';
  form.reset();
  document.getElementById('solde-preview').textContent='0 €';
  fStat();
  document.getElementById('f-formule').innerHTML='<option value="">Choisir une formule</option>'+F.map(f=>'<option value="'+x(f.name)+'">'+f.emoji+' '+x(f.name)+'</option>').join('');
  document.getElementById('options-grid').innerHTML=O.map(o=>'<label class="option-toggle"><input type="checkbox" data-opt="'+o.id+'" /><span class="option-label">'+o.emoji+' '+x(o.name)+'</span></label>').join('');
}

function edit(id){
  const r=R.find(i=>i.id===id);if(!r)return;
  eid=id;
  // Reset form structure without clearing values
  fStat();
  document.getElementById('f-formule').innerHTML='<option value="">Choisir une formule</option>'+F.map(f=>'<option value="'+x(f.name)+'">'+f.emoji+' '+x(f.name)+'</option>').join('');
  document.getElementById('options-grid').innerHTML=O.map(o=>'<label class="option-toggle"><input type="checkbox" data-opt="'+o.id+'" /><span class="option-label">'+o.emoji+' '+x(o.name)+'</span></label>').join('');
  document.getElementById('edit-id').value=id;
  document.getElementById('form-title').textContent='Modifier';
  document.getElementById('f-prenom').value=r.prenom||'';
  document.getElementById('f-nom').value=r.nom||'';
  document.getElementById('f-tel').value=r.tel||'';
  document.getElementById('f-date').value=r.date||'';
  document.getElementById('f-heure').value=r.heure||'';
  document.getElementById('f-date-depart').value=r.dateDepart||'';
  document.getElementById('f-heure-depart').value=r.heureDepart||'';
  document.getElementById('f-formule').value=r.formule||'';
  document.getElementById('f-statut').value=r.statut||'';
  document.getElementById('f-prix').value=r.prix||'';
  document.getElementById('f-acompte').value=r.acompte||'';
  document.getElementById('f-notes').value=r.notes||'';
  document.getElementById('f-nb-personnes').value=r.nbPersonnes||'';
  document.getElementById('f-rachel').checked=!!r.rachel;
  document.getElementById('f-milla').checked=!!r.milla;
  document.querySelectorAll('#options-grid input[data-opt]').forEach(cb=>{cb.checked=!!(r.options&&r.options[cb.dataset.opt]);});
  uSol();
  go('new-reservation');
}

form.addEventListener('submit',function(e){
  e.preventDefault();
  const prenom=document.getElementById('f-prenom').value.trim();
  const nom=document.getElementById('f-nom').value.trim();
  const date=document.getElementById('f-date').value;
  const heure=document.getElementById('f-heure').value;
  const formule=document.getElementById('f-formule').value;
  if((!prenom&&!nom)||!date||!heure||!formule){toast('Champs obligatoires manquants.','error');return;}
  const om={};document.querySelectorAll('#options-grid input[data-opt]').forEach(cb=>{om[cb.dataset.opt]=cb.checked;});
  const ex=eid?R.find(i=>i.id===eid):null;
  const data={prenom,nom,tel:document.getElementById('f-tel').value.trim(),date,heure,
    dateDepart:document.getElementById('f-date-depart').value,heureDepart:document.getElementById('f-heure-depart').value,
    formule,statut:document.getElementById('f-statut').value,options:om,
    prix:parseFloat(document.getElementById('f-prix').value)||0,
    acompte:parseFloat(document.getElementById('f-acompte').value)||0,
    notes:document.getElementById('f-notes').value.trim(),
    rachel:document.getElementById('f-rachel').checked,
    milla:document.getElementById('f-milla').checked,
    checklist:(ex&&ex.checklist)?ex.checklist:{},
    tempsRachel:(ex&&ex.tempsRachel)?ex.tempsRachel:'',
    tempsMilla:(ex&&ex.tempsMilla)?ex.tempsMilla:'',
    createdAt:ex?ex.createdAt:Date.now()
  };
  // Check fermeture overlap
  var checkD = date;
  var checkH = heure || '00:00';
  var checkDDep = document.getElementById('f-date-depart').value || checkD;
  var checkHDep = document.getElementById('f-heure-depart').value || '23:59';
  var blocked = false;
  var cur2 = new Date(checkD+'T12:00:00');
  var end2 = new Date(checkDDep+'T12:00:00');
  while(cur2 <= end2 && !blocked){
    var ds2 = cur2.toISOString().split('T')[0];
    var f2 = getFermeture(ds2);
    if(f2){
      var rS = ds2===checkD ? checkH : '00:00';
      var rE = ds2===checkDDep ? checkHDep : '23:59';
      var fS = f2.heureDebut || '00:00';
      var fE = f2.heureFin || '23:59';
      if(rS < fE && rE > fS){
        toast('Impossible — chambre fermée le '+fd(ds2)+' de '+fS+' à '+fE+' ('+x(f2.motif||'Fermé')+').','error');
        blocked = true;
      }
    }
    cur2.setDate(cur2.getDate()+1);
  }
  if(blocked) return;

  const ref=eid?db.ref('reservations/'+eid):db.ref('reservations').push();
  ref.set(data).then(()=>{
    toast(eid?'Mise à jour ✓':'Enregistrée ✓','success');eid=null;
    var mv=document.querySelector('meta[name=viewport]');if(mv)mv.setAttribute('content','width=device-width,initial-scale=1,maximum-scale=1');
    setTimeout(function(){if(mv)mv.setAttribute('content','width=device-width,initial-scale=1');},300);
    go('dashboard');
  }).catch(()=>toast('Erreur.','error'));
});

// delete
const dm=document.getElementById('modal-overlay');let pd=null;
function del(id){pd=id;dm.classList.remove('hidden');}
document.getElementById('modal-cancel').addEventListener('click',()=>{pd=null;dm.classList.add('hidden');});
document.getElementById('modal-confirm').addEventListener('click',()=>{
  if(pd)db.ref('reservations/'+pd).remove().then(()=>toast('Supprimée.','')).catch(()=>toast('Erreur.','error'));
  pd=null;dm.classList.add('hidden');
});
dm.addEventListener('click',e=>{if(e.target===dm){pd=null;dm.classList.add('hidden');}});

// ── CARD HTML ─────────────────────────────
function tempsField(pid){return 'temps'+cap(pid);}
function card(r,pid){
  const cl=r.checklist||{};
  const ao=O.filter(o=>r.options&&r.options[o.id]);
  const opH=ao.length?ao.map(o=>'<span class="option-pill yes">'+x(o.emoji)+' '+x(o.name)+'</span>').join(''):'<span style="color:var(--gray-400);font-size:13px;">Aucune option</span>';
  const ti=[...T.map(t=>({key:'t_'+t.id,lbl:(t.emoji||'')+' '+t.name})),...ao.map(o=>({key:'o_'+o.id,lbl:(o.emoji||'')+' '+o.name}))];
  const tH=ti.length?ti.map(t=>'<button class="checklist-item '+(cl[t.key]?'checked':'')+'" data-id="'+r.id+'" data-key="'+t.key+'" type="button"><span class="check-box"></span>'+t.lbl+'</button>').join(''):'<span style="color:var(--gray-400);font-size:13px;">Aucune tâche</span>';
  const d=dur(r.date,r.heure,r.dateDepart,r.heureDepart);
  const ip=r.statut==='chambre-prete';
  const badges=(r.rachel?'<span class="rachel-badge">🧴 '+x(labelPerson('rachel'))+'</span>':'')+(r.milla?'<span class="rachel-badge">🧴 '+x(labelPerson('milla'))+'</span>':'');
  const highlighted=pid?r[pid]:(r.rachel||r.milla);
  let tempsHTML='';
  if(pid){
    const fld=tempsField(pid);
    tempsHTML='<div class="temps-travail-wrap"><label class="temps-travail-label">⏱ Temps de travail</label><input type="text" class="temps-travail-input" data-id="'+r.id+'" data-field="'+fld+'" value="'+x(r[fld]||'')+'" placeholder="1h30" maxlength="6" /></div>';
  } else {
    const parts=[];
    if(r.rachel)parts.push('<div class="temps-travail-wrap"><label class="temps-travail-label">⏱ Rachel</label><input type="text" class="temps-travail-input" data-id="'+r.id+'" data-field="tempsRachel" value="'+x(r.tempsRachel||'')+'" placeholder="1h30" maxlength="6" /></div>');
    if(r.milla)parts.push('<div class="temps-travail-wrap"><label class="temps-travail-label">⏱ Milla</label><input type="text" class="temps-travail-input" data-id="'+r.id+'" data-field="tempsMilla" value="'+x(r.tempsMilla||'')+'" placeholder="1h30" maxlength="6" /></div>');
    tempsHTML=parts.join('');
  }
  return '<div class="rachel-card'+(highlighted?' rachel-card-highlighted':'')+'" data-id="'+r.id+'">'+
    '<div class="rachel-card-header">'+
      '<div class="rachel-card-client">'+
        '<div class="rachel-client-name">'+(isBooking(r)?'<span style="color:#1A5F9E;font-weight:700;">':'')+x(fn(r))+(isBooking(r)?'</span>':'')+' <span style="font-size:11px;color:var(--gray-400);">👥 '+(r.nbPersonnes||1)+' pers.</span>'+' '+badges+'</div>'+
        (r.tel?'<div class="rachel-client-tel">📞 '+x(r.tel)+'</div>':'')+
      '</div>'+
      '<div class="rachel-card-status">'+bdg(r.statut)+'</div>'+
    '</div>'+
    '<div class="rachel-card-info">'+
      '<div class="rachel-info-item"><div class="rachel-info-icon">📅</div><div><span class="rachel-info-label">Arrivée</span><span class="rachel-info-value">'+fd(r.date)+(r.heure?' · '+r.heure:'')+'</span></div></div>'+
      '<div class="rachel-info-item"><div class="rachel-info-icon">🚪</div><div><span class="rachel-info-label">Départ</span><span class="rachel-info-value">'+(r.dateDepart?fd(r.dateDepart)+(r.heureDepart?' · '+r.heureDepart:''):'—')+'</span></div></div>'+
      (d?'<div class="rachel-info-item"><div class="rachel-info-icon">⏱</div><div><span class="rachel-info-label">Durée</span><span class="rachel-info-value">'+d+'</span></div></div>':'')+
      '<div class="rachel-info-item"><div class="rachel-info-icon">🛏</div><div><span class="rachel-info-label">Formule</span><span class="rachel-info-value">'+x(r.formule)+'</span></div></div>'+
    '</div>'+
    '<div class="rachel-options"><span class="rachel-options-label">Préparatifs :</span>'+opH+'</div>'+
    '<div class="rachel-payment">'+
      '<div class="rachel-pay-item"><span class="rachel-pay-label">Prix</span><span class="rachel-pay-value">'+(r.prix||0)+' €</span></div>'+
      '<div class="rachel-pay-item"><span class="rachel-pay-label">Acompte</span><span class="rachel-pay-value">'+(r.acompte||0)+' €</span></div>'+
      '<div class="rachel-pay-item"><span class="rachel-pay-label">💰 Solde</span><span class="rachel-pay-value solde-amount">'+sol(r.prix,r.acompte)+' €</span></div>'+
    '</div>'+
    (r.notes?'<div class="rachel-notes"><span class="rachel-notes-icon">📝</span><span class="rachel-notes-text">'+x(r.notes)+'</span></div>':'')+
    '<div class="rachel-checklist"><span class="rachel-checklist-label">Tâches</span>'+tH+'</div>'+
    '<div class="chambre-prete-footer">'+
      '<button class="btn btn-ghost btn-rachel-edit" data-id="'+r.id+'" type="button">✏️ Modifier</button>'+
      tempsHTML+
      '<button class="checklist-item chambre-prete-btn '+(ip?'checked':'')+'" data-id="'+r.id+'" data-key="chambre_prete" data-pid="'+(pid||'')+'" type="button"><span class="check-box"></span>✓ Chambre prête</button>'+
    '</div>'+
  '</div>';
}

function bind(c,pid){
  c.querySelectorAll('.checklist-item').forEach(b=>{
    b.addEventListener('click',()=>{
      const r=R.find(i=>i.id===b.dataset.id);if(!r)return;
      if(b.dataset.key==='chambre_prete'){
        if(r.statut!=='chambre-prete'){
          const cardEl=b.closest('.rachel-card');
          const bpid=b.dataset.pid||'';
          let missing=false,focusInp=null;
          function checkField(fld){
            const inp=cardEl?cardEl.querySelector('.temps-travail-input[data-field="'+fld+'"]'):null;
            const val=inp?inp.value.trim():(r[fld]||'');
            if(!val){missing=true;focusInp=inp;}
          }
          if(bpid){checkField(tempsField(bpid));}
          else{
            if(r.rachel)checkField('tempsRachel');
            if(!missing&&r.milla)checkField('tempsMilla');
          }
          if(missing){
            toast('Saisis le temps de travail ⏱','error');
            if(focusInp){focusInp.focus();focusInp.style.borderColor='var(--red)';}
            return;
          }
          const updates={};
          if(cardEl)cardEl.querySelectorAll('.temps-travail-input').forEach(inp=>{if(inp.value.trim())updates['reservations/'+r.id+'/'+inp.dataset.field]=inp.value.trim();});
          updates['reservations/'+r.id+'/statut']='chambre-prete';
          Promise.all(Object.entries(updates).map(([path,val])=>db.ref(path).set(val)))
            .then(()=>{toast('Chambre prête ✓','success');rf();}).catch(()=>toast('Erreur.','error'));
        } else {
          db.ref('reservations/'+r.id+'/statut').set('a-preparer').then(()=>{toast('Remis à préparer','');rf();}).catch(()=>toast('Erreur.','error'));
        }
        return;
      }
      const nv=!(r.checklist&&r.checklist[b.dataset.key]);
      db.ref('reservations/'+r.id+'/checklist/'+b.dataset.key).set(nv).then(()=>b.classList.toggle('checked',nv)).catch(()=>toast('Erreur.','error'));
    });
  });
  c.querySelectorAll('.temps-travail-input').forEach(inp=>{
    inp.addEventListener('blur',function(){
      if(!this.value.trim())return;
      db.ref('reservations/'+this.dataset.id+'/'+this.dataset.field).set(this.value.trim()).then(()=>toast('Temps enregistré ✓','success')).catch(()=>toast('Erreur.','error'));
    });
  });
  c.querySelectorAll('.btn-rachel-edit').forEach(b=>b.addEventListener('click',()=>edit(b.dataset.id)));
}

// ── VUE MASSAGE ────────────────────────────
const MASSAGE_PEOPLE=[...MASSEUSES,'jennifer'];
function renderMfAssignees(){
  document.getElementById('mf-assignees').innerHTML=MASSAGE_PEOPLE.map(id=>'<label class="option-toggle"><input type="checkbox" data-masseuse="'+id+'" /><span class="option-label">'+(id==='jennifer'?'⭐':'💆')+' '+x(labelPerson(id))+'</span></label>').join('');
}
tInput('mf-heure');

function massageCoAssignees(m,excludePid){
  return Object.keys(m.assignees||{}).filter(id=>m.assignees[id]&&id!==excludePid).map(labelPerson);
}

function massageGeranteCard(m){
  const co=Object.keys(m.assignees||{}).filter(id=>m.assignees[id]).map(labelPerson);
  return '<div class="rachel-card massage-card" data-id="'+m.id+'">'+
    '<div class="rachel-card-header">'+
      '<div class="rachel-card-client"><div class="rachel-client-name">'+x(m.titre||'Massage')+'</div>'+
      '<div class="rachel-client-tel">📅 '+fd(m.date)+' · '+x(m.heureDebut||'')+(m.duree?' · ⏱ '+x(m.duree):'')+(m.rythme?' · '+x(m.rythme):'')+'</div>'+
      '<div class="rachel-client-tel">👥 '+(m.nbPersonnes||1)+' pers. — '+(co.join(', ')||'Personne assignée')+'</div></div>'+
    '</div>'+
    (m.notes?'<div class="rachel-notes"><span class="rachel-notes-icon">📝</span><span class="rachel-notes-text">'+x(m.notes)+'</span></div>':'')+
    '<div class="chambre-prete-footer">'+
      '<button class="btn btn-ghost btn-massage-edit" data-id="'+m.id+'" type="button">✏️ Modifier</button>'+
      '<button class="btn btn-ghost btn-massage-del" data-id="'+m.id+'" type="button" style="color:var(--red);">🗑 Supprimer</button>'+
    '</div>'+
  '</div>';
}

function rMassageGerante(){
  const c=document.getElementById('massage-gerante-list');
  const today=new Date().toISOString().split('T')[0];
  let list=[...M].filter(m=>m.date>=today).sort((a,b)=>a.date===b.date?(a.heureDebut<b.heureDebut?-1:1):(a.date<b.date?-1:1));
  if(!list.length){c.innerHTML='<div class="empty-state"><div class="empty-state-icon">💆</div><p>Aucun massage programmé.</p></div>';return;}
  c.innerHTML=list.map(massageGeranteCard).join('');
  c.querySelectorAll('.btn-massage-edit').forEach(b=>b.addEventListener('click',()=>editMassage(b.dataset.id)));
  c.querySelectorAll('.btn-massage-del').forEach(b=>b.addEventListener('click',()=>{
    if(!confirm('Supprimer ce massage ?'))return;
    db.ref('massages/'+b.dataset.id).remove().then(()=>toast('Supprimé.','')).catch(()=>toast('Erreur.','error'));
  }));
}

function massageStaffCard(m,pid){
  const co=massageCoAssignees(m,pid);
  return '<div class="rachel-card massage-card" data-id="'+m.id+'">'+
    '<div class="rachel-card-header">'+
      '<div class="rachel-card-client"><div class="rachel-client-name">'+x(m.titre||'Massage')+'</div></div>'+
    '</div>'+
    '<div class="rachel-card-info">'+
      '<div class="rachel-info-item"><div class="rachel-info-icon">📅</div><div><span class="rachel-info-label">Date</span><span class="rachel-info-value">'+fd(m.date)+' · '+x(m.heureDebut||'')+'</span></div></div>'+
      (m.duree?'<div class="rachel-info-item"><div class="rachel-info-icon">⏱</div><div><span class="rachel-info-label">Durée</span><span class="rachel-info-value">'+x(m.duree)+'</span></div></div>':'')+
      (m.rythme?'<div class="rachel-info-item"><div class="rachel-info-icon">🎵</div><div><span class="rachel-info-label">Rythme</span><span class="rachel-info-value">'+x(m.rythme)+'</span></div></div>':'')+
      '<div class="rachel-info-item"><div class="rachel-info-icon">👥</div><div><span class="rachel-info-label">Personnes</span><span class="rachel-info-value">'+(m.nbPersonnes||1)+'</span></div></div>'+
      '<div class="rachel-info-item"><div class="rachel-info-icon">🤝</div><div><span class="rachel-info-label">Avec</span><span class="rachel-info-value">'+(co.length?x(co.join(', ')):'Seule')+'</span></div></div>'+
    '</div>'+
    (m.notes?'<div class="rachel-notes"><span class="rachel-notes-icon">📝</span><span class="rachel-notes-text">'+x(m.notes)+'</span></div>':'')+
  '</div>';
}

document.querySelectorAll('#massage-tabs .tab-btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#massage-tabs .tab-btn').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');rMassageStaff();
}));

function rMassageStaff(){
  const p=getProfile();if(!p)return;
  const pid=p.id;
  const title=document.getElementById('massage-staff-title');
  if(title)title.textContent='Mes massages — '+p.name;
  const tabBtn=document.querySelector('#massage-tabs .tab-btn.active');
  const tabVal=tabBtn?tabBtn.dataset.tab:'avenir';
  const today=new Date().toISOString().split('T')[0];
  const c=document.getElementById('massage-staff-cards');
  let list=[...M].filter(m=>m.assignees&&m.assignees[pid]);
  list=list.filter(m=>tabVal==='avenir'?(m.date>=today):(m.date<today));
  list.sort((a,b)=>tabVal==='avenir'?(a.date<b.date?-1:1):(a.date>b.date?-1:1));
  if(!list.length){c.innerHTML='<div class="empty-state"><div class="empty-state-icon">💆</div><p>Aucun massage.</p></div>';return;}
  c.innerHTML=list.map(m=>massageStaffCard(m,pid)).join('');
}

function rMassage(){
  const p=getProfile();
  if(p&&p.role==='massage')rMassageStaff();
  else rMassageGerante();
}

let mfEditId=null;
function resetMassageForm(){
  mfEditId=null;
  document.getElementById('mf-edit-id').value='';
  document.getElementById('massage-form').reset();
  document.querySelectorAll('#mf-assignees input[data-masseuse]').forEach(cb=>cb.checked=false);
}
document.getElementById('mf-cancel').addEventListener('click',resetMassageForm);

function editMassage(id){
  const m=M.find(i=>i.id===id);if(!m)return;
  mfEditId=id;
  document.getElementById('mf-edit-id').value=id;
  document.getElementById('mf-titre').value=m.titre||'';
  document.getElementById('mf-date').value=m.date||'';
  document.getElementById('mf-heure').value=m.heureDebut||'';
  document.getElementById('mf-duree').value=m.duree||'';
  document.getElementById('mf-rythme').value=m.rythme||'';
  document.getElementById('mf-nb').value=m.nbPersonnes||1;
  document.getElementById('mf-notes').value=m.notes||'';
  document.querySelectorAll('#mf-assignees input[data-masseuse]').forEach(cb=>{cb.checked=!!(m.assignees&&m.assignees[cb.dataset.masseuse]);});
  window.scrollTo(0,0);
}

document.getElementById('massage-form').addEventListener('submit',function(e){
  e.preventDefault();
  const titre=document.getElementById('mf-titre').value.trim();
  const date=document.getElementById('mf-date').value;
  const heureDebut=document.getElementById('mf-heure').value;
  const duree=document.getElementById('mf-duree').value.trim();
  const rythme=document.getElementById('mf-rythme').value;
  const nbPersonnes=parseInt(document.getElementById('mf-nb').value)||1;
  const assignees={};
  document.querySelectorAll('#mf-assignees input[data-masseuse]').forEach(cb=>{if(cb.checked)assignees[cb.dataset.masseuse]=true;});
  if(!titre||!date||!heureDebut||!Object.keys(assignees).length){toast('Titre, date, heure et au moins une personne assignée sont requis.','error');return;}
  const data={titre,date,heureDebut,duree,rythme,nbPersonnes,assignees,notes:document.getElementById('mf-notes').value.trim(),createdAt:mfEditId?(M.find(i=>i.id===mfEditId)||{}).createdAt||Date.now():Date.now()};
  const ref=mfEditId?db.ref('massages/'+mfEditId):db.ref('massages').push();
  ref.set(data).then(()=>{toast(mfEditId?'Mise à jour ✓':'Enregistré ✓','success');resetMassageForm();}).catch(()=>toast('Erreur.','error'));
});

// ── TOUTES LES RÉSERVATIONS ───────────────
document.getElementById('all-filter-status').addEventListener('change',rAll);
document.querySelectorAll('#all-tabs .tab-btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#all-tabs .tab-btn').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');rAll();
}));

function rAll(){
  const p=getProfile();
  const pid=(p&&p.role==='menage')?p.id:null;
  const sel=document.getElementById('all-filter-status');
  const cur=sel.value;
  sel.innerHTML='<option value="">Tous les statuts</option>'+S.map(s=>'<option value="'+x(s.key)+'">'+x(s.name)+'</option>').join('');
  sel.value=cur;
  const sf=sel.value;
  const tabBtn=document.querySelector('#all-tabs .tab-btn.active');
  const tabVal=tabBtn?tabBtn.dataset.tab:'avenir';
  const today=new Date().toISOString().split('T')[0];
  const title=document.getElementById('all-view-title');
  if(title)title.textContent=pid?('Mes réservations — '+labelPerson(pid)):'Toutes les réservations';
  const c=document.getElementById('all-cards');
  let list=[...R].filter(r=>pid?r[pid]:true);
  list=list.filter(r=>tabVal==='avenir'?(r.date>=today):(r.date<today));
  list.sort((a,b)=>tabVal==='avenir'?(a.date<b.date?-1:1):(a.date>b.date?-1:1));
  if(sf)list=list.filter(r=>r.statut===sf);
  if(!list.length){c.innerHTML='<div class="empty-state"><div class="empty-state-icon">🗓</div><p>Aucune réservation</p></div>';return;}
  c.innerHTML=list.map(r=>card(r,pid)).join('');
  bind(c,pid);
}

// ── FERMETURES ────────────────────────────
function isFerme(dateStr){
  return FERM.some(function(f){return dateStr >= f.dateDebut && dateStr <= f.dateFin;});
}

function getFermeture(dateStr){
  return FERM.find(function(f){return dateStr >= f.dateDebut && dateStr <= f.dateFin;});
}

// Returns 'full', 'matin' (00:00-12:00), 'soir' (12:00-23:59), or null
function getFermType(dateStr){
  var f = getFermeture(dateStr);
  if(!f) return null;
  var hD = f.heureDebut || '00:00';
  var hF = f.heureFin   || '23:59';
  // Single day fermeture
  if(f.dateDebut === f.dateFin){
    if(hD <= '06:00' && hF >= '22:00') return {type:'full', motif:f.motif, f:f};
    if(hF <= '13:00') return {type:'matin', motif:f.motif, f:f};
    if(hD >= '12:00') return {type:'soir', motif:f.motif, f:f};
    return {type:'full', motif:f.motif, f:f};
  }
  // Multi-day: first day = soir if starts after noon, last day = matin if ends before noon
  if(dateStr === f.dateDebut && hD >= '12:00') return {type:'soir', motif:f.motif, f:f};
  if(dateStr === f.dateFin   && hF <= '13:00') return {type:'matin', motif:f.motif, f:f};
  return {type:'full', motif:f.motif, f:f};
}

function showFermetureModal(){
  var existing = document.getElementById('ferm-modal');
  if(existing) existing.remove();
  var m = document.createElement('div');
  m.id = 'ferm-modal';
  m.className = 'modal-overlay';
  m.innerHTML = '<div class="modal" style="max-width:420px;">'+
    '<h2 class="modal-title" style="color:var(--red);">Fermer la chambre</h2>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">'+
      '<div class="form-group"><label>Date début</label><input type="date" id="ferm-debut" style="height:40px;width:100%;padding:0 8px;border:1px solid var(--gray-200);border-radius:var(--radius-md);" /></div>'+
      '<div class="form-group"><label>Heure début</label><input type="text" id="ferm-heure-debut" placeholder="08:00" maxlength="5" style="height:40px;width:100%;padding:0 8px;border:1px solid var(--gray-200);border-radius:var(--radius-md);text-align:center;" /></div>'+
    '</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">'+
      '<div class="form-group"><label>Date fin</label><input type="date" id="ferm-fin" style="height:40px;width:100%;padding:0 8px;border:1px solid var(--gray-200);border-radius:var(--radius-md);" /></div>'+
      '<div class="form-group"><label>Heure fin</label><input type="text" id="ferm-heure-fin" placeholder="20:00" maxlength="5" style="height:40px;width:100%;padding:0 8px;border:1px solid var(--gray-200);border-radius:var(--radius-md);text-align:center;" /></div>'+
    '</div>'+
    '<div class="form-group" style="margin-bottom:20px;">'+
      '<label>Motif</label>'+
      '<input type="text" id="ferm-motif" placeholder="Travaux, indisponibilité..." style="height:40px;width:100%;padding:0 12px;border:1px solid var(--gray-200);border-radius:var(--radius-md);" />'+
    '</div>'+
    '<div class="modal-actions">'+
      '<button class="btn btn-ghost" id="ferm-cancel">Annuler</button>'+
      '<button class="btn btn-danger" id="ferm-save">Fermer la chambre</button>'+
    '</div>'+
  '</div>';
  document.body.appendChild(m);

  document.getElementById('ferm-cancel').addEventListener('click',function(){m.remove();});
  m.addEventListener('mousedown',function(e){if(e.target===m)m.remove();});

  document.getElementById('ferm-save').addEventListener('click',function(){
    var debut = document.getElementById('ferm-debut').value;
    var fin   = document.getElementById('ferm-fin').value;
    var heureDebut = document.getElementById('ferm-heure-debut').value || '00:00';
    var heureFin   = document.getElementById('ferm-heure-fin').value   || '23:59';
    var motif = document.getElementById('ferm-motif').value.trim();
    if(!debut||!fin){toast('Dates obligatoires.','error');return;}
    if(fin < debut){toast('La date de fin doit être après le début.','error');return;}

    // Check overlap with existing reservations (hour-precise)
    var conflict = null;
    for(var ri=0;ri<R.length;ri++){
      var r=R[ri];
      if(!r.date)continue;
      var rDep=r.dateDepart||r.date;
      // Quick date range check
      if(rDep < debut || r.date > fin) continue;
      // For each overlapping day, check hour overlap
      var dCheck=new Date(debut+'T12:00:00');
      var dEnd2=new Date(fin+'T12:00:00');
      var found=false;
      while(dCheck<=dEnd2&&!found){
        var ds3=dCheck.toISOString().split('T')[0];
        // Is this day part of the reservation?
        if(ds3 >= r.date && ds3 <= rDep){
          // Hours of reservation on this day
          var rS3 = ds3===r.date ? (r.heure||'00:00') : '00:00';
          var rE3 = ds3===rDep ? (r.heureDepart||'23:59') : '23:59';
          // Hours of fermeture on this day
          var fS3 = ds3===debut ? (heureDebut||'00:00') : '00:00';
          var fE3 = ds3===fin   ? (heureFin||'23:59')   : '23:59';
          // True overlap: start1 < end2 AND start2 < end1
          if(rS3 < fE3 && fS3 < rE3){
            conflict=r; found=true;
          }
        }
        dCheck.setDate(dCheck.getDate()+1);
      }
      if(conflict)break;
    }
    if(conflict){
      var msg2='Impossible — '+x(fn(conflict))+' a une réservation';
      if(conflict.heure) msg2+=' de '+conflict.heure+(conflict.heureDepart?' à '+conflict.heureDepart:'');
      toast(msg2+'. Vous ne pouvez pas fermer ce créneau.','error');
      return;
    }

    db.ref('fermetures').push({
        dateDebut:debut, dateFin:fin,
        heureDebut:heureDebut, heureFin:heureFin,
        motif:motif||'Fermé', createdAt:Date.now()
      }).then(function(){
        // Reload fermetures then refresh calendar
        db.ref('fermetures').once('value',function(s){
          FERM=s.val()?Object.values(s.val()):[];
          toast('Chambre fermée du '+fd(debut)+' au '+fd(fin),'success');
          m.remove();
          rCal();
        });
      }).catch(function(){toast('Erreur.','error');});
  });
}

// ── CALENDRIER ────────────────────────────
let cY=new Date().getFullYear(),cM=new Date().getMonth();
const MFR=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DFR=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

document.getElementById('cal-prev').addEventListener('click',()=>{cM--;if(cM<0){cM=11;cY--;}rCal();});
document.getElementById('cal-next').addEventListener('click',()=>{cM++;if(cM>11){cM=0;cY++;}rCal();});
document.getElementById('cal-detail-close').addEventListener('click',()=>{document.getElementById('cal-detail').style.display='none';});

function rCal(){
  const p=getProfile();
  const pid=(p&&p.role==='menage')?p.id:null;
  const showReservations=!(p&&p.role==='massage');
  const Rf=pid?R.filter(r=>r[pid]):(showReservations?R:[]);
  const mpid=(p&&p.role==='massage')?p.id:null;
  const Mf=mpid?M.filter(m=>m.assignees&&m.assignees[mpid]):((p&&p.role==='gerante')?M:[]);
  document.getElementById('cal-month-label').textContent=MFR[cM]+' '+cY;
  // Bind fermer chambre buttons (static in HTML)
  var fbH = document.getElementById('btn-fermer-chambre-header');
  var fbM = document.getElementById('btn-fermer-chambre-mobile');
  if(fbH && !fbH.dataset.bound){ fbH.addEventListener('click',showFermetureModal); fbH.dataset.bound='1'; }
  if(fbM && !fbM.dataset.bound){ fbM.addEventListener('click',showFermetureModal); fbM.dataset.bound='1'; }
  const g=document.getElementById('calendar-grid');
  const td=new Date();
  let sw=new Date(cY,cM,1).getDay();sw=sw===0?6:sw-1;
  const dm=new Date(cY,cM+1,0).getDate(),dp=new Date(cY,cM,0).getDate();
  const bd={};
  Rf.forEach(r=>{
    if(!r.date)return;
    const s=new Date(r.date+'T12:00:00'),e=r.dateDepart?new Date(r.dateDepart+'T12:00:00'):s,c=new Date(s);
    while(c<=e){
      const cy=c.getFullYear(),cm=c.getMonth(),cd=c.getDate();
      if(cy===cY&&cm===cM){const ds=cy+'-'+String(cm+1).padStart(2,'0')+'-'+String(cd).padStart(2,'0');if(!bd[ds])bd[ds]=[];if(!bd[ds].find(i=>i.id===r.id))bd[ds].push(r);}
      c.setDate(c.getDate()+1);
    }
  });
  const bdm={};
  Mf.forEach(m=>{
    if(!m.date)return;
    const dt2=new Date(m.date+'T12:00:00');
    if(dt2.getFullYear()===cY&&dt2.getMonth()===cM){const ds=m.date;if(!bdm[ds])bdm[ds]=[];bdm[ds].push(m);}
  });
  let h='<div class="cal-days-header">'+DFR.map(d=>'<div class="cal-day-name">'+d+'</div>').join('')+'</div><div class="cal-cells">';
  for(let i=0;i<sw;i++)h+='<div class="cal-cell other-month"><div class="cal-cell-num">'+(dp-sw+1+i)+'</div></div>';
  for(let d=1;d<=dm;d++){
    const it=d===td.getDate()&&cM===td.getMonth()&&cY===td.getFullYear();
    const ds=cY+'-'+String(cM+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const dr=bd[ds]||[];
    const dmg=bdm[ds]||[];
    const ev=dr.slice(0,3).map(r=>{
      const iS=r.date===ds,iE=(r.dateDepart||r.date)===ds;
      const rc=(r.rachel||r.milla)?' rachel-bar':'';
      const bc=isBooking(r)?' booking-bar':'';
      const cls='cal-bar-event '+r.statut+(iS?' bar-start':'')+(iE?' bar-end':'')+((!iS&&!iE)?' bar-mid':'')+rc+bc;
      var label='';
      if(iS){
        var nom=(r.prenom||r.nom||'?').split(' ')[0];
        label=isBooking(r)?'<span style="color:#fff;font-weight:700;">'+x(nom)+'</span> '+(r.heure||''):x(nom)+' '+(r.heure||'');
      }
      return '<div class="'+cls+'">'+label+'</div>';
    }).join('');
    const evM=dmg.slice(0,2).map(m=>{
      const names=Object.keys(m.assignees||{}).filter(id=>m.assignees[id]).map(id=>labelPerson(id).split(' ')[0]).join('+');
      return '<div class="cal-bar-event massage-bar">💆 '+x(m.heureDebut||'')+' '+x(names)+'</div>';
    }).join('');
    var ft=getFermType(ds);
    var fermStyle='';
    if(ft){
      var pStart=timeToPercent(ft.f&&ft.f.heureDebut?ft.f.heureDebut:'00:00');
      var pEnd=timeToPercent(ft.f&&ft.f.heureFin?ft.f.heureFin:'23:59');
      if(pStart<=2&&pEnd>=98){
        fermStyle='background:rgba(184,48,48,0.75);';
      } else {
        fermStyle='background:linear-gradient(to bottom,transparent '+pStart+'%,rgba(184,48,48,0.65) '+pStart+'%,rgba(184,48,48,0.65) '+pEnd+'%,transparent '+pEnd+'%);';
      }
    }
    var fermLabel='';
    if(ft){
      var fHD2=ft.f&&ft.f.heureDebut?ft.f.heureDebut:'00:00';
      var fHF2=ft.f&&ft.f.heureFin?ft.f.heureFin:'23:59';
      var heureLabel='';
      if(ds===ft.f.dateDebut&&ds===ft.f.dateFin){
        heureLabel=fmtHeure(fHD2)+' - '+fmtHeure(fHF2);
      } else if(ds===ft.f.dateDebut){
        heureLabel='dès '+fmtHeure(fHD2);
      } else if(ds===ft.f.dateFin){
        heureLabel="jusqu'à "+fmtHeure(fHF2);
      }
      fermLabel='<div class="cal-ferme-label" style="color:#7A1010;font-weight:800;font-size:10px;background:rgba(255,255,255,0.7);padding:1px 3px;border-radius:3px;display:inline-block;margin-top:2px;">Fermé'+( heureLabel?' '+heureLabel:'')+'</div>';
    }
    h+='<div class="cal-cell'+(it?' today':'')+'" data-date="'+ds+'" data-ferme="'+( ft?'1':'0')+'" style="'+fermStyle+'"><div class="cal-cell-num" style="'+( ft&&ft.type==='full'?'color:#fff;font-weight:700;':'')+'">'+d+'</div>'+fermLabel+ev+evM+(dr.length>3?'<div style="font-size:9px;color:var(--gray-400);">+'+(dr.length-3)+'</div>':'')+(dmg.length>2?'<div style="font-size:9px;color:var(--green);">+'+(dmg.length-2)+' 💆</div>':'')+'</div>';
  }
  const rem=(7-((sw+dm)%7))%7;for(let i=1;i<=rem;i++)h+='<div class="cal-cell other-month"><div class="cal-cell-num">'+i+'</div></div>';
  g.innerHTML=h+'</div>';
  g.querySelectorAll('.cal-cell[data-date]').forEach(c=>c.addEventListener('click',function(){
    var ftClick=getFermType(c.dataset.date);
    if(ftClick){
      var f=ftClick.f;
      var dl=document.getElementById('cal-detail-list');
      document.getElementById('cal-detail-date').textContent='Fermeture — '+fd(c.dataset.date);
      var fHD3=f&&f.heureDebut?f.heureDebut:'00:00';
      var fHF3=f&&f.heureFin?f.heureFin:'23:59';
      var periode3='Du '+( f?fd(f.dateDebut):'—')+' à '+fmtHeure(fHD3)+' au '+(f?fd(f.dateFin):'—')+' à '+fmtHeure(fHF3);
      dl.innerHTML='<div style="padding:16px;background:var(--red-bg);border-radius:var(--radius-md);border:1px solid var(--red);">'+
        '<div style="font-size:16px;font-weight:700;color:var(--red);">Chambre fermée</div>'+
        '<div style="font-size:14px;color:var(--gray-700);margin-top:6px;">Motif : '+(f?x(f.motif):'—')+'</div>'+
        '<div style="font-size:13px;color:var(--gray-500);margin-top:4px;">'+periode3+'</div>'+
        '<button class="btn btn-danger" style="margin-top:14px;" id="btn-remove-ferm">Ouvrir la chambre</button>'+
      '</div>';
      document.getElementById('cal-detail').style.display='block';
      document.getElementById('btn-remove-ferm').addEventListener('click',function(){
        if(!f||!f._key){
          // Find key
          db.ref('fermetures').once('value',function(snap){
            if(!snap.val())return;
            Object.entries(snap.val()).forEach(function(e){
              if(e[1].dateDebut===f.dateDebut&&e[1].dateFin===f.dateFin){
                db.ref('fermetures/'+e[0]).remove().then(function(){
                  FERM=FERM.filter(function(fm){return !(fm.dateDebut===f.dateDebut&&fm.dateFin===f.dateFin);});
                  toast('Chambre ouverte ✓','success');
                  document.getElementById('cal-detail').style.display='none';
                  rCal();
                });
              }
            });
          });
        }
      });
    } else {
      cDetail(c.dataset.date);
    }
  }));
}

function cDetail(ds){
  const p=getProfile();
  const pid=(p&&p.role==='menage')?p.id:null;
  const showR=!(p&&p.role==='massage');
  const dr=(showR?R:[]).filter(r=>r.date&&ds>=r.date&&ds<=(r.dateDepart||r.date)&&(pid?r[pid]:true)).sort((a,b)=>a.heure<b.heure?-1:1);
  const mpid=(p&&p.role==='massage')?p.id:null;
  const dmg=M.filter(m=>m.date===ds&&(mpid?(m.assignees&&m.assignees[mpid]):(p&&p.role==='gerante')));
  document.getElementById('cal-detail-date').textContent=(p&&p.role==='massage'?'Massages du ':'Réservations du ')+fd(ds);
  const dl=document.getElementById('cal-detail-list');
  let html='';
  if(dr.length){
    html+=dr.map(r=>'<div class="resa-row" style="margin-bottom:8px;"><div class="resa-row-left"><div class="resa-row-name">'+x(fn(r))+'</div><div class="resa-row-sub">🕒 '+(r.heure||'—')+' · '+x(r.formule)+'</div></div>'+bdg(r.statut)+((!p||p.role==='gerante')?('<div class="resa-row-actions"><button class="btn-action edit" data-id="'+r.id+'"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></div>'):'')+'</div>').join('');
  }
  if(dmg.length){
    html+=dmg.map(m=>{
      const names=Object.keys(m.assignees||{}).filter(id=>m.assignees[id]).map(labelPerson).join(', ');
      return '<div class="resa-row" style="margin-bottom:8px;background:rgba(90,140,90,0.08);"><div class="resa-row-left"><div class="resa-row-name">💆 '+x(m.titre||'Massage')+' · '+(m.nbPersonnes||1)+' pers.</div><div class="resa-row-sub">🕒 '+(m.heureDebut||'—')+(m.duree?' · ⏱ '+x(m.duree):'')+' · '+x(names)+'</div></div></div>';
    }).join('');
  }
  if(!html){dl.innerHTML='<p style="color:var(--gray-400);font-size:14px;padding:8px 0;">Rien ce jour-là.</p>';document.getElementById('cal-detail').style.display='block';return;}
  dl.innerHTML=html;
  dl.querySelectorAll('.btn-action.edit').forEach(b=>b.addEventListener('click',()=>edit(b.dataset.id)));
  document.getElementById('cal-detail').style.display='block';
  document.getElementById('cal-detail').scrollIntoView({behavior:'smooth',block:'nearest'});
}

// ── RÉGLAGES ──────────────────────────────
function rSettings(){
  rSList('formules-list',F,'formule');rSList('options-list',O,'option');rSList('statuts-list',S,'statut');rSList('taches-list',T,'tache');
  rProfils();
  // Reset Rachel/Milla hours buttons
  if(document.getElementById('reset-rachel-btn'))return;
  ['rachel','milla'].forEach(function(pid){
    var resetBtn = document.createElement('div');
    resetBtn.className = 'settings-block';
    resetBtn.innerHTML = '<div class="settings-block-header"><div><h2 class="settings-block-title">Réinitialiser '+cap(pid)+'</h2><p class="settings-block-desc">Remet à zéro toutes les heures et l historique des paiements de '+cap(pid)+'.</p></div><button id="reset-'+pid+'-btn" class="btn btn-danger btn-sm">🗑 Tout réinitialiser</button></div>';
    document.getElementById('view-settings').appendChild(resetBtn);
    document.getElementById('reset-'+pid+'-btn').addEventListener('click', function(){
      if(!confirm('Remettre à zéro toutes les heures '+cap(pid)+' et l historique ? Cette action est irréversible.'))return;
      var fld='temps'+cap(pid);
      var updates = {};
      R.forEach(function(r){ if(r[fld]) updates['reservations/'+r.id+'/'+fld] = ''; });
      Promise.all([
        db.ref('menage_historique/'+pid).remove(),
        Promise.all(Object.entries(updates).map(function(e){return db.ref(e[0]).set(e[1]);}))
      ]).then(function(){
        toast('Réinitialisation effectuée ✓','success');
      }).catch(function(){toast('Erreur.','error');});
    });
  });
}

function rProfils(){
  const c=document.getElementById('profils-list');if(!c)return;
  c.innerHTML=PROFILES.map(p=>'<div class="settings-item"><span class="settings-item-emoji">'+p.emoji+'</span><input type="text" class="profil-name-input" data-id="'+p.id+'" value="'+x(p.name)+'" style="flex:1;height:38px;padding:0 10px;border:1px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;" /><button class="btn-action edit profil-save" data-id="'+p.id+'" title="Enregistrer"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></button></div>').join('');
  c.querySelectorAll('.profil-save').forEach(b=>b.addEventListener('click',()=>{
    const id=b.dataset.id;
    const inp=c.querySelector('.profil-name-input[data-id="'+id+'"]');
    const name=inp.value.trim();
    if(!name){toast('Le prénom est requis.','error');return;}
    db.ref('profils/'+id+'/name').set(name).then(()=>{
      const p=PROFILES.find(x=>x.id===id);if(p)p.name=name;
      toast('Enregistré ✓','success');
      applyRole();renderProfileOverlay();renderMfAssignees();
    }).catch(()=>toast('Erreur.','error'));
  }));
}
function rSList(cid,list,type){
  const c=document.getElementById(cid);if(!c)return;
  if(!list.length){c.innerHTML='<p style="color:var(--gray-400);font-size:13px;">Aucun élément.</p>';return;}
  c.innerHTML=list.map(item=>'<div class="settings-item"><span class="settings-item-emoji">'+(item.emoji||'')+'</span><span class="settings-item-name">'+x(item.name)+'</span><div class="settings-item-actions"><button class="btn-action edit" data-id="'+item.id+'" data-type="'+type+'"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>'+(list.length>1?'<button class="btn-action del" data-id="'+item.id+'" data-type="'+type+'"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>':'')+'</div></div>').join('');
  c.querySelectorAll('.btn-action.edit').forEach(b=>b.addEventListener('click',()=>oEM(b.dataset.id,b.dataset.type)));
  c.querySelectorAll('.btn-action.del').forEach(b=>b.addEventListener('click',()=>dEM(b.dataset.id,b.dataset.type)));
}
['btn-add-formule','btn-add-option','btn-add-statut','btn-add-tache'].forEach((id,i)=>{
  document.getElementById(id).addEventListener('click',()=>oEM(null,['formule','option','statut','tache'][i]));
});
const emo=document.getElementById('edit-modal-overlay');let emx=null;
function oEM(id,type){
  emx={id,type};
  document.getElementById('edit-modal-title').textContent=id?'Modifier':'Ajouter';
  const list=type==='formule'?F:type==='option'?O:type==='tache'?T:S;
  const item=id?list.find(i=>i.id===id):null;
  document.getElementById('emoji-row').style.display='';
  document.getElementById('edit-modal-label-name').textContent=type==='statut'?'Nom du statut':'Nom';
  document.getElementById('edit-modal-emoji').value=item?(item.emoji||''):'';
  document.getElementById('edit-modal-name').value=item?item.name:'';
  emo.classList.remove('hidden');
  setTimeout(()=>{try{document.getElementById('edit-modal-name').focus();}catch(e){}},50);
}
document.getElementById('edit-modal-cancel').addEventListener('click',()=>{emo.classList.add('hidden');emx=null;});
emo.addEventListener('mousedown',e=>{if(e.target===emo){emo.classList.add('hidden');emx=null;}});
emo.querySelector('.modal').addEventListener('mousedown',e=>e.stopPropagation());
document.getElementById('edit-modal-save').addEventListener('click',()=>{
  if(!emx)return;
  const{id,type}=emx;
  const name=document.getElementById('edit-modal-name').value.trim();
  const emoji=document.getElementById('edit-modal-emoji').value.trim();
  if(!name){toast('Le nom est requis.','error');return;}
  const dk=type==='formule'?'formules':type==='option'?'options':type==='tache'?'taches':'statuts';
  const iid=id||uid();
  let data=type==='statut'?{id:iid,emoji:emoji||'🔹',name,key:name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}:{id:iid,emoji:emoji||'⚙️',name};
  db.ref(dk+'/'+iid).set(data).then(()=>{toast('Enregistré ✓','success');emo.classList.add('hidden');emx=null;}).catch(()=>toast('Erreur.','error'));
});
function dEM(id,type){
  db.ref((type==='formule'?'formules':type==='option'?'options':type==='tache'?'taches':'statuts')+'/'+id).remove().then(()=>toast('Supprimé ✓','')).catch(()=>toast('Erreur.','error'));
}

// ── TEMPS DE TRAVAIL (Rachel / Milla) ─────
window._rc={};
function rTemps(){
  ['rachel','milla'].forEach(recapFor);
}
function recapFor(pid){
  var fld='temps'+cap(pid);
  db.ref('menage_historique/'+pid).once('value').then(function(snap){
    var raw = snap.val() || {};
    var allKeys = Object.keys(raw).sort(function(a,b){return raw[a].timestamp-raw[b].timestamp;});
    var allHist = allKeys.map(function(k){return Object.assign({},raw[k],{_key:k});});
    var hist = allHist.filter(function(h){return h.visible !== false;});

    var rr = R.filter(function(r){return r[pid] && r[fld];});
    var tH = 0;
    rr.forEach(function(r){tH += ph(r[fld]);});
    var totalHeuresDues = Math.round(tH * TAUX * 100) / 100;

    var totalPaye = allHist.filter(function(h){return !h.annule;})
      .reduce(function(acc,h){return acc + (h.montant||0);}, 0);
    totalPaye = Math.round(totalPaye * 100) / 100;

    var netDu = Math.round((totalHeuresDues - totalPaye) * 100) / 100;

    document.getElementById('recap-total-heures-'+pid).textContent = fh(tH);
    var montantEl = document.getElementById('recap-total-montant-'+pid);
    if(netDu < 0){
      montantEl.textContent = netDu.toFixed(2)+' €';
      montantEl.style.color = 'var(--green)';
      montantEl.title = 'Crédit : '+cap(pid)+' a été payée '+Math.abs(netDu).toFixed(2)+' € de trop';
    } else {
      montantEl.textContent = netDu.toFixed(2)+' €';
      montantEl.style.color = netDu === 0 ? 'var(--green)' : 'inherit';
      montantEl.title = '';
    }

    var lastActivePay = allHist.filter(function(h){return !h.annule;});
    var lastPay = lastActivePay.length ? lastActivePay[lastActivePay.length-1].timestamp : null;
    var rrPeriod = lastPay ? rr.filter(function(r){return r.createdAt > lastPay;}) : rr;
    var firstResa = rrPeriod.length ? rrPeriod.reduce(function(a,b){return a.createdAt<b.createdAt?a:b;}) : null;
    var periodeText = firstResa ?
      'Du '+fd(new Date(firstResa.createdAt).toISOString().split('T')[0])+' à aujourd-hui' :
      'Aucune réservation en cours';
    document.getElementById('recap-period-'+pid).innerHTML = '<span class="recap-period-label">📅 '+periodeText+'</span>';

    var det = document.getElementById('recap-detail-'+pid);
    if(!rrPeriod.length){
      det.innerHTML='<p style="color:var(--gray-400);font-size:14px;padding:16px 0;">Aucune réservation avec temps de travail.</p>';
    } else {
      det.innerHTML='<table class="recap-table"><thead><tr><th>Client</th><th>Date</th><th>Formule</th><th>Temps</th><th>Montant</th></tr></thead><tbody>'+
        rrPeriod.map(function(r){
          var h=ph(r[fld]), m=Math.round(h*TAUX*100)/100;
          return '<tr><td>'+x(fn(r))+'</td><td>'+fd(r.date)+'</td><td>'+x(r.formule)+'</td><td>'+x(r[fld])+'</td><td>'+m.toFixed(2)+' €</td></tr>';
        }).join('')+'</tbody></table>';
    }

    var he = document.getElementById('historique-list-'+pid);
    if(!hist.length){
      he.innerHTML='<p style="color:var(--gray-400);font-size:14px;">Aucun paiement enregistré.</p>';
    } else {
      he.innerHTML = hist.slice().reverse().map(function(p){
        var mp = p.montant || 0;
        var mdu = p.montantOriginal || mp;
        var montantHTML = p.annule ?
          '<span style="text-decoration:line-through;color:var(--gray-400);font-size:14px;">'+mp.toFixed(2)+' €</span>' :
          (Math.abs(mdu-mp)>0.01 ?
            '<span style="text-decoration:line-through;color:var(--gray-400);font-size:12px;">'+mdu.toFixed(2)+' €</span>&nbsp;<span class="historique-montant" style="color:var(--green);">'+mp.toFixed(2)+' €</span>' :
            '<span class="historique-montant">'+mp.toFixed(2)+' €</span>');
        return '<div class="historique-item'+(p.annule?' historique-annule':'')+'" data-key="'+p._key+'">'+
          '<div class="historique-left">'+
            '<div class="historique-date">'+fd(new Date(p.timestamp).toISOString().split('T')[0])+
              (p.annule?' <span style="color:var(--red);font-size:11px;font-weight:600;">ANNULÉ</span>':'')+
            '</div>'+
            '<div class="historique-detail">'+fh(p.heures||0)+' · '+p.periode+'</div>'+
          '</div>'+
          '<div style="display:flex;align-items:center;gap:8px;">'+
            '<div>'+montantHTML+'</div>'+
            (!p.annule ?
              '<button class="btn-action hist-cancel" data-key="'+p._key+'" data-montant="'+mp.toFixed(2)+'" style="color:var(--amber);" title="Annuler — remet dans montant dû"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>' : '')+
            '<button class="btn-action del hist-del" data-key="'+p._key+'" title="Supprimer définitivement"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>'+
          '</div>'+
        '</div>';
      }).join('');

      he.querySelectorAll('.hist-cancel').forEach(function(btn){
        btn.addEventListener('click', function(){
          if(!confirm('Annuler ce paiement ? Le montant reviendra dans le montant dû et la ligne restera barrée.'))return;
          var key=btn.dataset.key;
          var montant=parseFloat(btn.dataset.montant)||0;
          db.ref('menage_historique/'+pid+'/'+key).update({annule:true, montantOriginal:montant})
            .then(function(){toast('Paiement annulé ✓','success');recapFor(pid);})
            .catch(function(){toast('Erreur.','error');});
        });
      });

      he.querySelectorAll('.hist-del').forEach(function(btn){
        btn.addEventListener('click', function(){
          if(!confirm('Supprimer cette ligne de l historique ?'))return;
          var key = btn.dataset.key;
          db.ref('menage_historique/'+pid+'/'+key).update({visible: false})
            .then(function(){toast('Ligne supprimée.','');recapFor(pid);})
            .catch(function(){toast('Erreur.','error');});
        });
      });
    }

    window._rc[pid] = {tH:tH, mt:Math.abs(netDu), netDu:netDu, lastPay:lastPay};
  });
}

// Boutons payer
['rachel','milla'].forEach(function(pid){
  var btn=document.getElementById('btn-payer-'+pid);
  if(!btn)return;
  btn.addEventListener('click', function(){
    var d = window._rc[pid] || {};
    var inp2 = document.getElementById('recap-montant-paye-'+pid);
    var customVal2 = inp2 ? inp2.value.trim() : '';
    if(d.netDu <= 0 && !customVal2){
      toast('Aucun montant dû. Saisis un montant personnalisé si nécessaire.','error');
      return;
    }
    if(!d.tH || d.tH <= 0){toast('Aucune heure à payer.','error');return;}
    var now = Date.now();
    var lastPay = d.lastPay;
    var debut = lastPay ? fd(new Date(lastPay).toISOString().split('T')[0]) : 'Début';
    var fin = fd(new Date(now).toISOString().split('T')[0]);

    var inp = document.getElementById('recap-montant-paye-'+pid);
    var customVal = inp ? inp.value.trim() : '';
    var montantDu = Math.abs(d.netDu) || 0;
    var montantPaye = customVal ? (parseFloat(customVal.replace(',','.'))||montantDu) : montantDu;

    var entry = {
      timestamp: now,
      heures: d.tH,
      montantOriginal: montantDu,
      montant: montantPaye,
      periode: debut+' -> '+fin
    };

    db.ref('menage_historique/'+pid).push(entry).then(function(){
      if(inp) inp.value = '';
      var diff = montantPaye - montantDu;
      var msg = diff < -0.01 ? 'Payé '+montantPaye.toFixed(2)+' € (reste '+Math.abs(diff).toFixed(2)+' € dû)' :
                diff > 0.01  ? 'Payé '+montantPaye.toFixed(2)+' € (crédit +'+diff.toFixed(2)+' €)' :
                               'Paiement enregistré ✓ — '+montantPaye.toFixed(2)+' €';
      toast(msg,'success');
      recapFor(pid);
    }).catch(function(){toast('Erreur Firebase.','error');});
  });
});

// ── SAMPLE DATA ───────────────────────────
function samples(){
  const today=new Date(),fmt=d=>d.toISOString().split('T')[0];
  const tom=new Date(today);tom.setDate(today.getDate()+1);
  const dep=new Date(tom);dep.setDate(tom.getDate()+1);
  [{prenom:'Mehdi',nom:'Habibi',tel:'06 12 34 56 78',date:fmt(tom),heure:'18:00',dateDepart:fmt(dep),heureDepart:'11:00',formule:'Nuit romantique',statut:'a-preparer',options:{o1:false,o2:false,o3:false,o4:true,o5:true},prix:180,acompte:130,notes:'Pétales de roses rouges',rachel:true,milla:false,checklist:{},tempsRachel:'',tempsMilla:'',createdAt:Date.now()},
   {prenom:'Sophie',nom:'Martin',tel:'07 98 76 54 32',date:fmt(today),heure:'20:00',dateDepart:fmt(today),heureDepart:'23:00',formule:'Parenthèse 3h',statut:'client-arrive',options:{o1:true,o2:true,o3:false,o4:false,o5:false},prix:90,acompte:90,notes:'',rachel:false,milla:false,checklist:{},tempsRachel:'',tempsMilla:'',createdAt:Date.now()-86400000}
  ].forEach(s=>db.ref('reservations').push().set(s));
}

// ── START ─────────────────────────────────
loadProfils(function(){
  renderProfileOverlay();
  renderMfAssignees();
  initProfileGate();
});
