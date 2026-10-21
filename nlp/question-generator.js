const http = require("http");


// ======================================================
// ASK LOCAL QWEN THROUGH OLLAMA
// ======================================================

function askOllama(prompt)
{
    return new Promise(
        (resolve, reject) =>
        {
            const requestData =
                JSON.stringify(
                    {
                        model:
                            "qwen2.5:3b",

                        prompt:
                            prompt,

                        stream:
                            false
                    }
                );

            const options =
            {
                hostname:
                    "127.0.0.1",

                port:
                    11434,

                path:
                    "/api/generate",

                method:
                    "POST",

                headers:
                {
                    "Content-Type":
                        "application/json",

                    "Content-Length":
                        Buffer.byteLength(
                            requestData
                        )
                }
            };

            const request =
                http.request(
                    options,
                    response =>
                    {
                        let data = "";

                        response.on(
                            "data",
                            chunk =>
                            {
                                data += chunk;
                            }
                        );

                        response.on(
                            "end",
                            () =>
                            {
                                try
                                {
                                    const result =
                                        JSON.parse(
                                            data
                                        );

                                    if(
                                        result.response
                                    )
                                    {
                                        resolve(
                                            result.response
                                        );
                                    }
                                    else
                                    {
                                        reject(
                                            new Error(
                                                "Invalid response from Ollama"
                                            )
                                        );
                                    }
                                }
                                catch(error)
                                {
                                    reject(error);
                                }
                            }
                        );
                    }
                );

            request.on(
                "error",
                error =>
                {
                    reject(error);
                }
            );

            request.write(
                requestData
            );

            request.end();
        }
    );
}


// ======================================================
// CHECK WHETHER QUESTION REVEALS THE ANSWER
// ======================================================

function questionRevealsAnswer(
    question,
    answer
)
{
    if(
        !question ||
        !answer
    )
    {
        return false;
    }

    const q =
        question
            .toLowerCase()
            .replace(
                /[₹$€£,?.!]/g,
                " "
            );

    const a =
        answer
            .toString()
            .toLowerCase()
            .trim();

    if(!a)
    {
        return false;
    }

    // Direct answer check
    if(
        q.includes(a)
    )
    {
        return true;
    }

    // Check individual important words
    const answerWords =
        a
            .split(/\s+/)
            .filter(
                word =>
                    word.length >= 4
            );

    if(
        answerWords.length >= 2
    )
    {
        let found = 0;

        answerWords.forEach(
            word =>
            {
                if(
                    q.includes(word)
                )
                {
                    found++;
                }
            }
        );

        if(
            found === answerWords.length
        )
        {
            return true;
        }
    }

    return false;
}


// ======================================================
// CHECK GENERIC QUESTIONS
// ======================================================

function isGenericQuestion(
    question
)
{
    const q =
        question.toLowerCase();

    const genericPatterns =
    [
        "what is the item",
        "what type of item",
        "what color is the item",
        "where did you lose",
        "where was the item found",
        "when did you lose",
        "when was the item found",
        "describe the item",
        "what item did you lose",
        "what item was lost"
    ];

    for(
        const pattern of genericPatterns
    )
    {
        if(
            q.includes(pattern)
        )
        {
            return true;
        }
    }

    return false;
}


// ======================================================
// CLEAN QUESTION
// ======================================================

function cleanQuestion(
    question
)
{
    return question
        .replace(
            /^\s*[\d]+[\.\)\-:]\s*/,
            ""
        )
        .replace(
            /^\s*[-*]\s*/,
            ""
        )
        .trim();
}


// ======================================================
// PREPARE PRIVATE DETAILS
// ======================================================

