const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Scrape company website for information
 */
async function scrapeCompanyWebsite(companyName) {
  try {
    console.log(`🔍 Searching for ${companyName} website...`);
    
    // Try to find company website via search
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(companyName + ' company website')}`;
    
    // For demo purposes, we'll use some known patterns
    // In production, you might want to use a proper search API
    const knownCompanies = {
      'railway': 'https://railway.app',
      'toast': 'https://pos.toasttab.com',
      'stripe': 'https://stripe.com',
      'trigger.dev': 'https://trigger.dev',
      'linear': 'https://linear.app',
      'anthropic': 'https://anthropic.com'
    };
    
    const companyKey = companyName.toLowerCase().replace(/\s+/g, '');
    const websiteUrl = knownCompanies[companyKey];
    
    if (!websiteUrl) {
      console.log(`⚠️  Website not found for ${companyName}, using general search`);
      return {
        url: null,
        content: null,
        error: 'Website URL not found'
      };
    }
    
    console.log(`📄 Scraping ${websiteUrl}...`);
    
    const response = await axios.get(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    // Remove script and style tags
    $('script, style, noscript').remove();
    
    // Extract main content
    const title = $('title').text();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const h1s = $('h1').map((i, el) => $(el).text().trim()).get().join(' | ');
    const h2s = $('h2').map((i, el) => $(el).text().trim()).get().slice(0, 5).join(' | ');
    
    // Get main content (limit to avoid token limits)
    let bodyText = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 3000);
    
    return {
      url: websiteUrl,
      title,
      metaDescription,
      headings: { h1s, h2s },
      content: bodyText
    };
    
  } catch (error) {
    console.error(`Error scraping website for ${companyName}:`, error.message);
    return {
      url: null,
      content: null,
      error: error.message
    };
  }
}

/**
 * Search GitHub for company repositories
 */
async function searchGitHubRepos(companyName) {
  try {
    console.log(`🔍 Searching GitHub for ${companyName}...`);
    
    const response = await axios.get(`https://api.github.com/search/repositories`, {
      params: {
        q: `org:${companyName.toLowerCase().replace(/\s+/g, '')} OR user:${companyName.toLowerCase().replace(/\s+/g, '')}`,
        sort: 'stars',
        per_page: 5
      },
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Interview-Prep-Tool'
      },
      timeout: 10000
    });
    
    const repos = response.data.items.map(repo => ({
      name: repo.name,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      url: repo.html_url
    }));
    
    // Extract tech stack from languages
    const languages = [...new Set(repos.map(r => r.language).filter(Boolean))];
    
    return {
      repositories: repos,
      techStack: languages
    };
    
  } catch (error) {
    console.error(`Error searching GitHub for ${companyName}:`, error.message);
    return {
      repositories: [],
      techStack: [],
      error: error.message
    };
  }
}

/**
 * Use Claude to analyze and generate interview prep report
 */
