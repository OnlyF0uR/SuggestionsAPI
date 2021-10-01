import { Application } from './deps.ts'

import config from './config.js'
import router from './routes.ts'

const app = new Application()

app.use(async (ctx: any, next: any) => {
    await next()
    const time = ctx.response.headers.get("X-Response-Time")
    console.log(`${ctx.request.method} ${ctx.request.url}: ${time}`)
})

app.use(async (ctx: any, next: any) => {
    const start = Date.now()
    await next()
    const delta = Date.now() - start
    ctx.response.headers.set("X-Response-Time", `${delta}ms`)
})

// Register the routes
app.use(router.routes())

// Catch other routes and print CodedSnow in Unicode Art
app.use((ctx: any) => {
    ctx.response.body = `   _____          _          _  _____                     
  / ____|        | |        | |/ ____|                    
 | |     ___   __| | ___  __| | (___  _ __   _____      __
 | |    / _ \\ / _\` |/ _ \\/ _\` |\\___ \\| '_ \\ / _ \\ \\ /\\ / /
 | |___| (_) | (_| |  __/ (_| |____) | | | | (_) \\ V  V / 
  \\_____\\___/ \\__,_|\\___|\\__,_|_____/|_| |_|\\___/ \\_/\\_/`
})

if (import.meta.main) {
    await app.listen({
        port: config.port
    })
}