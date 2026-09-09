import{n as e,p as t,r as n,t as r}from"./school-rows-i7BlOgQ-.js";import{Pt as i,f as a}from"./app-ClrpB_CC.js";import{n as o,t as s}from"./jspdf.plugin.autotable-B-zX9Y7s.js";import{r as c}from"./api-DXVM8nsA.js";import{o as l}from"./school-grades-DmWB9awV.js";import{n as u}from"./document-pied-CIWwfRd0.js";import{n as d}from"./document-authenticity-qr-DBWF1jn_.js";function f(e){return e===null?``:l(e)}function p(e,t){return e===null?``:`${e===1?`1er`:`${e}e`} / ${t}`}function m(e){return e.replace(/\s+/g,` `).trim()}function h(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function g(e){return e?e.startsWith(`http://`)||e.startsWith(`https://`)||e.startsWith(`data:`)||typeof window>`u`?e:new URL(e,window.location.origin).href:null}function _(e){let n=[[`Numéro d’élève`,e.student.matricule],[`Classe`,e.classroomName],[`Nom(s) et prénom(s)`,`${e.student.lastName} ${e.student.firstName}`],[`Date de naissance`,t(e.student.bornOn)],[`Genre`,a(e.student.gender)],[`Examen`,e.term.name]];return e.trackCode&&n.splice(2,0,[`Série`,e.trackCode]),n}function v(e){return e.lines.some(e=>e.weighted!==null)?l(e.totalGeneral):``}function y(e){return e.average===null?``:l(e.average)}function b(t,i){let a=new o({orientation:`portrait`,unit:`mm`,format:`a4`}),c=a.internal.pageSize.getWidth(),l=14;a.setFont(`helvetica`,`bold`),a.setFontSize(11),a.text(m(t.profile.name),c/4,l,{align:`center`}),l+=5,a.setFont(`helvetica`,`normal`),a.setFontSize(9),t.profile.motto&&(a.text(m(t.profile.motto),c/4,l,{align:`center`}),l+=4),t.profile.phone&&(a.text(`Tél. : ${m(t.profile.phone)}`,c/4,l,{align:`center`}),l+=4),t.profile.email&&(a.text(`E-mail : ${m(t.profile.email)}`,c/4,l,{align:`center`}),l+=4),t.profile.address&&(a.text(m(t.profile.address),c/4,l,{align:`center`}),l+=4),a.text(`${m(t.profile.city)}, ${n}`,c/4,l,{align:`center`}),a.setFont(`helvetica`,`bold`),a.setFontSize(10),a.text(e.toUpperCase(),c*3/4,14,{align:`center`}),a.setFont(`helvetica`,`normal`),a.setFontSize(8),a.text(r,c*3/4,19,{align:`center`}),a.text(`-------`,c*3/4,24,{align:`center`}),a.setFontSize(9),a.text(`Année scolaire ${t.yearLabel}`,c*3/4,32,{align:`center`}),l=42,a.setFont(`helvetica`,`bold`),a.setFontSize(16),a.text(`BULLETIN DE NOTES`,c/2,l,{align:`center`}),l+=10;let u=_(t);a.setFontSize(10);let d=(c-28)/2;u.forEach(([e,t],n)=>{let r=n%2,i=Math.floor(n/2),o=14+r*d,s=l+i*6;a.setFont(`helvetica`,`normal`),a.text(`${e} : `,o,s);let c=a.getTextWidth(`${e} : `);a.setFont(`helvetica`,`bold`),a.text(m(t),o+c,s)}),l+=Math.ceil(u.length/2)*6+6,s(a,{startY:l,margin:{left:14,right:14},styles:{font:`helvetica`,fontSize:9,cellPadding:2.2,lineColor:[40,40,40],lineWidth:.2,textColor:[20,20,20]},headStyles:{fillColor:[244,244,245],textColor:[20,20,20],fontStyle:`bold`,halign:`center`},columnStyles:{0:{halign:`left`,cellWidth:55},1:{halign:`center`},2:{halign:`center`},3:{halign:`center`},4:{halign:`center`},5:{halign:`center`}},head:[[`Matière`,`Moyenne de classe`,`Composition`,`Moyenne`,`Coefficient`,`Moyenne finale`]],body:t.lines.map(e=>[e.name.toUpperCase(),f(e.devoir),f(e.composition),f(e.average),String(e.coefficient),f(e.weighted)])}),l=(a.lastAutoTable?.finalY??l+40)+10;let h=c/2+4;a.setFontSize(10),a.setFont(`helvetica`,`normal`),a.text(`Mention : `,14,l),a.setFont(`helvetica`,`bold`),a.text(t.mention??``,14+a.getTextWidth(`Mention : `),l),a.setFont(`helvetica`,`normal`),a.text(`Total général : `,h,l),a.setFont(`helvetica`,`bold`),a.text(v(t),h+a.getTextWidth(`Total général : `),l),l+=6,a.setFont(`helvetica`,`normal`),a.text(`Résultat : `,14,l),a.setFont(`helvetica`,`bold`),a.text(t.result??``,14+a.getTextWidth(`Résultat : `),l),a.setFont(`helvetica`,`normal`),a.text(`Moyenne : `,h,l),a.setFont(`helvetica`,`bold`),a.text(y(t),h+a.getTextWidth(`Moyenne : `),l),l+=6,a.setFont(`helvetica`,`normal`),a.text(`Rang : `,14,l),a.setFont(`helvetica`,`bold`),a.text(p(t.rank,t.classSize),14+a.getTextWidth(`Rang : `),l),a.setFont(`helvetica`,`normal`),a.text(`Fait à ${t.profile.city} le, ${t.issuedOn}`,h,l),l+=6,a.setFont(`helvetica`,`normal`),a.text(`Appréciation : `,14,l),a.setFont(`helvetica`,`bold`);let g=a.splitTextToSize(t.appreciation||``,c/2-14-4);a.text(g,14+a.getTextWidth(`Appréciation : `),l),l=Math.max(l+g.length*5,l+16),a.setFont(`helvetica`,`normal`),a.text(`Le Directeur`,h,l),l+=12,a.setFont(`helvetica`,`bold`),a.text(m(t.profile.directorName),h,l);let b=a.internal.pageSize.getHeight(),x=1.2,S=b-x,C=300/900*c,w=600/900*c,T=288/900*c,E=588/900*c,D=600/900*c,O=588/900*c;a.setFillColor(0,149,67),a.rect(0,S,c,x,`F`),a.setFillColor(220,36,31),a.lines([[c-D,0],[0,x],[O-c,0],[0,-1.2]],D,S,[1,1],`F`,!0),a.setFillColor(252,209,22),a.lines([[w-C,0],[E-w,x],[T-E,0],[C-T,-1.2]],C,S,[1,1],`F`,!0),a.save(i.endsWith(`.pdf`)?i:`${i}.pdf`)}function x(t,i){let a=g(t.profile.logoUrl),o=g(t.profile.stampUrl),s=t.lines.map(e=>`<tr>
  <td class="subject">${h(e.name)}</td>
  <td class="c">${h(f(e.devoir))}</td>
  <td class="c">${h(f(e.composition))}</td>
  <td class="c">${h(f(e.average))}</td>
  <td class="c">${e.coefficient}</td>
  <td class="c">${h(f(e.weighted))}</td>
</tr>`).join(``),c=_(t).map(([e,t])=>`<p>${h(e)}<span class="sep">:</span><strong>${h(t)}</strong></p>`).join(``);return`
<header class="top">
  ${`
  <div class="letterhead">
    ${a?`<img src="${h(a)}" alt="" class="logo" />`:``}
    <p class="school">${h(t.profile.name)}</p>
    ${t.profile.motto?`<p class="motto">${h(t.profile.motto)}</p>`:``}
    ${t.profile.phone?`<p>Tél. : ${h(t.profile.phone)}</p>`:``}
    ${t.profile.email?`<p>E-mail : ${h(t.profile.email)}</p>`:``}
    ${t.profile.address?`<p>${h(t.profile.address)}</p>`:``}
    <p>${h(t.profile.city)}, ${h(n)}</p>
  </div>`}
  <div class="country">
    <p class="strong">${h(e)}</p>
    <p>${h(r)}</p>
    <p class="rule">-------</p>
    <p class="year">Année scolaire ${h(t.yearLabel)}</p>
  </div>
</header>
<h1>Bulletin de notes</h1>
<section class="identity">${c}</section>
<table>
  <thead>
    <tr>
      <th class="left">Matière</th>
      <th>Moyenne de classe</th>
      <th>Composition</th>
      <th>Moyenne</th>
      <th>Coefficient</th>
      <th>Moyenne finale</th>
    </tr>
  </thead>
  <tbody>${s}</tbody>
</table>
<section class="summary">
  <div>
    <p>Mention : <strong>${h(t.mention??``)}</strong></p>
    <p>Résultat : <strong>${h(t.result??``)}</strong></p>
    <p>Rang : <strong>${h(p(t.rank,t.classSize))}</strong></p>
    <p>Appréciation : <strong>${h(t.appreciation||``)}</strong></p>
  </div>
  <div>
    <p>Total général : <strong>${h(v(t))}</strong></p>
    <p>Moyenne : <strong>${h(y(t))}</strong></p>
    <p>Fait à ${h(t.profile.city)} le, ${h(t.issuedOn)}</p>
    ${o?`<img src="${h(o)}" alt="Cachet et signature" class="stamp" />`:``}
    <p class="director">Le Directeur<br /><strong>${h(t.profile.directorName)}</strong></p>
  </div>
</section>
${i?d(i):``}`}async function S(e){if(e?.verifyUrl)return e.verifyUrl;if(!e?.authenticity?.studentId)return null;try{return(await c(i.url(),{method:`POST`,body:{type:`bulletin`,studentId:e.authenticity.studentId,termId:e.authenticity.termId??null,academicYearId:e.authenticity.academicYearId??null,issuedOn:e.authenticity.issuedOn??new Date().toISOString().slice(0,10)}})).url}catch{return null}}async function C(e,t,n){let r=await S(n),i=`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${h(e)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 210mm;
    min-height: 297mm;
    background: #fff;
  }
  body {
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #000;
    position: relative;
    padding: 12mm 12mm 28mm;
  }
  .sheet {
    min-height: calc(297mm - 40mm);
  }
  .top {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    align-items: start;
  }
  .letterhead {
    text-align: center;
    font-size: 12px;
    line-height: 1.45;
  }
  .letterhead p { margin: 0; }
  .logo {
    display: block;
    margin: 0 auto 8px;
    height: 96px;
    width: 128px;
    object-fit: contain;
  }
  .school {
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
  }
  .motto { font-size: 13px; font-weight: 500; }
  .country {
    text-align: center;
    font-size: 12px;
    line-height: 1.45;
  }
  .country p { margin: 0; }
  .strong {
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
  }
  .rule { margin: 4px 0 !important; }
  .year {
    margin-top: 40px !important;
    font-size: 13px;
    font-weight: 500;
  }
  h1 {
    text-align: center;
    font-size: 22px;
    font-weight: 700;
    text-transform: uppercase;
    margin: 32px 0 24px;
  }
  .identity {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 32px;
    row-gap: 4px;
    font-size: 14px;
    margin-bottom: 24px;
  }
  .identity p { margin: 0; }
  .sep { margin: 0 8px; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th, td {
    border: 1px solid #000;
    padding: 6px 8px;
  }
  th {
    background: #f4f4f5;
    font-weight: 600;
  }
  th.left { text-align: left; }
  td.subject { text-transform: uppercase; }
  td.c { text-align: center; }
  .summary {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    margin-top: 32px;
    font-size: 14px;
  }
  .summary p { margin: 0 0 12px; }
  .stamp {
    display: block;
    margin-top: 16px;
    height: 96px;
    width: 160px;
    object-fit: contain;
  }
  .director { margin-top: 24px !important; padding-top: 8px; }
  .authenticity {
    position: absolute;
    left: 12mm;
    bottom: 8mm;
    width: 44mm;
  }
  .authenticity p {
    margin: 4px 0 0;
    font-size: 8px;
    line-height: 1.2;
    color: rgba(0,0,0,0.7);
    white-space: nowrap;
  }
  .pied {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    width: 210mm;
    margin: 0;
    padding: 0;
    line-height: 0;
  }
  .pied svg,
  .pied .document-pied-svg {
    display: block;
    width: 100%;
    height: 4px;
  }
</style>
</head>
<body>
<div class="sheet">
${x(t,r)}
</div>
<footer class="pied">
  ${u()}
</footer>
</body>
</html>`,a=new Blob([i],{type:`text/html;charset=utf-8`}),o=URL.createObjectURL(a),s=window.open(o,`_blank`);if(!s){URL.revokeObjectURL(o);return}let c=!1,l=()=>{c||(c=!0,s.focus(),s.print(),window.setTimeout(()=>URL.revokeObjectURL(o),6e4))};s.addEventListener(`load`,l),window.setTimeout(()=>{try{s.document?.readyState===`complete`&&l()}catch{}},250)}export{C as n,b as t};