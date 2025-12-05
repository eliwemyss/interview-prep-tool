const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Comprehensive role-specific interview research
 */
async function performEnhancedResearch(companyName, companyUrl, role) {
  console.log(`Starting enhanced research for ${companyName}${role ? ` - ${role} role` : ''}...`);
  
  const results = {
    company: companyName,
    url: companyUrl,
    role: role,
    timestamp: new Date().toISOString(),
    companyOverview: null,
    glassdoorData: null,
    salaryData: null,
    roleData: null,
    interviewQuestions: null,
    githubData: null,
    newsData: null,
    analysis: null
  };
  
  try {
    // Gather all data in parallel
    const [companyData, glassdoor, salary, roleInfo, interviews, github, news] = await Promise.all([
      scrapeCompanyWebsite(companyUrl),
      getGlassdoorReviews(companyName),
      getSalaryData(companyName, role),
      getJobDescription(companyName, role),
      getInterviewQuestions(companyName, role),
      getGitHubData(companyName),
      getCompanyNews(companyName)
    ]);
    
    results.companyOverview = companyData;
    results.glassdoorData = glassdoor;
    results.salaryData = salary;
    results.roleData = roleInfo;
    results.interviewQuestions = interviews;
    results.githubData = github;
    results.newsData = news;
    
    // Generate AI analysis
    results.analysis = await generateRoleSpecificAnalysis(results);
    
    return results;
  } catch (error) {
    console.error('Enhanced research error:', error);
    return { ...results, error: error.message };
  }
}

/**
 * Scrape company website for overview
 */
