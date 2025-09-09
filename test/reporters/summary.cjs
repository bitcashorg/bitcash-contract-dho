/* Minimal Mocha reporter that prints a concise, copy-friendly summary of all tests */

module.exports = function SummaryReporter(runner) {
  const Mocha = require("mocha")
  const { EVENT_RUN_BEGIN, EVENT_TEST_PASS, EVENT_TEST_FAIL, EVENT_TEST_PENDING, EVENT_RUN_END } = Mocha.Runner.constants

  const results = []
  let stats = { passes: 0, failures: 0, pending: 0, start: 0, end: 0 }

  runner
    .once(EVENT_RUN_BEGIN, () => {
      stats.start = Date.now()
    })
    .on(EVENT_TEST_PASS, (test) => {
      stats.passes++
      results.push({ status: "PASS", title: test.fullTitle(), duration: test.duration })
    })
    .on(EVENT_TEST_FAIL, (test, err) => {
      stats.failures++
      results.push({ status: "FAIL", title: test.fullTitle(), error: (err && (err.message || String(err))) || "Error" })
    })
    .on(EVENT_TEST_PENDING, (test) => {
      stats.pending++
      results.push({ status: "PENDING", title: test.fullTitle() })
    })
    .once(EVENT_RUN_END, () => {
      stats.end = Date.now()
      const ms = stats.end - stats.start

      // Header
      console.log("")
      console.log("Tests Summary")
      console.log(`Total: ${results.length}  Passed: ${stats.passes}  Failed: ${stats.failures}  Pending: ${stats.pending}  Duration: ${ms}ms`)
      console.log("")

      // List each test as a one-liner, copy-friendly
      for (const r of results) {
        if (r.status === "PASS") {
          console.log(`- PASS: ${r.title}`)
        } else if (r.status === "FAIL") {
          console.log(`- FAIL: ${r.title} — ${r.error}`)
        } else {
          console.log(`- PENDING: ${r.title}`)
        }
      }

      console.log("")
      if (stats.failures > 0) {
        console.log("Some tests failed. See FAIL lines above for quick context.")
      } else {
        console.log("All tests passed.")
      }
    })
}
