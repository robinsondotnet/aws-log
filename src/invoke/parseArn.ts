import { IDictionary } from "common-types";
import { ensureFunctionName } from "./ensureFunctionName";
import { getStage } from "../logger/state";

export interface IParsedArn {
  region: string;
  account: string;
  stage: string;
  appName: string;
  fn: string;
}

export function parseArn(arn: string): IParsedArn {
  const isFullyQualified = arn.slice(0, 3) === "arn" ? true : false;

  return isFullyQualified
    ? parseFullyQualifiedString(arn)
    : parsePartiallyQualifiedString(arn);
}

function parseFullyQualifiedString(arn: string): IParsedArn {
  const [_, region, account, remain] = arn.match(
    /arn:aws:lambda:([\w-].*):([0-9].*):function:(.*)/
  );
  const parts = remain.split("-");
  const fn = parts[parts.length - 1];
  const stage = parts[parts.length - 2];
  const appName = parts.slice(0, parts.length - 2).join("-");

  return {
    region,
    account,
    fn: ensureFunctionName(fn),
    stage,
    appName
  };
}

/**
 * assumes the input parameter is just the function name
 * and the rest of the ARN can be deduced by environment
 * variables.
 */
function parsePartiallyQualifiedString(fn: string): IParsedArn {
  let output: IParsedArn = {
    ...getEnvironmentVars(),
    ...{ fn: ensureFunctionName(fn.split(":").pop()) }
  };

  ["region", "account", "stage", "appName"].forEach((section: keyof IParsedArn) => {
    if (!output[section]) {
      output[section] = seek(section, fn);
      if (!output[section]) {
        parsingError(section);
      }
    }
  });

  return output;
}

/**
 * Looks for aspects of the ARN in environment variables
 */
export function getEnvironmentVars() {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  const account = process.env.AWS_ACCOUNT || process.env.AWS_ACCOUNT_ID;
  const stage =
    process.env.AWS_STAGE ||
    process.env.ENVIRONMENT ||
    process.env.STAGE ||
    process.env.NODE_ENV ||
    getStage();
  const appName = process.env.SERVICE_NAME || process.env.APP_NAME;

  return { region, account, stage, appName };
}

const patterns: IDictionary<RegExp> = {
  account: /^[0-9]+$/,
  region: /\s+-\s+-[0-9]/,
  stage: /(prod|stage|test|dev)/,
  appName: /[\s]+[-\s]*/
};

function seek(pattern: keyof typeof patterns, partialArn: string) {
  const parts = partialArn.split(":");

  parts.forEach(part => {
    const regEx = patterns[pattern];
    if (regEx.test(part)) {
      return part;
    }
  });

  return "";
}

function parsingError(section: keyof typeof patterns) {
  const e = new Error(
    `Problem finding "${section}" in the partial ARN which was passed in! To aid in ARN parsing, you should have the following ENV variables set: AWS_STAGE, AWS_ACCOUNT, and SERVICE_NAME`
  );
  e.name = "ArnParsingError";
  throw e;
}
