# Hacker News Sorting Test Suite

Comprehensive, production-ready Playwright test suite that validates Hacker News article sorting with edge cases, performance metrics, cross-browser testing, and CI/CD integration.

## Features

### Core Testing
- **Standard Validation**: Verifies first 100 articles are sorted newest to oldest
- **Edge Case Testing**: Partial sorting, timestamp format consistency
- **Negative Testing**: Network failures, invalid URLs, error handling
- **Data Validation**: Structural validation of article data

### Performance Metrics
- Total execution time
- Page load time
- Article collection time
- Validation time
- Articles per second
- Retry count tracking
- Pages loaded counter

### Cross-Browser Support
- Chromium (default)
- Firefox
- WebKit/Safari
- Run all browsers in parallel

### Reporting & Monitoring
- **JSON Reports**: Machine-readable test results
- **HTML Reports**: Beautiful visual reports
- **Performance Metrics**: Detailed timing data
- **Monitoring Integration**: Hooks for Datadog, New Relic, etc.

### Logging System
Configurable log levels:
- `debug`: Verbose diagnostic information
- `info`: Standard operational information
- `warn`: Warning messages
- `error`: Error messages only

### CI/CD Ready
- GitHub Actions workflow included
- Exit codes for automation (0 = pass, 1 = fail)
- Artifact uploads (screenshots, reports)
- Multiple browser testing
- Scheduled runs
- PR comments with results

## Installation

```bash
npm install
npx playwright install
```

## Usage

### Basic Commands

```bash
# Standard test (default: chromium, 100 articles)
node index.js

# Verbose output
node index.js --verbose

# Debug mode with visible browser
node index.js --debug --headed

# Generate test report
node index.js --report
```

### Browser Selection

```bash
# Test with Firefox
node index.js --firefox

# Test with WebKit
node index.js --webkit

# Test all browsers
node index.js --all-browsers
```

### Test Types

```bash
# Standard sorting test only
node index.js

# Edge case tests
node index.js --edge-cases

# Negative tests (error handling)
node index.js --negative

# All tests
node index.js --all-tests
```

### Logging Levels

```bash
# Debug level (most verbose)
node index.js --log-level=debug

# Info level (default)
node index.js --log-level=info

# Warnings only
node index.js --log-level=warn

# Errors only
node index.js --log-level=error
```

### Combined Flags

```bash
# Full test suite with reports across all browsers
node index.js --all-browsers --all-tests --report --verbose

# Debug specific browser
node index.js --firefox --headed --debug --log-level=debug

# CI/CD mode
node index.js --report --log-level=info
```

## Test Scenarios

### Standard Tests
1. **100 Article Sorting**: Validates first 100 articles are sorted newest to oldest
   - Collects across multiple pages
   - Validates timestamps
   - Falls back to item IDs when needed

### Edge Case Tests
1. **Partial Sorting**: Tests first 30 articles only
2. **Timestamp Format Consistency**: Validates all timestamps are properly formatted
3. **Data Structure Validation**: Checks article structure integrity

### Negative Tests
1. **Network Failure Handling**: Simulates network interruption
2. **Invalid URL**: Tests error handling for non-existent pages
3. **Timeout Handling**: Validates proper timeout behavior

## Reports

### JSON Report Structure
```json
{
  "id": "test-1234567890",
  "timestamp": "2024-02-11T20:00:00Z",
  "browser": "chromium",
  "testType": "all",
  "results": [
    {
      "name": "Standard Sorting - First 100 Articles",
      "status": "passed",
      "duration": 15234,
      "details": {
        "articlesCollected": 100,
        "validationErrors": 0,
        "sortingViolations": 0
      }
    }
  ],
  "summary": {
    "total": 5,
    "passed": 5,
    "failed": 0
  }
}
```

### HTML Report
Generated in `test-reports/` directory with:
- Visual test results
- Performance metrics
- Success/failure indicators
- Detailed error information