async function analyzeWithClaude(companyName, jobRole, scrapedData, githubData) {
  console.log(`🤖 Researching ${companyName} for ${jobRole} role with Claude...`);
  
  const prompt = `You are an expert technical researcher and interview coach. DO THE ACTUAL RESEARCH - don't tell them to research.

EXAMPLES OF BAD (GENERIC) RESPONSES:
❌ "Research their main product features"
❌ "Look into their technology stack"
❌ "Study their company culture"
❌ "Understand their business model"

EXAMPLES OF GOOD (ACTUAL RESEARCH) RESPONSES:
✅ "${companyName} builds [specific product] that does [specific thing]. Their main customers are [who] and they solve [problem]."
✅ "They use React, Node.js, and PostgreSQL in production (based on their job postings and GitHub repos)"
✅ "Their engineering blog shows they face challenges with [specific technical problem]"
✅ "They recently raised [$X] Series [Y] from [investors], indicating they're focused on [growth area]"

YOUR TASK: Provide ACTUAL research findings about ${companyName} for a ${jobRole} interview:
1. What their products actually do (be specific)
2. Technologies they actually use (from data below + your knowledge)
3. Specific technical challenges they face
4. Real interview questions they would ask
5. Concrete preparation steps with actual details

COMPANY DATA:
Website: ${scrapedData.url || 'Not found'}
${scrapedData.title ? `Title: ${scrapedData.title}` : ''}
${scrapedData.metaDescription ? `Description: ${scrapedData.metaDescription}` : ''}
${scrapedData.headings?.h1s ? `Main Headings: ${scrapedData.headings.h1s}` : ''}
${scrapedData.content ? `Content:\n${scrapedData.content.substring(0, 2000)}` : ''}

GITHUB REPOSITORIES:
${githubData.repositories.length > 0 ? JSON.stringify(githubData.repositories, null, 2) : 'None found'}
Tech Languages: ${githubData.techStack.length > 0 ? githubData.techStack.join(', ') : 'Not available'}

Generate a detailed JSON response:

{
  "companyName": "${companyName}",
  "jobRole": "${jobRole}",
  "overview": "What the company actually does - be specific about their product and market position",
  "products": ["Specific product 1 with brief description", "Product 2", "Feature 3"],
  "techStack": ["List actual tech they use based on data", "Not generic list"],
  "salaryRange": {"min": estimated_low, "max": estimated_high},
  "interviewQuestions": [
    "Specific technical question about their products/tech",
    "Specific system design question they would ask for this role",
    "Specific coding question relevant to their domain",
    "Tell me about a project where you solved X (problem they face)",
    "How would you approach building/scaling X (their product)?"
  ],
  "preparationTips": [
    "ACTUAL preparation with details: e.g. '${companyName} uses Kubernetes for container orchestration. Review how they handle service mesh based on their engineering blog post from [date]'",
    "ACTUAL insight: e.g. 'They process 1M+ API requests/day. Brush up on rate limiting strategies and caching patterns they likely use'",
    "ACTUAL finding: e.g. 'Their CTO mentioned in a recent talk that they're migrating from monolith to microservices. Prepare to discuss migration strategies'"
  ],
  "keyTopics": ["Topic 1 specific to their domain", "Topic 2", "Topic 3"],
  "domainChallenges": ["Challenge they face", "Another challenge", "Third challenge"],
  "companyValues": ["Value 1", "Value 2"]
}

CRITICAL INSTRUCTIONS - THIS IS THE MOST IMPORTANT PART:
❌ NEVER say: "Research X", "Study Y", "Look into Z", "Understand A", "Review B", "Familiarize yourself with C"
✅ ALWAYS say: "X does [actual thing]. They use [actual tech]. Their challenge is [actual problem]."

- Every "preparationTip" must contain ACTUAL findings, not instructions to research
- Every statement must be SPECIFIC to ${companyName} - use their actual products, actual tech, actual problems
- Use the scraped data and GitHub data to inform your response
- If data is limited, use your knowledge about ${companyName} to provide REAL insights
- Return ONLY valid JSON, no markdown, no extra text

Generate the ACTUAL research now (not instructions to research):`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract JSON from response
    let responseText = message.content[0].text;
    
    // Remove markdown code blocks if present
    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Parse JSON
    const analysis = JSON.parse(responseText);
    
    console.log(`✅ Research complete for ${companyName}`);
    return analysis;
    
  } catch (error) {
    console.error('Error analyzing with Claude:', error.message);
    
    // Return a basic fallback structure if Claude fails
    return {
      companyName,
      jobRole,
      overview: `${companyName} is a technology company.`,
      products: ['Primary product', 'Secondary product'],
      techStack: githubData.techStack.length > 0 ? githubData.techStack : ['JavaScript', 'Python', 'React'],
      interviewQuestions: [
        `Why is the system architecture of ${companyName}'s product designed this way?`,
        'Walk me through a scaling challenge with this architecture',
        'How would you optimize performance for X use case?',
        'Tell me about a time you solved a complex technical problem',
        'How do you approach debugging production issues?'
      ],
      preparationTips: [
        `Understand ${companyName}'s product architecture and how it works`,
        `Review the technology stack: ${githubData.techStack.join(', ') || 'JavaScript/Python/React'}`,
        `Study how they handle scale, performance, and reliability`
      ],
      keyTopics: ['Architecture', 'Performance', 'Scalability', 'System Design'],
      companyValues: [],
      researchedAt: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Main function to perform complete company research
 */
async function performResearch(companyName, jobRole = 'Software Engineer') {
  console.log(`\n🚀 Starting research for: ${companyName} (${jobRole})`);
  console.log('=' .repeat(50));
  
  try {
    // Run scraping and GitHub search in parallel
    const [scrapedData, githubData] = await Promise.all([
      scrapeCompanyWebsite(companyName),
      searchGitHubRepos(companyName)
    ]);
    
    // Analyze with Claude - now passing jobRole
    const analysis = await analyzeWithClaude(companyName, jobRole, scrapedData, githubData);
    
    // Combine all data
    const result = {
      ...analysis,
      sources: {
        website: scrapedData.url || 'Not available',
        github: githubData.repositories.length > 0 ? 
          `Found ${githubData.repositories.length} repositories` : 
          'No public repositories found'
      },
      metadata: {
        researchedAt: new Date().toISOString(),
        version: '2.0.0'
      }
    };
    
    console.log('✅ Research complete!');
    console.log('=' .repeat(50) + '\n');
    
    return result;
    
  } catch (error) {
    console.error(`❌ Research failed for ${companyName}:`, error);
    throw new Error(`Failed to research ${companyName}: ${error.message}`);
  }
}

module.exports = {
  performResearch,
  scrapeCompanyWebsite,
  searchGitHubRepos,
  analyzeWithClaude
};
