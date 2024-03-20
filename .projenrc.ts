import { awscdk } from 'projen';
import { NpmAccess } from 'projen/lib/javascript';
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Todd Bryant',
  authorAddress: 'hello@toddaas.com',
  cdkVersion: '2.133.0',
  defaultReleaseBranch: 'main',
  jsiiVersion: '~5.0.0',
  name: 'cdk-autoscaling-warmpool',
  projenrcTs: true,
  repositoryUrl: 'https://github.com/toddsfish/cdk-autoscaling-warmpool.git',
  docgen: false,
  npmAccess: NpmAccess.PUBLIC,
  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();
