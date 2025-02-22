import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';

export const connection = new Connection(process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta'), 'confirmed');

export function validateSolanaAddress(token: string) {
  try {
    new PublicKey(token);
  } catch (error) {
    throw new Error(`${token} is not a valid token address. If it's a ticker or symbol, please try to search for the corresponding token address first or ask user for it.`);
  }
}
