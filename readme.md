# AMQP Client

AMQP Client with reconnection logic to publish and consume RabbitMQ messages 

## Basic Usage

### To publish message

```
var amqpClient = require( '@udx/amqp-client' ).create( "amqp://localhost" );
var publisher = amqpClient.publisher();
publisher.publish( "", "jobs", "Hello World!" );
```

#### Publisher options

```
publisher.publish( exchange, queue, content, [options] )
```

* `exchange` string. If empty, we publish message via default AMQP exchange
* `queue` string. Queue, where we want to publish message to
* `content` string/object
* `options` object. Optional.

You can specify headers via options:

```
var options = {
 "headers": {
    "msg-header-1": "value1",
    "msg-header-2": "value1"
 }
}
```


### To consume messages

```
var amqpClient = require( '@udx/amqp-client' ).create( "amqp://localhost" );
amqpClient.worker( "jobs", {}, function( msg, cb ) {
  console.log( "Got msg", msg.content.toString() );
  cb(true);
});
```

#### Worker options

```
amqpClient.worker( queue, options, handler )
```

* `queue` String

Queue, which we want to listen.

* `options` Object. it may have the following properties ( parameters ):

```
{
  // string. By default is empty (default). Any custom queue may be set.
  "exchange": "", 
  // string. Type of exchange. Available types: direct, topic, headers, fanout
  // If exchange is empty ( default ), exchangeType is ignored
  "exchangeType": "direct", 
  // string/array. Routing Key rules list which should be bind to specified queue
  "routingKeyMatches": queue
}
```

* `handler` function

Handles every message. If messaged is successfully parsed, it has to return `true`, in toher case - `false`.

