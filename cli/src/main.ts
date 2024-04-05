import { Config } from './config'
import { Listr } from 'listr2'
import { OutputContextRef, clientTasks } from './tasks/clientTasks'
import { schemaTask } from './tasks/schemaTask'

export const generate = async (
    config: Config,
): Promise<OutputContextRef['current']> => {
    if (!config.output) {
        throw new Error('`output` must be defined in the config')
    }

    const outputContextRef: OutputContextRef = {
        current: { preventedClientGeneration: false, schemaHash: '' },
    }

    await new Listr(
        [
            {
                title: `generating the client in \`${config.output}\``,
                task: () =>
                    new Listr([
                        schemaTask(config),
                        ...clientTasks(config, outputContextRef),
                    ]),
            },
        ],
        {
            renderer: config.verbose ? 'verbose' : 'default',
            exitOnError: true,
            ...(config.silent ? { silentRendererCondition: () => true } : {}),
        },
    )
        .run()
        .catch((e) => {
            // cconsole.log(e)
            throw e?.errors?.[0]
        })

    return outputContextRef.current
}
