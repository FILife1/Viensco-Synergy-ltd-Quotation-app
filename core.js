'use strict';
/* ===== helpers ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const num = v => { const x = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(x) ? x : 0; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl = s => esc(s).replace(/\n/g, '<br>');
const f2 = n => (Math.round((n + Number.EPSILON) * 100) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const f0 = n => Math.round(n).toLocaleString('en-NG');
const mon = (n, cur) => ((CUR[cur || 'NGN'] || CUR.NGN).sym) + f2(n);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = iso => iso ? new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const setPath = (o, p, v) => { const ks = p.split('.'), last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
const clone = o => JSON.parse(JSON.stringify(o));
const r10 = v => Math.round(v / 10) * 10;
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }

/* ===== storage (falls back to memory if the browser blocks it) ===== */
const mem = {}; let storageOK = true;
try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); } catch (e) { storageOK = false; }
const LSP = 'vsl2.';
function load(k, d) { try { const v = storageOK ? localStorage.getItem(LSP + k) : mem[k]; return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function save(k, v) { const s = JSON.stringify(v); if (storageOK) { try { localStorage.setItem(LSP + k, s); return; } catch (e) { storageOK = false; } } mem[k] = s; }

/* ===== settings & state ===== */
const TERMS_DEF = {
  quote: 'Prices are quoted in the currency shown and are valid for the period stated.\nDelivery period: to be agreed on receipt of LPO / order.\nPayment terms as stated. Prices of imported items may change with exchange-rate movements after the validity period.',
  proforma: 'This is a proforma invoice and not a request for payment until confirmed with an LPO.\nGoods are released on receipt of payment or an approved LPO.\nImported items: delivery period subject to supplier lead time and customs clearance.',
  invoice: 'Goods once sold are not returnable except for manufacturer defects reported within 7 days.\nPayment terms as stated above. Overdue accounts may attract a late-payment charge.',
  receipt: '',
  po: 'Please acknowledge this order and confirm price, delivery date and Incoterm.\nGoods must conform to the specification and be packed for export / sea or air freight.\nInclude packing list, commercial invoice and certificate of origin with the shipment.',
  dn: ''
};
const DEF = {
  company: 'Viensco Synergy Ltd', rc: '7567387', tin: '',
  tagline: 'Industrial/Rural Electrification, Supply, Installation & Maintenance of Electrical & Electro-Mechanical Machines/Spares',
  address: 'ThankGod Obamina Street, Gauraka, Tafa LGA, Suleja, Niger', phone: '09153591818', email: 'vienscosynergyltd@gmail.com',
  bank: '', signer: '', sign: 'blue', printStyle: 'branded',
  prefix: { quote: 'QTN', proforma: 'PFI', invoice: 'INV', receipt: 'RCT', po: 'PO', dn: 'DN' },
  margin: 25, fx: FX_DEF, freightPct: 10, insPct: 1, surchargePct: 7, etlsPct: 0.5, cissPct: 1, clearPct: 5,
  duty: DUTY_DEF, vats: VAT_DEF, vatDefault: 'v75i', cu: 17000, brandF: CABLE.brands,
  validDays: 14, creditDays: 30, terms: TERMS_DEF
};
function deepMerge(a, b) {
  if (Array.isArray(b)) return b;
  const o = Object.assign({}, a);
  for (const k in b) o[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a && typeof a[k] === 'object' && !Array.isArray(a[k])) ? deepMerge(a[k], b[k]) : b[k];
  return o;
}
const S = {
  settings: deepMerge(DEF, load('settings', {})),
  customers: load('customers', null), vendors: load('vendors', null),
  docs: load('docs', []), ovr: load('ovr', {}), custom: load('custom', []), counters: load('counters', {}),
  cur: null, imp: load('imp', null)
};
if (S.settings.sign === true) S.settings.sign = 'blue'; else if (S.settings.sign === false) S.settings.sign = 'none';
if (!S.customers) { S.customers = clone(SAMPLE_CUSTOMERS); save('customers', S.customers); }
if (!S.vendors) { S.vendors = clone(SAMPLE_VENDORS); save('vendors', S.vendors); }
const persist = {
  settings: () => save('settings', S.settings), customers: () => save('customers', S.customers), vendors: () => save('vendors', S.vendors),
  docs: () => save('docs', S.docs), ovr: () => save('ovr', S.ovr), custom: () => save('custom', S.custom), counters: () => save('counters', S.counters)
};

/* ===== items & pricing ===== */
const BASE = new Map(CATALOG.map(i => [i.id, i]));
const getItem = id => { const b = BASE.get(id); return b ? (S.ovr[id] ? Object.assign({}, b, S.ovr[id]) : b) : S.custom.find(x => x.id === id); };
const allItems = () => CATALOG.map(i => S.ovr[i.id] ? Object.assign({}, i, S.ovr[i.id]) : i).concat(S.custom);
const isImport = it => it.org && it.org !== 'Local';
const catName = c => (CAT_LIST.find(x => x[0] === c) || [c, 'Other'])[1];
function landedFrom(fobN, frtN, insN, rate, clearPct) {
  const s = S.settings, cif = fobN + frtN + insN, duty = cif * rate / 100;
  const sur = duty * s.surchargePct / 100, etls = cif * s.etlsPct / 100, ciss = fobN * s.cissPct / 100;
  const clear = cif * (clearPct == null ? s.clearPct : clearPct) / 100;
  const vatBase = cif + duty + sur + etls;
  return { fobN, frtN, insN, cif, rate, duty, sur, etls, ciss, clear, total: cif + duty + sur + etls + ciss + clear, importVat: vatBase * 0.075 };
}
const dutyRate = k => (S.settings.duty[k] != null ? S.settings.duty[k] : S.settings.duty.other);
function itemLanded(it) {
  const s = S.settings, fobN = num(it.fob) * (s.fx[it.cur || 'USD'] || 1);
  return landedFrom(fobN, fobN * s.freightPct / 100, fobN * s.insPct / 100, dutyRate(it.duty));
}
function marginOf(it) { return it.margin != null && it.margin !== '' ? num(it.margin) : S.settings.margin; }
function sellPrice(it) {
  if (!isImport(it) || it.fixed || !(num(it.fob) > 0)) return num(it.price);
  return r50(itemLanded(it).total * (1 + marginOf(it) / 100));
}
function cablePrice(type, size, cores, brand) {
  return r10(size * cores * 0.0089 * S.settings.cu * CABLE.types[type][1] * (S.settings.brandF[brand] || 1));
}

/* ===== number to words ===== */
const W1 = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const W2 = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function words(n) {
  const h = x => { let s = ''; if (x >= 100) { s += W1[Math.floor(x / 100)] + ' Hundred'; x %= 100; if (x) s += ' and '; } if (x >= 20) s += W2[Math.floor(x / 10)] + (x % 10 ? '-' + W1[x % 10] : ''); else if (x > 0) s += W1[x]; return s; };
  if (n === 0) return 'Zero';
  const u = ['', ' Thousand', ' Million', ' Billion', ' Trillion']; const out = []; let i = 0;
  while (n > 0) { const c = n % 1000; if (c) out.unshift(h(c) + u[i]); n = Math.floor(n / 1000); i++; }
  return out.join(', ');
}
function amountWords(v, cur) {
  const c = CUR[cur] || CUR.NGN; v = Math.round(v * 100) / 100; const i = Math.floor(v), k = Math.round((v - i) * 100);
  return words(i) + ' ' + c.name + (k ? ' and ' + words(k) + ' ' + c.minor : '') + ' Only';
}

/* ===== documents ===== */
const TYPES = {
  quote: { n: 'Quotation', t: 'QUOTATION' }, proforma: { n: 'Proforma Invoice', t: 'PROFORMA INVOICE' }, invoice: { n: 'Sales Invoice', t: 'SALES INVOICE' },
  receipt: { n: 'Receipt', t: 'OFFICIAL RECEIPT' }, po: { n: 'Purchase Order', t: 'PURCHASE ORDER' }, dn: { n: 'Delivery Note', t: 'WAYBILL / DELIVERY NOTE' }
};
const getVat = id => S.settings.vats.find(v => v.id === id) || S.settings.vats[0];
function nextNo(type) {
  const seq = (S.counters[type] || 0) + 1; S.counters[type] = seq; persist.counters();
  return { seq, no: `${S.settings.prefix[type]}/${new Date().getFullYear()}/${String(seq).padStart(4, '0')}` };
}
function newDoc(type) {
  const s = S.settings, n = nextNo(type);
  return {
    id: uid(), type, no: n.no, seq: n.seq, date: today(), status: 'draft', custId: '', repId: '', dept: '', rfqNo: '', rfqDate: '', lpoNo: '', lpoDate: '',
    vendId: '', cur: 'NGN', rate: 1, lines: [], vat: s.vatDefault, wht: 0, disc: 0, frt: { mode: 'none', amt: '', rate: '', pct: '', taxable: true },
    notes: '', terms: s.terms[type] || '', payType: 'credit', creditDays: s.creditDays, validDays: s.validDays, payments: [], incoterm: 'CIF', delivery: '',
    shipTo: '', vehicle: '', driver: '', from: '', invId: '', amount: '', method: 'Transfer', ref: '', created: Date.now()
  };
}
function totals(d) {
  const vat = d.type === 'po' ? { id: 'none', name: 'No VAT', rate: 0, mode: 'excl', exempt: true } : getVat(d.vat), dp = num(d.disc) / 100;
  let sub = 0, ex = 0, qty = 0;
  d.lines.forEach(l => { const a = num(l.qty) * num(l.price) * (1 - num(l.disc) / 100); sub += a; qty += num(l.qty); if (l.exempt) ex += a; });
  const dsc = sub * dp, net = sub - dsc, f = d.frt || {};
  let frt = 0;
  if (f.mode === 'fixed') frt = num(f.amt); else if (f.mode === 'qty') frt = num(f.rate) * qty; else if (f.mode === 'value') frt = net * num(f.pct) / 100;
  const base = Math.max(0, net - ex * (1 - dp) + (f.taxable !== false ? frt : 0));
  const rate = vat.exempt ? 0 : vat.rate;
  let vatAmt, total;
  if (vat.mode === 'incl' && !vat.exempt) { vatAmt = base * rate / (100 + rate); total = net + frt; } else { vatAmt = base * rate / 100; total = net + frt + vatAmt; }
  const wht = (total - vatAmt) * num(d.wht) / 100;
  const paid = (d.payments || []).reduce((s2, p) => s2 + num(p.amt), 0);
  return { sub, dsc, net, frt, qty, vat: vatAmt, vatObj: vat, total, wht, payable: total - wht, paid, balance: total - paid };
}
function invStatus(d) { const t = totals(d); if (t.total <= 0) return 'Unpaid'; if (t.paid >= t.total - 0.005) return 'Paid'; return t.paid > 0 ? 'Part paid' : 'Unpaid'; }
function frtLabel(d) {
  const f = d.frt || {};
  if (f.mode === 'qty') return `Freight (${mon(num(f.rate), d.cur)} × ${f2(totals(d).qty).replace('.00', '')} units)`;
  if (f.mode === 'value') return `Freight (${num(f.pct)}% of value)`;
  return 'Freight / delivery';
}
const custOf = d => S.customers.find(c => c.id === d.custId);
const repOf = d => { const c = custOf(d); return c && c.reps.find(r => r.id === d.repId); };
const vendOf = d => S.vendors.find(v => v.id === d.vendId);
function convertPrices(d, cur) {
  const newRate = S.settings.fx[cur] || 1, k = (num(d.rate) || 1) / newRate;
  if (d.lines.length && cur !== d.cur) d.lines.forEach(l => { l.price = Math.round(num(l.price) * k * 100) / 100; });
  d.cur = cur; d.rate = newRate;
}
function lineFromItem(it, d) {
  let p;
  if (d.type === 'po' && isImport(it) && num(it.fob) > 0) p = num(it.fob) * (S.settings.fx[it.cur || 'USD'] || 1) / (num(d.rate) || 1);
  else p = sellPrice(it) / (num(d.rate) || 1);
  return { itemId: it.id, d: it.name, qty: 1, unit: it.unit || 'pc', price: Math.round(p * 100) / 100, disc: 0, exempt: false };
}
function addLine(d, line) {
  const ex = line.itemId && d.lines.find(l => l.itemId === line.itemId && num(l.price) === num(line.price));
  if (ex) ex.qty = num(ex.qty) + num(line.qty || 1); else d.lines.push(line);
}

/* ===== document sheet (the PDF) ===== */
function headerHTML() {
  const s = S.settings;
  return `<div class="hd"><div class="hl"><img class="emb" src="${IMG.emblem}" alt=""><div class="hm"><div class="rcn">RC: ${esc(s.rc)}</div><img class="wm" src="${IMG.word}" alt="${esc(s.company)}"></div></div>
    <div class="hr"><b>HEAD OFFICE:</b><br>${esc(s.address)}<div class="phn">${esc(s.phone)}</div></div></div>
    <div class="dsc">${esc(s.tagline)}</div><div class="eml">✉ ${esc(s.email)}</div>`;
}
function footerHTML() {
  const s = S.settings;
  return `<div class="ftr"><span>${esc(s.address)}</span><span>☎ ${esc(s.phone)}</span><span>✉ ${esc(s.email)}</span></div>`;
}
function infoRows(rows) { return rows.filter(r => r[1]).map(r => `<tr><td class="k">${r[0]}</td><td>${r[1]}</td></tr>`).join(''); }
function sheetBody(d) {
  const s = S.settings, T = TYPES[d.type], t = totals(d), c = custOf(d), r = repOf(d), v = vendOf(d), cur = d.cur;
  let title = T.t;
  if (d.type === 'invoice') title = d.payType === 'cash' ? 'CASH SALES INVOICE' : 'CREDIT SALES INVOICE';
  let h = `<div class="ban">${title}</div>`;

  /* ---- info block ---- */
  if (d.type === 'receipt') {
    const inv = S.docs.find(x => x.id === d.invId), it = inv ? totals(inv) : null;
    h += `<div class="info"><div class="box"><b>Received from</b><br>${esc(c ? c.company : '—')}${c && c.address ? '<br>' + esc(c.address) : ''}${r ? '<br>Attn: ' + esc(r.name) : ''}</div>
      <table class="meta">${infoRows([['Receipt No.', esc(d.no)], ['Date', fmtDate(d.date)], ['Invoice No.', inv ? esc(inv.no) : ''], ['LPO No.', inv ? esc(inv.lpoNo) : ''], ['Payment method', esc(d.method)], ['Reference', esc(d.ref)]])}</table></div>
      <div class="rc-amt"><div class="lbl">AMOUNT RECEIVED</div><div class="val">${mon(num(d.amount), cur)}</div></div>
      <div class="words"><b>The sum of:</b> ${esc(amountWords(num(d.amount), cur))}</div>
      <div class="words"><b>Being payment for:</b> ${inv ? esc((inv.lines[0] ? inv.lines[0].d : 'Goods supplied') + (inv.lines.length > 1 ? ' and ' + (inv.lines.length - 1) + ' other item(s)' : '')) : esc(d.notes || 'Goods supplied')}</div>`;
    if (it) h += `<table class="tot"><tr><td>Invoice total</td><td class="r">${mon(it.total, inv.cur)}</td></tr><tr><td>Total paid to date</td><td class="r">${mon(it.paid, inv.cur)}</td></tr><tr class="gt"><td>BALANCE OUTSTANDING</td><td class="r">${mon(Math.max(0, it.balance), inv.cur)}</td></tr></table>`;
    if (d.notes) h += `<div class="terms"><h4>Notes</h4>${nl(d.notes)}</div>`;
    h += signHTML(false);
    return h;
  }
  if (d.type === 'po') {
    h += `<div class="info"><div class="box"><b>Vendor / Supplier</b><br>${esc(v ? v.company : '—')}${v && v.address ? '<br>' + esc(v.address) : ''}${v && v.country ? '<br>' + esc(v.country) : ''}${v && v.contact ? '<br>Attn: ' + esc(v.contact) : ''}${v && v.email ? '<br>' + esc(v.email) : ''}</div>
      <table class="meta">${infoRows([['PO No.', esc(d.no)], ['Date', fmtDate(d.date)], ['Currency', cur], ['Incoterm', esc(d.incoterm)], ['Delivery', esc(d.delivery)], ['Ship to', esc(d.shipTo || s.company + ', ' + s.address)]])}</table></div>`;
  } else if (d.type === 'dn') {
    h += `<div class="info"><div class="box"><b>Buyer</b><br>${esc(c ? c.company : '—')}${c && c.address ? '<br>' + esc(c.address) : ''}${r ? '<br>Attn: ' + esc(r.name) + (r.title ? ' (' + esc(r.title) + ')' : '') : ''}${d.dept ? '<br>Dept: ' + esc(d.dept) : ''}</div>
      <table class="meta">${infoRows([['No.', esc(d.no)], ['Date', fmtDate(d.date)], ['LPO No.', esc(d.lpoNo)], ['LPO date', fmtDate(d.lpoDate)], ['Invoice ref.', esc(d.ref)]])}</table></div>`;
  } else {
    const until = d.type === 'quote' || d.type === 'proforma' ? fmtDate(addDays(d.date, num(d.validDays) || 14)) : '';
    const due = d.type === 'invoice' && d.payType === 'credit' ? fmtDate(addDays(d.date, num(d.creditDays))) : '';
    h += `<div class="info"><div class="box"><b>${d.type === 'quote' ? 'Quoted to' : 'Customer'}</b><br>${esc(c ? c.company : '—')}${c && c.address ? '<br>' + esc(c.address) : ''}${r ? '<br>Attn: ' + esc(r.name) + (r.title ? ', ' + esc(r.title) : '') : ''}${d.dept ? '<br>Dept: ' + esc(d.dept) : ''}${(r && r.phone) || (c && c.phone) ? '<br>Tel: ' + esc((r && r.phone) || c.phone) : ''}${c && c.tin ? '<br>TIN: ' + esc(c.tin) : ''}</div>
      <table class="meta">${infoRows([['No.', esc(d.no)], ['Date', fmtDate(d.date)], ['RFQ Ref.', esc(d.rfqNo) + (d.rfqDate ? ' (' + fmtDate(d.rfqDate) + ')' : '')], ['LPO No.', esc(d.lpoNo) + (d.lpoDate ? ' (' + fmtDate(d.lpoDate) + ')' : '')],
      ['Valid until', until], ['Payment', d.type === 'invoice' ? (d.payType === 'cash' ? 'Cash' : 'Credit – ' + num(d.creditDays) + ' days') : ''], ['Due date', due], ['Currency', cur !== 'NGN' ? cur + ' (1 ' + cur + ' = ₦' + f2(d.rate) + ')' : '']])}</table></div>`;
  }

  /* ---- items table ---- */
  const hasDisc = d.lines.some(l => num(l.disc) > 0);
  let rows = '';
  d.lines.forEach((l, i) => {
    const amt = num(l.qty) * num(l.price) * (1 - num(l.disc) / 100);
    const q = f2(num(l.qty)).replace(/\.00$/, '');
    if (d.type === 'dn') rows += `<tr><td class="c">${q} ${esc(l.unit || '')}</td><td>${nl(l.d)}</td><td></td></tr>`;
    else if (d.type === 'po') rows += `<tr><td class="c">${i + 1}</td><td>${nl(l.d)}</td><td class="c">${q} ${esc(l.unit || '')}</td><td class="r">${f2(num(l.price))}</td><td class="r am">${f2(amt)}</td></tr>`;
    else rows += `<tr><td class="c">${i + 1}</td><td class="c">${q}</td><td>${nl(l.d)}${l.exempt ? ' <i>(VAT-exempt)</i>' : ''}</td><td class="c">${esc(l.unit || '')}</td><td class="r">${f2(num(l.price))}</td>${hasDisc ? `<td class="c">${num(l.disc) ? num(l.disc) + '%' : ''}</td>` : ''}<td class="r am">${f2(amt)}</td></tr>`;
  });
  if (!rows) rows = `<tr><td colspan="7" class="c" style="padding:14px;color:#888">No items added</td></tr>`;
  const sym = (CUR[cur] || CUR.NGN).sym;
  if (d.type === 'dn') h += `<table class="it"><tr><th style="width:70px">QTY</th><th>DESCRIPTION OF GOODS</th><th style="width:150px">REMARKS</th></tr>${rows}</table>`;
  else if (d.type === 'po') h += `<table class="it"><tr><th style="width:28px">S/N</th><th>DESCRIPTION</th><th style="width:70px">QTY</th><th style="width:90px">UNIT COST (${sym})</th><th style="width:100px">AMOUNT (${sym})</th></tr>${rows}</table>`;
  else h += `<table class="it"><tr><th style="width:28px">S/N</th><th style="width:48px">QTY</th><th>DESCRIPTION OF GOODS</th><th style="width:44px">UNIT</th><th style="width:92px">RATE (${sym})</th>${hasDisc ? '<th style="width:44px">DISC</th>' : ''}<th style="width:104px">AMOUNT (${sym})</th></tr>${rows}</table>`;
  if (d.type === 'dn') {
    h += `<div class="dn-box"><div>Vehicle No: <b>${esc(d.vehicle)}</b></div><div>Driver: <b>${esc(d.driver)}</b></div></div>
      <div class="gd">Above Goods Received in good condition</div>
      <div class="chk"><div>Checked by: ______________________<br><br>Date: ___________________________</div><div>Received by: ______________________<br><br>Receiver's Sign &amp; Date: _______________</div></div>`;
    return h;
  }

  /* ---- totals ---- */
  const tr = (a, b, cls) => `<tr class="${cls || ''}"><td>${a}</td><td class="r">${b}</td></tr>`;
  let tt = tr('Sub-total', mon(t.sub, cur));
  if (t.dsc) tt += tr(`Discount (${num(d.disc)}%)`, '-' + mon(t.dsc, cur));
  if (t.frt) tt += tr(frtLabel(d), mon(t.frt, cur));
  if (d.type !== 'po') {
    const vo = t.vatObj;
    if (vo.exempt) tt += tr('VAT', 'Exempt');
    else if (vo.mode === 'incl') tt += tr(`VAT ${vo.rate}% (included)`, mon(t.vat, cur), 'small');
    else tt += tr(esc(vo.name), mon(t.vat, cur));
  }
  tt += tr(d.type === 'po' ? 'TOTAL' : 'TOTAL', mon(t.total, cur), 'gt');
  if (d.type !== 'po' && num(d.wht)) { tt += tr(`Less WHT ${num(d.wht)}% (to be deducted &amp; remitted by customer)`, '-' + mon(t.wht, cur), 'small'); tt += tr('Net payable', mon(t.payable, cur), 'bold'); }
  if (d.type === 'invoice' && t.paid > 0) { tt += tr('Advance / paid to date', mon(t.paid, cur)); tt += tr('BALANCE DUE', mon(Math.max(0, t.balance), cur), 'gt'); }
  h += `<table class="tot">${tt}</table>`;
  h += `<div class="words"><b>Amount in words:</b> ${esc(amountWords(t.total, cur))}</div>`;
  if (d.type === 'invoice') h += `<div class="rcv">Received the above goods in good condition. No refund of money after payment.</div>`;

  /* ---- notes, terms, bank ---- */
  let terms = '';
  if (d.terms) terms += `<h4>Terms &amp; conditions</h4>${nl(d.terms)}`;
  if (d.notes) terms += `<h4>Notes</h4>${nl(d.notes)}`;
  if (s.bank && d.type !== 'po') terms += `<h4>Bank details</h4>${nl(s.bank)}`;
  if (terms) h += `<div class="terms">${terms}</div>`;
  h += signHTML(d.type !== 'po');
  return h;
}
const SIGKEYS = { blue: 'signBlue', black: 'signBlack', old: 'sign' };
function sigSrc() { const k = SIGKEYS[S.settings.sign]; return k ? IMG[k] : ''; }
function signHTML(cust) {
  const s = S.settings;
  return `<div class="sign">${cust ? `<div><div class="sp"></div><div class="ln">Customer's sign &amp; date</div></div>` : '<div></div>'}
    <div>${sigSrc() ? `<img src="${sigSrc()}" alt="">` : '<div class="sp"></div>'}<div class="ln">For: <b>${esc(s.company)}</b>${s.signer ? '<br>' + esc(s.signer) : ''}</div></div></div>
    <div class="thx">Thanks for your patronage – please call again.</div>`;
}
function sheetHTML(d) {
  const lh = S.settings.printStyle === 'letterhead';
  const body = sheetBody(d);
  if (lh) return `<table class="lhw"><thead><tr><td><div class="sp1"></div></td></tr></thead><tbody><tr><td class="lhc">${body}</td></tr></tbody><tfoot><tr><td><div class="sp2"></div></td></tr></tfoot></table>`;
  return headerHTML() + body + footerHTML();
}
