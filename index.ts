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
    // setInterval(
    //   () => fetchPoolInfo(pool_keys_array, token_obj, connection),
    //   2000
    // );
    //
    await fetchPoolInfo(pool_keys_array, token_obj, connection);
  } catch (error) {
    console.error("Error during computations:", error);
  }
}

// get fetchPoolInfo
async function fetchPoolInfo(
  pool_keys_array: any,
  token_obj: any,
  connection: any
) {
  try {
    // every public key into computer to back PriceInfo
    let new_pool_keys_array = pool_keys_array.map(
      (pool_keys: any, idx: any) => {
        // pool_keys MintInfo
        const { baseMint, quoteMint } = pool_keys;
        // Json about TokenObj
        const tokenJson = token_obj?.[idx] || {};
        //
        const tokenInfo = {
          baseMint, //
          quoteMint, //
          base: tokenJson?.base, // baseName
          quote: tokenJson?.quote, // quoteName
        };
        return {
          pool_keys,
          tokenInfo,
          tokenJson,
        };
      }
    );

    // start Time
    let beginCompute = new Date().getTime();
    const results = await compute(
      connection,
      pool_keys_array,
      new_pool_keys_array
    );

    let value = [];

    results.forEach(({ result, tokenInfo, tokenJson, timestamp }, idx) => {
      // output data - End
      value.push(priceDataTransfer(result, tokenJson, timestamp));
      return;
      //
      // - log -
      console.log(
        chalk.cyanBright(
          `\n [${idx + 1}]【${tokenJson?.base}/${tokenJson?.quote}】: ${
            tokenJson?.tokenAmount
          }|${tokenJson?.base}`
        )
      );
      result.forEach((i: any, idx: any) => {
        logTokenInfo(i, tokenInfo, tokenJson, idx > 0);
      });
      // - - - -
      console.log(chalk.cyanBright(`\n -------------------------------------`));
    });

    // end Time
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
    // End
    await fetchPoolInfo(pool_keys_array, token_obj, connection);
  } catch (err) {
    main()
  }
}

// logger function
function logTokenInfo(
  computation: any,
  tokenInfo: any,
  tokenJson: any,
  isBuy: any
) {
  const { base, quote } = tokenInfo;
  const [
    amountOut,
    executionAmountOut,
    currentPrice,
    executionPrice,
    priceImpact,
    fee,
    amountNum,
  ] = computation || [];

  const logColor = isBuy ? chalk.greenBright : chalk.redBright;

  console.log(logColor(`\n【${isBuy ? "Asks" : "Bids"}】`));

  let mathPrice = amountOut.toFixed() / tokenJson?.tokenAmount;

  console.log(chalk.blueBright(`\t计算价格: ${mathPrice.toFixed(9)}|${quote}`));

  console.log(
    `\t当前价格: ${
      isBuy ? currentPrice.invert().toFixed() : currentPrice.toFixed()
    }|${quote}`
  );

  console.log(
    chalk.yellowBright(
      `\t执行价格: ${
        isBuy ? executionPrice.invert().toFixed() : executionPrice.toFixed()
      }|${quote}`
    )
  );
  console.log(
    `\n\t${
      isBuy ? "买入所需" : "卖出所得"
    }: ${amountOut.toFixed()}|${quote}\n\t${
      isBuy ? "最多所需" : "最少所得"
    }: ${executionAmountOut.toFixed()}|${quote}`
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
function priceDataTransfer(result: any, tokenJson: any, timestamp: any) {
  let [bidsInfo, asksInfo] = result || [[], []];
  // [
  //   amountOut,
  //   minAmountOut,
  //   currentPrice,
  //   executionPrice,
  //   priceImpact,
  //   fee,
  //   amountIn,
  // ];

  let bidsPrice = bidsInfo?.[0]?.toFixed() / tokenJson?.tokenAmount;
  let asksPrice = asksInfo?.[0]?.toFixed() / tokenJson?.tokenAmount;

  let resultTokenInfo = {
    pairAddress: tokenJson?.pairKeys,
    pairFee: bidsInfo?.[5]?.toFixed(),
    asks: [[asksPrice?.toFixed(9), tokenJson?.tokenAmount, timestamp]],
    bids: [[bidsPrice?.toFixed(9), tokenJson?.tokenAmount, timestamp]],
    pair: [tokenJson?.base, tokenJson?.quote, "token_in_key", "token_out_key"],
    baseCurrency: tokenJson?.base,
    quoteCurrency: tokenJson?.quote,
    timestamp: timestamp,
    sequence: timestamp,
    connector: "raydium",
    symbol: `${tokenJson?.base}/${tokenJson?.quote}`,
  };

  return resultTokenInfo;
}

function pushData() {}

main();
