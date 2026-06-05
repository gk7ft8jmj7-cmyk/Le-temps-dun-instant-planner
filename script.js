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
const DEF_OPTIONS=[{id:'o1',emoji:'💆',name:'Massage'},{id:'o2',emoji:'🛏',name:'Table massage'},{id:'o3',emoji:'🍖',name:'Plancha'},{id:'o4',emoji:'🥂',name:'Champagne'},{id:'o5',emoji:'🌹',name:'Décoration romantique'}];
const DEF_STATUTS=[{id:'s1',emoji:'🔸',name:'À préparer',key:'a-preparer'},{id:'s2',emoji:'🔵',name:'Chambre prête',key:'chambre-prete'},{id:'s3',emoji:'🟢',name:'Client arrivé',key:'client-arrive'},{id:'s4',emoji:'✅',name:'Terminé',key:'termine'}];
const DEF_TACHES=[{id:'t1',emoji:'🧹',name:'Ménage'},{id:'t2',emoji:'🛁',name:'Salle de bain propre'},{id:'t3',emoji:'🛏',name:'Lits faits'},{id:'t4',emoji:'🧴',name:"Produits d'accueil"},{id:'t5',emoji:'🌡',name:'Température réglée'}];

let R=[],F=DEF_FORMULES,O=DEF_OPTIONS,S=DEF_STATUTS,T=DEF_TACHES;
let ready=false,view='dashboard';
const TAUX=15;

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

// toast
const te=document.getElementById('toast');let tt;
function toast(m,t){clearTimeout(tt);te.textContent=m;te.className='toast show '+(t||'');tt=setTimeout(()=>{te.className='toast';},3000);}

// loading
function load(v){document.getElementById('loading-overlay').style.display=v?'flex':'none';}

// firebase
function init(){
  load(true);
  let n=0;
  function done(){if(++n>=5&&!ready){ready=true;load(false);go('dashboard');live();}}
  db.ref('formules').once('value',s=>{if(!s.val())DEF_FORMULES.forEach(f=>db.ref('formules/'+f.id).set(f));else F=Object.values(s.val());done();});
  db.ref('options').once('value',s=>{if(!s.val())DEF_OPTIONS.forEach(o=>db.ref('options/'+o.id).set(o));else O=Object.values(s.val());done();});
  db.ref('statuts').once('value',s=>{if(!s.val())DEF_STATUTS.forEach(s2=>db.ref('statuts/'+s2.id).set(s2));else S=Object.values(s.val());done();});
  db.ref('taches').once('value',s=>{if(!s.val())DEF_TACHES.forEach(t=>db.ref('taches/'+t.id).set(t));else T=Object.values(s.val());done();});
  db.ref('reservations').once('value',s=>{if(!s.val())samples();else R=Object.entries(s.val()).map(([id,v])=>({...v,id}));done();});
  setTimeout(()=>{if(!ready){ready=true;load(false);go('dashboard');live();}},6000);
}

function live(){
  db.ref('reservations').on('value',s=>{R=s.val()?Object.entries(s.val()).map(([id,v])=>({...v,id})):[];rf();});
  db.ref('formules').on('value',s=>{if(s.val())F=Object.values(s.val());rf();});
  db.ref('options').on('value',s=>{if(s.val())O=Object.values(s.val());rf();});
  db.ref('statuts').on('value',s=>{if(s.val())S=Object.values(s.val());rf();});
  db.ref('taches').on('value',s=>{if(s.val())T=Object.values(s.val());rf();});
}

function rf(){
  if(view==='dashboard')rDash();
  else if(view==='rachel')rRachel();
  else if(view==='all-reservations')rAll();
  else if(view==='calendar')rCal();
  else if(view==='settings')rSettings();
  else if(view==='recap-rachel')rRecap();
}

