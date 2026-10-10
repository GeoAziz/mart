import type { NextConfig } from 'next';
import webpack from 'webpack';

// Sentry initialization for error tracking
if (process.env.NEXT_PUBLIC_SENTRY_AUTH_TOKEN) {
  require('./sentry.server.config');
}

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.dummyjson.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'fakestoreapi.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {},
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.module = {
        ...config.module,
        rules: [
          ...(config.module?.rules || []),
          {
            test: /\.handlebars$/,
            loader: 'handlebars-loader'
          }
        ]
      };

      config.resolve = {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          'node:events': 'events',
          'node:stream': 'stream-browserify',
          'node:util': 'util',
          'node:buffer': 'buffer',
        },
        fallback: {
          ...config.resolve?.fallback,
          events: require.resolve('events/'),
          stream: require.resolve('stream-browserify'),
          util: require.resolve('util/'),
          buffer: require.resolve('buffer/'),
          fs: false,
          path: false,
          os: false,
          crypto: false,
          http: false,
          https: false,
          dns: false,
          net: false,
          tls: false,
          child_process: false,
          http2: false,
        }
      };

      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^node:/,
          (resource) => {
            resource.request = resource.request.replace(/^node:/, '');
          }
        ),
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );
    }
    return config;
  },
};

export default nextConfig;
