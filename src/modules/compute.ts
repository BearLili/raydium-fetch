import { Connection, PublicKey } from "@solana/web3.js";
import {
  Liquidity,
  Percent,
  Token,
  TokenAmount,
  CurrencyAmount,
  LiquidityPoolInfo,
} from "@raydium-io/raydium-sdk";

//computes live estimates of the swap and returns details for transaction building or display on UI.
//returns a list containing trade details (fees,price impact,expected amount out etc..)

export async function compute(
  connection: Connection,
  poolKeys: any,
  curr_in: PublicKey,
  curr_out: PublicKey,
  amount_in: number,
  slip: number
) {
  try {
    const poolInfo = await Liquidity.fetchInfo({ connection, poolKeys });
    //
    const computeDataMaker = (poolInfo: any, curr_in: any, curr_out: any) => {
      //setting up decimals
      let in_decimal: number;
      let out_decimal: number;
      // console.log(curr_in.toBase58() + "|" + curr_out.toBase58());
      if (curr_in.toBase58() === poolKeys.baseMint.toBase58()) {
        in_decimal = poolInfo.baseDecimals;
        out_decimal = poolInfo.quoteDecimals;
      } else {
        out_decimal = poolInfo.baseDecimals;
        in_decimal = poolInfo.quoteDecimals;
      }

      // base
      const amount = new TokenAmount(
        new Token(curr_in, in_decimal),
        amount_in,
        false
      );

      // quote
      const currency = new Token(curr_out, out_decimal);

      // slippage
      const slippage = new Percent(slip, 100);
      return { amount, currency, slippage };
    };
    //
    const { amount, currency, slippage } = computeDataMaker(
      poolInfo,
      curr_in,
      curr_out
    );
    //
    return [
      Object.values({
        ...Liquidity.computeAmountOut({
          poolKeys,
          poolInfo,
          amountIn: amount,
          currencyOut: currency,
          slippage: slippage,
        }),
        amount,
      }),
      Object.values({
        ...Liquidity.computeAmountIn({
          poolKeys,
          poolInfo,
          amountOut: amount,
          currencyIn: currency,
          slippage: slippage,
        }),
        fee: null,
        amount,
      }),
    ];
  } catch (e) {
    return 1;
  }
}
