import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr'

export class EcrStack {
  private readonly scope: Construct;
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, name: string) {
    this.repository = new ecr.Repository(scope, name, {
      repositoryName: name,
    })
  }
}
