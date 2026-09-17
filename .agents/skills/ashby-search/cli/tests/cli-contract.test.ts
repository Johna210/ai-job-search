import { registerCliContractTests } from "../../../../lib/direct-careers/tests/cli-contract.test.ts"

registerCliContractTests("ashby", new URL("../src/cli.ts", import.meta.url).pathname)
