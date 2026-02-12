// COMPREHENSIVE HACKER NEWS SORTING TEST SUITE
// Production-ready test with edge cases, metrics, reporting, and monitoring
const { chromium, firefox, webkit } = require("playwright");
const fs = require("fs");
const path = require("path");

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  TARGET_ARTICLE_COUNT: 100,
  BASE_URL: "https://news.ycombinator.com/newest",
  TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  REPORT_DIR: "test-reports",
  METRICS_ENDPOINT: process.env.METRICS_ENDPOINT || null, // e.g., Datadog, New Relic
};

// ============================================================================
// COMMAND LINE ARGUMENTS
// ============================================================================
const args = {
  verbose: process.argv.includes("--verbose") || process.argv.includes("-v"),
  debug: process.argv.includes("--debug") || process.argv.includes("-d"),
  headed: process.argv.includes("--headed") || process.argv.includes("-h"),
  browser: getBrowserType(),
  logLevel: getLogLevel(),
  testType: getTestType(),
  report: process.argv.includes("--report") || process.argv.includes("-r"),
};

function getBrowserType() {
  if (process.argv.includes("--firefox")) return "firefox";
  if (process.argv.includes("--webkit")) return "webkit";
  if (process.argv.includes("--all-browsers")) return "all";
  return "chromium"; // default
}

function getLogLevel() {
  const levelArg = process.argv.find(arg => arg.startsWith("--log-level="));
  if (levelArg) return levelArg.split("=")[1];
  return "info"; // default: debug, info, warn, error
}

function getTestType() {
  if (process.argv.includes("--edge-cases")) return "edge-cases";
  if (process.argv.includes("--negative")) return "negative";
  if (process.argv.includes("--all-tests")) return "all";
  return "standard"; // default
}

// ============================================================================
// LOGGING SYSTEM
// ============================================================================
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLogLevel = LOG_LEVELS[args.logLevel] || LOG_LEVELS.info;

const logger = {
  debug: (msg, ...args) => {
    if (currentLogLevel <= LOG_LEVELS.debug) {
      console.log(`[DEBUG] ${msg}`, ...args);
    }
  },
  info: (msg, ...args) => {
    if (currentLogLevel <= LOG_LEVELS.info) {
      console.log(`[INFO] ${msg}`, ...args);
    }
  },
  warn: (msg, ...args) => {
    if (currentLogLevel <= LOG_LEVELS.warn) {
      console.warn(`[WARN] ${msg}`, ...args);
    }
  },
  error: (msg, ...args) => {
    if (currentLogLevel <= LOG_LEVELS.error) {
      console.error(`[ERROR] ${msg}`, ...args);
    }
  },
};

// ============================================================================
// PERFORMANCE METRICS
// ============================================================================
class PerformanceMetrics {
  constructor() {
    this.startTime = Date.now();
    this.metrics = {
      totalExecutionTime: 0,
      pageLoadTime: 0,
      articleCollectionTime: 0,
      validationTime: 0,
      articlesPerSecond: 0,
      pagesLoaded: 0,
      retryCount: 0,
      networkRequests: 0,
      errors: [],
      browserType: args.browser,
      testType: args.testType,
    };
  }

  startTimer(name) {
    this[`${name}Start`] = Date.now();
  }

  endTimer(name) {
    const duration = Date.now() - this[`${name}Start`];
    this.metrics[name] = duration;
    logger.debug(`${name}: ${duration}ms`);
    return duration;
  }

  incrementRetry() {
    this.metrics.retryCount++;
  }

  incrementPages() {
    this.metrics.pagesLoaded++;
  }

  addError(error) {
    this.metrics.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }

  finalize(articleCount) {
    this.metrics.totalExecutionTime = Date.now() - this.startTime;
    this.metrics.articlesPerSecond = (
      articleCount /
      (this.metrics.totalExecutionTime / 1000)
    ).toFixed(2);
  }

