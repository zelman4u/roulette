/**
 * Cryptographically Secure Randomization Utility
 * Guarantees genuinely unpredictable and unmanipulated winner selection.
 */

export interface RandomSelectionResult {
  selectedIndex: number;
  seed: string;
  timestamp: number;
  entropyHex: string;
}

export function pickSecureRandomWinner(participantCount: number): RandomSelectionResult {
  if (participantCount <= 0) {
    throw new Error('Participant count must be greater than 0');
  }

  // Use Web Cryptography API for CSPRNG (Cryptographically Secure Pseudo-Random Number Generator)
  const array = new Uint32Array(4);
  window.crypto.getRandomValues(array);

  // Use rejection sampling to avoid modulo bias
  const maxValidRange = Math.floor(0xffffffff / participantCount) * participantCount;
  let rawRandom = array[0];

  while (rawRandom >= maxValidRange) {
    const freshBuf = new Uint32Array(1);
    window.crypto.getRandomValues(freshBuf);
    rawRandom = freshBuf[0];
  }

  const selectedIndex = rawRandom % participantCount;
  const entropyHex = Array.from(array)
    .map((num) => num.toString(16).padStart(8, '0'))
    .join('');

  const timestamp = Date.now();
  const seed = `RND-${timestamp.toString(36).toUpperCase()}-${entropyHex.slice(0, 8).toUpperCase()}`;

  return {
    selectedIndex,
    seed,
    timestamp,
    entropyHex,
  };
}
