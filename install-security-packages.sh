#!/bin/bash

# Security Packages Installation Script
# This script installs all required security packages for the ERM app

echo "🔒 Installing security packages..."
echo ""

# Main app packages
echo "📦 Installing main app packages..."
npm install crypto-js dexie

# Functions packages
echo "📦 Installing Cloud Functions packages..."
cd functions
npm install cors

cd ..

echo ""
echo "✅ Security packages installed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Review security configuration in .env files"
echo "2. Deploy Firestore rules: firebase deploy --only firestore:rules"
echo "3. Deploy Cloud Functions: firebase deploy --only functions"
echo "4. Deploy hosting: firebase deploy --only hosting"
echo ""
echo "🔐 Security improvements completed:"
echo "   ✅ .env.production - API key removed"
echo "   ✅ firestore.rules - RBAC implemented"
echo "   ✅ functions/index.js - Secure endpoints with auth"
echo "   ✅ firebase.json - Security headers added"
echo "   ✅ auditService.js - Audit logging service created"
echo ""
