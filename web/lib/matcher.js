(function(root, factory){
  if (typeof module === 'object' && module.exports){
    module.exports = factory();
  } else {
    root.VisaRadarMatcher = factory();
  }
})(typeof self !== 'undefined' ? self : this, function(){

  function filterEmployers(employers, opts){
    opts = opts || {};
    var query = (opts.query || '').trim().toLowerCase();
    var state = (opts.state || '').trim().toUpperCase();
    return employers.filter(function(e){
      if (query){
        var haystack = ((e.n || '') + ' ' + (e.k || '')).toLowerCase();
        if (haystack.indexOf(query) === -1) return false;
      }
      if (state){
        if (!Array.isArray(e.s) || e.s.indexOf(state) === -1) return false;
      }
      return true;
    });
  }

  function employerToFilingRecord(employer, opts){
    opts = opts || {};
    var title = opts.title || (Array.isArray(employer.t) ? employer.t[0] : '');
    var location = opts.state || (Array.isArray(employer.s) ? employer.s[0] : '');
    return {
      company: employer.n,
      title: title,
      location: location,
      label: employer.l,
      match_confidence: employer.c / 100,
      evidence: [
        'total filings: ' + employer.f,
        'certified percentage: ' + employer.c + '%',
        'typical wage: $' + Number(employer.w).toLocaleString()
      ]
    };
  }

  return { filterEmployers: filterEmployers, employerToFilingRecord: employerToFilingRecord };
});
