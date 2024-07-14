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

export class EcrStack extends Construct {
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, taskExecutionRole: iam.Role) {
    super(scope, id);

    this.repository = new ecr.Repository(this, `${id}-repo`, {
      repositoryName: `${id}-repo`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteImages: true
    });

    const dockerImage = new ecr_assets.DockerImageAsset(this, `CodeRepo-${id}`, {
      directory: path.join(__dirname, `../container/${id}/`)
    });

    this.repository.grantPullPush(taskExecutionRole);

    // Create CodePipeline
    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();
    const sourceBucket = new s3.Bucket(this, `${id}-bucket`, {
      bucketName: `${id}-bucket`,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });
    const pipeline = new codepipeline.Pipeline(this, `${id}-Pipeline`, {
      pipelineName: `${id}-Pipeline`,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.S3SourceAction({
              actionName: 'Source',
              bucket: sourceBucket,
              bucketKey: `${id}.zip`,
              output: sourceOutput,
              trigger: codepipelineActions.S3Trigger.EVENTS,
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
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Build',
              project: new codebuild.PipelineProject(this, `${id}-BuildProject`, {
                environment: {
                  buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
                  privileged: true, // Ensure privileged mode is enabled
                  environmentVariables: {
                    AWS_ACCOUNT_ID: { value: process.env?.CDK_DEFAULT_ACCOUNT || "" },
                    REGION: { value: process.env?.CDK_DEFAULT_REGION || "" },
                    IMAGE_TAG: { value: "latest" },
                    IMAGE_REPO_NAME: { value: dockerImage.repository.repositoryName },
                    // REPOSITORY_URI: { value: imageRepo.repositoryUri },
                    // TASK_DEFINITION_ARN: { value: fargateTaskDef.taskDefinitionArn },
                    // TASK_ROLE_ARN: { value: fargateTaskDef.taskRole.roleArn },
                    // EXECUTION_ROLE_ARN: { value: fargateTaskDef.executionRole?.roleArn },
                  },
                },
                buildSpec: codebuild.BuildSpec.fromSourceFilename(`../container/${id}/buildspec.yml`),
              }),
              input: sourceOutput,
              outputs: [buildOutput],
            }),
          ],
        },
      ],
    });
  }
}
