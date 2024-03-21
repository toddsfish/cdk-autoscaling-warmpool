import { awscdk } from 'projen';
import { NpmAccess } from 'projen/lib/javascript';
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Todd Bryant',
  authorAddress: 'hello@pandanus.cloud',
  description:
    'This AWS CDK construct can be used to define an EC2 Autoscaling Group with a Warm Pool catering for the Warmed:Pending:Wait Lifecycle Hook state https://blog.toddaas.com/posts/ec2_warm_pools_are_useful_part_1/',
  keywords: [
    'awscdk',
    'aws-cdk',
    'aws',
    'ec2 autoscaling',
    'autoscaling',
    'warmpool',
    'warmpools',
    'lifecycle hook',
  ],
  cdkVersion: '2.133.0',
  defaultReleaseBranch: 'main',
  jsiiVersion: '~5.0.0',
  name: '@pandanus-cloud/cdk-autoscaling-warmpool',
  projenrcTs: true,
  repositoryUrl: 'https://github.com/toddsfish/cdk-autoscaling-warmpool.git',
  docgen: false,
  releaseToNpm: true,
  npmAccess: NpmAccess.PUBLIC,
  npmProvenance: true,
  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();
