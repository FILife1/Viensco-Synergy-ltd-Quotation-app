/* Viensco Synergy Ltd – catalogue & reference data.
   ALL PRICES ARE STARTING ESTIMATES (₦ for shelf stock, USD FOB for imports). Edit in the app. */
const r50 = v => Math.round(v / 50) * 50;
const CUR = {
  NGN: { sym: '₦', name: 'Naira', minor: 'Kobo' }, USD: { sym: '$', name: 'Dollars', minor: 'Cents' },
  GBP: { sym: '£', name: 'Pounds', minor: 'Pence' }, EUR: { sym: '€', name: 'Euros', minor: 'Cents' },
  CNY: { sym: 'CN¥', name: 'Yuan', minor: 'Fen' }, INR: { sym: '₹', name: 'Rupees', minor: 'Paise' }
};
const ORIGINS = ['Local', 'China', 'UK', 'US', 'Vietnam', 'India', 'Indonesia', 'Germany', 'Other'];
const CAT_LIST = [
  ['mcb', 'MCBs, RCCBs & MCCBs'], ['cont', 'Contactors & overload relays'], ['rly', 'Relays (glass, timer, control)'],
  ['led', 'LED lighting (AKT)'], ['wire', 'Switches, plugs & sockets'], ['sens', 'Limit, reed & magnetic switches'],
  ['ind', 'Inductive & capacitive sensors'], ['drive', 'Soft starters, VFDs & MPCBs'], ['pneu', 'Pneumatic cylinders, fittings & tubes'],
  ['sol', 'Solenoid valves & coils (Airtac)'], ['plc', 'PLCs, HMI & modules'], ['steam', 'Steam & industrial valves'],
  ['solar', 'Solar panels, inverters & batteries'], ['acc', 'Control & panel accessories'], ['cable', 'Cables (use Cable builder)'], ['svc', 'Services']
];
const DUTY_L = {
  sw: 'Switchgear, MCB, contactors, relays (HS 8535-8538)', cab: 'Electric cables & wire (HS 8544)', mot: 'Motors, VFDs, soft starters (HS 8501/8504)',
  led: 'LED lamps & luminaires (HS 8539/9405)', plc: 'PLC, HMI & automation (HS 8537/8471)', sen: 'Sensors & instruments (HS 9026/9031)',
  pneu: 'Pneumatic cylinders, valves & fittings (HS 8412/8481)', valve: 'Industrial & steam valves (HS 8481)', tube: 'Plastic tubes & hoses (HS 3917)',
  solar: 'Solar panels & PV parts (HS 8541)', batt: 'Batteries (HS 8507)', inv: 'Inverters & chargers (HS 8504)', other: 'Other electrical / mechanical spares'
};
const DUTY_DEF = { sw: 20, cab: 20, mot: 10, led: 20, plc: 10, sen: 10, pneu: 10, valve: 10, tube: 20, solar: 5, batt: 20, inv: 10, other: 10 };

const FX_DEF = { NGN: 1, USD: 1330, GBP: 1770, EUR: 1540, CNY: 187, INR: 15 };

/* VAT / tax options: mode 'excl' = added on top, 'incl' = already inside prices, exempt = no tax line */
const VAT_DEF = [
  { id: 'v75i', name: 'VAT 7.5% – Inventoried goods', rate: 7.5, mode: 'excl' },
  { id: 'v75n', name: 'VAT 7.5% – Non-inventoried items / services', rate: 7.5, mode: 'excl' },
  { id: 'v75inc', name: 'VAT 7.5% – inclusive in prices', rate: 7.5, mode: 'incl' },
  { id: 'v0', name: 'Zero-rated 0% (exports / zero-rated supply)', rate: 0, mode: 'excl' },
  { id: 'vex', name: 'VAT exempt – no VAT', rate: 0, mode: 'excl', exempt: true },
  { id: 'v5', name: 'VAT 5% (e.g. UAE)', rate: 5, mode: 'excl' },
  { id: 'vgh', name: 'Ghana VAT 15%', rate: 15, mode: 'excl' },
  { id: 'vza', name: 'South Africa VAT 15%', rate: 15, mode: 'excl' },
  { id: 'vke', name: 'Kenya VAT 16%', rate: 16, mode: 'excl' },
  { id: 'vin', name: 'India GST 18%', rate: 18, mode: 'excl' },
  { id: 'vuk', name: 'UK VAT 20%', rate: 20, mode: 'excl' }
];

