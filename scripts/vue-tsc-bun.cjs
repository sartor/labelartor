/**
 * Runs vue-tsc under Bun (no Node.js required). Usage: bun scripts/vue-tsc-bun.cjs --build
 *
 * vue-tsc adds `.vue` support by temporarily replacing `fs.readFileSync` and
 * then `require()`-ing TypeScript's compiler, expecting the module loader to
 * read the file through the patched function. Node does; Bun's loader does
 * not, so under Bun the patch is silently skipped and `.vue` imports fail.
 *
 * This runner swaps in an equivalent `runTsc` that applies vue-tsc's own
 * source transform and evaluates the patched compiler directly.
 * If you run the tooling on Node.js, call `vue-tsc` directly instead.
 */
const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')

const runTscPath = require.resolve('@volar/typescript/lib/quickstart/runTsc')
const runTscModule = require(runTscPath)
const proxyApiPath = require.resolve('@volar/typescript/lib/node/proxyCreateProgram')

runTscModule.runTsc = function runTscEvaluated(tscPath, options, getLanguagePlugins, tsObject) {
  runTscModule.getLanguagePlugins = getLanguagePlugins
  const [extensions, extensionsToRemove] = Array.isArray(options)
    ? [options, []]
    : [options.extraSupportedExtensions, options.extraExtensionsToRemove]

  // TypeScript >= 5.7 ships `tsc.js` as a shim that requires `_tsc.js`.
  const shimTarget = path.join(path.dirname(tscPath), '_tsc.js')
  const compilerPath = fs.existsSync(shimTarget) ? shimTarget : tscPath
  const source = runTscModule.transformTscContent(
    fs.readFileSync(compilerPath, 'utf8'),
    proxyApiPath,
    extensions,
    extensionsToRemove,
    runTscPath,
    tsObject,
  )

  const module = { exports: {} }
  const evaluate = new Function('exports', 'require', 'module', '__filename', '__dirname', source)
  evaluate(module.exports, createRequire(compilerPath), module, compilerPath, path.dirname(compilerPath))
  return module.exports
}

require('vue-tsc').run()
