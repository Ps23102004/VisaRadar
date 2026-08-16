(function(){
  "use strict";
  var STORAGE_KEY = "visaradar_journey_v1";

  var STEP_DEFS = {
    f1: [
      { id: "docs", title: "Documents gathered", desc: "I-20, financial proof, acceptance letter, passport" },
      { id: "fee", title: "SEVIS I-901 fee paid", desc: "Self-reported — pay only at fmjfee.com, never here" },
      { id: "ds160", title: "DS-160 submitted", desc: "Online nonimmigrant visa application, at ceac.state.gov" },
      { id: "scheduled", title: "Interview scheduled", desc: "Booked at your local U.S. embassy or consulate" },
      { id: "interviewed", title: "Interview completed", desc: "" },
      { id: "decision", title: "Decision received", desc: "Approved, denied, or administrative processing (221g)" }
    ],
    j1: [
      { id: "docs", title: "Documents gathered", desc: "DS-2019, financial proof, program sponsor info, passport" },
      { id: "fee", title: "SEVIS I-901 fee paid", desc: "Self-reported — pay only at fmjfee.com, never here" },
      { id: "ds160", title: "DS-160 submitted", desc: "Online nonimmigrant visa application, at ceac.state.gov" },
      { id: "scheduled", title: "Interview scheduled", desc: "Booked at your local U.S. embassy or consulate" },
      { id: "interviewed", title: "Interview completed", desc: "" },
      { id: "decision", title: "Decision received", desc: "Approved, denied, or administrative processing (221g)" }
    ],
    h1b: [
      { id: "docs", title: "Documents gathered", desc: "Approved I-129 petition, I-797, employer support letter" },
      { id: "fee", title: "Visa fee paid", desc: "Self-reported — pay only through official DoS channels" },
      { id: "ds160", title: "DS-160 submitted", desc: "Online nonimmigrant visa application, at ceac.state.gov" },
      { id: "scheduled", title: "Interview scheduled", desc: "Booked at your local U.S. embassy or consulate" },
      { id: "interviewed", title: "Interview completed", desc: "" },
      { id: "decision", title: "Decision received", desc: "Approved, denied, or administrative processing (221g)" }
    ]
  };

  function loadState(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return (parsed && typeof parsed === "object") ? parsed : null;
    } catch(e){ return null; }
  }

  function saveState(s){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch(e){}
  }

  function checkIcon(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';
  }

  var VISA_KEY_MAP = { 'F-1': 'f1', 'J-1': 'j1', 'H-1B': 'h1b' };

  function mount(container, appState){
    container.innerHTML =
      '<p style="font-size:13px; color:var(--ink-soft); padding:10px 14px; background:rgba(255,149,0,0.08); border-radius:10px; border:1px solid rgba(255,149,0,0.2); margin-bottom:20px;">' +
        'This page makes zero network calls. Your progress is saved only in this browser (localStorage).</p>' +
      '<div class="progress-wrap" style="margin-bottom:20px;">' +
        '<div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:10px;">' +
          '<span id="journey-pct" style="font-size:28px; font-weight:700;"></span>' +
          '<span id="journey-label" style="font-size:13px; color:var(--ink-soft);"></span>' +
        '</div>' +
        '<div style="height:8px; border-radius:999px; background:rgba(0,0,0,0.06); overflow:hidden;"><div id="journey-bar" style="height:100%; border-radius:999px; background:var(--accent); transition:width .4s cubic-bezier(0.16,1,0.3,1); width:0%;"></div></div>' +
      '</div>' +
      '<ul id="journey-stages" class="glass" style="list-style:none; margin:0; padding:6px; display:flex; flex-direction:column; gap:10px;"></ul>' +
      '<div id="journey-celebrate" class="glass" style="display:none; padding:32px 22px; text-align:center; margin-top:20px;">' +
        '<div style="font-size:40px; margin-bottom:8px;">🎉</div><h2 style="font-size:22px; margin:0 0 6px;">Congratulations!</h2>' +
        '<p style="font-size:14px; color:var(--ink-soft); margin:0;">You made it through the whole process. Good luck on the next chapter.</p>' +
      '</div>';

    var stagesEl = container.querySelector('#journey-stages');
    var pctEl = container.querySelector('#journey-pct');
    var labelEl = container.querySelector('#journey-label');
    var barEl = container.querySelector('#journey-bar');
    var celebrateEl = container.querySelector('#journey-celebrate');

    var visaKey = VISA_KEY_MAP[appState.get().visaType] || 'f1';
    var stored = loadState() || { visaType: visaKey, steps: {} };
    var localState = stored;

    function render(){
      var defs = STEP_DEFS[localState.visaType] || STEP_DEFS.f1;
      stagesEl.innerHTML = "";
      var doneCount = 0;

      defs.forEach(function(def){
        var stepState = localState.steps[def.id] || { done: false, note: "" };
        if (stepState.done) doneCount++;

        var li = document.createElement("li");
        li.style.cssText = "padding:16px 18px; display:flex; flex-direction:column; gap:10px;";

        var row = document.createElement("div");
        row.style.cssText = "display:flex; align-items:center; gap:14px;";

        var btn = document.createElement("button");
        btn.type = "button";
        btn.style.cssText = "flex:none; width:26px; height:26px; border-radius:50%; border:2px solid " +
          (stepState.done ? "var(--strong)" : "rgba(0,0,0,0.15)") + "; background:" + (stepState.done ? "var(--strong)" : "transparent") +
          "; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;";
        btn.innerHTML = stepState.done ? checkIcon() : '';
        btn.addEventListener("click", function(){
          stepState.done = !stepState.done;
          localState.steps[def.id] = stepState;
          saveState(localState);
          render();
        });

        var title = document.createElement("span");
        title.style.cssText = "font-size:15px; font-weight:600; flex:1;" + (stepState.done ? "color:var(--ink-soft); text-decoration:line-through;" : "");
        title.textContent = def.title;

        row.appendChild(btn);
        row.appendChild(title);
        li.appendChild(row);

        if (def.desc){
          var desc = document.createElement("p");
          desc.style.cssText = "font-size:13px; color:var(--ink-soft); margin:0; padding-left:40px;";
          desc.textContent = def.desc;
          li.appendChild(desc);
        }

        stagesEl.appendChild(li);
      });

      var total = defs.length;
      var pct = total ? Math.round((doneCount / total) * 100) : 0;
      pctEl.textContent = pct + "%";
      labelEl.textContent = doneCount + " of " + total + " steps done";
      barEl.style.width = pct + "%";

      var decisionDone = localState.steps.decision && localState.steps.decision.done;
      celebrateEl.style.display = decisionDone ? 'block' : 'none';
    }

    appState.subscribe(function(next){
      var mapped = VISA_KEY_MAP[next.visaType];
      if (mapped && mapped !== localState.visaType){
        localState.visaType = mapped;
        saveState(localState);
        render();
      }
    });

    render();
  }

  window.AppShell.registerSection('journey', { mount: mount });
})();
