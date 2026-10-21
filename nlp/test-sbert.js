const { pipeline } = require("@xenova/transformers");

async function testSBERT()
{
    console.log("Loading SBERT model...");

    const model = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2"
    );

    const text1 = "Black leather wallet with a small scratch near the zipper.";
    const text2 = "Black wallet with a small mark close to the zip.";

    console.log("\nText 1:");
    console.log(text1);

    console.log("\nText 2:");
    console.log(text2);

    const result1 = await model(text1, {
        pooling: "mean",
        normalize: true
    });

    const result2 = await model(text2, {
        pooling: "mean",
        normalize: true
    });

    const embedding1 = result1.data;
    const embedding2 = result2.data;

    console.log("\nEmbedding 1 length:", embedding1.length);
    console.log("Embedding 2 length:", embedding2.length);

    let similarity = 0;

    for(let i = 0; i < embedding1.length; i++)
    {
        similarity += embedding1[i] * embedding2[i];
    }

    console.log("\nCosine Similarity:", similarity.toFixed(4));
}

testSBERT();