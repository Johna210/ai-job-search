import { runLiveSmoke } from "../../../../lib/direct-careers/tests/live-smoke.ts"

await runLiveSmoke("lever", new URL("../src/cli.ts", import.meta.url).pathname)
