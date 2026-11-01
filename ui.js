'use strict';
/* ===== navigation & modal ===== */
let VIEW = 'home';
function show(v) {
  VIEW = v;
  $$('.view').forEach(x => x.classList.toggle('active', x.id === 'v-' + v));
  $$('nav.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === v || (v === 'edit' && b.dataset.tab === 'docs')));
  window.scrollTo(0, 0);
  ({ home: renderHome, docs: renderDocs, cust: renderCust, items: renderItems, set: renderSettings, edit: renderEditor })[v]();
}
$$('nav.tabs button').forEach(b => b.onclick = () => { if (VIEW === 'edit') leaveEditor(true); show(b.dataset.tab); });
function openModal(title, html) { $('#mt').textContent = title; $('#mb').innerHTML = html; $('#modal').hidden = false; $('#mb').scrollTop = 0; }
function closeModal() { $('#modal').hidden = true; $('#mb').innerHTML = ''; }
$('#mx').onclick = closeModal; $('.mbg').onclick = closeModal;
const opt = (v, t, sel) => `<option value="${esc(v)}" ${String(sel) === String(v) ? 'selected' : ''}>${esc(t)}</option>`;
const curOpts = sel => Object.keys(CUR).map(c => opt(c, c + ' ' + CUR[c].sym, sel)).join('');

/* ===== documents: helpers ===== */
const curDoc = () => S.docs.find(d => d.id === S.cur);
let saveT;
function touch() { const d = curDoc(); if (!d) return; clearTimeout(saveT); saveT = setTimeout(persist.docs, 250); $('#ed-totals').innerHTML = totalsHTML(d); renderSheet(); }
function partyName(d) { if (d.type === 'po') { const v = vendOf(d); return v ? v.company : ''; } const c = custOf(d); return c ? c.company : ''; }
function docRow(d) {
  const t = totals(d), T = TYPES[d.type];
  const amt = d.type === 'receipt' ? num(d.amount) : t.total;
  const st = d.type === 'invoice' ? invStatus(d) : d.type === 'receipt' ? '' : d.status;
  return `<div class="item dr" data-open="${d.id}"><div class="nm"><b>${esc(d.no)}</b> <span class="tag">${T.n}</span><small>${esc(partyName(d) || 'No customer yet')} · ${fmtDate(d.date)}${d.lpoNo ? ' · LPO ' + esc(d.lpoNo) : ''}</small></div>
    <div class="rt"><b>${mon(amt, d.cur)}</b>${st ? `<span class="st st-${esc(String(st).replace(/\s/g, ''))}">${esc(st)}</span>` : ''}</div></div>`;
}

/* ===== HOME ===== */
function renderHome() {
  const invs = S.docs.filter(d => d.type === 'invoice');
  const out = invs.reduce((s, d) => s + Math.max(0, totals(d).balance) * num(d.rate), 0);
  const month = today().slice(0, 7);
  const sales = invs.filter(d => d.date.startsWith(month)).reduce((s, d) => s + totals(d).total * num(d.rate), 0);
  const openQ = S.docs.filter(d => d.type === 'quote' && ['draft', 'sent'].includes(d.status)).length;
  const recent = S.docs.slice().sort((a, b) => b.created - a.created).slice(0, 6);
  const fx = S.settings.fx;
  const lastB = load('lastBackup', 0), days = lastB ? Math.floor((Date.now() - lastB) / 864e5) : null;
  $('#v-home').innerHTML = `
    <div class="card hero"><img src="${IMG.emblem}" alt=""><div><h2>${esc(S.settings.company)}</h2><div class="hint">Quotations · Proforma · Invoices · Receipts · Purchase orders</div></div></div>
    <div class="qa">${['quote', 'proforma', 'invoice', 'po', 'dn'].map(t => `<button class="btn ${t === 'quote' ? 'pri' : ''}" data-new="${t}">+ ${TYPES[t].n}</button>`).join('')}</div>
    <div class="kpis"><div class="kpi"><small>Outstanding invoices</small><b>${mon(out)}</b></div><div class="kpi"><small>Invoiced this month</small><b>${mon(sales)}</b></div>
      <div class="kpi"><small>Open quotations</small><b>${openQ}</b></div><div class="kpi"><small>Documents</small><b>${S.docs.length}</b></div></div>
    <div class="card"><h2>Recent documents</h2>${recent.length ? recent.map(docRow).join('') : '<p class="hint">Nothing yet – tap "+ Quotation" to start.</p>'}</div>
    <div class="card"><h2>Exchange rates (₦ per unit)</h2><div class="rates">${['USD', 'GBP', 'EUR', 'CNY', 'INR'].map(c => `<span><b>${c}</b> ${f2(fx[c])}</span>`).join('')}</div>
      <div class="hint">Rates drive import pricing and foreign-currency documents. <a href="#" data-goto="set">Update in Settings</a></div></div>
    ${days === null || days > 14 ? `<div class="card warn">${days === null ? 'You have not backed up yet.' : `Last backup was ${days} days ago.`} Data is kept on this phone only – <a href="#" data-goto="set">make a backup now</a>.</div>` : ''}`;
}
document.addEventListener('click', e => {
  const n = e.target.closest('[data-new]'); if (n) { createDoc(n.dataset.new); return; }
  const o = e.target.closest('[data-open]'); if (o) { openDoc(o.dataset.open); return; }
  const g = e.target.closest('[data-goto]'); if (g) { e.preventDefault(); show(g.dataset.goto); }
});

/* ===== DOCUMENT LIST ===== */
const DF = { type: 'all', q: '' };
function renderDocs() {
  $('#v-docs').innerHTML = `<div class="card"><h2>Documents</h2>
    <div class="btns" style="margin:0 0 8px">${['quote', 'proforma', 'invoice', 'po', 'dn'].map(t => `<button class="btn sm ${t === 'quote' ? 'pri' : 'ghost'}" data-new="${t}">+ ${TYPES[t].n}</button>`).join('')}</div>
    <input id="d-q" type="search" placeholder="Search number, customer, LPO…" value="${esc(DF.q)}">
    <div class="chips">${[['all', 'All']].concat(Object.keys(TYPES).map(t => [t, TYPES[t].n])).map(c => `<button class="chip ${DF.type === c[0] ? 'on' : ''}" data-ft="${c[0]}">${c[1]}</button>`).join('')}</div>
    <div id="d-list"></div></div>`;
  $('#d-q').oninput = e => { DF.q = e.target.value; listDocs(); };
  $('#v-docs').onclick = e => { const c = e.target.closest('[data-ft]'); if (c) { DF.type = c.dataset.ft; renderDocs(); } };
  listDocs();
}
function listDocs() {
  const q = DF.q.toLowerCase();
  const l = S.docs.filter(d => (DF.type === 'all' || d.type === DF.type) && (!q || (d.no + ' ' + partyName(d) + ' ' + d.lpoNo + ' ' + d.rfqNo).toLowerCase().includes(q))).sort((a, b) => b.created - a.created);
  $('#d-list').innerHTML = l.length ? l.map(docRow).join('') : '<p class="hint">No documents match.</p>';
}

/* ===== DOCUMENT EDITOR ===== */
function createDoc(type) {
  const d = newDoc(type);
  if (type === 'po') { d.cur = 'USD'; d.rate = S.settings.fx.USD; }
  S.docs.push(d); persist.docs(); openDoc(d.id);
}
function openDoc(id) { S.cur = id; show('edit'); }
function isEmpty(d) { return d.type === 'receipt' ? !num(d.amount) : (!d.lines.length && !d.custId && !d.vendId); }
function leaveEditor(keepCur) {
  const d = curDoc();
  if (d && isEmpty(d)) { S.docs = S.docs.filter(x => x.id !== d.id); if (S.counters[d.type] === d.seq) S.counters[d.type]--; persist.counters(); S.cur = null; }
  persist.docs();
}
const STATUS = { quote: ['draft', 'sent', 'accepted', 'lost'], proforma: ['draft', 'sent', 'confirmed', 'cancelled'], po: ['draft', 'issued', 'received'], dn: ['draft', 'delivered'] };
const fI = (d, f, label, type = 'text', extra = '') => `<div class="f"><label>${label}</label><input data-f="${f}" type="${type}" value="${esc(getPath(d, f))}" ${extra}></div>`;

function renderEditor() {
  const d = curDoc(); if (!d) { show('docs'); return; }
  const T = TYPES[d.type];
  const conv = { quote: [['proforma', '→ Proforma'], ['invoice', '→ Invoice'], ['po', '→ Purchase order']], proforma: [['invoice', '→ Invoice'], ['dn', '→ Delivery note']], invoice: [['dn', '→ Delivery note']], po: [], dn: [], receipt: [] }[d.type];
  $('#ed-top').innerHTML = `<div class="edtop"><button class="btn sm ghost" id="ed-back">← Back</button><div class="tt"><b>${T.n}</b><small>${esc(d.no)}</small></div><button class="btn sm" id="ed-print">Print</button></div>
    <div class="btns" style="margin:8px 0 0"><button class="btn pri sm" id="ed-pdf">⬇ Download PDF</button><button class="btn dark sm" id="ed-img">🖼 Save image</button><button class="btn sm" id="ed-share">Share PDF</button></div>
    <div class="btns" style="margin:8px 0 0">${conv.map(c => `<button class="btn sm" data-conv="${c[0]}">${c[1]}</button>`).join('')}
    <button class="btn sm ghost" id="ed-dup">Duplicate</button>${d.type === 'receipt' && d.invId ? '<button class="btn sm" id="ed-inv">Open invoice</button>' : ''}<button class="btn sm ghost danger" id="ed-del">Delete</button></div>`;
  $('#ed-form').innerHTML = editorHTML(d);
  $('#ed-totals').innerHTML = totalsHTML(d);
  renderSheet();
}
function editorHTML(d) {
  const s = S.settings, T = d.type, c = custOf(d);
  let h = '';
  /* A. document */
  h += `<div class="card"><h2>${TYPES[T].n} details</h2><div class="grid2">${fI(d, 'no', 'Number')}${fI(d, 'date', 'Date', 'date')}</div>`;
  if (STATUS[T]) h += `<div class="f"><label>Status</label><select data-f="status">${STATUS[T].map(x => opt(x, x, d.status)).join('')}</select></div>`;
  if (T === 'quote' || T === 'proforma') h += fI(d, 'validDays', 'Valid for (days)', 'number');
  h += '</div>';

  /* B. party */
  if (T === 'po') {
    const v = vendOf(d);
    h += `<div class="card"><h2>Vendor</h2><div class="f"><label>Supplier</label><select data-f="vendId">${opt('', '— select vendor —', d.vendId)}${S.vendors.slice().sort((a, b) => a.company.localeCompare(b.company)).map(x => opt(x.id, `${x.company} (${x.country})`, d.vendId)).join('')}</select></div>
      <div class="btns" style="margin:0 0 8px"><button class="btn sm ghost" id="ven-new">+ New vendor</button></div>
      <div class="grid2"><div class="f"><label>Incoterm</label><select data-f="incoterm">${['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP'].map(x => opt(x, x, d.incoterm)).join('')}</select></div>${fI(d, 'delivery', 'Delivery / ship by')}</div>
      <div class="f"><label>Ship to (blank = our head office)</label><textarea data-f="shipTo" rows="2">${esc(d.shipTo)}</textarea></div></div>`;
  } else {
    const reps = c ? c.reps : [];
    h += `<div class="card"><h2>Customer</h2><div class="f"><label>Company</label><select data-f="custId">${opt('', '— select customer —', d.custId)}${S.customers.slice().sort((a, b) => a.company.localeCompare(b.company)).map(x => opt(x.id, x.company, d.custId)).join('')}</select></div>
      <div class="btns" style="margin:0 0 8px"><button class="btn sm ghost" id="cus-new">+ New customer</button>${c ? '<button class="btn sm ghost" id="cus-edit">Edit customer</button>' : ''}</div>
      <div class="f"><label>Representative</label><select data-f="repId">${opt('', reps.length ? '— select representative —' : '(no representatives saved)', d.repId)}${reps.map(r => opt(r.id, `${r.name}${r.title ? ' – ' + r.title : ''}`, d.repId)).join('')}</select></div>
      ${fI(d, 'dept', 'Department of end user / who sent the RFQ')}`;
    if (T !== 'receipt') {
      h += `<div class="grid2">${fI(d, 'rfqNo', 'RFQ number')}${fI(d, 'rfqDate', 'RFQ date', 'date')}</div><div class="grid2">${fI(d, 'lpoNo', 'LPO number')}${fI(d, 'lpoDate', 'LPO date', 'date')}</div>`;
    }
    h += '</div>';
  }

  /* receipt */
  if (T === 'receipt') {
    h += `<div class="card"><h2>Payment received</h2><div class="grid2">${fI(d, 'amount', 'Amount received', 'number', 'inputmode="decimal"')}<div class="f"><label>Currency</label><select data-f="cur">${curOpts(d.cur)}</select></div></div>
      <div class="grid2"><div class="f"><label>Method</label><select data-f="method">${['Transfer', 'Cash', 'Cheque', 'POS', 'Other'].map(x => opt(x, x, d.method)).join('')}</select></div>${fI(d, 'ref', 'Reference / teller no.')}</div>
      <div class="f"><label>Notes</label><textarea data-f="notes" rows="2">${esc(d.notes)}</textarea></div></div>`;
    h += '<div id="ed-totals" class="card"></div>';
    return h;
  }

  /* lines */
  h += `<div class="card"><h2>Items</h2><div id="lines">${linesHTML(d)}</div>
    <div class="f"><label>Quick add from catalogue</label><input id="qs" type="search" placeholder="Type to search e.g. chint 32A, 4V210, S7-1200…"></div><div id="qr"></div>
    <div class="btns"><button class="btn sm dark" id="ln-browse">Browse catalogue / cables</button><button class="btn sm ghost" id="ln-custom">+ Custom line</button></div></div>`;

  if (T === 'dn') {
    h += `<div class="card"><h2>Delivery</h2><div class="grid2">${fI(d, 'vehicle', 'Vehicle number')}${fI(d, 'driver', 'Driver')}</div>${fI(d, 'ref', 'Invoice reference')}</div>`;
    h += `<div class="card"><div class="f"><label>Notes</label><textarea data-f="notes" rows="2">${esc(d.notes)}</textarea></div></div><div id="ed-totals" class="card"></div>`;
    return h;
  }

  /* charges */
  const f = d.frt;
  h += `<div class="card"><h2>${T === 'po' ? 'Currency & charges' : 'Tax, freight & currency'}</h2>
    <div class="grid2"><div class="f"><label>Currency</label><select data-f="cur">${curOpts(d.cur)}</select></div>${fI(d, 'rate', '₦ per 1 ' + d.cur, 'number', 'inputmode="decimal"')}</div>
    <div class="grid2">${fI(d, 'disc', 'Overall discount %', 'number', 'inputmode="decimal"')}<div class="f"><label>Freight</label><select data-f="frt.mode">${[['none', 'None'], ['fixed', 'Fixed amount'], ['qty', 'By quantity (per unit)'], ['value', 'By value (% of items)']].map(x => opt(x[0], x[1], f.mode)).join('')}</select></div></div>`;
  if (f.mode === 'fixed') h += fI(d, 'frt.amt', 'Freight amount (' + d.cur + ')', 'number', 'inputmode="decimal"');
  if (f.mode === 'qty') h += fI(d, 'frt.rate', 'Freight per unit (' + d.cur + ') × total quantity', 'number', 'inputmode="decimal"');
  if (f.mode === 'value') h += fI(d, 'frt.pct', 'Freight as % of item value', 'number', 'inputmode="decimal"');
  if (f.mode !== 'none' && T !== 'po') h += `<label class="chk"><input type="checkbox" data-f="frt.taxable" ${f.taxable !== false ? 'checked' : ''}><span>Charge VAT on freight</span></label>`;
  if (T !== 'po') {
    h += `<div class="f" style="margin-top:8px"><label>VAT / tax treatment</label><select data-f="vat">${s.vats.map(v => opt(v.id, v.name, d.vat)).join('')}</select></div>
      <div class="f"><label>Withholding tax (customer deducts)</label><select data-f="wht">${[0, 2, 5, 10].map(x => opt(x, x ? x + '% WHT' : 'None', d.wht)).join('')}</select></div>`;
  }
  if (T === 'invoice') h += `<div class="grid2"><div class="f"><label>Payment type</label><select data-f="payType">${opt('credit', 'Credit', d.payType)}${opt('cash', 'Cash', d.payType)}</select></div>${fI(d, 'creditDays', 'Credit days', 'number')}</div>`;
  h += '</div>';

  /* payments */
  if (T === 'invoice') {
    const t = totals(d);
    h += `<div class="card"><h2>Payments &amp; receipts</h2>${(d.payments || []).map(p => `<div class="item"><div class="nm">${mon(num(p.amt), d.cur)}<small>${fmtDate(p.date)} · ${esc(p.method)}${p.ref ? ' · ' + esc(p.ref) : ''}</small></div>${p.rcpt ? `<button class="btn sm" data-open="${p.rcpt}">Receipt</button>` : ''}</div>`).join('') || '<p class="hint">No payments recorded.</p>'}
      <div class="grid2" style="margin-top:8px"><div class="f"><label>Amount</label><input id="pay-amt" type="number" inputmode="decimal" value="${Math.max(0, Math.round(t.balance * 100) / 100)}"></div><div class="f"><label>Date</label><input id="pay-date" type="date" value="${today()}"></div></div>
      <div class="grid2"><div class="f"><label>Method</label><select id="pay-method">${['Transfer', 'Cash', 'Cheque', 'POS'].map(x => opt(x, x)).join('')}</select></div><div class="f"><label>Reference</label><input id="pay-ref"></div></div>
      <button class="btn dark" id="pay-go">Record payment &amp; make receipt</button></div>`;
  }
  h += `<div class="card"><div class="f"><label>Terms &amp; conditions (printed)</label><textarea data-f="terms" rows="4">${esc(d.terms)}</textarea></div><div class="f"><label>Notes (printed)</label><textarea data-f="notes" rows="2">${esc(d.notes)}</textarea></div></div><div id="ed-totals" class="card"></div>`;
  return h;
}
function linesHTML(d) {
  const po = d.type === 'po', dn = d.type === 'dn';
  return d.lines.length ? d.lines.map((l, i) => `<div class="ln"><textarea class="nm" rows="2" data-f="lines.${i}.d" aria-label="Description">${esc(l.d)}</textarea>
    <div class="r2${dn ? ' dn' : ''}"><div><label>Qty</label><input type="number" step="any" inputmode="decimal" data-f="lines.${i}.qty" value="${esc(l.qty)}"></div><div><label>Unit</label><input data-f="lines.${i}.unit" value="${esc(l.unit)}"></div>
    ${dn ? '' : `<div><label>${po ? 'Unit cost' : 'Rate'}</label><input type="number" inputmode="decimal" data-f="lines.${i}.price" value="${esc(l.price)}"></div>
    ${po ? '' : `<div><label>Disc %</label><input type="number" inputmode="decimal" data-f="lines.${i}.disc" value="${esc(l.disc)}"></div>`}
    <div class="am"><label>Amount</label><b id="la-${i}">${f2(num(l.qty) * num(l.price) * (1 - num(l.disc) / 100))}</b></div>`}
    <button class="btn sm ghost danger" data-rl="${i}" aria-label="Remove line">✕</button></div>
    ${!dn && !po ? `<label class="chk sm"><input type="checkbox" data-f="lines.${i}.exempt" ${l.exempt ? 'checked' : ''}><span>VAT-exempt line</span></label>` : ''}</div>`).join('')
    : '<p class="hint">No items yet. Use quick add, or browse the catalogue.</p>';
}
function totalsHTML(d) {
  if (d.type === 'receipt') {
    const inv = S.docs.find(x => x.id === d.invId), t = inv ? totals(inv) : null;
    return `<h2>Receipt summary</h2><div class="trow"><span>Received</span><b>${mon(num(d.amount), d.cur)}</b></div>${t ? `<div class="trow"><span>Invoice ${esc(inv.no)} balance</span><b>${mon(Math.max(0, t.balance), inv.cur)}</b></div>` : ''}`;
  }
  if (d.type === 'dn') return `<h2>Delivery note</h2><div class="trow"><span>Lines</span><b>${d.lines.length}</b></div><div class="trow"><span>Total quantity</span><b>${f2(totals(d).qty).replace('.00', '')}</b></div>`;
  const t = totals(d), cur = d.cur, vo = t.vatObj;
  const r = (a, b, c) => `<div class="trow ${c || ''}"><span>${a}</span><b>${b}</b></div>`;
  return `<h2>Totals</h2>${r('Sub-total', mon(t.sub, cur))}${t.dsc ? r('Discount', '-' + mon(t.dsc, cur)) : ''}${t.frt ? r(frtLabel(d), mon(t.frt, cur)) : ''}
    ${d.type !== 'po' ? (vo.exempt ? r('VAT', 'Exempt') : r(esc(vo.name) + (vo.mode === 'incl' ? ' (incl.)' : ''), mon(t.vat, cur))) : ''}${r('TOTAL', mon(t.total, cur), 'gt')}
    ${num(d.wht) ? r('Less WHT ' + d.wht + '%', '-' + mon(t.wht, cur)) + r('Net payable', mon(t.payable, cur)) : ''}${d.type === 'invoice' ? r('Paid', mon(t.paid, cur)) + r('Balance', mon(Math.max(0, t.balance), cur), 'gt') + `<div class="hint">Status: ${invStatus(d)}</div>` : ''}
    ${cur !== 'NGN' ? `<div class="hint">≈ ${mon(t.total * num(d.rate))} at ₦${f2(num(d.rate))} per ${cur}</div>` : ''}`;
}

/* preview scaling + print */
function renderSheet() {
  const d = curDoc(); if (!d) return;
  const sh = $('#sheet'), lh = S.settings.printStyle === 'letterhead';
  sh.className = lh ? 'lh-on' : '';
  sh.style.backgroundImage = lh ? `url(${IMG.letterhead})` : 'none';
  sh.innerHTML = sheetHTML(d); fitSheet();
}
function fitSheet() {
  const w = $('#sheetWrap'), sh = $('#sheet'); if (!w || !sh) return;
  const avail = w.clientWidth || 360, k = Math.min(1, avail / 794);
  sh.style.transform = `scale(${k})`; w.style.height = Math.ceil(sh.offsetHeight * k) + 'px';
}
window.addEventListener('resize', fitSheet);
function setPageStyle() { $('#pgstyle').textContent = S.settings.printStyle === 'letterhead' ? '@page{size:A4;margin:0}' : '@page{size:A4;margin:10mm}'; }
window.addEventListener('beforeprint', setPageStyle);
function doPrint() {
  const d = curDoc(); if (!d) return; setPageStyle();
  const old = document.title; document.title = d.no.replace(/\//g, '-') + (partyName(d) ? ' - ' + partyName(d) : '');
  window.onafterprint = () => { document.title = old; window.onafterprint = null; fitSheet(); };
  $('#sheet').style.transform = 'none'; $('#sheetWrap').style.height = 'auto';
  setTimeout(() => window.print(), 120);
}

/* editor events */
const EF = $('#ed-form');
EF.addEventListener('input', e => {
  const f = e.target.dataset.f; if (!f || f === 'cur') return; const d = curDoc();
  setPath(d, f, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
  const m = f.match(/^lines\.(\d+)\./);
  if (m) { const l = d.lines[m[1]], a = $('#la-' + m[1]); if (a) a.textContent = f2(num(l.qty) * num(l.price) * (1 - num(l.disc) / 100)); }
  touch();
});
EF.addEventListener('change', e => {
  const f = e.target.dataset.f; if (!f) return; const d = curDoc(), v = e.target.value;
  if (f === 'custId') { d.repId = ''; d.dept = ''; const c = custOf(d); if (c && c.reps.length === 1) { d.repId = c.reps[0].id; d.dept = c.reps[0].dept || ''; } renderEditor(); }
  else if (f === 'repId') { const r = repOf(d); d.dept = r ? r.dept || '' : ''; renderEditor(); }
  else if (f === 'vendId') { const vd = vendOf(d); if (vd && vd.cur && vd.cur !== d.cur) convertPrices(d, vd.cur); renderEditor(); }
  else if (f === 'cur') { convertPrices(d, v); renderEditor(); toast('Prices converted at ₦' + f2(d.rate) + ' per ' + d.cur); }
  else if (f === 'frt.mode') renderEditor();
  persist.docs();
});
EF.addEventListener('click', e => {
  const d = curDoc(), t = e.target;
  const rl = t.closest('[data-rl]'); if (rl) { d.lines.splice(+rl.dataset.rl, 1); $('#lines').innerHTML = linesHTML(d); touch(); return; }
  if (t.id === 'ln-custom') { d.lines.push({ d: 'Custom item', qty: 1, unit: 'pc', price: 0, disc: 0, exempt: false }); $('#lines').innerHTML = linesHTML(d); touch(); return; }
  if (t.id === 'ln-browse') { show('items'); return; }
  if (t.id === 'cus-new') { editCustomer(null, true); return; }
  if (t.id === 'cus-edit') { editCustomer(d.custId, true); return; }
  if (t.id === 'ven-new') { editVendor(null, true); return; }
  const q = t.closest('[data-qa]'); if (q) { addLine(d, lineFromItem(getItem(q.dataset.qa), d)); $('#lines').innerHTML = linesHTML(d); touch(); toast('Added'); return; }
  if (t.id === 'pay-go') recordPayment(d);
});
EF.addEventListener('input', e => {
  if (e.target.id !== 'qs') return; const q = e.target.value.trim().toLowerCase(), box = $('#qr');
  if (q.length < 2) { box.innerHTML = ''; return; }
  const parts = q.split(/\s+/), d = curDoc();
  const res = allItems().filter(i => { const hay = (i.name + ' ' + (i.brand || '')).toLowerCase(); return parts.every(p => hay.includes(p)); }).slice(0, 25);
  box.innerHTML = res.map(i => `<div class="item pick" data-qa="${i.id}"><div class="nm">${esc(i.name)}<small>${esc(i.brand || '')} · ${isImport(i) ? 'Import – ' + esc(i.org) : 'Shelf'}</small></div><b>${mon(sellPrice(i) / (num(d.rate) || 1), d.cur)}</b></div>`).join('') || '<p class="hint">No match – add a custom line.</p>';
});
$('#ed-top').addEventListener('click', e => {
  const d = curDoc(), t = e.target;
  if (t.id === 'ed-back') { leaveEditor(true); show('docs'); }
  else if (t.id === 'ed-print') doPrint();
  else if (t.id === 'ed-pdf') exportDoc('pdf');
  else if (t.id === 'ed-img') exportDoc('png');
  else if (t.id === 'ed-share') exportDoc('share');
  else if (t.id === 'ed-dup') { const n = convertDoc(d, d.type, true); toast('Duplicated as ' + n.no); }
  else if (t.id === 'ed-inv') openDoc(d.invId);
  else if (t.id === 'ed-del') { if (confirm('Delete ' + d.no + '?')) { S.docs = S.docs.filter(x => x.id !== d.id); persist.docs(); S.cur = null; show('docs'); } }
  else if (t.dataset.conv) { const n = convertDoc(d, t.dataset.conv); toast('Created ' + n.no); }
});
$('#ed-style').onchange = e => { S.settings.printStyle = e.target.value; persist.settings(); renderSheet(); };
$('#ed-sign').onchange = e => { S.settings.sign = e.target.value; persist.settings(); renderSheet(); };

/* ===== export: PDF / image of any document (quotation, proforma, invoice, receipt, PO, waybill / delivery note) ===== */
function exportEl(d) {
  const lh = S.settings.printStyle === 'letterhead', el = document.createElement('div'); el.id = 'sheet';
  if (lh) { el.innerHTML = sheetBody(d); el.style.padding = '0 18mm 14px 14mm'; } else el.innerHTML = sheetHTML(d);
  return el;
}
const exportOpts = () => S.settings.printStyle === 'letterhead' ? { bg: IMG.letterhead, top: 204, bottom: 98 } : {};
function exportName(d, ext) {
  const p = partyName(d).replace(/[^\w]+/g, '_').replace(/^_|_$/g, '');
  return TYPES[d.type].n.replace(/\s+/g, '-') + '-' + d.no.replace(/\//g, '-') + (p ? '-' + p : '') + '.' + ext;
}
async function exportDoc(kind) {
  const d = curDoc(); if (!d) return;
  const btns = $$('#ed-pdf,#ed-img,#ed-share'); btns.forEach(b => b.disabled = true);
  toast('Preparing ' + (kind === 'png' ? 'image' : 'PDF') + '…');
  try {
    const el = exportEl(d), o = exportOpts();
    if (kind === 'png') { const n = exportName(d, 'png'); VExport.save(await VExport.png(el, o), n); toast('Saved ' + n); }
    else {
      const n = exportName(d, 'pdf'), blob = await VExport.pdf(el, o);
      if (kind === 'share') { const ok = await VExport.share(blob, n, n); if (!ok) toast('Sharing not available here – PDF downloaded instead'); }
      else { VExport.save(blob, n); toast('Saved ' + n); }
    }
  } catch (e) { toast('Export is not supported in this browser – use Print, then Save as PDF'); }
  finally { btns.forEach(b => b.disabled = false); }
}
function convertDoc(d, type, dup) {
  const n = newDoc(type);
  Object.assign(n, { custId: d.custId, repId: d.repId, dept: d.dept, rfqNo: d.rfqNo, rfqDate: d.rfqDate, lpoNo: d.lpoNo, lpoDate: d.lpoDate, lines: clone(d.lines), notes: d.notes, from: d.id });
  if (dup || type !== 'po') Object.assign(n, { cur: d.cur, rate: d.rate, vat: d.vat, wht: d.wht, disc: d.disc, frt: clone(d.frt) });
  if (dup) Object.assign(n, { terms: d.terms, vendId: d.vendId, payType: d.payType, creditDays: d.creditDays, validDays: d.validDays, incoterm: d.incoterm, delivery: d.delivery, shipTo: d.shipTo });
  if (type === 'po' && !dup) {
    n.cur = 'USD'; n.rate = S.settings.fx.USD;
    n.lines = n.lines.map(l => { const it = l.itemId && getItem(l.itemId); return Object.assign({}, l, { price: it && isImport(it) && num(it.fob) ? Math.round(num(it.fob) * (S.settings.fx[it.cur || 'USD'] || 1) / n.rate * 100) / 100 : 0, disc: 0 }); });
  }
  if (type === 'dn' && d.type === 'invoice') n.ref = d.no;
  S.docs.push(n); persist.docs(); S.cur = n.id; renderEditor(); window.scrollTo(0, 0); return n;
}
function recordPayment(d) {
  const amt = num($('#pay-amt').value); if (amt <= 0) { toast('Enter the amount received'); return; }
  const r = newDoc('receipt');
  Object.assign(r, { custId: d.custId, repId: d.repId, cur: d.cur, rate: d.rate, invId: d.id, amount: amt, method: $('#pay-method').value, ref: $('#pay-ref').value, date: $('#pay-date').value || today() });
  d.payments.push({ id: uid(), date: r.date, amt, method: r.method, ref: r.ref, rcpt: r.id });
  S.docs.push(r); persist.docs(); toast('Receipt ' + r.no + ' created'); openDoc(r.id);
}

/* ===== CUSTOMERS & VENDORS ===== */
const CS = { sub: 'cust', q: '' };
function renderCust() {
  $('#v-cust').innerHTML = `<div class="card"><div class="seg"><button class="${CS.sub === 'cust' ? 'on' : ''}" data-sub="cust">Customers</button><button class="${CS.sub === 'vend' ? 'on' : ''}" data-sub="vend">Vendors / suppliers</button></div>
    <div class="btns" style="margin:10px 0 8px"><button class="btn dark sm" id="c-new">+ New ${CS.sub === 'cust' ? 'customer' : 'vendor'}</button></div>
    <input id="c-q" type="search" placeholder="Search…" value="${esc(CS.q)}"><div id="c-list"></div>
    <div class="hint" style="margin-top:8px">Entries marked SAMPLE are demo data – edit or delete them. <a href="#" id="c-clear">Delete all sample entries</a></div></div>`;
  $('#c-q').oninput = e => { CS.q = e.target.value; listCust(); };
  $('#v-cust').onclick = e => {
    const s = e.target.closest('[data-sub]'); if (s) { CS.sub = s.dataset.sub; renderCust(); return; }
    if (e.target.id === 'c-new') { CS.sub === 'cust' ? editCustomer(null) : editVendor(null); return; }
    if (e.target.id === 'c-clear') { e.preventDefault(); if (confirm('Delete all sample customers and vendors?')) { S.customers = S.customers.filter(x => !x.sample); S.vendors = S.vendors.filter(x => !x.sample); persist.customers(); persist.vendors(); renderCust(); } return; }
    const c = e.target.closest('[data-ec]'); if (c) editCustomer(c.dataset.ec); const v = e.target.closest('[data-ev]'); if (v) editVendor(v.dataset.ev);
  };
  listCust();
}
function listCust() {
  const q = CS.q.toLowerCase();
  if (CS.sub === 'cust') {
    const l = S.customers.filter(c => !q || (c.company + c.address + c.reps.map(r => r.name + r.dept).join(' ')).toLowerCase().includes(q)).sort((a, b) => a.company.localeCompare(b.company));
    $('#c-list').innerHTML = l.map(c => `<div class="cc"><div class="item" data-ec="${c.id}"><div class="nm"><b>${esc(c.company)}</b> ${c.sample ? '<span class="tag">SAMPLE</span>' : ''}<small>${esc(c.address)}</small></div><button class="btn sm ghost">Edit</button></div>
      ${c.reps.map(r => `<div class="rep"><b>${esc(r.name)}</b> <span>${esc(r.title)}${r.dept ? ' · ' + esc(r.dept) : ''}</span>${r.phone ? ` <a href="tel:${esc(r.phone)}">📞 ${esc(r.phone)}</a>` : ''}</div>`).join('')}</div>`).join('') || '<p class="hint">No customers.</p>';
  } else {
    const l = S.vendors.filter(v => !q || (v.company + v.country + v.contact).toLowerCase().includes(q)).sort((a, b) => a.company.localeCompare(b.company));
    $('#c-list').innerHTML = l.map(v => `<div class="item" data-ev="${v.id}"><div class="nm"><b>${esc(v.company)}</b> ${v.sample ? '<span class="tag">SAMPLE</span>' : ''}<small>${esc(v.country)} · ${esc(v.cur)}${v.contact ? ' · ' + esc(v.contact) : ''}</small></div><button class="btn sm ghost">Edit</button></div>`).join('') || '<p class="hint">No vendors.</p>';
  }
}
function editCustomer(id, pick) {
  const t = id ? clone(S.customers.find(c => c.id === id)) : { id: uid(), company: '', address: '', tin: '', phone: '', email: '', reps: [] };
  const isNew = !id;
  const draw = () => {
    openModal(isNew ? 'New customer' : 'Edit customer', `
      <div class="f"><label>Company name</label><input data-k="company" value="${esc(t.company)}"></div>
      <div class="f"><label>Address</label><input data-k="address" value="${esc(t.address)}"></div>
      <div class="grid2"><div class="f"><label>Phone</label><input data-k="phone" value="${esc(t.phone)}"></div><div class="f"><label>Email</label><input data-k="email" value="${esc(t.email)}"></div></div>
      <div class="f"><label>TIN (optional)</label><input data-k="tin" value="${esc(t.tin)}"></div>
      <h3>Representatives</h3>${t.reps.map((r, i) => `<div class="repbox"><div class="grid2"><div class="f"><label>Name</label><input data-r="${i}.name" value="${esc(r.name)}"></div><div class="f"><label>Designation</label><input data-r="${i}.title" value="${esc(r.title)}"></div></div>
        <div class="f"><label>Department</label><input data-r="${i}.dept" value="${esc(r.dept)}"></div><div class="grid2"><div class="f"><label>Phone</label><input data-r="${i}.phone" value="${esc(r.phone)}"></div><div class="f"><label>Email</label><input data-r="${i}.email" value="${esc(r.email)}"></div></div>
        <button class="btn sm ghost danger" data-rr="${i}">Remove representative</button></div>`).join('')}
      <button class="btn sm dark" id="m-addrep">+ Add representative</button>
      <div class="btns"><button class="btn pri" id="m-save">Save</button>${isNew ? '' : '<button class="btn danger" id="m-del">Delete</button>'}</div>`);
    const mb = $('#mb');
    mb.oninput = e => { const k = e.target.dataset.k, r = e.target.dataset.r; if (k) t[k] = e.target.value; if (r) { const [i, f] = r.split('.'); t.reps[i][f] = e.target.value; } };
    mb.onclick = e => {
      if (e.target.id === 'm-addrep') { t.reps.push({ id: uid(), name: '', title: '', dept: '', phone: '', email: '' }); draw(); }
      else if (e.target.dataset.rr != null) { t.reps.splice(+e.target.dataset.rr, 1); draw(); }
      else if (e.target.id === 'm-save') {
        if (!t.company.trim()) { toast('Enter the company name'); return; }
        delete t.sample; const i = S.customers.findIndex(c => c.id === t.id); if (i >= 0) S.customers[i] = t; else S.customers.push(t);
        persist.customers(); closeModal(); if (pick && curDoc()) { curDoc().custId = t.id; curDoc().repId = ''; renderEditor(); } else if (VIEW === 'cust') renderCust();
      } else if (e.target.id === 'm-del' && confirm('Delete this customer?')) { S.customers = S.customers.filter(c => c.id !== t.id); persist.customers(); closeModal(); if (VIEW === 'cust') renderCust(); else renderEditor(); }
    };
  };
  draw();
}
function editVendor(id, pick) {
  const t = id ? clone(S.vendors.find(c => c.id === id)) : { id: uid(), company: '', country: 'China', cur: 'USD', contact: '', phone: '', email: '', address: '' }, isNew = !id;
  openModal(isNew ? 'New vendor' : 'Edit vendor', `<div class="f"><label>Company</label><input data-k="company" value="${esc(t.company)}"></div>
    <div class="grid2"><div class="f"><label>Country</label><select data-k="country">${ORIGINS.filter(o => o !== 'Local').map(o => opt(o, o, t.country)).join('')}</select></div><div class="f"><label>Currency</label><select data-k="cur">${curOpts(t.cur)}</select></div></div>
    <div class="f"><label>Contact person</label><input data-k="contact" value="${esc(t.contact)}"></div><div class="grid2"><div class="f"><label>Phone</label><input data-k="phone" value="${esc(t.phone)}"></div><div class="f"><label>Email</label><input data-k="email" value="${esc(t.email)}"></div></div>
    <div class="f"><label>Address</label><input data-k="address" value="${esc(t.address)}"></div>
    <div class="btns"><button class="btn pri" id="m-save">Save</button>${isNew ? '' : '<button class="btn danger" id="m-del">Delete</button>'}</div>`);
  const mb = $('#mb');
  mb.oninput = mb.onchange = e => { if (e.target.dataset.k) t[e.target.dataset.k] = e.target.value; };
  mb.onclick = e => {
    if (e.target.id === 'm-save') { if (!t.company.trim()) { toast('Enter the company name'); return; } delete t.sample; const i = S.vendors.findIndex(c => c.id === t.id); if (i >= 0) S.vendors[i] = t; else S.vendors.push(t); persist.vendors(); closeModal(); if (pick && curDoc()) { curDoc().vendId = t.id; convertPrices(curDoc(), t.cur); renderEditor(); } else if (VIEW === 'cust') renderCust(); }
    else if (e.target.id === 'm-del' && confirm('Delete this vendor?')) { S.vendors = S.vendors.filter(c => c.id !== t.id); persist.vendors(); closeModal(); renderCust(); }
  };
}

/* ===== ITEMS (catalogue, cables, import costing) ===== */
const IS = { sub: 'cat', cat: 'all', q: '', n: 60 };
const CB = { type: 'arm', size: 16, cores: 4, brand: 'Nigerchin', qty: 100 };
function ensureCur() { let d = curDoc(); if (!d) { d = newDoc('quote'); S.docs.push(d); S.cur = d.id; persist.docs(); } return d; }
function addToCur(line) { const d = ensureCur(); addLine(d, line); persist.docs(); updBanner(); toast('Added to ' + d.no); }
function updBanner() {
  const d = curDoc(), b = $('#i-banner'); if (!b) return;
  b.innerHTML = d ? `Adding to <b>${esc(d.no)}</b> (${d.lines.length} item${d.lines.length === 1 ? '' : 's'}) <button class="btn sm pri" id="i-open">Open document</button>` : 'Tap <b>+</b> on any item to start a new quotation.';
}
function renderItems() {
  $('#v-items').innerHTML = `<div class="card"><div id="i-banner" class="banner"></div><div class="seg" style="margin-top:8px"><button data-is="cat">Catalogue</button><button data-is="cable">Cable builder</button><button data-is="imp">Import costing</button></div></div><div id="i-body"></div>`;
  updBanner();
  $$('#v-items [data-is]').forEach(b => b.classList.toggle('on', b.dataset.is === IS.sub));
  $('#v-items').onclick = e => {
    if (e.target.id === 'i-open') { openDoc(S.cur); return; }
    const s = e.target.closest('[data-is]'); if (s) { IS.sub = s.dataset.is; renderItems(); }
  };
  ({ cat: renderCat, cable: renderCable, imp: renderImp })[IS.sub]();
}
function renderCat() {
  $('#i-body').innerHTML = `<div class="card"><input id="k-q" type="search" placeholder="Search e.g. Chint 63A, ABB contactor, ifm M18, 4V210…" value="${esc(IS.q)}">
    <div class="chips">${[['all', 'All']].concat(CAT_LIST).map(c => `<button class="chip ${IS.cat === c[0] ? 'on' : ''}" data-kc="${c[0]}">${esc(c[1])}</button>`).join('')}</div>
    <div id="k-list"></div><div class="btns"><button class="btn sm dark" id="k-new">+ Add my own item</button></div>
    <div class="hint">Shelf items use the ₦ price you set. Imported items are priced from FOB cost + freight + duty + levies + clearing + margin (see ✎). Cables: use the Cable builder.</div></div>`;
  $('#k-q').oninput = e => { IS.q = e.target.value; IS.n = 60; listCat(); };
  $('#i-body').onclick = e => {
    const c = e.target.closest('[data-kc]'); if (c) { IS.cat = c.dataset.kc; IS.n = 60; renderCat(); return; }
    const a = e.target.closest('[data-ia]'); if (a) { const it = getItem(a.dataset.ia), d = ensureCur(); addToCur(lineFromItem(it, d)); return; }
    const ed = e.target.closest('[data-ie]'); if (ed) { editItem(ed.dataset.ie); return; }
    if (e.target.id === 'k-more') { IS.n += 60; listCat(); return; }
    if (e.target.id === 'k-new') editItem(null);
  };
  $('#i-body').onchange = e => {
    const id = e.target.dataset.ip; if (!id) return; const it = getItem(id), v = num(e.target.value);
    if (S.custom.some(x => x.id === id)) { it.price = v; persist.custom(); }
    else { S.ovr[id] = Object.assign(S.ovr[id] || {}, { price: v }); if (isImport(it)) S.ovr[id].fixed = true; persist.ovr(); }
    toast('Price saved'); listCat();
  };
  listCat();
}
function listCat() {
  const parts = IS.q.toLowerCase().split(/\s+/).filter(Boolean);
  const l = allItems().filter(i => (IS.cat === 'all' || i.cat === IS.cat) && (!parts.length || parts.every(p => (i.name + ' ' + (i.brand || '')).toLowerCase().includes(p))));
  const shown = l.slice(0, IS.n);
  $('#k-list').innerHTML = `<div class="hint">${l.length} item${l.length === 1 ? '' : 's'}</div>` + shown.map(i => {
    const imp = isImport(i);
    return `<div class="item"><div class="nm">${esc(i.name)}<small>${esc(i.brand || '')} · ${imp ? `<span class="imp">Import – ${esc(i.org)}${i.fixed ? ' (fixed price)' : ''}</span>` : 'Shelf'} · per ${esc(i.unit)}</small></div>
      <input type="number" inputmode="numeric" data-ip="${i.id}" value="${Math.round(sellPrice(i))}" aria-label="Selling price"><button class="btn sm dark" data-ia="${i.id}" aria-label="Add to document">+</button><button class="btn sm ghost" data-ie="${i.id}" aria-label="Edit item">✎</button></div>`;
  }).join('') + (l.length > shown.length ? `<div class="btns"><button class="btn sm" id="k-more">Show more (${l.length - shown.length} left)</button></div>` : '');
}
function breakdownHTML(it) {
  if (!isImport(it) || !(num(it.fob) > 0)) return '<div class="hint">Local shelf item – price is what you enter.</div>';
  const L = itemLanded(it), m = marginOf(it), sp = r50(L.total * (1 + m / 100)), s = S.settings;
  const row = (a, b) => `<tr><td>${a}</td><td class="r">${b}</td></tr>`;
  return `<table class="bd">${row('FOB (₦ equiv.)', f0(L.fobN))}${row(`Freight ${s.freightPct}%`, f0(L.frtN))}${row(`Insurance ${s.insPct}%`, f0(L.insN))}${row('CIF', '<b>' + f0(L.cif) + '</b>')}${row(`Import duty ${L.rate}%`, f0(L.duty))}
    ${row(`Surcharge ${s.surchargePct}% of duty`, f0(L.sur))}${row(`ETLS ${s.etlsPct}%`, f0(L.etls))}${row(`CISS ${s.cissPct}% of FOB`, f0(L.ciss))}${row(`Clearing & port ${s.clearPct}%`, f0(L.clear))}
    ${row('Landed cost / unit', '<b>' + f0(L.total) + '</b>')}${row(`Selling price (+${m}% margin)`, '<b>₦' + f0(sp) + '</b>')}</table><div class="hint">Import VAT (≈₦${f0(L.importVat)}) is paid at the port but recoverable as input VAT – not included.</div>`;
}
function editItem(id) {
  const base = id ? getItem(id) : null, isCustom = !id || S.custom.some(x => x.id === id);
  const t = base ? Object.assign({}, base) : { id: 'x' + uid(), cat: IS.cat !== 'all' ? IS.cat : 'acc', name: '', brand: '', unit: 'pc', org: 'Local', price: 0, fob: '', cur: 'USD', duty: 'other', margin: '' };
  const draw = () => {
    const imp = isImport(t);
    openModal(id ? 'Edit item' : 'New item', `<div class="f"><label>Description</label><textarea data-k="name" rows="2">${esc(t.name)}</textarea></div>
      <div class="grid2"><div class="f"><label>Brand</label><input data-k="brand" value="${esc(t.brand)}"></div><div class="f"><label>Unit</label><input data-k="unit" value="${esc(t.unit)}"></div></div>
      <div class="grid2"><div class="f"><label>Category</label><select data-k="cat">${CAT_LIST.map(c => opt(c[0], c[1], t.cat)).join('')}</select></div><div class="f"><label>Origin / source</label><select data-k="org" data-rd="1">${ORIGINS.map(o => opt(o, o === 'Local' ? 'Local – on shelf' : o, t.org)).join('')}</select></div></div>
      ${imp ? `<div class="grid3"><div class="f"><label>FOB cost / unit</label><input type="number" inputmode="decimal" data-k="fob" value="${esc(t.fob)}"></div><div class="f"><label>Currency</label><select data-k="cur">${curOpts(t.cur)}</select></div><div class="f"><label>Margin % (blank = ${S.settings.margin})</label><input type="number" inputmode="decimal" data-k="margin" value="${esc(t.margin)}"></div></div>
        <div class="f"><label>Duty category</label><select data-k="duty">${Object.keys(DUTY_L).map(k => opt(k, `${DUTY_L[k]} – ${dutyRate(k)}%`, t.duty)).join('')}</select></div>
        <label class="chk"><input type="checkbox" data-k="fixed" ${t.fixed ? 'checked' : ''}><span>Use a fixed selling price instead of calculated</span></label>
        ${t.fixed ? `<div class="f"><label>Fixed selling price (₦)</label><input type="number" inputmode="numeric" data-k="price" value="${esc(t.price)}"></div>` : ''}<div id="bd">${breakdownHTML(t)}</div>`
        : `<div class="f"><label>Selling price (₦)</label><input type="number" inputmode="numeric" data-k="price" value="${esc(t.price)}"></div>`}
      <div class="btns"><button class="btn pri" id="m-save">Save</button>${id && !isCustom && S.ovr[id] ? '<button class="btn" id="m-reset">Reset to default</button>' : ''}${id && isCustom ? '<button class="btn danger" id="m-del">Delete</button>' : ''}</div>`);
    const mb = $('#mb');
    mb.oninput = mb.onchange = e => {
      const k = e.target.dataset.k; if (!k) return;
      t[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      if (e.target.dataset.rd || k === 'fixed') { draw(); return; }
      if (isImport(t) && $('#bd')) $('#bd').innerHTML = breakdownHTML(t);
    };
    mb.onclick = e => {
      if (e.target.id === 'm-save') {
        if (!String(t.name).trim()) { toast('Enter a description'); return; }
        ['price', 'fob'].forEach(k => { if (t[k] !== '') t[k] = num(t[k]); });
        if (isCustom) { const i = S.custom.findIndex(x => x.id === t.id); if (i >= 0) S.custom[i] = t; else S.custom.push(t); persist.custom(); }
        else { const b = BASE.get(t.id), o = {}; Object.keys(t).forEach(k => { if (JSON.stringify(t[k]) !== JSON.stringify(b[k])) o[k] = t[k]; }); if (Object.keys(o).length) S.ovr[t.id] = o; else delete S.ovr[t.id]; persist.ovr(); }
        closeModal(); if (VIEW === 'items' && IS.sub === 'cat') listCat(); toast('Saved');
      } else if (e.target.id === 'm-reset') { delete S.ovr[id]; persist.ovr(); closeModal(); listCat(); }
      else if (e.target.id === 'm-del' && confirm('Delete this item?')) { S.custom = S.custom.filter(x => x.id !== id); persist.custom(); closeModal(); listCat(); }
    };
  };
  draw();
}

/* cable builder */
function renderCable() {
  const sizes = cableSizes(CB.type); if (!sizes.includes(CB.size)) CB.size = sizes[2];
  const cores = cableCores(CB.type, CB.size); if (!cores.includes(CB.cores)) CB.cores = cores[Math.min(1, cores.length - 1)];
  const pm = cablePrice(CB.type, CB.size, CB.cores, CB.brand), q = num(CB.qty);
  const desc = `${CB.brand} ${CB.cores}-core × ${CB.size}mm² ${CB.type === 'flex' ? 'flexible stranded copper cable' : CB.type === 'arm' ? 'armoured copper cable (PVC/SWA/PVC)' : 'non-armoured copper cable (PVC/PVC)'}`;
  $('#i-body').innerHTML = `<div class="card"><h2>Cable builder</h2>
    <div class="f"><label>Type</label><select data-c="type">${Object.keys(CABLE.types).map(k => opt(k, CABLE.types[k][0], CB.type)).join('')}</select></div>
    <div class="grid3"><div class="f"><label>Size (mm²)</label><select data-c="size">${sizes.map(s => opt(s, s + ' mm²', CB.size)).join('')}</select></div>
    <div class="f"><label>Cores</label><select data-c="cores">${cores.map(s => opt(s, s + ' core', CB.cores)).join('')}</select></div>
    <div class="f"><label>Make</label><select data-c="brand">${Object.keys(S.settings.brandF).map(b => opt(b, b, CB.brand)).join('')}</select></div></div>
    <div class="kpis"><div class="kpi"><small>Price per metre</small><b>₦${f0(pm)}</b></div><div class="kpi"><small>Per 100 m drum</small><b>₦${f0(pm * 100)}</b></div></div>
    <div class="f"><label>Length (metres)</label><input type="number" inputmode="numeric" data-c="qty" value="${esc(CB.qty)}"></div>
    <div class="hint">${esc(desc)}<br>Line total: <b>₦${f0(pm * q)}</b></div>
    <div class="btns"><button class="btn pri" id="cb-add">Add to document</button></div>
    <div class="hint" style="margin-top:8px">Price = copper content × your copper rate (₦${f0(S.settings.cu)}/kg) × cable-type factor × maker factor. Change these in Settings → Cable pricing. You can always edit the rate on the document line.</div></div>`;
  $('#i-body').onchange = e => { const k = e.target.dataset.c; if (!k) return; CB[k] = (k === 'size' || k === 'cores') ? parseFloat(e.target.value) : e.target.value; if (k === 'type' || k === 'size') { renderCable(); } else renderCable(); };
  $('#i-body').oninput = e => { if (e.target.dataset.c === 'qty') CB.qty = e.target.value; };
  $('#i-body').onclick = e => {
    if (e.target.id === 'cb-add') { const d = ensureCur(); addLine(d, { d: desc, qty: num(CB.qty) || 1, unit: 'm', price: Math.round(pm / (num(d.rate) || 1) * 100) / 100, disc: 0, exempt: false }); persist.docs(); updBanner(); toast('Added to ' + d.no); }
  };
}

/* import costing */
function impState() {
  if (!S.imp) S.imp = { cur: 'USD', rate: S.settings.fx.USD, freight: '', insPct: S.settings.insPct, clearPct: S.settings.clearPct, margin: S.settings.margin, lines: [{ d: '', qty: 1, fob: '', duty: 'sw' }] };
  return S.imp;
}
function impCalc(m) {
  const rate = num(m.rate) || 1, L = m.lines.map(l => ({ l, fobN: num(l.qty) * num(l.fob) * rate }));
  const totalFob = L.reduce((s, x) => s + x.fobN, 0), frtN = num(m.freight) * rate, ins = totalFob * num(m.insPct) / 100;
  const out = L.map(x => { const sh = totalFob ? x.fobN / totalFob : 0, b = landedFrom(x.fobN, frtN * sh, ins * sh, dutyRate(x.l.duty), num(m.clearPct)); const q = num(x.l.qty) || 1; const unit = b.total / q; return Object.assign(b, { q, unit, sell: r50(unit * (1 + num(m.margin) / 100)) }); });
  const sum = k => out.reduce((s, b) => s + b[k], 0);
  return { out, totalFob, frtN, ins, cif: sum('cif'), duty: sum('duty'), levies: sum('sur') + sum('etls') + sum('ciss'), clear: sum('clear'), total: sum('total'), importVat: sum('importVat'), rate };
}
function renderImp() {
  const m = impState();
  $('#i-body').innerHTML = `<div class="card"><h2>Import costing &amp; duty</h2>
    <div class="grid2"><div class="f"><label>Supplier currency</label><select data-m="cur">${curOpts(m.cur)}</select></div><div class="f"><label>₦ per 1 ${m.cur}</label><input type="number" inputmode="decimal" data-m="rate" value="${esc(m.rate)}"></div></div>
    <div class="grid2"><div class="f"><label>Freight total (${m.cur})</label><input type="number" inputmode="decimal" data-m="freight" value="${esc(m.freight)}"></div><div class="f"><label>Insurance %</label><input type="number" inputmode="decimal" data-m="insPct" value="${esc(m.insPct)}"></div></div>
    <div class="grid2"><div class="f"><label>Clearing &amp; port %</label><input type="number" inputmode="decimal" data-m="clearPct" value="${esc(m.clearPct)}"></div><div class="f"><label>Margin %</label><input type="number" inputmode="decimal" data-m="margin" value="${esc(m.margin)}"></div></div>
    <h3>Goods in the shipment</h3><div id="imp-lines">${m.lines.map((l, i) => `<div class="ln"><input class="nm" data-l="${i}.d" placeholder="Description" value="${esc(l.d)}"><div class="r2 imp"><div><label>Qty</label><input type="number" inputmode="decimal" data-l="${i}.qty" value="${esc(l.qty)}"></div>
      <div><label>FOB / unit (${m.cur})</label><input type="number" inputmode="decimal" data-l="${i}.fob" value="${esc(l.fob)}"></div><button class="btn sm ghost danger" data-il="${i}" aria-label="Remove">✕</button></div>
      <select data-l="${i}.duty">${Object.keys(DUTY_L).map(k => opt(k, `${DUTY_L[k]} – ${dutyRate(k)}%`, l.duty)).join('')}</select></div>`).join('')}</div>
    <div class="btns"><button class="btn sm dark" id="imp-add">+ Add line</button></div>
    <div class="f" style="margin-top:8px"><label>Or add from catalogue (imports)</label><input id="imp-q" type="search" placeholder="Search imported items…"></div><div id="imp-res"></div></div>
    <div class="card" id="imp-out"></div>`;
  impOut();
  const b = $('#i-body');
  b.oninput = b.onchange = e => {
    const mm = e.target.dataset.m, l = e.target.dataset.l;
    if (mm) { m[mm] = e.target.value; if (mm === 'cur') { m.rate = S.settings.fx[m.cur]; save('imp', m); renderImp(); return; } }
    if (l) { const [i, f] = l.split('.'); m.lines[i][f] = e.target.value; }
    if (e.target.id === 'imp-q') {
      const parts = e.target.value.toLowerCase().split(/\s+/).filter(Boolean); const box = $('#imp-res');
      if (!parts.length) { box.innerHTML = ''; return; }
      box.innerHTML = allItems().filter(i => isImport(i) && num(i.fob) > 0 && parts.every(p => (i.name + ' ' + i.brand).toLowerCase().includes(p))).slice(0, 15).map(i => `<div class="item pick" data-ii="${i.id}"><div class="nm">${esc(i.name)}<small>FOB ${CUR[i.cur].sym}${f2(num(i.fob))}</small></div><b>+</b></div>`).join('');
      return;
    }
    save('imp', m); impOut();
  };
  b.onclick = e => {
    const rm = e.target.closest('[data-il]'); if (rm) { m.lines.splice(+rm.dataset.il, 1); if (!m.lines.length) m.lines.push({ d: '', qty: 1, fob: '', duty: 'sw' }); save('imp', m); renderImp(); return; }
    if (e.target.id === 'imp-add') { m.lines.push({ d: '', qty: 1, fob: '', duty: 'sw' }); save('imp', m); renderImp(); return; }
    const pk = e.target.closest('[data-ii]'); if (pk) { const it = getItem(pk.dataset.ii); const f = num(it.fob) * (S.settings.fx[it.cur || 'USD'] || 1) / (num(m.rate) || 1); m.lines = m.lines.filter(l => l.d || num(l.fob)); m.lines.push({ d: it.name, qty: 1, fob: Math.round(f * 100) / 100, duty: it.duty || 'other' }); save('imp', m); renderImp(); return; }
    if (e.target.id === 'imp-quote') { const R = impCalc(m), d = newDoc('quote'); R.out.forEach((b2, i) => d.lines.push({ d: m.lines[i].d || 'Imported item', qty: b2.q, unit: 'pc', price: b2.sell, disc: 0, exempt: false })); S.docs.push(d); persist.docs(); openDoc(d.id); return; }
    if (e.target.id === 'imp-cur') { const R = impCalc(m), d = ensureCur(); R.out.forEach((b2, i) => addLine(d, { d: m.lines[i].d || 'Imported item', qty: b2.q, unit: 'pc', price: Math.round(b2.sell / (num(d.rate) || 1) * 100) / 100, disc: 0, exempt: false })); persist.docs(); updBanner(); toast('Added to ' + d.no); }
  };
}
function impOut() {
  const m = impState(), R = impCalc(m), row = (a, b, c) => `<tr class="${c || ''}"><td>${a}</td><td class="r">${b}</td></tr>`;
  $('#imp-out').innerHTML = `<h2>Landed cost</h2><table class="bd">${row('FOB total', '₦' + f0(R.totalFob))}${row('Freight', '₦' + f0(R.frtN))}${row('Insurance', '₦' + f0(R.ins))}${row('CIF value', '₦' + f0(R.cif), 'b')}${row('Import duty', '₦' + f0(R.duty))}${row('Levies (surcharge, ETLS, CISS)', '₦' + f0(R.levies))}${row('Clearing & port', '₦' + f0(R.clear))}${row('TOTAL LANDED COST', '₦' + f0(R.total), 'b')}</table>
    <div class="hint">Import VAT at the port ≈ ₦${f0(R.importVat)} (recoverable input VAT – excluded).</div>
    <table class="tbl" style="margin-top:8px"><tr><th>Item</th><th class="n">Landed / unit</th><th class="n">Sell / unit</th></tr>${R.out.map((b, i) => `<tr><td>${esc(m.lines[i].d || 'Item ' + (i + 1))} ×${f2(b.q).replace('.00', '')}</td><td class="n">${f0(b.unit)}</td><td class="n"><b>${f0(b.sell)}</b></td></tr>`).join('')}</table>
    <div class="btns"><button class="btn pri" id="imp-quote">Create quotation</button><button class="btn" id="imp-cur">Add to current document</button></div>
    <div class="hint">Duty rates and levies are editable estimates (Settings). Confirm current tariff and exchange rate with your clearing agent.</div>`;
}

/* ===== SETTINGS ===== */
function renderSettings() {
  const s = S.settings, T = (k, l, extra = '') => `<div class="f"><label>${l}</label><input data-s="${k}" ${extra}></div>`, N = (k, l) => `<div class="f"><label>${l}</label><input data-s="${k}" data-n="1" type="number" step="any" inputmode="decimal"></div>`;
  $('#v-set').innerHTML = `
  <details class="card" open><summary>Company &amp; documents</summary>
    ${T('company', 'Company name')}${T('rc', 'RC number')}${T('tin', 'TIN (optional)')}<div class="f"><label>Tagline / business description</label><textarea data-s="tagline" rows="3"></textarea></div>${T('address', 'Head office address')}
    <div class="grid2">${T('phone', 'Phone')}${T('email', 'Email')}</div><div class="f"><label>Bank details (printed on quotations &amp; invoices)</label><textarea data-s="bank" rows="3" placeholder="Bank – Account name – Account number"></textarea></div>
    ${T('signer', 'Signatory name &amp; title (under signature)')}
    <div class="grid2"><div class="f"><label>Signature on documents</label><select data-s="sign">${[['blue', 'Blue ink'], ['black', 'Black ink'], ['none', 'None – sign by hand']].map(x => opt(x[0], x[1], s.sign)).join('')}</select></div>
    <div class="f"><label>Print layout</label><select data-s="printStyle">${opt('branded', 'Branded header (default)', s.printStyle)}${opt('letterhead', 'On my letterhead image', s.printStyle)}</select></div></div>
    <div class="grid3">${N('validDays', 'Quote validity (days)')}${N('creditDays', 'Credit days')}<div class="f"><label>Default VAT</label><select data-s="vatDefault">${s.vats.map(v => opt(v.id, v.name, s.vatDefault)).join('')}</select></div></div></details>
  <details class="card"><summary>Document numbering &amp; terms</summary><div class="grid3">${Object.keys(s.prefix).map(k => `<div class="f"><label>${TYPES[k].n} prefix</label><input data-s="prefix.${k}"></div>`).join('')}</div>
    ${['quote', 'proforma', 'invoice', 'po'].map(k => `<div class="f"><label>Default terms – ${TYPES[k].n}</label><textarea data-s="terms.${k}" rows="3"></textarea></div>`).join('')}<div class="hint">New documents copy these terms; you can edit them per document.</div></details>
  <details class="card"><summary>VAT / tax options</summary><div id="vat-list"></div><button class="btn sm dark" id="vat-add">+ Add tax option</button><div class="hint">“Inventoried / non-inventoried” share the 7.5% rate but are labelled separately on documents. Add your own (e.g. a custom rate for an export market).</div></details>
  <details class="card"><summary>Exchange rates (₦ per 1 unit)</summary><div class="grid3">${['USD', 'GBP', 'EUR', 'CNY', 'INR'].map(c => `<div class="f"><label>${c}</label><input data-s="fx.${c}" data-n="1" type="number" step="any" inputmode="decimal"></div>`).join('')}</div>
    <div class="hint">Defaults are approximate (USD ≈ ₦1,330 in early October 2026). Update them before quoting – they drive imported-item prices and foreign-currency documents.</div></details>
  <details class="card"><summary>Import duty &amp; landed-cost settings</summary><div class="grid3">${N('freightPct', 'Freight % of FOB')}${N('insPct', 'Insurance % of FOB')}${N('clearPct', 'Clearing & port % of CIF')}${N('surchargePct', 'Surcharge % of duty')}${N('etlsPct', 'ETLS % of CIF')}${N('cissPct', 'CISS % of FOB')}${N('margin', 'Default margin %')}</div>
    <h3>Duty rate by category (%)</h3>${Object.keys(DUTY_L).map(k => `<div class="f"><label>${esc(DUTY_L[k])}</label><input data-s="duty.${k}" data-n="1" type="number" step="any" inputmode="decimal"></div>`).join('')}
    <div class="hint">These are planning estimates, not official tariff. Check the current Nigeria Customs tariff / your clearing agent and adjust.</div></details>
  <details class="card"><summary>Cable pricing</summary><div class="f"><label>Copper rate (₦ per kg)</label><input data-s="cu" data-n="1" type="number" inputmode="numeric"></div>
    <div class="grid3">${Object.keys(s.brandF).map(b => `<div class="f"><label>${b} factor</label><input data-s="brandF.${b}" data-n="1" type="number" step="0.01" inputmode="decimal"></div>`).join('')}</div><div class="hint">Cable price = copper weight × rate × type factor × maker factor. Raise the copper rate when copper moves.</div></details>
  <details class="card"><summary>Install app (phone or PC)</summary><p id="m-install" style="margin:0 0 8px;font-size:13.5px"></p>
    <div class="btns" style="margin:0 0 8px"><button class="btn pri" id="m-installBtn">Install app</button><button class="btn sm" id="m-again">Show install notice again</button></div><div id="m-diag" class="hint" style="line-height:1.7"></div></details>
  <details class="card"><summary>Prices, backup &amp; data</summary>
    <div class="grid2" style="align-items:end"><div class="f"><label>Raise / lower all shelf prices by %</label><input id="bulk" type="number" step="0.5" placeholder="e.g. 5 or -3"></div><div class="f"><button class="btn dark" id="bulk-go" style="width:100%">Apply</button></div></div>
    <div class="btns"><button class="btn pri" id="bk-exp">Backup data (download)</button><label class="btn" style="cursor:pointer">Restore backup<input id="bk-imp" type="file" accept=".json,application/json" hidden></label></div>
    <div class="btns"><button class="btn sm ghost danger" id="reset-prices">Reset all item prices</button></div>
    <div class="hint">${storageOK ? 'All data is stored on this device only. Back up regularly.' : '⚠ This browser is not allowing saved data from this file. Use Backup after each session, or open the app from a web link.'}</div></details>`;
  $$('#v-set [data-s]').forEach(el => {
    const path = el.dataset.s, v = getPath(s, path);
    if (el.tagName !== 'SELECT') el.value = v == null ? '' : v;
    el.oninput = el.onchange = () => {
      let val = el.value; if (el.dataset.n) val = num(val); if (el.dataset.b) val = val === '1';
      setPath(s, path, val); persist.settings();
    };
  });
  drawVats(); installHelp();
  $('#v-set').onclick = e => {
    if (e.target.id === 'vat-add') { s.vats.push({ id: 'v' + uid(), name: 'New tax option', rate: 0, mode: 'excl' }); persist.settings(); drawVats(); }
    const vr = e.target.closest('[data-vr]'); if (vr && s.vats.length > 1) { s.vats.splice(+vr.dataset.vr, 1); persist.settings(); drawVats(); }
    if (e.target.id === 'bulk-go') {
      const p = num($('#bulk').value); if (!p) { toast('Enter a percentage'); return; } if (!confirm(`Change all shelf prices by ${p}%? (Imports follow FOB cost, so they change with exchange rate and margin.)`)) return;
      allItems().forEach(i => { if (isImport(i) && !i.fixed) return; const v = r50(num(i.price) * (1 + p / 100)); if (S.custom.some(x => x.id === i.id)) S.custom.find(x => x.id === i.id).price = v; else S.ovr[i.id] = Object.assign(S.ovr[i.id] || {}, { price: v }); });
      persist.ovr(); persist.custom(); toast('Prices updated'); }
    if (e.target.id === 'reset-prices' && confirm('Reset every item to its default price/settings?')) { S.ovr = {}; persist.ovr(); toast('Item prices reset'); }
    if (e.target.id === 'bk-exp') exportData();
    if (e.target.id === 'm-installBtn') doInstall();
    if (e.target.id === 'm-again') { save('installDismissed', 0); if (deferred) { showInstallBar(); toast('Install notice is back at the top'); } else toast('Your browser decides when to offer install – use its menu (⋮) → Install app'); }
  };
  $('#bk-imp').onchange = e => { const f = e.target.files[0]; if (f) importData(f); };
}
function drawVats() {
  const s = S.settings;
  $('#vat-list').innerHTML = s.vats.map((v, i) => `<div class="repbox"><div class="f"><label>Name</label><input data-vi="${i}.name" value="${esc(v.name)}"></div><div class="grid3"><div class="f"><label>Rate %</label><input type="number" step="any" data-vi="${i}.rate" value="${esc(v.rate)}"></div>
    <div class="f"><label>Mode</label><select data-vi="${i}.mode">${opt('excl', 'Added to price', v.mode)}${opt('incl', 'Included in price', v.mode)}</select></div><div class="f"><label>&nbsp;</label><button class="btn sm ghost danger" data-vr="${i}">Remove</button></div></div>
    <label class="chk sm"><input type="checkbox" data-vi="${i}.exempt" ${v.exempt ? 'checked' : ''}><span>Exempt (print “VAT – Exempt”)</span></label></div>`).join('');
  $('#vat-list').oninput = $('#vat-list').onchange = e => { const k = e.target.dataset.vi; if (!k) return; const [i, f] = k.split('.'); s.vats[i][f] = f === 'rate' ? num(e.target.value) : e.target.type === 'checkbox' ? e.target.checked : e.target.value; persist.settings(); };
}
function exportData() {
  const data = { app: 'viensco-docs', v: 1, at: Date.now(), settings: S.settings, customers: S.customers, vendors: S.vendors, docs: S.docs, ovr: S.ovr, custom: S.custom, counters: S.counters };
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
  a.download = 'viensco-synergy-backup-' + today() + '.json'; document.body.appendChild(a); a.click(); a.remove(); save('lastBackup', Date.now()); toast('Backup downloaded');
}
function importData(f) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result); if (d.app !== 'viensco-docs') throw 0;
      if (!confirm('Replace everything on this device with the backup?')) return;
      ['settings', 'customers', 'vendors', 'docs', 'ovr', 'custom', 'counters'].forEach(k => save(k, d[k]));
      location.reload();
    } catch (e) { toast('That file is not a Viensco backup'); }
  };
  r.readAsText(f);
}

/* ===== boot ===== */
document.addEventListener('click', e => { if (e.target.closest('#ed-style')) return; });
$('#ed-style').value = S.settings.printStyle; $('#ed-sign').value = S.settings.sign;
/* ===== install (phone or PC) ===== */
let deferred = null;
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent), isAndroid = /android/i.test(navigator.userAgent);
function showInstallBar() {
  if (standalone() || location.protocol === 'file:') return;
  if (Date.now() - load('installDismissed', 0) < 3 * 864e5) return;
  if (isIOS) { $('#installMsg').textContent = 'Install on iPhone: tap Share, then "Add to Home Screen".'; $('#installBtn').hidden = true; }
  else if (!deferred) return;
  $('#installBar').hidden = false;
}
function installHelp() {
  const m = $('#m-install'), b = $('#m-installBtn'); if (!m) return;
  if (standalone()) { m.textContent = 'Viensco Synergy Ltd is installed on this device and works offline.'; b.hidden = true; }
  else if (location.protocol === 'file:') { m.textContent = 'This copy was opened from a file, so it cannot be installed. Open the app from its https:// web link (your GitHub Pages address), then install it.'; b.hidden = true; }
  else if (isIOS) { m.textContent = 'On iPhone/iPad: open this page in Safari, tap the Share icon, then "Add to Home Screen".'; b.hidden = true; }
  else if (deferred) { m.textContent = 'Install the app for one-tap access, its own window and full offline use.'; b.hidden = false; }
  else { b.hidden = true; m.textContent = isAndroid ? 'Open the browser menu (⋮) and choose "Install app" or "Add to Home screen".' : 'On a PC: in Chrome or Edge click the install icon (⊕) at the right end of the address bar, or open the menu and choose "Install Viensco Synergy Ltd". Mac Safari: File → Add to Dock.'; }
  diag();
}
async function diag() {
  const box = $('#m-diag'); if (!box) return;
  const ok = (v, t, tip) => `<div>${v ? '✔' : '✘'} ${t}${!v && tip ? ` <span style="color:#c0392b">– ${tip}</span>` : ''}</div>`;
  const secure = location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  let man = false, sw = false, cached = false;
  try { const l = document.querySelector('link[rel=manifest]'); man = !!l && (await fetch(l.href)).ok; } catch (e) { }
  try { const r = await navigator.serviceWorker.getRegistration(); sw = !!(r && (r.active || r.waiting || r.installing)); } catch (e) { }
  try { cached = (await caches.keys()).length > 0; } catch (e) { }
  box.innerHTML = '<b>Install check</b>' + ok(secure, 'Opened from a secure (https) link', 'use your https:// GitHub Pages link') + ok(man, 'App manifest found', 'upload manifest.webmanifest') +
    ok(sw, 'Offline service worker running', 'upload sw.js, then reload the page') + ok(cached, 'Files saved for offline use', 'open once while online and wait a few seconds') + ok(standalone(), 'Running as an installed app', '');
}
async function doInstall() { if (!deferred) return; deferred.prompt(); try { await deferred.userChoice; } catch (e) { } deferred = null; $('#installBar').hidden = true; installHelp(); }
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; showInstallBar(); installHelp(); });
window.addEventListener('appinstalled', () => { $('#installBar').hidden = true; deferred = null; toast('Viensco Synergy Ltd installed ✔'); installHelp(); });
$('#installBtn').onclick = doInstall; $('#installX').onclick = () => { $('#installBar').hidden = true; save('installDismissed', Date.now()); };
setTimeout(showInstallBar, 1500);
if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then(() => setTimeout(diag, 1500)).catch(() => { });
if (!storageOK) { const w = $('#warn'); w.hidden = false; w.textContent = '⚠ This browser is not saving data for this file. Use Settings → Backup before closing, or open the app from a web link.'; }
show('home');
setTimeout(() => $('#splash').classList.add('gone'), 900);
