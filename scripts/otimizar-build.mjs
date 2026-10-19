import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'

// Otimiza somente a saída do Vite (dist/), sem modificar a aplicação.
const dist = resolve('dist')
const htmlPath = join(dist, 'index.html')
const html = readFileSync(htmlPath, 'utf8')
const stylesheetTags = [...html.matchAll(/<link\b[^>]*>/gi)]
  .map((match) => match[0])
  .filter((tag) => /\brel=["']stylesheet["']/i.test(tag) && /\bhref=["']\/assets\/[^"']+\.css["']/i.test(tag))
if (stylesheetTags.length !== 1) throw new Error(`Esperado 1 CSS do Vite, encontrado ${stylesheetTags.length}. Build preservado.`)
const tag = stylesheetTags[0]
const cssUrl = tag.match(/\bhref=["'](\/assets\/[^"']+\.css)["']/i)?.[1]
if (!cssUrl) throw new Error('Caminho do CSS inválido. Build preservado.')
const css = readFileSync(join(dist, cssUrl.slice(1)), 'utf8')
if (/<\/style/i.test(css)) throw new Error('CSS contém fechamento de style. Build preservado.')

const assets = readdirSync(join(dist, 'assets'))
const mswBundles = assets.filter((name) => /^browser-[a-zA-Z0-9_-]+\.js$/.test(name))
if (mswBundles.length !== 1) throw new Error(`Esperado 1 módulo MSW, encontrado ${mswBundles.length}. Build preservado.`)
const mswUrl = `/assets/${mswBundles[0]}`
const preload = html.includes(mswUrl) ? '' : `<link rel="modulepreload" crossorigin href="${mswUrl}">`
const optimized = html.replace(tag, `<style data-kurio-build>${css}</style>${preload}`)
if (optimized === html) throw new Error('HTML não alterado; build preservado.')
writeFileSync(htmlPath, optimized, 'utf8')
console.log(`KURIO build: CSS embutido (${Buffer.byteLength(css)} bytes); MSW pré-carregado (${mswBundles[0]}).`)
