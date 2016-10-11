/**
 * Advanced usage.
 *
 * Publishes and consumes messages using custom topic exchange and custom bindings rules
 *
 * AMQP_URL="amqp://localhost" DEBUG=amqp-client node examples/advanced-usage-headers.js
 */

if( !process.env.AMQP_URL ) {
  console.error( "AMQP_URL env is not provided" );
  process.exit();
}


// Consume messages

var amqpClient1 = require( '@udx/amqp-client' ).create( process.env.AMQP_URL );

amqpClient1.worker( "test.headers", {
  "exchange": "test.headers.exchange",
  "exchangeType": "headers",
  "bindings": [
    {
      // Pattern value is optional.
      "pattern": "test.headers",
      // Headers arguments
      "args": {
        "my-custom-header-1": "value-1",
        "my-custom-header-2": "value-2"
      }
    },
    {
      // Pattern value is optional
      "pattern": "",
      // Headers arguments
      "args": {
        "my-custom-header-1": "value-1",
        "my-custom-header-3": "value-3"
      }
    }
  ]
}, function( msg, cb ) {
  console.log( "Got msg [%s]. Headers: [%s]", msg.content.toString(), JSON.stringify( msg.properties.headers || {} ) );
  cb(true);
} );


// Create Logs Queue for test.headers.exchange where we publish all data coming to test.headers.exchange

var amqpClient2 = require( '@udx/amqp-client' ).create( process.env.AMQP_URL );

amqpClient2.worker( "test.headers.logs", {
  "exchange": "test.headers.exchange",
  "exchangeType": "headers",
  // All data which is moving to test.headers.exchange will be published to test.headers.logs
  "bindings": ""
}, function( msg, cb ) {
  console.log( "Got msg [%s]. Headers: [%s]", msg.content.toString(), JSON.stringify( msg.properties.headers || {} ) );
  cb(true);
} );


// Publish messages

var amqpClient3 = require( '@udx/amqp-client' ).create( process.env.AMQP_URL );

var publisher = amqpClient3.publisher();

/**
 * The following messages are being published ONLY to garbage queue ( test.headers.garbage )
 * since they are not matched by any of our bindings ( it has required arguments, but incorrect routing key )
 */
setInterval(function() {
  publisher.publish( "test.headers.exchange", "test", "Hello World!", {
    "headers": {
      "my-custom-header-1": "value-1",
      "my-custom-header-3": "value-2"
    }
  });
}, 1000);


/**
 * The following messages are being published to test.headers and test.headers.garbage queues
 */
setInterval(function() {
  publisher.publish( "test.headers.exchange", "test.headers", "Hello World!", {
    "headers": {
      "my-custom-header-1": "value-1",
      "my-custom-header-2": "value-2"
    }
  });
}, 1000);

/**
 * The following messages are being published to test.headers and test.headers.garbage queues
 */
setInterval(function() {
  publisher.publish( "test.headers.exchange", "test", "Hello World!", {
    "headers": {
      "custom-header-1": "value-1",
      "custom-header-3": "value-3"
    }
  });
}, 1000);