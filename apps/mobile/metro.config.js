// Metro config para monorepo (npm workspaces) + resolução de imports com
// extensão .js que apontam para arquivos .ts/.tsx (estilo NodeNext usado no src).
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Faz o Metro observar a raiz do monorepo (para @agrolink/types etc.)
config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
config.resolver.disableHierarchicalLookup = true

// Permite que imports relativos terminando em ".js" resolvam para ".ts"/".tsx".
const defaultResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    (moduleName.startsWith('./') || moduleName.startsWith('../')) &&
    moduleName.endsWith('.js')
  ) {
    try {
      return context.resolveRequest(
        context,
        moduleName.replace(/\.js$/, ''),
        platform
      )
    } catch {
      // cai para o resolvedor padrão abaixo
    }
  }
  return (defaultResolveRequest ?? context.resolveRequest)(
    context,
    moduleName,
    platform
  )
}

module.exports = config
