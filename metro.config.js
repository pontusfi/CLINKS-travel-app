const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// On web, package exports resolve zustand to its ESM build (esm/*.mjs), whose
// devtools middleware reads `import.meta.env`. Metro emits the web bundle as a
// classic <script>, so `import.meta` is a parse error that kills the entire
// bundle before a single line runs — the page renders blank with no console
// error at all. Native is unaffected: the "react-native" export condition
// already picks the CJS build, which has no `import.meta`.
//
// Pointing at the CJS files directly, rather than overriding
// unstable_conditionNames — Expo's resolver ignores condition names passed
// through the resolution context.
const zustandRoot = path.join(__dirname, 'node_modules', 'zustand')
const withZustandCjsOnWeb = (cfg) => {
  const upstream = cfg.resolver.resolveRequest
  cfg.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web' && /^zustand(\/|$)/.test(moduleName)) {
      const subpath = moduleName.slice('zustand'.length).replace(/^\//, '')
      return {
        type: 'sourceFile',
        filePath: path.join(zustandRoot, `${subpath || 'index'}.js`),
      }
    }
    return (upstream ?? context.resolveRequest)(context, moduleName, platform)
  }
  return cfg
}

module.exports = withZustandCjsOnWeb(
  withNativeWind(config, { input: './global.css' })
)
