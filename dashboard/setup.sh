#!/bin/bash
# Dashboard setup script for DPCA

cd "$(dirname "$0")"

echo "🚀 Dream Paris Wedding Dashboard Setup"
echo "======================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node --version)"
echo "✅ npm $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup environment
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from template..."
    cp .env.local.example .env.local
    echo "⚠️  Please edit .env.local with your Supabase credentials"
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your credentials:"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo ""
echo "2. Start development server:"
echo "   npm run dev"
echo ""
echo "3. Open http://localhost:3000 in your browser"
