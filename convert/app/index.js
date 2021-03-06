const esprima = require('esprima')
const escodegen = require('escodegen')
const compiler = require('vue-template-compiler')
const resolveImport = require('./import')
const resolveExport = require('./export')
const routerHack = require('./router-hack')
const vueMount = require('./vue-mount')
const bindWatch = require('./bind-watch')

module.exports = function (appFile, manifest) {
  const jsString = compiler.parseComponent(appFile).script.content
  const ast = esprima.parseModule(jsString)

  let astBody
  let exportStatement
  let importDecla = []
  let otherCode = []
  ast.body.forEach((item) => {
    if (item.type === 'ImportDeclaration') {
      importDecla.push(item)
    } else if (item.type === 'ExportDefaultDeclaration') {
      exportStatement = item
    } else {
      // 非import、export代码
      otherCode.push(item)
    }
  })

  const useRouter = manifest.features &&
    manifest.features.findIndex(item => item.name === 'system.router') > -1
  const importDeclaRes = resolveImport(importDecla, useRouter)
  exportStatement = resolveExport(exportStatement, importDeclaRes.vueDeclaName)

  astBody = importDeclaRes.ast.concat(otherCode)
    .concat(vueMount(importDeclaRes.vueDeclaName))
    .concat(bindWatch())
  if (useRouter) {
    astBody = astBody.concat(routerHack(importDeclaRes.vueDeclaName))
  }
  astBody.push(exportStatement)

  ast.body = astBody
  const resJsString = escodegen.generate(ast, {
    format: {
      indent: {
        style: '  '
      }
    }
  })
  return `<script>\n${resJsString}\n</script>`
}