async function scrapeCompanyWebsite(companyUrl) {
  try {
    const response = await axios.get(companyUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    $('script, style, noscript, iframe').remove();
    
    return {
      title: $('title').text(),
      description: $('meta[name="description"]').attr('content') || '',
      mainContent: $('body').text().replace(/\s+/g, ' ').trim().substring(0, 3000),
      headings: $('h1, h2').map((i, el) => $(el).text().trim()).get().slice(0, 10)
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Get Glassdoor reviews and ratings
 */
async function getGlassdoorReviews(companyName) {
  try {
    const searchQuery = encodeURIComponent(`${companyName} glassdoor reviews rating`);
    const response = await axios.get(`https://www.google.com/search?q=${searchQuery}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const snippets = [];
    
    $('div.g').each((i, elem) => {
      if (i < 5) {
        const text = $(elem).text();
        if (text.toLowerCase().includes('glassdoor') || text.includes('★') || text.includes('rating')) {
          snippets.push(text.substring(0, 300));
        }
      }
    });
    
    return {
      snippets,
      searchPerformed: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Get salary data for specific role
 */
async function getSalaryData(companyName, role) {
  if (!role) return null;
  
  try {
    const query = encodeURIComponent(`${role} ${companyName} salary levels.fyi glassdoor`);
    const response = await axios.get(`https://www.google.com/search?q=${query}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const salaryInfo = [];
    
    $('div.g').each((i, elem) => {
      if (i < 5) {
        const text = $(elem).text();
        if (text.includes('$') || text.toLowerCase().includes('salary') || text.toLowerCase().includes('compensation')) {
          salaryInfo.push(text.substring(0, 400));
        }
      }
    });
    
    return {
      role,
      company: companyName,
      data: salaryInfo,
      sources: ['Google Search', 'Levels.fyi', 'Glassdoor']
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Get job description and responsibilities
 */
async function getJobDescription(companyName, role) {
  if (!role) return null;
  
  try {
    const query = encodeURIComponent(`${role} ${companyName} job description responsibilities requirements`);
    const response = await axios.get(`https://www.google.com/search?q=${query}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const descriptions = [];
    
    $('div.g').each((i, elem) => {
      if (i < 5) {
        descriptions.push($(elem).text().substring(0, 500));
      }
    });
    
    return {
      role,
      company: companyName,
      descriptions,
      searchPerformed: true
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Get common interview questions for role at company
 */
async function getInterviewQuestions(companyName, role) {
  if (!role) return null;
  
  try {
    const query = encodeURIComponent(`${role} ${companyName} interview questions leetcode glassdoor`);
    const response = await axios.get(`https://www.google.com/search?q=${query}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const questions = [];
    
    $('div.g').each((i, elem) => {
      if (i < 8) {
        const text = $(elem).text();
        if (text.includes('?') || text.toLowerCase().includes('interview')) {
          questions.push(text.substring(0, 400));
        }
      }
    });
    
    return {
      role,
      company: companyName,
      questions,
      sources: ['Glassdoor', 'LeetCode', 'Interview platforms']
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Get GitHub organization data
 */
async function getGitHubData(companyName) {
  try {
    const orgName = companyName.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '');
    
    const orgResponse = await axios.get(`https://api.github.com/orgs/${orgName}`, {
      headers: { 
        'User-Agent': 'Interview-Prep-Tool',
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 8000
    });
    
    const reposResponse = await axios.get(`https://api.github.com/orgs/${orgName}/repos?sort=updated&per_page=10`, {
      headers: { 
        'User-Agent': 'Interview-Prep-Tool',
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 8000
    });
    
    const repos = reposResponse.data.map(repo => ({
      name: repo.name,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      updated: repo.updated_at
    }));
    
    return {
      name: orgResponse.data.name,
      bio: orgResponse.data.bio,
      publicRepos: orgResponse.data.public_repos,
      followers: orgResponse.data.followers,
      topRepos: repos
    };
  } catch (error) {
    return { error: error.message, searched: companyName };
  }
}

/**
 * Get recent company news
 */
async function getCompanyNews(companyName) {
  try {
    const query = encodeURIComponent(`${companyName} news funding product launch`);
    const response = await axios.get(`https://www.google.com/search?q=${query}&tbm=nws`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const articles = [];
    
    $('div.g, div.SoaBEf').each((i, elem) => {
      if (i < 5) {
        const title = $(elem).find('div[role="heading"]').text() || $(elem).find('h3').text();
        const snippet = $(elem).find('div.GI74Re').text() || $(elem).find('div.st').text();
        
        if (title) {
          articles.push({
            title: title.substring(0, 200),
            snippet: snippet.substring(0, 300)
          });
        }
      }
    });
    
    return { articles, searchPerformed: true };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Generate AI analysis with role-specific insights
 */
async function generateRoleSpecificAnalysis(results) {
  const roleContext = results.role ? `\n\n**INTERVIEWING FOR: ${results.role}**\n` : '';
  
  const prompt = `You are an expert interview preparation coach. Analyze this comprehensive research about ${results.company}${roleContext} and provide detailed, actionable interview preparation guidance.

COMPANY OVERVIEW:
${JSON.stringify(results.companyOverview, null, 2)}

GLASSDOOR REVIEWS & RATINGS:
${JSON.stringify(results.glassdoorData, null, 2)}

${results.salaryData ? `SALARY DATA FOR ${results.role}:\n${JSON.stringify(results.salaryData, null, 2)}\n` : ''}

${results.roleData ? `JOB DESCRIPTION & REQUIREMENTS FOR ${results.role}:\n${JSON.stringify(results.roleData, null, 2)}\n` : ''}

${results.interviewQuestions ? `COMMON INTERVIEW QUESTIONS FOR ${results.role}:\n${JSON.stringify(results.interviewQuestions, null, 2)}\n` : ''}

GITHUB/TECH STACK:
${JSON.stringify(results.githubData, null, 2)}

RECENT NEWS:
${JSON.stringify(results.newsData, null, 2)}

Provide a comprehensive analysis with these sections:

1. **Company Overview & Culture**: What the company does, their mission, and work culture based on reviews
2. **Interview Preparation Strategy**: Specific tactics for this ${results.role || 'role'}
3. **Technical Requirements**: Key skills, technologies, and tools to review
4. **Behavioral Preparation**: Company values and behavioral questions to expect
5. **Salary Negotiation**: Expected range and negotiation tips based on data
6. **Common Interview Questions**: Specific questions asked for ${results.role || 'this role'} with suggested approaches
7. **Questions to Ask Interviewers**: Thoughtful questions based on recent news and company direction
8. **Red Flags & Considerations**: Any concerns from reviews or news
9. **Your Unique Selling Points**: How to position yourself for this specific role

Be specific, actionable, and reference the data provided. Format in clean markdown.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });
    
    return message.content[0].text;
  } catch (error) {
    console.error('AI analysis error:', error);
    return `Error generating analysis: ${error.message}`;
  }
}

module.exports = {
  performEnhancedResearch
};
