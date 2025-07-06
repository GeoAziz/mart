import type { NextConfig } from 'next';
import webpack from 'webpack';

const nextConfig: NextConfig = {
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
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Server-side packages
  experimental: {
    serverActions: {},
  },
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Handle node: protocol imports
      // Add handlebars loader configuration
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
          // Disable other Node.js modules on client-side
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

      // Add necessary plugins
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
