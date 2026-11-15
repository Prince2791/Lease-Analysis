/* Aircraft Lease Market v2: scenario text. All firms, people and the aircraft are fictional.
   Numbers are filled in from the player's own (private) card, sent by the server. */
var STORY = (function () {
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var pct = function (x, d) { return (x * 100).toFixed(d == null ? 2 : d) + '%'; };

  var LESSORS = [
    { who: 'A GIFT City lessor set up in 2022 by an infrastructure fund. Owns 14 narrow-bodies on lease to four airlines and prides itself on long relationships.',
      ceo: 'Anjali Rao, CEO', board: 'no standing preference on classification; the board judges you on value created.' },
    { who: 'The aircraft-leasing arm of a mid-sized private bank. Plans to package its aircraft into a portfolio for sale to foreign investors in 2028.',
      ceo: 'Vikram Sethi, Managing Director', board: 'wants the aircraft kept on the balance sheet (operating lease) so the portfolio has physical assets to sell.' },
    { who: 'Backed by a Kerala family office that dislikes surprises. Prefers contracts that look like a loan: steady income, no exposure to second-hand aircraft prices.',
      ceo: 'Thomas Kurian, Chief Executive', board: 'wants finance-lease classification: predictable finance income and no aircraft on the books.' },
    { who: 'A listed NBFC that recently moved into aircraft leasing. Equity analysts value it on net interest income.',
      ceo: 'Meenal Joshi, CFO', board: 'wants finance-lease classification so the income shows as finance income like the rest of the loan book.' },
    { who: 'Partly owned by a state development bank, which gives it the cheapest funding in the market. Growing fast and keen to win mandates.',
      ceo: 'Suresh Reddy, CEO', board: 'no standing preference on classification; volume and value both matter.' },
    { who: 'A young lessor with four aircraft. Its private-equity owners measure it by fleet count and asset base before a planned listing.',
      ceo: 'Kavya Menon, Founder', board: 'wants operating-lease classification: aircraft stay on the balance sheet and grow the asset base.' }
  ];
  var LESSEES = [
    { who: 'A Bengaluru low-cost carrier with 38 aircraft, adding southern routes. Profitable but thin-margined.', cfo: 'Neha Kulkarni, CFO' },
    { who: 'A full-service regional airline in the east. Conservative, well-rated, and planning a decade-long network build-out.', cfo: 'Arindam Bose, CFO' },
    { who: 'A fast-growing west-coast carrier with heavy borrowings after a fleet expansion. Lenders watch it closely.', cfo: 'Farhan Shaikh, CFO' },
    { who: 'A hill-and-plains connector expanding from Dehradun. Steady cash flows, ten-year network plan.', cfo: 'Ritu Negi, CFO' },
    { who: 'A premium carrier with the strongest balance sheet among the six. Its plan needs the aircraft for at least twelve years.', cfo: 'Ishaan Malhotra, CFO' },
    { who: 'A start-up in its third year, flying out of Jaipur. Its bank lenders have set tight covenants.', cfo: 'Pooja Rathore, CFO' }
  ];

  var NEWS = {
    e1: { head: 'RBI surprise rate hike: repo up 50 basis points',
      body: 'Airlines\' incremental borrowing rates rise by 0.50 percentage point; lessors\' target returns rise by 0.25 point. Applies to leases signed from now on. Leases already signed keep the rates at signing.' },
    e2: { head: 'Banks tighten airline covenants after a carrier defaults',
      body: 'Every airline\'s lenders cut the cap on day-1 lease liability by Rs 15 crore for leases signed from now on.' },
    e3: { head: 'Gulf rival withdraws its long-term quotes',
      body: 'The rival lessor will no longer quote 15- or 18-year leases at the old rents: airlines\' fallback for those terms now costs Rs 2.0 crore a year more. Short terms are unchanged.' }
  };

  function table(terms, row, label) {
    return '<div class="scroll"><table><tr><th>' + label + '</th>' + terms.map(function (t) { return '<th class="n">' + t + ' yrs</th>'; }).join('') + '</tr><tr><td></td>' +
      terms.map(function (t) { return '<td class="n">' + row[t] + '</td>'; }).join('') + '</tr></table></div>';
  }
  function doc(title, from, body) { return '<div class="doc"><div class="doc-h"><b>' + title + '</b><span class="muted small">' + from + '</span></div>' + body + '</div>'; }

  function aircraft() {
    return doc('Aircraft specification sheet', 'Vimana Aerospace',
      '<p class="small"><b>N-186 Skylark</b>, a new-generation narrow-body: 186 seats, 3,400 km range, 15% lower fuel burn than the type it replaces. ' +
      'Delivered March 2026. <b>Fair value = lessor\'s cost = Rs 400 crore.</b> Economic life <b>20 years</b>.</p>' +
      '<p class="small">Lease is "triple net": the airline pays maintenance, insurance and taxes. Commencement <b>1 April 2026</b>; rent paid <b>once a year at each 31 March</b>.</p>' +
      '<h3>What you can negotiate</h3><ul class="small">' +
      '<li><b>Term</b>: 6, 8, 10, 12, 15 or 18 years.</li>' +
      '<li><b>Annual rent</b>: Rs 30 to 70 crore, in steps of 0.5.</li>' +
      '<li><b>Residual value guarantee (RVG)</b>: 0 to 100, steps of 10. At the end the airline tops up the lessor if the aircraft is worth less than the guaranteed amount.</li>' +
      '<li><b>Lease incentive</b>: 0 to 20, steps of 5. Cash the lessor pays the airline on 1 April 2026 (towards cabin fit-out).</li>' +
      '<li><b>Purchase option</b>: 0 (none) or a price of 20 to 200, steps of 10. The airline may buy the aircraft at the end of the term for that price.</li>' +
      '<li>A lease can carry an RVG <b>or</b> a purchase option, not both.</li></ul>' +
      '<h3>Facts for the books</h3><ul class="small">' +
      '<li>The airline pays external legal fees of <b>Rs 1 crore</b> to sign the lease (initial direct costs). The lessor\'s costs are internal and not incremental.</li>' +
      '<li>Class rule for "reasonably certain" to buy: option price at most <b>80%</b> of <i>your own</i> estimate of the aircraft\'s value at the end of the term.</li>' +
      '<li>Class rule for lessor classification: finance lease if ownership is reasonably certain to pass, or the term is at least 75% of economic life, or the PV of lease payments is at least 90% of fair value.</li></ul>');
  }

  function scoreLessor(P) {
    return '<p class="small">Deal score (Rs crore) = PV at your target return of: rents, <b>minus</b> any incentive paid, <b>plus</b> what you get back at the end, <b>minus</b> 400.</p>' +
      '<ul class="small"><li>No option: the guaranteed amount counts in full; any unguaranteed residual counts at ' + Math.round((1 - P.haircut) * 100) + '% (second-hand prices are risky). If the guarantee exceeds your appraisal, you expect the airline to pay the difference.</li>' +
      '<li>With a purchase option: you get the lower of the option price and ' + Math.round(P.optLessor * 100) + '% of your appraisal (the airline buys only when it is a bargain).</li>' +
      '<li>Board bonus +' + P.prefBonus + ' if the lease lands in the classification your board wants. No deal: ' + P.noDeal + '.</li></ul>' +
      '<p class="small">Then up to 30–35 points for your own Ind AS 116 books and 20 points in the analyst stage. Lessors are ranked against lessors.</p>';
  }
  function scoreLessee(P) {
    return '<p class="small">Deal score (Rs crore) = PV at your IBR of (rival rent − agreed rent) for every year, <b>plus</b> any incentive received, then:</p>' +
      '<ul class="small"><li><b>Minus</b> the PV of the RVG top-up you expect to pay (guarantee above your team\'s estimate) and a ' + Math.round(P.risk * 100) + '% risk charge on the guaranteed amount you do not expect to pay.</li>' +
      '<li><b>Plus</b>, with a purchase option, the PV of (' + Math.round(P.optLessee * 100) + '% of your team\'s estimate − price), if positive.</li>' +
      '<li>Penalties: lease liability above your lenders\' cap −' + P.capPen + '; term below your network plan −' + P.termPen + '. No deal: ' + P.noDeal + '.</li></ul>' +
      '<p class="small">Then up to 30–35 points for your own Ind AS 116 books and 20 points in the analyst stage. Airlines are ranked against airlines.</p>';
  }

  function dossier(v) {
    var c = v.card, i = v.me.firmIndex, terms = LM.TERMS, P = LM.P, firm = esc(v.me.firm), h = '';
    if (v.me.role === 'lessor') {
      var L = LESSORS[i];
      h += '<h2>' + firm + '</h2><p>' + L.who + '</p><p class="small">You own <b>one new N-186 Skylark</b> and must place it with one airline before the market closes. A parked aircraft costs you ' + P.noDeal + '.</p>';
      h += doc('Board minute', 'Board of directors',
        '<p class="small">The board ' + L.board + (c.pref ? ' <b>Bonus +' + P.prefBonus + ' if the lease is a ' + c.pref + ' lease in your books.</b>' : '') + '</p>');
      h += doc('Treasury memo', L.ceo,
        '<p class="small">Our cost of funds plus required margin gives a <b>target return of ' + pct(c.target) + '</b>. Value every deal at this rate.</p>' +
        '<p class="small">Remember: airlines cannot see our residual estimates, so they will not know the rate implicit in the lease. They value deals at their own borrowing rate.</p>');
      h += doc('Appraiser\'s report', 'Independent aircraft appraiser (private)', '<p class="small">Expected value of the aircraft at the end of the lease (Rs crore):</p>' + table(terms, LM.RES_L, 'End of term'));
      h += doc('How your deal is scored', 'Class rules', scoreLessor(P));
    } else {
      var E = LESSEES[i], rq = LM.rivalQuotes(c);
      h += '<h2>' + firm + '</h2><p>' + E.who + '</p><p class="small">You need <b>one new N-186 Skylark</b> for your network plan. Going without means short-term cover and network disruption: ' + P.noDeal + '.</p>';
      h += doc('Network planning memo', 'Head of network planning',
        '<p class="small">The new routes need the aircraft for at least <b>' + c.min_term + ' years</b>. A shorter lease breaks the plan (−' + P.termPen + ').</p>');
      h += doc('Letter from our lenders', 'Consortium of banks',
        '<p class="small">Under the loan covenants, the <b>lease liability recognised on day 1 must not exceed Rs ' + c.cap + ' crore</b>. Breach costs −' + P.capPen + ' (waiver fees and repricing).</p>');
      h += doc('Treasury note', E.cfo,
        '<p class="small">Our <b>incremental borrowing rate is ' + pct(c.ibr) + '</b>. We cannot determine the lessor\'s implicit rate (we do not know its residual estimate), so this is the rate for our lease liability, and the rate we value deals at.</p>');
      h += doc('Rival lessor\'s written quote', 'Gulf Aero Lease, Dubai',
        '<p class="small">Firm offer for the same aircraft, annual rent by term, no guarantee, no incentive, no option. This is your fallback.</p>' + table(terms, rq, 'Annual rent'));
      h += doc('Technical team note', 'Head of engineering (private)', '<p class="small">Our estimate of the aircraft\'s value at the end of the lease (Rs crore):</p>' + table(terms, LM.RES_P, 'End of term'));
      h += doc('Financial snapshot, 31 March 2026', 'Finance team',
        '<div class="kv"><div>Borrowings</div><div>' + c.debt + '</div><div>Shareholders\' equity</div><div>' + c.equity + '</div><div>EBITDA, FY26 (before this aircraft)</div><div>' + c.ebitda + '</div></div>' +
        '<p class="muted small">You will need these in the analyst stage.</p>');
      h += doc('How your deal is scored', 'Class rules', scoreLessee(P));
    }
    h += aircraft();
    h += '<h3>Rules of the market</h3><p class="small">Talk face to face; offers and signatures happen on the phone. Accepting an offer signs a binding lease, and each firm signs one. Say what you like, but do not show your screen. Watch for news flashes: they change conditions for leases signed afterwards.</p>';
    return h;
  }

  return { dossier: dossier, NEWS: NEWS, esc: esc };
})();
