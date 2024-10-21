import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as path from 'path';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';
import { S3Stack } from './s3-stack';
import * as ecs from 'aws-cdk-lib/aws-ecs';

export class EcrStack extends Construct {
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, taskExecutionRole: iam.Role, sourceBucket: S3Stack, service: ecs.FargateService) {
    super(scope, id);

    this.repository = new ecr.Repository(this, `${id}`, {
      repositoryName: `${id}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteImages: true
    });

    // const dockerImage = new ecr_assets.DockerImageAsset(this, `CodeRepo-${id}`, {
    //   directory: path.join(__dirname, `../container/${id}/`)
    // });

    this.repository.grantPullPush(taskExecutionRole);

    // Create CodePipeline
    const sourceOutput = new codepipeline.Artifact(`${id}-Source-Artifact`);
    const buildOutput = new codepipeline.Artifact(`${id}-Source-Build-Artifact`);


    const buildProject = new codebuild.PipelineProject(this, `${id}-BuildProject`, {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true, // Ensure privileged mode is enabled
        environmentVariables: {
          AWS_ACCOUNT_ID: { value: process.env?.CDK_DEFAULT_ACCOUNT || "" },
          REGION: { value: process.env?.CDK_DEFAULT_REGION || "" },
          IMAGE_TAG: { value: "latest" },
          RESOURCE_NAME: { value: this.repository},
          IMAGE_REPO_NAME: { value: this.repository.repositoryName },
          REPOSITORY_URI: { value: this.repository.repositoryUri },
          TASK_DEFINITION_ARN: { value: service.taskDefinition.taskDefinitionArn },
          TASK_ROLE_ARN: { value: service.taskDefinition.taskRole.roleArn },
          EXECUTION_ROLE_ARN: { value: service.taskDefinition.executionRole?.roleArn },
        },
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename(`${id}/buildspec.yaml`),
    });
    buildProject.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'ecr:GetAuthorizationToken',
        'ecr:BatchCheckLayerAvailability',
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage',
        'ecr:InitiateLayerUpload', // Add the required action
        'ecr:UploadLayerPart',
        'ecr:CompleteLayerUpload',
        'ecr:PutImage'
      ],
      resources: ['*'],
    }));
    const buildStage = new codepipeline_actions.CodeBuildAction({
      actionName: 'Build',
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    const pipeline = new codepipeline.Pipeline(this, `${id}-Pipeline`, {
      pipelineName: `${id}-Pipeline`,
      artifactBucket: sourceBucket.bucket,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.S3SourceAction({
              actionName: 'Source',
              bucket: sourceBucket.bucket,
              bucketKey: `${id}.zip`,
              output: sourceOutput,
              trigger: codepipelineActions.S3Trigger.POLL,
            }),
          ],
        },
        {         
          stageName: 'Approve',
          actions: [
            new codepipelineActions.ManualApprovalAction({
              actionName: 'ManualApproval',
            })
          ],
        },
        {
          stageName: 'Build',
          actions: [
            buildStage
          ],
        },
        {
          stageName: "Deploy",
          actions: [
            new codepipelineActions.EcsDeployAction({
              actionName: `${id}-deployAction`,
              service: service, // ECS service name determined dynamically
              input: buildOutput, // Assuming buildOutput is your pipeline's build output artifact
            }),
          ],
        }
      ],
    });

    // Add permissions to the pipeline role
    const pipelineRole = pipeline.role;
    pipelineRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryPowerUser'));

  }
}
