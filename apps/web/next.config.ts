import type { NextConfig } from 'next';

// GitHub Pages project sites are hosted under /lonely-no-longer.
// Cloudflare Pages and local development still serve at the domain root.
const githubPages=process.env.GITHUB_PAGES==='true';
const nextConfig:NextConfig={
  output:'export',
  images:{unoptimized:true},
  trailingSlash:true,
  ...(githubPages?{basePath:'/lonely-no-longer'}:{}),
};
export default nextConfig;
