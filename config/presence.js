var config = require('./index');
var Redis = require('ioredis');
const redis = new Redis({
  port: config.redisPort, // Redis port
  host: config.redisHost, // Redis host
});

module.exports = {
  checkUser: async (userId) => {
    return await redis.exists(userId)
  },
  activeUsers: async () => {
    return await redis.hlen("users")
  },
  setUser : async (userId,socketId) => {
    await redis.pipeline()
    .sadd(userId,socketId)
    .hset("users",userId,socketId).exec()
  },
  getAllUsers : async () => {
    return await redis.hgetall("users")
  },
  updateUserSocketId: async (userId,socketId) => {
    await redis.sadd(userId,socketId)
  },
  setInactiveUser: async (socketId) => {
     await redis.sadd("inactive",socketId);
  },
  getInactiveUser: async () => {
    return await redis.smembers("inactive");
 },
  removeFromInactiveUser: async () => {
    
 },
 getSocketIdsByUserId: async (userId) => {
   return await redis.smembers(userId);
 }
}