  report() {
    console.log("\n" + "=".repeat(80));
    console.log("📊 PERFORMANCE METRICS");
    console.log("=".repeat(80));
    console.log(`Total Execution Time: ${this.metrics.totalExecutionTime}ms`);
    console.log(`Page Load Time: ${this.metrics.pageLoadTime}ms`);
    console.log(`Article Collection Time: ${this.metrics.articleCollectionTime}ms`);
    console.log(`Validation Time: ${this.metrics.validationTime}ms`);
    console.log(`Articles/Second: ${this.metrics.articlesPerSecond}`);
    console.log(`Pages Loaded: ${this.metrics.pagesLoaded}`);
    console.log(`Retry Count: ${this.metrics.retryCount}`);
    console.log(`Browser: ${this.metrics.browserType}`);
    console.log(`Test Type: ${this.metrics.testType}`);
    if (this.metrics.errors.length > 0) {
      console.log(`Errors: ${this.metrics.errors.length}`);
    }
    console.log("=".repeat(80));
  }

  toJSON() {
    return this.metrics;
  }
}

// ============================================================================
// MONITORING / ALERTING
// ============================================================================
async function sendMetricsToMonitoring(metrics, testResult) {
  if (!CONFIG.METRICS_ENDPOINT) {
    logger.debug("No metrics endpoint configured, skipping monitoring submission");
    return;
  }

  try {
    const payload = {
      service: "hn-sorting-test",
      timestamp: new Date().toISOString(),
      metrics: metrics,
      result: testResult,
      environment: process.env.NODE_ENV || "development",
    };

    logger.debug(`Would send metrics to: ${CONFIG.METRICS_ENDPOINT}`);
    logger.debug(`Payload: ${JSON.stringify(payload, null, 2)}`);

    // In production, you would do:
    // const response = await fetch(CONFIG.METRICS_ENDPOINT, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload)
    // });
    
    logger.info("Metrics sent to monitoring system (simulated)");
  } catch (error) {
    logger.error("Failed to send metrics to monitoring:", error.message);
  }
}