// navigation
const VIEWS=['dashboard','new-reservation','rachel','all-reservations','calendar','recap-rachel','settings'];
function go(v){
  VIEWS.forEach(id=>{const el=document.getElementById('view-'+id);if(el)el.classList.toggle('hidden',id!==v);});
  view=v;
  document.querySelectorAll('.nav-item').forEach(a=>a.classList.toggle('active',a.dataset.view===v));
  if(v==='dashboard')rDash();
  else if(v==='rachel')rRachel();
  else if(v==='all-reservations')rAll();
  else if(v==='calendar')rCal();
  else if(v==='settings')rSettings();
  else if(v==='recap-rachel')rRecap();
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
   ['rachel-filter-status','<option value="">Toutes</option>'],
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
  fStat();
  const q=document.getElementById('search-input').value.toLowerCase().trim();
  const dt=document.getElementById('filter-date').value;
  const sf=document.getElementById('filter-status').value;
  document.getElementById('stat-total').textContent=R.length;
  document.getElementById('stat-prepare').textContent=R.filter(r=>r.statut===(S[0]||{}).key).length;
  document.getElementById('stat-ready').textContent=R.filter(r=>r.statut===(S[1]||{}).key).length;
  document.getElementById('stat-active').textContent=R.filter(r=>r.statut===(S[2]||{}).key).length;
  let list=[...R].sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0).filter(r=>{
    if(q&&!fn(r).toLowerCase().includes(q)&&!(r.tel||'').includes(q))return false;
    if(dt&&r.date!==dt)return false;
    if(sf&&r.statut!==sf)return false;
    return true;
  });
  const c=document.getElementById('reservation-list');
  if(!list.length){c.innerHTML='<div class="empty-state"><div class="empty-state-icon">🗓</div><p>Aucune réservation trouvée</p></div>';return;}
  c.innerHTML=list.map(r=>{
    const opts=O.filter(o=>r.options&&r.options[o.id]).map(o=>o.emoji).join(' ');
    return '<div class="resa-row'+(r.rachel?' resa-row-rachel':'')+'">'+ 
      '<div class="resa-row-left">'+
        '<div class="resa-row-name">'+x(fn(r))+(r.rachel?' <span class="rachel-badge">👩 Assignée à Rachel</span>':'')+'</div>'+
        '<div class="resa-row-sub">📅 '+fd(r.date)+' 🕒 '+(r.heure||'—')+(r.tel?' · 📞 '+x(r.tel):'')+' '+x(r.formule)+'</div>'+
      '</div>'+
      '<div class="resa-row-middle">'+
        '<div class="resa-row-options">'+(opts||'—')+' · Solde : <strong>'+sol(r.prix,r.acompte)+' €</strong></div>'+
      '</div>'+
      bdg(r.statut)+
      '<div class="resa-row-actions">'+
        '<button class="btn-action edit" data-id="'+r.id+'"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>'+
        '<button class="btn-action del" data-id="'+r.id+'"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>'+
      '</div></div>';
  }).join('');
  c.querySelectorAll('.btn-action.edit').forEach(b=>b.addEventListener('click',()=>edit(b.dataset.id)));
  c.querySelectorAll('.btn-action.del').forEach(b=>b.addEventListener('click',()=>del(b.dataset.id)));
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
  document.getElementById('f-rachel').checked=!!r.rachel;
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
    checklist:(ex&&ex.checklist)?ex.checklist:{},
    tempsTravail:(ex&&ex.tempsTravail)?ex.tempsTravail:'',
    createdAt:ex?ex.createdAt:Date.now()
  };
  const ref=eid?db.ref('reservations/'+eid):db.ref('reservations').push();
  ref.set(data).then(()=>{toast(eid?'Mise à jour ✓':'Enregistrée ✓','success');eid=null;go('dashboard');}).catch(()=>toast('Erreur.','error'));
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
function card(r){
  const cl=r.checklist||{};
  const ao=O.filter(o=>r.options&&r.options[o.id]);
  const opH=ao.length?ao.map(o=>'<span class="option-pill yes">'+x(o.emoji)+' '+x(o.name)+'</span>').join(''):'<span style="color:var(--gray-400);font-size:13px;">Aucune option</span>';
  const ti=[...T.map(t=>({key:'t_'+t.id,lbl:(t.emoji||'')+' '+t.name})),...ao.map(o=>({key:'o_'+o.id,lbl:(o.emoji||'')+' '+o.name}))];
  const tH=ti.length?ti.map(t=>'<button class="checklist-item '+(cl[t.key]?'checked':'')+'" data-id="'+r.id+'" data-key="'+t.key+'" type="button"><span class="check-box"></span>'+t.lbl+'</button>').join(''):'<span style="color:var(--gray-400);font-size:13px;">Aucune tâche</span>';
  const d=dur(r.date,r.heure,r.dateDepart,r.heureDepart);
  const ip=r.statut==='chambre-prete';
  return '<div class="rachel-card'+(r.rachel?' rachel-card-highlighted':'')+'" data-id="'+r.id+'">'+
    '<div class="rachel-card-header">'+
      '<div class="rachel-card-client">'+
        '<div class="rachel-client-name">'+x(fn(r))+(r.rachel?' <span class="rachel-badge">👩 Assignée à Rachel</span>':'')+'</div>'+
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
(r.rachel?'<div class="temps-travail-wrap">'+
        '<label class="temps-travail-label">⏱ Temps de travail</label>'+
        '<input type="text" class="temps-travail-input" data-id="'+r.id+'" value="'+x(r.tempsTravail||'')+'" placeholder="1h30" maxlength="6" />'+
      '</div>':'')+
      '<button class="checklist-item chambre-prete-btn '+(ip?'checked':'')+'" data-id="'+r.id+'" data-key="chambre_prete" type="button"><span class="check-box"></span>✓ Chambre prête</button>'+
    '</div>'+
  '</div>';
}

