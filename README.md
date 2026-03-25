# NiceAssignment - Playwright Core Banking Framework

This repository contains a Playwright automation framework that validates a core banking workflow against:

- Public website for testing: `https://parabank.parasoft.com/parabank`
- Swagger: `https://parabank.parasoft.com/parabank/api-docs/index.html`

## What’s included

### Core banking end-to-end test

`tests/core-banking-flow.spec.ts` automates the scenario:

- Register new user (UI)
- Login (UI) (may already be logged in after registration)
- Get customer ID (API)
- Get existing account (API)
- Create new `CHECKING` account (using `curl`)
- Verify new account appears in UI
- Transfer money between accounts (UI)
- Validate updated balances (API)
- Logout (UI)

Assertions validate:

- API status codes (expecting `200` for successful calls)
- Response structure (XML blocks contain required tags)
- UI consistency (new account row appears; transfer success message is visible)
- Data correctness (balances validated by comparing computed values)

### Negative tests

`tests/core-banking-negative.spec.ts` includes 3 negative scenarios:

- Missing mandatory registration field shows a UI validation error
- Accounts API rejects an invalid `customerId`
- Creating a `CHECKING` account with an invalid `fromAccountId` fails (API)

## Setup and execution

### Prerequisites

- Node.js + npm
- curl on Windows/Linux: the framework calls the local `curl` executable via Node child process for the required “create account” step
- Playwright-supported browser binaries (Chromium is used by default)

### Install dependencies

From the repo root:

```bash
npm install
```

### Install browsers

```bash
npx playwright install
```

### Run tests

```bash
npm test
```

Notes:

- Tests run with Chromium only (see `playwright.config.ts`).
- For CI-like behavior (headless + retries), set the `CI` environment variable.

## Framework architecture (design decisions)

### High-level structure

The project is organized for fast review and clear separation of responsibilities:

- `tests/`: end-to-end workflows and assertions
- `pages/`: Page Object classes for UI interactions
- `api/`: API helper functions that call ParaBank endpoints via Playwright `request`
- `fixtures/`: Playwright test fixtures that instantiate page objects
- `utils/`: reusable parsing/helpers (XML tag extraction, money parsing, escaping)
- `const/`: shared constants (base URL, test data, UI timeouts)

### Why Page Objects

UI interactions are wrapped in page classes (`RegisterPage`, `LoginPage`, `AccountsOverviewPage`, `TransferFundsPage`) to:

- keep locator logic out of tests
- reduce selector duplication
- make UI changes localized to page objects

### Why API helpers

API operations are implemented as dedicated functions in `api/` (for example `getCustomerIdByLogin`, `getExistingAccountByCustomerId`, `getAccountById`, and `createCheckingAccountViaCurl`) to:

- centralize HTTP status validation
- centralize XML response parsing
- keep tests focused on scenario orchestration and expected outcomes

### Why fixtures

`fixtures/fixtures.ts` uses Playwright’s `test.extend` to construct page objects once per test, so steps can call page methods consistently without boilerplate.

## Tradeoffs

1. **XML parsing via regex instead of a full XML parser**
   - Implementation detail: XML values are extracted using helper logic that searches expected tags.
   - Tradeoff: fast and lightweight, but can break if the response formatting changes unexpectedly.

2. **API calls are not coupled to UI cookies**
   - Implementation detail: API GET endpoints are called directly using Playwright `request`.
   - Tradeoff: simpler and more deterministic for this assignment, but would need revisiting if the API started requiring session affinity/cookies.

3. **`curl` via `child_process.execFile`**
   - Implementation detail: creating the `CHECKING` account uses `curl.exe` on Windows and `curl` on non-Windows platforms.
   - Tradeoff: requires `curl` to be available in the runtime environment; however it matches the required “using curl command” constraint.

4. **Chromium-only browser coverage**
   - Implementation detail: Playwright config has a single `chromium` project.
   - Tradeoff: reduced time and flakiness during the assignment; broader browser coverage can be added later.

## Assumptions

The current implementation assumes:

- ParaBank API endpoints used in this workflow return XML containing the expected blocks/tags.
- These GET endpoints work without needing to reuse a UI session cookie.
- After registration, the application may already start a session (so explicit login may not always be required).
- ParaBank’s account creation returns a `CHECKING` account when using the “CHECKING” account type (the implementation tries several representations for `newAccountType` to handle ParaBank quirks).

## How to scale it

### Configuration management

- Move values to environment variables (for example: base URL, test timeouts, and runner behavior).
- Use a `.env` file locally and CI secrets for production-like runs.
- Keep `playwright.config.ts` thin and delegate environment-specific concerns to config helpers.

### Reliability and stability

- Replace brittle UI assertions with role/label-based locators where possible (already used in page objects).
- Add targeted network waits where appropriate (for example `waitForResponse` around key API-driven actions).
- Implement standard retries for known flaky UI steps (especially navigation and form submission).

### Test coverage

- Add more negative tests that cover:
  - invalid transfer amounts
  - transfers to invalid accounts
  - insufficient funds scenarios
  - validation messages for all mandatory fields
- Add additional API validations:
  - response schema validation
  - stricter numeric correctness (rounding rules)

### Scaling execution in CI

- Shard tests by feature (core flow vs negative suite) or by browser project.
- Increase workers for local runs; keep CI conservative to reduce load and flake.
- Use Playwright traces/screenshot/video artifacts to debug failures quickly.

## Infrastructure considerations (CI, reporting, Docker)

### Reporting & debugging

The `playwright.config.ts` enables:

- HTML report: generated to the default Playwright HTML report directory (no auto-open)
- JUnit report: output to `test-results/junit.xml`
- Tracing on first retry: `trace: 'on-first-retry'`
- Screenshots and videos on failure:
  - `screenshot: 'only-on-failure'`
  - `video: 'retain-on-failure'`

### CI implementation approach

In CI:

- Set `CI=true` to enable headless mode and retries.
- Cache `node_modules` and Playwright browser downloads when possible.
- Upload `playwright-report/` and `test-results/` as build artifacts.

### Dockerization approach

To containerize the framework:

- Use a Playwright base image (or equivalent) that includes Node.js and required browser dependencies.
- Ensure `curl` is installed in the image/runtime, since account creation uses `curl` executables on the runner (Windows: `curl.exe`, non-Windows: `curl`).
- Mount the project directory, run `npm install`, then run `npm test` inside the container.

