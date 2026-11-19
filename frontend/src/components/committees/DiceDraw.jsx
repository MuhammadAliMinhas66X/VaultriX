import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Dices } from 'lucide-react';
import { btn } from '../salary/ui.js';
import { useTranslation } from '../../i18n/useTranslation.js';
import { notify } from '../../i18n/notifications.js';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { setWinner } from '../../services/committeeService.js';

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

// A fair random whole number from 0 to max - 1 (uses the browser's secure random).
const pick = (max) => {
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  do window.crypto.getRandomValues(buffer);
  while (buffer[0] >= limit);
  return buffer[0] % max;
};

// How many dice are needed so every number from 1 to `count` can be shown: one die up to 6, two up to 36, three up to 216.
export const diceNeeded = (count) => (count <= 6 ? 1 : count <= 36 ? 2 : 3);
// The number (1..count) shown by these faces, read as digits in base 6.
export const numberFromFaces = (faces) => faces.reduce((sum, face) => sum * 6 + (face - 1), 0) + 1;
export const facesFromNumber = (number, dice) => {
  let rest = number - 1;
  const faces = [];
  for (let index = 0; index < dice; index += 1) {
    faces.unshift((rest % 6) + 1);
    rest = Math.floor(rest / 6);
  }
  return faces;
};

function Die({ face, rolling, index, calm }) {
  return (
    <motion.div
      aria-hidden="true"
      initial={false}
      animate={rolling && !calm ? { rotate: [0, 360 * (index % 2 ? -3 : 3)], y: [0, -46, 0, -14, 0], x: [0, index % 2 ? 18 : -18, 0] } : { rotate: 0, y: 0, x: 0 }}
      transition={{ duration: rolling ? 1.05 : 0.2, ease: 'easeOut' }}
      className="grid h-16 w-16 grid-cols-3 grid-rows-3 gap-1 rounded-2xl border border-border bg-white p-2.5 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.5)]"
    >
      {Array.from({ length: 9 }, (_, cell) => (
        <span key={cell} className={`rounded-full ${PIPS[face].includes(cell) ? 'bg-ink' : 'bg-transparent'}`} />
      ))}
    </motion.div>
  );
}

