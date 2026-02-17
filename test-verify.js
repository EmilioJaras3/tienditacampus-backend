const argon2 = require('@node-rs/argon2');

async function test() {
    const hash = "$argon2id$v=19$m=65536,t=3,p=4$qSuY1qqm9utnhs3qdCzRZgg$6fwi7RJ2DyjCxS7Zoo8XmiwbrQ9uEly214HevjQp92A";
    const pass = "IsaacMD78";

    try {
        const isValid = await argon2.verify(hash, pass);
        console.log("ES VALIDO LOCALIZADO:", isValid);
    } catch (e) {
        console.error("ERROR:", e);
    }
}
test();
