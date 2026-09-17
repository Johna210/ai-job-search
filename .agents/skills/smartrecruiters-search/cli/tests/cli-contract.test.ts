import { registerCliContractTests } from "../../../../lib/direct-careers/tests/cli-contract.test.ts"

registerCliContractTests("smartrecruiters", new URL("../src/cli.ts", import.meta.url).pathname)
