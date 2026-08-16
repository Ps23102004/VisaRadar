(function(){
  "use strict";

  var REQUEST_TIMEOUT_MS = 45000;
  var US_STATES = {
    AL:1, AK:1, AZ:1, AR:1, CA:1, CO:1, CT:1, DE:1, FL:1, GA:1, HI:1, ID:1, IL:1, IN:1,
    IA:1, KS:1, KY:1, LA:1, ME:1, MD:1, MA:1, MI:1, MN:1, MS:1, MO:1, MT:1, NE:1, NV:1,
    NH:1, NJ:1, NM:1, NY:1, NC:1, ND:1, OH:1, OK:1, OR:1, PA:1, RI:1, SC:1, SD:1, TN:1,
    TX:1, UT:1, VT:1, VA:1, WA:1, WV:1, WI:1, WY:1, DC:1
  };

  function esc(s){
    var d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function stripCodeFence(raw){
    var trimmed = String(raw).replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    var match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (match) return match[1].trim();
    var objectStart = trimmed.indexOf('{');
    var arrayStart = trimmed.indexOf('[');
    var start = objectStart === -1 ? arrayStart : (arrayStart === -1 ? objectStart : Math.min(objectStart, arrayStart));
    if (start !== -1){
      var end = trimmed.lastIndexOf(trimmed.charAt(start) === '{' ? '}' : ']');
      if (end > start) return trimmed.slice(start, end + 1);
    }
    return trimmed;
  }

  function constraintPrompt(query, strict){
    return (strict ? "Return ONLY the JSON object, no other text, no markdown code fences.\n\n" : "") +
      "You extract structured constraints for a US employer search. Return ONLY a JSON object (raw JSON, no markdown code fences and no explanation) with this exact possible shape:\n" +
      "{\"states\":[\"CA\",\"WA\"],\"avoidStates\":[\"ND\",\"MN\"],\"minWage\":100000,\"maxWage\":null,\"keywords\":[\"engineer\"]}\n\n" +
      "Rules:\n" +
      "- states and avoidStates contain only 2-letter US state codes when the query mentions specific places.\n" +
      "- Map obvious climate requests such as no snow, warm weather, or avoiding cold winters to a reasonable rough avoidStates list of typically cold states. A reasonable list may include ND, MN, WI, MI, ME, VT, NH, AK, MT, and WY.\n" +
      "- minWage and maxWage are annual dollar numbers inferred only from pay explicitly mentioned; use null or omit the field when not mentioned.\n" +
      "- keywords contain job-type or industry words from the query and should not contain generic preference words.\n" +
      "- All fields are optional or nullable. Return {} when the query has no extractable constraints.\n\n" +
      "User query:\n" + query;
  }

  function rankingPrompt(query, candidates, strict){
    return (strict ? "Return ONLY the JSON array, no other text, no markdown code fences, no thinking, no explanation.\n\n" : "") +
      "Rank the best employer matches for the user's query using ONLY the candidate list below. Pick up to 8 matches and give one concise sentence explaining each choice. Return ONLY a raw JSON array with this exact shape, with no markdown code fences or other text:\n" +
      "[{\"k\":\"<exact key from the candidate list>\",\"reason\":\"<one-sentence reason>\"}]\n\n" +
      "Only pick companies from the list given — do not invent or reference any company not in this list. Copy each k exactly. Do not put company names or keys inside the reason unless they appear in the candidate list. In each reason, describe only the company being recommended — do not name, mention, or compare to any other company.\n\n" +
      "User query:\n" + query + "\n\n" +
      "Each candidate has: k (unique key, copy exactly), n (company name), s (states), w (typical annual wage in dollars), t (top job titles on file), l (DOL certification strength: strong/moderate/weak/none).\n\n" +
      "Candidate list:\n" + JSON.stringify(candidates.map(function(e){
        return { k: e.k, n: e.n, s: e.s, w: e.w, t: e.t, l: e.l };
      }));
  }

  function normalizeConstraints(value){
    var constraints = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('constraints must be an object');

    function statesFor(field){
      if (!Array.isArray(value[field])) return [];
      return value[field].map(function(state){ return String(state).trim().toUpperCase(); })
        .filter(function(state, index, states){ return US_STATES[state] && states.indexOf(state) === index; });
    }

    function wageFor(field){
      if (value[field] === null || value[field] === undefined || value[field] === '') return null;
      var wage = Number(value[field]);
      return Number.isFinite(wage) && wage >= 0 ? wage : null;
    }

    var states = statesFor('states');
    var avoidStates = statesFor('avoidStates');
    var minWage = wageFor('minWage');
    var maxWage = wageFor('maxWage');
    var keywords = Array.isArray(value.keywords) ? value.keywords.map(function(keyword){
      return String(keyword).trim().toLowerCase();
    }).filter(function(keyword, index, list){ return keyword && list.indexOf(keyword) === index; }) : [];

    if (states.length) constraints.states = states;
    if (avoidStates.length) constraints.avoidStates = avoidStates;
    if (minWage !== null) constraints.minWage = minWage;
    if (maxWage !== null) constraints.maxWage = maxWage;
    if (keywords.length) constraints.keywords = keywords;
    return constraints;
  }

  function parseConstraints(raw){
    return normalizeConstraints(JSON.parse(stripCodeFence(raw)));
  }

  // A small number of records in employers.json (confirmed via direct inspection: ~117 of
  // 67,722, up to $393M) carry what look like aggregate payroll totals in the wage field
  // rather than a per-employee "typical wage" -- a data quality issue in the underlying
  // dataset, not something fixable here, but it was dominating "top by wage" results with
  // implausible outliers. $2,000,000/year is a generous ceiling for a real individual
  // salary (well above even top tech/exec pay), so outliers are demoted below plausible wages.
  var PLAUSIBLE_MAX_WAGE = 2000000;

  function topByWage(employers){
    function byWage(a, b){ return Number(b.w || 0) - Number(a.w || 0); }
    var plausible = employers.filter(function(e){ return Number(e.w || 0) <= PLAUSIBLE_MAX_WAGE; }).sort(byWage);
    var outliers = employers.filter(function(e){ return Number(e.w || 0) > PLAUSIBLE_MAX_WAGE; }).sort(byWage);
    return plausible.concat(outliers).slice(0, 20);
  }

  function filterCandidates(employers, constraints){
    var filtered = employers.filter(function(e){
      var employerStates = Array.isArray(e.s) ? e.s : [];
      if (constraints.states && !constraints.states.some(function(state){ return employerStates.indexOf(state) !== -1; })) return false;
      if (constraints.avoidStates && constraints.avoidStates.some(function(state){ return employerStates.indexOf(state) !== -1; })) return false;
      if (constraints.minWage !== undefined && Number(e.w || 0) < constraints.minWage) return false;
      if (constraints.maxWage !== undefined && Number(e.w || 0) > constraints.maxWage) return false;
      if (constraints.keywords){
        var haystack = ((e.n || '') + ' ' + (Array.isArray(e.t) ? e.t.join(' ') : '')).toLowerCase();
        if (!constraints.keywords.every(function(keyword){ return haystack.indexOf(keyword) !== -1; })) return false;
      }
      return true;
    });
    return { candidates: topByWage(filtered.length ? filtered : employers), exact: filtered.length > 0 };
  }

  function validateRanking(raw, candidates){
    var parsed = JSON.parse(stripCodeFence(raw));
    if (!Array.isArray(parsed)) throw new Error('ranking must be an array');
    var candidateByKey = Object.create(null);
    var seen = Object.create(null);
    candidates.forEach(function(candidate){ candidateByKey[candidate.k] = candidate; });
    return parsed.filter(function(item){
      var valid = item && typeof item === 'object' && typeof item.k === 'string' &&
        Object.prototype.hasOwnProperty.call(candidateByKey, item.k) && !seen[item.k];
      if (valid) seen[item.k] = true;
      return valid;
    }).map(function(item){
      return { employer: candidateByKey[item.k], reason: typeof item.reason === 'string' ? item.reason.trim() : '' };
    }).slice(0, 8);
  }

  function configuredProvider(){
    var provider = localStorage.getItem('visaradar_last_provider') || '';
    var cfg = VisaRadarLLM.PROVIDERS[provider];
    var apiKey = provider ? (localStorage.getItem('visaradar_key_' + provider) || '').trim() : '';
    var model = provider ? (localStorage.getItem('visaradar_model_' + provider) || '').trim() : '';
    if (!cfg || (cfg.needsKey && !apiKey) || !model) return null;
    return { provider: provider, apiKey: apiKey, model: model };
  }

  var onFilterChange = function(){};

  function mount(container, state){
    container.innerHTML =
      '<details id="ask-ai-panel" class="glass fade-in" open style="margin-bottom:18px; padding:18px 20px; overflow:visible;">' +
        '<summary style="cursor:pointer; font-size:17px; font-weight:700;">Ask AI <span style="font-size:13px; font-weight:400; color:var(--ink-soft);">natural-language company search</span></summary>' +
        '<div id="ask-ai-content" style="margin-top:16px;"></div>' +
      '</details>' +
      '<section class="search-wrap glass fade-in" aria-label="Search employers">' +
        '<span class="search-ico" aria-hidden="true">' +
          '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>' +
        '</span>' +
        '<input id="browse-search" class="search-input" type="search" autocomplete="off" spellcheck="false" ' +
          'placeholder="Search company name or state (e.g. CA, Google, Microsoft)..." aria-label="Search company name or state">' +
      '</section>' +
      '<p style="font-size:12px; line-height:1.45; color:var(--ink-soft); margin:8px 2px 14px;">Wage figures come from DOL filing data and can occasionally be imprecise for a small number of employers.</p>' +
      '<ul id="browse-results" class="stagger" style="list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px;"></ul>';

    var searchEl = container.querySelector('#browse-search');
    var resultsEl = container.querySelector('#browse-results');
    var aiContentEl = container.querySelector('#ask-ai-content');
    var employers = [];
    var expandedEmployerKey = null;
    var selected = Object.create(null);

    renderAskAI();

    window.employersPromise.then(function(data){
      employers = data;
      renderResults();
    }).catch(function(){
      setAIStatus('Company data could not be loaded. Reload the page and try again.', true);
    });

    function renderAskAI(){
      var configured = configuredProvider();
      aiContentEl.innerHTML =
        '<label for="ask-ai-query" style="display:block; font-size:14px; font-weight:600; margin-bottom:7px;">What are you looking for?</label>' +
        '<textarea id="ask-ai-query" rows="3" style="width:100%; resize:vertical; font:inherit; color:inherit; background:rgba(0,0,0,0.03); border:1px solid rgba(0,0,0,0.1); border-radius:12px; padding:11px 13px; outline:none;" placeholder="e.g. good pay, warm weather, no snow, California or Washington"></textarea>' +
        '<div id="ask-ai-action" style="margin-top:10px;">' +
          (configured ? '<button class="go" id="ask-ai-find" type="button">Find matches</button>' :
            '<span style="font-size:14px; color:var(--ink-soft);">Set up a provider on the <a href="byok.html" style="color:var(--accent);">Bring your key</a> page first.</span>') +
        '</div>' +
        '<p style="font-size:12px; line-height:1.45; color:var(--ink-soft); margin:9px 0 0;">Sends your query and a filtered set of company names to your configured AI provider — nothing is sent unless you click Find matches. Your API key stays in this browser, same as Bring your key.</p>' +
        '<div id="ask-ai-status" role="status" aria-live="polite" style="font-size:13px; line-height:1.45; margin-top:12px;"></div>' +
        '<ul id="ask-ai-results" style="list-style:none; margin:12px 0 0; padding:0; display:flex; flex-direction:column; gap:9px;"></ul>' +
        '<div id="ask-ai-shortlist"></div>';

      var findEl = aiContentEl.querySelector('#ask-ai-find');
      if (findEl) findEl.addEventListener('click', runAISearch);
    }

    function setAIStatus(message, isError){
      var statusEl = aiContentEl.querySelector('#ask-ai-status');
      if (!statusEl) return;
      statusEl.textContent = message || '';
      statusEl.style.color = isError ? '#FF453A' : 'var(--ink-soft)';
    }

    async function runAISearch(){
      var findEl = aiContentEl.querySelector('#ask-ai-find');
      var queryEl = aiContentEl.querySelector('#ask-ai-query');
      var query = queryEl ? queryEl.value.trim() : '';
      var configured = configuredProvider();
      if (!configured){
        renderAskAI();
        return;
      }
      if (!query){
        setAIStatus('Describe what you are looking for first.', true);
        return;
      }
      if (!employers.length){
        setAIStatus('Company data is still loading. Try again in a moment.', true);
        return;
      }

      findEl.disabled = true;
      findEl.textContent = 'Finding matches...';
      setAIStatus('Extracting search constraints…', false);
      var extractionFailed = false;

      try {
        var rawConstraints = await VisaRadarLLM.callLLM(
          configured.provider, configured.model, configured.apiKey, constraintPrompt(query, false),
          { timeoutMs: REQUEST_TIMEOUT_MS, system: "Extract structured search filters from the user's query and return only the requested JSON." }
        );
        var constraints;
        try {
          constraints = parseConstraints(rawConstraints);
        } catch (firstParseError){
          var retryRaw = await VisaRadarLLM.callLLM(
            configured.provider, configured.model, configured.apiKey, constraintPrompt(query, true),
            { timeoutMs: REQUEST_TIMEOUT_MS, system: "Extract structured search filters from the user's query and return only the requested JSON." }
          );
          try {
            constraints = parseConstraints(retryRaw);
          } catch (secondParseError){
            constraints = {};
            extractionFailed = true;
          }
        }

        var filtered = filterCandidates(employers, constraints);
        setAIStatus('Ranking grounded matches…', false);
        var rawRanking = await VisaRadarLLM.callLLM(
          configured.provider, configured.model, configured.apiKey, rankingPrompt(query, filtered.candidates),
          { timeoutMs: REQUEST_TIMEOUT_MS, system: "Rank the given real companies against the user's query and return only the requested JSON, using only companies from the provided list." }
        );
        var ranked = [];
        try {
          ranked = validateRanking(rawRanking, filtered.candidates);
        } catch (rankingParseError){
          var retryRanking = await VisaRadarLLM.callLLM(
            configured.provider, configured.model, configured.apiKey, rankingPrompt(query, filtered.candidates, true),
            { timeoutMs: REQUEST_TIMEOUT_MS, system: "Rank the given real companies against the user's query and return only the requested JSON, using only companies from the provided list." }
          );
          try { ranked = validateRanking(retryRanking, filtered.candidates); } catch (retryRankingParseError){ ranked = []; }
        }
        var rankingUnavailable = ranked.length === 0;
        if (rankingUnavailable){
          ranked = filtered.candidates.map(function(employer){ return { employer: employer, reason: '' }; });
        }
        renderAIResults(ranked, {
          extractionFailed: extractionFailed,
          exact: filtered.exact,
          rankingUnavailable: rankingUnavailable,
          weatherApproximation: /\b(warm|weather|snow|cold|climate|winter|sunny|mild)\b/i.test(query)
        });
      } catch (error){
        setAIStatus('Request to ' + configured.provider + ' failed: ' + (error && error.message ? error.message : 'unknown error') + '. Check your API key on the Bring your key page.', true);
      } finally {
        findEl.disabled = false;
        findEl.textContent = 'Find matches';
      }
    }

    function renderAIResults(ranked, notes){
      var noteParts = [];
      if (notes.extractionFailed) noteParts.push("Constraint extraction didn't work; results are just top companies by wage.");
      if (!notes.exact) noteParts.push('No exact matches for your filters — showing top companies overall instead.');
      if (notes.rankingUnavailable) noteParts.push('AI ranking unavailable, showing top matches by wage instead.');
      if (notes.weatherApproximation) noteParts.push('Location filtering is a rough approximation, not real weather data.');
      setAIStatus(noteParts.length ? noteParts.join(' ') : 'Companies shown are real VisaRadar records. The one-line reasons are AI-written and not independently verified.', false);

      var listEl = aiContentEl.querySelector('#ask-ai-results');
      listEl.innerHTML = ranked.map(function(result){
        var e = result.employer;
        var checked = Object.prototype.hasOwnProperty.call(selected, e.k) ? ' checked' : '';
        return '<li class="glass" style="padding:13px 15px; overflow:visible;">' +
          '<label style="display:flex; align-items:flex-start; gap:11px; cursor:pointer;">' +
            '<input class="ask-ai-check" type="checkbox" data-company-key="' + esc(e.k) + '"' + checked + ' style="margin-top:3px; accent-color:var(--accent);">' +
            '<span>' +
              '<strong>' + esc(e.n) + '</strong>' +
              '<span style="display:block; font-size:13px; color:var(--ink-soft); margin-top:2px;">' + esc((e.t && e.t[0]) || '') + ' · ' + (Array.isArray(e.s) ? e.s.map(esc).join(', ') : '') + ' · $' + esc(Number(e.w || 0).toLocaleString()) + '</span>' +
              (result.reason ? '<em style="display:block; font-size:13px; color:var(--ink-soft); margin-top:6px; line-height:1.4;">' + esc(result.reason) + '</em>' : '') +
            '</span>' +
          '</label>' +
        '</li>';
      }).join('');

      listEl.querySelectorAll('.ask-ai-check').forEach(function(checkbox){
        checkbox.addEventListener('change', function(){
          var key = checkbox.dataset.companyKey;
          var match = ranked.find(function(result){ return result.employer.k === key; });
          if (checkbox.checked && match) selected[key] = match.employer;
          else delete selected[key];
          renderShortlist();
        });
      });
      renderShortlist();
    }

    function renderShortlist(){
      var shortlistEl = aiContentEl.querySelector('#ask-ai-shortlist');
      if (!shortlistEl) return;
      var companies = Object.keys(selected).map(function(key){ return selected[key]; });
      if (!companies.length){ shortlistEl.innerHTML = ''; return; }
      shortlistEl.innerHTML =
        '<div class="glass" style="position:sticky; bottom:12px; margin-top:14px; padding:13px 15px; overflow:visible; display:flex; align-items:center; justify-content:space-between; gap:14px;">' +
          '<div><strong>' + esc(companies.length) + ' companies selected</strong><div style="font-size:12px; color:var(--ink-soft); margin-top:3px;">' + companies.map(function(e){ return esc(e.n); }).join(', ') + '</div></div>' +
          '<button class="go" id="ask-ai-next" type="button" style="white-space:nowrap;">Next →</button>' +
        '</div>';
      shortlistEl.querySelector('#ask-ai-next').addEventListener('click', renderSearchLinks);
    }

    function renderSearchLinks(){
      var companies = Object.keys(selected).map(function(key){ return selected[key]; });
      aiContentEl.innerHTML =
        '<button id="ask-ai-back" type="button" style="appearance:none; border:0; background:none; color:var(--accent); cursor:pointer; font:inherit; font-size:13px; padding:0; margin:0 0 12px;">← Back to search</button>' +
        '<h2 style="font-size:18px; margin:0 0 6px;">Search your shortlist</h2>' +
        '<p style="font-size:13px; color:var(--ink-soft); margin:0 0 14px;">Search links, not guaranteed live postings — this app doesn\'t have real-time job listing data.</p>' +
        '<ul style="list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px;">' +
          companies.map(function(e){
            var encodedName = encodeURIComponent(e.n);
            var linkedIn = 'https://www.linkedin.com/jobs/search/?keywords=' + encodedName;
            var indeed = 'https://www.indeed.com/jobs?q=' + encodedName;
            var google = 'https://www.google.com/search?q=' + encodedName + '+careers';
            return '<li class="glass" style="padding:13px 15px; overflow:visible;">' +
              '<strong>' + esc(e.n) + '</strong>' +
              '<div style="display:flex; flex-wrap:wrap; gap:12px; margin-top:7px; font-size:13px;">' +
                '<a href="' + esc(linkedIn) + '" target="_blank" rel="noopener noreferrer" style="color:var(--accent);">LinkedIn Jobs</a>' +
                '<a href="' + esc(indeed) + '" target="_blank" rel="noopener noreferrer" style="color:var(--accent);">Indeed</a>' +
                '<a href="' + esc(google) + '" target="_blank" rel="noopener noreferrer" style="color:var(--accent);">Careers page search</a>' +
              '</div>' +
            '</li>';
          }).join('') +
        '</ul>';
      aiContentEl.querySelector('#ask-ai-back').addEventListener('click', renderAskAI);
    }

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
