import { task } from "@trigger.dev/sdk/v3";
import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import cheerio from "cheerio";
import { Pool } from "pg";

// Initialize clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

/**
 * Task 1: Scrape company website
 * Runs as independent Trigger.dev task with retries
 */
export const scrapeWebsiteTask = task({
  id: "scrape-website",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async (payload: { companyName: string; companyUrl?: string }) => {
    console.log(`[scrapeWebsiteTask] Starting for ${payload.companyName}`);

    try {
      const knownCompanies: { [key: string]: string } = {
        railway: "https://railway.app",
        posthog: "https://posthog.com",
        toast: "https://pos.toasttab.com",
        stripe: "https://stripe.com",
        "trigger.dev": "https://trigger.dev",
        linear: "https://linear.app",
        anthropic: "https://anthropic.com",
      };

      const companyKey = payload.companyName.toLowerCase().replace(/\s+/g, "");
      const websiteUrl = payload.companyUrl || knownCompanies[companyKey];

      if (!websiteUrl) {
        console.log(`⚠️ Website not found for ${payload.companyName}`);
        return {
          url: null,
          content: null,
          error: "Website URL not found",
        };
      }

      console.log(`📄 Scraping ${websiteUrl}...`);

      const response = await axios.get(websiteUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);
      $("script, style, noscript").remove();

      const title = $("title").text();
      const metaDescription = $('meta[name="description"]').attr("content") || "";
      const h1s = $("h1")
        .map((i, el) => $(el).text().trim())
        .get()
        .join(" | ");
      const h2s = $("h2")
        .map((i, el) => $(el).text().trim())
        .get()
        .slice(0, 5)
        .join(" | ");

      let bodyText = $("body")
        .text()
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 3000);

      console.log(`✅ Scraped ${websiteUrl}`);

      return {
        url: websiteUrl,
        title,
        metaDescription,
        headings: { h1s, h2s },
        content: bodyText,
      };
    } catch (error: any) {
      console.error(`Error scraping website:`, error.message);
      throw new Error(`Failed to scrape website: ${error.message}`);
    }
  },
});

/**
 * Task 2: Search GitHub repos
 * Runs as independent Trigger.dev task with retries
 */
export const searchGitHubTask = task({
  id: "search-github",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async (payload: { companyName: string }) => {
    console.log(`[searchGitHubTask] Starting for ${payload.companyName}`);

    try {
      const response = await axios.get(`https://api.github.com/search/repositories`, {
        params: {
          q: `org:${payload.companyName
            .toLowerCase()
            .replace(/\s+/g, "")} OR user:${payload.companyName
            .toLowerCase()
            .replace(/\s+/g, "")}`,
          sort: "stars",
          per_page: 5,
        },
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Interview-Prep-Tool-Trigger",
        },
        timeout: 10000,
      });

      const repos = response.data.items.map((repo: any) => ({
        name: repo.name,
        description: repo.description,
        language: repo.language,
        stars: repo.stargazers_count,
        url: repo.html_url,
      }));

      const languages = [...new Set(repos.map((r: any) => r.language).filter(Boolean))];

      console.log(`✅ Found ${repos.length} GitHub repos for ${payload.companyName}`);

      return {
        repositories: repos,
        techStack: languages,
      };
    } catch (error: any) {
      console.error(`Error searching GitHub:`, error.message);
      // GitHub errors are not critical - return empty
      return {
        repositories: [],
        techStack: [],
        error: error.message,
      };
    }
  },
});

/**
 * Task 3: Analyze with Claude
 * Generates interview briefing from scraped data
 */
