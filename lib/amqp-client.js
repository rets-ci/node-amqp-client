/**
 * AMQP Client with reconnection logic
 * to publish and consume messages
 *
 *
 * Example:
 *
 * To PUBSLISH messages to RabbitMQ:
 *
 * var amqpClient = require( 'amqp-client' ).create( "amqp://localhost" );
 * publisher = amqpClient.publisher();
 * publisher.publish( "jobs", "jobs", new Buffer("Hello World!") );
 *
 * To CONSUME messages from RabbitMQ:
 *
 * var amqpClient = require( 'amqp-client' ).create( "amqp://localhost" );
 * amqpClient.worker( "", "jobs", function( msg, cb ) {
 *   console.log( "Got msg", msg.content.toString() );
 *   cb(true);
 * } );
 *
 * Based on gist: https://gist.github.com/carlhoerberg/006b01ac17a0a94859ba
 *
 * @author peshkov@UD
 */

var debug = require( 'debug' )('amqp-client' );

Object.defineProperties( module.exports, {
  create: {
    value: function create( amqpUrl ) {
      return new amqp( amqpUrl );
    },
    enumerable: true,
    writable: true
  },
  version: {
    value: 0.1,
    writable: false
  }
});

/**
 *
 */
function amqp( amqpUrl ) {

  var self = this;
  var amqp = require('amqplib/callback_api');
  var _ = require('lodash');
  // if the connection is closed or fails to be established at all, we will reconnect
  var amqpConn = null;
  var pubChannel = null;
  var offlinePubQueue = [];
  var forceClose = false;

  //////////////////////////////

  /**
   * Initialize Publisher
   */
  self.publisher = function publisher() {
    start( function() {
      startPublisher();
    } );
    return this;
  }

  /**
   * Initialize Worker
   *
   * @param exchange
   * @param queue
   * @param work function. Applies two arguments: msg ( msg.content.toString() ), callback
   */
  self.worker = function worker( exchange, queue, work ) {
    start( function() {
      startWorker( exchange, queue, work );
    } );
    return this;
  }

  /**
   * Method to publish a message,
   * will queue messages internally if the connection is down and resend later
   */
  self.publish = function publish(exchange, routingKey, content, options) {
    if(!pubChannel) {
      debug("[AMQP] publish", "Publisher is not initialized" );
      return;
    }
    options = _.extend( { persistent: true }, options || {} );
    try {
      // Be sure we are stringified object before publishing it.
      if( typeof content == 'object' ) {
        content = JSON.stringify( content );
      }
      pubChannel.publish(exchange, routingKey, new Buffer(content), options,
        function(err, ok) {
          if (err) {
            debug("[AMQP] error on publish", err);
            offlinePubQueue.push([exchange, routingKey, content, options]);
            //pubChannel.connection.close();
          } else {
            debug("[AMQP] message published. Exchange: [%s]. Queue ( routing key ): [%s]", exchange, routingKey );
          }
        });
    } catch (e) {
      debug("[AMQP] catched error on publish", e.message);
      offlinePubQueue.push([exchange, routingKey, content, options]);
    }
  }

  /**
   * Close connection manually if needed.
   */
  self.close = function close() {
    if(amqpConn) {
      amqpConn.close();
    }
    return true;
  }

  // Start Internal Methods

  /**
   *
   * @param err
   * @returns {boolean}
   */
  function closeOnErr(err) {
    if (!err) return false;
    debug("[AMQP] error", err);
    if(amqpConn) {
      amqpConn.close();
    }
    return true;
  }

  /**
   *
   * @param callback
   */
  function start( callback ) {
    amqp.connect( amqpUrl + "?heartbeat=60", function(err, conn) {
      if (err) {
        debug("[AMQP]", err.message);
        if( !forceClose ) {
          return setTimeout(function(){
            start( callback );
          }, 1000);
        }
      }
      conn.on("error", function(err) {
        if (err.message !== "Connection closing") {
          debug("[AMQP] conn error", err.message);
        }
      });
      conn.on("close", function() {
        if( forceClose ) {
          debug("[AMQP] connection closed manually");
        } else {
          debug("[AMQP] reconnecting");
          return setTimeout(function(){
            start( callback );
          }, 1000);
        }
      });

      debug("[AMQP] connected");
      amqpConn = conn;

      callback();
    });
  }

  /**
   *
   */
  function startPublisher() {
    amqpConn.createConfirmChannel(function(err, ch) {
      if (closeOnErr(err)) return;
      ch.on("error", function(err) {
        debug("[AMQP] channel error", err.message);
      });
      ch.on("close", function() {
        debug("[AMQP] channel closed");
      });

      pubChannel = ch;
      while (true) {
        var m = offlinePubQueue.shift();
        if (!m) break;
        publish(m[0], m[1], m[2], m[3]);
      }
    });
  }

  /**
   * A worker that acks messages only if processed succesfully
   */
  function startWorker( queue, options, work) {
    options = _.extend( {
      "exchange": "",
      "exchangeType": "direct", // direct, topic, headers, fanout
      "bindings": queue
    }, options || {} );
    options.exchangeOptions = options.exchangeOptions || { durable: true };

    amqpConn.createChannel(function(err, ch) {
      if (closeOnErr(err)) return;

      ch.on("error", function(err) {
        debug("[AMQP] channel error", err.message);
      });

      ch.on("close", function() {
        debug("[AMQP] channel closed");
      });

      ch.prefetch(10);

      ch.assertQueue( queue, options.exchangeOptions, function(err) {
        if (closeOnErr(err)) return;
        ch.consume(queue, processMsg, { noAck: false });
        debug("[AMQP] Worker is started");
      });

      if( options.exchange ) {
        debug("[AMQP] exchange [%s]", options.exchange);
        ch.assertExchange( options.exchange, options.exchangeType, options.exchangeOptions );
        if( options.bindings !== null ) {
          if( typeof options.bindings !== 'object' || typeof options.bindings.length == 'undefined' ) {
            options.bindings = [ options.bindings ];
          }
          options.bindings = _.map( options.bindings, function(o){return o} );
          debug( "[AMQP] routing key matches",require('util').inspect(options.routingKeyMatches, {showHidden: false, depth: 10, colors: true}));
          options.bindings.forEach( function( v ) {
            if( typeof v == "string" ) {
              ch.bindQueue( queue, options.exchange, v );
            } else if( typeof v.pattern == "string" ) {
              var args = v.args || {};
              ch.bindQueue( queue, options.exchange, v.pattern, args );
            } else {
              debug("[AMQP] invalid routingKeyMatch provided for queue [%s] of exchange [%s]", queue, options.exchange );
            }
          } );
        }
      }

      function processMsg(msg) {
        work(msg, function(ok) {
          try {
            if (ok)
              ch.ack(msg);
            else
              ch.reject(msg, true);
          } catch (e) {
            closeOnErr(e);
          }
        });
      }
    });
  }

}