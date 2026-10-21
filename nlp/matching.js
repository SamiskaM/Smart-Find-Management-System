const { pipeline } = require("@xenova/transformers");

let model = null;

// Load SBERT model
async function loadModel()
{
    if(model == null)
    {
        console.log("Loading SBERT model...");
        
        model = await pipeline(
            "feature-extraction",
            "Xenova/all-MiniLM-L6-v2"
        );

        console.log("SBERT model loaded.");
    }

    return model;
}


// Get embedding for a text
async function getEmbedding(text)
{
    const sbert = await loadModel();

    const result = await sbert(text, {
        pooling: "mean",
        normalize: true
    });

    return result.data;
}


// Calculate cosine similarity
function cosineSimilarity(a, b)
{
    let sum = 0;

    for(let i = 0; i < a.length; i++)
    {
        sum += a[i] * b[i];
    }

    return sum;
}


// Compare two descriptions
async function compareDescriptions(text1, text2)
{
    const embedding1 = await getEmbedding(text1);
    const embedding2 = await getEmbedding(text2);

    const similarity = cosineSimilarity(
        embedding1,
        embedding2
    );

    return similarity;
}


// Export functions
module.exports = {
    getEmbedding,
    cosineSimilarity,
    compareDescriptions
};