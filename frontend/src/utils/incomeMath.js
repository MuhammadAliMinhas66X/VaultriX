import { amountForTotal } from './salaryCuts.js';

export const toBase = (amount, code, rates) => {
  const rate = rates?.[code];
  return rate ? amount / rate : null;
};

export const summarize = (streams, rates) => {
  let gross = 0;
  let net = 0;
  let excluded = 0;
  const places = new Map();

  streams.forEach((stream) => {
    if (stream.expectedAmount === null) return;
    const grossBase = toBase(stream.expectedAmount, stream.currency, rates);
    const netBase = toBase(amountForTotal(stream), stream.currency, rates);
    if (grossBase === null || netBase === null) {
      excluded += 1;
      return;
    }
    gross += grossBase;
    net += netBase;
    const key = stream.destinationMethod === 'cash' ? 'cash' : `${stream.destinationMethod}:${stream.destinationName}`;
    const place = places.get(key) || { key, method: stream.destinationMethod, name: stream.destinationName, value: 0 };
    place.value += netBase;
    places.set(key, place);
  });

  return {
    gross,
    net,
    cuts: Math.max(0, gross - net),
    excluded,
    places: [...places.values()].sort((x, y) => y.value - x.value),
  };
};

export const byReceivedDesc = (streams) =>
  [...streams].sort((x, y) => new Date(y.receivedAt || y.createdAt).getTime() - new Date(x.receivedAt || x.createdAt).getTime());
