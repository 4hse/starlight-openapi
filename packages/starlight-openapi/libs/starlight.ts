import type { StarlightRouteData } from '@astrojs/starlight/route-data'
import type { HookParameters } from '@astrojs/starlight/types'
import type { MarkdownHeading } from 'astro'

import { getCallbacks } from './callback'
import type { OperationHttpMethod, OperationTag, PathItemOperation } from './operation'
import { getOperationsByTag, getWebhooksOperations } from './operation'
import { getParametersByLocation } from './parameter'
import { getBaseLink, slug, stripLeadingAndTrailingSlashes } from './path'
import { hasRequestBody } from './requestBody'
import { includesDefaultResponse } from './response'
import type { Schema } from './schema'
import { getSecurityDefinitions, getSecurityRequirements } from './security'
import { capitalize } from './utils'

const starlightOpenAPISidebarGroupsLabel = Symbol('StarlightOpenAPISidebarGroupsLabel')

export function getSidebarGroupsPlaceholder(): SidebarManualGroupConfig[] {
  return [
    {
      collapsed: false,
      items: [],
      label: starlightOpenAPISidebarGroupsLabel.toString(),
    },
  ]
}

export function getPageProps(
  title: string,
  schema: Schema,
  pathItemOperation?: PathItemOperation,
  tag?: OperationTag,
): StarlightPageProps {
  const isOverview = pathItemOperation === undefined
  const isOperationTag = tag !== undefined

  return {
    frontmatter: {
      title,
    },
    headings: isOperationTag
      ? getOperationTagHeadings(tag)
      : isOverview
        ? getOverviewHeadings(schema)
        : getOperationHeadings(schema, pathItemOperation),
  }
}

export function getSidebarFromSchemas(
  pathname: string,
  sidebar: StarlightRouteData['sidebar'],
  schemas: Schema[],
): StarlightRouteData['sidebar'] {
  if (sidebar.length === 0) {
    return sidebar
  }

  // Create direct links for each schema instead of groups
  const sidebarLinks = schemas.map((schema) => {
    const { config, document } = schema
    return makeSidebarLink(pathname, config.sidebar.label ?? document.info.title, getBaseLink(config))
  })

  function replaceSidebarGroupsPlaceholder(group: SidebarGroup): SidebarGroup | SidebarItem[] {
    if (group.label === starlightOpenAPISidebarGroupsLabel.toString()) {
      return sidebarLinks
    }

    if (isSidebarGroup(group)) {
      return {
        ...group,
        entries: group.entries.flatMap((item) => {
          return isSidebarGroup(item) ? replaceSidebarGroupsPlaceholder(item) : item
        }),
      }
    }

    return group
  }

  return sidebar.flatMap((item) => {
    return isSidebarGroup(item) ? replaceSidebarGroupsPlaceholder(item) : item
  })
}

export function makeSidebarGroup(label: string, entries: SidebarItem[], collapsed: boolean): SidebarGroup {
  return { type: 'group', collapsed, entries, label, badge: undefined }
}

export function makeSidebarLink(pathname: string, label: string, href: string, badge?: SidebarBadge): SidebarLink {
  const currentLocale = pathname.split('/')[0];
  const localizedHrefArray = href.split('/');
  localizedHrefArray[1] = currentLocale;
  const localizedHref = localizedHrefArray.join('/');

  return { type: 'link', isCurrent: pathname === stripLeadingAndTrailingSlashes(localizedHref), label, href: localizedHref, badge, attrs: {} }
}

export function getMethodSidebarBadge(method: OperationHttpMethod): SidebarBadge {
  return { class: `sl-openapi-method-${method}`, text: method.toUpperCase(), variant: 'caution' }
}

function isSidebarGroup(item: SidebarItem): item is SidebarGroup {
  return item.type === 'group'
}

