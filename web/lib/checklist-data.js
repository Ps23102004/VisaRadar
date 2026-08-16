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
        IN: {
          documents: F1_DEFAULT_DOCS,
          examples: {
            'DS-160 confirmation page': 'DS-160 confirmation page for an F-1 applicant attending an in-person interview',
            'Visa application fee receipt': 'Official government-process payment used when booking through usvisascheduling.com'
          },
          notes: 'F-1 applicants always require an in-person interview because interview-waiver programs are B1/B2-only; book through usvisascheduling.com and avoid visa consultants or agents beyond the standard government process.',
          source: 'https://in.usembassy.gov/apply-for-a-nonimmigrant-visa/'
        },
        CN: {
          documents: F1_DEFAULT_DOCS.concat([
            { title: 'Household registration (hukou) information', detail: 'Applicants under 14 must appear in person and provide household registration information' }
          ]),
          examples: {
            'Household registration (hukou) information': 'Household registration (hukou) information for an applicant under 14',
            'Valid passport': 'Bring your passport for an in-person appearance, including if the applicant is under 14'
          },
          notes: 'Reduced post-wide processing capacity means longer wait times than at other posts; applicants under 14 must appear in person with hukou information, and EVUS does not apply to F-1 visas.',
          source: 'https://china.usembassy-china.org.cn/visas/nonimmigrant-visas/'
        },
        MX: {
          documents: F1_DEFAULT_DOCS.concat([
            { title: 'Social media identifiers', detail: 'Public social media handles or usernames used during the last 5 years, as disclosed on the DS-160' }
          ]),
          examples: {
            'Social media identifiers': 'Public social media handles or usernames used in the last 5 years',
            'DS-160 confirmation page': 'Printed DS-160 confirmation barcode matching the submitted application'
          },
          notes: 'Disclose public social media handles from the last 5 years on the DS-160; its confirmation barcode must match the printed application exactly, and F-1 is not eligible for interview waiver.',
          source: 'https://mx.usembassy.gov/visas/'
        },
        NG: {
          documents: F1_DEFAULT_DOCS,
          examples: {
            'Visa application fee receipt': 'First Bank MRV-fee deposit slip, valid for 3 days',
            'I-901 SEVIS fee receipt': 'SEVIS fee receipt confirming the required I-901 payment'
          },
          notes: 'Pay the MRV application fee with a First Bank deposit slip valid for 3 days or a USD-denominated card; the SEVIS fee remains required.',
          source: 'https://ng.usembassy.gov/visas/important-visa-information/'
        },
        PH: {
          documents: F1_DEFAULT_DOCS.concat([
            { title: 'Visa Application Center appointment confirmation', detail: 'Attend the Visa Application Center appointment at Parqal, Parañaque at least 1 day before the embassy interview' }
          ]),
          examples: {
            'Visa Application Center appointment confirmation': 'Appointment at the Visa Application Center in Parqal, Parañaque at least 1 day before the embassy interview',
            'Valid passport': 'Passport returned through 2Go courier after processing'
          },
          notes: 'Complete the Visa Application Center appointment in Parqal, Parañaque at least 1 day before the embassy interview; passport return is through 2Go courier for Php 750.',
          source: 'https://ph.usembassy.gov/important-visa-information/'
        },
        BR: {
          documents: F1_DEFAULT_DOCS,
          examples: {
            'DS-160 confirmation page': 'DS-160 confirmation page for the standard F-1 application',
            'Valid passport': 'Bring your passport to the Applicant Service Center without electronics'
          },
          notes: 'No additional consulate-specific F-1 requirements found beyond the standard documents; the Applicant Service Center does not permit electronics inside.',
          source: 'https://br.usembassy.gov/visas/important-visa-information/'
        },
        KR: {
          documents: F1_DEFAULT_DOCS,
          examples: {
            'Valid passport': 'Korean-national passport valid under the six-month-club exemption rules',
            'Visa application fee receipt': 'MRV fee and the applicable visa reciprocity fee paid by EFT or Citibank'
          },
          notes: 'Korean nationals are subject to the six-month-club passport-validity exemption rules; pay the visa reciprocity fee in addition to the MRV fee via EFT or Citibank.',
          source: 'https://kr.usembassy.gov/visas/important-visa-information/'
        },
        CA: {
          documents: [
            { title: 'Form I-20', detail: 'Issued by your SEVP-certified school after admission' },
            { title: 'I-901 SEVIS fee receipt', detail: 'Receipt showing the required SEVIS fee payment' },
            { title: 'Valid passport', detail: 'Present your passport, I-20, and SEVIS fee receipt directly at the port of entry' }
          ],
          examples: {
            'Form I-20': 'Original I-20 presented directly at the U.S. port of entry',
            'I-901 SEVIS fee receipt': 'SEVIS fee receipt presented directly at the U.S. port of entry',
            'Valid passport': 'Canadian passport presented with the I-20 and SEVIS fee receipt'
          },
          notes: 'Canadian citizens do not need an F-1 visa stamp: present the I-20, SEVIS fee receipt, and passport directly at the port of entry.',
          source: 'https://ca.usembassy.gov/canadians-requiring-visas/'
        },
        GB: {
          documents: F1_DEFAULT_DOCS.concat([
            { title: 'Academic transcripts', detail: 'Academic transcripts or diplomas commonly requested for student visa applications' },
            { title: 'Standardized test scores', detail: 'Test scores such as TOEFL, IELTS, or SAT when requested by your program' },
            { title: 'Funding documentation', detail: 'Funding or financial documentation in addition to the standard financial evidence' },
            { title: 'Physical 5x5cm photo', detail: 'Physical 5x5cm photo print; AI-generated photos are not accepted' }
          ]),
          examples: {
            'Academic transcripts': 'Academic transcript or diploma',
            'Standardized test scores': 'TOEFL/IELTS score report or SAT scores as requested by your program',
            'Physical 5x5cm photo': 'Physical 5x5cm photo print, not an AI-generated photo'
          },
          notes: 'Bring academic records, test scores, and funding documentation as requested; photos must be physical 5x5cm prints and non-UK-passport residents may need an eVisa/share-code.',
          source: 'https://uk.usembassy.gov/niv-applying-for-the-visa/'
        },
        DE: {
          documents: F1_DEFAULT_DOCS,
          examples: {
            'DS-160 confirmation page': 'DS-160 confirmation page for the standard F-1 application',
            'Valid passport': 'Bring your passport to a visa-services post in Berlin, Frankfurt, or Munich'
          },
          notes: 'No additional consulate-specific F-1 requirements found beyond the standard documents; visa services are offered only in Berlin, Frankfurt, and Munich.',
          source: 'https://de.usembassy.gov/visas/'
        },
        VN: {
          documents: F1_DEFAULT_DOCS.concat([
            { title: 'Place-of-birth endorsement', detail: 'Applicants using an older blue-cover passport need a place-of-birth endorsement page' }
          ]),
          examples: {
            'Place-of-birth endorsement': 'Place-of-birth endorsement page for an older blue-cover passport',
            'DS-160 confirmation page': 'Printed DS-160 confirmation page whose barcode exactly matches the application'
          },
          notes: 'Older blue-cover passport holders need a place-of-birth endorsement page; the DS-160 barcode must match exactly, and typical issuance is 1–3 days after interview.',
          source: 'https://vn.usembassy.gov/nonimmigrant-visas/'
        },
        PK: {
          documents: F1_DEFAULT_DOCS,
          examples: {
            'Form I-20': 'I-20 explicitly presented as required for an F-1 application',
            'Valid passport': 'Passport for the required in-person interview, regardless of age'
          },
          notes: 'F and J applicants are prioritized for appointments at both posts; all ages require an in-person interview, applicants should apply at least 6 months ahead, and the I-20 is explicitly required.',
          source: 'https://pk.usembassy.gov/nonimmigrant-visas/'
        },
        BD: {
          documents: F1_DEFAULT_DOCS,
          examples: {
            'DS-160 confirmation page': 'DS-160 submitted at least 7 days before the interview date',
            'Valid passport': 'Passport for the standard F-1 application; the B1/B2 bond requirement does not apply'
          },
          notes: 'Submit the DS-160 at least 7 days before the interview date; the bond requirement is B1/B2-only and does not apply to F-1.',
          source: 'https://bd.usembassy.gov/nonimmigrant-visas/'
        },
        CO: {
          documents: F1_DEFAULT_DOCS,
          examples: {
            'Visa application fee receipt': 'MRV-fee cash deposit slip valid for 3 days',
            'DS-160 confirmation page': 'DS-160 confirmation page used to schedule at ais.usvisa-info.com/en-co'
          },
          notes: 'Pay the MRV fee with a cash deposit slip valid for 3 days and schedule through ais.usvisa-info.com/en-co; otherwise the baseline applies.',
          source: 'https://co.usembassy.gov/visas/important-visa-information/'
        },
        UA: {
          documents: F1_DEFAULT_DOCS,
          examples: {
            'I-901 SEVIS fee receipt': 'SEVIS fee receipt for payment completed at least 3 business days before the interview',
            'Valid passport': 'Passport used to apply at another U.S. post worldwide because Kyiv is closed for F-1 processing'
          },
          notes: 'Kyiv is currently closed for F-1 processing, so apply at another U.S. post worldwide; complete the SEVIS fee payment at least 3 business days before the interview.',
          source: 'https://ua.usembassy.gov/nonimmigrant-visas/'
        },
        NP: {
          documents: F1_DEFAULT_DOCS,
          examples: {
            'Visa application fee receipt': 'MRV fee receipt usable during its 365-day validity period',
            'Valid passport': 'Passport for the standard F-1 application; the B1/B2 bond requirement does not apply'
          },
          notes: 'Plan far ahead; the MRV fee is valid for 365 days, and the bond requirement is B1/B2-only rather than an F-1 requirement.',
          source: 'https://np.usembassy.gov/visas/'
        },
        GH: {
          documents: F1_DEFAULT_DOCS,
          examples: {
            'Form I-20': 'I-20 supporting a request for an expedited student appointment when admitted to a university with under 15% international enrollment',
            'Valid passport': 'Passport brought for the required interview at Accra'
          },
          notes: 'All applicants require an interview at Accra with no waiver program; expedited student appointments are available for admissions to universities with under 15% international enrollment.',
          source: 'https://gh.usembassy.gov/visas/nonimmigrant-visas/'
        },
        TW: {
          documents: F1_DEFAULT_DOCS.concat([
            { title: 'Social media identifiers', detail: 'Public social media handles used during the last 5 years, as disclosed on the DS-160' }
          ]),
          examples: {
            'DS-160 confirmation page': 'DS-160 submitted at least 2 business days before the interview with printed confirmation pages',
            'Social media identifiers': 'Public social media handles used in the last 5 years'
          },
          notes: 'Submit the DS-160 at least 2 business days early and bring printed confirmation pages; disclose public social media handles used in the last 5 years.',
          source: 'https://ait.org.tw/visas/'
        },
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
