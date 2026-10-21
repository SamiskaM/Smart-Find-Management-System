const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const { exec } = require("child_process");

const {
    compareDescriptions
} = require("./nlp/matching");

const {
    compareImages
} = require("./nlp/clip");

const {
    generateQuestions
} = require("./nlp/question-generator");

const app = express();

const PORT = process.env.PORT || 5000;

const MONGO_URI =
    process.env.MONGO_URI ||
    "mongodb://127.0.0.1:27017/clf";

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));


// ======================================================
// USER SCHEMA
// ======================================================

const userSchema = new mongoose.Schema(
    {
        user_id: { type: String, trim: true },
        register_no: { type: String, trim: true },

        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        },

        phone: { type: String, trim: true },
        department: { type: String, trim: true },
        year: { type: String, trim: true },
        section: { type: String, trim: true },
        stay: { type: String, trim: true },

        role_id: {
            type: String,
            default: "student",
            trim: true
        },

        profile_photo: {
            type: String,
            default: ""
        },

        created_at: {
            type: Date,
            default: Date.now
        },

        status: {
            type: String,
            default: "active"
        }
    },
    {
        collection: "users"
    }
);

const User = mongoose.model("User", userSchema);


// ======================================================
// LOST REPORT SCHEMA
// ======================================================

const lostReportSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        category: {
            type: String,
            trim: true,
            required: true
        },

        item_type: {
            type: String,
            trim: true
        },

        color: {
            type: String,
            trim: true
        },

        brand: {
            type: String,
            trim: true
        },

        location: {
            type: String,
            trim: true
        },

        date_lost: {
            type: String,
            trim: true
        },

        time_lost: {
            type: String,
            trim: true
        },

        description: {
            type: String,
            trim: true,
            required: true
        },

        image_data: {
            type: String,
            default: ""
        },

        status: {
            type: String,
            default: "OPEN"
        },

        created_at: {
            type: Date,
            default: Date.now
        }
    },
    {
        collection: "lost_reports"
    }
);

const LostReport =
    mongoose.model("LostReport", lostReportSchema);


// ======================================================
// FOUND REPORT SCHEMA
// ======================================================

const foundReportSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        category: {
            type: String,
            trim: true,
            required: true
        },

        item_type: {
            type: String,
            trim: true
        },

        color: {
            type: String,
            trim: true
        },

        brand: {
            type: String,
            trim: true
        },

        location: {
            type: String,
            trim: true
        },

        date_found: {
            type: String,
            trim: true
        },

        time_found: {
            type: String,
            trim: true
        },

        description: {
            type: String,
            trim: true,
            required: true
        },

        image_data: {
            type: String,
            default: ""
        },

        // PRIVATE DETAILS
        // These must NOT be shown to claimants.
        private_details: {
            special_mark: {
                type: String,
                default: ""
            },

            inner_lining: {
                type: String,
                default: ""
            },

            unique_contents: {
                type: String,
                default: ""
            },

            pattern: {
                type: String,
                default: ""
            },

            other: {
                type: String,
                default: ""
            }
        },

        status: {
            type: String,
            default: "OPEN"
        },

        created_at: {
            type: Date,
            default: Date.now
        }
    },
    {
        collection: "found_reports"
    }
);

const FoundReport =
    mongoose.model("FoundReport", foundReportSchema);


// ======================================================
// MATCH SCHEMA
// ======================================================

const matchSchema = new mongoose.Schema(
    {
        lost_report_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LostReport",
            required: true
        },

        found_report_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FoundReport",
            required: true
        },

        description_score: {
            type: Number,
            default: 0
        },
        image_score: {
            type: Number,
            default: 0
        },

        attribute_score: {
            type: Number,
            default: 0
        },

        match_score: {
            type: Number,
            default: 0
        },

        status: {
            type: String,
            default: "POSSIBLE_MATCH"
        },

        created_at: {
            type: Date,
            default: Date.now
        }
    },
    {
        collection: "matches"
    }
);

const Match = mongoose.model("Match", matchSchema);


// ======================================================
// VERIFICATION SCHEMA
// ======================================================

const verificationSchema = new mongoose.Schema(
    {
        match_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Match",
            required: true
        },

        lost_report_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LostReport",
            required: true
        },

        found_report_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FoundReport",
            required: true
        },

        questions: [
            {
                question: {
                    type: String,
                    required: true
                },

                private_field: {
                    type: String,
                    required: true
                },

                correct_answer: {
                    type: String,
                    required: true
                },

                user_answer: {
                    type: String,
                    default: ""
                }
            }
        ],

        status: {
            type: String,
            default: "PENDING"
        },

        verification_score: {
            type: Number,
            default: 0
        },
        extra_questions: [{
            question: { type: String, required: true },
            private_field: { type: String, required: true },
            correct_answer: { type: String, required: true },
            user_answer: { type: String, default: "" }
        }],
        extra_verification_score: { type: Number, default: 0 },
        extra_status: { type: String, default: "NOT_STARTED" },

        created_at: {
            type: Date,
            default: Date.now
        }
    },
    {
        collection: "verifications"
    }
);

const Verification =
    mongoose.model(
        "Verification",
        verificationSchema
    );





// ======================================================
// HANDOVER SCHEMA
// ======================================================

const handoverSchema = new mongoose.Schema(
    {
        verification_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Verification",
            required: true
        },

        lost_report_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LostReport",
            required: true
        },

        found_report_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FoundReport",
            required: true
        },

        lost_user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        founder_user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        pickup_code: {
            type: String,
            required: true
        },

        // NEW: Handover details
        handover_place: {
            type: String,
            default: ""
        },

        handover_date: {
            type: String,
            default: ""
        },

        handover_time: {
            type: String,
            default: ""
        },

        status: {
            type: String,
            default: "PENDING"
        },

        created_at: {
            type: Date,
            default: Date.now
        },

        handed_over_at: {
            type: Date,
            default: null
        }
    },
    {
        collection: "handovers"
    }
);

const Handover = mongoose.model("Handover", handoverSchema);


// ======================================================
// NOTIFICATION SCHEMA
// ======================================================

const notificationSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        type: {
            type: String,
            default: "VERIFICATION"
        },

        title: {
            type: String,
            required: true
        },

        message: {
            type: String,
            required: true
        },

        verification_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Verification",
            default: null
        },

        match_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Match",
            default: null
        },

        is_read: {
            type: Boolean,
            default: false
        },
        read_at: {
            type: Date,
            default: null
        },

        created_at: {
            type: Date,
            default: Date.now
        }
    },
    {
        collection: "notifications"
    }
);

const Notification =
    mongoose.model(
        "Notification",
        notificationSchema
    );


// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "profileview.html"));
});
// ======================================================
// DB STATUS
// ======================================================

app.get("/db-status", (req, res) => {

    const state =
        mongoose.connection.readyState;

    const states = {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting"
    };

    res.json({
        database: states[state] || "unknown",
        database_name:
            mongoose.connection.name ||
            "not connected"
    });
});


// ======================================================
// SIGNUP
// ======================================================

app.post("/signup", async (req, res) => {

    try {

        console.log("\n📥 Signup request received");
        console.log("Data:", req.body);

        const {
            user_id,
            register_no,
            name,
            email,
            password,
            phone,
            department,
            year,
            section,
            stay,
            role_id,
            profile_photo,
            status
        } = req.body;

        if (!name || !email || !password) {

            return res.status(400).json({
                success: false,
                error:
                    "Name, email and password are required"
            });
        }

        if (mongoose.connection.readyState !== 1) {

            return res.status(503).json({
                success: false,
                error:
                    "MongoDB is not connected"
            });
        }

        const cleanEmail =
            email.toLowerCase().trim();

        const existingUser =
            await User.findOne({
                email: cleanEmail
            });

        if (existingUser) {

            return res.status(409).json({
                success: false,
                error:
                    "An account with this email already exists"
            });
        }

        const newUser = new User({

            user_id: user_id,

            register_no: register_no,

            name: name,

            email: cleanEmail,

            password: password,

            phone: phone,

            department: department,

            year: year,

            section: section,

            stay: stay,

            role_id: role_id || "student",

            profile_photo:
                profile_photo || "",

            status:
                status || "active"
        });

        const savedUser =
            await newUser.save();

        console.log(
            "✅ User saved successfully"
        );

        console.log(
            "MongoDB ID:",
            savedUser._id
        );

        res.status(201).json({

            success: true,

            message:
                "Account created successfully",

            user: {

                id: savedUser._id,

                user_id:
                    savedUser.user_id,

                register_no:
                    savedUser.register_no,

                name:
                    savedUser.name,

                email:
                    savedUser.email,

                phone:
                    savedUser.phone,

                department:
                    savedUser.department,

                year:
                    savedUser.year,

                section:
                    savedUser.section,

                stay:
                    savedUser.stay,

                role_id:
                    savedUser.role_id,

                profile_photo:
                    savedUser.profile_photo,

                status:
                    savedUser.status,

                created_at:
                    savedUser.created_at
            }
        });

    } catch (error) {

        console.error(
            "❌ Signup error:",
            error
        );

        if (error.code === 11000) {

            return res.status(409).json({
                success: false,
                error:
                    "Email already exists"
            });
        }

        res.status(500).json({

            success: false,

            error:
                "Failed to create account",

            details:
                error.message
        });
    }
});


// ======================================================
// GET ALL OPEN FOUND REPORTS
// ======================================================

app.get(
    "/found-reports",
    async (req, res) => {

        try {

            console.log(
                "\n📦 Loading found reports for Browse Items..."
            );

            const reports =
                await FoundReport.find({
                    status: "OPEN"
                }).sort({
                    created_at: -1
                });

            console.log(
                "Found reports available:",
                reports.length
            );

            res.json({

                success: true,

                reports: reports

            });

        }
        catch (error) {

            console.error(
                "❌ Get found reports error:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    "Failed to load found reports"

            });

        }
    }
);




// ======================================================
// GET FOUND REPORTS FOR ONE USER
// ======================================================

