
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from "constructs";

export interface CodepipelineStackProps extends StackProps {
  s3Bucket?: s3.Bucket
}

export class CodepipelineBuildDeployStack extends Stack {
  constructor(scope: Construct, id: string, props: CodepipelineStackProps) {
    super(scope, id, props);
    // Create S3 bucket if not provided
    if (props?.s3Bucket == undefined) {
      props.s3Bucket = new s3.Bucket(this, 'SourceBucket', {
        versioned: true, // Enable versioning for the bucket
      });
    }

    // Create CodePipeline
    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: "dev",
    });

    // Add S3 event as source action
    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new codepipelineActions.S3SourceAction({
      actionName: 'Source_Stage',
      bucket: props.s3Bucket,
      bucketKey: 'src.zip', // Specify the path to the artifact within the bucket
      output: sourceOutput, // Artifact where the source code will be stored
      trigger: codepipelineActions.S3Trigger.EVENTS, // Trigger the pipeline on S3 events
    });

    // Add the source action to the pipeline
    pipeline.addStage({
      stageName: 'Source',
      actions: [sourceAction],
    });

    // Add Approve stage
    const approveAction = new codepipelineActions.ManualApprovalAction({
      actionName: 'Manual_Approval',
      // notifyEmails: ['your.email@example.com'], // Notify this email when manual approval is required
    });

    pipeline.addStage({
      stageName: 'Approve',
      actions: [approveAction],
    });

    // Define build project
    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: ['echo Installing dependencies...'],
          },
          build: {
            commands: ['echo Building...'],
          },
        },
        artifacts: {
          'base-directory': 'build',
          files: ['**/*'],
        },
      }),
    });

    // Define build action
    const buildOutput = new codepipeline.Artifact();
    const buildAction = new codepipelineActions.CodeBuildAction({
      actionName: 'Build',
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput], // Define output artifacts
    });

    // Add build stage to the pipeline
    pipeline.addStage({
      stageName: 'Build',
      actions: [buildAction],
    });

    // Define deploy action (example deployment to S3)
    const deployAction = new codepipelineActions.S3DeployAction({
      actionName: 'Deploy',
      bucket: props.s3Bucket, // Using the same bucket for deployment for simplicity
      input: buildOutput,
    });

    // Add deploy stage to the pipeline
    pipeline.addStage({
      stageName: 'Deploy',
      actions: [deployAction],
    });

    // Grant pipeline role necessary permissions
    props.s3Bucket.grantReadWrite(pipeline.role);
  }
}