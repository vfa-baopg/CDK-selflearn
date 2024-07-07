
export const ECS_RESOURCE_NAME = {
  api: {
    service: {
      id: 'cdk-api-service',
    },
    taskDefinition: {
      id: 'cdk-api-task-definition',
      container: {
        id: 'cdk-api-container',
        image: 'public.ecr.aws/y6c5a0q4/amazon/amazon-ecs-sample:cdk-api-image',
        port: 3000,
        protocol: 'HTTP', // Using string directly as ApplicationProtocol is not imported here
        log: 'cdk-api-log-group',
      },
    },
    targetGroup: {
      id: 'cdk-api-target-group',
      healthcheckPath: '/api/health',
      pathPatterns: '/api/*',
      priority: 1,
    },
  },
  admin: {
    service: {
      id: 'cdk-admin-service',
    },
    taskDefinition: {
      id: 'cdk-admin-task-definition',
      container: {
        id: 'cdk-admin-container',
        image: 'public.ecr.aws/y6c5a0q4/amazon/amazon-ecs-sample:cdk-admin-image',
        port: 8081,
        protocol: 'HTTP',
        log: 'cdk-admin-log-group',
      },
    },
    targetGroup: {
      id: 'cdk-admin-target-group',
      healthcheckPath: '/admin/health',
      pathPatterns: '/admin/*',
      priority: 2,
    },
  },
  web: {
    service: {
      id: 'cdk-web-service',
    },
    taskDefinition: {
      id: 'cdk-web-task-definition',
      container: {
        id: 'cdk-web-container',
        image: 'public.ecr.aws/y6c5a0q4/amazon/amazon-ecs-sample:cdk-web-image',
        port: 80,
        protocol: 'HTTP',
        log: 'cdk-web-log-group',
      },
    },
    targetGroup: {
      id: 'cdk-web-target-group',
      healthcheckPath: '/web/health',
      pathPatterns: '/*',
      priority: 3,
    },
  },
};
