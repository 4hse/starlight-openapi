import { $RefParser } from '@apidevtools/json-schema-ref-parser'
import type { AstroIntegrationLogger } from 'astro'

import type { Schema, StarlightOpenAPISchemaConfig } from './schema'

export async function parseSchema(
  logger: AstroIntegrationLogger,
  config: StarlightOpenAPISchemaConfig,
): Promise<Schema> {
  try {
    logger.info(`Parsing OpenAPI schema at '${config.schema}'.`)

    const parser = new $RefParser()
    const document = await parser.bundle(config.schema, {
      resolve: {
        http: {
          headers: {
            'User-Agent': 'Starlight OpenAPI Parser',
          },
          safeUrlResolver: false,
        }
      }
    })

    return { config, document }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message)
    }

    throw error
  }
}
