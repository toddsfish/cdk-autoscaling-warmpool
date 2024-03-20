import json
import boto3

def handler(event, context):
    ## This Lambda function will be triggered on all events received by EventBridge for instances moving from the Warmed:Running, Warmed:Stopped or Warmed:Hibernated state of an ASG's Warmpool into service in the ASG.  This is required, since by design when using autoscaling groups with Warm pools an instance will need to call complete_lifecycle_action twice.  Once when the instance is launched Warm:Pending:Wait the initially bootstrapped and then a second time when there is Scale out so an Instance moves from a Warm pool Pending:Wait into the autoscaling group to be put InService. https://docs.aws.amazon.com/images/autoscaling/ec2/userguide/images/warm-pools-scale-out-event-diagram.png  The function of this Lambda is for the second complete_lifecycle_action API call to put Warm Pool instances automatically into InService.
    client = boto3.client('autoscaling')
    response = client.complete_lifecycle_action(LifecycleHookName=event['detail']['LifecycleHookName'],
    LifecycleActionToken=event['detail']['LifecycleActionToken'],
    AutoScalingGroupName=event['detail']['AutoScalingGroupName'],
    LifecycleActionResult='CONTINUE',
    InstanceId=event['detail']['EC2InstanceId'])