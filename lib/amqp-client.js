/**
 * AMQP Client with reconnection logic
 * to publish and consume messages
 *
 *
 * Example:
 *
 * To PUBSLISH messages to RabbitMQ:
 *
 * var amqpClient = require( '@udx/amqp-client' ).create( "amqp://localhost" );
 * publisher = amqpClient.publisher();
 * publisher.publish( "jobs", "jobs", new Buffer("Hello World!") );
 *
 * To CONSUME messages from RabbitMQ:
 *
 * var amqpClient = require( '@udx/amqp-client' ).create( "amqp://localhost" );
 * amqpClient.worker( "jobs", "jobs", function( msg, cb ) {
 *   console.log( "Got msg", msg.content.toString() );
 *   cb(true);
 * } );
 *
 * Based on gist: https://gist.github.com/carlhoerberg/006b01ac17a0a94859ba
 *
 * @author peshkov@UD
 */

/*
module.exports = function( amqpUrl ) {
  return new amqp( amqpUrl );
}
//*/

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
  // if the connection is closed or fails to be established at all, we will reconnect
  var amqpConn = null;
  var pubChannel = null;
  var offlinePubQueue = [];

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
  self.publish = function publish(exchange, routingKey, content) {
    if(!pubChannel) {
      console.error("[AMQP] publish", "Publisher is not initialized" );
      return;
    }
    try {
      pubChannel.publish(exchange, routingKey, new Buffer(content), { persistent: true },
        function(err, ok) {
          if (err) {
            console.error("[AMQP] publish", err);
            offlinePubQueue.push([exchange, routingKey, content]);
            pubChannel.connection.close();
          }
        });
    } catch (e) {
      console.error("[AMQP] publish", e.message);
      offlinePubQueue.push([exchange, routingKey, content]);
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
    console.error("[AMQP] error", err);
    self.close();
    return true;
  }

  /**
   *
   * @param callback
   */
  function start( callback ) {
    amqp.connect( amqpUrl + "?heartbeat=60", function(err, conn) {
      if (err) {
        console.error("[AMQP]", err.message);
        return setTimeout(start, 1000);
      }
      conn.on("error", function(err) {
        if (err.message !== "Connection closing") {
          console.error("[AMQP] conn error", err.message);
        }
      });
      conn.on("close", function() {
        console.error("[AMQP] reconnecting");
        return setTimeout(start, 1000);
      });

      console.log("[AMQP] connected");
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
        console.error("[AMQP] channel error", err.message);
      });
      ch.on("close", function() {
        console.log("[AMQP] channel closed");
      });

      pubChannel = ch;
      while (true) {
        var m = offlinePubQueue.shift();
        if (!m) break;
        publish(m[0], m[1], m[2]);
      }
    });
  }

  /**
   * A worker that acks messages only if processed succesfully
   */
  function startWorker(exchange, queue, work) {
    amqpConn.createChannel(function(err, ch) {
      if (closeOnErr(err)) return;
      ch.on("error", function(err) {
        console.error("[AMQP] channel error", err.message);
      });
      ch.on("close", function() {
        console.log("[AMQP] channel closed");
      });
      ch.prefetch(10);
      ch.assertQueue( exchange, { durable: true }, function(err, _ok) {
        if (closeOnErr(err)) return;
        ch.consume(queue, processMsg, { noAck: false });
        console.log("Worker is started");
      });

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