app.get(
    "/found-reports/user/:userId",
    async (req, res) => {

        try
        {
            console.log(
                "\n📋 Loading found reports for user:",
                req.params.userId
            );

            const reports =
                await FoundReport.find({
                    user_id:
                        req.params.userId
                })
                .sort({
                    created_at: -1
                });

            console.log(
                "Found reports found:",
                reports.length
            );

            res.json({
                success: true,
                reports: reports
            });
        }
        catch(error)
        {
            console.error(
                "❌ User found reports error:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Failed to load found reports",
                details:
                    error.message
            });
        }
    }
);
// ======================================================
// SIGNIN
// ======================================================

app.post("/signin", async (req, res) => {

    try {

        console.log(
            "\n📥 Signin request received"
        );

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {

            return res.status(400).json({
                success: false,
                error:
                    "Email and password are required"
            });
        }

        if (mongoose.connection.readyState !== 1) {

            return res.status(503).json({
                success: false,
                error:
                    "MongoDB is not connected"
            });
        }

        const cleanEmail =
            email.toLowerCase().trim();

        const user =
            await User.findOne({
                email: cleanEmail,
                password: password
            });

        if (!user) {

            return res.status(401).json({
                success: false,
                error:
                    "Invalid email or password"
            });
        }

        console.log(
            "✅ Login successful:",
            user.email
        );

        res.json({

            success: true,

            message:
                "Login successful",

            user: {

                id: user._id,

                user_id:
                    user.user_id,

                register_no:
                    user.register_no,

                name:
                    user.name,

                email:
                    user.email,

                phone:
                    user.phone,

                department:
                    user.department,

                year:
                    user.year,

                section:
                    user.section,

                stay:
                    user.stay,

                role_id:
                    user.role_id,

                profile_photo:
                    user.profile_photo,

                status:
                    user.status,

                created_at:
                    user.created_at
            }
        });

    } catch (error) {

        console.error(
            "❌ Signin error:",
            error
        );

        res.status(500).json({

            success: false,

            error:
                "Server error",

            details:
                error.message
        });
    }
});


// ======================================================
// UPDATE USER PROFILE
// ======================================================

app.put("/users/:id", async (req, res) => {

    try {

        console.log(
            "\n📥 Profile update request received"
        );

        console.log(
            "User ID:",
            req.params.id
        );

        console.log(
            "Data:",
            req.body
        );

        if (mongoose.connection.readyState !== 1) {

            return res.status(503).json({
                success: false,
                error:
                    "MongoDB is not connected"
            });
        }

        const {
            name,
            department,
            year,
            section,
            stay,
            phone,
            profile_photo
        } = req.body;

        if (
            !name ||
            !department ||
            !year ||
            !section ||
            !stay ||
            !phone
        ) {

            return res.status(400).json({
                success: false,
                error:
                    "All profile fields are required"
            });
        }

        if (!/^[0-9]{10}$/.test(phone)) {

            return res.status(400).json({
                success: false,
                error:
                    "Phone number must contain 10 digits"
            });
        }

        const updatedUser =
            await User.findByIdAndUpdate(

                req.params.id,

                {
                    name: name.trim(),

                    department:
                        department.trim(),

                    year:
                        year.trim(),

                    section:
                        section.trim().toUpperCase(),

                    stay:
                        stay.trim(),

                    phone:
                        phone.trim(),

                    profile_photo:
                        profile_photo || ""
                },

                {
                    new: true,
                    runValidators: true
                }
            );

        if (!updatedUser) {

            return res.status(404).json({
                success: false,
                error:
                    "User not found"
            });
        }

        console.log(
            "✅ User profile updated successfully"
        );

        res.json({

            success: true,

            message:
                "Profile updated successfully",

            user: {

                id: updatedUser._id,

                user_id:
                    updatedUser.user_id,

                register_no:
                    updatedUser.register_no,

                name:
                    updatedUser.name,

                email:
                    updatedUser.email,

                phone:
                    updatedUser.phone,

                department:
                    updatedUser.department,

                year:
                    updatedUser.year,

                section:
                    updatedUser.section,

                stay:
                    updatedUser.stay,

                role_id:
                    updatedUser.role_id,

                profile_photo:
                    updatedUser.profile_photo,

                status:
                    updatedUser.status
            }
        });

    } catch (error) {

        console.error(
            "❌ Profile update error:",
            error
        );

        res.status(500).json({

            success: false,

            error:
                "Failed to update profile",

            details:
                error.message
        });
    }
});


// ======================================================
// HELPER - ATTRIBUTE MATCHING
// ======================================================

function compareValue(value1, value2) {

    if (
        !value1 ||
        !value2
    ) {
        return 0;
    }

    const a =
        String(value1)
            .trim()
            .toLowerCase();

    const b =
        String(value2)
            .trim()
            .toLowerCase();

    if (!a || !b) {
        return 0;
    }

    if (a === b) {
        return 1;
    }

    return 0;
}


// ======================================================
// CALCULATE ATTRIBUTE SCORE
// ======================================================

function calculateAttributeScore(
    lost,
    found
) {

    let total = 0;
    let weight = 0;

    // Category - 15%
    if (
        lost.category &&
        found.category
    ) {

        total +=
            compareValue(
                lost.category,
                found.category
            ) * 15;

        weight += 15;
    }


    // Item type - 10%
    if (
        lost.item_type &&
        found.item_type
    ) {

        total +=
            compareValue(
                lost.item_type,
                found.item_type
            ) * 10;

        weight += 10;
    }


    // Color - 15%
    if (
        lost.color &&
        found.color
    ) {

        total +=
            compareValue(
                lost.color,
                found.color
            ) * 15;

        weight += 15;
    }


    // Brand - 10%
    if (
        lost.brand &&
        found.brand
    ) {

        total +=
            compareValue(
                lost.brand,
                found.brand
            ) * 10;

        weight += 10;
    }


    // Location - 10%
    if (
        lost.location &&
        found.location
    ) {

        total +=
            compareValue(
                lost.location,
                found.location
            ) * 10;

        weight += 10;
    }


    if (weight === 0) {
        return 0;
    }

    return (total / weight) * 60;
}


// ======================================================
// CREATE MATCH BETWEEN ONE LOST AND ONE FOUND
// ======================================================

async function createMatch(
    lost,
    found
) {

    try {

        console.log("");
        console.log(
            "🔎 Comparing Lost:",
            lost._id.toString()
        );

        console.log(
            "🔎 With Found:",
            found._id.toString()
        );


        // ----------------------------------------------
        // DESCRIPTION TEXT
        // ----------------------------------------------

        const lostText =
            lost.description || "";

        const foundText =
            found.description || "";


        // ----------------------------------------------
        // SBERT
        // ----------------------------------------------

        let descriptionScore = 0;

        if (
            lostText.trim() &&
            foundText.trim()
        ) {

            descriptionScore =
                await compareDescriptions(
                    lostText,
                    foundText
                );
        }


        // Convert -1 to 1 range into percentage
        // SBERT cosine is normally 0 to 1 here.
        let descriptionPercent =
            descriptionScore * 100;

        if (descriptionPercent < 0) {
            descriptionPercent = 0;
        }

        if (descriptionPercent > 100) {
            descriptionPercent = 100;
        }


        // ----------------------------------------------
        // ATTRIBUTE SCORE
        // ----------------------------------------------

        const attributeScore =
            calculateAttributeScore(
                lost,
                found
            );
            
        // ----------------------------------------------
        // CLIP IMAGE SCORE
        // ----------------------------------------------

        let imagePercent = 0;

        if (
            lost.image_data &&
            found.image_data
        ) {
            console.log(
            "🖼️ Comparing images with CLIP..."
        );

        const imageScore =
            await compareImages(
            lost.image_data,
            found.image_data
        );

        imagePercent =
            imageScore * 100;

        console.log(
            "Image Score:",
            imagePercent.toFixed(2) + "%"
        );
        }
        else {
            console.log(
                "🖼️ Image comparison skipped - image missing"
            );
        }

        // ----------------------------------------------
        // FINAL SCORE
        // ----------------------------------------------

        /*
            Description = 40%
            Attributes  = 60%

            Attribute score already combines:
            Category 15
            Item type 10
            Color 15
            Brand 10
            Location 10
        */

        // ----------------------------------------------
        // FINAL HYBRID MATCH SCORE
        // ----------------------------------------------

        let finalScore;

        if (
            lost.image_data &&
            found.image_data
        ) {
            // Description = 50%
            // Image       = 20%
            // Attributes  = 30%

            finalScore =
                (descriptionPercent * 0.50) +
                (imagePercent * 0.20) +
                (attributeScore * 0.30);
        }
        else {
        // If image is not available,
        // calculate using available text + attributes.

        finalScore =
        (descriptionPercent * 0.70) +
        (attributeScore * 0.30);
        }


        console.log(
            "Description Score:",
            descriptionPercent.toFixed(2) + "%"
        );

        console.log(
            "Image Score:",
            imagePercent.toFixed(2) + "%"
        );

        console.log(
            "Attribute Score:",
            attributeScore.toFixed(2) + "%"
        );

        console.log(
            "Total Match Score:",
            finalScore.toFixed(2) + "%"
        );


        // ----------------------------------------------
        // MATCH THRESHOLD
        // ----------------------------------------------

        /*
            Project-defined threshold.

            60% or above = possible match
        */

        if (finalScore < 60) {

            console.log(
                "❌ Below possible-match threshold"
            );

            return null;
        }


        // ----------------------------------------------
        // CHECK DUPLICATE MATCH
        // ----------------------------------------------

        const existingMatch =
            await Match.findOne({

                lost_report_id:
                    lost._id,

                found_report_id:
                    found._id
            });

        if (existingMatch) {

            console.log(
                "ℹ️ Match already exists"
            );

            return existingMatch;
        }


        // ----------------------------------------------
        // SAVE MATCH
        // ----------------------------------------------

        const newMatch =
            new Match({

                lost_report_id:
                    lost._id,

                found_report_id:
                    found._id,

                description_score:
                    Number(
                        descriptionPercent.toFixed(2)
                    ),

                image_score:
                    Number(
                        imagePercent.toFixed(2)
                    ),

                attribute_score:
                    Number(
                        attributeScore.toFixed(2)
                    ),

                match_score:
                    Number(
                        finalScore.toFixed(2)
                    ),

                status:
                    "POSSIBLE_MATCH"
            });

        const savedMatch =
            await newMatch.save();


        console.log(
            "✅ Possible match saved:",
            savedMatch._id
        );


        return savedMatch;

    } catch (error) {

        console.error(
            "❌ Matching error:",
            error.message
        );

        return null;
    }
}


