const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generate comprehensive pre-interview briefing
 * Takes enhanced research data and produces actionable interview prep
 */
async function generateInterviewBriefing(researchData, role) {
  try {
    const briefing = {
      company: researchData.company,
      role: role,
      generatedAt: new Date().toISOString(),
      sections: {}
    };

    // Generate all briefing sections in parallel
    const [
      executiveSummary,
      keyPoints,
      topChallenges,
      cultureInsights,
      questionsToAsk,
      salaryExpectations,
      redFlags,
      prepChecklist
    ] = await Promise.all([
      generateExecutiveSummary(researchData),
      generateKeyTalkingPoints(researchData),
      generateTopChallenges(researchData),
      generateCultureInsights(researchData),
      generateSmartQuestions(researchData, role),
      generateSalaryExpectations(researchData),
      generateRedFlags(researchData),
      generatePrepChecklist(role)
    ]);

    briefing.sections = {
      executiveSummary,
      keyTalkingPoints: keyPoints,
      topChallenges,
      cultureInsights,
      questionsToAsk,
      salaryExpectations,
      redFlags,
      prepChecklist
    };

    return briefing;
  } catch (error) {
    console.error('Error generating briefing:', error);
    throw error;
  }
}

/**
 * Executive summary of company
 */
async function generateExecutiveSummary(data) {
  const prompt = `Based on this company research data, provide a 2-3 sentence executive summary of what ${data.company} does and why it matters. Be concise and interview-ready.

Company Data:
${JSON.stringify({ overview: data.companyOverview, github: data.githubData }, null, 2)}`;

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

/**
 * Generate key talking points with metrics
 */
async function generateKeyTalkingPoints(data) {
  const prompt = `Generate 5 key talking points about ${data.company} that a candidate should mention during an interview. Format as bullet points. Include specific metrics or facts where available. Focus on impressive achievements, growth, and impact.

Data available:
- Overview: ${data.companyOverview?.title || 'Unknown'}
- Products: ${JSON.stringify(data.companyOverview?.mainContent?.substring(0, 200))}
- GitHub Info: ${data.githubData?.name ? `${data.githubData.publicRepos} public repos, ${data.githubData.followers} followers` : 'N/A'}
- Recent News: ${data.newsData?.articles?.length > 0 ? 'Yes' : 'None found'}`;

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

/**
 * Generate top 3 company challenges
 */
async function generateTopChallenges(data) {
  const prompt = `Based on recent company news, reviews, and industry context, what are 3 major challenges or pain points that ${data.company} is likely facing? Format as bullet points. Be realistic but not negative. This helps the candidate understand context and ask informed questions.

News: ${data.newsData?.articles?.map(a => a.title).join('; ') || 'No recent news found'}
Reviews snippet: ${data.glassdoorData?.snippets?.[0] || 'No reviews found'}`;

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

/**
 * Generate culture and values insights
 */
async function generateCultureInsights(data) {
  const prompt = `Based on Glassdoor reviews and company research, describe the culture and core values of ${data.company}. Format as 3-4 key insights about what it's like to work there. Be honest about both strengths and challenges.

Glassdoor data: ${JSON.stringify(data.glassdoorData, null, 2)}`;

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

/**
 * Generate smart questions for candidate to ask
 */
async function generateSmartQuestions(data, role) {
  const prompt = `Generate 12 thoughtful questions that a ${role} candidate should ask during interviews at ${data.company}. 

Organize into categories:
- Team & Growth (3 questions)
- Role & Impact (3 questions)  
- Culture & Values (3 questions)
- Technical & Product (3 questions)

Questions should demonstrate knowledge of the company, role, and industry. Reference recent news or challenges if relevant.

Company info: ${data.company}
Recent news: ${data.newsData?.articles?.map(a => a.title).slice(0, 2).join('; ') || 'None'}
Tech stack: ${data.githubData?.topRepos?.map(r => r.language).filter(Boolean).join(', ') || 'Unknown'}`;

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

/**
 * Generate salary expectations and negotiation guidance
 */
async function generateSalaryExpectations(data) {
  const prompt = `Based on salary data for this company and role, provide salary expectations and negotiation guidance.

Salary data found: ${data.salaryData?.data ? JSON.stringify(data.salaryData.data.slice(0, 2)) : 'Limited data'}

Provide:
1. Expected salary range
2. Typical equity/benefits
3. 2-3 negotiation tips specific to this company`;

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

/**
 * Identify potential red flags
 */
async function generateRedFlags(data) {
  const prompt = `Based on Glassdoor reviews, recent news, and company data, identify any red flags or concerns a candidate should be aware of about ${data.company}. 

Be balanced - not everything is a red flag, but candidates should go in informed.

Glassdoor: ${data.glassdoorData?.snippets?.slice(0, 2).join(' | ') || 'No data'}
News: ${data.newsData?.articles?.map(a => a.title).slice(0, 2).join('; ') || 'No concerns found'}

Format as bullet points with context, not just warnings.`;

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

/**
 * Generate role-specific prep checklist
 */
async function generatePrepChecklist(role) {
  const roleType = role?.toLowerCase() || 'software engineer';
  const checklists = {
    'software engineer': [
      '[ ] Review 5-10 common system design problems',
      '[ ] Practice 10-15 LeetCode medium problems in your primary language',
      '[ ] Review OOPS and design patterns',
      '[ ] Prepare 3 technical deep-dives on projects you\'ve built',
      '[ ] Understand the company\'s tech stack and architecture',
      '[ ] Prepare 5 behavioral stories using STAR method',
      '[ ] Research recent engineering blog posts or tech talks from the company',
      '[ ] Practice explaining complex technical decisions clearly',
      '[ ] Review APIs, databases, and systems you might use',
      '[ ] Get familiar with common interview platforms (if doing online)'
    ],
    'product manager': [
      '[ ] Prepare 3 product case studies on their products',
      '[ ] Review company\'s latest product launches',
      '[ ] Practice the "design a product" framework',
      '[ ] Analyze competitor products and positioning',
      '[ ] Understand unit economics and key metrics',
      '[ ] Prepare 5 behavioral stories demonstrating product thinking',
      '[ ] Review analytics and data interpretation concepts',
      '[ ] Practice asking clarifying questions systematically',
      '[ ] Study the company\'s go-to-market strategy',
      '[ ] Prepare thoughtful questions about roadmap and strategy'
    ],
    'designer': [
      '[ ] Prepare portfolio with 3-5 strong case studies',
      '[ ] Research the company\'s design system and brand',
      '[ ] Practice explaining your design process clearly',
      '[ ] Review their recent product launches and design changes',
      '[ ] Prepare feedback on their current UX/design',
      '[ ] Practice design critique (giving and receiving)',
      '[ ] Understand their user base and key use cases',
      '[ ] Prepare 3 behavioral stories showing design impact',
      '[ ] Review accessibility and inclusive design principles',
      '[ ] Practice quick design exercises (30-60 min)'
    ]
  };

  // Find best matching checklist
  let checklist = checklists['software engineer']; // default
  for (const [key, items] of Object.entries(checklists)) {
    if (roleType.includes(key.split(' ')[0])) {
      checklist = items;
      break;
    }
  }

  return {
    role,
    items: checklist,
    generalTips: [
      '[ ] Get 8 hours of sleep before interview',
      '[ ] Eat a good breakfast/lunch (no sugar crashes)',
      '[ ] Test your setup 30 mins before (camera, mic, internet)',
      '[ ] Have your resume and company research open',
      '[ ] Prepare a notebook and pen for notes',
      '[ ] Have thoughtful questions ready (don\'t improvise)',
      '[ ] Remember: interviewers want you to succeed'
    ]
  };
}

module.exports = {
  generateInterviewBriefing,
  generateExecutiveSummary,
  generateKeyTalkingPoints,
  generateTopChallenges,
  generateCultureInsights,
  generateSmartQuestions,
  generateSalaryExpectations,
  generateRedFlags,
  generatePrepChecklist
};
