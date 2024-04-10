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
  poolKeysList: any,
  new_pool_keys_array: any
  // curr_in: PublicKey,
  // curr_out: PublicKey,
  // amount_in: number,
  // slip: number
) {
  try {
    // computeDataMaker
    const computeDataMaker = (
      poolInfo: any,
      curr_in: any,
      curr_out: any,
      slip: any,
      amount_in: any,
      poolKeys: any
    ) => {
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

    // start fetchMultipleInfo
    const poolInfoList = await Liquidity.fetchMultipleInfo({
      connection,
      pools: poolKeysList,
    });
    //

    // each for computing
    const computeResultList =
      poolInfoList?.length &&
      poolInfoList.map((poolInfo, idx) => {
        let curr_in = new_pool_keys_array?.[idx]?.tokenInfo?.baseMint; // baseMint
        let curr_out = new_pool_keys_array?.[idx]?.tokenInfo?.quoteMint; // quoteMint
        let slip = new_pool_keys_array?.[idx]?.tokenJson?.slip; // slip
        let amount_in = new_pool_keys_array?.[idx]?.tokenJson?.tokenAmount; // slip

        //
        const { amount, currency, slippage } = computeDataMaker(
          poolInfo,
          curr_in,
          curr_out,
          slip,
          amount_in,
          poolKeysList?.[idx]
        );
        //
        return {
          result: [
            // bids
            Object.values({
              ...Liquidity.computeAmountOut({
                poolKeys: poolKeysList?.[idx],
                poolInfo,
                amountIn: amount,
                currencyOut: currency,
                slippage: slippage,
              }),
              amount,
            }),

            // asks
            Object.values({
              ...Liquidity.computeAmountIn({
                poolKeys: poolKeysList?.[idx],
                poolInfo,
                amountOut: amount,
                currencyIn: currency,
                slippage: slippage,
              }),
              fee: null,
              amount,
            }),
          ],
          tokenInfo: new_pool_keys_array?.[idx]?.tokenInfo,
          tokenJson: new_pool_keys_array?.[idx]?.tokenJson,
          timestamp: new Date().getTime(),
        };
      });
    //

    return computeResultList;
  } catch (e) {
    console.error("compute error", e);
    return [];
  }
}
