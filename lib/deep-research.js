const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Deep scrape multiple pages from company website
 */
async function deepScrapeWebsite(companyName, baseUrl) {
  const pages = [];
  const visited = new Set();
  const maxPages = 10;
  
  async function scrapePage(url, depth = 0) {
    if (depth >= 3 || pages.length >= maxPages || visited.has(url)) return;
    
    visited.add(url);
    
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 8000
      });
      
      const $ = cheerio.load(response.data);
      $('script, style, noscript, iframe').remove();
      
      const pageData = {
        url,
        title: $('title').text(),
        metaDescription: $('meta[name="description"]').attr('content') || '',
        headings: $('h1, h2, h3').map((i, el) => $(el).text().trim()).get(),
        content: $('body').text().replace(/\s+/g, ' ').trim().substring(0, 2000),
        links: []
      };
      
      pages.push(pageData);
      
      // Find relevant internal links
      $('a[href]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && (href.includes('about') || href.includes('product') || href.includes('team') || href.includes('tech'))) {
          const fullUrl = new URL(href, url).href;
          if (fullUrl.startsWith(baseUrl) && !visited.has(fullUrl)) {
            pageData.links.push(fullUrl);
          }
        }
      });
      
      // Recursively scrape important pages
      for (const link of pageData.links.slice(0, 3)) {
        await scrapePage(link, depth + 1);
      }
      
    } catch (error) {
      console.error(`Error scraping ${url}:`, error.message);
    }
  }
  
  await scrapePage(baseUrl);
  return pages;
}

/**
 * Get comprehensive GitHub data
 */
