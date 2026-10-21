const { pipeline } = require("@xenova/transformers");

function cosineSimilarity(a, b) {
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function main() {
    console.log("Loading CLIP model...");

    const extractor = await pipeline(
        "image-feature-extraction",
        "Xenova/clip-vit-base-patch32"
    );

    console.log("CLIP model loaded.");

    // Found item image
    const foundImage =
        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500";

    // Different item image
    const lostImage =
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500";

    console.log("\nExtracting found item image...");
    
    const foundEmbedding = await extractor(foundImage, {
        pooling: "mean",
        normalize: false
    });

    console.log("Extracting lost item image...");

    const lostEmbedding = await extractor(lostImage, {
        pooling: "mean",
        normalize: false
    });

    console.log(
        "\nFound embedding length:",
        foundEmbedding.data.length
    );

    console.log(
        "Lost embedding length:",
        lostEmbedding.data.length
    );

    const score = cosineSimilarity(
        foundEmbedding.data,
        lostEmbedding.data
    );

    console.log("\n==============================");
    console.log("CLIP IMAGE MATCHING");
    console.log("==============================");

    console.log(
        "Image Similarity:",
        score.toFixed(4)
    );

    console.log(
        "Image Score:",
        (score * 100).toFixed(2) + "%"
    );

    console.log("==============================");
}

main().catch((error) => {
    console.error("CLIP Error:", error);
});