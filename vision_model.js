import * as ort from "onnxruntime-web";


// ==========================================
// MODEL SETTINGS
// ==========================================

const MODEL_PATH =
    "./models/mobilevit_browser_classifier.onnx";

export const CLASS_NAMES = [
    "dashboard",
    "error",
    "form",
    "login",
    "modal"
];


// ==========================================
// LOAD ONNX MODEL
// ==========================================

export async function loadVisionModel() {

    try {

        const session =
            await ort.InferenceSession.create(
                MODEL_PATH,
                {
                    executionProviders: ["webgpu"]
                }
            );

        console.log(
            "MobileViT ONNX model loaded successfully!"
        );

        console.log(
            "Input:",
            session.inputNames
        );

        console.log(
            "Output:",
            session.outputNames
        );

        return session;

    } catch (error) {

        console.error(
            "Failed to load ONNX model:",
            error
        );

        throw error;
    }
}


// ==========================================
// IMAGE → TENSOR
// ==========================================

function imageToTensor(image) {

    // MobileViT was trained with
    // 224 x 224 images

    const canvas =
        document.createElement("canvas");

    canvas.width = 224;
    canvas.height = 224;

    const ctx =
        canvas.getContext("2d");

    // Resize image to 224 x 224

    ctx.drawImage(
        image,
        0,
        0,
        224,
        224
    );

    // Get RGB pixel data

    const imageData =
        ctx.getImageData(
            0,
            0,
            224,
            224
        );

    const pixels =
        imageData.data;


    // MobileViT input:
    //
    // [batch, channels, height, width]
    //
    // [1, 3, 224, 224]

    const input =
        new Float32Array(
            1 * 3 * 224 * 224
        );


    for (let y = 0; y < 224; y++) {

        for (let x = 0; x < 224; x++) {

            // RGBA pixel position

            const pixelIndex =
                (y * 224 + x) * 4;


            // Convert:
            // 0-255 → 0-1

            const r =
                pixels[pixelIndex] / 255.0;

            const g =
                pixels[pixelIndex + 1] / 255.0;

            const b =
                pixels[pixelIndex + 2] / 255.0;


            // Position inside CHW tensor

            const position =
                y * 224 + x;


            // Red channel

            input[position] = r;


            // Green channel

            input[
                224 * 224 + position
            ] = g;


            // Blue channel

            input[
                2 * 224 * 224 + position
            ] = b;
        }
    }


    // Create ONNX Runtime tensor

    return new ort.Tensor(
        "float32",
        input,
        [1, 3, 224, 224]
    );
}


// ==========================================
// SOFTMAX
// ==========================================

function softmax(logits) {

    // Find largest logit
    // for numerical stability

    const maxLogit =
        Math.max(...logits);


    // Calculate exponentials

    const exponentials =
        logits.map(
            value =>
                Math.exp(
                    value - maxLogit
                )
        );


    // Sum

    const sum =
        exponentials.reduce(
            (a, b) => a + b,
            0
        );


    // Normalize

    return exponentials.map(
        value =>
            value / sum
    );
}


// ==========================================
// IMAGE PREDICTION
// ==========================================

export async function predictImage(
    session,
    image
) {

    // Convert image to tensor

    const inputTensor =
        imageToTensor(image);


    // Get model input name

    const inputName =
        session.inputNames[0];


    // Run ONNX inference

    const results =
        await session.run({

            [inputName]:
                inputTensor

        });


    // Get output

    const outputName =
        session.outputNames[0];


    const logits =
        Array.from(
            results[outputName].data
        );


    // Convert logits → probabilities

    const probabilities =
        softmax(logits);


    // Find highest probability

    let bestIndex = 0;


    for (
        let i = 1;
        i < probabilities.length;
        i++
    ) {

        if (
            probabilities[i] >
            probabilities[bestIndex]
        ) {

            bestIndex = i;
        }
    }


    // Return structured vision result

    return {

        type:
            CLASS_NAMES[bestIndex],

        confidence:
            probabilities[bestIndex],

        probabilities:
            probabilities

    };
}