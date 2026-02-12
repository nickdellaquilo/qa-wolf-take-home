// EDIT THIS FILE TO COMPLETE ASSIGNMENT QUESTION 1
const { chromium } = require("playwright");

// Check for --verbose flag
const isVerbose = process.argv.includes("--verbose") || process.argv.includes("-v");

// Check for --debug flag
const isDebug = process.argv.includes("--debug") || process.argv.includes("-d");

async function sortHackerNewsArticles() {
  // launch browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // go to Hacker News
  await page.goto("https://news.ycombinator.com/newest");

  const articles = [];
  const targetCount = 100;

  console.log("Collecting first 100 articles from Hacker News...\n");

  // Collect articles from multiple pages
  while (articles.length < targetCount) {
    // Wait for articles to load
    await page.waitForSelector(".athing");

    // Extract article data from current page
    const pageArticles = await page.evaluate((debug) => {
      const results = [];
      const articleRows = document.querySelectorAll(".athing");

      articleRows.forEach((row, idx) => {
        const titleElement = row.querySelector(".titleline > a");
        const title = titleElement ? titleElement.innerText : "No title";
        const id = row.id;

        // The next row contains the metadata (age, points, etc.)
        const metadataRow = row.nextElementSibling;
        
        // Debug info for first article (only if debug flag is set)
        let debugInfo = null;
        if (debug && idx === 0) {
          debugInfo = {
            hasMetadataRow: !!metadataRow,
            metadataRowHTML: metadataRow ? metadataRow.innerHTML.substring(0, 500) : null,
          };
        }
        
        // Get the age element - it's a <span class="age">
        const ageElement = metadataRow
          ? metadataRow.querySelector(".age")
          : null;
        
        let ageText = null;
        let ageLink = null;
        
        if (ageElement) {
          // The title attribute with the timestamp is on the span.age element itself
          ageLink = ageElement.getAttribute("title");
          
          // If title contains both timestamp and unix time (e.g., "2026-02-11T20:42:06 1770842526")
          // extract just the ISO timestamp part
          if (ageLink && ageLink.includes(" ")) {
            ageLink = ageLink.split(" ")[0];
          }
          
          // The ageText is the text content of the link inside .age
          const linkElement = ageElement.querySelector("a");
          if (linkElement) {
            ageText = linkElement.innerText;
          }
          
          // Add debug info for first article (only if debug flag is set)
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
    }, isDebug);

    // Add articles to our collection
    const previousCount = articles.length;
    for (const article of pageArticles) {
      if (articles.length < targetCount) {
        articles.push(article);
      }
    }

    console.log(
      `Collected ${articles.length} articles so far...`
    );

    // Debug: Show first article's data structure (only on first page load)
    if (isDebug && previousCount === 0 && articles.length > 0 && articles[0].debugInfo) {
      console.log("\n" + "=".repeat(80));
      console.log("DEBUG - First article extraction details:");
      console.log("=".repeat(80));
      console.log("Article ID:", articles[0].id);
      console.log("Title:", articles[0].title);
      console.log("Age Text:", articles[0].ageText);
      console.log("Age Link (timestamp):", articles[0].ageLink);
      console.log("\nHTML Structure:");
      console.log("Has metadata row:", articles[0].debugInfo.hasMetadataRow);
      if (articles[0].debugInfo.metadataRowHTML) {
        console.log("\nMetadata row HTML (first 500 chars):");
        console.log(articles[0].debugInfo.metadataRowHTML);
      }
      if (articles[0].debugInfo.ageElementHTML) {
        console.log("\nAge element HTML:");
        console.log(articles[0].debugInfo.ageElementHTML);
      }
      console.log("\nAge element title attribute:", articles[0].debugInfo.ageElementTitle);
      console.log("Link element found:", articles[0].debugInfo.hasLinkElement);
      if (articles[0].debugInfo.linkAttributes) {
        console.log("Link attributes:", JSON.stringify(articles[0].debugInfo.linkAttributes, null, 2));
      }
      
      if (articles[0].ageLink) {
        const testDate = new Date(articles[0].ageLink);
        console.log("\nTimestamp parsing:");
        console.log("Raw ageLink value:", articles[0].ageLink);
        console.log("Parsed as:", testDate.toISOString());
        console.log("Is valid:", !isNaN(testDate.getTime()));
      } else {
        console.log("\n⚠️  No timestamp found - will use item ID fallback");
      }
      console.log("=".repeat(80) + "\n");
    }

    // If we need more articles, click "More" link
    if (articles.length < targetCount) {
      const moreLink = await page.$(".morelink");
      if (moreLink) {
        await moreLink.click();
        // Wait for navigation
        await page.waitForLoadState("networkidle");
      } else {
        console.log("No more articles available.");
        break;
      }
    }
  }

  console.log(`\nCollected ${articles.length} articles total.\n`);

  // Parse timestamps and validate sorting
  const timestamps = [];
  let usingFallback = false;
  let fallbackCount = 0;
  
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    let timestamp = null;
    let timestampMs = null;

    // Try to parse the timestamp from ageLink
    if (article.ageLink) {
      const parsedDate = new Date(article.ageLink);
      
      if (!isNaN(parsedDate.getTime())) {
        timestamp = parsedDate;
        timestampMs = parsedDate.getTime();
      }
    }
    
    // Fallback: Use item ID as a proxy (HN IDs are sequential, higher = newer)
    if (!timestamp && article.id) {
      const itemId = parseInt(article.id, 10);
      if (!isNaN(itemId)) {
        // Use item ID directly (higher ID = newer = higher number, like timestamps)
        timestampMs = itemId;
        usingFallback = true;
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
      console.error(`Warning: Article ${i + 1} has no valid timestamp or ID`);
    }
  }

  if (timestamps.length === 0) {
    console.error("\n✗ ERROR: No valid timestamps or IDs found!");
    console.error("This likely means the page structure has changed.");
    await browser.close();
    process.exit(1);
  }

  if (timestamps.length < articles.length) {
    console.log(`\nNote: Only ${timestamps.length} out of ${articles.length} articles had valid data.\n`);
  }
  
  if (usingFallback) {
    console.log(`\nNote: ${fallbackCount} article(s) missing timestamps - using item IDs as fallback.\n`);
  }

  // Validate sorting (newest to oldest = descending timestamps)
  let isSorted = true;
  const violations = [];

  for (let i = 0; i < timestamps.length - 1; i++) {
    const current = timestamps[i];
    const next = timestamps[i + 1];

    if (current.timestampMs < next.timestampMs) {
      isSorted = false;
      violations.push({
        position: i + 1,
        current: current,
        next: next,
      });
    }
  }

  // Display results
  console.log("=".repeat(80));
  console.log("VALIDATION RESULTS");
  console.log("=".repeat(80));
  console.log(`Total articles analyzed: ${timestamps.length}`);
  console.log(`Sorting validation: ${isSorted ? "PASSED ✓" : "FAILED ✗"}`);
  console.log("=".repeat(80));

  // Display all articles with absolute timestamps
  if (isVerbose) {
    console.log("\nAll articles with absolute timestamps:\n");
    timestamps.forEach((article) => {
      let timeDisplay;
      if (article.timestamp) {
        timeDisplay = article.timestamp.toISOString();
      } else {
        // Using item ID fallback
        timeDisplay = `Item ID: ${article.itemId} (no timestamp)`;
      }
      console.log(
        `${String(article.index).padStart(3, " ")}. ${timeDisplay} | ${article.title}`
      );
    });
  } else {
    // Show only first 5 and last 5 articles with relative timestamps
    console.log("\nFirst 5 articles:\n");
    for (let i = 0; i < Math.min(5, timestamps.length); i++) {
      const article = timestamps[i];
      const timeDisplay = article.ageText ? `[${article.ageText}]` : `[Item ID: ${article.itemId}]`;
      console.log(
        `${String(article.index).padStart(3, " ")}. ${timeDisplay} ${article.title}`
      );
    }

    console.log("\n...\n");
    
    console.log("Last 5 articles:\n");
    for (let i = Math.max(0, timestamps.length - 5); i < timestamps.length; i++) {
      const article = timestamps[i];
      const timeDisplay = article.ageText ? `[${article.ageText}]` : `[Item ID: ${article.itemId}]`;
      console.log(
        `${String(article.index).padStart(3, " ")}. ${timeDisplay} ${article.title}`
      );
    }
    
    console.log("\n(Use --verbose or -v to see all 100 articles with absolute timestamps)");
    console.log("(Use --debug or -d to see detailed extraction debugging info)");
  }

  if (isSorted) {
    console.log("\n" + "=".repeat(80));
    console.log("✓ SUCCESS: All articles are correctly sorted from newest to oldest.");
    console.log("=".repeat(80));
  } else {
    console.log("\n" + "=".repeat(80));
    console.log(`✗ FAILURE: Found ${violations.length} sorting violation(s):`);
    console.log("=".repeat(80));

    violations.forEach((v, idx) => {
      console.log(`\nViolation ${idx + 1}:`);
      
      if (v.current.timestamp && v.next.timestamp) {
        console.log(
          `  Article ${v.current.index}: ${v.current.timestamp.toISOString()}`
        );
        console.log(
          `  Article ${v.next.index}: ${v.next.timestamp.toISOString()}`
        );
      } else {
        console.log(
          `  Article ${v.current.index}: Item ID ${v.current.itemId}`
        );
        console.log(
          `  Article ${v.next.index}: Item ID ${v.next.itemId}`
        );
      }
      
      console.log(
        `  Problem: Article ${v.next.index} is NEWER but appears AFTER article ${v.current.index}`
      );
    });
    console.log("\n" + "=".repeat(80));
  }

  await browser.close();
  
  // Exit with appropriate code
  process.exit(isSorted ? 0 : 1);
}

(async () => {
  await sortHackerNewsArticles();
})();