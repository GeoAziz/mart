declare module 'cmdk'
declare module 'framer-motion'
declare module '@tensorflow/tfjs-node'

// Allow importing modules without types during incremental migration.
declare module '*.css'
declare module '*.svg'

// Prometheus default-metrics initialisation guards (shared across entry points).
declare global {
  var __prometheusMetricsInitialized: boolean | undefined;
  var __promMetricsInitialized: boolean | undefined;
}
