import fs from "fs";
import {
  Connection,
  Keypair,
  PublicKey,
  PublicKeyInitData,
} from "@solana/web3.js";
import { fetchPoolKeys } from "./src/modules/pool_keys";
import { compute } from "./src/modules/compute";
import chalk from "chalk";

//main
async function main() {
  let config_txt = fs.readFileSync("config.json", "utf8");
  let token_obj = JSON.parse(config_txt);
  // need fetch token_key list
  const publicKeyArr = token_obj.map(
    (i: { pairKeys: PublicKeyInitData }) => new PublicKey(i?.pairKeys)
  );
  //
  // const slip = 1; // 滑点 %
  // const tokenAmount = 100;
  //
  const connection = new Connection("https://api.mainnet-beta.solana.com/");
  const pool_keys_array = await fetchPoolKeys(
    connection,
    publicKeyArr
    // new PublicKey("EP2ib6dYdEeqD8MfE2ezHCxX3kP3K2eLKkirfPm5eyMx")
  );

  // every key into Compute
  const computations = pool_keys_array.map(async (pool_keys, idx) => {
    let token_in_key: PublicKey;
    let token_out_key: PublicKey;
    let token_in_label: any;
    let token_out_label: any;
    if (false) {
      token_in_key = pool_keys.quoteMint;
      token_out_key = pool_keys.baseMint;
      token_in_label = token_obj?.[idx]?.quote;
      token_out_label = token_obj?.[idx]?.base;
    } else {
      token_in_key = pool_keys.baseMint;
      token_out_key = pool_keys.quoteMint;
      token_in_label = token_obj?.[idx]?.base;
      token_out_label = token_obj?.[idx]?.quote;
    }

    try {
      const result = await compute(
        connection,
        pool_keys,
        token_in_key,
        token_out_key,
        token_obj?.[idx]?.tokenAmount,
        token_obj?.[idx]?.slip
      );

      return {
        result,
        tokenInfo: {
          token_in_key,
          token_out_key,
          token_in_label,
          token_out_label,
        },
      }; // Return the result of the compute function
    } catch (error) {
      console.error(`Error computing for pool ${idx + 1}:`, error);
      throw error; // Rethrow the error to propagate it up
    }
  });

  // log
  const logTokenInfo = (computation: any, tokenInfo: any, transType) => {
    let isBuy = transType == "Buy" ? true : false;
    const { token_in_label, token_out_label, token_in_key, token_out_key } =
      tokenInfo;

    const amountOut = computation?.[0];
    const minAmountOut = computation?.[1];
    const currentPrice = computation?.[2];
    const executionPrice = computation?.[3];
    const priceImpact = computation?.[4];
    const fee = computation?.[5];
    const amountIn = computation?.[6];

    // log
    console.log(
      isBuy
        ? chalk.greenBright(
            `\n\t 【${transType}】—【${token_in_label}/${token_out_label}】:${amountIn?.toFixed()}`
          )
        : chalk.redBright(
            `\n\t 【${transType}】—【${token_in_label}/${token_out_label}】:${amountIn?.toFixed()}`
          )
    );
    // currentPrice
    console.log(
      `\n\t当前价格: ${currentPrice.toFixed()}|${
        isBuy ? token_in_label : token_out_label
      }`
    );
    // executionPrice
    console.log(
      chalk.yellowBright(
        `\t执行价格: ${executionPrice.toFixed()}|${
          isBuy ? token_in_label : token_out_label
        }`
      )
    );
    // amountOut - minAmountOut
    console.log(
      `\t${
        isBuy ? "买入所需" : "卖出所得"
      }: ${amountOut.toFixed()}|${token_out_label}\n\t${
        isBuy ? "最多所需" : "最少所得"
      }: ${minAmountOut.toFixed()}|${token_out_label}`
    );

    // fee
    fee && console.log(`\t手续费: ${fee?.toFixed()}%`);

    // priceImpact
    if (priceImpact.toFixed() > 5) {
      console.log(chalk.red(`\t价格影响: ${priceImpact.toFixed()}`));
    } else if (priceImpact.toFixed() < 5 && priceImpact.toFixed() > 1) {
      console.log(chalk.yellowBright(`\t价格影响: ${priceImpact.toFixed()}`));
    } else {
      console.log(chalk.green(`\t价格影响: ${priceImpact.toFixed()}`));
    }
  };

  try {
    // 等待所有计算完成
    const results = await Promise.all(computations);

    // result to do
    results.forEach(({ result, tokenInfo }, idx) => {
      logTokenInfo(result?.[0], tokenInfo, "Sell");
      logTokenInfo(result?.[1], tokenInfo, "Buy");
    });
  } catch (error) {
    console.error("Error during computations:", error);
  }
}

//program start
main();
