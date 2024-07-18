import { type BatchOptions, createFetcher } from './_fetcher'
import type { ExecutionResult, LinkedType } from './_types'
import {
    generateGraphqlOperation,
    type GraphqlOperation,
} from './_generate-graphql-operation'
import { aliasSeparator } from './_aliasing'

export type Headers =
    | HeadersInit
    | (() => HeadersInit)
    | (() => Promise<HeadersInit>)

export type BaseFetcher = (
    operation: GraphqlOperation | GraphqlOperation[],
) => Promise<ExecutionResult | ExecutionResult[]>

export type ClientOptions = Omit<RequestInit, 'body' | 'headers'> & {
    url?: string
    batch?: BatchOptions | boolean
    fetcher?: BaseFetcher
    fetch?: Function
    headers?: Headers
}

export const createClient = ({
    queryRoot,
    mutationRoot,
    subscriptionRoot,
    ...options
}: ClientOptions & {
    queryRoot?: LinkedType
    mutationRoot?: LinkedType
    subscriptionRoot?: LinkedType
}) => {
    const fetcher = createFetcher(options)
    const client: {
        query?: Function
        mutation?: Function
    } = {}

    if (queryRoot) {
        client.query = (request: any) => {
            if (!queryRoot) throw new Error('queryRoot argument is missing')

            const resultPromise = fetcher(
                generateGraphqlOperation('query', queryRoot, request),
            ).then((result) => replaceSystemAliases(result))

            return resultPromise
        }
    }
    if (mutationRoot) {
        client.mutation = (request: any) => {
            if (!mutationRoot)
                throw new Error('mutationRoot argument is missing')

            const resultPromise = fetcher(
                generateGraphqlOperation('mutation', mutationRoot, request),
            )

            return resultPromise
        }
    }

    return client as any
}

function replaceSystemAliases(obj: unknown): any {
    if (typeof obj !== 'object' || obj === null) {
        return obj
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => replaceSystemAliases(item))
    }

    const newObj = {}
    for (const [key, value] of Object.entries(obj)) {
        if (key.includes(aliasSeparator)) {
            const [prefix, ...rest] = key.split(aliasSeparator)
            const newKey = rest.join(aliasSeparator) // In case there are multiple __alias__ in the key
            newObj[newKey] = replaceSystemAliases(value)
        } else {
            newObj[key] = replaceSystemAliases(value)
        }
    }

    return newObj
}