// Hold the bucket to shake it, let go to throw the dice. The turn goes to whoever the number points at.
export default function DiceDraw({ committee }) {
  const { t, tServer } = useTranslation();
  const calm = Boolean(useAppReducedMotion());
  const open = committee.rounds.find((round) => !round.winner && !round.paidOutAt);
  const taken = new Set(committee.rounds.filter((round) => round.winner).map((round) => (round.winner.type === 'me' ? 'me' : round.winner.id)));
  const people = useMemo(
    () => [{ id: 'me', name: t('committees.you') }, ...committee.members.map((member) => ({ id: member.id, name: member.name }))].filter((person) => !taken.has(person.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [committee.members, committee.rounds, t]
  );
  const dice = diceNeeded(Math.max(1, people.length));
  const [faces, setFaces] = useState(() => Array(dice).fill(1));
  const [holding, setHolding] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [ticker, setTicker] = useState([]);
  const [busy, setBusy] = useState(false);
  const heldAt = useRef(0);
  const timers = useRef([]);

  const clear = () => {
    timers.current.forEach((id) => window.clearInterval(id));
    timers.current = [];
  };
  useEffect(() => clear, []);
  useEffect(() => {
    setFaces(Array(dice).fill(1));
    setResult(null);
  }, [dice, committee.rounds.length]);

  if (!open || people.length === 0) return null;

  // The number generator on the left: one number per person still waiting, reshuffled while you hold.
  const shuffled = () => {
    const numbers = people.map((_, index) => index + 1);
    for (let index = numbers.length - 1; index > 0; index -= 1) {
      const swap = pick(index + 1);
      [numbers[index], numbers[swap]] = [numbers[swap], numbers[index]];
    }
    return numbers;
  };

  const start = () => {
    if (rolling || busy) return;
    setResult(null);
    setHolding(true);
    heldAt.current = Date.now();
    clear();
    timers.current.push(window.setInterval(() => setTicker(shuffled()), 70));
    timers.current.push(window.setInterval(() => setFaces(Array.from({ length: dice }, () => 1 + pick(6))), 110));
  };

  const release = () => {
    if (!holding) return;
    setHolding(false);
    clear();
    const winnerIndex = pick(people.length);
    const final = facesFromNumber(winnerIndex + 1, dice);
    const settle = () => {
      setFaces(final);
      setTicker(people.map((_, index) => index + 1));
      setRolling(false);
      setResult({ person: people[winnerIndex], number: winnerIndex + 1, round: open.round });
    };
    if (calm) return settle();
    setRolling(true);
    timers.current.push(window.setInterval(() => setFaces(Array.from({ length: dice }, () => 1 + pick(6))), 90));
    window.setTimeout(() => {
      clear();
      settle();
    }, 1100);
  };

  const confirm = async () => {
    if (!result) return;
    setBusy(true);
    try {
      await setWinner(committee.id, result.round, result.person.id === 'me' ? 'me' : result.person.id);
      notify.success(t('committees.diceSaved', { name: result.person.name, round: result.round }));
      setResult(null);
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setBusy(false);
    }
  };

  const onKey = (event, down) => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (down && !event.repeat) start();
    if (!down) release();
  };

  return (
    <div className="grid gap-4 overflow-hidden rounded-2xl border border-border bg-white p-4 sm:grid-cols-[9rem_1fr] sm:p-5">
      <div className="flex flex-col gap-2" aria-hidden="true">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">{t('committees.diceNumbers')}</p>
        <div className="flex max-h-28 flex-wrap gap-1.5 overflow-hidden sm:max-h-56 sm:flex-col sm:flex-nowrap">
          {(ticker.length ? ticker : people.map((_, index) => index + 1)).slice(0, 14).map((number, index) => (
            <span key={`${index}-${number}`} className={`flex h-7 min-w-[1.75rem] items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums ${result && number === result.number ? 'bg-ink text-white' : 'bg-surface text-ink'}`}>{number}</span>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <p className="text-center text-sm text-muted">{t('committees.diceFor', { round: open.round })}</p>
        <div className="relative flex h-44 w-full items-end justify-center gap-5 sm:gap-8">
          <motion.button
            type="button"
            aria-label={t('committees.diceHold')}
            onPointerDown={(event) => { event.currentTarget.setPointerCapture?.(event.pointerId); start(); }}
            onPointerUp={release}
            onPointerCancel={release}
            onKeyDown={(event) => onKey(event, true)}
            onKeyUp={(event) => onKey(event, false)}
            animate={holding && !calm ? { rotate: [-9, 9, -7, 7, 0], x: [-5, 5, -4, 4, 0], y: [0, -3, 0] } : rolling && !calm ? { rotate: -105, x: 30, y: 4 } : { rotate: 0, x: 0, y: 0 }}
            transition={holding ? { duration: 0.28, repeat: Infinity } : { duration: 0.35, ease: 'easeOut' }}
            className="relative z-10 flex h-28 w-24 touch-none select-none items-end justify-center rounded-b-[2rem] rounded-t-lg bg-ink pb-3 text-white outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            style={{ clipPath: 'polygon(8% 0, 92% 0, 100% 100%, 0 100%)', WebkitTouchCallout: 'none' }}
          >
            <Dices className="h-6 w-6" strokeWidth={1.6} />
          </motion.button>
          <div className="flex min-w-[5rem] items-end justify-center gap-2 pb-1 sm:gap-3">
            {faces.map((face, index) => <Die key={index} face={face} index={index} rolling={rolling} calm={calm} />)}
          </div>
        </div>
        <p className="text-center text-xs text-muted">{holding ? t('committees.diceRelease') : t('committees.diceHint', { count: people.length })}</p>

        {result && (
          <motion.div initial={calm ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} role="status" className="flex w-full flex-col items-center gap-3 rounded-xl bg-surface px-4 py-3.5 text-center">
            <p className="text-base font-semibold text-ink">{t('committees.diceResult', { name: result.person.name, round: result.round })}</p>
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={confirm} className={btn.primary}><Check className="h-4 w-4" />{t('committees.diceSave')}</button>
              <button type="button" disabled={busy} onClick={() => setResult(null)} className={btn.secondary}>{t('committees.diceAgain')}</button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
