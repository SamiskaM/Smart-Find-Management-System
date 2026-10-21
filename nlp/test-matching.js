const {
    compareDescriptions
} = require("./matching");


async function test()
{
    const foundDescription =
        "Black leather wallet with a small scratch near the zipper.";

    const lostDescription =
        "I lost a black wallet. It has a small mark close to the zip.";

    console.log("Comparing descriptions...\n");

    console.log("Found:");
    console.log(foundDescription);

    console.log("\nLost:");
    console.log(lostDescription);

    const score = await compareDescriptions(
        foundDescription,
        lostDescription
    );

    console.log("\nSemantic Similarity:");
    console.log(score.toFixed(4));
}


test();