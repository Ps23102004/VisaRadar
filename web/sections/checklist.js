(function(){
  "use strict";

  var COUNTRY_NAMES = {
    IN: 'India', CN: 'China', MX: 'Mexico', NG: 'Nigeria', PH: 'Philippines',
    BR: 'Brazil', KR: 'South Korea', CA: 'Canada', GB: 'United Kingdom', DE: 'Germany',
    VN: 'Vietnam', PK: 'Pakistan', BD: 'Bangladesh', CO: 'Colombia', UA: 'Ukraine',
    NP: 'Nepal', GH: 'Ghana', TW: 'Taiwan'
  };

  function esc(s){
    var d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function mount(container, state){
    var countryOptions = Object.keys(COUNTRY_NAMES).map(function(cc){
      return '<option value="' + cc + '">' + COUNTRY_NAMES[cc] + '</option>';
    }).join('') + '<option value="default">Other / not listed</option>';

    container.innerHTML =
      '<div class="tabs" role="tablist" id="checklist-visa-tabs">' +
        '<button class="tab-btn active" data-visa="F-1" type="button">F-1 Student</button>' +
        '<button class="tab-btn" data-visa="J-1" type="button">J-1 Exchange</button>' +
        '<button class="tab-btn" data-visa="H-1B" type="button">H-1B</button>' +
      '</div>' +
      '<label style="font-size:13px; font-weight:600; display:block; margin:14px 0;">Country you\'re applying from' +
        '<select id="checklist-country">' + countryOptions + '</select>' +
      '</label>' +
      '<div id="checklist-body"></div>';

    var visaTabs = container.querySelectorAll('#checklist-visa-tabs .tab-btn');
    var countryEl = container.querySelector('#checklist-country');
    var bodyEl = container.querySelector('#checklist-body');
    var expandedExampleIndex = null;

    function currentVisa(){
      var active = container.querySelector('#checklist-visa-tabs .tab-btn.active');
      return active ? active.dataset.visa : 'F-1';
    }

    function renderBody(){
      var visaType = currentVisa();
      var countryCode = countryEl.value;
      var entry = VisaRadarChecklistData.lookupChecklist(visaType, countryCode);
      var feeText = VisaRadarChecklistData.CHECKLIST_DATA[visaType].fee;

      bodyEl.innerHTML =
        '<p style="font-size:14px; color:var(--accent); font-weight:600;">Fee: ' + esc(feeText) + '</p>' +
        (entry.notes ? '<p style="font-size:13px; color:var(--ink-soft); margin-bottom:14px;">' + esc(entry.notes) + '</p>' : '') +
        '<div class="glass stagger" style="padding:6px;"><ul style="list-style:none; margin:0; padding:0;">' +
        entry.documents.map(function(doc, index){
          var example = entry.examples && entry.examples[doc.title];
          var expanded = expandedExampleIndex === index;
          return '<li' + (example ? ' data-example-index="' + index + '" role="button" tabindex="0" aria-expanded="' + expanded + '" style="padding:12px 14px; font-size:14px; cursor:pointer;"' : ' style="padding:12px 14px; font-size:14px;"') + '>' +
            '<strong style="display:block;">' + esc(doc.title) + '</strong>' +
            '<span style="color:var(--ink-soft); font-size:13px;">' + esc(doc.detail) + '</span>' +
            (example ? '<span aria-hidden="true" style="float:right; color:var(--ink-soft); font-size:13px;">' + (expanded ? '−' : '+') + '</span>' : '') +
            (example && expanded ? '<div style="margin-top:6px; font-size:12.5px; color:var(--ink-soft); font-style:italic;">Example: ' + esc(example) + '</div>' : '') +
          '</li>';
        }).join('') +
        '</ul></div>' +
        '<p style="font-size:12px; color:var(--ink-soft); margin-top:20px;">Source: <a href="' + esc(entry.source) + '" style="color:var(--ink-soft);">' + esc(entry.source) + '</a> — informational only, not legal advice, always confirm against the live page.</p>';

      bodyEl.querySelectorAll('[data-example-index]').forEach(function(row){
        function toggleExample(){
          var index = Number(row.dataset.exampleIndex);
          expandedExampleIndex = expandedExampleIndex === index ? null : index;
          renderBody();
        }
        row.addEventListener('click', toggleExample);
        row.addEventListener('keydown', function(event){
          if (event.key === 'Enter' || event.key === ' '){
            event.preventDefault();
            toggleExample();
          }
        });
      });
    }

      visaTabs.forEach(function(btn){
        btn.addEventListener('click', function(){
          visaTabs.forEach(function(b){ b.classList.remove('active'); });
          btn.classList.add('active');
          state.set({ visaType: btn.dataset.visa });
          expandedExampleIndex = null;
          renderBody();
      });
    });

    countryEl.addEventListener('change', function(){
      state.set({ country: countryEl.value });
      expandedExampleIndex = null;
      renderBody();
    });

    var current = state.get();
    if (current.visaType){
      visaTabs.forEach(function(b){ b.classList.toggle('active', b.dataset.visa === current.visaType); });
    }
    if (current.country) countryEl.value = current.country;

    renderBody();
  }

  window.AppShell.registerSection('checklist', { mount: mount });
})();
