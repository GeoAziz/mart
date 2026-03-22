// Smoke test: render AdminLayout to string to ensure no immediate runtime errors.
// This is a basic smoke file; run with Node if you have React available.

// Ensure React is available globally for compiled JSX that expects `React` in scope
const React = require('react');
globalThis.React = React;
const ReactDOMServer = require('react-dom/server');

async function run() {
  try {
    const AdminLayout = require('../../src/app/admin/layout').default;
    const html = ReactDOMServer.renderToString(React.createElement(AdminLayout, { children: React.createElement('div', null, 'hi') }));
    console.log('AdminLayout rendered length:', html.length);
  } catch (err) {
    console.error('Smoke render failed:', err);
    process.exit(1);
  }
}

if (require.main === module) run();
