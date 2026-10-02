import { execSync } from 'node:child_process';

/**
 * Versione del sito, letta al build dal messaggio dell'ultimo commit (stesso sistema di terminal-astro):
 * un commit "1.4.1 footer" → "1.4.1" (quanti livelli si vuole: 1.4, 1.4.1, 1.4.1.2…). Per aggiornarla basta iniziare il messaggio di commit col numero.
 * Su Vercel il messaggio arriva anche come variabile d'ambiente, se git non fosse disponibile.
 */
function lastCommitMessage(): string {
  try {
    return execSync('git log -1 --format=%s', { encoding: 'utf8' }).trim();
  } catch {
    return process.env.VERCEL_GIT_COMMIT_MESSAGE ?? '';
  }
}

export const siteVersion = lastCommitMessage().match(/^\d+(?:\.\d+)+/)?.[0] ?? '?.?';
