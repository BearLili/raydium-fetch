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

      const amount = new TokenAmount(
        new Token(curr_in, in_decimal),
        amount_in,
        false
      );
      // const amount = new CurrencyAmount(
      //   new Token(curr_in, in_decimal),
      //   amount_in,
      //   false
      // );

      const currency = new Token(curr_out, out_decimal);
      const slippage = new Percent(slip, 100);
      return { amount, currency, slippage };
    };
    //

    const computeAmountOut_data = computeDataMaker(poolInfo, curr_in, curr_out);
    const computeAmountOut = Liquidity.computeAmountOut({
      poolKeys,
      poolInfo,
      amountIn: computeAmountOut_data?.amount,
      currencyOut: computeAmountOut_data?.currency,
      slippage: computeAmountOut_data?.slippage,
    });

    const computeAmountIn_data = computeDataMaker(poolInfo, curr_in, curr_out);
    const computeAmountIn = Liquidity.computeAmountIn({
      poolKeys,
      poolInfo,
      amountOut: computeAmountIn_data?.amount,
      currencyIn: computeAmountIn_data?.currency,
      slippage: computeAmountIn_data?.slippage,
    });

    // const computeAmountIn_buy_data = computeDataMaker(
    //   poolInfo,
    //   curr_out,
    //   curr_in
    // );
    // const computeAmountOut_buy = Liquidity.computeAmountOut({
    //   poolKeys,
    //   poolInfo,
    //   amountIn: computeAmountIn_buy_data?.amount,
    //   currencyOut: computeAmountIn_buy_data?.currency,
    //   slippage: computeAmountIn_buy_data?.slippage,
    // });

    return [
      Object.values({
        ...computeAmountOut,
        amount: computeAmountOut_data?.amount,
      }),
      // Object.values({
      //   ...computeAmountOut_buy,
      //   amount: computeAmountOut_data?.amount,
      // }),
      Object.values({
        ...computeAmountIn,
        fee: null,
        amount: computeAmountIn_data?.amount,
      }),
    ];
  } catch (e) {
    return 1;
  }
}
