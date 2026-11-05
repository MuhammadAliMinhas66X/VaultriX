export const BILLER_GROUPS = ['electricity', 'gas', 'water', 'internet', 'mobile', 'other'];

export const BILLERS = [
  { id: 'kelectric', name: 'K-Electric', group: 'electricity', domains: ['ke.com.pk'] },
  { id: 'lesco', name: 'LESCO', group: 'electricity', domains: ['lesco.gov.pk'] },
  { id: 'iesco', name: 'IESCO', group: 'electricity', domains: ['iesco.com.pk'] },
  { id: 'fesco', name: 'FESCO', group: 'electricity', domains: ['fesco.com.pk'] },
  { id: 'gepco', name: 'GEPCO', group: 'electricity', domains: ['gepco.com.pk'] },
  { id: 'mepco', name: 'MEPCO', group: 'electricity', domains: ['mepco.com.pk'] },
  { id: 'pesco', name: 'PESCO', group: 'electricity', domains: ['pesco.gov.pk'] },
  { id: 'hesco', name: 'HESCO', group: 'electricity', domains: ['hesco.gov.pk'] },
  { id: 'sepco', name: 'SEPCO', group: 'electricity', domains: ['sepco.com.pk'] },
  { id: 'qesco', name: 'QESCO', group: 'electricity', domains: ['qesco.gov.pk'] },
  { id: 'sngpl', name: 'SNGPL', group: 'gas', domains: ['sngpl.com.pk'] },
  { id: 'ssgc', name: 'SSGC', group: 'gas', domains: ['ssgc.com.pk'] },
  { id: 'kwsc', name: 'Karachi Water (KWSC)', group: 'water', domains: ['kwsc.gov.pk'] },
  { id: 'wasa', name: 'WASA Lahore', group: 'water', domains: ['wasa.punjab.gov.pk'] },
  { id: 'ptcl', name: 'PTCL', group: 'internet', domains: ['ptcl.com.pk'] },
  { id: 'stormfiber', name: 'StormFiber', group: 'internet', domains: ['stormfiber.com'] },
  { id: 'nayatel', name: 'Nayatel', group: 'internet', domains: ['nayatel.com'] },
  { id: 'wateen', name: 'Wateen', group: 'internet', domains: ['wateen.com'] },
  { id: 'cybernet', name: 'Cybernet', group: 'internet', domains: ['cyber.net.pk'] },
  { id: 'worldcall', name: 'Worldcall', group: 'internet', domains: ['worldcall.com.pk'] },
  { id: 'jazz', name: 'Jazz', group: 'mobile', domains: ['jazz.com.pk'] },
  { id: 'zong', name: 'Zong', group: 'mobile', domains: ['zong.com.pk'] },
  { id: 'telenor', name: 'Telenor', group: 'mobile', domains: ['telenor.com.pk'] },
  { id: 'ufone', name: 'Ufone', group: 'mobile', domains: ['ufone.com'] },
];

const byName = new Map(BILLERS.map((biller) => [biller.name, biller]));
const byId = new Map(BILLERS.map((biller) => [biller.id, biller]));

export const findBiller = (name) => byName.get(name) || null;
export const billerById = (id) => byId.get(id) || null;
