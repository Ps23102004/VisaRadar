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

  function mount(container, state){
    container.innerHTML =
      '<div class="glass" style="padding:22px; display:flex; flex-direction:column; gap:14px;">' +
        '<label style="font-size:13px; font-weight:600;">Company<select id="check-company"><option value="">Choose a company…</option></select></label>' +
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

    var companyEl = container.querySelector('#check-company');
    var titleEl = container.querySelector('#check-title');
    var stateEl = container.querySelector('#check-state');
    var goEl = container.querySelector('#check-go');
    var errEl = container.querySelector('#check-error');
    var resultEl = container.querySelector('#check-result');
    var jsonEl = container.querySelector('#check-json');
    var jsonGoEl = container.querySelector('#check-json-go');

    var employers = [];
    var byKey = {};

    window.employersPromise.then(function(data){
      employers = data;
      byKey = {};
      companyEl.innerHTML = '<option value="">Choose a company…</option>' + employers.map(function(e){
        byKey[e.n] = e;
        return '<option value="' + esc(e.n) + '">' + esc(e.n) + '</option>';
      }).join('');
      if (state.get().company){
        var pre = employers.find(function(e){ return e.n.toLowerCase().indexOf(state.get().company.toLowerCase()) !== -1; });
        if (pre){ companyEl.value = pre.n; populateEmployerOptions(pre); }
      }
    });

    function populateEmployerOptions(employer){
      titleEl.innerHTML = employer.t.map(function(t){ return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join('');
      stateEl.innerHTML = employer.s.map(function(s){ return '<option value="' + esc(s) + '">' + esc(s) + '</option>'; }).join('');
    }

    companyEl.addEventListener('change', function(){
      var employer = byKey[companyEl.value];
      if (employer) populateEmployerOptions(employer);
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
      var employer = byKey[companyEl.value];
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
  }

  window.AppShell.registerSection('check', { mount: mount });
})();
