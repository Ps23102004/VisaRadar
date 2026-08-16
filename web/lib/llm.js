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
    zai:        { baseUrl: "https://api.z.ai/api/anthropic", chatPath: "/v1/messages", needsKey: true, native: "anthropic" },
    gemini:     { baseUrl: "https://generativelanguage.googleapis.com", needsKey: true, native: "gemini" },
    groq:       { baseUrl: "https://api.groq.com/openai/v1", chatPath: "/chat/completions", needsKey: true, native: "openai" },
    together:   { baseUrl: "https://api.together.xyz/v1", chatPath: "/chat/completions", needsKey: true, native: "openai" },
    custom:     { baseUrl: null, chatPath: "/chat/completions", needsKey: true, native: "openai" }
  };

  // HTTP header values must be Latin-1 (ISO-8859-1); a pasted API key carrying a stray
  // non-ASCII character (smart quotes, zero-width spaces, and other copy-paste artifacts
  // are common) throws a cryptic "Failed to read the 'headers' property... non ISO-8859-1
  // code point" error from fetch() itself, before any request is even sent. Real API keys
  // are always plain printable ASCII, so stripping anything outside that range is safe and
  // fixes the common case (invisible paste artifacts) without altering a valid key.
  function sanitizeApiKey(key){
    return String(key || "").replace(/[^\x20-\x7E]/g, "");
  }

  async function callLLM(provider, model, apiKey, prompt, opts){
    opts = opts || {};
    apiKey = sanitizeApiKey(apiKey);
    var cfg = PROVIDERS[provider];
    var baseUrl = cfg.baseUrl || String(opts.baseUrl || "").trim();
    if (!baseUrl) throw new Error("custom provider requires a base URL");
    var url = baseUrl.replace(/\/+$/, "") + (cfg.chatPath || "");
    var headers = { "Content-Type": "application/json" };
    var body;
    if (cfg.native === "ollama"){
      body = { model: model, messages: [{ role: "user", content: prompt }], stream: false, think: false };
    } else if (cfg.native === "anthropic"){
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      headers["anthropic-dangerous-direct-browser-access"] = "true";
      // Default bumped from 1024: on thinking-capable models (e.g. GLM via z.ai) the
      // model's internal "thinking" tokens share this same budget with the real answer,
      // and truncated mid-JSON output on longer responses (e.g. ranking 5-8 results with
      // reasons) was confirmed live against a real endpoint. Callers needing more room
      // (or less, for tight budgets) can pass opts.maxTokens.
      body = { model: model, max_tokens: opts.maxTokens || 4096, temperature: 0, system: opts.system || "Follow the user's instructions exactly and respond only in the exact format requested.", messages: [{ role: "user", content: prompt }] };
    } else if (cfg.native === "gemini"){
      url = cfg.baseUrl + "/v1beta/models/" + encodeURIComponent(model) + ":generateContent";
      headers["x-goog-api-key"] = apiKey;
      body = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0, maxOutputTokens: opts.maxTokens || 4096 } };
    } else {
      headers["Authorization"] = "Bearer " + apiKey;
      body = { model: model, messages: [{ role: "user", content: prompt }] };
      if (provider !== "openai") body.temperature = 0;
    }

    var controller = typeof AbortController !== 'undefined' && opts.timeoutMs ? new AbortController() : null;
    var timer = controller ? setTimeout(function(){ controller.abort(); }, opts.timeoutMs) : null;
    var res;
    var data;
    try {
      var request = { method: "POST", headers: headers, body: JSON.stringify(body) };
      if (controller) request.signal = controller.signal;
      res = await fetch(url, request);
      if (!res.ok){
        var errorBody = '';
        try { errorBody = (await res.text()).trim().slice(0, 300); } catch (readError) {}
        throw new Error("provider returned " + res.status + (errorBody ? ": " + errorBody : ""));
      }
      data = await res.json();
    } catch (error){
      if (error && error.name === 'AbortError') throw new Error("request timed out");
      if (error instanceof TypeError && /ISO-8859-1|code point/i.test(error.message || '')){
        throw new Error("Your API key or model name contains an unusual character (often from copy-paste). Try deleting it and re-typing it, or paste into a plain text field first to strip formatting.");
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
    var content;
    if (cfg.native === "ollama") content = data.message && data.message.content;
    else if (cfg.native === "anthropic"){
      // Thinking-capable models (e.g. GLM-5.3 via z.ai's Anthropic-compatible endpoint,
      // and Claude's own extended-thinking models) return content[0] as a "thinking"
      // block with no .text field -- the real answer is the first "text"-typed block.
      var anthropicBlocks = Array.isArray(data.content) ? data.content : [];
      var textBlock = anthropicBlocks.filter(function(b){ return b && b.type === "text"; })[0];
      content = textBlock && textBlock.text;
    } else if (cfg.native === "gemini"){
      // Same failure class as Anthropic above: some Gemini models can return multiple
      // parts with a "thought" part before the real answer -- skip thought parts.
      var geminiParts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
      var geminiTextPart = geminiParts.filter(function(p){ return p && typeof p.text === "string" && !p.thought; })[0];
      content = geminiTextPart && geminiTextPart.text;
    }
    else content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content || typeof content !== "string") throw new Error("empty response from provider");
    return content;
  }

  return { PROVIDERS: PROVIDERS, callLLM: callLLM };
});
