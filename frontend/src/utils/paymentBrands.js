import { BILLERS } from './billers.js';

export const PAKISTANI_BANKS = [
  { id: 'hbl', name: 'Habib Bank Limited (HBL)', domains: ['hbl.com'] },
  { id: 'ubl', name: 'United Bank Limited (UBL)', domains: ['ubl.com.pk', 'ubldigital.com'] },
  { id: 'mcb', name: 'MCB Bank', domains: ['mcb.com.pk'] },
  { id: 'abl', name: 'Allied Bank Limited (ABL)', domains: ['abl.com', 'abl.com.pk'] },
  { id: 'nbp', name: 'National Bank of Pakistan (NBP)', domains: ['nbp.com.pk'] },
  { id: 'alfalah', name: 'Bank Alfalah', domains: ['bankalfalah.com'] },
  { id: 'meezan', name: 'Meezan Bank', domains: ['meezanbank.com'] },
  { id: 'faysal', name: 'Faysal Bank', domains: ['faysalbank.com'] },
  { id: 'askari', name: 'Askari Bank', domains: ['askaribank.com'] },
  { id: 'bahl', name: 'Bank Al Habib', domains: ['bankalhabib.com'] },
  { id: 'soneri', name: 'Soneri Bank', domains: ['soneribank.com'] },
  { id: 'jsbank', name: 'JS Bank', domains: ['jsbl.com'] },
  { id: 'scb', name: 'Standard Chartered Pakistan', domains: ['sc.com'] },
  { id: 'hmb', name: 'Habib Metropolitan Bank', domains: ['habibmetro.com'] },
  { id: 'dib', name: 'Dubai Islamic Bank Pakistan', domains: ['dibpak.com'] },
  { id: 'albaraka', name: 'Al Baraka Bank Pakistan', domains: ['albaraka.com.pk'] },
  { id: 'bop', name: 'The Bank of Punjab', domains: ['bop.com.pk'] },
  { id: 'bok', name: 'The Bank of Khyber', domains: ['bok.com.pk'] },
  { id: 'sindh', name: 'Sindh Bank', domains: ['sindhbank.com.pk'] },
  { id: 'fwbl', name: 'First Women Bank', domains: ['fwbl.com.pk'] },
  { id: 'mybank', name: 'MyBank', domains: [] },
];

export const DIGITAL_WALLETS = [
  { id: 'jazzcash', name: 'JazzCash', domains: ['jazzcash.com.pk'] },
  { id: 'easypaisa', name: 'Easypaisa', domains: ['easypaisa.com.pk'] },
  { id: 'nayapay', name: 'NayaPay', domains: ['nayapay.com'] },
  { id: 'sadapay', name: 'SadaPay', domains: ['sadapay.pk'] },
  { id: 'upaisa', name: 'UPaisa', domains: ['upaisa.com'] },
  { id: 'zindigi', name: 'Zindigi', domains: ['zindigi.com.pk', 'zindigi.pk'] },
];

const brandByName = new Map([...PAKISTANI_BANKS, ...DIGITAL_WALLETS, ...BILLERS].map((item) => [item.name, item]));

export const findBrand = (name) => brandByName.get(name) || null;