const CABLE = {
  types: { flex: ['Flexible (stranded copper, PVC)', 2.1], arm: ['Armoured (PVC/SWA/PVC)', 2.5], nonarm: ['Non-armoured (PVC/PVC)', 1.95] },
  brands: { Nocaco: 1.15, Nigerchin: 1.0, Kablemetal: 1.0, Nexus: 1.05, Purechem: 0.95, CDivine: 0.95, Coleman: 1.1, Other: 1.0 },
  small: [1, 1.5, 2.5, 4, 6, 10, 16], mid: [25, 35, 50, 70, 95, 120, 150, 185, 240, 300], big: [500, 630, 800, 1000]
};
function cableCores(type, size) {
  if (type === 'flex') return size <= 16 ? [3, 4, 5] : [];
  if (size <= 16) return [3, 4, 5];
  if (size <= 300) return [3.5, 4];
  return [1];
}
function cableSizes(type) { return type === 'flex' ? CABLE.small : CABLE.small.concat(CABLE.mid, CABLE.big); }

/* ---------- catalogue generators ---------- */
const CATALOG = [];
function P(id, cat, name, brand, unit, org, price, x) { CATALOG.push(Object.assign({ id, cat, name, brand, unit, org, price: Math.round(price) }, x || {})); }
function I(id, cat, name, brand, unit, org, fob, duty, x) { CATALOG.push(Object.assign({ id, cat, name, brand, unit, org, price: 0, fob: Math.round(fob * 100) / 100, cur: 'USD', duty }, x || {})); }
const sl = s => String(s).replace(/[^a-z0-9]+/gi, '').toLowerCase();