// ======================================================
// FIND MATCHES FOR A LOST REPORT
// ======================================================

async function findMatchesForLost(
    lostReport
) {

    console.log("");
    console.log(
        "🔍 Searching found reports for:",
        lostReport._id
    );

    const foundReports =
        await FoundReport.find({
            status: "OPEN"
        });


    console.log(
        "Found reports available:",
        foundReports.length
    );


    const matches = [];


    for (const found of foundReports) {

        const match =
            await createMatch(
                lostReport,
                found
            );

        if (match) {
            matches.push(match);
        }
    }


    return matches;
}


// ======================================================
// FIND MATCHES FOR A FOUND REPORT
// ======================================================

async function findMatchesForFound(
    foundReport
) {

    console.log("");
    console.log(
        "🔍 Searching lost reports for:",
        foundReport._id
    );

    const lostReports =
        await LostReport.find({
            status: "OPEN"
        });


    console.log(
        "Lost reports available:",
        lostReports.length
    );


    const matches = [];


    for (const lost of lostReports) {

        const match =
            await createMatch(
                lost,
                foundReport
            );

        if (match) {
            matches.push(match);
        }
    }


    return matches;
}


// ======================================================
// CREATE LOST REPORT
// ======================================================

app.post(
    "/lost-reports",
    async (req, res) => {

        try {

            console.log(
                "\n📥 Lost report received"
            );

            console.log(
                "Data:",
                req.body
            );


            const {
                user_id,
                category,
                item_type,
                color,
                brand,
                location,
                date_lost,
                time_lost,
                description,
                image_data
            } = req.body;


            if (
                !user_id ||
                !category ||
                !description
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "User, category and description are required"
                });
            }


            const user =
                await User.findById(user_id);


            if (!user) {

                return res.status(404).json({

                    success: false,

                    error:
                        "User not found"
                });
            }


            const report =
                new LostReport({

                    user_id,

                    category,

                    item_type,

                    color,

                    brand,

                    location,

                    date_lost,

                    time_lost,

                    description,

                    image_data:
                        image_data || ""
                });


            const savedReport =
                await report.save();


            console.log(
                "✅ Lost report saved:",
                savedReport._id
            );


            // ------------------------------------------
            // SBERT MATCHING
            // ------------------------------------------

            console.log(
                "🤖 Starting SBERT matching..."
            );

            const matches =
                await findMatchesForLost(
                    savedReport
                );


            res.status(201).json({

                success: true,

                message:
                    "Lost report created successfully",

                report: {

                    id:
                        savedReport._id,

                    category:
                        savedReport.category,

                    item_type:
                        savedReport.item_type,

                    color:
                        savedReport.color,

                    brand:
                        savedReport.brand,

                    location:
                        savedReport.location,

                    date_lost:
                        savedReport.date_lost,

                    time_lost:
                        savedReport.time_lost,

                    description:
                        savedReport.description,

                    status:
                        savedReport.status,

                    created_at:
                        savedReport.created_at
                },

                matches_found:
                    matches.length,

                matches:
                    matches.map(match => ({

                        match_id:
                            match._id,

                        found_report_id:
                            match.found_report_id,

                        description_score:
                            match.description_score,
                        
                            image_score: match.image_score,

                        attribute_score:
                            match.attribute_score,

                        match_score:
                            match.match_score,

                        status:
                            match.status
                    }))
            });


        } catch (error) {

            console.error(
                "❌ Lost report error:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    "Failed to create lost report",

                details:
                    error.message
            });
        }
    }
);


// ======================================================
// CREATE FOUND REPORT
// ======================================================

app.post(
    "/found-reports",
    async (req, res) => {

        try {

            console.log(
                "\n📥 Found report received"
            );

            console.log(
                "Data:",
                req.body
            );


            const {
                user_id,
                category,
                item_type,
                color,
                brand,
                location,
                date_found,
                time_found,
                description,
                image_data,
                private_details
            } = req.body;


            if (
                !user_id ||
                !category ||
                !description
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "User, category and description are required"
                });
            }


            const user =
                await User.findById(user_id);


            if (!user) {

                return res.status(404).json({

                    success: false,

                    error:
                        "User not found"
                });
            }


            const report =
                new FoundReport({

                    user_id,

                    category,

                    item_type,

                    color,

                    brand,

                    location,

                    date_found,

                    time_found,

                    description,

                    image_data:
                        image_data || "",

                    private_details: {

                        special_mark:
                            private_details?.special_mark || "",

                        inner_lining:
                            private_details?.inner_lining || "",

                        unique_contents:
                            private_details?.unique_contents || "",

                        pattern:
                            private_details?.pattern || "",

                        other:
                            private_details?.other || ""
                    }
                });


            const savedReport =
                await report.save();


            console.log(
                "✅ Found report saved:",
                savedReport._id
            );


            // ------------------------------------------
            // SBERT MATCHING
            // ------------------------------------------

            console.log(
                "🤖 Starting SBERT matching..."
            );

            const matches =
                await findMatchesForFound(
                    savedReport
                );


            res.status(201).json({

                success: true,

                message:
                    "Found report created successfully",

                report: {

                    id:
                        savedReport._id,

                    category:
                        savedReport.category,

                    item_type:
                        savedReport.item_type,

                    color:
                        savedReport.color,

                    brand:
                        savedReport.brand,

                    location:
                        savedReport.location,

                    date_found:
                        savedReport.date_found,

                    time_found:
                        savedReport.time_found,

                    description:
                        savedReport.description,

                    status:
                        savedReport.status,

                    created_at:
                        savedReport.created_at
                },

                matches_found:
                    matches.length,

                matches:
                    matches.map(match => ({

                        match_id:
                            match._id,

                        lost_report_id:
                            match.lost_report_id,

                        description_score:
                            match.description_score,

                        attribute_score:
                            match.attribute_score,

                        match_score:
                            match.match_score,

                        status:
                            match.status
                    }))
            });


        } catch (error) {

            console.error(
                "❌ Found report error:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    "Failed to create found report",

                details:
                    error.message
            });
        }
    }
);


// ======================================================
// VIEW MATCHES FOR A LOST REPORT
// ======================================================

app.get(
    "/matches/lost/:id",
    async (req, res) => {

        try {

            const matches =
                await Match.find({

                    lost_report_id:
                        req.params.id

                }).sort({
                    match_score: -1
                });


            res.json({

                success: true,

                matches
            });

        } catch (error) {

            console.error(
                "❌ Get lost matches error:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    "Failed to get matches"
            });
        }
    }
);


// ======================================================
// VIEW MATCHES FOR A FOUND REPORT
// ======================================================

// ======================================================
// VIEW MATCHES FOR A FOUND REPORT
// ======================================================

app.get(
    "/matches/found/:id",
    async (req, res) => {

        try {

            console.log(
                "\n🔍 Loading matches for found report:",
                req.params.id
            );


            // ------------------------------------------
            // GET MATCH RECORDS
            // ------------------------------------------

            const matches =
                await Match.find({

                    found_report_id:
                        req.params.id,

                    status:
                        "POSSIBLE_MATCH"

                }).sort({

                    match_score: -1

                });


            console.log(
                "Possible matches found:",
                matches.length
            );


            // ------------------------------------------
            // GET LOST REPORT DETAILS
            // ------------------------------------------

            const result = [];


            for (const match of matches) {

                const lostReport =
                    await LostReport.findById(
                        match.lost_report_id
                    );


                if (!lostReport) {

                    continue;

                }


                // --------------------------------------
                // RETURN ONLY PUBLIC LOST DETAILS
                // --------------------------------------

                result.push({

                    match_id:
                        match._id,

                    match_score:
                        match.match_score,

                    description_score:
                        match.description_score,

                    image_score:
                        match.image_score,

                    attribute_score:
                        match.attribute_score,

                    status:
                        match.status,


                    lost_report: {

                        id:
                            lostReport._id,

                        category:
                            lostReport.category,

                        item_type:
                            lostReport.item_type,

                        color:
                            lostReport.color,

                        brand:
                            lostReport.brand,

                        location:
                            lostReport.location,

                        date_lost:
                            lostReport.date_lost,

                        time_lost:
                            lostReport.time_lost,

                        description:
                            lostReport.description

                    }

                });

            }


            // ------------------------------------------
            // SEND RESPONSE
            // ------------------------------------------

            res.json({

                success: true,

                matches:
                    result

            });


        } catch (error) {

            console.error(
                "❌ Get found matches error:",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    "Failed to get found matches",

                details:
                    error.message

            });

        }

    }
);



// ======================================================
// START VERIFICATION
// ======================================================

