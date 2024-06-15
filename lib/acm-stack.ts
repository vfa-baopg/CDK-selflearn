import { Construct } from 'constructs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import getEnv from '../shared/getEnv';
import { Route53Stack } from './route53-stack';

export class AcmStack {
  public readonly certification: acm.Certificate;

  constructor(scope: Construct, route53: Route53Stack) {
    const domainNames = getEnv('DOMAIN_NAME_LIST')?.split(',');

    if (!domainNames) return;
    const dnsMultiZone: { [key in string]: route53.PublicHostedZone } = {};
    for (const domain of domainNames) {
      dnsMultiZone[domain] = route53.publicHostedZone;
    }
    this.certification = new acm.Certificate(scope, 'cdk-certification', {
      domainName: domainNames[0],
      subjectAlternativeNames: [...domainNames.slice(1, domainNames.length)],
      validation: acm.CertificateValidation.fromDnsMultiZone({
        ...dnsMultiZone,
      }),
    });
  }
}
