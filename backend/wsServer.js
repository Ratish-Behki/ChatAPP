const ws = require("ws");
const jwt = require("jsonwebtoken");
const Message = require("./models/messageModel");
const { User } = require("./models/userModel");

const createWebSocketServer = (server) => {
  const wss = new ws.WebSocketServer({ server });
  const userConnections = new Map(); // Map to store userId -> Set of connections

  const notifyAboutOnlinePeople = async () => {
    console.log('Notifying about online people');
    const onlineUsers = await Promise.all(
      Array.from(userConnections.entries()).map(async ([userId, connections]) => {
        if (connections.size > 0) {
          const user = await User.findById(userId);
          const avatarLink = user ? user.avatarLink : null;
          return {
            userId,
            username: connections.values().next().value.username,
            avatarLink,
          };
        }
        return null;
      })
    ).then(users => users.filter(user => user !== null));

    console.log('Current online users:', onlineUsers);

    // Send to all authenticated connections
    userConnections.forEach((connections) => {
      connections.forEach((connection) => {
        if (connection.readyState === ws.OPEN) {
          connection.send(
            JSON.stringify({
              online: onlineUsers,
            })
          );
          console.log(`Sent online status update to user: ${connection.userId}`);
        }
      });
    });
  };

  wss.on("connection", (connection, req) => {
    console.log('New WebSocket connection established');
    connection.isAlive = true;

    connection.timer = setInterval(() => {
      connection.ping();
      connection.deathTimer = setTimeout(() => {
        console.log('Connection timed out, closing...');
        connection.isAlive = false;
        clearInterval(connection.timer);
        connection.terminate();
        
        // Remove connection from user's connections
        if (connection.userId) {
          const connections = userConnections.get(connection.userId);
          if (connections) {
            connections.delete(connection);
            if (connections.size === 0) {
              userConnections.delete(connection.userId);
            }
          }
        }
        notifyAboutOnlinePeople();
      }, 1000);
    }, 5000);

    connection.on("pong", () => {
      clearTimeout(connection.deathTimer);
    });

    connection.on("message", async (message) => {
      try {
        const messageData = JSON.parse(message.toString());
        console.log('Received message:', messageData);
        
        // Handle authentication
        if (messageData.type === 'auth') {
          jwt.verify(messageData.token, process.env.JWTPRIVATEKEY, {}, (err, userData) => {
            if (err) {
              console.error('Auth error:', err);
              connection.send(JSON.stringify({ error: 'Invalid authentication token' }));
              return;
            }

            const { _id, firstName, lastName } = userData;
            connection.userId = _id;
            connection.username = `${firstName} ${lastName}`;

            console.log(`User authenticated successfully: ${_id}`);

            // Add connection to user's connections
            if (!userConnections.has(_id)) {
              userConnections.set(_id, new Set());
            }
            userConnections.get(_id).add(connection);

            notifyAboutOnlinePeople();
          });
          return;
        }

        // Only process messages from authenticated users
        if (!connection.userId) {
          console.error('Message received from unauthenticated user');
          connection.send(JSON.stringify({ error: 'Not authenticated' }));
          return;
        }

        const { recipient, text } = messageData;

        // Validate recipient and text
        if (!recipient || !text) {
          throw new Error("Recipient and text are required");
        }

        // Validate that recipient is a valid ObjectId
        if (!/^[0-9a-fA-F]{24}$/.test(recipient)) {
          throw new Error("Invalid recipient ID");
        }

        const msgDoc = await Message.create({
          sender: connection.userId,
          recipient,
          text,
        });

        console.log(`Message sent from ${connection.userId} to ${recipient}`);

        // Send message to recipient's active connections
        const recipientConnections = userConnections.get(recipient);
        if (recipientConnections) {
          recipientConnections.forEach((client) => {
            if (client.readyState === ws.OPEN) {
              client.send(
                JSON.stringify({
                  sender: connection.username,
                  text,
                  id: msgDoc._id,
                })
              );
              console.log(`Message delivered to recipient's connection`);
            }
          });
        }
      } catch (error) {
        console.error("Error handling message:", error);
        // Send error back to sender
        if (connection.readyState === ws.OPEN) {
          connection.send(
            JSON.stringify({
              error: error.message
            })
          );
        }
      }
    });

    connection.on("close", () => {
      console.log('WebSocket connection closed');
      // Remove connection from user's connections
      if (connection.userId) {
        const connections = userConnections.get(connection.userId);
        if (connections) {
          connections.delete(connection);
          if (connections.size === 0) {
            userConnections.delete(connection.userId);
          }
        }
      }
      notifyAboutOnlinePeople();
    });

    connection.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    notifyAboutOnlinePeople();
  });
};

module.exports = createWebSocketServer;