import html2canvas from "html2canvas";
import { loadVisionModel, predictImage } from "./vision_model.js";
import { extractDOMElements } from "./dom_extractor.js";


export async function createHybridOutput() {

    console.log("Capturing current webpage...");

    // Capture the current webpage
    const canvas = await html2canvas(document.body);

    // Convert screenshot to image
    const image = new Image();

    image.src = canvas.toDataURL("image/png");

    await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
    });

    console.log("Screenshot captured!");


    // Run local vision model
    const session = await loadVisionModel();

    const visionOutput = await predictImage(
        session,
        image
    );


    // Extract DOM elements
    const domOutput = extractDOMElements();


    // Combine Vision + DOM
    const hybridOutput = {

        screen: {
            type: visionOutput.type,
            confidence: visionOutput.confidence
        },

        viewport: domOutput.viewport,

        ui_elements: domOutput.ui_elements
    };


    return hybridOutput;
}


// Test the complete pipeline
createHybridOutput()
    .then(result => {

        console.log(
            "========== FINAL HYBRID OUTPUT =========="
        );

        console.log(
            JSON.stringify(
                result,
                null,
                2
            )
        );

    })
    .catch(error => {

        console.error(
            "Pipeline failed:",
            error
        );

    });