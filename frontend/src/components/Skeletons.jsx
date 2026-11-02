import { useTranslation } from '../i18n/useTranslation.js';

export function Bone({ className = '' }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-lg bg-border/70 motion-reduce:animate-none ${className}`} />;
}

function Busy({ children, className = '' }) {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{t('common.loading')}</span>
      {children}
    </div>
  );
}

function RowBone() {
  return (
    <div className="flex items-center gap-3.5 border-b border-border px-5 py-3.5 last:border-b-0">
      <Bone className="h-10 w-10 shrink-0 rounded-xl" />
      <span className="flex-1 space-y-2">
        <Bone className="h-3.5 w-2/5" />
        <Bone className="h-3 w-3/5" />
      </span>
      <span className="space-y-2">
        <Bone className="ms-auto h-3.5 w-16" />
        <Bone className="ms-auto h-3 w-12" />
      </span>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <Busy className="flex flex-col gap-5">
      <div className="mx-auto w-full max-w-xl md:max-w-none">
        <div className="md:grid md:grid-cols-[1.4fr_1fr] md:gap-4 lg:grid-cols-[1.7fr_1fr] lg:gap-5">
          <span className="block h-[220px] animate-pulse rounded-[28px] bg-border/70 motion-reduce:animate-none md:h-[280px] lg:h-[330px]" />
          <div className="mt-3 hidden flex-col gap-4 md:mt-0 md:flex">
            <span className="block flex-1 animate-pulse rounded-2xl bg-border/50 motion-reduce:animate-none" />
            <span className="block flex-1 animate-pulse rounded-2xl bg-border/50 motion-reduce:animate-none" />
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <Bone className="h-3 w-28" />
          <Bone className="h-3.5 w-16" />
        </div>
        <RowBone />
        <RowBone />
        <RowBone />
      </div>
    </Busy>
  );
}

function CardBone({ tall = false }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="flex items-start gap-3.5">
        <Bone className="h-11 w-11 shrink-0 rounded-full" />
        <span className="flex-1 space-y-2.5">
          <Bone className="h-4 w-1/2" />
          <Bone className="h-3 w-1/3" />
        </span>
        <span className="space-y-2.5">
          <Bone className="ms-auto h-4 w-20" />
          <Bone className="ms-auto h-3 w-12" />
        </span>
      </div>
      {tall && <Bone className="mt-4 h-1.5 w-full rounded-full" />}
      {tall && (
        <div className="mt-3.5 flex gap-2">
          <Bone className="h-6 w-20 rounded-full" />
          <Bone className="h-6 w-28 rounded-full" />
        </div>
      )}
    </div>
  );
}

export function IncomeSkeleton() {
  return (
    <Busy className="grid items-start gap-5 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-3">
        <CardBone />
        <CardBone />
        <CardBone />
      </div>
      <div className="hidden space-y-4 rounded-2xl border border-border bg-white p-6 xl:block">
        <Bone className="h-6 w-1/3" />
        <Bone className="h-20 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          <Bone className="h-10" />
          <Bone className="h-10" />
          <Bone className="h-10" />
        </div>
        <Bone className="h-28 w-full rounded-xl" />
      </div>
    </Busy>
  );
}

export function LoansSkeleton() {
  return (
    <Busy>
      <div className="mb-4 rounded-2xl border border-border bg-white p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-3">
          <Bone className="h-10" />
          <Bone className="h-10" />
          <Bone className="h-10" />
        </div>
        <Bone className="mt-5 h-36 w-full rounded-xl" />
      </div>
      <div className="mb-4 flex gap-2">
        <Bone className="h-9 w-20 rounded-full" />
        <Bone className="h-9 w-24 rounded-full" />
        <Bone className="h-9 w-20 rounded-full" />
        <Bone className="h-9 w-24 rounded-full" />
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <CardBone tall />
          <CardBone tall />
          <CardBone tall />
        </div>
        <div className="hidden space-y-4 rounded-2xl border border-border bg-white p-6 xl:block">
          <Bone className="h-6 w-1/3" />
          <Bone className="h-20 w-full rounded-xl" />
          <Bone className="h-48 w-full rounded-xl" />
        </div>
      </div>
    </Busy>
  );
}

export function ExpensesSkeleton() {
  return (
    <Busy className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <Bone className="h-10 w-10 rounded-full" />
          <Bone className="h-4 w-32" />
          <Bone className="h-10 w-10 rounded-full" />
        </div>
        <Bone className="mt-5 h-3 w-28" />
        <Bone className="mt-3 h-10 w-48" />
        <Bone className="mt-6 h-24 w-full rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Bone className="h-[88px] rounded-2xl" />
        <Bone className="h-[88px] rounded-2xl" />
        <Bone className="h-[88px] rounded-2xl" />
        <Bone className="h-[88px] rounded-2xl" />
      </div>
      <div className="rounded-2xl border border-border bg-white">
        <RowBone />
        <RowBone />
        <RowBone />
        <RowBone />
      </div>
    </Busy>
  );
}
