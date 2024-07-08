import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as path from 'path';
import * as iam from 'aws-cdk-lib/aws-iam';

export class EcrStack {
  private readonly scope: Construct;
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, name: string, taskExecutionRole: iam.Role) {

    this.repository = new ecr.Repository(scope, name, {
      repositoryName: name,
    });

    const dockerImage = new ecr_assets.DockerImageAsset(scope, 'MyDockerImage', {
      directory: path.join(__dirname, '../path-to-your-dockerfile')
    });

    this.repository.grantPullPush(taskExecutionRole);
  }
}