(function gen() {
  /* MCBs, RCCBs, MCCBs */
  const bf = { ABB: 2.4, Schneider: 2.8, Siemens: 2.6, Chint: 1 };
  const mdl = { ABB: 'S200 C-curve 6kA', Schneider: 'Acti9 iC60N C-curve', Siemens: '5SL C-curve 6kA', Chint: 'NB1-63 C-curve 6kA' };
  const poles = [[1, 1], [2, 2.1], [3, 3.2], [4, 4.3]];
  Object.keys(bf).forEach(b => {
    [6, 10, 16, 20, 25, 32, 40, 50, 63].forEach(a => poles.forEach(([p, pf]) =>
      P(`mcb-${sl(b)}-${p}-${a}`, 'mcb', `${b} MCB ${p}P ${a}A (${mdl[b]})`, b, 'pc', 'Local', r50((1500 + 55 * a) * pf * bf[b]))));
    [25, 40, 63, 80].forEach(a => [2, 4].forEach(p =>
      P(`rccb-${sl(b)}-${p}-${a}`, 'mcb', `${b} RCCB ${p}P ${a}A 30mA`, b, 'pc', 'Local', r50((9000 + 250 * a) * (p === 4 ? 1.9 : 1) * (b === 'Chint' ? 1 : bf[b] * 1.05)))));
    [63, 100, 125, 160, 200, 250, 315, 400, 630].forEach(a =>
      P(`mccb-${sl(b)}-${a}`, 'mcb', `${b} MCCB 3P ${a}A (adjustable thermal-magnetic)`, b, 'pc', 'Local', r50((18000 + 520 * a) * (b === 'Chint' ? 1 : bf[b] * 1.3))));
  });

  /* Contactors & overload relays */
  const cm = { Chint: 'NC1', Schneider: 'TeSys D LC1D', Siemens: 'Sirius 3RT', ABB: 'AF series' };
  const cf = { Chint: 1, Schneider: 3.2, Siemens: 3.4, ABB: 3.0 };
  Object.keys(cf).forEach(b => {
    [9, 12, 18, 25, 32, 40, 50, 65, 80, 95, 115, 150, 185, 225].forEach(a => [['220VAC', 1], ['380-415VAC', 1.03]].forEach(([coil, k]) =>
      P(`ct-${sl(b)}-${a}-${coil}`, 'cont', `${b} contactor ${a}A, ${coil} coil (${cm[b]})`, b, 'pc', 'Local', r50((6000 + 440 * a) * cf[b] * k))));
    [[0.63, 1], [1, 1.6], [1.6, 2.5], [2.5, 4], [4, 6], [5.5, 8], [7, 10], [9, 13], [12, 18], [17, 25], [23, 32], [30, 40], [37, 50], [48, 65]].forEach(([lo, hi]) =>
      P(`ol-${sl(b)}-${hi}`, 'cont', `${b} thermal overload relay ${lo}-${hi}A`, b, 'pc', 'Local', r50((5500 + 350 * hi) * (b === 'Chint' ? 1 : cf[b] * 0.9))));
  });
  P('ct-aux-chint', 'cont', 'Chint auxiliary contact block 1NO+1NC', 'Chint', 'pc', 'Local', 2800);
  P('ct-aux-sch', 'cont', 'Schneider auxiliary contact block 1NO+1NC', 'Schneider', 'pc', 'Local', 7500);
  P('ct-mech', 'cont', 'Contactor mechanical interlock kit', 'Chint', 'pc', 'Local', 4500);
  P('ct-sd', 'cont', 'Star-delta timer block (contactor mount)', 'Chint', 'pc', 'Local', 12500);

  /* Relays */
  const pb = { 6: 3200, 8: 4200, 11: 5200, 14: 6200 };
  [['Omron', 1.6, 'Vietnam'], ['Chint', 0.7, 'Local']].forEach(([b, f, o]) => {
    [6, 8, 11, 14].forEach(pin => ['12VDC', '24VDC', '24VAC', '110VAC', '220VAC'].forEach(c =>
      P(`gr-${sl(b)}-${pin}-${c}`, 'rly', `${b} glass relay ${pin}-pin, ${c} coil`, b, 'pc', 'Local', r50(pb[pin] * f * (c.includes('AC') ? 1.05 : 1)))));
    [6, 8, 11, 14].forEach(pin => P(`grs-${sl(b)}-${pin}`, 'rly', `${b} relay socket / base ${pin}-pin`, b, 'pc', 'Local', r50((1200 + pin * 120) * f)));
  });
  P('tdr-omron-8', 'rly', 'Omron H3Y-2 time-delay relay 8-pin, 24VDC / 220VAC', 'Omron', 'pc', 'Local', 24500);
  P('tdr-omron-14', 'rly', 'Omron H3CR-A time-delay relay 11-pin, 24-240V', 'Omron', 'pc', 'Local', 38500);
  P('tdr-chint', 'rly', 'Chint JS14 time-delay relay 14-pin', 'Chint', 'pc', 'Local', 11500);
  P('pfr-chint', 'rly', 'Chint phase-failure / phase-sequence relay 380-415V', 'Chint', 'pc', 'Local', 14500);
  P('pfr-sch', 'rly', 'Schneider phase-failure relay RM17 380-415V', 'Schneider', 'pc', 'Local', 68000);
  P('lvl-relay', 'rly', 'Liquid level control relay 220VAC (8-pin)', 'Chint', 'pc', 'Local', 16500);

  /* LED lighting – AKT */
  [[50, 6500], [100, 12500], [150, 17500], [200, 23000]].forEach(([w, p]) => P(`akt-fl-${w}`, 'led', `AKT LED flood light ${w}W, IP65`, 'AKT', 'pc', 'Local', p));
  [5, 7, 9, 12, 15, 18, 20, 30, 40].forEach(w => ['E27', 'B22'].forEach(c => P(`akt-bulb-${w}-${c}`, 'led', `AKT LED bulb ${w}W ${c}`, 'AKT', 'pc', 'Local', r50(500 + 85 * w))));
  P('akt-panel-18', 'led', 'AKT LED panel light 18W (surface/recessed)', 'AKT', 'pc', 'Local', 6500);
  P('akt-tube-18', 'led', 'AKT LED tube 18W T8 4ft', 'AKT', 'pc', 'Local', 2800);
  P('akt-street-100', 'led', 'AKT LED street light 100W', 'AKT', 'pc', 'Local', 24000);

  /* Switches, plugs & sockets */
  [1, 2, 3].forEach(g => [1, 2].forEach(w => P(`sw-${g}g${w}w`, 'wire', `${g}-gang ${w}-way light switch`, 'Generic', 'pc', 'Local', 700 + 600 * g + (w === 2 ? 400 : 0))));
  P('sk-13-1', 'wire', '13A 1-gang switched socket', 'Generic', 'pc', 'Local', 1500);
  P('sk-13-2', 'wire', '13A 2-gang switched socket', 'Generic', 'pc', 'Local', 2800);
  P('sk-15-1', 'wire', '15A round-pin socket (switched)', 'Generic', 'pc', 'Local', 2200);
  P('pl-13', 'wire', '13A plug top (fused)', 'Generic', 'pc', 'Local', 900);
  P('pl-15', 'wire', '15A round-pin plug top', 'Generic', 'pc', 'Local', 1600);
  P('ext-13', 'wire', '13A 4-way extension socket 3m', 'Generic', 'pc', 'Local', 6500);
  P('ind-sock', 'wire', 'Industrial plug & socket 3P+N+E 32A IP67 (set)', 'Chint', 'set', 'Local', 18500);

  /* Limit, reed & magnetic switches */
  [['Omron WLCA2-2 roller-lever limit switch', 'Omron', 24000], ['Omron WLCA12-2 roller-plunger limit switch', 'Omron', 26500], ['Schneider XCKP2118 limit switch', 'Schneider', 31000],
  ['Chint YBLX-K1/111 limit switch', 'Chint', 6500], ['Chint YBLX-ME/8104 limit switch', 'Chint', 7500], ['Chint YBLX-ME/8108 limit switch', 'Chint', 8200],
  ['Siemens 3SE5 limit switch', 'Siemens', 38000]].forEach(([n, b, p], i) => P('ls-' + i, 'sens', n, b, 'pc', 'Local', p));
  [['Reed switch, glass type (NO) 2×14mm', 'Generic', 650], ['Magnetic reed sensor for pneumatic cylinder (Airtac CS1-J)', 'Airtac', 3800], ['Magnetic reed sensor Airtac DMSG-020', 'Airtac', 4200],
  ['Magnetic safety switch / door contact (surface)', 'Generic', 2200], ['Industrial magnetic proximity switch (NO+NC) 3A', 'Generic', 9500], ['Magnetic float switch (level) PP, 1m cable', 'Generic', 7500]]
    .forEach(([n, b, p], i) => P('rs-' + i, 'sens', n, b, 'pc', 'Local', p));

  /* ifm inductive & capacitive sensors (imported) */
  const bs = { M8: 38, M12: 45, M18: 52, M30: 68 }, rg = { M8: [2, 4], M12: [4, 8], M18: [8, 12], M30: [15, 22] };
  Object.keys(bs).forEach(sz => rg[sz].forEach((r, ri) => ['PNP', 'NPN'].forEach(o => ['NO', 'NC'].forEach(n =>
    I(`ifm-ind-${sz}-${r}-${o}-${n}`, 'ind', `ifm inductive sensor ${sz}, ${r}mm ${ri ? 'non-flush' : 'flush'}, ${o} ${n}, 10-30VDC`, 'ifm', 'pc', 'UK', bs[sz] * (ri ? 1.25 : 1) * (o === 'NPN' ? 1.04 : 1), 'sen')))));
  [['M18', 75], ['M30', 85]].forEach(([sz, f]) => ['PNP', 'NPN'].forEach(o => ['NO', 'NC'].forEach(n =>
    I(`ifm-cap-${sz}-${o}-${n}`, 'ind', `ifm capacitive sensor ${sz}, ${o} ${n}, 10-36VDC`, 'ifm', 'pc', 'UK', f, 'sen'))));

  /* Soft starters, VFDs, MPCBs (imported) */
  const dv = { Siemens: [1.25, 'SINAMICS'], ABB: [1.15, 'ACS'], Schneider: [1.2, 'Altivar'] };
  Object.keys(dv).forEach(b => {
    [0.75, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110].forEach(kw =>
      I(`vfd-${sl(b)}-${kw}`, 'drive', `${b} ${dv[b][1]} VFD ${kw}kW, 380-415V 3-phase`, b, 'pc', 'India', (120 + 45 * kw) * dv[b][0], 'mot'));
    [5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110].forEach(kw =>
      I(`ss-${sl(b)}-${kw}`, 'drive', `${b} soft starter ${kw}kW, 380-415V`, b, 'pc', 'India', (95 + 38 * kw) * dv[b][0], 'mot'));
  });
  ['Siemens', 'ABB', 'Schneider', 'Chint'].forEach(b => [[0.63, 1], [1, 1.6], [1.6, 2.5], [2.5, 4], [4, 6.3], [6, 10], [9, 14], [13, 18], [17, 23], [20, 25], [24, 32]].forEach(([lo, hi]) =>
    I(`mpcb-${sl(b)}-${hi}`, 'drive', `${b} MPCB motor protection circuit breaker ${lo}-${hi}A`, b, 'pc', b === 'Chint' ? 'China' : 'UK', (28 + 3.2 * hi) * (b === 'Chint' ? 0.45 : b === 'ABB' ? 1.05 : b === 'Siemens' ? 1.15 : 1.1), 'sw')));

  /* Pneumatics (Airtac) */
  const bore = { 32: 8, 40: 11, 50: 15, 63: 20, 80: 30, 100: 42 };
  Object.keys(bore).forEach(bo => [25, 50, 75, 100, 150, 200, 250, 300].forEach(st =>
    I(`pc-sc-${bo}-${st}`, 'pneu', `Airtac SC pneumatic cylinder Ø${bo} × ${st}mm stroke`, 'Airtac', 'pc', 'China', bore[bo] + st * 0.04 * (bo / 32), 'pneu')));
  const mb = { 16: 6, 20: 7, 25: 8.5, 32: 10 };
  Object.keys(mb).forEach(bo => [25, 50, 75, 100, 150, 200].forEach(st =>
    I(`pc-mal-${bo}-${st}`, 'pneu', `Airtac MAL mini cylinder Ø${bo} × ${st}mm stroke`, 'Airtac', 'pc', 'China', mb[bo] + st * 0.03, 'pneu')));
  [[4, 'M5'], [6, '1/8"'], [6, '1/4"'], [8, '1/8"'], [8, '1/4"'], [8, '3/8"'], [10, '1/4"'], [10, '3/8"'], [10, '1/2"'], [12, '3/8"'], [12, '1/2"']].forEach(([t, th]) => {
    P(`qc-ms-${t}-${sl(th)}`, 'pneu', `Quick-connect fitting, straight male, tube ${t}mm × ${th}`, 'Airtac', 'pc', 'Local', r50(450 + t * 60));
    P(`qc-me-${t}-${sl(th)}`, 'pneu', `Quick-connect fitting, elbow male, tube ${t}mm × ${th}`, 'Airtac', 'pc', 'Local', r50((450 + t * 60) * 1.2));
  });
  [4, 6, 8, 10, 12].forEach(t => [['union straight', 1], ['union elbow', 1.2], ['union tee', 1.6]].forEach(([n, k]) =>
    P(`qc-${sl(n)}-${t}`, 'pneu', `Quick-connect ${n}, tube ${t}mm`, 'Airtac', 'pc', 'Local', r50((500 + t * 50) * k))));
  const pu = { 4: 300, 6: 450, 8: 700, 10: 1000, 12: 1400 };
  [4, 6, 8, 10, 12].forEach(t => ['Blue', 'Black', 'Clear'].forEach(c => {
    P(`pu-${t}-${c}`, 'pneu', `PU air tube ${t}mm OD, ${c}`, 'Airtac', 'm', 'Local', pu[t]);
    if (t >= 6 && t <= 10) P(`pur-${t}-${c}`, 'pneu', `PU air tube ${t}mm OD, ${c}, 100m roll`, 'Airtac', 'roll', 'Local', r50(pu[t] * 100 * 0.88));
  }));
  [['Airtac AC2000-02 FRL unit 1/4"', 14500], ['Airtac AC3000-03 FRL unit 3/8"', 21000], ['Airtac AC4000-04 FRL unit 1/2"', 29000], ['Pneumatic silencer brass 1/8"', 450], ['Pneumatic silencer brass 1/4"', 600], ['Pneumatic silencer brass 1/2"', 1100], ['Pressure gauge 0-10 bar, 1/4" bottom', 3200], ['Air blow gun with nozzle', 4500], ['Quick air coupler set 1/4" (plug+socket)', 3800]]
    .forEach(([n, p], i) => P('pn-x' + i, 'pneu', n, n.startsWith('Airtac') ? 'Airtac' : 'Generic', 'pc', 'Local', p));

  /* Airtac solenoid valves & coils */
  const sv = { '06': ['1/8"', 7500, '4V110-06'], '08': ['1/4"', 8500, '4V210-08'], '10': ['3/8"', 11500, '4V310-10'], '15': ['1/2"', 14500, '4V410-15'] };
  const pos = [['110', 'single coil, 5/2-way', 1], ['120', 'double coil, 5/2-way', 1.35], ['130C', '3-position closed-centre, 5/3-way', 1.55], ['130E', '3-position exhaust-centre, 5/3-way', 1.55], ['130P', '3-position pressure-centre, 5/3-way', 1.55]];
  Object.keys(sv).forEach(pt => {
    pos.forEach(([code, desc, k]) => ['24VDC', '24VAC', '220VAC'].forEach(c => {
      const model = `4V${sv[pt][2].charAt(2)}${code.slice(1)}-${pt}`;
      P(`sv-${pt}-${code}-${c}`, 'sol', `Airtac ${model} solenoid valve ${desc}, ${sv[pt][0]}, ${c}`, 'Airtac', 'pc', 'Local', r50(sv[pt][1] * k));
    }));
    ['24VDC', '24VAC', '220VAC'].forEach(c => P(`sc-${pt}-${c}`, 'sol', `Airtac solenoid coil for 4V${sv[pt][2].charAt(2)} series (${sv[pt][0]}), ${c}`, 'Airtac', 'pc', 'Local', r50(sv[pt][1] * 0.38)));
  });

  /* Siemens S7-1200 PLCs & modules (imported) */
  const cpus = { '1211C': 330, '1212C': 400, '1214C': 520, '1215C': 780, '1217C': 1050 };
  Object.keys(cpus).forEach(c => [['DC/DC/DC', 1], ['AC/DC/Relay', 1.07], ['DC/DC/Relay', 1.03]].forEach(([v, k]) => {
    if (c === '1217C' && v !== 'DC/DC/DC') return;
    I(`s7-${c}-${sl(v)}`, 'plc', `Siemens S7-1200 CPU ${c} ${v}`, 'Siemens', 'pc', 'UK', cpus[c] * k, 'plc');
  }));
  [['SM1221 digital input 8DI 24VDC', 150], ['SM1221 digital input 16DI 24VDC', 240], ['SM1222 digital output 8DQ relay', 190], ['SM1222 digital output 16DQ relay', 310], ['SM1222 digital output 8DQ 24VDC', 170],
  ['SM1222 digital output 16DQ 24VDC', 280], ['SM1223 combo 8DI/8DQ relay', 300], ['SM1223 combo 16DI/16DQ 24VDC', 440], ['SM1231 analog input 4AI', 270], ['SM1231 analog input 8AI', 420],
  ['SM1232 analog output 2AO', 260], ['SM1232 analog output 4AO', 400], ['SM1234 analog combo 4AI/2AO', 340], ['SM1231 RTD 4-channel', 380], ['SM1231 thermocouple 4-channel', 360],
  ['CM1241 RS485 communication module', 210], ['CM1241 RS232 communication module', 210], ['CSM1277 4-port Ethernet switch', 160], ['PM1207 power supply 24VDC 2.5A', 190],
  ['SIMATIC memory card 24MB', 80], ['KTP400 Basic HMI 4.3"', 360], ['KTP700 Basic HMI 7"', 590], ['KTP900 Basic HMI 9"', 940], ['KTP1200 Basic HMI 12"', 1450],
  ['LOGO! 8.3 logic module 12/24RCE', 190], ['LOGO! 8.3 logic module 230RCE', 195], ['LOGO! DM8 230R expansion', 105], ['LOGO! power supply 24V 1.3A', 55]]
    .forEach(([n, f], i) => I('s7-m' + i, 'plc', `Siemens ${n}`, 'Siemens', 'pc', 'UK', f, 'plc'));

  /* Steam & industrial valves (imported) */
  const vt = [['Gate valve, cast steel, flanged PN40', 22], ['Globe valve, cast steel, flanged PN40', 28], ['Swing check valve, cast steel, flanged PN40', 24], ['Ball valve, steam-rated 3-piece SS', 30],
  ['Y-strainer, cast steel, flanged', 20], ['Spring safety relief valve (steam)', 55], ['Thermodynamic steam trap', 38], ['Pressure reducing valve (steam)', 160]];
  const vs = { 15: 1, 20: 1.3, 25: 1.7, 32: 2.4, 40: 3.2, 50: 4.8, 65: 7.5, 80: 10.5, 100: 17 };
  vt.forEach(([n, f], ti) => Object.keys(vs).forEach(dn => I(`vl-${ti}-${dn}`, 'steam', `${n} DN${dn}`, 'Generic', 'pc', 'India', f * vs[dn], 'valve')));

  /* Solar, inverters, batteries (shelf) */
  [[450, 112000], [550, 142000], [600, 155000], [650, 170000]].forEach(([w, p]) => P('pv-' + w, 'solar', `Mono PERC solar panel ${w}W`, 'Generic', 'pc', 'Local', p));
  [[5, 1050000], [8, 1950000], [10, 2650000], [12, 3400000]].forEach(([k, p]) => P('hy-' + k, 'solar', `Hybrid solar inverter ${k}kW / 48V with MPPT`, 'Generic', 'pc', 'Local', p));
  [['LiFePO4 lithium battery 48V 100Ah (5.12kWh)', 1650000], ['LiFePO4 lithium battery 48V 200Ah (10.24kWh)', 3200000], ['LiFePO4 lithium battery 51.2V 314Ah (16kWh)', 4700000], ['Tubular gel battery 12V 200Ah', 360000], ['AGM deep-cycle battery 12V 100Ah', 205000],
  ['MPPT charge controller 60A', 170000], ['MPPT charge controller 100A', 340000], ['Solar PV cable 6mm² (per metre)', 1700], ['MC4 solar connector pair', 2500], ['DC circuit breaker 2P 125A', 28000], ['DC circuit breaker 2P 250A', 58000], ['DC surge protector 1000V 2P', 32000],
  ['PV combiner box 4-string', 95000], ['Roof mounting rails & clamps (per panel)', 22000], ['Battery rack 4-tier', 160000], ['Automatic transfer switch 2P 63A', 65000], ['Class-T battery fuse 200A with holder', 38000]]
    .forEach(([n, p], i) => P('sx-' + i, 'solar', n, 'Generic', n.includes('(per metre)') ? 'm' : 'pc', 'Local', p));

  /* Control & panel accessories */
  [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300].forEach(s => P(`lug-${s}`, 'acc', `Copper tube cable lug ${s}mm²`, 'Generic', 'pc', 'Local', r50(120 + s * 22)));
  [20, 25, 32, 40, 50, 63].forEach(s => { P(`gl-b-${s}`, 'acc', `Brass cable gland ${s}mm (armoured)`, 'Generic', 'pc', 'Local', r50(600 + s * 130)); P(`gl-n-${s}`, 'acc', `Nylon cable gland ${s}mm IP68`, 'Generic', 'pc', 'Local', r50(150 + s * 20)); });
  [2.5, 4, 6, 10, 16, 35].forEach(s => P(`tb-${s}`, 'acc', `DIN-rail terminal block ${s}mm²`, 'Chint', 'pc', 'Local', r50(200 + s * 45)));
  [['DIN rail 35mm × 1m (galvanised)', 1800], ['22mm push button green (NO)', 1500], ['22mm push button red (NC)', 1500], ['22mm push button yellow', 1500], ['22mm indicator lamp 220VAC (red/green/amber)', 1400], ['22mm indicator lamp 24VDC (red/green/amber)', 1400],
  ['22mm 2-position selector switch', 2800], ['22mm 3-position selector switch', 3300], ['22mm emergency stop (mushroom, twist release)', 3800], ['Digital timer 24-hour programmable (DIN)', 16000], ['Panel ammeter analogue 0-100A', 4500], ['Panel voltmeter analogue 0-500V', 4500],
  ['Digital multifunction power meter (3-phase)', 28000], ['Current transformer 100/5A', 4500], ['Current transformer 200/5A', 5200], ['Current transformer 400/5A', 6800], ['Current transformer 800/5A', 9800], ['Copper busbar 200A (per metre)', 18000],
  ['Distribution board 4-way TPN', 14500], ['Distribution board 8-way TPN', 26500], ['Distribution board 12-way TPN', 38500], ['Control panel enclosure 600×400×200 IP65', 52000], ['Cable tie 300mm (pack of 100)', 1800], ['Thermostat (panel fan) NC 0-60°C', 3500], ['Panel cooling fan 220V 120mm', 5500]]
    .forEach(([n, p], i) => P('ac-' + i, 'acc', n, n.includes('Chint') ? 'Chint' : 'Generic', n.includes('(per metre)') ? 'm' : 'pc', 'Local', p));

  /* Services */
  [['Installation & wiring labour (per day)', 'day', 45000], ['Panel building / assembly labour', 'job', 120000], ['PLC programming & commissioning', 'job', 250000], ['VFD / soft starter set-up & commissioning', 'job', 60000],
  ['Site survey & technical assessment', 'job', 30000], ['Testing, commissioning & report', 'job', 40000], ['Delivery / local transport', 'trip', 15000], ['Maintenance call-out', 'visit', 50000]]
    .forEach(([n, u, p], i) => P('svc-' + i, 'svc', n, 'Viensco', u, 'Local', p));
})();

