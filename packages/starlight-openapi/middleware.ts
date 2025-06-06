import { defineRouteMiddleware } from '@astrojs/starlight/route-data'
import schemas from 'virtual:starlight-openapi-schemas'
import config from 'virtual:starlight/user-config';
import { stripLeadingAndTrailingSlashes } from './libs/path'
import { getSidebarFromSchemas } from './libs/starlight'

const allSchemas = Object.values(schemas)

export const onRequest = defineRouteMiddleware((context) => {
  const { starlightRoute } = context.locals
  const { sidebar } = starlightRoute

  starlightRoute.sidebar = getSidebarFromSchemas(
    stripLeadingAndTrailingSlashes(context.url.pathname),
    sidebar,
    allSchemas,
  )

  const isApiPath = allSchemas.filter(schema => stripLocale(schema.config.base) === stripLocale(context.url.pathname)).length > 0;

  if (context.currentLocale !== config.defaultLocale.locale && isApiPath) {
      starlightRoute.isFallback = true;
  }

})

function stripLocale(path: string): string {
  return stripLeadingAndTrailingSlashes(path).replace(/^[a-z]{2}\//, '');
}
