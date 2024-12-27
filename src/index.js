import chalk from "chalk";
import fs from "node:fs";
import { parseArgs } from "node:util";
import * as espree from "espree";
import * as astring from "astring";

import SyntaxTreeProcessor from "./syntaxTreeProcessor.js";

const getCLIOptions = () => {
  try {
    const {
      values: { file, applyFix },
    } = parseArgs({
      options: {
        file: {
          type: "string",
          alias: "f",
        },
        applyFix: {
          type: "boolean",
          alias: "a",
          default: false,
        },
      },
    });

    if (!file) throw new Error("You need to provide option -f or --file");

    return { file, applyFix };
  } catch (error) {
    console.error(chalk.red("Error", error.message));
  }
};

const { file, applyFix } = getCLIOptions();

const code = fs.readFileSync(file).toString();
let ast = espree.parse(code, {
  ecmaVersion: 2020,
  loc: true,
  sourceType: "module",
});
const syntaxTreeProcessor = new SyntaxTreeProcessor(file);
syntaxTreeProcessor.process(ast);

if (applyFix) {
  const finalOutput = astring.generate(ast);
  fs.writeFileSync(`${file}.linted.js`, finalOutput);
} else {
  console.log(syntaxTreeProcessor.getErrors().join("\n"));
}
