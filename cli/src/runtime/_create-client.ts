import { type BatchOptions, createFetcher } from './_fetcher'
import type { ExecutionResult, LinkedType } from './_types'
import {
    generateGraphqlOperation,
    type GraphqlOperation,
} from './_generate-graphql-operation'
import { replaceSystemAliases } from './_aliasing'

export type Headers =
    | HeadersInit
    | (() => HeadersInit)
    | (() => Promise<HeadersInit>)

export type BaseFetcher = (
    operation: GraphqlOperation | GraphqlOperation[],
    extraFetchOptions?: Partial<RequestInit>,
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
    getExtraFetchOptions,
    ...options
}: ClientOptions & {
    queryRoot?: LinkedType
    mutationRoot?: LinkedType
    subscriptionRoot?: LinkedType
    getExtraFetchOptions?: (
        op: 'query' | 'mutation',
        body: GraphqlOperation,
    ) => Partial<RequestInit>
}) => {
    const fetcher = createFetcher(options)
    const client: {
        query?: Function
        mutation?: Function
    } = {}

    if (queryRoot) {
        client.query = (request: any) => {
            if (!queryRoot) throw new Error('queryRoot argument is missing')

            const body = generateGraphqlOperation('query', queryRoot, request)
            const extraFetchOptions = getExtraFetchOptions?.('query', body)

            const resultPromise = fetcher(body, extraFetchOptions).then(
                (result) => replaceSystemAliases(result),
            )

            return resultPromise
        }
    }
    if (mutationRoot) {
        client.mutation = (request: any) => {
            if (!mutationRoot)
                throw new Error('mutationRoot argument is missing')

            const body = generateGraphqlOperation(
                'mutation',
                mutationRoot,
                request,
            )
            const extraFetchOptions = getExtraFetchOptions?.('mutation', body)
            const resultPromise = fetcher(
                generateGraphqlOperation('mutation', mutationRoot, request),
                extraFetchOptions,
            )

            return resultPromise
        }
    }

    return client as any
}

createClient.replaceSystemAliases = replaceSystemAliases
