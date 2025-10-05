// Main entry point for Vercel deployment
export default function handler(req, res) {
  // Redirect to dashboard
  res.writeHead(302, {
    'Location': '/dashboard'
  });
  res.end();
}
