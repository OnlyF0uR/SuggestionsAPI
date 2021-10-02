import { Router } from './deps.ts'
import { runQuery } from './structures/PostgreSQL.ts'
import config from './config.js'

const router = new Router()
const authTokens: any = config.authTokens

function stringify(obj: Object) {
    // Because JSON cannot stringify bigints apparently :/
    return JSON.stringify(obj, (_, v) => typeof v === 'bigint' ? v.toString() : v)
}

/*
 * Submit a new suggestion/report
 *
 * Required json body:
 *  - id
 *  - context
 *  - author
 *  - avatar
 *  - guild
 *  - channel
 *  - message
 *  - status
 */
router.post('/submit', async (ctx: any) => {
    // Get api key
    const apiKey = ctx.request.headers.get('Api-Key')
    // Check api key validity
    if (apiKey == null || authTokens[apiKey] == null) {
        ctx.response.body = stringify({ success: false, error: 'Invalid token.' })
        return
    }

    const body = await ctx.request.body({ type: 'json' }).value
    if (body.id == null || body.context == null || body.author == null || body.avatar == null || body.guild == null || body.channel == null || body.message == null || body.status == null) {
        ctx.response.body = stringify({ success: false, error: 'Required body parameters were not given.' })
        return
    }

    // Permission check
    if (!authTokens[apiKey].global && !authTokens[apiKey].guilds.includes(body.guild)) {
        ctx.response.body = stringify({ success: false, error: 'You cannot submit information for that guild.' })
        return
    }

    if (body.id.startsWith('s_')) {
        await runQuery(
            'INSERT INTO suggestions (id, context, author, avatar, guild, channel, message, status, upvotes, downvotes, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
            [body.id, body.context, body.author, body.avatar, body.guild, body.channel, body.message, body.status, "[]", "[]", new Date().getTime()]
        )
        ctx.response.body = stringify({ success: true })
    } else if (body.id.startsWith('r_')) {
        await runQuery(
            'INSERT INTO reports (id, context, author, avatar, guild, channel, message, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [body.id, body.context, body.author, body.avatar, body.guild, body.channel, body.message, body.status, new Date().getTime()]
        )
        ctx.response.body = stringify({ success: true })
    } else {
        ctx.response.body = stringify({ success: false, error: 'ID parameter was invalid.' })
    }
})

/*
 * Submit a new status for a suggestion/report
 *
 * Required json body:
 *  - id
 *  - guild
 *  - status
 */
router.post('/setstatus', async (ctx: any) => {
    // Get api key
    const apiKey = ctx.request.headers.get('Api-Key')
    // Check api key validity
    if (apiKey == null || authTokens[apiKey] == null) {
        ctx.response.body = stringify({ success: false, error: 'Invalid token.' })
        return
    }

    const body = await ctx.request.body({ type: 'json' }).value
    if (body.id == null || body.guild == null || body.status == null) {
        ctx.response.body = stringify({ success: false, error: 'Required body parameters were not given.' })
        return
    }

    // Permission check
    if (!authTokens[apiKey].global && !authTokens[apiKey].guilds.includes(body.guild)) {
        ctx.response.body = stringify({ success: false, error: 'You cannot submit information for that guild.' })
        return
    }

    if (body.id.startsWith('s_')) {
        await runQuery('UPDATE suggestions SET status = $1 WHERE guild = $2 AND id = $3', [body.status, body.guild, body.id])
        ctx.response.body = stringify({ success: true })
    } else if (body.id.startsWith('r_')) {
        await runQuery('UPDATE reports SET status = $1 WHERE guild = $2 AND id = $3', [body.status, body.guild, body.id])
        ctx.response.body = stringify({ success: true })
    } else {
        ctx.response.body = stringify({ success: false, error: 'ID parameter was invalid.' })
    }
})

/*
 * Submit an upvote for a suggestion
 *
 * Required json body:
 *  - message
 *  - guild
 *  - user_id
 */
router.post('/suggestions/upvote', async (ctx: any) => {
    // Get api key
    const apiKey = ctx.request.headers.get('Api-Key')
    // Check api key validity
    if (apiKey == null || authTokens[apiKey] == null) {
        ctx.response.body = stringify({ success: false, error: 'Invalid token.' })
        return
    }

    const body = await ctx.request.body({ type: 'json' }).value
    if (body.message == null || body.guild == null || body.user_id == null) {
        ctx.response.body = stringify({ success: false, error: 'Required body parameters were not given.' })
        return
    }

    // Permission check
    if (!authTokens[apiKey].global && !authTokens[apiKey].guilds.includes(body.guild)) {
        ctx.response.body = stringify({ success: false, error: 'You cannot submit information for that guild.' })
        return
    }

    // Fetch current votes
    const votes = await runQuery('SELECT upvotes, downvotes FROM suggestions WHERE message = $1', [body.message]) as any
    if (!votes.rowCount) {
        ctx.response.body = stringify({ success: false, error: 'Suggestion does not exist.' })
        return
    }

    const currentUpvotes: Array<string> = JSON.parse(votes.rows[0].upvotes)
    const currentDownvotes: Array<string> = JSON.parse(votes.rows[0].downvotes)

    if (currentUpvotes.includes(body.user_id)) {
        ctx.response.body = stringify({ success: false, error: 'Already upvoted.' })
        return
    }

    // Add user to the upvotes
    currentUpvotes.push(body.user_id)

    // Check if the user downvoted first
    if (currentDownvotes.includes(body.user_id)) {
        // Remove the downvote
        const index = currentDownvotes.indexOf(body.user_id)
        currentDownvotes.splice(index, 1)
    }

    await runQuery('UPDATE suggestions SET upvotes = $1, downvotes = $2 WHERE message = $3', [stringify(currentUpvotes), stringify(currentDownvotes), body.message])

    ctx.response.body = stringify({ success: true, new_upvotes: currentUpvotes.length, new_downvotes: currentDownvotes.length })
})

