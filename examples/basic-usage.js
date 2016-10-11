/**
 * Basic usage.
 *
 * Publishes and consumes messages using default exchange
 *
 * AMQP_URL="amqp://localhost" DEBUG=amqp-client node examples/basic-usage.js
 */

if( !process.env.AMQP_URL ) {
  console.error( "AMQP_URL env is not provided" );
  process.exit();
}

// Consume messages

var amqpClient1 = require( '@udx/amqp-client' ).create( process.env.AMQP_URL );

amqpClient1.worker( "test", {}, function( msg, cb ) {
  console.log( "Got msg [%s]", msg.content.toString() );
  cb(true);
} );

// Publish messages

var amqpClient2 = require( '@udx/amqp-client' ).create( process.env.AMQP_URL );

var publisher = amqpClient2.publisher();

var refreshIntervalId = setInterval(function() {
  publisher.publish( "", "test", "Hello World!");
}, 1000);


// Close all connections

// Close connection in one minute
setTimeout( function() {
  amqpClient1.close();
  clearInterval(refreshIntervalId);
  amqpClient2.close();
}, 10000 );

