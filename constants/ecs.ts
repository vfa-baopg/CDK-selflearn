import { RESOURCE_ADMIN, RESOURCE_API, RESOURCE_WEB } from "./common";

export const ECS_RESOURCE_NAME = {
  [RESOURCE_API]: {
    taskDefinition: 'api-task-definition',
    container: 'api-container',
    service: 'api-service',
    image: 'cdk-api-image',
    logging: 'ecs-api',
  },
  [RESOURCE_ADMIN]: {
    taskDefinition: 'admin-task-definition',
    container: 'admin-container',
    service: 'admin-service',
    image: 'cdk-admin-image',
    logging: 'ecs-admin',
  },
  [RESOURCE_WEB]: {
    taskDefinition: 'web-task-definition',
    container: 'web-container',
    service: 'web-service',
    image: 'cdk-web-image',
    logging: 'ecs-web',
  },
};