/* ---------- sample (demo) data – replace with your own ---------- */
const SAMPLE_CUSTOMERS = [
  { id: 'cu1', sample: true, company: 'Sample Cement Works Ltd', address: 'Industrial Layout, Kaduna', tin: '', phone: '08000000001', email: 'procurement@sample-cement.example', reps: [
    { id: 'r1', name: 'Engr. Musa Ibrahim', title: 'Maintenance Manager', dept: 'Maintenance Department', phone: '08000000011', email: 'musa@sample-cement.example' },
    { id: 'r2', name: 'Mrs Ngozi Eze', title: 'Procurement Officer', dept: 'Procurement / Stores', phone: '08000000012', email: 'ngozi@sample-cement.example' }] },
  { id: 'cu2', sample: true, company: 'Sample Breweries Plc', address: 'Oba Akran Avenue, Ikeja, Lagos', tin: '', phone: '08000000002', email: 'purchasing@sample-brew.example', reps: [
    { id: 'r1', name: 'Engr. Tunde Bakare', title: 'Electrical Engineer', dept: 'Engineering', phone: '08000000021', email: 'tunde@sample-brew.example' },
    { id: 'r2', name: 'Mr Chidi Okafor', title: 'Purchasing Manager', dept: 'Supply Chain', phone: '08000000022', email: 'chidi@sample-brew.example' }] },
  { id: 'cu3', sample: true, company: 'Sample Flour & Feeds Mills Ltd', address: 'Apapa, Lagos', tin: '', phone: '08000000003', email: 'stores@sample-flour.example', reps: [
    { id: 'r1', name: 'Mr Emeka Obi', title: 'Instrumentation Supervisor', dept: 'Instrumentation & Controls', phone: '08000000031', email: 'emeka@sample-flour.example' }] },
  { id: 'cu4', sample: true, company: 'Sample Water Works Authority', address: 'Central Area, Abuja', tin: '', phone: '08000000004', email: 'procurement@sample-water.example', reps: [
    { id: 'r1', name: 'Engr. Aisha Bello', title: 'Head, Mechanical & Electrical', dept: 'Mechanical & Electrical Services', phone: '08000000041', email: 'aisha@sample-water.example' },
    { id: 'r2', name: 'Mr Yakubu Danjuma', title: 'Procurement Officer', dept: 'Procurement Unit', phone: '08000000042', email: 'yakubu@sample-water.example' }] },
  { id: 'cu5', sample: true, company: 'Sample Steel & Rolling Mill Ltd', address: 'Ota, Ogun State', tin: '', phone: '08000000005', email: 'purchase@sample-steel.example', reps: [
    { id: 'r1', name: 'Engr. Samuel Adeyemi', title: 'Plant Engineer', dept: 'Plant Maintenance', phone: '08000000051', email: 'samuel@sample-steel.example' }] },
  { id: 'cu6', sample: true, company: 'Sample Hospital Facilities Mgmt', address: 'Garki, Abuja', tin: '', phone: '08000000006', email: 'facilities@sample-hospital.example', reps: [
    { id: 'r1', name: 'Mr Ifeanyi Nwosu', title: 'Facilities Manager', dept: 'Facilities & Estates', phone: '08000000061', email: 'ifeanyi@sample-hospital.example' }] },
  { id: 'cu7', sample: true, company: 'Sample Solar Integrators Ltd', address: 'Sabon Gari, Kano', tin: '', phone: '08000000007', email: 'info@sample-solar.example', reps: [
    { id: 'r1', name: 'Mr Abdullahi Sani', title: 'Operations Manager', dept: 'Projects', phone: '08000000071', email: 'abdullahi@sample-solar.example' }] }
];
const SAMPLE_VENDORS = [
  { id: 've1', sample: true, company: 'Sample Shenzhen Electric Co. Ltd', country: 'China', cur: 'USD', contact: 'Ms Li Wei', phone: '', email: 'sales@sample-shenzhen.example', address: 'Shenzhen, China' },
  { id: 've2', sample: true, company: 'Sample UK Industrial Supplies Ltd', country: 'UK', cur: 'GBP', contact: 'Mr James Clarke', phone: '', email: 'orders@sample-ukind.example', address: 'Birmingham, UK' },
  { id: 've3', sample: true, company: 'Sample US Automation Inc.', country: 'US', cur: 'USD', contact: 'Ms Karen Miles', phone: '', email: 'sales@sample-usauto.example', address: 'Houston, Texas, USA' },
  { id: 've4', sample: true, company: 'Sample Hanoi Components JSC', country: 'Vietnam', cur: 'USD', contact: 'Mr Nguyen Van An', phone: '', email: 'export@sample-hanoi.example', address: 'Hanoi, Vietnam' },
  { id: 've5', sample: true, company: 'Sample Mumbai Valves Pvt Ltd', country: 'India', cur: 'USD', contact: 'Mr Rajesh Mehta', phone: '', email: 'export@sample-mumbai.example', address: 'Mumbai, India' },
  { id: 've6', sample: true, company: 'Sample Jakarta Cables PT', country: 'Indonesia', cur: 'USD', contact: 'Mr Budi Santoso', phone: '', email: 'sales@sample-jakarta.example', address: 'Jakarta, Indonesia' }
];