/*
 * Submit a downvote for a suggestion
 *
 * Required json body:
 *  - message
 *  - guild
 *  - user_id
 */
router.post('/suggestions/downvote', async (ctx: any) => {
    // Get api key
    const apiKey = ctx.request.headers.get('Api-Key')
    // Check api key validity
    if (apiKey == null || authTokens[apiKey] == null) {
        ctx.response.body = stringify({ success: false, error: 'Invalid token.' })
        return
    }

    const body = await ctx.request.body({ type: 'json' }).value
    if (body.message == null || body.guild == null || body.user_id == null) {
        ctx.response.body = stringify({ success: false, error: 'Required body parameters were not given.' })
        return
    }

    // Permission check
    if (!authTokens[apiKey].global && !authTokens[apiKey].guilds.includes(body.guild)) {
        ctx.response.body = stringify({ success: false, error: 'You cannot submit information for that guild.' })
        return
    }

    // Fetch current votes
    const votes = await runQuery('SELECT upvotes, downvotes FROM suggestions WHERE message = $1', [body.message]) as any
    if (!votes.rowCount) {
        ctx.response.body = stringify({ success: false, error: 'Suggestion does not exist.' })
        return
    }

    const currentUpvotes: Array<string> = JSON.parse(votes.rows[0].upvotes)
    const currentDownvotes: Array<string> = JSON.parse(votes.rows[0].downvotes)

    if (currentDownvotes.includes(body.user_id)) {
        ctx.response.body = stringify({ success: false, error: 'Already downvoted.' })
        return
    }

    // Add user to the downvotes
    currentDownvotes.push(body.user_id)

    // Check if the user upvoted first
    if (currentUpvotes.includes(body.user_id)) {
        // Remove the upvote
        const index = currentUpvotes.indexOf(body.user_id)
        currentUpvotes.splice(index, 1)
    }

    await runQuery('UPDATE suggestions SET upvotes = $1, downvotes = $2 WHERE message = $3', [stringify(currentUpvotes), stringify(currentDownvotes), body.message])

    ctx.response.body = stringify({ success: true, new_upvotes: currentUpvotes.length, new_downvotes: currentDownvotes.length })
})

/*
 * Fetch a suggestion/report
 *
 * Required params:
 *  - guild_id
 *  - id
 */
router.get('/fetch/:guild_id/:id', async (ctx: any) => {
    // Get api key
    const apiKey = ctx.request.headers.get('Api-Key')
    // Check api key validity
    if (apiKey == null || authTokens[apiKey] == null) {
        ctx.response.body = stringify({ success: false, error: 'Invalid token.' })
        return
    }

    // Permission check
    if (!authTokens[apiKey].global && !authTokens[apiKey].guilds.includes(ctx.params.guild_id)) {
        ctx.response.body = stringify({ success: false, error: 'You cannot fetch information for that guild.' })
        return
    }

    if (ctx.params.id.startsWith('s_')) {
        // Get the suggestion from the database
        const res = await runQuery('SELECT * FROM suggestions WHERE guild = $1 AND id = $2', [ctx.params.guild_id, ctx.params.id])
        ctx.response.body = res.rowCount == 0 ? stringify({ success: true, data: [] }) : stringify({ success: true, data: res.rows })
    } else if (ctx.params.id.startsWith('r_')) {
        // Get the report from the database
        const res = await runQuery('SELECT * FROM reports WHERE guild = $1 AND id = $2', [ctx.params.guild_id, ctx.params.id])
        ctx.response.body = res.rowCount == 0 ? stringify({ success: true, data: [] }) : stringify({ success: true, data: res.rows })
    } else {
        ctx.response.body = stringify({ success: false, error: 'ID parameter was invalid.' })
    }
})

/*
 * Fetch all suggestions/reports
 *
 * Required params:
 *  - guild_id
 */
router.get('/fetchall/:guild_id', async (ctx: any) => {
    // Get api key
    const apiKey = ctx.request.headers.get('Api-Key')
    // Check api key validity
    if (apiKey == null || authTokens[apiKey] == null) {
        ctx.response.body = stringify({ success: false, error: 'Invalid token.' })
        return
    }

    // Permission check
    if (!authTokens[apiKey].global && !authTokens[apiKey].guilds.includes(ctx.params.guild_id)) {
        ctx.response.body = stringify({ success: false, error: 'You cannot fetch information for that guild.' })
        return
    }

    // Fetch all suggestion and report data
    const sugRes = await runQuery('SELECT * FROM suggestions WHERE guild = $1', [ctx.params.guild_id])
    const repRes = await runQuery('SELECT * FROM reports WHERE guild = $1', [ctx.params.guild_id])

    // Return the data
    ctx.response.body = stringify({
        success: true,
        suggestions: sugRes.rowCount == 0 ? [] : sugRes.rows,
        reports: repRes.rowCount == 0 ? [] : repRes.rows
    })
})

// Export the router as default
export default router