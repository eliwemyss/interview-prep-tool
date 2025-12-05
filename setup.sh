#!/bin/bash

# Interview Prep Tool - Quick Setup Script
# This script helps you get started quickly

echo "🎯 Interview Prep Tool - Quick Setup"
echo "======================================"
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node --version 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Node.js installed: $NODE_VERSION"
else
    echo "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

# Check if .env exists
if [ -f .env ]; then
    echo "✅ .env file found"
    
    # Check if Anthropic key is set
    if grep -q "ANTHROPIC_API_KEY=sk-ant-" .env; then
        echo "✅ Anthropic API key configured"
    else
        echo "⚠️  Anthropic API key not found in .env"
        echo "   Add: ANTHROPIC_API_KEY=sk-ant-xxxxx"
    fi
else
    echo "⚠️  No .env file found"
    echo "   Creating from .env.example..."
    cp .env.example .env
    echo "   Please edit .env and add your API keys"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🗄️  Database setup"
echo "   For local testing, you can use Docker:"
echo "   docker run --name interview-prep-db \\"
echo "     -e POSTGRES_PASSWORD=mypassword \\"
echo "     -e POSTGRES_DB=interview_prep \\"
echo "     -p 5432:5432 \\"
echo "     -d postgres:15"
echo ""
echo "   Then set in .env:"
echo "   DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/interview_prep"
echo ""
read -p "Do you have PostgreSQL running? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Running database migrations..."
    npm run migrate
    
    if [ $? -eq 0 ]; then
        echo "✅ Database migration successful!"
    else
        echo "❌ Migration failed. Check your DATABASE_URL in .env"
    fi
else
    echo "⏭️  Skipping migration. Run 'npm run migrate' after setting up PostgreSQL"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Next steps:"
echo "   1. Make sure PostgreSQL is running"
echo "   2. Run: npm start"
echo "   3. Visit: http://localhost:3000"
echo ""
echo "📚 For deployment to Railway:"
echo "   See: DEPLOYMENT.md"
echo ""
echo "🎉 Happy interviewing!"
