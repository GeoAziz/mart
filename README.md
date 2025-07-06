# ZilaCart

A futuristic digital marketplace for Kenya. Built with Next.js, Firebase, and Genkit AI.

## Features
- E-commerce platform with admin, vendor, and customer roles
- Product moderation, order management, payouts, refunds
- AI-powered chatbot for customer support
- Responsive design for desktop and mobile

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase project (for Firestore, Auth, etc.)
- Google AI/Genkit API keys (for chatbot)

### Setup
```bash
git clone <your-repo-url>
cd mart
npm install
```

### Environment Variables
Create a `.env.local` file with your Firebase and AI credentials. Example:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
FIREBASE_ADMIN_PRIVATE_KEY=...
GENKIT_API_KEY=...
```

### Development
```bash
npm run dev
```

### Build & Deploy
```bash
npm run build
npm start
```

- Deploy to Vercel: Connect your repo and set environment variables in the Vercel dashboard.

## Project Structure
- `/src/app` - Next.js app routes and layouts
- `/src/components` - UI components
- `/src/ai` - AI chatbot flows
- `/src/lib` - Shared utilities and types

## Contributing
Pull requests are welcome! Please open an issue first to discuss changes.

## License
MIT

# ✅ Congratulations! The app is configured!

All the necessary Firebase keys have been added. The application should now be running without the configuration error.

## Final Optional Step: Enable AI Features

The core e-commerce functionality is working, but the advanced AI features (Chatbot, Recommendations, etc.) are currently disabled.

To enable them, you just need one last key:

1.  Go to the [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Click **"Create API key"** and copy the key.
3.  Open the `.env` file in your project.
4.  Paste the key as the value for `GOOGLE_API_KEY`.
5.  Restart the development server.

That's it! All features will now be active.