app.post(
    "/verification/start",
    async (req, res) => {

        try {

            const { match_id } = req.body;

            if (!match_id) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Match ID is required"
                });

            }


            // ==================================================
            // FIND MATCH
            // ==================================================

            const match =
                await Match.findById(match_id);

            if (!match) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Match not found"
                });

            }


            // ==================================================
            // FIND FOUND REPORT
            // ==================================================

            const foundReport =
                await FoundReport.findById(
                    match.found_report_id
                );

            if (!foundReport) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Found report not found"
                });

            }


            // ==================================================
            // CHECK WHETHER VERIFICATION ALREADY EXISTS
            // ==================================================

            const existingVerification =
                await Verification.findOne({
                    match_id: match._id
                });

            if (existingVerification) {

                return res.json({

                    success: true,

                    message:
                        "Verification already started",

                    verification_id:
                        existingVerification._id,

                    questions:
                        existingVerification.questions.map(
                            (item, index) => ({
                                question:
                                    item.question,

                                question_number:
                                    index + 1
                            })
                        )
                });

            }


            // ==================================================
            // GET PRIVATE DETAILS
            // ==================================================

            const privateDetails =
                foundReport.private_details || {};

            console.log(
                "\n=========================================="
            );

            console.log(
                "🤖 OFFLINE QUESTION GENERATION"
            );

            console.log(
                "=========================================="
            );

            console.log(
                "Private details received."
            );


            // ==================================================
            // CHECK PRIVATE DETAILS
            // ==================================================

            const hasPrivateDetails =
                Object.values(privateDetails)
                    .some(
                        value =>
                            value &&
                            value.toString().trim()
                    );

            if (!hasPrivateDetails) {

                return res.status(400).json({

                    success: false,

                    error:
                        "No private identifying details were provided for this found item"

                });

            }


            // ==================================================
            // GENERATE QUESTIONS USING LOCAL QWEN
            // ==================================================

            let generatedQuestions = [];

            try {

                generatedQuestions =
                    await generateQuestions(
                        privateDetails
                    );

            }
            catch(error) {

                console.error(
                    "❌ Qwen question generation failed:",
                    error.message
                );

                generatedQuestions = [];

            }


            console.log(
                "Generated questions:",
                generatedQuestions.length
            );


            // ==================================================
            // CONVERT GENERATED QUESTIONS
            // ==================================================

            const questions = [];

            generatedQuestions.forEach(
                item => {

                    if (
                        item.question &&
                        item.answer &&
                        item.private_field
                    ) {

                        questions.push({

                            question:
                                item.question,

                            private_field:
                                item.private_field,

                            correct_answer:
                                item.answer,

                            user_answer:
                                ""

                        });

                    }

                }
            );


            // ==================================================
            // SAFE FALLBACK QUESTIONS
            //
            // These are used only when Qwen does not
            // generate enough valid questions.
            // ==================================================

            const fallbackQuestions = [

                {
                    field:
                        "special_mark",

                    question:
                        "What special mark or identifying mark is present on the item?"
                },

                {
                    field:
                        "inner_lining",

                    question:
                        "What is the color or description of the inner lining?"
                },

                {
                    field:
                        "unique_contents",

                    question:
                        "What unique item or content was inside the item?"
                },

                {
                    field:
                        "pattern",

                    question:
                        "What pattern, logo or design is present on the item?"
                },

                {
                    field:
                        "other",

                    question:
                        "What other unique identifying detail does the item have?"
                }

            ];


            // ==================================================
            // ADD FALLBACK QUESTIONS IF NEEDED
            // ==================================================

            for (
                let i = 0;
                i < fallbackQuestions.length;
                i++
            ) {

                if (questions.length >= 3) {
                    break;
                }


                const fallback =
                    fallbackQuestions[i];

                const answer =
                    privateDetails[
                        fallback.field
                    ];


                if (
                    answer &&
                    answer.toString().trim()
                ) {

                    const alreadyUsed =
                        questions.some(
                            question =>
                                question.private_field ===
                                fallback.field
                        );

                    if (!alreadyUsed) {

                        questions.push({

                            question:
                                fallback.question,

                            private_field:
                                fallback.field,

                            correct_answer:
                                answer.toString().trim(),

                            user_answer:
                                ""

                        });

                    }

                }

            }


            // ==================================================
            // LIMIT TO 3 QUESTIONS
            // ==================================================

            const finalQuestions =
                questions.slice(0, 3);


            if (finalQuestions.length === 0) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Unable to generate verification questions from the private details"

                });

            }


            console.log(
                "Final verification questions:",
                finalQuestions.length
            );


            finalQuestions.forEach(
                (question, index) => {

                    console.log(
                        `${index + 1}. ${question.question}`
                    );

                }
            );


            // ==================================================
            // CREATE VERIFICATION
            // ==================================================

            const verification =
                new Verification({

                    match_id:
                        match._id,

                    lost_report_id:
                        match.lost_report_id,

                    found_report_id:
                        match.found_report_id,

                    questions:
                        finalQuestions,

                    status:
                        "PENDING"

                });


            const savedVerification =
                await verification.save();


            


            
                
            // ==================================================
            // FINAL RESPONSE
            //
            // IMPORTANT:
            // Do NOT send correct_answer or private_field
            // to the Lost User.
            // ==================================================

            res.status(201).json({

                success: true,

                message:
                    "Verification started successfully",

                verification_id:
                    savedVerification._id,

                questions:
                    finalQuestions.map(
                        (item, index) => ({

                            question:
                                item.question,

                            question_number:
                                index + 1

                        })
                    )

            });

        }

        catch (error) {

            console.error(
                "❌ Start verification error:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    "Failed to start verification",

                details:
                    error.message

            });

        }

    }
);


// ======================================================
// GET VERIFICATION RESULT FOR FOUNDER
// ======================================================

app.get(
    "/verification/:verificationId/result",
    async (req, res) => {

        try
        {
            const verificationId =
                req.params.verificationId;

            const userId =
                req.query.user_id;


            console.log(
                "🔎 Loading verification result:",
                verificationId
            );

            console.log(
                "👤 Requesting user:",
                userId
            );


            // ==========================================
            // CHECK USER ID
            // ==========================================

            if(!userId)
            {
                return res.status(400).json({
                    success: false,
                    error:
                        "User ID is required"
                });
            }


            // ==========================================
            // FIND VERIFICATION
            // ==========================================

            const verification =
                await Verification.findById(
                    verificationId
                );


            if(!verification)
            {
                return res.status(404).json({
                    success: false,
                    error:
                        "Verification not found"
                });
            }


            // ==========================================
            // FIND FOUND REPORT
            // ==========================================

            const foundReport =
                await FoundReport.findById(
                    verification.found_report_id
                );


            if(!foundReport)
            {
                return res.status(404).json({
                    success: false,
                    error:
                        "Found report not found"
                });
            }


            // ==========================================
            // CHECK FOUNDER
            // ==========================================

            if(
                foundReport.user_id.toString() !==
                userId.toString()
            )
            {
                return res.status(403).json({
                    success: false,
                    error:
                        "You are not authorized to view this verification result"
                });
            }


            // ==========================================
            // CHECK ORIGINAL VERIFICATION STATUS
            // ==========================================

            if(
                verification.status !==
                "ANSWERED"
            )
            {
                return res.json({
                    success: true,

                    status:
                        verification.status,

                    verification_score:
                        verification.verification_score,

                    extra_status:
                        verification.extra_status ||
                        "NOT_STARTED",

                    extra_verification_score:
                        verification.extra_verification_score ||
                        0,

                    extra_questions:
                        [],

                    message:
                        "Verification has not been answered yet"
                });
            }


            // ==========================================
            // FIND LOST USER
            // ==========================================

            const lostReport =
                await LostReport.findById(
                    verification.lost_report_id
                );


            let lostUser = null;


            if(lostReport)
            {
                lostUser =
                    await User.findById(
                        lostReport.user_id
                    );
            }


            // ==========================================
            // ORIGINAL QUESTION RESULTS
            // ==========================================

            const questionResults =
                (verification.questions || []).map(
                    (item, index) =>
                    {
                        return {
                            question_number:
                                index + 1,

                            question:
                                item.question,

                            user_answer:
                                item.user_answer
                        };
                    }
                );


            // ==========================================
            // EXTRA QUESTION RESULTS
            //
            // IMPORTANT:
            // correct_answer is NOT returned.
            // ==========================================

            const extraQuestionResults =
                (verification.extra_questions || []).map(
                    (item, index) =>
                    {
                        return {
                            question_number:
                                index + 1,

                            question:
                                item.question,

                            private_field:
                                item.private_field,

                            user_answer:
                                item.user_answer
                        };
                    }
                );


            // ==========================================
            // SEND RESULT TO FOUNDER
            // ==========================================

            res.json({
                success: true,

                verification_id:
                    verification._id,

                // ======================================
                // ORIGINAL VERIFICATION
                // ======================================

                status:
                    verification.status,

                verification_score:
                    verification.verification_score,

                questions:
                    questionResults,


                // ======================================
                // EXTRA VERIFICATION
                // ======================================

                extra_status:
                    verification.extra_status ||
                    "NOT_STARTED",

                extra_verification_score:
                    verification.extra_verification_score ||
                    0,

                extra_questions:
                    extraQuestionResults,


                // ======================================
                // LOST USER
                // ======================================

                lost_user: lostUser
                    ? {
                        id:
                            lostUser._id,

                        name:
                            lostUser.name,

                        email:
                            lostUser.email
                    }
                    : null
            });

        }
        catch(error)
        {
            console.error(
                "❌ Verification result error:",
                error
            );


            res.status(500).json({
                success: false,

                error:
                    "Failed to load verification result",

                details:
                    error.message
            });
        }

    }
);

// =====================================================
// FOUNDER QUESTION REVIEW
// =====================================================

app.get(
    "/verification/:verificationId/founder-review",
    async (req, res) => {
        try
        {
            const verificationId =
                req.params.verificationId;

            const userId =
                req.query.user_id;


            if(!userId)
            {
                return res.status(400).json({
                    success: false,
                    error:
                        "User ID is required"
                });
            }


            // -----------------------------------------
            // FIND VERIFICATION
            // -----------------------------------------

            const verification =
                await Verification.findById(
                    verificationId
                );


            if(!verification)
            {
                return res.status(404).json({
                    success: false,
                    error:
                        "Verification not found"
                });
            }


            // -----------------------------------------
            // FIND FOUND REPORT
            // -----------------------------------------

            const foundReport =
                await FoundReport.findById(
                    verification.found_report_id
                );


            if(!foundReport)
            {
                return res.status(404).json({
                    success: false,
                    error:
                        "Found report not found"
                });
            }


            // -----------------------------------------
            // CHECK FOUNDER
            // -----------------------------------------

            if(
                foundReport.user_id.toString() !==
                userId.toString()
            )
            {
                return res.status(403).json({
                    success: false,
                    error:
                        "You are not authorized to view these verification answers"
                });
            }


            // -----------------------------------------
            // RETURN QUESTIONS + ANSWERS
            // -----------------------------------------

            const questions =
                verification.questions.map(
                    function(item, index)
                    {
                        return {
                            question_number:
                                index + 1,

                            question:
                                item.question,

                            correct_answer:
                                item.correct_answer,

                            private_field:
                                item.private_field
                        };
                    }
                );


            res.json({
                success: true,

                verification_id:
                    verification._id,

                status:
                    verification.status,

                questions:
                    questions
            });

        }
        catch(error)
        {
            console.error(
                "❌ Founder question review error:",
                error
            );


            res.status(500).json({
                success: false,

                error:
                    "Failed to load founder verification questions",

                details:
                    error.message
            });
        }
    }
);


