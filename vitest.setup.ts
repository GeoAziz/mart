import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/',
    route: '/',
    query: {},
    asPath: '/',
  }),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-key';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'demo-zilacart';
process.env.FIREBASE_PROJECT_ID = 'demo-zilacart';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test';
process.env.AWS_SECRET_ACCESS_KEY = 'test';
process.env.AWS_SQS_ENDPOINT = 'http://localhost:4566';
process.env.AWS_S3_ENDPOINT = 'http://localhost:4566';
process.env.AWS_DYNAMODB_ENDPOINT = 'http://localhost:4566';
