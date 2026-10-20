/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-unresolved-imports',
      severity: 'error',
      from: {},
      to: {couldNotResolve: true},
    },
    {
      name: 'no-circular-dependencies',
      severity: 'error',
      from: {},
      to: {circular: true},
    },
    {
      name: 'core-has-no-ui-dependency',
      comment: 'The replay clock and data contracts remain independent of React and UI state.',
      severity: 'error',
      from: {path: '^(frontend/src/lib/(playback|types)\\.ts$|quality/fixtures/architecture/core/)'},
      to: {path: '(^frontend/src/(components|hooks|i18n)/|^frontend/src/App\\.tsx$|(^|/)node_modules/(react|react-dom)/)'},
    },
    {
      name: 'primitives-have-no-product-dependency',
      comment: 'Reusable controls must not depend on match data, requests or application state.',
      severity: 'error',
      from: {path: '^(frontend/src/components/ui/|quality/fixtures/architecture/ui/)'},
      to: {path: '^frontend/src/(lib|hooks|i18n)/|^frontend/src/App\\.tsx$'},
    },
    {
      name: 'browser-has-no-node-runtime',
      severity: 'error',
      from: {path: '^(frontend/src/|quality/fixtures/architecture/browser/)'},
      to: {dependencyTypes: ['core']},
    },
  ],
  options: {
    doNotFollow: {path: 'node_modules'},
    tsPreCompilationDeps: true,
    tsConfig: {fileName: require('node:path').resolve(__dirname,'frontend/tsconfig.json')},
    enhancedResolveOptions: {extensions: ['.ts','.tsx','.js','.json'],conditionNames: ['import','browser','default']},
  },
};