async function getGitHubAnalysis(companyName) {
  try {
    const orgName = companyName.toLowerCase().replace(/\s+/g, '-');
    
    // Get organization info
    const orgResponse = await axios.get(`https://api.github.com/orgs/${orgName}`, {
      headers: { 
        'User-Agent': 'Interview-Prep-Tool',
        'Accept': 'application/vnd.github.v3+json'
      }
    }).catch(() => null);
    
    // Get repositories
    const reposResponse = await axios.get(`https://api.github.com/search/repositories`, {
      params: {
        q: `org:${orgName} OR user:${orgName}`,
        sort: 'stars',
        per_page: 20
      },
      headers: { 
        'User-Agent': 'Interview-Prep-Tool',
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    const repos = reposResponse.data.items || [];
    const techStack = new Set();
    const topRepos = [];
    
    for (const repo of repos.slice(0, 10)) {
      // Get languages
      try {
        const langResponse = await axios.get(repo.languages_url, {
          headers: { 'User-Agent': 'Interview-Prep-Tool' }
        });
        Object.keys(langResponse.data).forEach(lang => techStack.add(lang));
      } catch (e) {}
      
      // Get recent commits
      try {
        const commitsResponse = await axios.get(repo.commits_url.replace('{/sha}', ''), {
          params: { per_page: 5 },
          headers: { 'User-Agent': 'Interview-Prep-Tool' }
        });
        
        topRepos.push({
          name: repo.name,
          description: repo.description,
          stars: repo.stargazers_count,
          language: repo.language,
          recentActivity: commitsResponse.data.length > 0 ? 
            commitsResponse.data[0].commit.committer.date : null,
          contributors: repo.contributors_url
        });
      } catch (e) {}
    }
    
    return {
      organization: orgResponse?.data || null,
      repositories: topRepos,
      techStack: Array.from(techStack),
      totalRepos: repos.length
    };
    
  } catch (error) {
    console.error('GitHub analysis error:', error.message);
    return null;
  }
}

/**
 * Get recent news articles
 */
async function getRecentNews(companyName) {
  try {
    // Using NewsAPI (you'll need to add NEWSAPI_KEY to env)
    if (!process.env.NEWSAPI_KEY) {
      return { articles: [], note: 'NewsAPI key not configured' };
    }
    
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: companyName,
        sortBy: 'publishedAt',
        language: 'en',
        pageSize: 10,
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      headers: {
        'X-Api-Key': process.env.NEWSAPI_KEY
      }
    });
    
    return {
      articles: response.data.articles.map(a => ({
        title: a.title,
        description: a.description,
        url: a.url,
        publishedAt: a.publishedAt,
        source: a.source.name
      }))
    };
    
  } catch (error) {
    return { articles: [], error: error.message };
  }
}

/**
 * Get Crunchbase data (requires API key)
 */
async function getCrunchbaseData(companyName) {
  try {
    if (!process.env.CRUNCHBASE_API_KEY) {
      return { note: 'Crunchbase API key not configured' };
    }
    
    const response = await axios.get(`https://api.crunchbase.com/api/v4/autocompletes`, {
      params: {
        query: companyName,
        collection_ids: 'organizations'
      },
      headers: {
        'X-cb-user-key': process.env.CRUNCHBASE_API_KEY
      }
    });
    
    return response.data;
    
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Perform comprehensive deep research
 */
async function performDeepResearch(companyName) {
  console.log(`\n🚀 Starting DEEP research for: ${companyName}`);
  
  const knownCompanies = {
    'stripe': 'https://stripe.com',
    'vercel': 'https://vercel.com',
    'railway': 'https://railway.app',
    'anthropic': 'https://anthropic.com',
    'openai': 'https://openai.com',
    'github': 'https://github.com',
    'linear': 'https://linear.app'
  };
  
  const companyKey = companyName.toLowerCase().replace(/\s+/g, '');
  const websiteUrl = knownCompanies[companyKey];
  
  // Parallel data gathering
  const [websiteData, githubData, newsData, crunchbaseData] = await Promise.all([
    websiteUrl ? deepScrapeWebsite(companyName, websiteUrl) : Promise.resolve([]),
    getGitHubAnalysis(companyName),
    getRecentNews(companyName),
    getCrunchbaseData(companyName)
  ]);
  
  // Compile all research
  const compiledResearch = {
    company: companyName,
    website: {
      url: websiteUrl || 'Not found',
      pages: websiteData.length,
      data: websiteData
    },
    github: githubData,
    news: newsData,
    crunchbase: crunchbaseData,
    researchedAt: new Date().toISOString()
  };
  
  // Generate AI analysis
  const aiAnalysis = await generateComprehensiveAnalysis(compiledResearch);
  
  return {
    ...aiAnalysis,
    rawResearch: compiledResearch,
    sources: {
      website: websiteUrl,
      github: githubData?.repositories?.length || 0,
      news: newsData?.articles?.length || 0,
      pagesScraped: websiteData.length
    }
  };
}

/**
 * Generate comprehensive AI analysis from all gathered data
 */
async function generateComprehensiveAnalysis(research) {
  const prompt = `You are an expert interview preparation assistant. Analyze this comprehensive company research and generate a detailed interview prep guide.

RESEARCH DATA:
${JSON.stringify(research, null, 2)}

Generate a comprehensive JSON response with:
{
  "companyName": "Company name",
  "overview": "Detailed 3-4 sentence overview based on all sources",
  "products": ["List of main products/services found"],
  "techStack": ["Complete tech stack from GitHub + website"],
  "recentNews": ["Key recent developments from news"],
  "companySize": "Estimated company size/stage",
  "funding": "Funding info if available from Crunchbase",
  "culture": ["Cultural insights from website/about pages"],
  "interviewQuestions": [
    "15-20 specific, role-relevant questions based on their tech stack",
    "Include behavioral, technical, and company-specific questions"
  ],
  "preparationTips": [
    "10+ specific tips based on their tech, products, and recent news",
    "Include project suggestions relevant to their stack"
  ],
  "keyTopics": ["Important topics to study based on their tech stack"],
  "companyValues": ["Values found on their website"],
  "teamInsights": "Insights about team structure from GitHub activity",
  "competitorAnalysis": "Brief note on competitive landscape",
  "whyWorkHere": ["Compelling reasons to work at this company"],
  "redFlags": ["Any potential concerns or challenges to be aware of"]
}

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    let responseText = message.content[0].text;
    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    const analysis = JSON.parse(responseText);
    return {
      ...analysis,
      metadata: {
        researchedAt: new Date().toISOString(),
        version: '3.0.0-deep',
        model: 'claude-3-haiku'
      }
    };
    
  } catch (error) {
    console.error('AI analysis error:', error);
    return {
      companyName: research.company,
      overview: 'Deep research completed. AI analysis unavailable.',
      error: error.message,
      metadata: {
        researchedAt: new Date().toISOString()
      }
    };
  }
}

module.exports = {
  performDeepResearch
};
