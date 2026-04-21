const argon2 = require('@node-rs/argon2');
argon2.hash('TEST1234').then(console.log).catch(console.error);