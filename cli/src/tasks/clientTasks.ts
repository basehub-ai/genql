import crypto from "crypto";
import { GraphQLSchema, GraphQLEnumType, isEnumType } from "graphql";
import { ListrTask, Listr } from "listr2";
import { camelCase, capitalize } from "../utils";
import { Config } from "../config";
import { ensurePath, writeFileToPath } from "../helpers/files";
import { renderClientEsm } from "../render/client/renderClient";
import { excludedTypes } from "../render/common/excludedTypes";
import { RenderContext } from "../render/common/RenderContext";
import { renderRequestTypes } from "../render/requestTypes/renderRequestTypes";
import { renderResponseTypes } from "../render/responseTypes/renderResponseTypes";
import { renderSchema } from "../render/schema/renderSchema";
import { renderTypeGuards } from "../render/typeGuards/renderTypeGuards";
import { renderTypeMap } from "../render/typeMap/renderTypeMap";
import path from "path";
import fsx from "fs-extra";

const schemaTypesFile = "schema.ts";
const schemaGqlFile = "schema.graphql";

const typeMapFileEsm = "types.ts";

const cliRoot = path.resolve(require.resolve("../../package.json"), "..");

const runtimeFolderPath = path.resolve(cliRoot, "src/runtime");

export type OutputContextRef = {
  current: { preventedClientGeneration: boolean; schemaHash: string };
};

export const clientTasks = (
  config: Config,
  outputContextRef: OutputContextRef
): ListrTask[] => {
  const clientFileEsm = "index.ts";

  if (!config.output) throw new Error("`output` must be defined in the config");

  const output = config.output;

  const tasks: (false | ListrTask)[] = [
    {
      title: `writing ${schemaGqlFile}`,
      task: async (ctx) => {
        const renderCtx = new RenderContext(ctx.schema, config);
        renderSchema(ctx.schema, renderCtx);
        const schemaContent = renderCtx.toCode("graphql");
        const schemaHash = crypto
          .createHash("md5")
          .update(schemaContent)
          .digest("hex");

        outputContextRef.current.schemaHash = schemaHash;

        if (config.previousSchemaHash === schemaHash) {
          ctx.preventedClientGeneration = true;
          outputContextRef.current.preventedClientGeneration = true;
          return;
        }

        // should generate client
        outputContextRef.current.preventedClientGeneration = false;
        await writeFileToPath([output, schemaGqlFile], schemaContent);

        // keep going with the rest of the tasks
        return new Listr(
          [
            {
              title: `copy runtime files`,
              task: async (ctx) => {
                // copy files from runtime folder to output
                await fsx.ensureDir(path.resolve(output, "runtime"));
                let files = await fsx.readdir(runtimeFolderPath);
                for (let file of files) {
                  let contents = await fsx.readFile(
                    path.resolve(runtimeFolderPath, file),
                    "utf-8"
                  );
                  contents = "// @ts-nocheck\n" + contents;
                  await fsx.writeFile(
                    path.resolve(output, "runtime", file),
                    contents
                  );
                }
                // await fsx.copy(
                //     runtimeFolderPath,
                //     path.resolve(output, 'runtime'),
                // )
              },
            },
            {
              title: `writing ${schemaTypesFile}`,
              task: async (ctx) => {
                const renderCtx = new RenderContext(ctx.schema, config);

                renderResponseTypes(ctx.schema, renderCtx);
                renderRequestTypes(ctx.schema, renderCtx);
                renderTypeGuards(ctx.schema, renderCtx);
                renderEnumsMaps(ctx.schema, renderCtx);

                await writeFileToPath(
                  [output, schemaTypesFile],
                  "// @ts-nocheck\n/* istanbul ignore file */\n/* tslint:disable */\n/* eslint-disable */\n\n" +
                    renderCtx.toCode("typescript")
                );
              },
            },
            {
              title: `writing types map`,
              task: async (ctx) => {
                const renderCtx = new RenderContext(ctx.schema, config);

                renderTypeMap(ctx.schema, renderCtx);

                await writeFileToPath(
                  [output, typeMapFileEsm],
                  `export default ${renderCtx.toCode()}`
                );
              },
            },
            {
              title: `writing ${clientFileEsm}`,
              task: async (ctx) => {
                const renderCtx = new RenderContext(ctx.schema, config);
                renderClientEsm(ctx.schema, renderCtx);
                await writeFileToPath(
                  [output, clientFileEsm],
                  "// @ts-nocheck\n" + renderCtx.toCode("typescript", true)
                );
              },
            },
          ],
          { ctx, concurrent: true }
        );
      },
    },
  ];

  return [
    {
      title: "preparing client directory",
      task: () => ensurePath([output], false),
    },
    {
      title: `writing files`,
      task: () => {
        return new Listr(tasks.filter((x) => Boolean(x)) as ListrTask[], {
          concurrent: true,
        });
      },
    },
  ];
};

function renderEnumsMaps(schema: GraphQLSchema, ctx: RenderContext) {
  let typeMap = schema.getTypeMap();

  const enums: GraphQLEnumType[] = [];
  for (const name in typeMap) {
    if (excludedTypes.includes(name)) continue;

    const type = typeMap[name];

    if (isEnumType(type)) {
      enums.push(type);
    }
  }
  if (enums.length === 0) return;

  ctx.addCodeBlock(
    enums
      .map(
        (type) =>
          `export const ${"enum" + capitalize(camelCase(type.name))} = {\n` +
          type
            .getValues()
            .map((v) => {
              if (!v?.name) {
                return "";
              }
              return `   ${v.name}: '${v.name}' as const`;
            })
            .join(",\n") +
          `\n}\n`
      )
      .join("\n")
  );
}
