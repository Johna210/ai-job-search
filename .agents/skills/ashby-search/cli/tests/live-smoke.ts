import { runLiveSmoke } from "../../../../lib/direct-careers/tests/live-smoke.ts"

await runLiveSmoke("ashby", new URL("../src/cli.ts", import.meta.url).pathname)