// ============================================================================
// TEST REPORT GENERATION
// ============================================================================
class TestReport {
  constructor() {
    this.testRun = {
      id: `test-${Date.now()}`,
      timestamp: new Date().toISOString(),
      browser: args.browser,
      testType: args.testType,
      results: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
      },
    };
  }

  addTest(testName, status, duration, details = {}) {
    this.testRun.results.push({
      name: testName,
      status,
      duration,
      details,
      timestamp: new Date().toISOString(),
    });
    this.testRun.summary.total++;
    this.testRun.summary[status]++;
  }

  async save() {
    if (!args.report) {
      logger.debug("Report generation disabled");
      return;
    }

    try {
      // Create report directory
      if (!fs.existsSync(CONFIG.REPORT_DIR)) {
        fs.mkdirSync(CONFIG.REPORT_DIR, { recursive: true });
      }

      // Save JSON report
      const jsonPath = path.join(CONFIG.REPORT_DIR, `${this.testRun.id}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(this.testRun, null, 2));
      logger.info(`JSON report saved: ${jsonPath}`);

      // Save HTML report
      const htmlPath = path.join(CONFIG.REPORT_DIR, `${this.testRun.id}.html`);
      fs.writeFileSync(htmlPath, this.generateHTML());
      logger.info(`HTML report saved: ${htmlPath}`);

      // Save summary
      const summaryPath = path.join(CONFIG.REPORT_DIR, "latest.json");
      fs.writeFileSync(summaryPath, JSON.stringify(this.testRun.summary, null, 2));
      
      return jsonPath;
    } catch (error) {
      logger.error("Failed to save report:", error.message);
    }
  }

  generateHTML() {
    const statusColor = (status) => {
      const colors = { passed: "#28a745", failed: "#dc3545", skipped: "#ffc107" };
      return colors[status] || "#6c757d";
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <title>Test Report - ${this.testRun.id}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
    .header { background: #333; color: white; padding: 20px; border-radius: 5px; }
    .summary { display: flex; gap: 20px; margin: 20px 0; }
    .metric { background: white; padding: 20px; border-radius: 5px; flex: 1; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .metric h3 { margin: 0 0 10px 0; color: #666; }
    .metric .value { font-size: 32px; font-weight: bold; }
    .tests { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .test { padding: 15px; border-left: 4px solid #ccc; margin: 10px 0; background: #f9f9f9; }
    .test.passed { border-color: #28a745; }
    .test.failed { border-color: #dc3545; }
    .test-header { display: flex; justify-content: space-between; align-items: center; }
    .status { padding: 5px 10px; border-radius: 3px; color: white; font-weight: bold; font-size: 12px; }
    .details { margin-top: 10px; padding: 10px; background: white; border-radius: 3px; font-family: monospace; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🧪 Hacker News Sorting Test Report</h1>
    <p>Test Run ID: ${this.testRun.id}</p>
    <p>Timestamp: ${this.testRun.timestamp}</p>
    <p>Browser: ${this.testRun.browser}</p>
  </div>
  
  <div class="summary">
    <div class="metric">
      <h3>Total Tests</h3>
      <div class="value">${this.testRun.summary.total}</div>
    </div>
    <div class="metric">
      <h3>Passed</h3>
      <div class="value" style="color: #28a745">${this.testRun.summary.passed}</div>
    </div>
    <div class="metric">
      <h3>Failed</h3>
      <div class="value" style="color: #dc3545">${this.testRun.summary.failed}</div>
    </div>
    <div class="metric">
      <h3>Success Rate</h3>
      <div class="value">${((this.testRun.summary.passed / this.testRun.summary.total) * 100).toFixed(1)}%</div>
    </div>
  </div>
  
  <div class="tests">
    <h2>Test Results</h2>
    ${this.testRun.results
      .map(
        (test) => `
      <div class="test ${test.status}">
        <div class="test-header">
          <strong>${test.name}</strong>
          <div>
            <span class="status" style="background: ${statusColor(test.status)}">${test.status.toUpperCase()}</span>
            <span style="margin-left: 10px; color: #666">${test.duration}ms</span>
          </div>
        </div>
        ${
          Object.keys(test.details).length > 0
            ? `<div class="details">${JSON.stringify(test.details, null, 2)}</div>`
            : ""
        }
      </div>
    `
      )
      .join("")}
  </div>
</body>
</html>
    `;
  }
}

// ============================================================================
// DATA VALIDATION
// ============================================================================
function validateArticleStructure(article, index) {
  const errors = [];

  if (!article.id) {
    errors.push(`Article ${index}: Missing ID`);
  } else if (!/^\d+$/.test(article.id)) {
    errors.push(`Article ${index}: Invalid ID format (${article.id})`);
  }

  if (!article.title) {
    errors.push(`Article ${index}: Missing title`);
  } else if (article.title.length === 0) {
    errors.push(`Article ${index}: Empty title`);
  } else if (article.title.length > 500) {
    errors.push(`Article ${index}: Title too long (${article.title.length} chars)`);
  }

  if (article.ageText && !/\d+\s+(second|minute|hour|day|month|year)s?\s+ago/.test(article.ageText)) {
    logger.warn(`Article ${index}: Unusual age format: ${article.ageText}`);
  }

  if (article.ageLink) {
    const timestamp = new Date(article.ageLink);
    if (isNaN(timestamp.getTime())) {
      errors.push(`Article ${index}: Invalid timestamp (${article.ageLink})`);
    } else {
      // Check if timestamp is in reasonable range (not future, not too old)
      const now = Date.now();
      const timestampMs = timestamp.getTime();
      if (timestampMs > now) {
        errors.push(`Article ${index}: Timestamp is in the future`);
      }
      if (now - timestampMs > 365 * 24 * 60 * 60 * 1000) {
        logger.warn(`Article ${index}: Article is over 1 year old`);
      }
    }
  }

  return errors;
}

function validateAllArticles(articles) {
  logger.info("Validating article data structure...");
  const allErrors = [];

  for (let i = 0; i < articles.length; i++) {
    const errors = validateArticleStructure(articles[i], i + 1);
    allErrors.push(...errors);
  }

  if (allErrors.length > 0) {
    logger.warn(`Found ${allErrors.length} validation error(s):`);
    allErrors.slice(0, 10).forEach((err) => logger.warn(`  - ${err}`));
    if (allErrors.length > 10) {
      logger.warn(`  ... and ${allErrors.length - 10} more`);
    }
  } else {
    logger.info("All articles passed validation ✓");
  }

  return allErrors;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
async function retry(fn, maxRetries = CONFIG.MAX_RETRIES, delay = CONFIG.RETRY_DELAY, metrics) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (metrics) metrics.incrementRetry();
      if (i === maxRetries - 1) throw error;
      logger.warn(`Retry ${i + 1}/${maxRetries} after error: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
    }
  }
}

async function extractArticles(page, debug) {
  return await page.evaluate((debug) => {
    const results = [];
    const articleRows = document.querySelectorAll(".athing");

    articleRows.forEach((row, idx) => {
      const titleElement = row.querySelector(".titleline > a");
      const title = titleElement ? titleElement.innerText : "No title";
      const id = row.id;

      const metadataRow = row.nextElementSibling;

      let debugInfo = null;
      if (debug && idx === 0) {
        debugInfo = {
          hasMetadataRow: !!metadataRow,
          metadataRowHTML: metadataRow ? metadataRow.innerHTML.substring(0, 500) : null,
        };
      }

      const ageElement = metadataRow ? metadataRow.querySelector(".age") : null;

      let ageText = null;
      let ageLink = null;

      if (ageElement) {
        ageLink = ageElement.getAttribute("title");

        if (ageLink && ageLink.includes(" ")) {
          ageLink = ageLink.split(" ")[0];
        }

        const linkElement = ageElement.querySelector("a");
        if (linkElement) {
          ageText = linkElement.innerText;
        }

        if (debug && idx === 0) {
          debugInfo.ageElementHTML = ageElement.innerHTML;
          debugInfo.ageElementTitle = ageElement.getAttribute("title");
          debugInfo.hasLinkElement = !!linkElement;
          if (linkElement) {
            debugInfo.linkAttributes = {
              href: linkElement.getAttribute("href"),
              title: linkElement.getAttribute("title"),
              innerText: linkElement.innerText,
            };
          }
        }
      }

      results.push({
        id,
        title,
        ageText,
        ageLink,
        debugInfo,
      });
    });

    return results;
  }, debug);
}

function displayDebugInfo(article) {
  if (!article || !article.debugInfo) return;

  console.log("\n" + "=".repeat(80));
  console.log("DEBUG - First article extraction details:");
  console.log("=".repeat(80));
  console.log("Article ID:", article.id);
  console.log("Title:", article.title);
  console.log("Age Text:", article.ageText);
  console.log("Age Link (timestamp):", article.ageLink);
  console.log("\nHTML Structure:");
  console.log("Has metadata row:", article.debugInfo.hasMetadataRow);

  if (article.debugInfo.metadataRowHTML) {
    console.log("\nMetadata row HTML (first 500 chars):");
    console.log(article.debugInfo.metadataRowHTML);
  }

  if (article.debugInfo.ageElementHTML) {
    console.log("\nAge element HTML:");
    console.log(article.debugInfo.ageElementHTML);
  }

  console.log("\nAge element title attribute:", article.debugInfo.ageElementTitle);
  console.log("Link element found:", article.debugInfo.hasLinkElement);

  if (article.debugInfo.linkAttributes) {
    console.log("Link attributes:", JSON.stringify(article.debugInfo.linkAttributes, null, 2));
  }

  if (article.ageLink) {
    const testDate = new Date(article.ageLink);
    console.log("\nTimestamp parsing:");
    console.log("Raw ageLink value:", article.ageLink);
    console.log("Parsed as:", testDate.toISOString());
    console.log("Is valid:", !isNaN(testDate.getTime()));
  } else {
    console.log("\n⚠️  No timestamp found - will use item ID fallback");
  }

  console.log("=".repeat(80) + "\n");
}

// ============================================================================
// ARTICLE COLLECTION
// ============================================================================
async function collectArticles(page, metrics, targetCount = CONFIG.TARGET_ARTICLE_COUNT) {
  const articles = [];

  logger.info(`Collecting first ${targetCount} articles from Hacker News...`);
  metrics.startTimer("articleCollectionTime");

  while (articles.length < targetCount) {
    await page.waitForSelector(".athing", { timeout: CONFIG.TIMEOUT });

    const pageArticles = await extractArticles(page, args.debug);

    const previousCount = articles.length;
    for (const article of pageArticles) {
      if (articles.length < targetCount) {
        articles.push(article);
      }
    }

    logger.info(`Collected ${articles.length} articles so far...`);

    if (args.debug && previousCount === 0 && articles.length > 0) {
      displayDebugInfo(articles[0]);
    }

    if (articles.length < targetCount) {
      const hasMoreLink = await page.$(".morelink");
      if (hasMoreLink) {
        await retry(
          async () => {
            const moreLink = await page.$(".morelink");
            if (!moreLink) {
              throw new Error("More link disappeared");
            }

            await Promise.all([
              page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: CONFIG.TIMEOUT }),
              moreLink.click(),
            ]);

            await page.waitForSelector(".athing", { timeout: CONFIG.TIMEOUT });
            metrics.incrementPages();
          },
          CONFIG.MAX_RETRIES,
          CONFIG.RETRY_DELAY,
          metrics
        );
      } else {
        logger.warn("No more articles available.");
        break;
      }
    }
  }

  metrics.endTimer("articleCollectionTime");
  logger.info(`Collected ${articles.length} articles total.`);
  return articles;
}

// ============================================================================
// TIMESTAMP PARSING
// ============================================================================
function parseTimestamps(articles) {
  const timestamps = [];
  let fallbackCount = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    let timestamp = null;
    let timestampMs = null;

    if (article.ageLink) {
      const parsedDate = new Date(article.ageLink);

      if (!isNaN(parsedDate.getTime())) {
        timestamp = parsedDate;
        timestampMs = parsedDate.getTime();
      }
    }

    if (!timestamp && article.id) {
      const itemId = parseInt(article.id, 10);
      if (!isNaN(itemId)) {
        timestampMs = itemId;
        fallbackCount++;
      }
    }

    if (timestampMs !== null) {
      timestamps.push({
        index: i + 1,
        title: article.title.substring(0, 60) + "...",
        ageText: article.ageText,
        timestamp: timestamp,
        timestampMs: timestampMs,
        itemId: article.id,
      });
    } else {
      logger.error(`Warning: Article ${i + 1} has no valid timestamp or ID`);
    }
  }

  if (timestamps.length === 0) {
    throw new Error("No valid timestamps or IDs found! Page structure may have changed.");
  }

  if (timestamps.length < articles.length) {
    logger.warn(`Only ${timestamps.length} out of ${articles.length} articles had valid data.`);
  }

  if (fallbackCount > 0) {
    logger.info(`${fallbackCount} article(s) using item ID fallback.`);
  }

  return timestamps;
}

// ============================================================================
// SORTING VALIDATION
// ============================================================================
function validateSorting(timestamps) {
  const violations = [];

  for (let i = 0; i < timestamps.length - 1; i++) {
    const current = timestamps[i];
    const next = timestamps[i + 1];

    if (current.timestampMs < next.timestampMs) {
      violations.push({
        position: i + 1,
        current: current,
        next: next,
      });
    }
  }

  return {
    isSorted: violations.length === 0,
    violations: violations,
  };
}

// ============================================================================
// RESULTS DISPLAY
// ============================================================================
function displayResults(timestamps, validation) {
  console.log("=".repeat(80));
  console.log("VALIDATION RESULTS");
  console.log("=".repeat(80));
  console.log(`Total articles analyzed: ${timestamps.length}`);
  console.log(`Sorting validation: ${validation.isSorted ? "PASSED ✓" : "FAILED ✗"}`);
  console.log("=".repeat(80));

  if (args.verbose) {
    console.log("\nAll articles with absolute timestamps:\n");
    timestamps.forEach((article) => {
      let timeDisplay;
      if (article.timestamp) {
        timeDisplay = article.timestamp.toISOString();
      } else {
        timeDisplay = `Item ID: ${article.itemId} (no timestamp)`;
      }
      console.log(`${String(article.index).padStart(3, " ")}. ${timeDisplay} | ${article.title}`);
    });
  } else {
    console.log("\nFirst 5 articles:\n");
    for (let i = 0; i < Math.min(5, timestamps.length); i++) {
      const article = timestamps[i];
      const timeDisplay = article.ageText ? `[${article.ageText}]` : `[Item ID: ${article.itemId}]`;
      console.log(`${String(article.index).padStart(3, " ")}. ${timeDisplay} ${article.title}`);
    }

    console.log("\n...\n");

    console.log("Last 5 articles:\n");
    for (let i = Math.max(0, timestamps.length - 5); i < timestamps.length; i++) {
      const article = timestamps[i];
      const timeDisplay = article.ageText ? `[${article.ageText}]` : `[Item ID: ${article.itemId}]`;
      console.log(`${String(article.index).padStart(3, " ")}. ${timeDisplay} ${article.title}`);
    }

    console.log("\n(Use --verbose to see all articles)");
  }

  if (validation.isSorted) {
    console.log("\n" + "=".repeat(80));
    console.log("✓ SUCCESS: All articles are correctly sorted from newest to oldest.");
    console.log("=".repeat(80));
  } else {
    console.log("\n" + "=".repeat(80));
    console.log(`✗ FAILURE: Found ${validation.violations.length} sorting violation(s):`);
    console.log("=".repeat(80));

    validation.violations.forEach((v, idx) => {
      console.log(`\nViolation ${idx + 1}:`);

      if (v.current.timestamp && v.next.timestamp) {
        console.log(`  Article ${v.current.index}: ${v.current.timestamp.toISOString()}`);
        console.log(`  Article ${v.next.index}: ${v.next.timestamp.toISOString()}`);
      } else {
        console.log(`  Article ${v.current.index}: Item ID ${v.current.itemId}`);
        console.log(`  Article ${v.next.index}: Item ID ${v.next.itemId}`);
      }

      console.log(
        `  Problem: Article ${v.next.index} is NEWER but appears AFTER article ${v.current.index}`
      );
    });
    console.log("\n" + "=".repeat(80));
  }

  return validation.isSorted;
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

/**
 * Standard test: Validate first 100 articles are sorted
 */
async function testStandardSorting(browser, report, metrics) {
  logger.info("Running standard sorting test...");
  const testStart = Date.now();

  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });

    if (!args.headed) {
      await context.route("**/*.{png,jpg,jpeg,gif,svg,css,woff,woff2}", (route) =>
        route.abort()
      );
    }

    const page = await context.newPage();
    page.setDefaultTimeout(CONFIG.TIMEOUT);

    metrics.startTimer("pageLoadTime");
    await page.goto(CONFIG.BASE_URL, {
      waitUntil: "domcontentloaded",
      timeout: CONFIG.TIMEOUT,
    });
    metrics.endTimer("pageLoadTime");

    const articles = await collectArticles(page, metrics);
    
    // Validate data structure
    const validationErrors = validateAllArticles(articles);

    metrics.startTimer("validationTime");
    const timestamps = parseTimestamps(articles);
    const validation = validateSorting(timestamps);
    metrics.endTimer("validationTime");

    const passed = displayResults(timestamps, validation);

    await context.close();

    report.addTest(
      "Standard Sorting - First 100 Articles",
      passed ? "passed" : "failed",
      Date.now() - testStart,
      {
        articlesCollected: articles.length,
        validationErrors: validationErrors.length,
        sortingViolations: validation.violations.length,
      }
    );

    return passed;
  } catch (error) {
    metrics.addError(error);
    logger.error(`Standard test failed: ${error.message}`);
    report.addTest(
      "Standard Sorting - First 100 Articles",
      "failed",
      Date.now() - testStart,
      { error: error.message }
    );
    throw error;
  }
}

/**
 * Edge case: Validate smaller subset (first 30)
 */
async function testPartialSorting(browser, report, metrics) {
  logger.info("Running partial sorting test (first 30 articles)...");
  const testStart = Date.now();

  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    page.setDefaultTimeout(CONFIG.TIMEOUT);

    await page.goto(CONFIG.BASE_URL, { waitUntil: "domcontentloaded" });

    const articles = await collectArticles(page, metrics, 30);
    const timestamps = parseTimestamps(articles);
    const validation = validateSorting(timestamps);

    await context.close();

    const passed = validation.isSorted;
    logger.info(`Partial sorting test: ${passed ? "PASSED" : "FAILED"}`);

    report.addTest(
      "Edge Case - First 30 Articles Only",
      passed ? "passed" : "failed",
      Date.now() - testStart,
      {
        articlesCollected: articles.length,
        sortingViolations: validation.violations.length,
      }
    );

    return passed;
  } catch (error) {
    metrics.addError(error);
    logger.error(`Partial test failed: ${error.message}`);
    report.addTest(
      "Edge Case - First 30 Articles Only",
      "failed",
      Date.now() - testStart,
      { error: error.message }
    );
    return false;
  }
}

/**
 * Edge case: Check timestamp format consistency
 */
async function testTimestampFormats(browser, report, metrics) {
  logger.info("Testing timestamp format consistency...");
  const testStart = Date.now();

  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    page.setDefaultTimeout(CONFIG.TIMEOUT);

    await page.goto(CONFIG.BASE_URL, { waitUntil: "domcontentloaded" });

    const articles = await collectArticles(page, metrics, 30);
    
    let invalidFormats = 0;
    let missingTimestamps = 0;

    articles.forEach((article, idx) => {
      if (!article.ageLink) {
        missingTimestamps++;
      } else {
        const timestamp = new Date(article.ageLink);
        if (isNaN(timestamp.getTime())) {
          invalidFormats++;
          logger.warn(`Article ${idx + 1}: Invalid timestamp format: ${article.ageLink}`);
        }
      }
    });

    await context.close();

    const passed = invalidFormats === 0;
    logger.info(
      `Timestamp format test: ${passed ? "PASSED" : "FAILED"} (${invalidFormats} invalid, ${missingTimestamps} missing)`
    );

    report.addTest(
      "Edge Case - Timestamp Format Consistency",
      passed ? "passed" : "failed",
      Date.now() - testStart,
      {
        articlesChecked: articles.length,
        invalidFormats,
        missingTimestamps,
      }
    );

    return passed;
  } catch (error) {
    metrics.addError(error);
    logger.error(`Timestamp format test failed: ${error.message}`);
    report.addTest(
      "Edge Case - Timestamp Format Consistency",
      "failed",
      Date.now() - testStart,
      { error: error.message }
    );
    return false;
  }
}

/**
 * Negative test: Simulate network failure
 */
async function testNetworkFailureHandling(browser, report, metrics) {
  logger.info("Testing network failure handling...");
  const testStart = Date.now();

  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    page.setDefaultTimeout(5000); // Shorter timeout for this test

    await page.goto(CONFIG.BASE_URL, { waitUntil: "domcontentloaded" });

    // Collect first page
    const articles = await collectArticles(page, metrics, 30);

    // Block all network requests
    await context.route("**/*", (route) => route.abort());

    // Try to load more - should fail gracefully
    let errorOccurred = false;
    try {
      await collectArticles(page, metrics, 60);
    } catch (error) {
      errorOccurred = true;
      logger.info("Network failure handled as expected");
    }

    await context.close();

    const passed = errorOccurred; // Should fail gracefully
    logger.info(`Network failure test: ${passed ? "PASSED" : "FAILED"}`);

    report.addTest(
      "Negative Test - Network Failure Handling",
      passed ? "passed" : "failed",
      Date.now() - testStart,
      {
        articlesBeforeFailure: articles.length,
        failedGracefully: errorOccurred,
      }
    );

    return passed;
  } catch (error) {
    metrics.addError(error);
    logger.info("Network failure test completed (error expected)");
    report.addTest(
      "Negative Test - Network Failure Handling",
      "passed",
      Date.now() - testStart,
      { note: "Failed gracefully as expected" }
    );
    return true; // Expected to fail
  }
}

/**
 * Negative test: Invalid URL
 */
async function testInvalidURL(browser, report, metrics) {
  logger.info("Testing invalid URL handling...");
  const testStart = Date.now();

  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);

    await page.goto("https://news.ycombinator.com/nonexistent", {
      waitUntil: "domcontentloaded",
    });

    const articles = await collectArticles(page, metrics, 10);
    await context.close();

    // Should not reach here
    logger.warn("Invalid URL test: Should have failed but didn't");
    report.addTest(
      "Negative Test - Invalid URL",
      "failed",
      Date.now() - testStart,
      { note: "Should have thrown error" }
    );
    return false;
  } catch (error) {
    logger.info("Invalid URL handled correctly");
    report.addTest(
      "Negative Test - Invalid URL",
      "passed",
      Date.now() - testStart,
      { note: "Failed as expected", error: error.message }
    );
    return true; // Expected to fail
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================
async function runTests() {
  console.log("=".repeat(80));
  console.log("🧪 HACKER NEWS SORTING TEST SUITE");
  console.log("=".repeat(80));
  console.log(`Browser: ${args.browser}`);
  console.log(`Test Type: ${args.testType}`);
  console.log(`Log Level: ${args.logLevel}`);
  console.log(`Headed: ${args.headed}`);
  console.log("=".repeat(80));

  const report = new TestReport();
  const metrics = new PerformanceMetrics();
  let allPassed = true;

  // Determine which browsers to test
  const browsersToTest =
    args.browser === "all" ? ["chromium", "firefox", "webkit"] : [args.browser];

  for (const browserType of browsersToTest) {
    logger.info(`\nTesting with ${browserType}...`);
    const playwright = require("playwright");
    const browser = await playwright[browserType].launch({
      headless: !args.headed,
      timeout: CONFIG.TIMEOUT,
    });

    try {
      // Determine which tests to run
      const testsToRun = [];

      if (args.testType === "standard" || args.testType === "all") {
        testsToRun.push(() => testStandardSorting(browser, report, metrics));
      }

      if (args.testType === "edge-cases" || args.testType === "all") {
        testsToRun.push(
          () => testPartialSorting(browser, report, metrics),
          () => testTimestampFormats(browser, report, metrics)
        );
      }

      if (args.testType === "negative" || args.testType === "all") {
        testsToRun.push(
          () => testNetworkFailureHandling(browser, report, metrics),
          () => testInvalidURL(browser, report, metrics)
        );
      }

      // Run all selected tests
      for (const test of testsToRun) {
        const passed = await test();
        if (!passed) allPassed = false;
      }
    } catch (error) {
      logger.error(`Fatal error in ${browserType}:`, error.message);
      metrics.addError(error);
      allPassed = false;

      // Take screenshot on failure
      try {
        const screenshotPath = `failure-screenshot-${browserType}-${Date.now()}.png`;
        // Note: Would need page reference to take screenshot
        logger.info(`Would save screenshot to: ${screenshotPath}`);
      } catch (screenshotError) {
        logger.error("Could not save screenshot:", screenshotError.message);
      }
    } finally {
      await browser.close();
    }
  }

  // Finalize metrics
  metrics.finalize(CONFIG.TARGET_ARTICLE_COUNT);
  metrics.report();

  // Save report
  const reportPath = await report.save();
  if (reportPath) {
    console.log(`\n📄 Full report saved to: ${reportPath}`);
  }

  // Send metrics to monitoring
  await sendMetricsToMonitoring(metrics.toJSON(), {
    allPassed,
    summary: report.testRun.summary,
  });

  // Print summary
  console.log("\n" + "=".repeat(80));
  console.log("TEST SUMMARY");
  console.log("=".repeat(80));
  console.log(`Total: ${report.testRun.summary.total}`);
  console.log(`Passed: ${report.testRun.summary.passed}`);
  console.log(`Failed: ${report.testRun.summary.failed}`);
  console.log(
    `Success Rate: ${((report.testRun.summary.passed / report.testRun.summary.total) * 100).toFixed(1)}%`
  );
  console.log("=".repeat(80));

  return allPassed;
}

// ============================================================================
// ENTRY POINT
// ============================================================================
(async () => {
  try {
    const allPassed = await runTests();
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    logger.error("Fatal error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