function getOverviewHeadings(schema: Schema): MarkdownHeading[] {
  const { document } = schema
  const items: MarkdownHeading[] = [];

  const securityDefinitions = getSecurityDefinitions(document)

  if (securityDefinitions) {
    items.push(
      makeHeading(2, 'Authentication'),
      ...Object.keys(securityDefinitions).map((name) => makeHeading(3, name)),
    )
  }

  // Add Operations heading if there are operations to display
  const operationsByTag = getOperationsByTag(schema)
  const allOperations = [...operationsByTag.values()].flatMap(tag => tag.entries)
  if (allOperations.length > 0) {
    items.push(makeHeading(2, 'Operations', 'operations'))

    // Add tag headings and operation headings
    for (const [tagName, tagOperations] of operationsByTag.entries()) {
      // Add operation headings under each tag
      for (const operation of tagOperations.entries) {
        const operationId = `operation-${operation.operation.operationId}-${operation.method}`
        items.push(makeHeading(3, operation.operation.summary ?? 'unknown', operationId))
      }
    }
  }

  // Add Webhooks heading if there are webhooks to display
  const webhookOperations = getWebhooksOperations(schema)
  if (webhookOperations.length > 0) {
    items.push(makeHeading(2, 'Webhooks', 'webhooks'))

    // Add webhook operation headings
    for (const operation of webhookOperations) {
      const webhookId = `webhook-${operation.operation.operationId}`
      items.push(makeHeading(4, operation.operation.operationId ?? 'unknown', webhookId))
    }
  }

  return makeHeadings(items)
}

function getOperationTagHeadings(tag: OperationTag): MarkdownHeading[] {
  return [makeHeading(2, tag.name, 'overview')]
}

function getOperationHeadings(schema: Schema, { operation, pathItem }: PathItemOperation): MarkdownHeading[] {
  const items: MarkdownHeading[] = []

  const securityRequirements = getSecurityRequirements(operation, schema)

  if (securityRequirements && securityRequirements.length > 0) {
    items.push(makeHeading(2, 'Authorizations'))
  }

  const parametersByLocation = getParametersByLocation(operation.parameters, pathItem.parameters)

  if (parametersByLocation.size > 0) {
    items.push(
      makeHeading(2, 'Parameters'),
      ...[...parametersByLocation.keys()].map((location) => makeHeading(3, `${capitalize(location)} Parameters`)),
    )
  }

  if (hasRequestBody(operation)) {
    items.push(makeHeading(2, 'Request Body'))
  }

  const callbacks = getCallbacks(operation)
  const callbackIdentifiers = Object.keys(callbacks ?? {})

  if (callbackIdentifiers.length > 0) {
    items.push(makeHeading(2, 'Callbacks'), ...callbackIdentifiers.map((identifier) => makeHeading(3, identifier)))
  }

  if (operation.responses) {
    const responseItems: MarkdownHeading[] = []

    for (const name of Object.keys(operation.responses)) {
      if (name !== 'default') {
        responseItems.push(makeHeading(3, name))
      }
    }

    if (includesDefaultResponse(operation.responses)) {
      responseItems.push(makeHeading(3, 'default'))
    }

    items.push(makeHeading(2, 'Responses'), ...responseItems)
  }

  return makeHeadings(items)
}

function makeHeadings(items: MarkdownHeading[]): MarkdownHeading[] {
  return [makeHeading(1, 'Overview', '_top'), ...items]
}

function makeHeading(depth: number, text: string, customSlug?: string): MarkdownHeading {
  return { depth, slug: customSlug ?? slug(text), text }
}

type SidebarUserConfig = NonNullable<HookParameters<'config:setup'>['config']['sidebar']>

type SidebarItemConfig = SidebarUserConfig[number]
type SidebarManualGroupConfig = Extract<SidebarItemConfig, { items: SidebarItemConfig[] }>

type SidebarItem = StarlightRouteData['sidebar'][number]
type SidebarLink = Extract<SidebarItem, { type: 'link' }>
export type SidebarGroup = Extract<SidebarItem, { type: 'group' }>

type SidebarBadge = SidebarItem['badge']

interface StarlightPageProps {
  frontmatter: {
    title: string
  }
  headings: MarkdownHeading[]
}