// =====================================================
// ADD FOUNDER EXTRA QUESTIONS
// =====================================================



app.post("/verification/:verificationId/extra-questions", async (req, res) => {
    try {
        const { verificationId } = req.params;
        const { user_id, questions } = req.body;

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        if (
            !Array.isArray(questions) ||
            questions.length === 0 ||
            questions.length > 10
        ) {
            return res.status(400).json({
                success: false,
                message: "Provide between 1 and 10 extra questions"
            });
        }

        const verification = await Verification.findById(verificationId);

        if (!verification) {
            return res.status(404).json({
                success: false,
                message: "Verification not found"
            });
        }

        if (verification.status !== "ANSWERED") {
            return res.status(400).json({
                success: false,
                message: "The original verification must be completed first"
            });
        }

        
        // Verify the Founder owns the found report
        const foundReport = await FoundReport.findById(
            verification.found_report_id
        );

        if (
            !foundReport ||
            String(foundReport.user_id) !== String(user_id)
        ) {
            return res.status(403).json({
                success: false,
                message: "Only the Founder who reported this item can add extra questions"
            });
        }

        // Find the Lost User's report
        const lostReport = await LostReport.findById(
            verification.lost_report_id
        );

        if (!lostReport) {
            return res.status(404).json({
                success: false,
                message: "Lost report not found"
            });
        }

        const lostUserId = lostReport.user_id;
        console.log("🔴 EXTRA QUESTIONS - Lost User ID:", String(lostUserId));
        console.log("🔴 EXTRA QUESTIONS - Verification ID:", String(verification._id));

        if (!lostUserId) {
            return res.status(400).json({
                success: false,
                message: "Lost User could not be identified"
            });
        }
        
        // If questions were already saved, repair a missing notification
        if (verification.extra_status === "SENT") {
            const existingNotification =
                await Notification.findOne({
                    user_id: lostUserId,
                    verification_id: verification._id,
                    title: "Additional Ownership Questions"
                });

            if (!existingNotification) {
                await Notification.create({
                    user_id: lostUserId,
                    type: "VERIFICATION",
                    title: "Additional Ownership Questions",
                    message: "The Founder has added extra questions to verify your ownership. Please log in and answer them.",
                    verification_id: verification._id,
                    match_id: verification.match_id,
                    is_read: false
                });
            }

            return res.json({
                success: true,
                message: existingNotification
                    ? "A notification already exists. Please check the Lost User's notification list."
                    : "Missing notification created successfully.",
                notification_created: !existingNotification
            });
        }


        // Validate and prepare extra questions
        const extraQuestions = questions.map((q) => ({
            question: String(q.question || "").trim(),
            private_field: "founder_added",
            correct_answer: String(q.correct_answer || "").trim(),
            user_answer: ""
        }));

        if (
            extraQuestions.some(
                q => !q.question || !q.correct_answer
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Every extra question needs a question and correct answer"
            });
        }

        // Save separately from the original questions and score
        // Replace pending questions on retry to avoid duplicates
        verification.extra_questions = extraQuestions;
        verification.extra_status = "PENDING";

        await verification.save();

        // Notify the Lost User
        await Notification.create({
            user_id: lostUserId,
            type: "VERIFICATION",
            title: "Additional Ownership Questions",
            message: "The Founder has added extra questions to verify your ownership. Please log in and answer them.",
            verification_id: verification._id,
            match_id: verification.match_id,
            is_read: false
        });

        // Mark as sent only after notification creation succeeds
        verification.extra_status = "SENT";
        await verification.save();

        return res.json({
            success: true,
            message: "Extra questions saved and notification sent to the Lost User",
            total_extra_questions: verification.extra_questions.length
        });

    } catch (error) {
        console.error(
    "Error saving/sending extra questions:",
    error
);

console.error("Error details:", error.message);
console.error("Error name:", error.name);

        return res.status(500).json({
            success: false,
            message: "Failed to save extra questions or create notification"
        });
    }
});


// ============================================================
// SUBMIT EXTRA VERIFICATION ANSWERS
// ============================================================

app.post(
    "/verification/:verificationId/extra-submit",
    async (req, res) => {

        try {

            const { verificationId } =
                req.params;

            const {
                user_id,
                answers
            } = req.body;


            // ------------------------------------------------
            // CHECK USER
            // ------------------------------------------------

            if(!user_id) {

                return res.status(400).json({
                    success: false,
                    message: "User ID is required"
                });

            }


            // ------------------------------------------------
            // CHECK ANSWERS
            // ------------------------------------------------

            if(
                !Array.isArray(answers) ||
                answers.length === 0
            ) {

                return res.status(400).json({
                    success: false,
                    message: "No extra answers received"
                });

            }


            // ------------------------------------------------
            // FIND VERIFICATION
            // ------------------------------------------------

            const verification =
                await Verification.findById(
                    verificationId
                );


            if(!verification) {

                return res.status(404).json({
                    success: false,
                    message: "Verification not found"
                });

            }


            // ------------------------------------------------
            // CHECK EXTRA QUESTIONS
            // ------------------------------------------------

            if(
                !Array.isArray(
                    verification.extra_questions
                ) ||
                verification.extra_questions.length === 0
            ) {

                return res.status(400).json({
                    success: false,
                    message: "No extra questions found"
                });

            }


            // ------------------------------------------------
            // CHECK STATUS
            // ------------------------------------------------

            if(
                verification.extra_status !== "SENT"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Extra questions are not currently waiting for answers"
                });

            }


            // ------------------------------------------------
            // FIND LOST REPORT
            // ------------------------------------------------

            const lostReport =
                await LostReport.findById(
                    verification.lost_report_id
                );


            if(!lostReport) {

                return res.status(404).json({
                    success: false,
                    message: "Lost report not found"
                });

            }


            // ------------------------------------------------
            // VERIFY THIS IS THE LOST USER
            // ------------------------------------------------

            if(
                String(lostReport.user_id) !==
                String(user_id)
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "Only the Lost User can answer these questions"
                });

            }


            // ------------------------------------------------
            // CHECK NUMBER OF ANSWERS
            // ------------------------------------------------

            if(
                answers.length !==
                verification.extra_questions.length
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Number of answers does not match number of extra questions"
                });

            }


            // ------------------------------------------------
            // NORMALIZE ANSWER
            // ------------------------------------------------

            function normalizeAnswer(value)
            {

                return String(value || "")
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, " ");

            }


            // ------------------------------------------------
            // CALCULATE EXTRA SCORE
            // ------------------------------------------------

            let correctAnswers = 0;


            for(
                let i = 0;
                i < verification.extra_questions.length;
                i++
            ) {

                const question =
                    verification.extra_questions[i];


                const userAnswer =
                    normalizeAnswer(
                        answers[i]?.answer
                    );


                const correctAnswer =
                    normalizeAnswer(
                        question.correct_answer
                    );


                question.user_answer =
                    String(
                        answers[i]?.answer || ""
                    ).trim();


                if(
                    userAnswer &&
                    correctAnswer &&
                    userAnswer === correctAnswer
                ) {

                    correctAnswers++;

                }

            }


            // ------------------------------------------------
            // SCORE
            // ------------------------------------------------

            const totalQuestions =
                verification.extra_questions.length;


            const extraScore =
                totalQuestions > 0
                    ? Math.round(
                        (
                            correctAnswers /
                            totalQuestions
                        ) * 100
                    )
                    : 0;


            // ------------------------------------------------
            // SAVE EXTRA RESULT
            // ------------------------------------------------

            verification.extra_verification_score =
                extraScore;


            verification.extra_status =
                "ANSWERED";


            // IMPORTANT:
            // Do NOT change:
            //
            // verification.questions
            // verification.verification_score
            // verification.status
            //
            // Those belong to the original round.


            await verification.save();


            console.log(
                "🟢 EXTRA VERIFICATION ANSWERS RECEIVED"
            );

            console.log(
                "Verification ID:",
                verificationId
            );

            console.log(
                "Lost User ID:",
                user_id
            );

            console.log(
                "Extra Score:",
                extraScore
            );


            // ------------------------------------------------
            // FIND FOUNDER
            // ------------------------------------------------

            const foundReport =
                await FoundReport.findById(
                    verification.found_report_id
                );


            if(foundReport) {

                await Notification.create({

                    user_id:
                        foundReport.user_id,

                    type:
                        "VERIFICATION_RESULT",

                    title:
                        "Additional Verification Answers Received",

                    message:
                        `The Lost User has answered the additional ownership questions. Extra verification score: ${extraScore}%`,

                    verification_id:
                        verification._id,

                    match_id:
                        verification.match_id,

                    is_read:
                        false

                });

            }


            // ------------------------------------------------
            // RESPONSE
            // ------------------------------------------------

            return res.json({

                success: true,

                message:
                    "Additional verification answers submitted successfully",

                extra_verification_score:
                    extraScore,

                correct_answers:
                    correctAnswers,

                total_questions:
                    totalQuestions,

                extra_status:
                    verification.extra_status

            });


        }
        catch(error)
        {

            console.error(
                "❌ Error submitting extra verification:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to submit additional verification answers"

            });

        }

    }
);

// ======================================================
// SEND VERIFICATION QUESTIONS TO LOST USER
// ======================================================

