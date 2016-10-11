# AMQP Client

AMQP Client with reconnection logic to publish and consume RabbitMQ messages 

## Basic Usage

### To publish message

```
# Initialize our amqp client
var amqpClient = require( '@udx/amqp-client' ).create( "amqp://localhost" );
# start publisher. It opens stable connection to Rabbit MQ.
var publisher = amqpClient.publisher();
# Publish your message to queue jobs. Default exchange is used in the example.
publisher.publish( "", "jobs", "Hello World!" );
```

#### Publisher options

```
publisher.publish( exchange, queue, content, [options] )
```

* `exchange` string. 

If empty, we publish message via default AMQP exchange

* `queue` string. 

Queue, where we want to publish message to

* `content` string/object
* `options` object. 

Optional. You can specify headers via options:

```
var options = {
 "headers": {
    "msg-header-1": "value1",
    "msg-header-2": "value1"
 }
}
```


### To consume messages

**Note**, consumer also creates exchange, queue and binds routes if they are not set.

```
# Initialize our amqp client
var amqpClient = require( '@udx/amqp-client' ).create( "amqp://localhost" );
# Start worker. As mentioned above it also creates exchange, queue and binds routes if they are not set.
amqpClient.worker( "jobs", {}, function( msg, cb ) {
  console.log( "Got msg", msg.content.toString() );
  cb(true);
});
```

#### Worker options

```
amqpClient.worker( queue, options, handler )
```

* `queue` string

Queue, which we want to listen.

* `options` object. 

Optional. Set empty `{}` object if you want to use defaults. 
It may have the following properties ( parameters ):

```
{
  // string. By default is empty (default). Any custom queue may be set.
  "exchange": "", 
  // string. Type of exchange. Available types: direct, topic, headers, fanout
  // If exchange is empty ( default ), exchangeType is ignored
  "exchangeType": "direct", 
  // string/array. Routing Key rules list which should be bind to specified queue. Default: queue's name of worker
  "bindings": null,
  // null/object. Optional. Extends options for assertExchange. Default: { durable: true }
  exchangeOptions: null
}
```

Option `bindings` examples:

```
{
  "bindings": "routing.key"
}
```

```
{
  "bindings": [ "routing.key", "*.key" ]
}
```

```
{
  "bindings": [
    {
      "pattern": "routing.key",
      "args": {
        "custom-header-1": "value-1",
        "custom-header-2": "value-2"
      }
    }
  ]
}
```

* `handler` function.

Handles every message. 
Note, the function must return `boolean`:
If message is successfully parsed, it has to return `true`, in other case, - `false` (the messaged will be rejected).

## Examples

* [Basic Usage](../master/examples/basic-usage.js)
* [Advanced Usage - Topic](../master/examples/advanced-usage-topic.js)
* [Advanced Usage - Headers](../master/examples/advanced-usage-headers.js)
