(function(){
  "use strict";

  function esc(s){
    var d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtConfidence(c){
    var num = parseFloat(c);
    if (isNaN(num)) return '0';
    return Math.round(num * 100);
  }

  var onFilterChange = function(){};

  function mount(container, state){
    container.innerHTML =
      '<div class="glass" style="padding:22px; display:flex; flex-direction:column; gap:14px;">' +
        '<label style="font-size:13px; font-weight:600;">Company</label>' +
        '<div class="search-wrap" aria-label="Search companies">' +
          '<span class="search-ico" aria-hidden="true">' +
            '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>' +
          '</span>' +
          '<input id="check-company-search" class="search-input" type="search" autocomplete="off" spellcheck="false" placeholder="Search company name..." aria-label="Search company name">' +
        '</div>' +
        '<ul id="check-company-results" class="stagger" style="list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px;"></ul>' +
        '<p id="check-company-selected" style="font-size:13px; color:var(--ink-soft); margin:0; display:none;"></p>' +
        '<label style="font-size:13px; font-weight:600;">Title<select id="check-title"></select></label>' +
        '<label style="font-size:13px; font-weight:600;">State<select id="check-state"></select></label>' +
        '<div class="actions" style="display:flex; justify-content:flex-end;"><button id="check-go" class="go press" type="button">Visualize →</button></div>' +
        '<details><summary style="font-size:12px; color:var(--ink-soft); cursor:pointer;">Paste custom JSON instead</summary>' +
          '<textarea id="check-json" spellcheck="false" style="width:100%; min-height:100px; margin-top:8px; font-family:ui-monospace,monospace; font-size:13px;"></textarea>' +
          '<div class="actions" style="display:flex; justify-content:flex-end; margin-top:8px;"><button id="check-json-go" class="go press" type="button">Visualize JSON →</button></div>' +
        '</details>' +
      '</div>' +
      '<div class="error" id="check-error" style="display:none;"></div>' +
      '<div class="result glass" id="check-result" style="padding:24px; display:none; flex-direction:column; gap:18px;">' +
        '<div class="result-top" style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px;">' +
          '<div><p class="company" id="company" style="font-size:22px; font-weight:600; margin:0;"></p><p class="title" id="title" style="font-size:16px; color:var(--ink-soft); margin:4px 0 0;"></p></div>' +
          '<div class="confidence" style="text-align:right;"><b id="conf-pct" style="display:block; font-size:26px; font-weight:600; color:var(--accent);"></b></div>' +
        '</div>' +
        '<div class="meta" style="display:flex; align-items:center; gap:10px;"><span class="loc" id="loc" style="font-size:15px;"></span><span class="badge" id="label"></span></div>' +
        '<ul class="evidence" id="evidence" style="display:flex; flex-direction:column; gap:8px; margin:0; padding:0; list-style:none;"></ul>' +
      '</div>';

    var companySearchEl = container.querySelector('#check-company-search');
    var companyResultsEl = container.querySelector('#check-company-results');
    var selectedEl = container.querySelector('#check-company-selected');
    var titleEl = container.querySelector('#check-title');
    var stateEl = container.querySelector('#check-state');
    var goEl = container.querySelector('#check-go');
    var errEl = container.querySelector('#check-error');
    var resultEl = container.querySelector('#check-result');
    var jsonEl = container.querySelector('#check-json');
    var jsonGoEl = container.querySelector('#check-json-go');

    var employers = [];
    var selectedEmployer = null;
    var lastSetValue = '';

    window.employersPromise.then(function(data){
      employers = data;
      syncFromSharedState(state.get().company, true);
    });

    function populateEmployerOptions(employer){
      titleEl.innerHTML = employer.t.map(function(t){ return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join('');
      stateEl.innerHTML = employer.s.map(function(s){ return '<option value="' + esc(s) + '">' + esc(s) + '</option>'; }).join('');
    }

    function renderCompanyResults(){
      var query = companySearchEl.value;
      var matches = query ? VisaRadarMatcher.filterEmployers(employers, { query: query }).slice(0, 50) : [];
      companyResultsEl.innerHTML = matches.map(function(employer){
        return '<li><button type="button" class="glass" data-company-key="' + esc(employer.k) + '" style="width:100%; padding:12px 16px; text-align:left; color:inherit; font:inherit; cursor:pointer;">' +
          '<strong>' + esc(employer.n) + '</strong>' +
          '<div style="font-size:13px; color:var(--ink-soft); margin-top:3px;">' + esc(employer.t[0] || '') + ' · ' + employer.s.join(', ') + '</div>' +
        '</button></li>';
      }).join('');
      companyResultsEl.querySelectorAll('[data-company-key]').forEach(function(button){
        button.addEventListener('click', function(){
          var employer = employers.find(function(e){ return e.k === button.dataset.companyKey; });
          if (employer) selectEmployer(employer);
        });
      });
    }

    function selectEmployer(employer){
      selectedEmployer = employer;
      companySearchEl.value = employer.n;
      lastSetValue = employer.n;
      selectedEl.textContent = 'Selected: ' + employer.n;
      selectedEl.style.display = 'block';
      companyResultsEl.innerHTML = '';
      populateEmployerOptions(employer);
    }

    function syncFromSharedState(company, allowSelection){
      company = company || '';
      companySearchEl.value = company;
      lastSetValue = company;
      renderCompanyResults();
      if (!allowSelection || !company || !employers.length) return;
      var normalized = company.toLowerCase();
      var matches = VisaRadarMatcher.filterEmployers(employers, { query: company });
      var exact = matches.find(function(e){ return e.n.toLowerCase() === normalized; });
      if (exact || matches.length === 1) selectEmployer(exact || matches[0]);
    }

    companySearchEl.addEventListener('input', function(){
      if (companySearchEl.value !== lastSetValue){
        selectedEmployer = null;
        selectedEl.style.display = 'none';
      }
      renderCompanyResults();
    });

    function render(data){
      var label = (String(data.label || 'none').toLowerCase()).replace(/[^a-z]/g, '');
      if (label !== 'strong' && label !== 'moderate' && label !== 'weak' && label !== 'none') label = 'none';

      container.querySelector('#company').textContent = data.company || '—';
      container.querySelector('#title').textContent = data.title || '';

      var pct = fmtConfidence(data.match_confidence);
      var confEl = container.querySelector('#conf-pct');
      confEl.textContent = pct + '%';
      confEl.title = pct + '% match';

      var labelEl = container.querySelector('#label');
      labelEl.className = 'badge ' + label;
      labelEl.innerHTML = '<span class="dot"></span>' + esc(label);
      container.querySelector('#loc').textContent = data.location || '';

      var evidenceEl = container.querySelector('#evidence');
      var ev = Array.isArray(data.evidence) ? data.evidence : [];
      evidenceEl.innerHTML = '';
      ev.forEach(function(item, i){
        var li = document.createElement('li');
        li.className = 'row fade-in';
        li.style.setProperty('--i', i);
        li.style.cssText += 'background:rgba(255,255,255,0.08); border-radius:10px; padding:12px 16px; font-size:14px;';
        li.textContent = String(item);
        evidenceEl.appendChild(li);
      });

      resultEl.style.display = 'flex';
    }

    goEl.addEventListener('click', function(){
      var employer = selectedEmployer;
      if (!employer){
        errEl.textContent = 'Choose a company first.';
        errEl.style.display = 'block';
        return;
      }
      errEl.style.display = 'none';
      var record = VisaRadarMatcher.employerToFilingRecord(employer, { title: titleEl.value, state: stateEl.value });
      state.set({ company: employer.n, state: stateEl.value });
      render(record);
    });

    jsonGoEl.addEventListener('click', function(){
      try{
        var data = JSON.parse(jsonEl.value);
        errEl.style.display = 'none';
        render(data);
      } catch (e){
        errEl.textContent = "That's not valid JSON — check the format and try again.";
        errEl.style.display = 'block';
      }
    });

    onFilterChange = function(newState){
      var company = newState.company || '';
      if (company === (selectedEmployer && selectedEmployer.n)) return;
      if (!companySearchEl.value || companySearchEl.value === lastSetValue){
        syncFromSharedState(company, false);
      }
    };
  }

  window.AppShell.registerSection('check', { mount: mount, onFilterChange: function(newState){ onFilterChange(newState); } });
})();
