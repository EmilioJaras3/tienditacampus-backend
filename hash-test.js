const argon2 = require('@node-rs/argon2');

async function run() {
    const p = 'IsaacMD78';
    const h = await argon2.hash(p, {
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4
    });
    console.log("HASH:", h);

    const v = await argon2.verify(h, p);
    console.log("VERIFIES:", v);
}

run();
