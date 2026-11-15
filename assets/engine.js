/* Aircraft Lease Market v2 engine (Ind AS 116). Fictional case, Rs crore.
   This exact file runs in the browser (assets/engine.js) and in Google Apps Script (Engine.gs).
   Plain functions only: no DOM, no Google services. Private card decks live in Code.gs, not here. */
var LM = (function () {
  var FV = 400, LIFE = 20, TERMS = [6, 8, 10, 12, 15, 18];
  var LIM = { rent: [30, 70, 0.5], rvg: [0, 100, 10], inc: [0, 20, 5], opt: [0, 200, 10] };
  var RES_L = { 6: 250, 8: 210, 10: 170, 12: 120, 15: 80, 18: 40 };  // lessor's appraiser
  var RES_P = { 6: 230, 8: 190, 10: 150, 12: 100, 15: 60, 18: 30 };  // lessee's technical team
  var P = {
    haircut: 0.20,      // lessor values unguaranteed residual at 80%
    optLessor: 0.80,    // lessor's end value with a purchase option = min(price, 80% of its residual)
    risk: 0.15,         // lessee risk charge on guaranteed amount it does not expect to pay
    optLessee: 0.85,    // lessee values owning the aircraft at 85% of its residual estimate
    certain: 0.80,      // purchase option "reasonably certain" if price <= 80% of that party's residual estimate
    idcLessee: 1.0,     // lessee's legal fees, incremental (Ind AS 116 para 24(c))
    prefBonus: 8, capPen: 20, termPen: 25, noDeal: -10,
    termTest: 0.75, pvTest: 0.90,
    pts1: 5, pts2: 2.5
  };
  var EVENTS = {
    e1: { title: 'RBI surprise rate hike', ibr: 0.005, target: 0.0025 },
    e2: { title: 'Lenders tighten lease covenants', cap: -15 },
    e3: { title: 'Rival lessor withdraws long-term quotes', rivalLong: 2.0 }
  };
  var REFERENCE = { term: 12, rent: 48, rvg: 0, inc: 0, opt: 0 };

  function ann(n, r) { return Math.abs(r) < 1e-9 ? n : (1 - Math.pow(1 + r, -n)) / r; }
  function dsc(n, r) { return Math.pow(1 + r, -n); }
  function onStep(x, lim) { var k = (x - lim[0]) / lim[2]; return Math.abs(k - Math.round(k)) < 1e-9 && x >= lim[0] - 1e-9 && x <= lim[1] + 1e-9; }

  function norm(t) {
    return { term: parseInt(t.term, 10), rent: Number(t.rent), rvg: Number(t.rvg || 0), inc: Number(t.inc || 0), opt: Number(t.opt || 0) };
  }

  /* apply released news events to a card (events: {e1:true,...}) */
  function adjust(card, role, events) {
    var c = JSON.parse(JSON.stringify(card)); events = events || {};
    if (role === 'lessor') { if (events.e1) c.target = round6(c.target + EVENTS.e1.target); }
    else {
      if (events.e1) c.ibr = round6(c.ibr + EVENTS.e1.ibr);
      if (events.e2) c.cap = c.cap + EVENTS.e2.cap;
      c.rivalBump = events.e3 ? EVENTS.e3.rivalLong : 0;
    }
    return c;
  }
  function round6(x) { return Math.round(x * 1e6) / 1e6; }

  function rivalRent(card, term) {
    var q = card.quote;
    var raw = (FV - RES_L[term] * dsc(term, q)) / ann(term, q);
    var r = Math.round(raw * 2) / 2;
    if (card.rivalBump && term >= 15) r += card.rivalBump;
    return r;
  }
  function rivalQuotes(card) { var o = {}; TERMS.forEach(function (t) { o[t] = rivalRent(card, t); }); return o; }

  function lessorExpectsExercise(t) { return t.opt > 0 && t.opt <= P.certain * RES_L[t.term]; }
  function lesseeExpectsExercise(t) { return t.opt > 0 && t.opt <= P.certain * RES_P[t.term]; }
  function lessorEnd(t) { return lessorExpectsExercise(t) ? t.opt : RES_L[t.term]; }

  function implicitRate(t) {
    var end = lessorEnd(t);
    var f = function (r) { return t.rent * ann(t.term, r) - t.inc + end * dsc(t.term, r) - FV; };
    var lo = -0.5, hi = 1.0;
    if (f(lo) < 0 || f(hi) > 0) return null;
    for (var k = 0; k < 200; k++) { var m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }

  function validate(raw) {
    var t = norm(raw);
    if (TERMS.indexOf(t.term) < 0) return 'Term must be one of ' + TERMS.join(', ') + ' years';
    if ([t.rent, t.rvg, t.inc, t.opt].some(function (x) { return !isFinite(x); })) return 'All terms must be numbers';
    if (!onStep(t.rent, LIM.rent)) return 'Rent must be 30 to 70 in steps of 0.5';
    if (!onStep(t.rvg, LIM.rvg)) return 'Guarantee must be 0 to 100 in steps of 10';
    if (!onStep(t.inc, LIM.inc)) return 'Incentive must be 0 to 20 in steps of 5';
    if (!onStep(t.opt, LIM.opt) || (t.opt > 0 && t.opt < 20)) return 'Purchase option price must be 0 (none) or 20 to 200 in steps of 10';
    if (t.rvg > 0 && t.opt > 0) return 'Choose either a residual value guarantee or a purchase option, not both';
    if (implicitRate(t) === null) return 'These terms do not give a sensible implicit rate';
    return null;
  }

  /* ---------------- lessor ---------------- */
  function lessorBooks(raw) {
    var t = norm(raw), r = implicitRate(t), x = lessorExpectsExercise(t);
    var endPay = x ? t.opt : t.rvg;
    var pvPay = t.rent * ann(t.term, r) - t.inc + endPay * dsc(t.term, r);
    var pvPct = pvPay / FV, termPct = t.term / LIFE;
    var finance = termPct >= P.termTest || pvPct >= P.pvTest || x;
    var o = { residual: RES_L[t.term], rate: r, exercise: x, pvPayments: pvPay, pvPct: pvPct, termPct: termPct,
      classification: finance ? 'finance' : 'operating',
      why: x ? 'ownership transfer reasonably certain' : termPct >= P.termTest ? 'term test' : pvPct >= P.pvTest ? 'PV test' : 'no indicator met' };
    if (finance) {
      o.ni = FV + t.inc; o.income = o.ni * r; o.closingNi = o.ni * (1 + r) - t.rent; o.profit = o.income;
    } else {
      o.leaseIncome = (t.term * t.rent - t.inc) / t.term; o.depreciation = FV / LIFE; o.profit = o.leaseIncome - o.depreciation;
    }
    return o;
  }

  function lessorScore(card, raw) {
    var t = norm(raw), e = RES_L[t.term], tg = card.target, end;
    if (t.opt > 0) end = Math.min(t.opt, P.optLessor * e);
    else end = Math.max(t.rvg, e) - P.haircut * Math.max(0, e - t.rvg);
    var npv = t.rent * ann(t.term, tg) - t.inc + end * dsc(t.term, tg) - FV;
    var b = lessorBooks(t);
    var bonus = card.pref && card.pref === b.classification ? P.prefBonus : 0;
    return { npv: npv, bonus: bonus, total: npv + bonus, classification: b.classification, pvPct: b.pvPct, rate: b.rate, why: b.why };
  }

  /* ---------------- lessee ---------------- */
  function lesseeBooks(card, raw) {
    var t = norm(raw), i = card.ibr, e = RES_P[t.term], x = lesseeExpectsExercise(t);
    var expRvg = Math.max(0, t.rvg - e);
    var L = t.rent * ann(t.term, i) + (expRvg + (x ? t.opt : 0)) * dsc(t.term, i);
    var rou = L + P.idcLessee - t.inc;
    var period = x ? LIFE : t.term;
    var interest = L * i, dep = rou / period;
    return { residual: e, exercise: x, expectedRvg: expRvg, liability: L, rou: rou, period: period,
      interest: interest, depreciation: dep, charge: interest + dep, closing: L + interest - t.rent };
  }

  function lesseeScore(card, raw) {
    var t = norm(raw), i = card.ibr, e = RES_P[t.term], v = dsc(t.term, i);
    var saving = (rivalRent(card, t.term) - t.rent) * ann(t.term, i) + t.inc;
    var rvgCost = (Math.max(0, t.rvg - e) + P.risk * Math.min(t.rvg, e)) * v;
    var optValue = t.opt > 0 ? Math.max(0, P.optLessee * e - t.opt) * v : 0;
    var b = lesseeBooks(card, t);
    var capPen = b.liability > card.cap + 1e-9 ? -P.capPen : 0;
    var termPen = t.term < card.min_term ? -P.termPen : 0;
    var npv = saving - rvgCost + optValue;
    return { npv: npv, capPen: capPen, termPen: termPen, total: npv + capPen + termPen, liability: b.liability,
      cap: card.cap, rival: rivalRent(card, t.term) };
  }

  /* ---------------- questions ---------------- */
  function q(key, label, answer, kind, hint, options) { return { key: key, label: label, answer: answer, kind: kind, hint: hint, options: options || null }; }

  function lesseeQuestions(card, raw) {
    var t = norm(raw), b = lesseeBooks(card, t), qs = [];
    if (t.opt > 0) qs.push(q('e_opt', 'Is exercise of the purchase option (price ' + t.opt + ') reasonably certain in your books?', b.exercise ? 'yes' : 'no', 'choice',
      'Class rule: reasonably certain if the price is at most 80% of your team\'s residual estimate (' + b.residual + ' at year ' + t.term + '). If yes, the price is a lease payment (para 27(d)) and you depreciate over the aircraft\'s useful life (para 32).', ['yes', 'no']));
    if (t.rvg > 0) qs.push(q('e_rvg', 'Amount of the residual value guarantee included in your lease payments', b.expectedRvg, 'num',
      'Only the amount expected to be payable (para 27(c)): guarantee ' + t.rvg + ' minus your residual estimate ' + b.residual + ', not below zero.'));
    qs.push(q('e_liab', 'Lease liability at commencement, 1 April 2026', b.liability, 'num',
      'PV at your IBR of the rents' + (t.rvg > 0 ? ', plus the expected RVG payment' : '') + (t.opt > 0 ? ', plus the option price if exercise is reasonably certain' : '') + ', discounted from each payment date.'));
    qs.push(q('e_rou', 'Right-of-use asset at commencement', b.rou, 'num',
      'Liability + initial direct costs (legal fees ' + P.idcLessee + ')' + (t.inc ? ' − lease incentive received (' + t.inc + ')' : '') + ' (para 24).'));
    qs.push(q('e_int', 'Interest expense, year 1', b.interest, 'num', 'Opening liability × IBR.'));
    qs.push(q('e_dep', 'Depreciation of the ROU asset, year 1 (straight line)', b.depreciation, 'num',
      'ROU asset ÷ ' + (b.exercise ? 'useful life of 20 years (ownership expected to pass)' : 'lease term of ' + t.term + ' years') + '.'));
    qs.push(q('e_chg', 'Total lease charge in profit or loss, year 1', b.charge, 'num', 'Interest + depreciation.'));
    qs.push(q('e_close', 'Lease liability at 31 March 2027, after the first rent', b.closing, 'num', 'Opening + interest − rent paid.'));
    return qs;
  }

  function lessorQuestions(raw) {
    var t = norm(raw), b = lessorBooks(t), qs = [];
    if (t.opt > 0) qs.push(q('r_opt', 'Is exercise of the purchase option (price ' + t.opt + ') reasonably certain in your books?', b.exercise ? 'yes' : 'no', 'choice',
      'Class rule: reasonably certain if the price is at most 80% of your appraiser\'s residual estimate (' + b.residual + ' at year ' + t.term + ').', ['yes', 'no']));
    qs.push(q('r_rate', 'Interest rate implicit in the lease (%, 2 decimals)', b.rate * 100, 'pct',
      'Rate at which PV(rents) − incentive + PV(' + (b.exercise ? 'option price ' + t.opt : 'your residual estimate ' + b.residual) + ') = fair value 400. Excel: =RATE(' + t.term + ',' + t.rent + ',-(400+' + t.inc + '),' + (b.exercise ? t.opt : b.residual) + ')'));
    qs.push(q('r_pv', 'PV of lease payments (net of incentive) as % of fair value', b.pvPct * 100, 'pct',
      'At the implicit rate: rents − incentive + ' + (b.exercise ? 'option price' : 'the full residual value guarantee (para 70(c))') + '.'));
    qs.push(q('r_class', 'Classification of the lease in your books', b.classification, 'choice',
      'Finance if ownership transfer is reasonably certain, or term ≥ 75% of life (here ' + Math.round(b.termPct * 100) + '%), or PV ≥ 90% of fair value. Indicator met: ' + b.why + '.', ['finance', 'operating']));
    if (b.classification === 'finance') {
      qs.push(q('r_ni', 'Net investment in the lease immediately after commencement (after paying any incentive)', b.ni, 'num',
        'PV at the implicit rate of the rents and the end-of-lease amount = fair value + incentive paid.'));
      qs.push(q('r_inc', 'Finance income, year 1', b.income, 'num', 'Net investment × implicit rate.'));
      qs.push(q('r_close', 'Net investment at 31 March 2027, after the first rent', b.closingNi, 'num', 'Opening + finance income − rent received.'));
    } else {
      qs.push(q('r_li', 'Lease income, year 1 (straight line, net of incentive)', b.leaseIncome, 'num', '(Term × rent − incentive) ÷ term (para 81, 83).'));
      qs.push(q('r_dep', 'Depreciation of the aircraft, year 1 (400 over 20 years, nil residual)', b.depreciation, 'num', 'The aircraft stays on your balance sheet.'));
      qs.push(q('r_prof', 'Profit from the lease, year 1, before interest and tax', b.profit, 'num', 'Lease income − depreciation.'));
    }
    return qs;
  }

  /* analyst stage: everyone analyses the airline's side of their own deal */
  function analystFacts(lesseeCard, raw) {
    var t = norm(raw), b = lesseeBooks(lesseeCard, t);
    var oldExpense = (t.term * t.rent - t.inc) / t.term;
    return { debt: lesseeCard.debt, equity: lesseeCard.equity, ebitda: lesseeCard.ebitda, liability: b.liability, charge: b.charge,
      oldExpense: oldExpense, ebitdaUp: oldExpense, pbtDiff: oldExpense - b.charge,
      de: (lesseeCard.debt + b.liability) / lesseeCard.equity, deOld: lesseeCard.debt / lesseeCard.equity, eightX: 8 * t.rent - b.liability };
  }
  function analystQuestions(lesseeCard, raw) {
    var a = analystFacts(lesseeCard, raw);
    return [
      q('a_ebitda', 'Year-1 EBITDA increase under Ind AS 116 compared with the old Ind AS 17 operating-lease treatment', a.ebitdaUp, 'num',
        'Under Ind AS 17 the airline expensed rent straight line, (term × rent − incentive) ÷ term, above EBITDA. Under Ind AS 116 that cost moves to depreciation and interest.'),
      q('a_pbt', 'Year-1 profit before tax: Ind AS 116 minus old Ind AS 17 (negative if lower)', a.pbtDiff, 'num',
        'Old straight-line expense − (interest + depreciation). Ind AS 116 front-loads the charge.'),
      q('a_de', 'Airline debt-to-equity on 1 April 2026 after recognising the lease liability (ratio, 2 decimals)', a.de, 'ratio',
        '(Borrowings ' + a.debt + ' + lease liability) ÷ equity ' + a.equity + '. No day-1 equity effect.'),
      q('a_8x', 'Old analyst shortcut (8 × annual rent) minus the Ind AS 116 lease liability', a.eightX, 'num',
        'The 8× rule capitalises rent without regard to term or rate; compare it with the discounted liability.')
    ];
  }

  function check(qq, value) {
    if (qq.kind === 'choice') return String(value).trim().toLowerCase() === qq.answer;
    var v = parseFloat(String(value).replace(/,/g, '').replace('%', '').replace(/−/g, '-').trim());
    if (!isFinite(v)) return false;
    var a = qq.answer;
    if (qq.kind === 'pct') return Math.abs(v - a) <= 0.06;
    if (qq.kind === 'ratio') return Math.abs(v - a) <= 0.006;
    return Math.abs(v - a) <= Math.max(0.06, Math.abs(a) * 0.002);
  }
  function fmt(qq) {
    if (qq.kind === 'choice') return qq.answer;
    if (qq.kind === 'pct') return qq.answer.toFixed(2) + '%';
    return qq.answer.toFixed(2);
  }

  return { FV: FV, LIFE: LIFE, TERMS: TERMS, LIM: LIM, RES_L: RES_L, RES_P: RES_P, P: P, EVENTS: EVENTS, REFERENCE: REFERENCE,
    ann: ann, dsc: dsc, norm: norm, adjust: adjust, validate: validate, implicitRate: implicitRate,
    rivalRent: rivalRent, rivalQuotes: rivalQuotes, lessorBooks: lessorBooks, lessorScore: lessorScore,
    lesseeBooks: lesseeBooks, lesseeScore: lesseeScore, lesseeQuestions: lesseeQuestions, lessorQuestions: lessorQuestions,
    analystFacts: analystFacts, analystQuestions: analystQuestions, check: check, fmt: fmt };
})();
if (typeof module !== 'undefined') module.exports = LM;
