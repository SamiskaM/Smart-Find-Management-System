const { pipeline, RawImage } = require("@xenova/transformers");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let clipModel = null;


// ======================================================
// LOAD CLIP MODEL
// ======================================================

async function loadCLIP() {

    if (!clipModel) {

        console.log("Loading CLIP model...");

        clipModel = await pipeline(
            "image-feature-extraction",
            "Xenova/clip-vit-base-patch32"
        );

        console.log("CLIP model loaded.");
    }

    return clipModel;
}


// ======================================================
// COSINE SIMILARITY
// ======================================================

function cosineSimilarity(a, b) {

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {

        dot += a[i] * b[i];

        normA += a[i] * a[i];

        normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
        return 0;
    }

    return dot /
        (Math.sqrt(normA) * Math.sqrt(normB));
}


// ======================================================
// CONVERT BASE64 IMAGE TO TEMPORARY FILE
// ======================================================

function saveBase64Image(imageData) {

    if (!imageData) {
        throw new Error("Image data is empty");
    }

    if (typeof imageData !== "string") {
        throw new Error("Image data is not a string");
    }


    let base64Data = imageData;
    let extension = ".jpg";


    // --------------------------------------------------
    // Detect image type
    // --------------------------------------------------

    if (imageData.startsWith("data:image/png")) {

        extension = ".png";

        base64Data =
            imageData.replace(
                /^data:image\/png;base64,/,
                ""
            );

    }

    else if (imageData.startsWith("data:image/jpeg")) {

        extension = ".jpg";

        base64Data =
            imageData.replace(
                /^data:image\/jpeg;base64,/,
                ""
            );

    }

    else if (imageData.startsWith("data:image/jpg")) {

        extension = ".jpg";

        base64Data =
            imageData.replace(
                /^data:image\/jpg;base64,/,
                ""
            );

    }

    else if (imageData.startsWith("data:image/webp")) {

        extension = ".webp";

        base64Data =
            imageData.replace(
                /^data:image\/webp;base64,/,
                ""
            );

    }

    else {

        // Image is probably stored as plain Base64

        base64Data =
            imageData.replace(
                /^data:.*?;base64,/,
                ""
            );
    }


    // Remove accidental spaces/newlines

    base64Data =
        base64Data
            .replace(/\s/g, "");


    if (!base64Data) {
        throw new Error("Base64 image data is empty");
    }


    // --------------------------------------------------
    // Convert Base64 → Buffer
    // --------------------------------------------------

    const buffer =
        Buffer.from(
            base64Data,
            "base64"
        );


    if (!buffer || buffer.length === 0) {

        throw new Error(
            "Could not convert Base64 image to Buffer"
        );
    }


    // --------------------------------------------------
    // Temporary image file
    // --------------------------------------------------

    const fileName =
        "clip_" +
        crypto.randomBytes(8).toString("hex") +
        extension;


    const filePath =
        path.join(
            __dirname,
            fileName
        );


    fs.writeFileSync(
        filePath,
        buffer
    );


    console.log(
        "Temporary image created:",
        fileName
    );


    return filePath;
}


// ======================================================
// PREPARE IMAGE
// ======================================================

async function prepareImage(imageData) {

    const filePath =
        saveBase64Image(imageData);

    try {

        const image =
            await RawImage.read(filePath);

        return {
            image: image,
            filePath: filePath
        };

    }

    catch (error) {

        // Remove temporary file if reading failed

        try {
            fs.unlinkSync(filePath);
        }
        catch (_) {}

        throw error;
    }
}


// ======================================================
// DELETE TEMPORARY FILE
// ======================================================

function deleteTempFile(filePath) {

    if (!filePath) {
        return;
    }

    try {

        if (fs.existsSync(filePath)) {

            fs.unlinkSync(filePath);

            console.log(
                "Temporary image deleted."
            );
        }

    }

    catch (error) {

        console.log(
            "⚠️ Could not delete temporary image:",
            error.message
        );
    }
}


// ======================================================
// COMPARE TWO IMAGES
// ======================================================

async function compareImages(
    image1,
    image2
) {

    if (!image1 || !image2) {

        console.log(
            "⚠️ CLIP: One or both images are missing"
        );

        return 0;
    }


    let image1File = null;
    let image2File = null;


    try {

        const extractor =
            await loadCLIP();


        // ------------------------------------------------
        // IMAGE 1
        // ------------------------------------------------

        console.log(
            "🖼️ Preparing first image..."
        );

        const prepared1 =
            await prepareImage(image1);

        image1File =
            prepared1.filePath;


        // ------------------------------------------------
        // IMAGE 2
        // ------------------------------------------------

        console.log(
            "🖼️ Preparing second image..."
        );

        const prepared2 =
            await prepareImage(image2);

        image2File =
            prepared2.filePath;


        // ------------------------------------------------
        // CLIP EMBEDDING 1
        // ------------------------------------------------

        console.log(
            "🧠 Extracting CLIP embedding 1..."
        );

        const embedding1 =
            await extractor(
                prepared1.image,
                {
                    pooling: "mean",
                    normalize: true
                }
            );


        // ------------------------------------------------
        // CLIP EMBEDDING 2
        // ------------------------------------------------

        console.log(
            "🧠 Extracting CLIP embedding 2..."
        );

        const embedding2 =
            await extractor(
                prepared2.image,
                {
                    pooling: "mean",
                    normalize: true
                }
            );


        console.log(
            "Embedding 1 length:",
            embedding1.data.length
        );

        console.log(
            "Embedding 2 length:",
            embedding2.data.length
        );


        // ------------------------------------------------
        // COSINE SIMILARITY
        // ------------------------------------------------

        let score =
            cosineSimilarity(
                embedding1.data,
                embedding2.data
            );


        // Keep between 0 and 1

        if (score < 0) {
            score = 0;
        }

        if (score > 1) {
            score = 1;
        }


        console.log(
            "🖼️ CLIP similarity:",
            score.toFixed(4)
        );


        return score;

    }

    catch (error) {

        console.error(
            "❌ CLIP image comparison error:",
            error.message
        );

        return 0;
    }

    finally {

        // Always remove temporary images

        deleteTempFile(image1File);

        deleteTempFile(image2File);
    }
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {
    compareImages
};