function preparePrivateDetails(
    privateDetails
)
{
    const details = {};
    const answerMap = {};

    function addField(
        field,
        value
    )
    {
        if(
            value !== undefined &&
            value !== null &&
            value.toString().trim()
        )
        {
            details[field] =
                value.toString().trim();

            answerMap[field] =
                value.toString().trim();
        }
    }


    // --------------------------------------------------
    // CURRENT FOUND REPORT PRIVATE FIELDS
    // --------------------------------------------------

    addField(
        "special_mark",
        privateDetails.special_mark
    );

    addField(
        "inner_lining",
        privateDetails.inner_lining
    );

    addField(
        "unique_contents",
        privateDetails.unique_contents
    );

    addField(
        "pattern",
        privateDetails.pattern
    );

    addField(
        "other",
        privateDetails.other
    );


    // --------------------------------------------------
    // ADDITIONAL PRIVATE FIELDS
    // --------------------------------------------------

    addField(
        "bank",
        privateDetails.bank
    );

    addField(
        "denomination",
        privateDetails.denomination
    );

    addField(
        "note_count",
        privateDetails.note_count
    );

    addField(
        "position",
        privateDetails.position
    );

    addField(
        "contents",
        privateDetails.contents
    );

    addField(
        "layers",
        privateDetails.layers
    );

    addField(
        "hidden_compartment",
        privateDetails.hidden_compartment
    );

    addField(
        "color",
        privateDetails.color
    );


    return {
        details,
        answerMap
    };
}


// ======================================================
// FIND WHICH PRIVATE FIELD THE QUESTION REFERS TO
// ======================================================

function findPrivateField(
    question,
    privateDetails
)
{
    const q =
        question.toLowerCase();


    // --------------------------------------------------
    // SPECIAL MARK
    // --------------------------------------------------

    if(
        privateDetails.special_mark &&
        (
            q.includes("special mark") ||
            q.includes("identifying mark") ||
            q.includes("mark") ||
            q.includes("damage") ||
            q.includes("damaged") ||
            q.includes("stitch")
        )
    )
    {
        return "special_mark";
    }


    // --------------------------------------------------
    // INNER LINING
    // --------------------------------------------------

    if(
        privateDetails.inner_lining &&
        (
            q.includes("inner lining") ||
            q.includes("inside lining") ||
            q.includes("lining") ||
            q.includes("interior lining") ||
            q.includes("inside fabric") ||
            q.includes("inner fabric")
        )
    )
    {
        return "inner_lining";
    }


    // --------------------------------------------------
    // UNIQUE CONTENTS
    // --------------------------------------------------

    if(
        privateDetails.unique_contents &&
        (
            q.includes("inside") ||
            q.includes("inside the item") ||
            q.includes("inside the wallet") ||
            q.includes("contents") ||
            q.includes("contained") ||
            q.includes("items were inside") ||
            q.includes("item was inside")
        )
    )
    {
        return "unique_contents";
    }


    // --------------------------------------------------
    // PATTERN / LOGO / DESIGN
    // --------------------------------------------------

    if(
        privateDetails.pattern &&
        (
            q.includes("pattern") ||
            q.includes("logo") ||
            q.includes("design") ||
            q.includes("print")
        )
    )
    {
        return "pattern";
    }


    // --------------------------------------------------
    // OTHER
    // --------------------------------------------------

    if(
        privateDetails.other &&
        (
            q.includes("other") ||
            q.includes("unique detail") ||
            q.includes("identifying detail") ||
            q.includes("distinctive detail")
        )
    )
    {
        return "other";
    }


    // --------------------------------------------------
    // BANK
    // --------------------------------------------------

    if(
        privateDetails.bank &&
        (
            q.includes("bank") ||
            q.includes("issued")
        )
    )
    {
        return "bank";
    }


    // --------------------------------------------------
    // DENOMINATION
    // --------------------------------------------------

    if(
        privateDetails.denomination &&
        (
            q.includes("denomination") ||
            q.includes("value of cash") ||
            q.includes("value of note") ||
            q.includes("currency value")
        )
    )
    {
        return "denomination";
    }


    // --------------------------------------------------
    // NOTE COUNT
    // --------------------------------------------------

    if(
        privateDetails.note_count &&
        (
            q.includes("how many notes") ||
            q.includes("number of notes") ||
            q.includes("number of currency notes") ||
            q.includes("how many currency")
        )
    )
    {
        return "note_count";
    }


    // --------------------------------------------------
    // POSITION
    // --------------------------------------------------

    if(
        privateDetails.position &&
        (
            q.includes("slot") ||
            q.includes("position") ||
            q.includes("located") ||
            q.includes("placed")
        )
    )
    {
        return "position";
    }


    // --------------------------------------------------
    // CONTENTS
    // --------------------------------------------------

    if(
        privateDetails.contents &&
        (
            q.includes("inside") ||
            q.includes("contents") ||
            q.includes("contained")
        )
    )
    {
        return "contents";
    }


    // --------------------------------------------------
    // LAYERS
    // --------------------------------------------------

    if(
        privateDetails.layers &&
        (
            q.includes("layer") ||
            q.includes("layers") ||
            q.includes("compartment")
        )
    )
    {
        return "layers";
    }


    // --------------------------------------------------
    // HIDDEN COMPARTMENT
    // --------------------------------------------------

    if(
        privateDetails.hidden_compartment &&
        (
            q.includes("hidden") ||
            q.includes("zip compartment") ||
            q.includes("hidden section")
        )
    )
    {
        return "hidden_compartment";
    }


    // --------------------------------------------------
    // COLOR
    // --------------------------------------------------

    if(
        privateDetails.color &&
        (
            q.includes("color") ||
            q.includes("colour")
        )
    )
    {
        return "color";
    }


    return null;
}