app.post(
    "/verification/:verificationId/send",
    async (req, res) => {

        try {

            const verificationId =
                req.params.verificationId;

            const userId =
                req.body.user_id;


            if(!userId)
            {
                return res.status(400).json({
                    success: false,
                    error:
                        "User ID is required"
                });
            }


            const verification =
                await Verification.findById(
                    verificationId
                );


            if(!verification)
            {
                return res.status(404).json({
                    success: false,
                    error:
                        "Verification not found"
                });
            }


            const foundReport =
                await FoundReport.findById(
                    verification.found_report_id
                );


            if(!foundReport)
            {
                return res.status(404).json({
                    success: false,
                    error:
                        "Found report not found"
                });
            }


            // Check that the logged-in user is the Founder
            if(
                foundReport.user_id.toString() !==
                userId.toString()
            )
            {
                return res.status(403).json({
                    success: false,
                    error:
                        "You are not authorized to send these questions"
                });
            }


            // Questions can only be sent once
            if(
                verification.status !==
                "PENDING"
            )
            {
                return res.status(400).json({
                    success: false,
                    error:
                        "Verification questions have already been sent"
                });
            }


            const lostReport =
                await LostReport.findById(
                    verification.lost_report_id
                );


            if(!lostReport)
            {
                return res.status(404).json({
                    success: false,
                    error:
                        "Lost report not found"
                });
            }


            // Create notification for Lost User
            const notification =
                new Notification({

                    user_id:
                        lostReport.user_id,

                    type:
                        "VERIFICATION",

                    title:
                        "Ownership Verification Required",

                    message:
                        "A found item may match your lost item. Please answer the verification questions.",

                    verification_id:
                        verification._id,

                    match_id:
                        verification.match_id,

                    is_read:
                        false
                });


            await notification.save();


            // Mark verification as sent
            verification.status =
                "SENT";

            await verification.save();


            console.log(
                "🔔 Verification questions sent to Lost User:",
                lostReport.user_id
            );


            res.json({

                success: true,

                message:
                    "Verification questions sent successfully",

                verification_id:
                    verification._id
            });

        }
        catch(error)
        {

            console.error(
                "❌ Send verification error:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    "Failed to send verification questions",

                details:
                    error.message
            });
        }
    }
);


// ======================================================
// FOUNDER CONFIRMS OWNERSHIP
// ======================================================

// ======================================================
// FOUNDER CONFIRMS OWNERSHIP + GENERATE PICKUP CODE
// ======================================================

app.post(
    "/verification/:verificationId/confirm",
    async (req, res) => {
        try {

            const verificationId = req.params.verificationId;
            const userId = req.body.user_id;

            console.log("\n==========================================");
            console.log("✅ FOUNDER OWNERSHIP CONFIRMATION");
            console.log("==========================================");
            console.log("Verification ID:", verificationId);
            console.log("Founder ID:", userId);

            // --------------------------------------------------
            // 1. CHECK FOUNDER ID
            // --------------------------------------------------

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: "User ID is required"
                });
            }


            // --------------------------------------------------
            // 2. FIND VERIFICATION
            // --------------------------------------------------

            const verification =
                await Verification.findById(verificationId);

            if (!verification) {
                return res.status(404).json({
                    success: false,
                    error: "Verification not found"
                });
            }


            // --------------------------------------------------
            // 3. CHECK ORIGINAL VERIFICATION
            // --------------------------------------------------

            if (verification.status !== "ANSWERED") {

                return res.status(400).json({
                    success: false,
                    error:
                        "Verification must be answered before confirming ownership"
                });
            }


            // --------------------------------------------------
            // 4. FIND FOUND REPORT
            // --------------------------------------------------

            const foundReport =
                await FoundReport.findById(
                    verification.found_report_id
                );

            if (!foundReport) {

                return res.status(404).json({
                    success: false,
                    error: "Found report not found"
                });
            }


            // --------------------------------------------------
            // 5. CHECK FOUNDER AUTHORIZATION
            // --------------------------------------------------

            if (
                foundReport.user_id.toString() !==
                userId.toString()
            ) {

                return res.status(403).json({
                    success: false,
                    error:
                        "You are not authorized to confirm this ownership"
                });
            }


            // --------------------------------------------------
            // 6. FIND LOST REPORT
            // --------------------------------------------------

            const lostReport =
                await LostReport.findById(
                    verification.lost_report_id
                );

            if (!lostReport) {

                return res.status(404).json({
                    success: false,
                    error: "Lost report not found"
                });
            }


            // --------------------------------------------------
            // 7. CHECK IF HANDOVER ALREADY EXISTS
            // --------------------------------------------------

            const existingHandover =
                await Handover.findOne({
                    verification_id: verification._id
                });

            if (existingHandover) {

                return res.json({
                    success: true,
                    message:
                        "Ownership already confirmed. Pickup code already generated.",
                    verification_id:
                        verification._id,
                    status:
                        verification.status,
                    pickup_code:
                        existingHandover.pickup_code
                });
            }


            // --------------------------------------------------
            // 8. GENERATE UNIQUE 6-DIGIT PICKUP CODE
            // --------------------------------------------------

            let pickupCode;
            let codeExists = true;

            while (codeExists) {

                pickupCode =
                    Math.floor(
                        100000 +
                        Math.random() * 900000
                    ).toString();

                const existingCode =
                    await Handover.findOne({
                        pickup_code: pickupCode
                    });

                codeExists = !!existingCode;
            }


            // --------------------------------------------------
            // 9. CREATE HANDOVER RECORD
            // --------------------------------------------------

            const handover =
                new Handover({

                    verification_id:
                        verification._id,

                    lost_report_id:
                        verification.lost_report_id,

                    found_report_id:
                        verification.found_report_id,

                    lost_user_id:
                        lostReport.user_id,

                    founder_user_id:
                        foundReport.user_id,

                    pickup_code:
                        pickupCode,

                    status:
                        "PENDING"
                });

            await handover.save();


            // --------------------------------------------------
            // 10. UPDATE VERIFICATION STATUS
            // --------------------------------------------------

            verification.status =
                "FOUNDER_CONFIRMED";

            await verification.save();


            // --------------------------------------------------
            // 11. SEND PICKUP CODE TO LOST USER
            // --------------------------------------------------

            await Notification.create({

                user_id:
                    lostReport.user_id,

                type:
                    "HANDOVER",

                title:
                    "Ownership Confirmed - Pickup Code",

                message:
                    `Your ownership has been confirmed. Your pickup code is ${pickupCode}. Please show this code during item handover.`,

                verification_id:
                    verification._id,

                is_read:
                    false,

                created_at:
                    new Date()
            });


            // --------------------------------------------------
            // 12. RESPONSE
            // --------------------------------------------------

            console.log("✅ Ownership confirmed");
            console.log("✅ Pickup code generated:", pickupCode);
            console.log("✅ Handover created:", handover._id);
            console.log("✅ Lost User notified");


            res.json({

                success: true,

                message:
                    "Ownership confirmed and pickup code generated successfully",

                verification_id:
                    verification._id,

                status:
                    verification.status,

                pickup_code:
                    pickupCode,

                handover_id:
                    handover._id
            });

        }
        catch (error) {

            console.error(
                "❌ Founder confirmation error:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    "Failed to confirm ownership",

                details:
                    error.message
            });
        }
    }
);




// ======================================================
// GET HANDOVER DETAILS FOR FOUNDER
// ======================================================

app.get(
    "/handover/verification/:verificationId",
    async (req, res) => {

        try {

            const verificationId =
                req.params.verificationId;

            console.log("");
            console.log("==========================================");
            console.log("📦 LOADING HANDOVER DETAILS");
            console.log("==========================================");

            console.log(
                "Verification ID:",
                verificationId
            );


            // ------------------------------------------
            // FIND HANDOVER
            // ------------------------------------------

            const handover =
                await Handover.findOne({
                    verification_id:
                        verificationId
                });


            if (!handover) {

                return res.status(404).json({

                    success: false,

                    error:
                        "Handover record not found"

                });

            }


            // ------------------------------------------
            // FIND LOST USER
            // ------------------------------------------

            const lostUser =
                await User.findById(
                    handover.lost_user_id
                );


            // ------------------------------------------
            // FIND FOUNDER
            // ------------------------------------------

            const foundUser =
                await User.findById(
                    handover.founder_user_id
                );


            // ------------------------------------------
            // FIND LOST REPORT
            // ------------------------------------------

            const lostReport =
                await LostReport.findById(
                    handover.lost_report_id
                );


            // ------------------------------------------
            // FIND FOUND REPORT
            // ------------------------------------------

            const foundReport =
                await FoundReport.findById(
                    handover.found_report_id
                );


            // ------------------------------------------
            // SEND RESPONSE
            // ------------------------------------------

            res.json({

                success: true,

                handover: {

                    id:
                        handover._id,

                    handover_place:
                        handover.handover_place,

                    handover_date:
                        handover.handover_date,

                    handover_time:
                        handover.handover_time,

                    status:
                        handover.status,

                    handed_over_at:
                        handover.handed_over_at

                },

                lost_user: lostUser
                    ? {

                        name:
                            lostUser.name,

                        register_no:
                            lostUser.register_no,

                        email:
                            lostUser.email

                    }
                    : null,


                founder_user: foundUser
                    ? {

                        name:
                            foundUser.name,

                        register_no:
                            foundUser.register_no

                    }
                    : null,


                lost_report: lostReport
                    ? {

                        category:
                            lostReport.category,

                        item_type:
                            lostReport.item_type,

                        color:
                            lostReport.color,

                        description:
                            lostReport.description

                    }
                    : null,


                found_report: foundReport
                    ? {

                        category:
                            foundReport.category,

                        item_type:
                            foundReport.item_type,

                        color:
                            foundReport.color,

                        description:
                            foundReport.description

                    }
                    : null

            });

        }

        catch (error) {

            console.error(
                "❌ Handover loading error:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    "Failed to load handover details",

                details:
                    error.message

            });

        }

    }
);





