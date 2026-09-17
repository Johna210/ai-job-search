import { registerCliContractTests } from "../../../../lib/direct-careers/tests/cli-contract.test.ts"

registerCliContractTests("lever", new URL("../src/cli.ts", import.meta.url).pathname)
