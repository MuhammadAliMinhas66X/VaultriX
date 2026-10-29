import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import FieldError from '../FieldError.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { compressImage, isAcceptedImage } from '../../utils/imageCompress.js';

function ProofPicker({ label, file, onChange }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const choose = async (selected) => {
    if (!selected) return;
    if (!isAcceptedImage(selected)) {
      setError(t('loans.photoError'));
      return;
    }
    setError('');
    setWorking(true);
    try {
      onChange(await compressImage(selected));
    } catch (failure) {
      setError(t('loans.photoError'));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {label}
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
      {file && preview ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-2.5">
          <img src={preview} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
          <span className="min-w-0 flex-1 truncate text-sm text-muted">{file.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={t('loans.photoRemove')}
            title={t('loans.photoRemove')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted outline-none transition hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={working}
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-white px-4 py-3.5 text-sm font-medium text-muted outline-none transition hover:border-ink/40 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-wait disabled:opacity-70"
        >
          <ImagePlus className="h-4 w-4" strokeWidth={1.75} />
          {working ? t('common.uploading') : t('loans.photoAdd')}
        </button>
      )}
      <FieldError>{error}</FieldError>
    </div>
  );
}

export default ProofPicker;
