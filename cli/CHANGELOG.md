# @genql/cli

## 9.0.0-canary.10

### Patch Changes

-   support bshb*workflow*

## 9.0.0-canary.9

### Patch Changes

-   add catchall for any type that needs to send its type via description

## 9.0.0-canary.8

### Patch Changes

-   support BSHBEventSchema scalar type

## 9.0.0-canary.7

### Patch Changes

-   handle event types

## 9.0.0-canary.6

### Patch Changes

-   implement getExtraFetchOptions

## 9.0.0-canary.5

### Patch Changes

-   fix headers being overriden

## 9.0.0-canary.4

### Minor Changes

-   receive extra fetch options with callback

## 9.0.0-canary.2

### Minor Changes

-   pass alias thing to .js

## 9.0.0-canary.1

### Patch Changes

-   expose replaceSystemAliases

## 9.0.0-canary.0

### Major Changes

-   auto alias fields under unions to prevent conflicts

## 8.0.1

### Patch Changes

-   auto stringify incoming args that need to be strings

## 8.0.0

### Major Changes

-   Change the way we parse select fields

## 7.0.9

### Patch Changes

-   support scalars for select fields

## 7.0.8

### Patch Changes

-   Fix: export QueryGenqlSelection as a type

## 7.0.7

### Patch Changes

-   underscore runtime files to prevent conflicts with nextjs file conventions

## 7.0.6

### Patch Changes

-   export fragmentOnRecursiveCollection

## 7.0.5

### Patch Changes

-   introduce fragmentOnRecursiveCollection (a basehub specific thing)

## 7.0.4

### Patch Changes

-   fix bug

## 7.0.3

### Patch Changes

-   recursively omit \_\_fragmentOn type

## 7.0.2

### Patch Changes

-   export also QueryGenqlSelection and QueryResult

## 7.0.1

### Patch Changes

-   bring back an export

## 7.0.0

### Major Changes

-   Introduce fragmentOn and just export that from the schema

## 6.3.5

### Patch Changes

-   Log changes

## 6.3.4

### Patch Changes

-   Testing basehub fork

## 6.3.3

### Patch Changes

-   Deprecate cli options --esm

## 6.3.1

-   Fix array types when array content is nullable, https://github.com/remorses/genql/pull/144. Thanks to @wellguimaraes

## 6.3.0

-   Fix custom scalars typed with object types
-   Make required top level arguments with defaults non required
-   \_\_scalar: true should exclude scalars with required arguments

## 2.10.0

Fixed problem generating interfaces without any implementation

## 2.9.0

Support for more than one : in -S option (by @boredland)

Fixed declaration files generations for enums (by @DanielRose)

## 2.8.0

Add `as const` on enum objects to not use type object values as strings

## 2.7.0

Added `enumGraphqlEnumName` exports to get access to enum strings

## 2.6.0

-   Query any interface on an union, not only the common ones
-   Fixed \_\_typename always optional

## 2.5.0

-   Do not query falsy values when using \_\_scalar

## 2.4.0

-   Ability to query interfaces that a union implements https://github.com/remorses/genql/issues/44

## 2.3.3

-   `genql-cli` package becomes `@genql/cli`
-   `genql-runtime` package becomes `@genql/runtime`
-   headers can be an async function
-   you can now add an operation name to a query using `__name`
-   only generate commonjs code by default (using require and module.exports) to prevent people from importing from `index.esm`, use the `--esm` flag if you want to use esm
-   response types only include requested fields
-   added built in batching (see https://genql.dev/docs/usage/batching-queries)
-   `--sort` flag
-   generated `types.json` now is `types.js`
-   smaller `types.js` and hence smaller bundle size
-   made the website page converter to convert from graphql queries to genql code: https://genql.dev/converter
-   custom `fetcher` now has type `(operation: GraphqlOperation | GraphqlOperation[], ) => Promise<ExecutionResult>` to support built in batching
-   added a `@genql/cli/printer` module to print a graphql query AST to genql code
