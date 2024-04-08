import fs from "fs";
import { Connection, PublicKey, PublicKeyInitData } from "@solana/web3.js";
import { fetchPoolKeys } from "./src/modules/pool_keys";
import { compute } from "./src/modules/compute";
import chalk from "chalk";

async function main() {
  try {
    let startTime = new Date().getTime();
    // console.log(chalk.bgMagentaBright("startTime", startTime));
    // Json data
    let config_txt = fs.readFileSync("config.json", "utf8");
    const token_obj = JSON.parse(config_txt);

    // base config
    const connection = new Connection("https://api.mainnet-beta.solana.com/");
    const publicKeyArr = token_obj.map(
      (i: { pairKeys: PublicKeyInitData }) => new PublicKey(i?.pairKeys)
    );

    // get the public keys
    const pool_keys_array = await fetchPoolKeys(connection, publicKeyArr);

    // do fetching
    await fetchToken(pool_keys_array, token_obj, connection);
  } catch (error) {
    console.error("Error during computations:", error);
  }
}

async function fetchToken(pool_keys_array, token_obj, connection) {
  // every public key into computer to back PriceInfo
  const computations = pool_keys_array.map(async (pool_keys, idx) => {
    const { baseMint, quoteMint } = pool_keys;
    const { base, quote } = token_obj?.[idx];

    const [token_in_key, token_out_key, token_in_label, token_out_label] =
      // is Buy?
      false
        ? [quoteMint, baseMint, quote, base]
        : [baseMint, quoteMint, base, quote];

    try {
      const result = await compute(
        connection,
        pool_keys,
        token_in_key,
        token_out_key,
        token_obj?.[idx]?.tokenAmount,
        token_obj?.[idx]?.slip
      );

      const afterComputeData = {
        result,
        tokenInfo: {
          token_in_key,
          token_out_key,
          token_in_label,
          token_out_label,
        },
        tokenJson: token_obj?.[idx] || {},
        timestamp: new Date().getTime(),
      };
      //
      // priceDataTransfer(afterComputeData);
      //
      return afterComputeData;
    } catch (error) {
      console.error(`Error computing for pool ${idx + 1}:`, error);
      throw error;
    }
  });

  // beginCompute time
  let beginCompute = new Date().getTime();
  // waiting for all computations finished
  const results = await Promise.all(computations);

  // console.log
  let value = [];
  results.forEach(({ result, tokenInfo, tokenJson, timestamp }, idx) => {
    value.push(priceDataTransfer(result, tokenInfo, tokenJson, timestamp));
    logTokenInfo(result?.[0], tokenInfo, "Sell");
    logTokenInfo(result?.[1], tokenInfo, "Buy");
  });

  let endTime = new Date().getTime();

  const hash_info = (await connection.getLatestBlockhashAndContext()).value;
  let lastValidBlockHeight = hash_info.lastValidBlockHeight;

  // pushData
  const pushData = {
    blockNumber: lastValidBlockHeight,
    ts: endTime,
    chainName: "sol",
    value,
  };
  //

  console.log(
    `\n`,
    chalk.bgMagentaBright("cost", endTime - beginCompute, "ms")
  );

  //
  console.log(`\n`);
  console.dir(pushData, { depth: null, colors: true });
  // console.log(`\n`, chalk.blueBright(JSON.stringify(pushData)));
}

// logger function
function logTokenInfo(computation: any, tokenInfo: any, transType: string) {
  const { token_in_label, token_out_label } = tokenInfo;
  const [
    amountOut,
    minAmountOut,
    currentPrice,
    executionPrice,
    priceImpact,
    fee,
    amountIn,
  ] = computation || [];

  const isBuy = transType === "Buy";
  const logColor = isBuy ? chalk.greenBright : chalk.redBright;

  console.log(
    logColor(
      `\n 【${transType}】—【${token_in_label}/${token_out_label}】:${amountIn?.toFixed()}`
    )
  );
  console.log(
    `\n\t当前价格: ${currentPrice.toFixed()}|${
      isBuy ? token_in_label : token_out_label
    }`
  );
  console.log(
    chalk.yellowBright(
      `\t执行价格: ${executionPrice.toFixed()}|${
        isBuy ? token_in_label : token_out_label
      }`
    )
  );
  console.log(
    `\t${
      isBuy ? "买入所需" : "卖出所得"
    }: ${amountOut.toFixed()}|${token_out_label}\n\t${
      isBuy ? "最多所需" : "最少所得"
    }: ${minAmountOut.toFixed()}|${token_out_label}`
  );

  if (fee) console.log(`\t手续费: ${fee?.toFixed()}%`);

  if (priceImpact.toFixed() > 5) {
    console.log(chalk.red(`\t价格影响: ${priceImpact.toFixed()}`));
  } else if (priceImpact.toFixed() < 5 && priceImpact.toFixed() > 1) {
    console.log(chalk.yellowBright(`\t价格影响: ${priceImpact.toFixed()}`));
  } else {
    console.log(chalk.green(`\t价格影响: ${priceImpact.toFixed()}`));
  }
}

// bot need's data
function priceDataTransfer(result, tokenInfo, tokenJson, timestamp) {
  const { token_in_key, token_out_key, token_in_label, token_out_label } =
    tokenInfo;
  let asksInfo = result?.[0] || {};
  let bidsInfo = result?.[1] || {};
  // [
  //   amountOut,
  //   minAmountOut,
  //   currentPrice,
  //   executionPrice,
  //   priceImpact,
  //   fee,
  //   amountIn,
  // ];
  let resultTokenInfo = {
    pairAddress: tokenJson?.pairKeys,
    pairFee: asksInfo?.[5]?.toFixed(),
    asks: [[asksInfo?.[3]?.toFixed(), asksInfo?.[6]?.toFixed(), timestamp]],
    bids: [[bidsInfo?.[3]?.toFixed(), bidsInfo?.[6]?.toFixed(), timestamp]],
    pair: [
      tokenJson?.base || token_in_label,
      tokenJson?.quote || token_out_label,
      "token_in_key",
      "token_out_key",
    ],
    baseCurrency: tokenJson?.base || token_in_label,
    quoteCurrency: tokenJson?.quote || token_out_label,
    timestamp: timestamp,
    sequence: timestamp,
    connector: "raydium",
    symbol: `${token_in_label}/${token_out_label}`,
  };

  return resultTokenInfo;
}

function pushData() {}

main();
// setInterval(main, 5000);