export const analyzeWithClaudeTask = task({
  id: "analyze-with-claude",
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 15000,
  },
  run: async (payload: {
    companyName: string;
    scrapedData: any;
    githubData: any;
    role?: string;
  }) => {
    console.log(
      `[analyzeWithClaudeTask] Starting for ${payload.companyName}${
        payload.role ? ` - ${payload.role}` : ""
      }`
    );

    const { companyName, scrapedData, githubData, role } = payload;

    const roleContext = role
      ? `\n\nROLE CONTEXT:\nThe user is preparing for a ${role} position at ${companyName}.`
      : "";

    const prompt = `You are an expert career coach helping a software engineer prepare for interviews.

Analyze the following information about ${companyName} and create a comprehensive interview preparation report.${roleContext}

COMPANY WEBSITE DATA:
${scrapedData.url ? `URL: ${scrapedData.url}` : "No website data available"}
${scrapedData.title ? `Title: ${scrapedData.title}` : ""}
${scrapedData.metaDescription ? `Description: ${scrapedData.metaDescription}` : ""}
${scrapedData.headings?.h1s ? `Main Headings: ${scrapedData.headings.h1s}` : ""}
${scrapedData.content ? `Content Preview: ${scrapedData.content.substring(0, 1500)}` : "Limited website content available"}

GITHUB DATA:
Repositories: ${
      githubData.repositories.length > 0
        ? JSON.stringify(githubData.repositories, null, 2)
        : "No public repositories found"
    }
Tech Stack: ${
      githubData.techStack.length > 0
        ? githubData.techStack.join(", ")
        : "Not available from GitHub"
    }

Please generate a JSON response with the following structure:

{
  "companyName": "${companyName}",
  "overview": "2-3 sentence company overview",
  "products": ["product1", "product2"],
  "techStack": ["tech1", "tech2", "tech3"],
  "averageSalary": 150000,
  "salaryRange": { "min": 120000, "max": 200000 },
  "interviewQuestions": [
    "Question 1 specific to this company",
    "Question 2 about their tech stack",
    "Question 3 about their product",
    "Question 4 behavioral",
    "Question 5 technical"
  ],
  "preparationTips": [
    "Tip 1 specific to this company",
    "Tip 2",
    "Tip 3"
  ],
  "keyTopics": ["topic1", "topic2", "topic3"],
  "companyValues": ["value1", "value2"],
  "executiveSummary": "Executive summary paragraph",
  "keyTalkingPoints": ["point1", "point2"],
  "topChallenges": ["challenge1", "challenge2"],
  "cultureInsights": "Culture description",
  "smartQuestions": ["question1", "question2"],
  "redFlags": ["flag1", "flag2"],
  "prepChecklist": ["item1", "item2"]
}

INSTRUCTIONS:
1. Be specific to ${companyName} - use the actual data provided
2. Return ONLY valid JSON, no markdown, no extra text
3. If data is limited, make educated assumptions
4. Include ALL fields from the schema
5. Generate exactly 5 interview questions minimum
6. Generate exactly 3-5 preparation tips
7. Generate 3-5 smart questions to ask
8. Generate 3-5 red flags to watch

Generate the interview prep report now:`;

    try {
      const message = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 4096,
        temperature: 0.7,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      let responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      responseText = responseText.replace(/```json\s*/g, "").replace(/```\s*/g, "");

      const analysis = JSON.parse(responseText);
      console.log(`✅ Claude analysis complete for ${companyName}`);

      return analysis;
    } catch (error: any) {
      console.error(`Error analyzing with Claude:`, error.message);

      // Return fallback structure
      return {
        companyName,
        overview: `${companyName} is a technology company. Research data was limited.`,
        products: [],
        techStack: githubData.techStack.length > 0 ? githubData.techStack : ["JavaScript", "Python", "React"],
        averageSalary: 150000,
        salaryRange: { min: 120000, max: 180000 },
        interviewQuestions: [
          `Tell me about yourself and why you're interested in ${companyName}`,
          "Describe a challenging technical problem you solved",
          "How do you approach system design?",
          "Tell me about a time you worked in a team",
          "What are your career goals?",
        ],
        preparationTips: [
          `Research ${companyName}'s products and services thoroughly`,
          "Prepare examples of relevant projects",
          "Review system design fundamentals",
        ],
        keyTopics: ["System Design", "Algorithms", "Behavioral Questions"],
        companyValues: [],
        executiveSummary: `${companyName} is a technology company.`,
        keyTalkingPoints: ["Passion for learning", "Relevant experience"],
        topChallenges: ["Scaling", "Technical depth"],
        cultureInsights: "Collaborative engineering culture",
        smartQuestions: ["How do you approach learning?", "What's the team structure?"],
        redFlags: ["Unclear growth path", "High turnover"],
        prepChecklist: ["Research company", "Practice coding", "Prepare stories"],
        error: error.message,
      };
    }
  },
});

/**
 * Task 4: Store research results
 * Saves to PostgreSQL database
 */
