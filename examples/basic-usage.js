var amqpClient1 = require( '@udx/amqp-client' ).create( "amqp://duqbivtd:mVyUDrh_SEdsX_A_aHj8ZfEhB7CQlNTf@black-boar.rmq.cloudamqp.com/duqbivtd" );

var publisher = amqpClient1.publisher();

setInterval(function() {
  publisher.publish( "", "jobs", new Buffer("Hello World!"));
}, 1000);


//////////////////

var amqpClient2 = require( '@udx/amqp-client' ).create( "amqp://duqbivtd:mVyUDrh_SEdsX_A_aHj8ZfEhB7CQlNTf@black-boar.rmq.cloudamqp.com/duqbivtd" );

amqpClient2.worker( "jobs", "jobs", function( msg, cb ) {
  console.log( "Got msg", msg.content.toString() );
  cb(true);
} );