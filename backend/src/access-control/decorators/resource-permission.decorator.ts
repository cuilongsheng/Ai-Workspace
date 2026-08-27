import { SetMetadata } from '@nestjs/common';

export const RESOURCE_PERMISSION_KEY = 'resource_permission';

export type Resource =
  | 'department'
  | 'knowledgeBase'
  | 'document'
  | 'documentChunk';

export interface ResourcePermissionMetadata {
  resource: Resource;
  param: string;
}

const DEFAULT_PARAM: Record<Resource, string> = {
  department: 'departmentId',
  knowledgeBase: 'knowledgeBaseId',
  document: 'documentId',
  documentChunk: 'chunkId',
};

export const ResourcePermission = (
  resource: Resource,
  param: string = DEFAULT_PARAM[resource],
) =>
  SetMetadata(RESOURCE_PERMISSION_KEY, {
    resource,
    param,
  } satisfies ResourcePermissionMetadata);
