const nodemailer = require('nodemailer');
require('dotenv').config();

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // Use TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Send interview prep email
 */
async function sendPrepEmail(companyName, event, researchData) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('Email credentials not configured, skipping email send');
    return { skipped: true };
  }

  const eventDate = new Date(event.start.dateTime || event.start.date);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = eventDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Generate email HTML
  const emailHtml = generatePrepEmailHtml(
    companyName,
    formattedDate,
    formattedTime,
    researchData,
    event
  );

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: process.env.SMTP_USER, // Send to self
    subject: `Interview Prep Ready: ${companyName} - Tomorrow at ${formattedTime}`,
    html: emailHtml
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Prep email sent for ${companyName}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending prep email:', error);
    throw error;
  }
}

/**
 * Generate HTML for prep email
 */
function generatePrepEmailHtml(companyName, date, time, researchData, event) {
  const data = researchData || {};
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interview Prep: ${companyName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
  <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 30px; border-radius: 15px 15px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 2em;">🎯 Interview Tomorrow!</h1>
  </div>
  
  <div style="background: white; padding: 30px; border-radius: 0 0 15px 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #667eea; margin-top: 0;">${companyName}</h2>
    
    <div style="background: #f0f4ff; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
      <p style="margin: 0; font-size: 1.1em;"><strong>📅 When:</strong> ${date}</p>
      <p style="margin: 10px 0 0 0; font-size: 1.1em;"><strong>🕐 Time:</strong> ${time}</p>
      ${event.location ? `<p style="margin: 10px 0 0 0; font-size: 1.1em;"><strong>📍 Location:</strong> ${event.location}</p>` : ''}
    </div>
    
    ${data.overview ? `
      <h3 style="color: #764ba2; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">📊 Company Overview</h3>
      <p style="line-height: 1.6; color: #555;">${data.overview}</p>
    ` : ''}
    
    ${data.techStack && data.techStack.length > 0 ? `
      <h3 style="color: #764ba2; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; margin-top: 25px;">💻 Tech Stack</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 10px;">
        ${data.techStack.slice(0, 8).map(tech => 
          `<span style="background: #667eea; color: white; padding: 6px 14px; border-radius: 20px; font-size: 0.9em;">${tech}</span>`
        ).join('')}
      </div>
    ` : ''}
    
    ${data.interviewQuestions && data.interviewQuestions.length > 0 ? `
      <h3 style="color: #764ba2; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; margin-top: 25px;">❓ Key Interview Questions</h3>
      <ol style="line-height: 1.8; color: #555;">
        ${data.interviewQuestions.slice(0, 5).map(q => `<li style="margin-bottom: 10px;">${q}</li>`).join('')}
      </ol>
    ` : ''}
    
    ${data.preparationTips && data.preparationTips.length > 0 ? `
      <h3 style="color: #764ba2; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; margin-top: 25px;">💡 Preparation Tips</h3>
      <ul style="line-height: 1.8; color: #555;">
        ${data.preparationTips.map(tip => `<li style="margin-bottom: 10px;">${tip}</li>`).join('')}
      </ul>
    ` : ''}
    
    ${data.keyTopics && data.keyTopics.length > 0 ? `
      <h3 style="color: #764ba2; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; margin-top: 25px;">🎓 Key Topics to Review</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 10px;">
        ${data.keyTopics.map(topic => 
          `<span style="background: #f0f4ff; color: #667eea; padding: 6px 14px; border-radius: 20px; font-size: 0.9em; border: 1px solid #667eea;">${topic}</span>`
        ).join('')}
      </div>
    ` : ''}
    
    <div style="text-align: center; margin-top: 40px;">
      <a href="http://localhost:3000/dashboard" 
         style="background: linear-gradient(135deg, #667eea, #764ba2); 
                color: white; 
                padding: 15px 30px; 
                text-decoration: none; 
                border-radius: 8px; 
                display: inline-block; 
                font-weight: 600;
                font-size: 1.1em;">
        View Full Research →
      </a>
    </div>
    
    <p style="color: #888; font-size: 0.9em; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      Good luck! You've got this! 🚀
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.85em;">
    <p>Sent by Interview Prep Tool</p>
  </div>
</body>
</html>
  `;
}

/**
 * Test email configuration
 */
async function testEmailConfig() {
  try {
    await transporter.verify();
    console.log('✅ Email configuration verified');
    return { success: true };
  } catch (error) {
    console.error('❌ Email configuration error:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPrepEmail,
  testEmailConfig
};
