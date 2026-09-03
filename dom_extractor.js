function getElementRole(element) {
    const type = element.type?.toLowerCase();
    const name = (
        element.name ||
        element.id ||
        element.placeholder ||
        element.getAttribute("aria-label") ||
        ""
    ).toLowerCase();

    // Password
    if (type === "password") {
        return "password";
    }

    // Email
    if (
        type === "email" ||
        name.includes("email")
    ) {
        return "email";
    }

    // Username
    if (
        name.includes("username") ||
        name.includes("user name")
    ) {
        return "username";
    }

    // Search
    if (
        type === "search" ||
        name.includes("search")
    ) {
        return "search";
    }

    // Submit button
    if (
        element.tagName === "BUTTON" &&
        (
            type === "submit" ||
            name.includes("submit") ||
            element.innerText.toLowerCase().includes("sign in") ||
            element.innerText.toLowerCase().includes("login")
        )
    ) {
        return "submit";
    }

    return null;
}


function getElementType(element) {

    const tag = element.tagName.toLowerCase();

    if (tag === "input") {
        return "input";
    }

    if (tag === "textarea") {
        return "textarea";
    }

    if (tag === "button") {
        return "button";
    }

    if (tag === "select") {
        return "select";
    }

    if (
        tag === "dialog" ||
        element.getAttribute("role") === "dialog"
    ) {
        return "modal";
    }

    return "unknown";
}


export function extractDOMElements() {

    const selectors = [
        "input",
        "textarea",
        "button",
        "select",
        "dialog",
        '[role="dialog"]'
    ];

    const elements = document.querySelectorAll(
        selectors.join(",")
    );

    const uiElements = [];

    let counter = 1;

    elements.forEach((element) => {

        const rect = element.getBoundingClientRect();

        // Ignore invisible elements
        if (
            rect.width === 0 ||
            rect.height === 0
        ) {
            return;
        }

        const elementType = getElementType(element);

        uiElements.push({
            id: `${elementType}_${counter++}`,

            type: elementType,

            role: getElementRole(element),

            text:
                element.innerText?.trim() ||
                element.value ||
                null,

            bbox: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
            }
        });

    });

    return {
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight
        },

        ui_elements: uiElements
    };
}
