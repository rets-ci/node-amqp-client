/**
 * Advanced usage.
 *
 * Publishes and consumes messages using custom topic exchange and custom bindings rules
 *
 * AMQP_URL="amqp://localhost" DEBUG=amqp-client node examples/advanced-usage-topic.js
 */

if( !process.env.AMQP_URL ) {
  console.error( "AMQP_URL env is not provided" );
  process.exit();
}

// Consume messages

var amqpClient1 = require( '@udx/amqp-client' ).create( process.env.AMQP_URL );

// Assert Exchange and Queue and binds our routing keys rules for my.custom.queue queue
amqpClient1.worker( "test.topic", {
  "exchange": "test.topic.exchange",
  "exchangeType": "topic",
  "bindings": [ "my.*.routing.key", "*.custom.routing.key" ]
}, function( msg, cb ) {
  console.log( "Got msg [%s]. Headers: [%s]", msg.content.toString(), JSON.stringify( msg.properties.headers || {} ) );
  cb(true);
} );


// Publish messages

var amqpClient2 = require( '@udx/amqp-client' ).create( process.env.AMQP_URL );

var publisher = amqpClient2.publisher();

// Publish message to my.specific.routing.key with custom headers
setInterval(function() {
  publisher.publish( "test.topic.exchange", "my.specific.routing.key", "Routing key my.specific.queue", {
    "headers": {
      "custom-header-1": "value1",
      "custom-header-2": "value2"
    }
  } );
}, 1000);

// Publish message to your.custom.routing.key
setInterval(function() {
  publisher.publish( "test.topic.exchange", "your.custom.routing.key", "Routing key your.custom.queue" );
}, 1000);