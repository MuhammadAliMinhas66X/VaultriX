export const BILLER_GROUPS = ['electricity', 'gas', 'water', 'internet', 'mobile', 'insurance', 'government', 'other'];

// Companies people in Pakistan pay bills to. `domains` is used to fetch the
// real logo (see BrandMark); `color` is the tile shown while a logo is missing.
export const BILLERS = [
  { id: 'kelectric', name: 'K-Electric', group: 'electricity', color: '#1b75bb', domains: ['ke.com.pk'] },
  { id: 'lesco', name: 'LESCO', group: 'electricity', color: '#0b7a3b', domains: ['lesco.gov.pk'] },
  { id: 'iesco', name: 'IESCO', group: 'electricity', color: '#1565c0', domains: ['iesco.com.pk'] },
  { id: 'fesco', name: 'FESCO', group: 'electricity', color: '#00796b', domains: ['fesco.com.pk'] },
  { id: 'gepco', name: 'GEPCO', group: 'electricity', color: '#2e7d32', domains: ['gepco.com.pk'] },
  { id: 'mepco', name: 'MEPCO', group: 'electricity', color: '#ef6c00', domains: ['mepco.com.pk'] },
  { id: 'pesco', name: 'PESCO', group: 'electricity', color: '#00695c', domains: ['pesco.gov.pk'] },
  { id: 'hesco', name: 'HESCO', group: 'electricity', color: '#6a1b9a', domains: ['hesco.gov.pk'] },
  { id: 'sepco', name: 'SEPCO', group: 'electricity', color: '#ad1457', domains: ['sepco.com.pk'] },
  { id: 'qesco', name: 'QESCO', group: 'electricity', color: '#37474f', domains: ['qesco.gov.pk'] },
  { id: 'tesco', name: 'TESCO', group: 'electricity', color: '#455a64', domains: ['tesco.gov.pk'] },
  { id: 'wapda', name: 'WAPDA', group: 'electricity', color: '#0d47a1', domains: ['wapda.gov.pk'] },
  { id: 'sngpl', name: 'SNGPL', group: 'gas', color: '#0277bd', domains: ['sngpl.com.pk'] },
  { id: 'ssgc', name: 'SSGC', group: 'gas', color: '#e65100', domains: ['ssgc.com.pk'] },
  { id: 'kwsc', name: 'Karachi Water (KWSC)', group: 'water', color: '#0288d1', domains: ['kwsc.gov.pk'] },
  { id: 'wasa', name: 'WASA Lahore', group: 'water', color: '#0097a7', domains: ['wasa.punjab.gov.pk'] },
  { id: 'wasafsd', name: 'WASA Faisalabad', group: 'water', color: '#00838f', domains: ['wasafaisalabad.gop.pk'] },
  { id: 'cda', name: 'CDA Islamabad', group: 'water', color: '#2e7d32', domains: ['cda.gov.pk'] },
  { id: 'ptcl', name: 'PTCL', group: 'internet', color: '#2e7d32', domains: ['ptcl.com.pk'] },
  { id: 'stormfiber', name: 'StormFiber', group: 'internet', color: '#e53935', domains: ['stormfiber.com'] },
  { id: 'nayatel', name: 'Nayatel', group: 'internet', color: '#1e88e5', domains: ['nayatel.com'] },
  { id: 'wateen', name: 'Wateen', group: 'internet', color: '#d81b60', domains: ['wateen.com'] },
  { id: 'cybernet', name: 'Cybernet', group: 'internet', color: '#5e35b1', domains: ['cyber.net.pk'] },
  { id: 'worldcall', name: 'Worldcall', group: 'internet', color: '#c62828', domains: ['worldcall.com.pk'] },
  { id: 'qubee', name: 'Qubee', group: 'internet', color: '#f9a825', domains: ['qubee.com.pk'] },
  { id: 'multinet', name: 'Multinet', group: 'internet', color: '#0277bd', domains: ['multinet.com.pk'] },
  { id: 'supernet', name: 'Supernet', group: 'internet', color: '#00897b', domains: ['supernet.com.pk'] },
  { id: 'sky', name: 'Sky Broadband', group: 'internet', color: '#1976d2', domains: ['skybroadband.com.pk'] },
  { id: 'transworld', name: 'Transworld', group: 'internet', color: '#283593', domains: ['twaworld.com'] },
  { id: 'jazz', name: 'Jazz', group: 'mobile', color: '#d32f2f', domains: ['jazz.com.pk'] },
  { id: 'zong', name: 'Zong', group: 'mobile', color: '#7cb342', domains: ['zong.com.pk'] },
  { id: 'telenor', name: 'Telenor', group: 'mobile', color: '#0091d5', domains: ['telenor.com.pk'] },
  { id: 'ufone', name: 'Ufone', group: 'mobile', color: '#f57c00', domains: ['ufone.com'] },
  { id: 'sco', name: 'SCO', group: 'mobile', color: '#1b5e20', domains: ['sco.gov.pk'] },
  { id: 'onic', name: 'Onic', group: 'mobile', color: '#00acc1', domains: ['onic.com.pk'] },
  { id: 'efulife', name: 'EFU Life', group: 'insurance', color: '#1565c0', domains: ['efulife.com'] },
  { id: 'jubilee', name: 'Jubilee Life', group: 'insurance', color: '#c62828', domains: ['jubileelife.com'] },
  { id: 'adamjee', name: 'Adamjee Insurance', group: 'insurance', color: '#00695c', domains: ['adamjeeinsurance.com'] },
  { id: 'statelife', name: 'State Life', group: 'insurance', color: '#2e7d32', domains: ['slic.com.pk'] },
  { id: 'tpl', name: 'TPL Insurance', group: 'insurance', color: '#ef6c00', domains: ['tplinsurance.com'] },
  { id: 'fbr', name: 'FBR', group: 'government', color: '#1b5e20', domains: ['fbr.gov.pk'] },
  { id: 'excise', name: 'Excise and Taxation Punjab', group: 'government', color: '#33691e', domains: ['excise.punjab.gov.pk'] },
  { id: 'nadra', name: 'NADRA', group: 'government', color: '#2e7d32', domains: ['nadra.gov.pk'] },
  { id: 'pra', name: 'Punjab Revenue Authority', group: 'government', color: '#455a64', domains: ['pra.punjab.gov.pk'] },
];

const byName = new Map(BILLERS.map((biller) => [biller.name, biller]));
const byId = new Map(BILLERS.map((biller) => [biller.id, biller]));

export const findBiller = (name) => byName.get(name) || null;
export const billerById = (id) => byId.get(id) || null;
