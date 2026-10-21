import { readFileSync } from 'node:fs'
import { gzipSync, brotliCompressSync } from 'node:zlib'
import vm from 'node:vm'
import { performance } from 'node:perf_hooks'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const root=join(dirname(fileURLToPath(import.meta.url)), '..')
const bytes=readFileSync(join(root,'client.js'))
const text=bytes.toString('utf8')
const manifest=JSON.parse(text.match(/var MANIFEST = (\{[^\n]+\})\n/)[1])
const parse=[]
for(let i=0;i<16;i++) {
 const source=text+'\n// unique compile sample '+i // avoid V8 same-source cache
 const start=performance.now();new vm.Script(source);if(i)parse.push(performance.now()-start)
}
parse.sort((a,b)=>a-b)
const assets=['build/whale-maid-small-monochrome-diagonal.svg','build/great-vibes-latin.woff2'].map(path=>{
 const source=readFileSync(join(root,path))
 return {path,bytes:source.length,base64Chars:4*Math.ceil(source.length/3),sha256:createHash('sha256').update(source).digest('hex')}
})
console.log(JSON.stringify({ mode:manifest.build.mode, artifactSha256:createHash('sha256').update(bytes).digest('hex'),
 node:process.version, rawBytes:bytes.length,gzip9Bytes:gzipSync(bytes,{level:9}).length,
 brotli11Bytes:brotliCompressSync(bytes).length, uniqueSourceNodeCompileMs:{samples:15,median:parse[7],p95:parse[14]}, assets,
 limitations:'In-memory Node compile/compression only, not browser startup, decoded pixels, HTTP transfer, cache or heap. Sources have unique trailing comments to avoid same-source V8 cache; no before/after speedup or browser latency claim.'},null,2))