// ======================================================
// COMPLETE HANDOVER USING PICKUP CODE
// ======================================================
app.post("/handover/:handoverId/complete", async (req, res) => {
    try {

        console.log("\n==========================================");
        console.log("🏁 COMPLETE HANDOVER");
        console.log("==========================================");

        const { handoverId } = req.params;

        const {
            user_id,
            pickup_code,
            handover_place,
            handover_date,
            handover_time
        } = req.body;

        console.log("Handover ID:", handoverId);
        console.log("Founder ID:", user_id);
        console.log("Place:", handover_place);
        console.log("Date:", handover_date);
        console.log("Time:", handover_time);

        // ------------------------------------------
        // 1. Check required fields
        // ------------------------------------------

        if (
            !user_id ||
            !pickup_code ||
            !handover_place ||
            !handover_date ||
            !handover_time
        ) {
            return res.status(400).json({
                success: false,
                message: "Place, date, time and pickup code are required."
            });
        }

        // ------------------------------------------
        // 2. Find handover
        // ------------------------------------------

        const handover = await Handover.findById(handoverId);

        if (!handover) {
            return res.status(404).json({
                success: false,
                message: "Handover record not found."
            });
        }

        // ------------------------------------------
        // 3. Check founder
        // ------------------------------------------

        if (handover.founder_user_id.toString() !== user_id.toString()) {

            return res.status(403).json({
                success: false,
                message: "You are not authorized to complete this handover."
            });
        }

        // ------------------------------------------
        // 4. Check current status
        // ------------------------------------------

        if (handover.status === "COMPLETED") {

            return res.status(400).json({
                success: false,
                message: "This handover has already been completed."
            });
        }

        // ------------------------------------------
        // 5. Verify pickup code
        // ------------------------------------------

        if (String(pickup_code).trim() !== String(handover.pickup_code).trim()) {

            console.log("❌ Wrong pickup code");

            return res.status(400).json({
                success: false,
                message: "Invalid pickup code."
            });
        }

        // ------------------------------------------
        // 6. Save place/date/time
        // ------------------------------------------

        handover.handover_place = handover_place.trim();
        handover.handover_date = handover_date;
        handover.handover_time = handover_time;

        // ------------------------------------------
        // 7. Complete handover
        // ------------------------------------------

        handover.status = "COMPLETED";
        handover.handed_over_at = new Date();

        await handover.save();

        // ------------------------------------------
        // 8. Update Lost Report
        // ------------------------------------------

        await LostReport.findByIdAndUpdate(
            handover.lost_report_id,
            {
                status: "HANDED_OVER"
            }
        );

        // ------------------------------------------
        // 9. Update Found Report
        // ------------------------------------------

        await FoundReport.findByIdAndUpdate(
            handover.found_report_id,
            {
                status: "HANDED_OVER"
            }
        );

        // ------------------------------------------
        // 10. Notify Lost User
        // ------------------------------------------

        await Notification.create({
            user_id: handover.lost_user_id,
            type: "HANDOVER_COMPLETED",
            title: "Item Handover Completed",
            message:
                `Your lost item has been successfully handed over at ` +
                `${handover_place} on ${handover_date} at ${handover_time}.`,
            related_id: handover._id
        });

        console.log("✅ Pickup code verified");
        console.log("✅ Handover completed");
        console.log("✅ Place:", handover_place);
        console.log("✅ Date:", handover_date);
        console.log("✅ Time:", handover_time);

        return res.json({
            success: true,
            message: "Handover completed successfully.",

            handover: {
                id: handover._id,
                place: handover.handover_place,
                date: handover.handover_date,
                time: handover.handover_time,
                status: handover.status,
                handed_over_at: handover.handed_over_at
            }
        });

    } catch (error) {

        console.error("❌ Complete handover error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while completing handover."
        });
    }
});




// ======================================================
// GET PICKUP CODE FOR LOST USER
// ======================================================

app.get(
    "/handover/user/:userId",
    async (req, res) => {

        try {

            const userId =
                req.params.userId;

            console.log(
                "\n📦 Loading handover for Lost User:",
                userId
            );


            if (!userId) {

                return res.status(400).json({
                    success: false,
                    error: "User ID is required"
                });

            }


            const handover =
                await Handover.findOne({
                    lost_user_id: userId
                })
                .sort({
                    created_at: -1
                });


            if (!handover) {

                return res.status(404).json({

                    success: false,

                    error:
                        "No pickup code found for this user"

                });

            }


            res.json({

                success: true,

                handover: {

                    id:
                        handover._id,

                    verification_id:
                        handover.verification_id,

                    pickup_code:
                        handover.pickup_code,

                    status:
                        handover.status,

                    created_at:
                        handover.created_at

                }

            });

        }
        catch (error) {

            console.error(
                "❌ Pickup code loading error:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    "Failed to load pickup code",

                details:
                    error.message

            });

        }

    }
);

// ======================================================
// GET USER NOTIFICATIONS
// ======================================================

app.get(
    "/notifications/user/:userId",
    async (req, res) => {

        try {

            const userId =
                req.params.userId;

            console.log(
                "🔔 Loading notifications for user:",
                userId
            );

            const notifications =
                await Notification.find({
                    user_id: userId
                })
                .sort({
                    created_at: -1
                });

            const unreadCount =
                notifications.filter(
                    notification =>
                        notification.is_read === false
                ).length;

            res.json({

                success: true,

                has_unread:
                    unreadCount > 0,

                unread_count:
                    unreadCount,

                notifications:
                    notifications.map(
                        notification => ({

                            id:
                                notification._id,

                            type:
                                notification.type,

                            title:
                                notification.title,

                            message:
                                notification.message,

                            verification_id:
                                notification.verification_id,

                            match_id:
                                notification.match_id,

                            is_read:
                                notification.is_read,

                            read_at:
                                notification.read_at,

                            created_at:
                                notification.created_at
                        })
                    )
            });

        }
        catch (error) {

            console.error(
                "❌ Notification loading error:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    "Failed to load notifications",

                details:
                    error.message
            });
        }
    }
);


// ======================================================
// MARK NOTIFICATION AS READ
// ======================================================

app.put(
    "/notifications/:notificationId/read",
    async (req, res) => {
        try
        {
            const notificationId =
                req.params.notificationId;

            const userId =
                req.body.user_id;

            if(!userId)
            {
                return res.status(400).json({
                    success: false,
                    error:
                        "User ID is required"
                });
            }

            const notification =
                await Notification.findById(
                    notificationId
                );

            if(!notification)
            {
                return res.status(404).json({
                    success: false,
                    error:
                        "Notification not found"
                });
            }

            // Check that this notification
            // belongs to the current user
            if(
                notification.user_id.toString() !==
                userId.toString()
            )
            {
                return res.status(403).json({
                    success: false,
                    error:
                        "You are not authorized to update this notification"
                });
            }

            // Mark as read
            notification.is_read = true;

            // Store the exact time it was read
            notification.read_at = new Date();

            await notification.save();

            console.log(
                "✓ Notification marked as read:",
                notificationId
            );

            res.json({
                success: true,
                message:
                    "Notification marked as read",
                notification: {
                    id:
                        notification._id,
                    is_read:
                        notification.is_read,
                    read_at:
                        notification.read_at
                }
            });
        }
        catch(error)
        {
            console.error(
                "❌ Mark notification read error:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Failed to mark notification as read",
                details:
                    error.message
            });
        }
    }
);


// ======================================================
// GET VERIFICATION QUESTIONS FOR LOST USER
// ======================================================


app.get(
    "/verification/:verificationId",
    async (req, res) => {
        try {
            const verificationId =
                req.params.verificationId;

            console.log(
                "Loading verification:",
                verificationId
            );

            const verification =
                await Verification.findById(
                    verificationId
                );

            if (!verification) {
                return res.status(404).json({
                    success: false,
                    error: "Verification not found"
                });
            }

            // Original questions: never expose correct answers
            const questions =
                (verification.questions || []).map(
                    (item, index) => ({
                        question: item.question,
                        question_number: index + 1
                    })
                );

            // Extra questions: also hide correct answers
            const extraQuestions =
                (verification.extra_questions || []).map(
                    (item, index) => ({
                        question: item.question,
                        question_number: index + 1
                    })
                );

            console.log(
                "Original questions:",
                questions.length
            );

            console.log(
                "Extra questions:",
                extraQuestions.length
            );

            res.json({
                success: true,

                verification_id:
                    verification._id,

                status:
                    verification.status,

                questions:
                    questions,

                extra_questions:
                    extraQuestions,

                extra_status:
                    verification.extra_status || "NOT_STARTED"
            });
        }
        catch (error) {
            console.error(
                "Verification loading error:",
                error
            );

            res.status(500).json({
                success: false,
                error: "Failed to load verification",
                details: error.message
            });
        }
    }
);


// ======================================================
// SUBMIT VERIFICATION ANSWERS
// ======================================================

