# AMQP Client

AMQP Client with reconnection logic to publish and consume RabbitMQ messages 

## Basic Usage

### To publish message

```
var amqpClient = require( '@udx/amqp-client' ).create( "amqp://localhost" );
var publisher = amqpClient.publisher();
publisher.publish( "", "jobs", "Hello World!" );
```

### To consume messages

```
var amqpClient = require( '@udx/amqp-client' ).create( "amqp://localhost" );
amqpClient.worker( "jobs", "jobs", function( msg, cb ) {
  console.log( "Got msg", msg.content.toString() );
  cb(true);
});
```