export { createClient } from './_create-client'
export type { ClientOptions } from './_create-client'
export type { FieldsSelection } from './_type-selection'
export { generateGraphqlOperation } from './_generate-graphql-operation'
export type { GraphqlOperation } from './_generate-graphql-operation'
export { linkTypeMap } from './_link-type-map'
// export { Observable } from 'zen-observable-ts'
export { createFetcher } from './_fetcher'
export { GenqlError } from './_error'
export const everything = {
    __scalar: true,
}
