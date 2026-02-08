const argon2 = require('@node-rs/argon2');

async function test() {
    const password = 'IsaacMD78';
    const hash = await argon2.hash(password, {
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4
    });
    console.log(hash);
}
test();
