(function(root, factory){
  if (typeof module === 'object' && module.exports){
    module.exports = factory();
  } else {
    root.VisaRadarLLM = factory();
  }
})(typeof self !== 'undefined' ? self : this, function(){
  "use strict";

  var PROVIDERS = {
    ollama:     { baseUrl: "http://127.0.0.1:11434", chatPath: "/api/chat", needsKey: false, native: "ollama" },
    openrouter: { baseUrl: "https://openrouter.ai/api/v1", chatPath: "/chat/completions", needsKey: true, native: "openai" },
    openai:     { baseUrl: "https://api.openai.com/v1", chatPath: "/chat/completions", needsKey: true, native: "openai" },
    anthropic:  { baseUrl: "https://api.anthropic.com", chatPath: "/v1/messages", needsKey: true, native: "anthropic" },
    gemini:     { baseUrl: "https://generativelanguage.googleapis.com", needsKey: true, native: "gemini" },
    groq:       { baseUrl: "https://api.groq.com/openai/v1", chatPath: "/chat/completions", needsKey: true, native: "openai" },
    together:   { baseUrl: "https://api.together.xyz/v1", chatPath: "/chat/completions", needsKey: true, native: "openai" }
  };

  async function callLLM(provider, model, apiKey, prompt, opts){
    var cfg = PROVIDERS[provider];
    var url = cfg.baseUrl + cfg.chatPath;
    var headers = { "Content-Type": "application/json" };
    var body;
    if (cfg.native === "ollama"){
      body = { model: model, messages: [{ role: "user", content: prompt }], stream: false, think: false };
    } else if (cfg.native === "anthropic"){
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      body = { model: model, max_tokens: 1024, system: "Extract job-posting details accurately and return only the requested JSON.", messages: [{ role: "user", content: prompt }] };
    } else if (cfg.native === "gemini"){
      url = cfg.baseUrl + "/v1beta/models/" + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(apiKey);
      body = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0 } };
    } else {
      headers["Authorization"] = "Bearer " + apiKey;
      body = { model: model, messages: [{ role: "user", content: prompt }], temperature: 0 };
    }

    opts = opts || {};
    var controller = typeof AbortController !== 'undefined' && opts.timeoutMs ? new AbortController() : null;
    var timer = controller ? setTimeout(function(){ controller.abort(); }, opts.timeoutMs) : null;
    var res;
    var data;
    try {
      var request = { method: "POST", headers: headers, body: JSON.stringify(body) };
      if (controller) request.signal = controller.signal;
      res = await fetch(url, request);
      if (!res.ok) throw new Error("provider returned " + res.status);
      data = await res.json();
    } catch (error){
      if (error && error.name === 'AbortError') throw new Error("request timed out");
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
    var content;
    if (cfg.native === "ollama") content = data.message && data.message.content;
    else if (cfg.native === "anthropic") content = data.content && data.content[0] && data.content[0].text;
    else if (cfg.native === "gemini") content = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
    else content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content || typeof content !== "string") throw new Error("empty response from provider");
    return content;
  }

  return { PROVIDERS: PROVIDERS, callLLM: callLLM };
});