function bind(c){
  c.querySelectorAll('.checklist-item').forEach(b=>{
    b.addEventListener('click',()=>{
      const r=R.find(i=>i.id===b.dataset.id);if(!r)return;
      if(b.dataset.key==='chambre_prete'){
        // Si on coche (pas encore prête), vérifier que le temps est saisi
        if(r.statut!=='chambre-prete'){
          const card=b.closest('.rachel-card');
          const inp=card?card.querySelector('.temps-travail-input'):null;
          const val=inp?inp.value.trim():(r.tempsTravail||'');
          if(!val){
            toast('Saisis le temps de travail ⏱','error');
            if(inp){inp.focus();inp.style.borderColor='var(--red)';}
            return;
          }
          // Save temps then mark ready
          db.ref('reservations/'+r.id+'/tempsTravail').set(val).then(()=>{
            return db.ref('reservations/'+r.id+'/statut').set('chambre-prete');
          }).then(()=>{toast('Chambre prête ✓','success');rf();}).catch(()=>toast('Erreur.','error'));
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
      db.ref('reservations/'+this.dataset.id+'/tempsTravail').set(this.value.trim()).then(()=>toast('Temps enregistré ✓','success')).catch(()=>toast('Erreur.','error'));
    });
  });
  c.querySelectorAll('.btn-rachel-edit').forEach(b=>b.addEventListener('click',()=>edit(b.dataset.id)));
}

// ── VUE RACHEL ────────────────────────────
const rSel=document.getElementById('rachel-filter-status');
rSel.addEventListener('change',rRachel);

function rRachel(){
  if(!rSel.dataset.init){rSel.value='a-preparer';rSel.dataset.init='1';}
  fStat();if(!rSel.value)rSel.value='a-preparer';
  const sf=rSel.value;
  const c=document.getElementById('rachel-cards');
  let list=[...R].filter(r=>r.rachel).sort((a,b)=>a.date<b.date?-1:1);
  if(sf)list=list.filter(r=>r.statut===sf);
  if(!list.length){c.innerHTML='<div class="empty-state"><div class="empty-state-icon">🌙</div><p>Aucune réservation assignée à Rachel</p></div>';return;}
  c.innerHTML=list.map(r=>card(r)).join('');
  bind(c);
}

// ── TOUTES LES RÉSERVATIONS ───────────────
document.getElementById('all-filter-status').addEventListener('change',rAll);

function rAll(){
  const sel=document.getElementById('all-filter-status');
  const cur=sel.value;
  sel.innerHTML='<option value="">Tous les statuts</option>'+S.map(s=>'<option value="'+x(s.key)+'">'+x(s.name)+'</option>').join('');
  sel.value=cur;
  const sf=sel.value;
  const c=document.getElementById('all-cards');
  let list=[...R].sort((a,b)=>a.date<b.date?-1:1);
  if(sf)list=list.filter(r=>r.statut===sf);
  if(!list.length){c.innerHTML='<div class="empty-state"><div class="empty-state-icon">🗓</div><p>Aucune réservation</p></div>';return;}
  c.innerHTML=list.map(r=>card(r)).join('');
  bind(c);
}

// ── CALENDRIER ────────────────────────────
let cY=new Date().getFullYear(),cM=new Date().getMonth();
const MFR=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DFR=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

document.getElementById('cal-prev').addEventListener('click',()=>{cM--;if(cM<0){cM=11;cY--;}rCal();});
document.getElementById('cal-next').addEventListener('click',()=>{cM++;if(cM>11){cM=0;cY++;}rCal();});
document.getElementById('cal-detail-close').addEventListener('click',()=>{document.getElementById('cal-detail').style.display='none';});

function rCal(){
  document.getElementById('cal-month-label').textContent=MFR[cM]+' '+cY;
  const g=document.getElementById('calendar-grid');
  const td=new Date();
  let sw=new Date(cY,cM,1).getDay();sw=sw===0?6:sw-1;
  const dm=new Date(cY,cM+1,0).getDate(),dp=new Date(cY,cM,0).getDate();
  const bd={};
  R.forEach(r=>{
    if(!r.date)return;
    const s=new Date(r.date+'T12:00:00'),e=r.dateDepart?new Date(r.dateDepart+'T12:00:00'):s,c=new Date(s);
    while(c<=e){
      const cy=c.getFullYear(),cm=c.getMonth(),cd=c.getDate();
      if(cy===cY&&cm===cM){const ds=cy+'-'+String(cm+1).padStart(2,'0')+'-'+String(cd).padStart(2,'0');if(!bd[ds])bd[ds]=[];if(!bd[ds].find(i=>i.id===r.id))bd[ds].push(r);}
      c.setDate(c.getDate()+1);
    }
  });
  let h='<div class="cal-days-header">'+DFR.map(d=>'<div class="cal-day-name">'+d+'</div>').join('')+'</div><div class="cal-cells">';
  for(let i=0;i<sw;i++)h+='<div class="cal-cell other-month"><div class="cal-cell-num">'+(dp-sw+1+i)+'</div></div>';
  for(let d=1;d<=dm;d++){
    const it=d===td.getDate()&&cM===td.getMonth()&&cY===td.getFullYear();
    const ds=cY+'-'+String(cM+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const dr=bd[ds]||[];
    const ev=dr.slice(0,3).map(r=>{
      const iS=r.date===ds,iE=(r.dateDepart||r.date)===ds;
      const rc=r.rachel?' rachel-bar':'';
      const cls='cal-bar-event '+r.statut+(iS?' bar-start':'')+(iE?' bar-end':'')+((!iS&&!iE)?' bar-mid':'')+rc;
      return '<div class="'+cls+'">'+(iS?x((r.prenom||r.nom||'?').split(' ')[0])+' '+(r.heure||''):'')+'</div>';
    }).join('');
    h+='<div class="cal-cell'+(it?' today':'')+'" data-date="'+ds+'"><div class="cal-cell-num">'+d+'</div>'+ev+(dr.length>3?'<div style="font-size:9px;color:var(--gray-400);">+'+(dr.length-3)+'</div>':'')+'</div>';
  }
  const rem=(7-((sw+dm)%7))%7;for(let i=1;i<=rem;i++)h+='<div class="cal-cell other-month"><div class="cal-cell-num">'+i+'</div></div>';
  g.innerHTML=h+'</div>';
  g.querySelectorAll('.cal-cell[data-date]').forEach(c=>c.addEventListener('click',()=>cDetail(c.dataset.date)));
}

function cDetail(ds){
  const dr=R.filter(r=>r.date&&ds>=r.date&&ds<=(r.dateDepart||r.date)).sort((a,b)=>a.heure<b.heure?-1:1);
  document.getElementById('cal-detail-date').textContent='Réservations du '+fd(ds);
  const dl=document.getElementById('cal-detail-list');
  if(!dr.length){dl.innerHTML='<p style="color:var(--gray-400);font-size:14px;padding:8px 0;">Aucune réservation ce jour-là.</p>';return;}
  dl.innerHTML=dr.map(r=>'<div class="resa-row" style="margin-bottom:8px;"><div class="resa-row-left"><div class="resa-row-name">'+x(fn(r))+'</div><div class="resa-row-sub">🕒 '+(r.heure||'—')+' · '+x(r.formule)+'</div></div>'+bdg(r.statut)+'<div class="resa-row-actions"><button class="btn-action edit" data-id="'+r.id+'"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></div></div>').join('');
  dl.querySelectorAll('.btn-action.edit').forEach(b=>b.addEventListener('click',()=>edit(b.dataset.id)));
  document.getElementById('cal-detail').style.display='block';
  document.getElementById('cal-detail').scrollIntoView({behavior:'smooth',block:'nearest'});
}

// ── RÉGLAGES ──────────────────────────────
function rSettings(){
  rSList('formules-list',F,'formule');rSList('options-list',O,'option');rSList('statuts-list',S,'statut');rSList('taches-list',T,'tache');
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

// ── RÉCAP RACHEL ──────────────────────────
function rRecap(){
  db.ref('rachel_historique').once('value').then(snap=>{
    // hist = tous les paiements triés par date
    const raw = snap.val() ? snap.val() : {};
    const keys = Object.keys(raw).sort((a,b)=>raw[a].timestamp-raw[b].timestamp);
    const hist = keys.map(k=>({...raw[k], _key:k}));

    // Dernier paiement NON annulé = début de la période courante
    const activePays = hist.filter(h=>!h.annule);
    const last = activePays.length ? activePays[activePays.length-1].timestamp : null;

    // Réservations Rachel avec temps de travail dans la période courante
    const rr = R.filter(r=>r.rachel && r.tempsTravail);
    const period = last ? rr.filter(r=>r.createdAt > last) : rr;
    let tH = 0; period.forEach(r=>{ tH += ph(r.tempsTravail); });
    const heuresDues = Math.round(tH * TAUX * 100) / 100;

    // Paiements annulés dans la période courante → leur montantOriginal est encore dû
    const annulesDansPeriode = hist.filter(h => h.annule && (!last || h.timestamp > last));
    const montantAnnules = annulesDansPeriode.reduce((acc,h) => acc + (h.montantOriginal || h.montantDu || 0), 0);

    // Montant total dû
    const totalDu = Math.round((heuresDues + montantAnnules) * 100) / 100;

    // Affichage
    document.getElementById('recap-total-heures').textContent = fh(tH);
    document.getElementById('recap-total-montant').textContent = totalDu.toFixed(2)+' €';
    document.getElementById('recap-total-montant').style.color = totalDu <= 0 ? 'var(--green)' : 'inherit';
    document.getElementById('recap-period').innerHTML =
      '<span class="recap-period-label">📅 '+(last ? 'Depuis le '+fd(new Date(last).toISOString().split('T')[0]) : 'Toutes les réservations')+'</span>';

    // Tableau détail
    const det = document.getElementById('recap-detail');
    if(!period.length){
      det.innerHTML='<p style="color:var(--gray-400);font-size:14px;padding:16px 0;">Aucune réservation avec temps de travail.</p>';
    } else {
      det.innerHTML='<table class="recap-table"><thead><tr><th>Client</th><th>Date</th><th>Formule</th><th>Temps</th><th>Montant</th></tr></thead><tbody>'+
        period.map(r=>{const h=ph(r.tempsTravail),m=Math.round(h*TAUX*100)/100;
          return'<tr><td>'+x(fn(r))+'</td><td>'+fd(r.date)+'</td><td>'+x(r.formule)+'</td><td>'+x(r.tempsTravail)+'</td><td>'+m.toFixed(2)+' €</td></tr>';
        }).join('')+'</tbody></table>';
    }

    // Historique
    const he = document.getElementById('historique-list');
    if(!hist.length){
      he.innerHTML='<p style="color:var(--gray-400);font-size:14px;">Aucun paiement enregistré.</p>';
    } else {
      he.innerHTML = [...hist].reverse().map(p=>{
        const montantAffiche = p.montantOriginal || p.montantDu || p.montant || 0;
        const montantPaye = p.montant || 0;
        return '<div class="historique-item'+(p.annule?' historique-annule':'')+'" data-key="'+p._key+'">'+
          '<div class="historique-left">'+
            '<div class="historique-date">'+fd(new Date(p.timestamp).toISOString().split('T')[0])+
              (p.annule?' <span style="color:var(--red);font-size:11px;font-weight:600;">ANNULÉ</span>':'')+'</div>'+
            '<div class="historique-detail">'+fh(p.heures||0)+' · '+p.periode+'</div>'+
          '</div>'+
          '<div style="display:flex;align-items:center;gap:8px;">'+
            '<div style="text-align:right;">'+
              (p.annule?
                '<span style="text-decoration:line-through;color:var(--gray-400);font-size:14px;">'+montantAffiche.toFixed(2)+' €</span>':
                (Math.abs(montantAffiche - montantPaye) > 0.01 ?
                  '<span style="text-decoration:line-through;color:var(--gray-400);font-size:12px;">'+montantAffiche.toFixed(2)+' €</span> '+
                  '<span class="historique-montant" style="color:var(--green);">'+montantPaye.toFixed(2)+' €</span>' :
                  '<span class="historique-montant">'+montantPaye.toFixed(2)+' €</span>'
                )
              )+
            '</div>'+
            (p.annule ? '' :
              '<button class="btn-action edit hist-edit" data-key="'+p._key+'" title="Modifier"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>'+
              '<button class="btn-action hist-cancel" data-key="'+p._key+'" data-montant="'+montantPaye+'" title="Annuler" style="color:var(--amber);"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>'
            )+
            '<button class="btn-action del hist-del" data-key="'+p._key+'" data-annule="'+(p.annule?'1':'0')+'" data-montant="'+montantPaye+'" title="Supprimer"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>'+
          '</div>'+
        '</div>';
      }).join('');

      // Modifier
      he.querySelectorAll('.hist-edit').forEach(btn=>{
        btn.addEventListener('click',()=>{
          const key=btn.dataset.key;
          db.ref('rachel_historique/'+key).once('value').then(s=>{
            const p=s.val();if(!p)return;
            const newM=prompt('Modifier le montant payé (€) :', (p.montant||0).toFixed(2));
            if(newM===null)return;
            const m=parseFloat(newM.replace(',','.'));
            if(isNaN(m)){toast('Montant invalide.','error');return;}
            const newD=prompt('Modifier la date (JJ/MM/AAAA) :', fd(new Date(p.timestamp).toISOString().split('T')[0]));
            if(newD===null)return;
            const parts=newD.split('/');
            let newTs=p.timestamp;
            if(parts.length===3){const d=new Date(parts[2]+'-'+parts[1]+'-'+parts[0]);if(!isNaN(d.getTime()))newTs=d.getTime();}
            db.ref('rachel_historique/'+key).update({montant:m,timestamp:newTs})
              .then(()=>{toast('Modifié ✓','success');rRecap();}).catch(()=>toast('Erreur.','error'));
          });
        });
      });

      // Annuler (garde dans historique barré, remet montant dans dû)
      he.querySelectorAll('.hist-cancel').forEach(btn=>{
        btn.addEventListener('click',()=>{
          if(!confirm('Annuler ce paiement ? Le montant reviendra dans le montant dû.'))return;
          const key=btn.dataset.key;
          const montant=parseFloat(btn.dataset.montant)||0;
          // On garde le montant original pour l affichage barré, mais annule=true
          db.ref('rachel_historique/'+key).update({annule:true, montantOriginal:montant})
            .then(()=>{toast('Paiement annulé — montant remis dans le dû.','success');rRecap();})
            .catch(()=>toast('Erreur.','error'));
        });
      });

      // Supprimer
      he.querySelectorAll('.hist-del').forEach(btn=>{
        btn.addEventListener('click',()=>{
          const wasAnnule = btn.dataset.annule === '1';
          const msg = wasAnnule ?
            'Supprimer ce paiement annulé ? Son montant sera retiré du total dû (comme s il n avait jamais existé).' :
            'Supprimer définitivement ce paiement ? Il disparaîtra sans affecter le montant dû.';
          if(!confirm(msg))return;
          db.ref('rachel_historique/'+btn.dataset.key).remove()
            .then(()=>{toast('Paiement supprimé.','');rRecap();})
            .catch(()=>toast('Erreur.','error'));
        });
      });
    }

    window._rc = {tH, mt:totalDu, netDu:totalDu, last};
  });
}

// ── SAMPLE DATA ───────────────────────────
function samples(){
  const today=new Date(),fmt=d=>d.toISOString().split('T')[0];
  const tom=new Date(today);tom.setDate(today.getDate()+1);
  const dep=new Date(tom);dep.setDate(tom.getDate()+1);
  [{prenom:'Mehdi',nom:'Habibi',tel:'06 12 34 56 78',date:fmt(tom),heure:'18:00',dateDepart:fmt(dep),heureDepart:'11:00',formule:'Nuit romantique',statut:'a-preparer',options:{o1:false,o2:false,o3:false,o4:true,o5:true},prix:180,acompte:130,notes:'Pétales de roses rouges',rachel:true,checklist:{},tempsTravail:'',createdAt:Date.now()},
   {prenom:'Sophie',nom:'Martin',tel:'07 98 76 54 32',date:fmt(today),heure:'20:00',dateDepart:fmt(today),heureDepart:'23:00',formule:'Parenthèse 3h',statut:'client-arrive',options:{o1:true,o2:true,o3:false,o4:false,o5:false},prix:90,acompte:90,notes:'',rachel:false,checklist:{},tempsTravail:'',createdAt:Date.now()-86400000}
  ].forEach(s=>db.ref('reservations').push().set(s));
}

// ── START ─────────────────────────────────
init();
