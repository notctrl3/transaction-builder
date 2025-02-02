import { z } from 'zod';
import { PublicKey } from '@solana/web3.js';
import { getMint } from "@solana/spl-token";
import { TransactionHandler } from "../TransactionHandler";
import { connection, validateSolanaAddress } from '../../utils/solana';

const PayloadSchema = z.object({
  inputToken: z.string().nonempty("Missing required field: inputToken"),
  outputToken: z.string().nonempty("Missing required field: outputToken"),
  amount: z.number().positive("Amount must be a positive number"),
});

type Payload = z.infer<typeof PayloadSchema>;

export class SwapHandler implements TransactionHandler {
  async create(payload: Payload): Promise<{ chain: string, data: Payload }> {
    const validation = PayloadSchema.safeParse(payload);

    if (!validation.success) {
      throw new Error(validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
    }

    validateSolanaAddress(payload.inputToken);
    validateSolanaAddress(payload.outputToken);

    return {
      chain: "solana",
      data: {
        inputToken: payload.inputToken,
        outputToken: payload.outputToken,
        amount: payload.amount,
      },
    };
  }

  async build(data: Payload, publicKey: string): Promise<{ base64: string, type?: string }> {
    const inputMint = await getMint(connection, new PublicKey(data.inputToken));
    const amount = data.amount * (10 ** inputMint.decimals);

    // Get quote
    const quoteResponse = await (
      await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${data.inputToken}\
&outputMint=${data.outputToken}\
&amount=${amount}\
&slippageBps=300`)
    ).json();

    // Get swap transaction
    const { swapTransaction } = await (
      await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey: publicKey,
          wrapAndUnwrapSol: true,
          dynamicSlippage: { "maxBps": 300 },
        })
      })
    ).json();

    return {
      type: "versioned",
      base64: swapTransaction,
    };
  }
}