app.post("/verification/:verificationId/submit", async (req, res) => {
    try {
        const { verificationId } = req.params;
        const { user_id, answers, round } = req.body;

        console.log("📝 Verification submission");
        console.log("Verification ID:", verificationId);
        console.log("User ID:", user_id);
        console.log("Round:", round);
        console.log("Answers:", answers);

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        if (!Array.isArray(answers)) {
            return res.status(400).json({
                success: false,
                message: "Answers must be an array"
            });
        }

        const verification =
            await Verification.findById(verificationId);

        if (!verification) {
            return res.status(404).json({
                success: false,
                message: "Verification not found"
            });
        }

        // =====================================================
        // CHECK THAT THIS IS THE LOST USER
        // =====================================================

        const lostReport =
            await LostReport.findById(
                verification.lost_report_id
            );

        if (!lostReport) {
            return res.status(404).json({
                success: false,
                message: "Lost report not found"
            });
        }

        if (
            String(lostReport.user_id) !==
            String(user_id)
        ) {
            return res.status(403).json({
                success: false,
                message: "Only the Lost User can answer these questions"
            });
        }


        // =====================================================
        // EXTRA QUESTION ROUND
        // =====================================================

        if (round === "EXTRA") {

            console.log("🟣 EXTRA QUESTION ANSWERS RECEIVED");


            if (
                !Array.isArray(verification.extra_questions) ||
                verification.extra_questions.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "No extra questions found"
                });
            }


            let correctCount = 0;


            verification.extra_questions =
                verification.extra_questions.map(
                    (question, index) => {

                        const userAnswer =
                            String(
                                answers[index] || ""
                            ).trim();

                        const correctAnswer =
                            String(
                                question.correct_answer || ""
                            ).trim();


                        // Save Lost User answer
                        question.user_answer =
                            userAnswer;


                        // Compare answers
                        const normalize = (value) =>
                            value
                                .toLowerCase()
                                .replace(
                                    /[^a-z0-9\s]/g,
                                    ""
                                )
                                .replace(
                                    /\s+/g,
                                    " "
                                )
                                .trim();


                        if (
                            normalize(userAnswer) ===
                            normalize(correctAnswer)
                        ) {
                            correctCount++;
                        }


                        return question;
                    }
                );


            const totalQuestions =
                verification.extra_questions.length;


            const extraScore =
                totalQuestions > 0
                    ? Math.round(
                        (
                            correctCount /
                            totalQuestions
                        ) * 100
                    )
                    : 0;


            // Save EXTRA score separately
            verification.extra_verification_score =
                extraScore;


            // Original status is NOT changed
            verification.extra_status =
                "ANSWERED";


            await verification.save();


            console.log(
                "🟣 Extra verification score:",
                extraScore
            );

            console.log(
                "🟣 Extra verification status:",
                verification.extra_status
            );


            // =================================================
            // NOTIFY FOUNDER
            // =================================================

            const foundReport =
                await FoundReport.findById(
                    verification.found_report_id
                );


            if (foundReport) {

                await Notification.create({
                    user_id:
                        foundReport.user_id,

                    type:
                        "VERIFICATION_RESULT",

                    title:
                        "Extra Verification Answers Received",

                    message:
                        "The Lost User has answered the additional ownership questions. Please review the answers.",

                    verification_id:
                        verification._id,

                    match_id:
                        verification.match_id,

                    is_read:
                        false
                });

            }


            return res.json({
                success: true,

                message:
                    "Extra verification answers submitted successfully",

                round:
                    "EXTRA",

                extra_verification_score:
                    extraScore,

                extra_status:
                    verification.extra_status
            });
        }


        // =====================================================
        // ORIGINAL QUESTION ROUND
        // =====================================================

        if (
            !Array.isArray(verification.questions) ||
            verification.questions.length === 0
        ) {
            return res.status(400).json({
                success: false,
                message: "No original verification questions found"
            });
        }


        let correctCount = 0;


        verification.questions =
            verification.questions.map(
                (question, index) => {

                    const userAnswer =
                        String(
                            answers[index] || ""
                        ).trim();

                    const correctAnswer =
                        String(
                            question.correct_answer || ""
                        ).trim();


                    question.user_answer =
                        userAnswer;


                    const normalize = (value) =>
                        value
                            .toLowerCase()
                            .replace(
                                /[^a-z0-9\s]/g,
                                ""
                            )
                            .replace(
                                /\s+/g,
                                " "
                            )
                            .trim();


                    if (
                        normalize(userAnswer) ===
                        normalize(correctAnswer)
                    ) {
                        correctCount++;
                    }


                    return question;
                }
            );


        const totalQuestions =
            verification.questions.length;


        const score =
            totalQuestions > 0
                ? Math.round(
                    (
                        correctCount /
                        totalQuestions
                    ) * 100
                )
                : 0;


        verification.verification_score =
            score;


        verification.status =
            "ANSWERED";


        await verification.save();


        console.log(
            "🟢 Original verification score:",
            score
        );


        // =====================================================
        // NOTIFY FOUNDER
        // =====================================================

        const foundReport =
            await FoundReport.findById(
                verification.found_report_id
            );


        if (foundReport) {

            await Notification.create({
                user_id:
                    foundReport.user_id,

                type:
                    "VERIFICATION_RESULT",

                title:
                    "Verification Answers Received",

                message:
                    "The Lost User has answered the ownership verification questions. Please review the answers.",

                verification_id:
                    verification._id,

                match_id:
                    verification.match_id,

                is_read:
                    false
            });

        }


        return res.json({
            success: true,

            message:
                "Verification answers submitted successfully",

            round:
                "ORIGINAL",

            verification_score:
                score,

            status:
                verification.status
        });


    } catch (error) {

        console.error(
            "❌ Verification submission error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to submit verification answers"
        });
    }
});

// ======================================================
// GET LOST REPORTS FOR ONE USER
// ======================================================

app.get(
    "/lost-reports/user/:userId",
    async (req, res) => {

        try {

            console.log(
                "\n📋 Loading lost reports for user:",
                req.params.userId
            );

            const reports =
                await LostReport.find({
                    user_id: req.params.userId
                })
                .sort({
                    created_at: -1
                });

            console.log(
                "Lost reports found:",
                reports.length
            );

            res.json({

                success: true,

                reports

            });

        }
        catch (error) {

            console.error(
                "❌ User lost reports error:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    "Failed to load lost reports",

                details:
                    error.message
            });
        }
    }
);

// ======================================================
// DASHBOARD - GET POSSIBLE MATCHES FOR USER
// ======================================================

app.get(
    "/dashboard/matches/:userId",
    async (req, res) => {

        try {

            const userId = req.params.userId;

            console.log("");
            console.log(
                "🔍 Loading dashboard matches for user:",
                userId
            );

            // ------------------------------------------
            // FIND LOST REPORTS OF THIS USER
            // ------------------------------------------

            const lostReports =
                await LostReport.find({
                    user_id: userId
                }).sort({
                    created_at: -1
                });

            console.log(
                "Lost reports of user:",
                lostReports.length
            );

            if (lostReports.length === 0) {

                return res.json({
                    success: true,
                    matches: []
                });
            }


            // ------------------------------------------
            // GET MATCHES FOR THOSE LOST REPORTS
            // ------------------------------------------

            const lostReportIds =
                lostReports.map(
                    report => report._id
                );

            const matches =
                await Match.find({
                    lost_report_id: {
                        $in: lostReportIds
                    },
                    status: "POSSIBLE_MATCH"
                })
                .sort({
                    match_score: -1
                });


            console.log(
                "Possible matches found:",
                matches.length
            );


            // ------------------------------------------
            // GET FOUND ITEM DETAILS
            // ------------------------------------------

            const result = [];

            for (const match of matches) {

                const lost =
                    await LostReport.findById(
                        match.lost_report_id
                    );

                const found =
                    await FoundReport.findById(
                        match.found_report_id
                    );

                if (!lost || !found) {
                    continue;
                }


                result.push({

                    match_id:
                        match._id,

                    match_score:
                        match.match_score,

                    description_score:
                        match.description_score,

                    attribute_score:
                        match.attribute_score,

                    status:
                        match.status,

                    lost_report: {

                        id:
                            lost._id,

                        category:
                            lost.category,

                        item_type:
                            lost.item_type,

                        color:
                            lost.color,

                        location:
                            lost.location,

                        date_lost:
                            lost.date_lost,

                        time_lost:
                            lost.time_lost,

                        description:
                            lost.description
                    },

                    found_report: {

                        id:
                            found._id,

                        category:
                            found.category,

                        item_type:
                            found.item_type,

                        color:
                            found.color,

                        brand:
                            found.brand,

                        location:
                            found.location,

                        date_found:
                            found.date_found,

                        time_found:
                            found.time_found,

                        description:
                            found.description,

                        image_data:
                            found.image_data
                    }
                });
            }


            console.log(
                "✅ Dashboard matches prepared:",
                result.length
            );


            res.json({

                success: true,

                count:
                    result.length,

                matches:
                    result
            });


        } catch (error) {

            console.error(
                "❌ Dashboard matches error:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    "Failed to load dashboard matches",

                details:
                    error.message
            });
        }
    }
);


// ======================================================
// GET LOST REPORTS FOR A USER
// ======================================================

app.get("/lost-reports/user/:userId", async (req, res) => {

    try {

        const reports = await LostReport.find({
            user_id: req.params.userId
        }).sort({
            created_at: -1
        });

        res.json({
            success: true,
            reports
        });

    } catch (error) {

        console.error(
            "❌ Get user lost reports error:",
            error
        );

        res.status(500).json({
            success: false,
            error: "Failed to get lost reports"
        });
    }
});

// ======================================================
// 404
// ======================================================

app.use((req, res) => {

    res.status(404).json({

        success: false,

        error:
            "Route not found",

        method:
            req.method,

        path:
            req.originalUrl
    });
});


// ======================================================
// START SERVER
// ======================================================

async function startServer() {

    try {

        console.log(
            "🔄 Connecting to MongoDB..."
        );

        console.log(
            "Database:",
            MONGO_URI
        );


        await mongoose.connect(
            MONGO_URI
        );


        console.log(
            "✅ MongoDB connected"
        );

        console.log(
            "📁 Database:",
            mongoose.connection.name
        );


        app.listen(
            PORT,
            () => {

                console.log("");
                console.log(
                    "======================================"
                );

                console.log(
                    "🚀 Campus Lost & Found Server"
                );

                console.log(
                    "======================================"
                );

                console.log(
                    `🌐 Server: http://localhost:${PORT}`
                );

                console.log(
                    `❤️  Health: http://localhost:${PORT}/`
                );

                console.log(
                    `🗄️  DB Status: http://localhost:${PORT}/db-status`
                );

                console.log(
                    `📁 Database: ${mongoose.connection.name}`
                );

                console.log(
                    "🤖 SBERT: Enabled"
                );

                console.log(
                    "🖼️  CLIP: Enabled"
                );

                console.log(
                    "======================================"
                );

                console.log("");
                
            }
        );

    } catch (error) {

        console.error("");

        console.error(
            "======================================"
        );

        console.error(
            "❌ MongoDB CONNECTION FAILED"
        );

        console.error(
            "======================================"
        );

        console.error(
            error.message
        );

        console.error("");

        console.error(
            "Make sure MongoDB is running."
        );

        console.error(
            "======================================"
        );

        process.exit(1);
    }
}


// ======================================================
// MONGODB EVENTS
// ======================================================

mongoose.connection.on(
    "connected",
    () => {

        console.log(
            "🟢 MongoDB connection established"
        );
    }
);


mongoose.connection.on(
    "error",
    (error) => {

        console.error(
            "🔴 MongoDB error:",
            error.message
        );
    }
);


mongoose.connection.on(
    "disconnected",
    () => {

        console.log(
            "🟡 MongoDB disconnected"
        );
    }
);


startServer();
