export const BILLER_GROUPS = ['electricity', 'gas', 'water', 'internet', 'mobile', 'other'];

export const BILLERS = [
  { id: 'kelectric', color: '#1b75bb', name: 'K-Electric', group: 'electricity', domains: ['ke.com.pk'] },
  { id: 'lesco', color: '#0b7a3b', name: 'LESCO', group: 'electricity', domains: ['lesco.gov.pk'] },
  { id: 'iesco', color: '#1565c0', name: 'IESCO', group: 'electricity', domains: ['iesco.com.pk'] },
  { id: 'fesco', color: '#00796b', name: 'FESCO', group: 'electricity', domains: ['fesco.com.pk'] },
  { id: 'gepco', color: '#2e7d32', name: 'GEPCO', group: 'electricity', domains: ['gepco.com.pk'] },
  { id: 'mepco', color: '#ef6c00', name: 'MEPCO', group: 'electricity', domains: ['mepco.com.pk'] },
  { id: 'pesco', color: '#00695c', name: 'PESCO', group: 'electricity', domains: ['pesco.gov.pk'] },
  { id: 'hesco', color: '#6a1b9a', name: 'HESCO', group: 'electricity', domains: ['hesco.gov.pk'] },
  { id: 'sepco', color: '#ad1457', name: 'SEPCO', group: 'electricity', domains: ['sepco.com.pk'] },
  { id: 'qesco', color: '#37474f', name: 'QESCO', group: 'electricity', domains: ['qesco.gov.pk'] },
  { id: 'sngpl', color: '#0277bd', name: 'SNGPL', group: 'gas', domains: ['sngpl.com.pk'] },
  { id: 'ssgc', color: '#e65100', name: 'SSGC', group: 'gas', domains: ['ssgc.com.pk'] },
  { id: 'kwsc', color: '#0288d1', name: 'Karachi Water (KWSC)', group: 'water', domains: ['kwsc.gov.pk'] },
  { id: 'wasa', color: '#0097a7', name: 'WASA Lahore', group: 'water', domains: ['wasa.punjab.gov.pk'] },
  { id: 'ptcl', color: '#2e7d32', name: 'PTCL', group: 'internet', domains: ['ptcl.com.pk'] },
  { id: 'stormfiber', color: '#e53935', name: 'StormFiber', group: 'internet', domains: ['stormfiber.com'] },
  { id: 'nayatel', color: '#1e88e5', name: 'Nayatel', group: 'internet', domains: ['nayatel.com'] },
  { id: 'wateen', color: '#d81b60', name: 'Wateen', group: 'internet', domains: ['wateen.com'] },
  { id: 'cybernet', color: '#5e35b1', name: 'Cybernet', group: 'internet', domains: ['cyber.net.pk'] },
  { id: 'worldcall', color: '#c62828', name: 'Worldcall', group: 'internet', domains: ['worldcall.com.pk'] },
  { id: 'jazz', color: '#d32f2f', name: 'Jazz', group: 'mobile', domains: ['jazz.com.pk'] },
  { id: 'zong', color: '#7cb342', name: 'Zong', group: 'mobile', domains: ['zong.com.pk'] },
  { id: 'telenor', color: '#0091d5', name: 'Telenor', group: 'mobile', domains: ['telenor.com.pk'] },
  { id: 'ufone', color: '#f57c00', name: 'Ufone', group: 'mobile', domains: ['ufone.com'] },
];

const byName = new Map(BILLERS.map((biller) => [biller.name, biller]));
const byId = new Map(BILLERS.map((biller) => [biller.id, biller]));

export const findBiller = (name) => byName.get(name) || null;
export const billerById = (id) => byId.get(id) || null;
