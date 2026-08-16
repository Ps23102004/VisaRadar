(function(root, factory){
  if (typeof module === 'object' && module.exports){
    module.exports = factory();
  } else {
    root.VisaRadarChecklistData = factory();
  }
})(typeof self !== 'undefined' ? self : this, function(){

  var SEED_COUNTRIES = ['IN','CN','MX','NG','PH','BR','KR','CA','GB','DE','VN','PK','BD','CO','UA','NP','GH','TW'];

  var F1_DEFAULT_DOCS = [
    { title: 'Form I-20', detail: 'Issued by your SEVP-certified school after admission' },
    { title: 'I-901 SEVIS fee receipt', detail: 'Pay only at fmjfee.com — nowhere else' },
    { title: 'DS-160 confirmation page', detail: 'Online nonimmigrant visa application, at ceac.state.gov' },
    { title: 'Visa application fee receipt', detail: 'Paid through the official channel your embassy specifies' },
    { title: 'Valid passport', detail: 'Valid at least 6 months beyond your intended stay' },
    { title: 'DS-160 photo', detail: 'Meeting the official photo specification' },
    { title: 'Financial evidence', detail: 'Bank statements or affidavit of support showing you can cover the program' },
    { title: 'Evidence of ties to home country', detail: 'You must affirmatively show non-immigrant intent (INA 214(b))' }
  ];

  var J1_DEFAULT_DOCS = [
    { title: 'Form DS-2019', detail: 'Issued by your designated Exchange Visitor Program sponsor' },
    { title: 'I-901 SEVIS fee receipt', detail: 'Pay only at fmjfee.com — nowhere else' },
    { title: 'DS-160 confirmation page', detail: 'Online nonimmigrant visa application, at ceac.state.gov' },
    { title: 'Visa application fee receipt', detail: 'Paid through the official channel your embassy specifies' },
    { title: 'Valid passport', detail: 'Valid at least 6 months beyond your intended stay' },
    { title: 'DS-160 photo', detail: 'Meeting the official photo specification' },
    { title: 'Program sponsor information', detail: 'Details of your specific exchange program' },
    { title: 'Evidence of ties to home country', detail: 'You must affirmatively show non-immigrant intent (INA 214(b))' }
  ];

  var H1B_DEFAULT_DOCS = [
    { title: 'Approved I-129 petition', detail: 'Filed and approved by your sponsoring employer' },
    { title: 'Form I-797 approval notice', detail: 'Notice of Action from USCIS confirming petition approval' },
    { title: 'Employer support letter', detail: 'Confirms your role, salary, and employment start date' },
    { title: 'DS-160 confirmation page', detail: 'Online nonimmigrant visa application, at ceac.state.gov' },
    { title: 'Visa application fee receipt', detail: 'Paid through the official channel your embassy specifies' },
    { title: 'Valid passport', detail: 'Valid at least 6 months beyond your intended stay' },
    { title: 'DS-160 photo', detail: 'Meeting the official photo specification' }
  ];

  function defaultEntry(docs, source){
    return { documents: docs, examples: {}, notes: '', source: source };
  }

  function placeholderCountries(){
    var out = {};
    SEED_COUNTRIES.forEach(function(cc){ out[cc] = { _todo: true }; });
    return out;
  }

  var CHECKLIST_DATA = {
    'F-1': {
      fee: '$350',
      countries: Object.assign(placeholderCountries(), {
        default: defaultEntry(F1_DEFAULT_DOCS, 'https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html')
      })
    },
    'J-1': {
      fee: '$220',
      countries: Object.assign(placeholderCountries(), {
        default: defaultEntry(J1_DEFAULT_DOCS, 'https://j1visa.state.gov/sponsors/current/')
      })
    },
    'H-1B': {
      fee: 'varies by employer',
      countries: Object.assign(placeholderCountries(), {
        default: defaultEntry(H1B_DEFAULT_DOCS, 'https://www.uscis.gov/working-in-the-united-states/h-1b-specialty-occupations')
      })
    }
  };

  function lookupChecklist(visaType, countryCode){
    var visa = CHECKLIST_DATA[visaType];
    if (!visa) throw new Error('Unknown visa type: ' + visaType);
    var country = visa.countries[countryCode];
    if (!country || country._todo) return visa.countries.default;
    return country;
  }

  return { CHECKLIST_DATA: CHECKLIST_DATA, SEED_COUNTRIES: SEED_COUNTRIES, lookupChecklist: lookupChecklist };
});
