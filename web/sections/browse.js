(function(){
  "use strict";

  function esc(s){
    var d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var onFilterChange = function(){};

  function mount(container, state){
    container.innerHTML =
      '<section class="search-wrap glass fade-in" aria-label="Search employers">' +
        '<span class="search-ico" aria-hidden="true">' +
          '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>' +
        '</span>' +
        '<input id="browse-search" class="search-input" type="search" autocomplete="off" spellcheck="false" ' +
          'placeholder="Search company name or state (e.g. CA, Google, Microsoft)..." aria-label="Search company name or state">' +
      '</section>' +
      '<ul id="browse-results" class="stagger" style="list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px;"></ul>';

    var searchEl = container.querySelector('#browse-search');
    var resultsEl = container.querySelector('#browse-results');
    var employers = [];
    var expandedEmployerKey = null;

    window.employersPromise.then(function(data){
      employers = data;
      renderResults();
    });

    function renderResults(){
      var query = searchEl.value;
      var matches = VisaRadarMatcher.filterEmployers(employers, { query: query }).slice(0, 40);
      resultsEl.innerHTML = matches.map(function(e){
        var expanded = e.k === expandedEmployerKey;
        var record = expanded ? VisaRadarMatcher.employerToFilingRecord(e, {}) : null;
        var label = record ? (String(record.label || 'none').toLowerCase()).replace(/[^a-z]/g, '') : 'none';
        if (label !== 'strong' && label !== 'moderate' && label !== 'weak' && label !== 'none') label = 'none';
        var evidence = record && Array.isArray(record.evidence) ? record.evidence : [];
        return '<li class="glass" data-company-key="' + esc(e.k) + '" style="padding:14px 18px; cursor:pointer;">' +
          '<strong>' + esc(e.n) + '</strong>' +
          '<div style="font-size:13px; color:var(--ink-soft);">' + esc(e.t[0] || '') + ' · ' + e.s.map(esc).join(', ') + ' · $' + Number(e.w).toLocaleString() + '</div>' +
          (expanded ?
            '<div style="margin-top:14px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.1);">' +
              '<div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;"><span class="badge ' + label + '"><span class="dot"></span>' + esc(label) + '</span></div>' +
              '<ul class="evidence" style="display:flex; flex-direction:column; gap:8px; margin:0; padding:0; list-style:none;">' +
                evidence.map(function(item, i){ return '<li class="row fade-in" style="--i:' + i + '; background:rgba(255,255,255,0.08); border-radius:10px; padding:12px 16px; font-size:14px;">' + esc(item) + '</li>'; }).join('') +
              '</ul>' +
              '<div style="font-size:13px; color:var(--ink-soft); margin-top:12px;"><strong>Job titles:</strong> ' + e.t.map(esc).join(', ') + '</div>' +
              '<div style="font-size:13px; color:var(--ink-soft); margin-top:6px;"><strong>States:</strong> ' + e.s.map(esc).join(', ') + '</div>' +
            '</div>' : '') +
          '</li>';
      }).join('');

      resultsEl.querySelectorAll('[data-company-key]').forEach(function(row){
        row.addEventListener('click', function(){
          expandedEmployerKey = expandedEmployerKey === row.dataset.companyKey ? null : row.dataset.companyKey;
          renderResults();
        });
      });
    }

    searchEl.addEventListener('input', function(){
      state.set({ company: searchEl.value });
      renderResults();
    });

    searchEl.value = state.get().company || '';

    onFilterChange = function(newState){
      var company = newState.company || '';
      if (company !== searchEl.value){
        searchEl.value = company;
        renderResults();
      }
    };
  }

  window.AppShell.registerSection('browse', { mount: mount, onFilterChange: function(newState){ onFilterChange(newState); } });
})();
