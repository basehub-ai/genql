import {
    GraphQLSchema,
    isInputObjectType,
    isInterfaceType,
    isObjectType,
    isUnionType,
    GraphQLObjectType,
} from 'graphql'
import { excludedTypes } from '../common/excludedTypes'
import { RenderContext } from '../common/RenderContext'
import { inputObjectType } from './inputObjectType'
import { objectType } from './objectType'
import { unionType } from './unionType'
import { sortKeys } from '../common/support'
import { requestTypeName } from './requestTypeName'

export const renderRequestTypes = (
    schema: GraphQLSchema,
    ctx: RenderContext,
) => {
    let typeMap = schema.getTypeMap()

    if (ctx.config?.sortProperties) {
        typeMap = sortKeys(typeMap)
    }

    const fragmentMap = new Map<
        string,
        { rootTypeName: string; selectionTypeName: string }
    >()

    for (const name in typeMap) {
        if (excludedTypes.includes(name)) continue

        const type = typeMap[name]

        if (isObjectType(type) || isInterfaceType(type)) {
            const result = objectType(type, ctx)
            fragmentMap.set(result.rootTypeName, result)
        }
        if (isInputObjectType(type)) inputObjectType(type, ctx)
        if (isUnionType(type)) unionType(type, ctx)
    }

    const aliases = [
        { type: schema.getQueryType(), name: 'QueryGenqlSelection' },
        { type: schema.getMutationType(), name: 'MutationGenqlSelection' },
        {
            type: schema.getSubscriptionType(),
            name: 'SubscriptionGenqlSelection',
        },
    ]
        .map(renderAlias)
        .filter(Boolean)
        .join('\n')

    ctx.addCodeBlock(aliases)

    const fragmentsMapCode = renderFragmentsMapAndHelpers(fragmentMap)
    ctx.addCodeBlock(fragmentsMapCode)
}

function renderAlias({
    type,
    name,
}: {
    type?: GraphQLObjectType | null
    name: string
}) {
    if (type && requestTypeName(type) !== name) {
        // TODO make the camel case or kebab case an option
        return `export type ${name} = ${requestTypeName(type)}`
    }
    return ''
}

function renderFragmentsMapAndHelpers(
    fragmentMap: Map<
        string,
        { rootTypeName: string; selectionTypeName: string }
    >,
) {
    let result = `type FragmentsMap = {\n`

    for (const [key, value] of fragmentMap) {
        result += `  ${key}: {
    root: ${value.rootTypeName},
    selection: ${value.selectionTypeName},
}\n`
    }

    result += '}\n'

    result += `
import { FieldsSelection } from "./runtime";

export function fragmentOn<
    TypeName extends keyof FragmentsMap,
    Selection extends FragmentsMap[TypeName]["selection"],
>(name: TypeName, fields: Selection) {
  return { __fragmentOn: name, ...fields } as const;
}

// credits: https://stackoverflow.com/a/54487392
type OmitDistributive<T, K extends PropertyKey> = T extends any
    ? T extends object
        ? Id<OmitRecursively<T, K>>
        : T
    : never
type Id<T> = {} & { [P in keyof T]: T[P] } // Cosmetic use only makes the tooltips expad the type can be removed
type OmitRecursively<T, K extends PropertyKey> = Omit<
    { [P in keyof T]: OmitDistributive<T[P], K> },
    K
>

export namespace fragmentOn {
    export type infer<T> = T extends {
      __fragmentOn: infer U extends keyof FragmentsMap;
    }
      ? OmitRecursively<FieldsSelection<FragmentsMap[U]["root"], Omit<T, "__fragmentOn">>, "__fragmentOn">
      : never;
  }


// This is a BaseHub-specific thing:

type RecursiveCollection<T, Key extends keyof T> = T & {
[key in Key]: { items: RecursiveCollection<T, Key> };
};

export function fragmentOnRecursiveCollection<
  TypeName extends keyof FragmentsMap,
  Selection extends FragmentsMap[TypeName]["selection"],
  RecursiveKey extends keyof FragmentsMap[TypeName]["selection"]
>(
  name: TypeName,
  fields: Selection,
  options: {
    recursiveKey: RecursiveKey;
    levels: number;
    getLevelArgs?: (level: number) => unknown;
  }
) {
  let current = {
    ...fields,
  } as RecursiveCollection<
    { readonly __fragmentOn: TypeName } & Selection,
    RecursiveKey
  >;
  if (options.levels > 0) {
    current[options.recursiveKey] = {
      ...(options.getLevelArgs
        ? { __args: options.getLevelArgs(options.levels) }
        : {}),
      items: fragmentOnRecursiveCollection(name, fields, {
        ...options,
        levels: options.levels - 1,
      }),
    } as any;
  }
  return current;
}

`

    return result
}
