export default function handler(request, response) {
  const country = request.headers['x-vercel-ip-country'] || 'IN';
  response.setHeader('Cache-Control', 'private, no-store');
  response.status(200).json({ country: String(country).toUpperCase() });
}