## Configuration

Edit `CONFIG` object in `index.js`:

```javascript
const CONFIG = {
  TARGET_ARTICLE_COUNT: 100,        // Number of articles to test
  BASE_URL: "https://news.ycombinator.com/newest",
  TIMEOUT: 30000,                   // Timeout in milliseconds
  MAX_RETRIES: 3,                   // Retry attempts
  RETRY_DELAY: 1000,                // Delay between retries
  REPORT_DIR: "test-reports",       // Report output directory
  METRICS_ENDPOINT: null,           // Monitoring endpoint (optional)
};
```

## Monitoring Integration

Set environment variable for metrics endpoint:

```bash
export METRICS_ENDPOINT=https://api.datadoghq.com/api/v1/metrics
node index.js --report
```

Metrics payload includes:
- Execution times
- Success/failure rates
- Browser information
- Error details

## CI/CD Integration

### GitHub Actions

1. Copy `.github-workflows-test.yml` to `.github/workflows/test.yml`
2. Commit and push
3. Tests run automatically on:
   - Push to main/develop
   - Pull requests
   - Daily schedule (2 AM UTC)
   - Manual trigger

### Features
- Multi-browser testing
- Report uploads
- Screenshot capture on failure
- PR comments with results
- GitHub Pages deployment
- Scheduled runs

### Secrets (Optional)
- `METRICS_ENDPOINT`: For monitoring integration

## Performance Benchmarks

Typical execution times:

| Browser  | Standard Test | All Tests | Headed Mode |
|----------|--------------|-----------|-------------|
| Chromium | ~15s         | ~45s      | ~35s        |
| Firefox  | ~18s         | ~50s      | ~40s        |
| WebKit   | ~16s         | ~47s      | ~38s        |

## NPM Scripts

```bash
# Basic test
npm test

# Verbose mode
npm run test:verbose

# Debug with visible browser
npm run test:debug

# All tests with reports
npm run test:all

# Edge cases only
npm run test:edge-cases

# Negative tests only
npm run test:negative

# Specific browser
npm run test:firefox
npm run test:webkit

# All browsers
npm run test:all-browsers

# CI mode
npm run test:ci
```

## Architecture

### Component Structure

```
index.js
├── Configuration
├── Logging System
├── Performance Metrics
├── Monitoring Integration
├── Test Report Generation
├── Data Validation
├── Utility Functions
│   ├── retry()
│   ├── extractArticles()
│   ├── displayDebugInfo()
├── Article Collection
│   └── collectArticles()
├── Timestamp Parsing
│   └── parseTimestamps()
├── Sorting Validation
│   └── validateSorting()
├── Test Scenarios
│   ├── testStandardSorting()
│   ├── testPartialSorting()
│   ├── testTimestampFormats()
│   ├── testNetworkFailureHandling()
│   └── testInvalidURL()
└── Test Runner
    └── runTests()
```

## Validation Rules

### Article Structure
- Must have numeric ID
- Must have non-empty title (max 500 chars)
- Age text format: "X [unit] ago"
- Timestamp must be valid ISO 8601
- Timestamp must not be in future
- Warning if article > 1 year old

### Sorting Logic
- Primary: ISO timestamps (descending)
- Fallback: Item IDs (descending)
- Violation detection: Any newer article appearing after an older one

## Troubleshooting

### Common Issues

**Test hangs**
- Increase `CONFIG.TIMEOUT`
- Check network connectivity
- Use `--headed --debug` to inspect

**Stale element references**
- Fixed automatically with retry logic
- Elements queried fresh on each attempt

**Network errors**
- Retry logic handles transient failures
- Check firewall/proxy settings

**Browser installation issues**
```bash
npx playwright install --with-deps chromium
```

**Reports not generating**
- Ensure write permissions
- Check `CONFIG.REPORT_DIR` exists
- Use `--report` flag

## Exit Codes

- `0`: All tests passed
- `1`: One or more tests failed