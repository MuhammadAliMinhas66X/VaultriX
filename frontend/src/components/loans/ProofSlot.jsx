import { useRef, useState } from 'react';
import { ImagePlus, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import ProofImage from './ProofImage.jsx';
import FieldError from '../FieldError.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { compressImage, isAcceptedImage } from '../../utils/imageCompress.js';

const iconButton =
  'flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-muted outline-none transition hover:border-ink/30 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-wait disabled:opacity-60';

function ProofSlot({ proof, uploading, onUpload, onRemove, compact = false }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [error, setError] = useState('');

  const choose = async (selected) => {
    if (!selected) return;
    if (!isAcceptedImage(selected)) {
      setError(t('loans.photoError'));
      return;
    }
    setError('');
    try {
      onUpload(await compressImage(selected));
    } catch (failure) {
      setError(t('loans.photoError'));
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          event.target.value = '';
          choose(selected);
        }}
      />
      <div className="flex items-center gap-2">
        {proof && <ProofImage proof={proof} size={compact ? 'h-10 w-10' : 'h-20 w-20'} />}
        {uploading ? (
          <span className="flex h-9 items-center gap-2 px-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('common.uploading')}
          </span>
        ) : proof ? (
          <>
            <button type="button" onClick={() => inputRef.current?.click()} title={t('loans.photoChange')} aria-label={t('loans.photoChange')} className={iconButton}>
              <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button type="button" onClick={onRemove} title={t('loans.photoRemove')} aria-label={t('loans.photoRemove')} className={`${iconButton} hover:border-red-200 hover:bg-red-50 hover:text-red-600`}>
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </>
        ) : compact ? (
          <button type="button" onClick={() => inputRef.current?.click()} title={t('loans.photoAdd')} aria-label={t('loans.photoAdd')} className={iconButton}>
            <ImagePlus className="h-4 w-4" strokeWidth={1.75} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-white px-3.5 py-2.5 text-sm font-medium text-muted outline-none transition hover:border-ink/40 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <ImagePlus className="h-4 w-4" strokeWidth={1.75} />
            {t('loans.photoAdd')}
          </button>
        )}
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

export default ProofSlot;