// ======================================================
// CHECK WHETHER QUESTION IS RELEVANT
// ======================================================

function isRelevantQuestion(
    question,
    privateDetails
)
{
    const field =
        findPrivateField(
            question,
            privateDetails
        );

    return field !== null;
}


// ======================================================
// GENERATE QUESTIONS
// ======================================================

async function generateQuestions(
    privateDetails,
    itemContext = {}
)
{
    console.log(
        "\n=========================================="
    );

    console.log(
        "🤖 OFFLINE LLM QUESTION GENERATION"
    );

    console.log(
        "=========================================="
    );


    const prepared =
        preparePrivateDetails(
            privateDetails
        );

    const details =
        prepared.details;

    const answerMap =
        prepared.answerMap;


    if(
        Object.keys(details).length === 0
    )
    {
        throw new Error(
            "No private details available"
        );
    }


    // --------------------------------------------------
    // ITEM CONTEXT
    // --------------------------------------------------

    const itemType =
        itemContext.item_type ||
        "item";

    const category =
        itemContext.category ||
        "personal item";


    // --------------------------------------------------
    // BUILD PRIVATE DETAIL TEXT
    // --------------------------------------------------

    let privateText = "";

    Object.keys(details)
        .forEach(
            field =>
            {
                privateText +=
                    `${field}: ${details[field]}\n`;
            }
        );


    // --------------------------------------------------
    // PROMPT QWEN
    // --------------------------------------------------

    const prompt = `
You are an ownership verification question generator for a campus lost and found system.

ITEM:
${itemType}

CATEGORY:
${category}

PRIVATE IDENTIFYING DETAILS:
${privateText}

Your task is to generate exactly 5 possible verification questions.

IMPORTANT RULES:

1. Questions must be based ONLY on the private identifying details provided above.

2. Do NOT invent any information.

3. Do NOT use public information such as:
   - item category
   - item type
   - general color
   - location
   - date
   - time

4. Do NOT reveal the answer inside the question.

5. Never include the actual private answer in the question.

6. Ask questions that only the genuine owner is likely to know.

7. Use one private detail per question.

8. Prefer different private details.

9. Do not create generic questions such as:
   - What item did you lose?
   - What color is the item?
   - Where did you lose it?
   - Describe the item.

10. Keep the English simple.

11. Return ONLY numbered questions.

12. Do not provide answers.

13. Do not explain your reasoning.

GOOD EXAMPLES:

If the private detail is:
special_mark: damaged stitching near the zip

Question:
What special identifying mark was present on the item?

If the private detail is:
inner_lining: red with white dots

Question:
What was the design or color of the inner lining?

If the private detail is:
unique_contents: college ID and a metro card

Question:
What items were inside the item?

Now generate exactly 5 questions.
`;


    console.log(
        "🧠 Sending private details to local Qwen..."
    );


    const response =
        await askOllama(
            prompt
        );


    console.log(
        "✅ Qwen response received."
    );


    // --------------------------------------------------
    // PARSE RESPONSE
    // --------------------------------------------------

    const lines =
        response
            .split("\n")
            .map(
                line =>
                    cleanQuestion(line)
            )
            .filter(
                line =>
                    line.length > 5
            );


    console.log(
        "📝 Generated questions:",
        lines.length
    );


    // --------------------------------------------------
    // VALIDATE QUESTIONS
    // --------------------------------------------------

    const validQuestions = [];

    const usedFields = new Set();


    for(
        const question of lines
    )
    {
        const field =
            findPrivateField(
                question,
                privateDetails
            );


        // ----------------------------------------------
        // FIELD NOT FOUND
        // ----------------------------------------------

        if(!field)
        {
            console.log(
                "⚠️ Rejected irrelevant question:",
                question
            );

            continue;
        }


        // ----------------------------------------------
        // ANSWER
        // ----------------------------------------------

        const answer =
            answerMap[field];


        if(!answer)
        {
            console.log(
                "⚠️ Rejected missing answer:",
                question
            );

            continue;
        }


        // ----------------------------------------------
        // ANSWER LEAK
        // ----------------------------------------------

        if(
            questionRevealsAnswer(
                question,
                answer
            )
        )
        {
            console.log(
                "⚠️ Rejected answer-leaking question:",
                question
            );

            continue;
        }


        // ----------------------------------------------
        // GENERIC QUESTION
        // ----------------------------------------------

        if(
            isGenericQuestion(
                question
            )
        )
        {
            console.log(
                "⚠️ Rejected generic question:",
                question
            );

            continue;
        }


        // ----------------------------------------------
        // DUPLICATE FIELD
        // ----------------------------------------------

        if(
            usedFields.has(field)
        )
        {
            console.log(
                "⚠️ Rejected duplicate field question:",
                question
            );

            continue;
        }


        // ----------------------------------------------
        // ACCEPT QUESTION
        // ----------------------------------------------

        usedFields.add(
            field
        );


        validQuestions.push(
            {
                question:
                    question,

                answer:
                    answer,

                private_field:
                    field,

                type:
                    "LLM_GENERATED"
            }
        );


        if(
            validQuestions.length >= 3
        )
        {
            break;
        }
    }


    console.log(
        "🎯 Valid questions:",
        validQuestions.length
    );


    // --------------------------------------------------
    // FALLBACK QUESTIONS
    // --------------------------------------------------

    const fallbackQuestions =
    [
        {
            field:
                "special_mark",

            question:
                "What special identifying mark was present on the item?"
        },

        {
            field:
                "inner_lining",

            question:
                "What was the color or design of the inner lining?"
        },

        {
            field:
                "unique_contents",

            question:
                "What items were inside the item?"
        },

        {
            field:
                "pattern",

            question:
                "What pattern, logo or design was present on the item?"
        },

        {
            field:
                "other",

            question:
                "What other unique identifying detail did the item have?"
        },

        {
            field:
                "bank",

            question:
                "Which bank was associated with the card?"
        },

        {
            field:
                "denomination",

            question:
                "What was the denomination of the currency?"
        },

        {
            field:
                "note_count",

            question:
                "How many currency notes were inside the item?"
        },

        {
            field:
                "position",

            question:
                "Where was the card or item positioned?"
        },

        {
            field:
                "layers",

            question:
                "How many layers or compartments did the item have?"
        },

        {
            field:
                "hidden_compartment",

            question:
                "What was the hidden compartment or section like?"
        }
    ];


    for(
        const fallback of fallbackQuestions
    )
    {
        if(
            validQuestions.length >= 3
        )
        {
            break;
        }


        const answer =
            answerMap[
                fallback.field
            ];


        if(!answer)
        {
            continue;
        }


        if(
            usedFields.has(
                fallback.field
            )
        )
        {
            continue;
        }


        if(
            questionRevealsAnswer(
                fallback.question,
                answer
            )
        )
        {
            continue;
        }


        usedFields.add(
            fallback.field
        );


        validQuestions.push(
            {
                question:
                    fallback.question,

                answer:
                    answer,

                private_field:
                    fallback.field,

                type:
                    "TEMPLATE_FALLBACK"
            }
        );
    }


    // --------------------------------------------------
    // FINAL LIMIT = 3
    // --------------------------------------------------

    return validQuestions.slice(
        0,
        3
    );
}


// ======================================================
// EXPORT
// ======================================================

module.exports =
{
    generateQuestions
};