export const storeResearchTask = task({
  id: "store-research",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 5000,
  },
  run: async (payload: {
    jobId: string;
    companyName: string;
    role?: string;
    deepMode: boolean;
    analysis: any;
    scrapedData: any;
    githubData: any;
  }) => {
    console.log(`[storeResearchTask] Saving results for job ${payload.jobId}`);

    try {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        // Insert/update company research
        const companyQuery = `
          INSERT INTO companies (name, research_data, stage, last_researched)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
          ON CONFLICT (name) DO UPDATE SET
            research_data = EXCLUDED.research_data,
            last_researched = CURRENT_TIMESTAMP
          RETURNING id
        `;

        const researchData = {
          ...payload.analysis,
          sources: {
            website: payload.scrapedData.url || "Not available",
            github:
              payload.githubData.repositories.length > 0
                ? `Found ${payload.githubData.repositories.length} repositories`
                : "No public repositories found",
          },
          metadata: {
            researchedAt: new Date().toISOString(),
            role: payload.role,
            deepMode: payload.deepMode,
            version: "3.0.0",
          },
        };

        const companyResult = await client.query(companyQuery, [
          payload.companyName,
          JSON.stringify(researchData),
          "research",
        ]);

        const companyId = companyResult.rows[0].id;

        // Insert research history for versioning
        const historyQuery = `
          INSERT INTO research_history (company_id, research_data, created_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
        `;

        await client.query(historyQuery, [companyId, JSON.stringify(researchData)]);

        // Update job status in database (using batch_jobs table as tracking)
        const jobQuery = `
          UPDATE batch_jobs
          SET status = 'completed', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `;

        await client.query(jobQuery, [payload.jobId]);

        await client.query("COMMIT");

        console.log(`✅ Stored research for ${payload.companyName} (company_id: ${companyId})`);

        return {
          success: true,
          companyId,
          jobId: payload.jobId,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error(`Error storing research:`, error.message);
      throw new Error(`Failed to store research: ${error.message}`);
    }
  },
});

/**
 * Main orchestration task: Company Research Job
 * Chains all subtasks together and handles failures
 */
export const companyResearchJob = task({
  id: "company-research-job",
  retry: {
    maxAttempts: 1, // Don't retry the whole flow, individual tasks handle retries
  },
  run: async (payload: {
    jobId: string;
    companyName: string;
    companyUrl?: string;
    role?: string;
    deepMode: boolean;
  }) => {
    console.log(
      `\n🚀 [companyResearchJob] Starting async research for ${payload.companyName} (Job: ${payload.jobId})`
    );
    console.log("=".repeat(60));

    try {
      // Step 1: Scrape website and search GitHub in parallel
      console.log("📡 Step 1: Fetching company information...");
      const [scrapedData, githubData] = await Promise.all([
        scrapeWebsiteTask.triggerAndWait({
          companyName: payload.companyName,
          companyUrl: payload.companyUrl,
        }),
        searchGitHubTask.triggerAndWait({
          companyName: payload.companyName,
        }),
      ]);

      console.log(`✅ Step 1 complete`);

      // Step 2: Analyze with Claude
      console.log("🤖 Step 2: Generating interview briefing...");
      const analysis = await analyzeWithClaudeTask.triggerAndWait({
        companyName: payload.companyName,
        scrapedData,
        githubData,
        role: payload.role,
      });

      console.log(`✅ Step 2 complete`);

      // Step 3: Store results
      console.log("💾 Step 3: Storing results in database...");
      const storeResult = await storeResearchTask.triggerAndWait({
        jobId: payload.jobId,
        companyName: payload.companyName,
        role: payload.role,
        deepMode: payload.deepMode,
        analysis,
        scrapedData,
        githubData,
      });

      console.log("=".repeat(60));
      console.log(`✅ [companyResearchJob] Complete!\n`);

      return {
        success: true,
        jobId: payload.jobId,
        companyName: payload.companyName,
        role: payload.role,
        completedAt: new Date().toISOString(),
        analysis,
        ...storeResult,
      };
    } catch (error: any) {
      console.error(
        `❌ [companyResearchJob] Failed for ${payload.companyName}:`,
        error.message
      );

      // Try to mark job as failed in database
      try {
        const client = await pool.connect();
        await client.query(
          `UPDATE batch_jobs SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [payload.jobId]
        );
        client.release();
      } catch (dbError) {
        console.error("Could not update job status:", dbError);
      }

      throw error;
    }
  },
});

export default companyResearchJob;
