import { GraphQLNamedType } from 'graphql'
import { typeComment } from '../common/comment'
import { RenderContext } from '../common/RenderContext'

const knownTypes: {
    [name: string]: string
} = {
    Int: 'number',
    Float: 'number',
    String: 'string',
    Boolean: 'boolean',
    ID: 'string',
}

export const getTypeMappedAlias = (
    type: GraphQLNamedType,
    ctx: RenderContext,
) => {
    const map = { ...knownTypes, ...(ctx?.config?.scalarTypes || {}) }

    if (type.name.startsWith('BSHBSelect')) {
        try {
            // our custom select scalar
            const acceptedValues = JSON.parse(
                type.description || '[]',
            ) as string[]

            let result = ''
            if (acceptedValues) {
                result += acceptedValues.map((v) => `'${v}'`).join(' | ')
            }

            if (!result) {
                // fallback
                result = 'string'
            }

            return result
        } catch (err) {
            // noop
        }
    } else if (type.name.startsWith('bshb_event_')) {
        const parsed = JSON.parse(type.description || '{}') as {
            keyType: string
            schemaType: string
        }
        return `${parsed.keyType},\n    schema_${type.name}: ${parsed.schemaType}`
    }

    return map?.[type.name] || 'any'
}

// export const renderTypeMappedAlias = (
//     type: GraphQLNamedType,
//     ctx: RenderContext,
// ) => {
//     const mappedType = getTypeMappedAlias(type, ctx)
//     if (mappedType) {
//         ctx.addCodeBlock(
//             `${typeComment(type)}export type ${type.name} = ${mappedType}`,
//         )
//     }
// }
