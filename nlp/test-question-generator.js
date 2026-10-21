const {
    generateQuestions
} = require("./question-generator");


async function test()
{
    const privateDetails =
    {
        special_mark:
            "damaged stitching near the zip",

        inner_lining:
            "red with white dots",

        unique_contents:
            "college ID and a metro card",

        pattern:
            "",

        other:
            ""
    };


    const itemContext =
    {
        item_type:
            "wallet",

        category:
            "accessories"
    };


    try
    {
        const questions =
            await generateQuestions(
                privateDetails,
                itemContext
            );


        console.log(
            "\n=========================================="
        );

        console.log(
            "FINAL QUESTIONS"
        );

        console.log(
            "=========================================="
        );


        questions.forEach(
            (q, i) =>
            {
                console.log(
                    `${i + 1}. ${q.question}`
                );

                console.log(
                    `   field: ${q.private_field} | type: ${q.type} | answer: ${q.answer}`
                );
            }
        );
    }
    catch(error)
    {
        console.error(
            "❌ Test failed:",
            error
        );
    }
}


test();