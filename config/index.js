// for use environment variable
require("dotenv").config();

module.exports = {
  redisHost: process.env.REDIS_HOST,
  redisPort: process.env.REDIS_PORT,
  apiKey: process.env.API_KEY,
  serverUrl: process.env.SERVER_URL,
};
