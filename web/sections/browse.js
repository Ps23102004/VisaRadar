(function(){
  "use strict";

  function esc(s){
    var d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

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

    window.employersPromise.then(function(data){
      employers = data;
      renderResults();
    });

    function renderResults(){
      var query = searchEl.value;
      var matches = VisaRadarMatcher.filterEmployers(employers, { query: query }).slice(0, 40);
      resultsEl.innerHTML = matches.map(function(e){
        return '<li class="glass" style="padding:14px 18px;">' +
          '<strong>' + esc(e.n) + '</strong>' +
          '<div style="font-size:13px; color:var(--ink-soft);">' + esc(e.t[0] || '') + ' · ' + e.s.join(', ') + ' · $' + Number(e.w).toLocaleString() + '</div>' +
          '</li>';
      }).join('');
    }

    searchEl.addEventListener('input', function(){
      state.set({ company: searchEl.value });
      renderResults();
    });

    searchEl.value = state.get().company || '';
  }

  window.AppShell.registerSection('browse', { mount: mount });
})();
