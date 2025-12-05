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
      'posthog': 'https://posthog.com',
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
async function analyzeWithClaude(companyName, scrapedData, githubData) {
  console.log(`🤖 Analyzing ${companyName} with Claude...`);
  
  const prompt = `You are an expert career coach helping a software engineer prepare for interviews. 

Analyze the following information about ${companyName} and create a comprehensive interview preparation report.

COMPANY WEBSITE DATA:
${scrapedData.url ? `URL: ${scrapedData.url}` : 'No website data available'}
${scrapedData.title ? `Title: ${scrapedData.title}` : ''}
${scrapedData.metaDescription ? `Description: ${scrapedData.metaDescription}` : ''}
${scrapedData.headings?.h1s ? `Main Headings: ${scrapedData.headings.h1s}` : ''}
${scrapedData.content ? `Content Preview: ${scrapedData.content.substring(0, 1500)}` : 'Limited website content available'}

GITHUB DATA:
Repositories: ${githubData.repositories.length > 0 ? JSON.stringify(githubData.repositories, null, 2) : 'No public repositories found'}
Tech Stack: ${githubData.techStack.length > 0 ? githubData.techStack.join(', ') : 'Not available from GitHub'}

Please generate a JSON response with the following structure:

{
  "companyName": "${companyName}",
  "overview": "2-3 sentence company overview",
  "products": ["product1", "product2"],
  "techStack": ["tech1", "tech2", "tech3"],
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
  "researchedAt": "${new Date().toISOString()}"
}

INSTRUCTIONS:
1. Be specific to ${companyName} - use the actual data provided
2. Interview questions should be realistic and company-specific
3. Tech stack should include languages, frameworks, and tools they actually use
4. If data is limited, make educated assumptions based on company name and available info
5. Keep overview concise but informative
6. Return ONLY valid JSON, no markdown formatting, no extra text
7. If data is limited, make informed assumptions based on the company name and any available information

Generate the interview prep report now:`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
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
    
    console.log(`✅ Claude analysis complete for ${companyName}`);
    return analysis;
    
  } catch (error) {
    console.error('Error analyzing with Claude:', error.message);
    
    // Return a basic fallback structure if Claude fails
    return {
      companyName,
      overview: `${companyName} is a technology company. Research data was limited.`,
      products: [],
      techStack: githubData.techStack.length > 0 ? githubData.techStack : ['JavaScript', 'Python', 'React'],
      interviewQuestions: [
        `Tell me about yourself and why you're interested in ${companyName}`,
        'Describe a challenging technical problem you solved',
        'How do you approach system design?',
        'Tell me about a time you worked in a team',
        'What are your career goals?'
      ],
      preparationTips: [
        `Research ${companyName}'s products and services thoroughly`,
        'Prepare examples of relevant projects',
        'Review system design fundamentals'
      ],
      keyTopics: ['System Design', 'Algorithms', 'Behavioral Questions'],
      companyValues: [],
      researchedAt: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Main function to perform complete company research
 */
async function performResearch(companyName) {
  console.log(`\n🚀 Starting research for: ${companyName}`);
  console.log('=' .repeat(50));
  
  try {
    // Run scraping and GitHub search in parallel
    const [scrapedData, githubData] = await Promise.all([
      scrapeCompanyWebsite(companyName),
      searchGitHubRepos(companyName)
    ]);
    
    // Analyze with Claude
    const analysis = await analyzeWithClaude(companyName, scrapedData, githubData);
    
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
