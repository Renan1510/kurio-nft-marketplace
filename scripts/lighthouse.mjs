import {spawnSync} from 'node:child_process'
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs'
import {createRequire} from 'node:module'
const reportDir=`lighthouse-report/run-${new Date().toISOString().replace(/[:.]/g,'-')}`
// No Windows, o Chromium do Playwright pode existir sem Chrome instalado globalmente.
if (!process.env.CHROME_PATH) {
 try {
  const require=createRequire(import.meta.url)
  const {chromium}=require('@playwright/test')
  const executable=chromium.executablePath()
  if (existsSync(executable)) process.env.CHROME_PATH=executable
 } catch { /* Lighthouse tentará localizar Chrome normalmente. */ }
}
const baseURL=process.env.LIGHTHOUSE_BASE_URL||'http://127.0.0.1:4173'
const trialRuns=Number(process.env.LIGHTHOUSE_RUNS||3)
if(!Number.isInteger(trialRuns)||trialRuns<1||trialRuns>3){console.error('LIGHTHOUSE_RUNS deve ser 1, 2 ou 3');process.exit(1)}
const profiles=process.env.LIGHTHOUSE_ONLY_MOBILE==='1'?['mobile']:['mobile','desktop']
console.log(`KURIO: ${trialRuns} execução(ões), ${profiles.join('/')} — ${trialRuns<3?'MODO DE MEDIÇÃO RÁPIDA (não é aprovação final)':'AUDITORIA COMPLETA'}`)

const minScore=97
const lighthouseCli='node_modules/lighthouse/cli/index.js'
if(!existsSync(lighthouseCli)){console.error('Lighthouse não instalado: execute npm install --include=dev antes do teste.');process.exit(1)}
mkdirSync(reportDir,{recursive:true})
const groups=[]
for(const path of ['','nft/emerald']) for(const mode of profiles){
 const measurements=[]
 for(let i=1;i<=trialRuns;i++){
  const target=`${baseURL}/${path}`
  const filename=`${path.replace('/','-')||'home'}-${mode}-${i}`
  const base=`./${reportDir}/${filename}`
  const args=[lighthouseCli,target,'--quiet','--only-categories=performance,accessibility,best-practices,seo','--chrome-flags=--headless --no-sandbox','--output=html','--output=json',`--output-path=${base}`,...(mode==='desktop'?['--preset=desktop']:[])]
  const json=`${base}.report.json`
  let succeeded=false
  // Uma falha esporádica do Chromium não deve reduzir a rodada de 3 para 2.
  // Nenhuma medição anterior é reaproveitada quando um processo falha.
  for(let attempt=1;attempt<=2;attempt++){
   console.log(`Auditing ${target} ${mode} ${i}/${trialRuns} (tentativa ${attempt}/2)`)
   const result=spawnSync(process.execPath,args,{stdio:'inherit'})
   if(result.status===0&&existsSync(json)){succeeded=true;break}
   console.warn(`Falha na execução ${i} de ${mode}. ${attempt===1?'Tentando novamente...':'Sem pontuação para esta medição.'}`)
  }
  if(!succeeded){process.exitCode=1;continue}
  const report=JSON.parse(readFileSync(json,'utf8'))
  measurements.push({performance:report.categories.performance.score*100,accessibility:report.categories.accessibility.score*100,bestPractices:report.categories['best-practices'].score*100,seo:report.categories.seo.score*100,LCP:report.audits['largest-contentful-paint'].numericValue,CLS:report.audits['cumulative-layout-shift'].numericValue,TBT:report.audits['total-blocking-time'].numericValue})
 }
 const median=(key)=>{const values=measurements.map(m=>m[key]).sort((a,b)=>a-b);return values.length?values[Math.floor(values.length/2)]:null}
 const medians=Object.fromEntries(['performance','accessibility','bestPractices','seo','LCP','CLS','TBT'].map(key=>[key,median(key)]))
 groups.push({page:path||'home',profile:mode,count:measurements.length,measurements,medians,officialPassed:measurements.length===3&&medians.performance>=90&&medians.accessibility>=95&&medians.bestPractices>=95&&medians.seo>=90,targets:{performance:minScore,accessibility:minScore,bestPractices:minScore,seo:minScore},passed:measurements.length===3&&medians.performance>=minScore&&medians.accessibility>=minScore&&medians.bestPractices>=minScore&&medians.seo>=minScore})
}
writeFileSync(`${reportDir}/summary.json`,JSON.stringify({generatedAt:new Date().toISOString(),node:process.version,platform:process.platform,lighthouse:JSON.parse(readFileSync('node_modules/lighthouse/package.json','utf8')).version,baseURL,configuration:'Production Vite preview, default MSW, mobile simulated throttling / desktop preset, three fresh Chrome runs per page/profile',results:groups},null,2))
console.table(groups.map(g=>({page:g.page,profile:g.profile,runs:g.count,...g.medians,metaOficial90:g.officialPassed,metaExtra97:g.passed})))
if(trialRuns===3&&groups.some(g=>!g.officialPassed))process.exitCode=1
if(trialRuns<3)console.log('MEDIÇÃO PRELIMINAR: execute 3 rodadas para validar a meta oficial (Performance 90 / Accessibility 95 / Best Practices 95 / SEO 90).')
console.log('Relatórios HTML, JSON e resumo de medianas em lighthouse-report/.')
