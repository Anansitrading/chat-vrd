# Vercel Deployment Checklist

## Steps for React/Next.js MVP Deployment to Vercel via GitHub

• **Create GitHub Repository**: Initialize repo with main/master branch, add .gitignore for node_modules, .env.local, .vercel
• **Project Structure**: Ensure package.json in root with build/dev scripts, Next.js pages/app directory structure
• **Local Environment Setup**: Create .env.local for development variables, add to .gitignore 
• **Build Command**: Set "build": "next build" in package.json scripts
• **Output Directory**: Next.js outputs to .next/ (auto-detected by Vercel)
• **Connect to Vercel**: Import GitHub repo via Vercel dashboard, auto-detects Next.js framework
• **Environment Variables**: Add via Vercel dashboard Settings > Environment Variables
• **Sensitive Variables**: Toggle "Sensitive" switch for API keys (production/preview only)
• **Deploy Trigger**: Push to main branch triggers automatic production deployment
• **Preview Deployments**: Every PR/branch push creates preview URL automatically

## Common Pitfalls to Avoid

• **Missing .env Variables**: Add all required env vars in Vercel dashboard before deployment
• **Build Size Limits**: Keep bundle under 250MB, optimize images and dependencies  
• **Static Assets**: Place in public/ directory, not in pages or components
• **API Routes**: Use pages/api/ or app/api/ structure for serverless functions
• **Build Errors**: Test "npm run build" locally before pushing to GitHub
• **Wrong Branch**: Ensure main/master is default branch in GitHub settings

```yaml
# Vercel Deployment Checklist
vercel_deployment_checklist:
  pre_deployment:
    - task: "Create GitHub repo with main branch"
      status: "completed"
    - task: "Add .gitignore (node_modules, .env.local, .vercel)"  
      status: "completed"
    - task: "Verify package.json build script"
      status: "pending"
    - task: "Test local build with npm run build"
      status: "pending"
      
  vercel_setup:
    - task: "Import GitHub repo to Vercel dashboard"
      status: "pending"
    - task: "Add environment variables in Settings"
      status: "pending" 
    - task: "Mark sensitive vars (API keys) as Sensitive"
      status: "pending"
    - task: "Verify framework detection (Next.js)"
      status: "pending"
      
  post_deployment:
    - task: "Test production deployment URL"
      status: "pending"
    - task: "Verify environment variables loaded"  
      status: "pending"
    - task: "Check build logs for errors"
      status: "pending"
    - task: "Test preview deployment on PR"
      status: "pending"
```