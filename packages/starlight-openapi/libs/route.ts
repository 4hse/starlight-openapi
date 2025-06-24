import schemas from 'virtual:starlight-openapi-schemas'

import {
  type OperationTag,
  type PathItemOperation,
} from './operation'
import { getBasePath, stripLeadingAndTrailingSlashes } from './path'
import type { Schema } from './schema'

export function getSchemaStaticPaths(): StarlighOpenAPIRoute[] {
  return Object.values(schemas).flatMap((schema) => [
    {
      params: {
        openAPISlug: stripLeadingAndTrailingSlashes(getBasePath(schema.config)),
      },
      props: {
        schema,
        type: 'overview',
      },
    }
  ])
}

interface StarlighOpenAPIRoute {
  params: {
    openAPISlug: string
  }
  props: StarlighOpenAPIRouteOverviewProps | StarlighOpenAPIRouteOperationProps | StarlighOpenAPIRouteOperationTagProps
}

interface StarlighOpenAPIRouteOverviewProps {
  schema: Schema
  type: 'overview'
}

interface StarlighOpenAPIRouteOperationProps {
  operation: PathItemOperation
  schema: Schema
  type: 'operation'
}

interface StarlighOpenAPIRouteOperationTagProps {
  schema: Schema
  tag: OperationTag
  type: 'operation-tag'
}
