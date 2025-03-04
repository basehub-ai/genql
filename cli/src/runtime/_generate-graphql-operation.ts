import { aliasSeparator } from './_aliasing'
import type { LinkedField, LinkedType } from './_types'

export interface Args {
    [arg: string]: any | undefined
}

export interface Fields {
    [field: string]: Request
}

export type Request = boolean | number | Fields

export interface Variables {
    [name: string]: {
        value: any
        typing: [LinkedType, string]
    }
}

export interface Context {
    root: LinkedType
    varCounter: number
    variables: Variables
    fragmentCounter: number
    fragments: string[]
}

export interface GraphqlOperation {
    query: string
    variables?: { [name: string]: any }
    operationName?: string
}

const parseRequest = (
    request: Request | undefined,
    ctx: Context,
    path: string[],
    options?: { aliasPrefix?: string },
): string => {
    if (typeof request === 'object' && '__args' in request) {
        const args: any = request.__args
        let fields: Request | undefined = { ...request }
        delete fields.__args
        const argNames = Object.keys(args)

        if (argNames.length === 0) {
            return parseRequest(fields, ctx, path, options)
        }

        const field = getFieldFromPath(ctx.root, path)

        const argStrings = argNames.map((argName) => {
            ctx.varCounter++
            const varName = `v${ctx.varCounter}`

            const typing = field.args && field.args[argName] // typeMap used here, .args

            if (!typing) {
                throw new Error(
                    `no typing defined for argument \`${argName}\` in path \`${path.join(
                        '.',
                    )}\``,
                )
            }

            const shouldStringifyValue = ['String', 'String!'].includes(
                typing[1],
            )
            let value = args[argName]
            if (shouldStringifyValue) {
                if (typeof value === 'object') {
                    // stringify the object
                    value = JSON.stringify(value)
                }
            }

            ctx.variables[varName] = {
                value,
                typing,
            }

            return `${argName}:$${varName}`
        })
        return `(${argStrings})${parseRequest(fields, ctx, path, options)}`
    } else if (typeof request === 'object' && Object.keys(request).length > 0) {
        const fields = request
        const fieldNames = Object.keys(fields).filter((k) => Boolean(fields[k]))

        const type =
            path.length > 0 ? getFieldFromPath(ctx.root, path).type : ctx.root
        const scalarFields = type.scalar

        let scalarFieldsFragment: string | undefined

        const validFieldNames = fieldNames.filter((f) => {
            if (['__scalar', '__name', '__fragmentOn'].includes(f)) return true
            if (f.startsWith('on_')) return true
            return type.fields && f in type.fields
        })

        if (validFieldNames.length === 0) {
            return ''
        }

        if (fieldNames.includes('__scalar')) {
            const falsyFieldNames = new Set(
                Object.keys(fields).filter((k) => !Boolean(fields[k])),
            )
            if (scalarFields?.length) {
                ctx.fragmentCounter++
                scalarFieldsFragment = `f${ctx.fragmentCounter}`

                ctx.fragments.push(
                    `fragment ${scalarFieldsFragment} on ${
                        type.name
                    }{${scalarFields
                        .filter((f) => !falsyFieldNames.has(f))
                        .map(
                            (f) =>
                                `${
                                    options?.aliasPrefix
                                        ? `${options.aliasPrefix}${aliasSeparator}${f}: `
                                        : ''
                                }${f}`,
                        )
                        .join(',')}}`,
                )
            }
        }

        const fieldsSelection = validFieldNames
            .filter((f) => !['__scalar', '__name', '__fragmentOn'].includes(f))
            .map((f) => {
                if (f.startsWith('on_')) {
                    ctx.fragmentCounter++
                    const implementationFragment = `f${ctx.fragmentCounter}`
                    const parsed = parseRequest(fields[f], ctx, [...path, f], {
                        ...options,
                        aliasPrefix: implementationFragment,
                    })

                    const typeMatch = f.match(/^on_(.+)/)

                    if (!typeMatch || !typeMatch[1])
                        throw new Error('match failed')

                    ctx.fragments.push(
                        `fragment ${implementationFragment} on ${typeMatch[1]}${parsed}`,
                    )

                    return `...${implementationFragment}`
                } else {
                    const field = type.fields?.[f]
                    if (!field) return ''

                    // For scalar fields or fields without subfields, just return the field name
                    if (!field.type.fields) {
                        return `${
                            options?.aliasPrefix
                                ? `${options.aliasPrefix}${aliasSeparator}${f}: `
                                : ''
                        }${f}`
                    }

                    // For object fields, parse recursively
                    const parsed = parseRequest(
                        fields[f],
                        ctx,
                        [...path, f],
                        options,
                    )

                    // If the parsed result is empty and this is an object type,
                    // we should include at least one field or it will be invalid GraphQL
                    if (!parsed && field.type.fields) {
                        // Get the first scalar field as a default selection
                        const firstScalar = field.type.scalar?.[0]
                        if (firstScalar) {
                            return `${
                                options?.aliasPrefix
                                    ? `${options.aliasPrefix}${aliasSeparator}${f}: `
                                    : ''
                            }${f}{${firstScalar}}`
                        }
                    }

                    return `${
                        options?.aliasPrefix
                            ? `${options.aliasPrefix}${aliasSeparator}${f}: `
                            : ''
                    }${f}${parsed}`
                }
            })
            .filter(Boolean)
            .concat(scalarFieldsFragment ? [`...${scalarFieldsFragment}`] : [])
            .join(',')

        return fieldsSelection ? `{${fieldsSelection}}` : ''
    } else {
        return ''
    }
}

export const generateGraphqlOperation = (
    operation: 'query' | 'mutation' | 'subscription',
    root: LinkedType,
    fields?: Fields,
): GraphqlOperation => {
    const ctx: Context = {
        root: root,
        varCounter: 0,
        variables: {},
        fragmentCounter: 0,
        fragments: [],
    }
    const result = parseRequest(fields, ctx, [])

    const varNames = Object.keys(ctx.variables)

    const varsString =
        varNames.length > 0
            ? `(${varNames.map((v) => {
                  const variableType = ctx.variables[v].typing[1]
                  return `$${v}:${variableType}`
              })})`
            : ''

    const operationName = fields?.__name || ''

    return {
        query: [
            `${operation} ${operationName}${varsString}${result}`,
            ...ctx.fragments,
        ].join(','),
        variables: Object.keys(ctx.variables).reduce<{ [name: string]: any }>(
            (r, v) => {
                r[v] = ctx.variables[v].value
                return r
            },
            {},
        ),
        ...(operationName ? { operationName: operationName.toString() } : {}),
    }
}

export const getFieldFromPath = (
    root: LinkedType | undefined,
    path: string[],
) => {
    let current: LinkedField | undefined

    if (!root) throw new Error('root type is not provided')

    if (path.length === 0) throw new Error(`path is empty`)

    path.forEach((f) => {
        const type = current ? current.type : root

        if (!type.fields)
            throw new Error(`type \`${type.name}\` does not have fields`)

        const possibleTypes = Object.keys(type.fields)
            .filter((i) => i.startsWith('on_'))
            .reduce(
                (types, fieldName) => {
                    const field = type.fields && type.fields[fieldName]
                    if (field) types.push(field.type)
                    return types
                },
                [type],
            )

        let field: LinkedField | null = null

        possibleTypes.forEach((type) => {
            const found = type.fields && type.fields[f]
            if (found) field = found
        })

        if (!field)
            throw new Error(
                `type \`${type.name}\` does not have a field \`${f}\``,
            )

        current = field
    })

    return current as LinkedField
}
