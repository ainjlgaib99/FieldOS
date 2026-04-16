// Pure utility functions shared between the app and the test suite.
// Loaded as a plain <script> in index.html (globals) and required() in tests.

function toQS(params){
  const p=[];
  for(const [key,val] of Object.entries(params)){
    if(val===undefined||val===null||val==='') continue;
    if(Array.isArray(val)){
      if(val.length && typeof val[0]==='object'){
        val.forEach((obj,i)=>Object.entries(obj).forEach(([k,v])=>p.push(encodeURIComponent(`${key}[${i}][${k}]`)+'='+encodeURIComponent(v))));
      } else {
        val.forEach(v=>p.push(encodeURIComponent(`${key}[]`)+'='+encodeURIComponent(v)));
      }
    } else {
      p.push(encodeURIComponent(key)+'='+encodeURIComponent(val));
    }
  }
  return p.join('&');
}

function today(){ return new Date().toISOString().split('T')[0]; }

function fmtDate(d){ if(!d) return '\u2014'; return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }

function badge(s){
  const m={
    Active:'bo', Open:'bo', Draft:'bgr', Submitted:'bb', 'Under Review':'by',
    Approved:'bg', Executed:'bg', Resolved:'bg', Mitigated:'bg', Closed:'bg', Answered:'bg',
    Denied:'br', Rejected:'br', 'Revise & Resubmit':'br',
    Critical:'br', High:'by', Medium:'bo', Low:'bg',
    'On Hold':'by', 'Punch List':'bo', Closeout:'bb', Completed:'bg',
    'Pre-Construction':'bgr', Accepted:'bg', 'Approved as Noted':'by'
  };
  return `<span class="badge ${m[s]||'bb'}">${s}</span>`;
}

function pdot(p){ const m={Critical:'dr',High:'dr',Medium:'dy',Low:'dg'}; return `<div class="dot ${m[p]||'dgr'}"></div>`; }

if(typeof module!=='undefined') module.exports={toQS,today,fmtDate,badge,pdot};
