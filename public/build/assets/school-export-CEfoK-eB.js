function e(e){return e.replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&apos;`)}function t(t){return t==null||t===``?`<Cell/>`:typeof t==`number`&&Number.isFinite(t)?`<Cell><Data ss:Type="Number">${t}</Data></Cell>`:typeof t==`boolean`?`<Cell><Data ss:Type="Boolean">${+!!t}</Data></Cell>`:`<Cell><Data ss:Type="String">${e(String(t))}</Data></Cell>`}function n(n){return`<Worksheet ss:Name="${e((n.name??`Données`).slice(0,31))}"><Table>${`<Row>${n.headers.map(e=>t(e)).join(``)}</Row>`}${n.rows.map(e=>`<Row>${e.map(e=>t(e)).join(``)}</Row>`).join(``)}</Table></Worksheet>`}function r(e,t,n=`text/plain;charset=utf-8`){let r=new Blob([t],{type:n}),i=URL.createObjectURL(r),a=document.createElement(`a`);a.href=i,a.download=e,a.click(),URL.revokeObjectURL(i)}function i(e,t){let i=Array.isArray(t)?t:[t];r(e.toLowerCase().endsWith(`.xls`)?e:`${e.replace(/\.xlsx$/i,``)}.xls`,`<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
${i.map(e=>n(e)).join(`
`)}
</Workbook>`,`application/vnd.ms-excel;charset=utf-8`)}function a(e){return`${e.toLowerCase().normalize(`NFD`).replace(/[\u0300-\u036f]/g,``).replace(/[^a-z0-9]+/g,`-`).replace(/^-+|-+$/g,``)||`export`}.xls`}function o(e){let t=e.cloneNode(!0);return t.querySelectorAll(`button, svg, [data-slot="dropdown-menu"], .sr-only`).forEach(e=>e.remove()),(t.textContent??``).replace(/\s+/g,` `).trim()}function s(e,t){let n=e.toLowerCase();return n===``||n===`actions`||n.includes(`action`)?!0:t.every(e=>e===``)}function c(e,t=`Données`){let n=Array.from(e.querySelectorAll(`thead th`)).map(e=>o(e));if(n.length===0)return null;let r=Array.from(e.querySelectorAll(`tbody tr`)).map(e=>Array.from(e.querySelectorAll(`td`)).map(e=>o(e))),i=n.map((e,t)=>!s(e,r.map(e=>e[t]??``)));return{name:t,headers:n.filter((e,t)=>i[t]),rows:r.map(e=>e.filter((e,t)=>i[t]))}}function l(e,t,n=`Données`){let r=c(e,n);return!r||r.headers.length===0?!1:(i(t,r),!0)}function u(e){return e.replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`)}function d(e){let t=document.createElement(`iframe`);t.setAttribute(`aria-hidden`,`true`),t.setAttribute(`title`,`Impression`),t.style.cssText=`position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:-1;visibility:hidden;`;let n=!1,r=()=>{t.remove()};t.addEventListener(`load`,()=>{if(n)return;n=!0;let e=t.contentWindow,i=t.contentDocument;if(!e||!i){r();return}let a=Array.from(i.images),o=Array.from(i.querySelectorAll(`link[rel="stylesheet"]`));Promise.all([...a.map(e=>new Promise(t=>{if(e.complete){t();return}e.addEventListener(`load`,()=>t(),{once:!0}),e.addEventListener(`error`,()=>t(),{once:!0})})),...o.map(e=>new Promise(t=>{let n=e;if(n.sheet){t();return}n.addEventListener(`load`,()=>t(),{once:!0}),n.addEventListener(`error`,()=>t(),{once:!0})}))]).then(()=>{window.setTimeout(()=>{e.focus(),e.print(),e.addEventListener(`afterprint`,r,{once:!0}),window.setTimeout(r,6e4)},100)})}),document.body.appendChild(t),t.srcdoc=e}function f(){return Array.from(document.querySelectorAll(`link[rel="stylesheet"], style`)).map(e=>{if(e instanceof HTMLLinkElement){let t=new URL(e.href,window.location.href).href;return`<link rel="stylesheet" href="${u(t)}" />`}return e.outerHTML}).join(`
`)}function p(e,t){d(`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${u(e)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #111;
    background: #fff;
  }
  h1 { font-size: 18px; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td {
    border: 1px solid #d4d4d8;
    padding: 6px 8px;
    text-align: left;
    font-size: 12px;
  }
  th { background: #f4f4f5; font-weight: 600; }
  .meta { color: #52525b; font-size: 12px; margin: 0 0 4px; }
</style>
</head>
<body>
${t}
</body>
</html>`)}function m(e,t,n){let r=t.cloneNode(!0);r.querySelectorAll(`.no-print`).forEach(e=>e.remove()),r.querySelectorAll(`img[src]`).forEach(e=>{let t=e,n=t.getAttribute(`src`);n&&!n.startsWith(`data:`)&&!n.startsWith(`blob:`)&&t.setAttribute(`src`,new URL(n,window.location.href).href)});let i=n?.pageSize??(n?.landscape?`A4 landscape`:`A4`);d(`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${u(e)}</title>
${f()}
<style>
  @page { size: ${i}; margin: 0; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    color: #000 !important;
  }
  body {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }
  .no-print { display: none !important; }
  [data-print-only] { display: block !important; }
  .print-bulletin {
    max-width: none !important;
    margin: 0 !important;
    box-shadow: none !important;
    border: none !important;
  }
  [data-print-root="id-card"] {
    box-shadow: none !important;
    break-inside: avoid;
  }
</style>
</head>
<body>
${r.outerHTML}
</body>
</html>`)}export{p as a,m as i,l as n,a as r,i as t};