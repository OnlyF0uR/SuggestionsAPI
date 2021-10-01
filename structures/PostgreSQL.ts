import { Client } from '../deps.ts'
import config from '../config.js'

const client = new Client(config.database)

const runQuery = async (query: string, values: any[]) => {
    await client.connect()
    const dbResult = await client.queryObject({
        text: query,
        args: values
    })
    await client.end()
    return dbResult
}

export { runQuery }