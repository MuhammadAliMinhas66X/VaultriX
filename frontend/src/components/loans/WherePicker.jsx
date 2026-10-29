import { useMemo } from 'react';
import Combobox from '../Combobox.jsx';
import FormField from '../FormField.jsx';
import BrandMark from '../BrandMark.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { PAKISTANI_BANKS, DIGITAL_WALLETS } from '../../utils/paymentBrands.js';
import { OTHER_BANK, OTHER_WALLET, isOtherKey } from './loanOptions.js';

function WherePicker({ label, optional = false, value, custom, onChange, onCustomChange, error, customError }) {
  const { t } = useTranslation();

  const items = useMemo(
    () => [
      ...(optional ? [{ value: '', label: t('loans.notSet') }] : []),
      { value: 'cash:', label: t('loans.cash'), icon: <BrandMark method="cash" size="sm" />, group: t('loans.groupCash') },
      ...PAKISTANI_BANKS.map((bank) => ({
        value: `bank:${bank.name}`,
        label: bank.name,
        icon: <BrandMark method="bank" name={bank.name} size="sm" />,
        group: t('loans.groupBanks'),
      })),
      { value: OTHER_BANK, label: t('loans.otherBank'), icon: <BrandMark method="bank" size="sm" />, group: t('loans.groupBanks') },
      ...DIGITAL_WALLETS.map((wallet) => ({
        value: `wallet:${wallet.name}`,
        label: wallet.name,
        icon: <BrandMark method="wallet" name={wallet.name} size="sm" />,
        group: t('loans.groupWallets'),
      })),
      { value: OTHER_WALLET, label: t('loans.otherWallet'), icon: <BrandMark method="wallet" size="sm" />, group: t('loans.groupWallets') },
    ],
    [optional, t]
  );

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-1.5">
        {label}
        <Combobox items={items} ariaLabel={typeof label === 'string' ? label : t('loans.accountType')} placeholder={t('loans.pickAccount')} searchPlaceholder={t('common.search')} value={value} onChange={onChange} error={error} />
      </div>
      {isOtherKey(value) && (
        <FormField
          label={t('loans.otherNameLabel')}
          value={custom}
          onChange={(event) => onCustomChange(event.target.value)}
          placeholder={t('loans.otherNamePlaceholder')}
          error={customError}
        />
      )}
    </div>
  );
}

export default WherePicker;
